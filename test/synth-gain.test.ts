// Per-sound gain for synth sounds (src/sound/JagFX.ts SYNTH_GAIN): synth 912 relic_attune plays twice as loud.
import { expect, test } from 'bun:test';
import fs from 'node:fs';

import Packet from '#/io/Packet.js';
import JagFX from '#/sound/JagFX.js';

const file = new Uint8Array(fs.readFileSync(new URL('../../Content/synth/relic_attune.synth', import.meta.url)));

/** Peak absolute 8-bit sample (silence is 128) of the sound as the client would generate it under `id`. */
function peak(id: number): number {
    const data = new Uint8Array(file.length + 4);
    data[0] = id >> 8;
    data[1] = id & 255;
    data.set(file, 2);
    data[data.length - 2] = 255;
    data[data.length - 1] = 255;
    JagFX.synth.fill(null);
    JagFX.init(new Packet(data));
    const wave = JagFX.generate(id, 1)!;
    let max = 0;
    for (let i = 44; i < wave.pos; i++) {
        max = Math.max(max, Math.abs(JagFX.waveBytes[i] - 128));
    }
    return max;
}

test('relic_attune (912) is twice as loud as the same data under an id with no gain', () => {
    const plain = peak(913);
    const loud = peak(912);
    expect(plain).toBeGreaterThan(40);
    expect(loud).toBeGreaterThanOrEqual(Math.min(127, plain * 2) - 1);
    expect(loud).toBeLessThanOrEqual(128);
});
