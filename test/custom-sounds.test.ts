// Custom sound overrides (src/sound/CustomSounds.ts): a recorded file in /custom-sounds/ replaces a synth id.
import { expect, test } from 'bun:test';

import { loadCustomSounds } from '#/sound/CustomSounds.js';

const ok = (bytes: number[], type = 'audio/wav') => new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': type } });

test('loads /custom-sounds/relic_attune.<ext> for synth 912, trying wav then mp3 then ogg', async () => {
    const asked: string[] = [];
    const fake = async (url: string) => {
        asked.push(url);
        return url.endsWith('relic_attune.mp3') ? ok([1, 2, 3], 'audio/mpeg') : new Response('nope', { status: 404 });
    };
    const sounds = await loadCustomSounds(fake as unknown as typeof fetch);
    expect([...sounds.keys()]).toEqual([912]);
    expect([...sounds.get(912)!]).toEqual([1, 2, 3]);
    expect(asked).toEqual(['/custom-sounds/relic_attune.wav', '/custom-sounds/relic_attune.mp3']);
});

test('no file means no override; an HTML fallback page or a network error is ignored', async () => {
    const html = async () => ok([60, 104], 'text/html');
    expect((await loadCustomSounds(html as unknown as typeof fetch)).size).toBe(0);
    const down = async () => {
        throw new Error('offline');
    };
    expect((await loadCustomSounds(down as unknown as typeof fetch)).size).toBe(0);
});
