// Recorded replacements for synth sounds. A file named after the sound in the server's public/custom-sounds/
// folder (served at /custom-sounds/) plays instead of the built-in synth sound with that id.
// docs/guide/relic-attune-sound.md

/** Synth id -> file name (without extension). Add a line here to make another sound replaceable. */
export const CUSTOM_SOUND_NAMES: Record<number, string> = {
    912: 'relic_attune' // Content/pack/synth.pack, played by [proc,relic_attune] in mods/relics
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
