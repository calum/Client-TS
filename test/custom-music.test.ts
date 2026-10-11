// Custom music overrides (src/sound/CustomMusic.ts): a recorded file in /custom-sounds/ plays instead of a MIDI song id.
import { expect, test } from 'bun:test';

import { CUSTOM_MUSIC_GAIN_DB, CUSTOM_MUSIC_NAMES, CustomMusic, loadCustomMusic } from '#/sound/CustomMusic.js';

const ok = (bytes: number[], type = 'audio/mpeg') => new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': type } });
const gain = (db: number) => Math.pow(10, (db + CUSTOM_MUSIC_GAIN_DB) / 20);
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

class FakeAudio {
    loop = false;
    volume = 1;
    paused = true;
    playCalls = 0;
    constructor(public src: string) {}
    play() {
        this.playCalls++;
        this.paused = false;
        return Promise.resolve();
    }
    pause() {
        this.paused = true;
    }
}

function setup() {
    const made: FakeAudio[] = [];
    const tracks = new Map([
        [26, 'blob:kbd'],
        [260, 'blob:kq']
    ]);
    const music = new CustomMusic(tracks, src => {
        const a = new FakeAudio(src);
        made.push(a);
        return a as unknown as HTMLAudioElement;
    }, 20);
    return { music, made };
}

test('song 26 (Attack3, King Black Dragon lair) is chop_suey and 260 (Insect Queen, Kalphite lair) is halo_theme', () => {
    expect(CUSTOM_MUSIC_NAMES).toEqual({ 26: 'chop_suey', 260: 'halo_theme' });
});

test('loads /custom-sounds/<name>.mp3 for each song id and skips missing files, HTML fallbacks and network errors', async () => {
    const asked: string[] = [];
    const fake = async (url: string) => {
        asked.push(url);
        if (url.endsWith('chop_suey.mp3')) return ok([1, 2, 3]);
        if (url.endsWith('halo_theme.mp3')) return ok([60, 104], 'text/html');
        throw new Error('offline');
    };
    const tracks = await loadCustomMusic(fake as unknown as typeof fetch, '/custom-sounds', () => 'blob:x');
    expect([...tracks.entries()]).toEqual([[26, 'blob:x']]);
    expect(asked).toContain('/custom-sounds/chop_suey.mp3');
    expect(asked).toContain('/custom-sounds/halo_theme.mp3');
});

test('play starts the recording looping at the music volume; ids without a recording are ignored', async () => {
    const { music, made } = setup();
    expect(music.has(26)).toBe(true);
    expect(music.has(1)).toBe(false);
    music.play(26, -4);
    await wait(60);
    expect(made.length).toBe(1);
    expect(made[0].src).toBe('blob:kbd');
    expect(made[0].loop).toBe(true);
    expect(made[0].paused).toBe(false);
    expect(made[0].volume).toBeCloseTo(gain(-4), 3);
    expect(music.current).toBe(26);
    music.play(26, -4);
    expect(made.length).toBe(1);
    expect(made[0].playCalls).toBe(1);
});

test('setVolumeDb follows the music slider', async () => {
    const { music, made } = setup();
    music.play(260, 0);
    await wait(60);
    music.setVolumeDb(-12);
    expect(made[0].volume).toBeCloseTo(gain(-12), 3);
});

test('stop(false) cuts at once; stop(true) fades out then pauses', async () => {
    const { music, made } = setup();
    music.play(26, 0);
    await wait(60);
    music.stop(false);
    expect(made[0].paused).toBe(true);
    expect(music.current).toBe(-1);

    music.play(260, 0);
    await wait(60);
    music.stop(true);
    expect(music.current).toBe(-1);
    await wait(80);
    expect(made[1].paused).toBe(true);
});

test('switching to the other recording stops the first; a blocked play() does not throw', async () => {
    const { music, made } = setup();
    music.play(26, 0);
    await wait(60);
    music.play(260, 0);
    await wait(80);
    expect(made[0].paused).toBe(true);
    expect(made[1].paused).toBe(false);
    expect(music.current).toBe(260);

    const blocked = new CustomMusic(new Map([[26, 'blob:kbd']]), () => ({ loop: false, volume: 0, paused: true, pause() {}, play: () => Promise.reject(new Error('NotAllowedError')) }) as unknown as HTMLAudioElement, 20);
    expect(() => blocked.play(26, 0)).not.toThrow();
    await wait(20);
});
