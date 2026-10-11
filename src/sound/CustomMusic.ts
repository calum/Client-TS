// Recorded replacements for MIDI songs. A file named after the song in the server's public/custom-sounds/ folder
// (served at /custom-sounds/) plays, looping, instead of the MIDI song with that id.
// docs/design/custom-lair-music.md

/** MIDI song id -> file name (without extension). Add a line here to make another song replaceable. */
export const CUSTOM_MUSIC_NAMES: Record<number, string> = {
    26: 'chop_suey', // attack3, played in the King Black Dragon lair (Content musicregion 0_47_160)
    260: 'halo_theme' // insect queen, played in the Kalphite lair and chamber (Content musicregion 0_54_148)
};

/** Tried in this order; the browser decodes whichever it supports. */
export const CUSTOM_MUSIC_EXTENSIONS = ['mp3', 'ogg', 'wav'];

/** Added to the music volume setting. Recordings are usually mastered louder than the rendered MIDI; not tuned by ear yet. */
export const CUSTOM_MUSIC_GAIN_DB = -3;

const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** Fetches each recording once at start-up and returns song id -> URL the browser can play (a blob URL by default). */
export async function loadCustomMusic(
    fetchFn: typeof fetch = fetch,
    base: string = '/custom-sounds',
    toUrl: (blob: Blob) => string = blob => URL.createObjectURL(blob)
): Promise<Map<number, string>> {
    const tracks = new Map<number, string>();
    for (const [id, name] of Object.entries(CUSTOM_MUSIC_NAMES)) {
        for (const ext of CUSTOM_MUSIC_EXTENSIONS) {
            try {
                const res = await fetchFn(`${base}/${name}.${ext}`);
                // a missing file may come back as a 404 or as the server's HTML page
                if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
                    continue;
                }
                const blob = await res.blob();
                if (blob.size > 0) {
                    tracks.set(Number(id), toUrl(blob));
                    break;
                }
            } catch (_e) {
                // offline or blocked: no override
            }
        }
    }
    return tracks;
}

type Audio = Pick<HTMLAudioElement, 'loop' | 'volume' | 'paused' | 'play' | 'pause'>;

/** Plays at most one recording at a time, looping, with a linear fade in and out of `fadeMs`. */
export class CustomMusic {
    /** Song id of the recording playing, or -1. */
    current: number = -1;

    private audio: Audio | null = null;
    private volumeDb: number = 0;
    private fadeTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly tracks: Map<number, string>,
        private readonly createAudio: (src: string) => Audio = src => new window.Audio(src),
        private readonly fadeMs: number = 2000
    ) {}

    has(id: number): boolean {
        return this.tracks.has(id);
    }

    play(id: number, volumeDb: number): void {
        const src = this.tracks.get(id);
        if (!src || this.current === id) {
            return;
        }
        this.stop(true);
        this.volumeDb = volumeDb;
        const audio = this.createAudio(src);
        audio.loop = true;
        audio.volume = 0;
        // the browser may refuse before a user gesture; the next song change tries again
        void Promise.resolve(audio.play()).catch(() => {});
        this.audio = audio;
        this.current = id;
        this.fade(audio, this.targetGain(), false);
    }

    setVolumeDb(volumeDb: number): void {
        this.volumeDb = volumeDb;
        if (this.audio && this.current !== -1) {
            this.clearFade();
            this.audio.volume = this.targetGain();
        }
    }

    stop(fadeOut: boolean): void {
        const audio = this.audio;
        this.audio = null;
        this.current = -1;
        this.clearFade();
        if (!audio) {
            return;
        }
        if (fadeOut && !audio.paused) {
            this.fade(audio, 0, true);
        } else {
            audio.pause();
        }
    }

    private targetGain(): number {
        return Math.min(1, dbToGain(this.volumeDb + CUSTOM_MUSIC_GAIN_DB));
    }

    private clearFade(): void {
        if (this.fadeTimer) {
            clearInterval(this.fadeTimer);
            this.fadeTimer = null;
        }
    }

    /** Each fade has its own timer, so a fade-out that is still running is not cut short by the next song's fade-in. */
    private fade(audio: Audio, to: number, outgoing: boolean): void {
        const from = audio.volume;
        const start = Date.now();
        const timer = setInterval(() => {
            const t = Math.min(1, (Date.now() - start) / this.fadeMs);
            audio.volume = from + (to - from) * t;
            if (t >= 1) {
                clearInterval(timer);
                if (outgoing) {
                    audio.pause();
                } else if (this.fadeTimer === timer) {
                    this.fadeTimer = null;
                }
            }
        }, Math.max(5, Math.min(50, this.fadeMs / 4)));
        if (!outgoing) {
            this.fadeTimer = timer;
        }
    }
}
