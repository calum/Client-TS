// Recorded replacements for synth sounds. A file named after the sound in the server's public/custom-sounds/
// folder (served at /custom-sounds/) plays instead of the built-in synth sound with that id.
// docs/guide/relic-attune-sound.md, docs/guide/relic-phoenix-shout.md

/** Synth id -> file name (without extension). Add a line here to make another sound replaceable. */
export const CUSTOM_SOUND_NAMES: Record<number, string> = {
    912: 'relic_attune', // Content/pack/synth.pack, played by [proc,relic_attune] in mods/relics
    913: 'relic_phoenix', // played by [queue,relic_phoenix_shout_q] in mods/relics (Phoenix relic)
    // Hollow Choir (mods/hollowchoir, scripts/hollow_choir/gen_sounds.py): generated sounds, ids 914-927 in Content/pack/synth.pack
    914: 'hc_wake',
    915: 'hc_toll_shout',
    916: 'hc_toll_hit',
    917: 'hc_dirge_shout',
    918: 'hc_dirge_mist',
    919: 'hc_dirge_hit',
    920: 'hc_knell_shout',
    921: 'hc_knell_orb',
    922: 'hc_knell_hit',
    923: 'hc_spent',
    924: 'hc_bell_crack',
    925: 'hc_stage',
    926: 'hc_death',
    927: 'hc_ambient'
};

/** Tried in this order; the browser decodes whichever it supports. */
export const CUSTOM_SOUND_EXTENSIONS = ['wav', 'mp3', 'ogg'];

export async function loadCustomSounds(fetchFn: typeof fetch = fetch, base: string = '/custom-sounds'): Promise<Map<number, Uint8Array>> {
    const sounds = new Map<number, Uint8Array>();
    for (const [id, name] of Object.entries(CUSTOM_SOUND_NAMES)) {
        for (const ext of CUSTOM_SOUND_EXTENSIONS) {
            try {
                const res = await fetchFn(`${base}/${name}.${ext}`);
                // a missing file may come back as a 404 or as the server's HTML page
                if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
                    continue;
                }
                const bytes = new Uint8Array(await res.arrayBuffer());
                if (bytes.length > 0) {
                    sounds.set(Number(id), bytes);
                    break;
                }
            } catch (_e) {
                // offline or blocked: no override
            }
        }
    }
    return sounds;
}
