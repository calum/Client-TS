// Run with: bun test (in Client-TS). Checks the camera pitch range and that
// every allowed pitch has a visibility table level to draw with.
import { expect, test } from 'bun:test';

import World from '#/dash3d/World.js';

function buildTable(): void {
    // same inputs the client uses at 1x zoom
    const levels: number = World.visSampleCount();
    const distance: Int32Array = new Int32Array(levels);
    World.resetVisCalc(distance, 500, 800, 512, 334);
}

test('camera can tilt lower and higher than the original 128..383', () => {
    expect(World.minPitch).toBeLessThanOrEqual(48);
    expect(World.maxPitch).toBeGreaterThanOrEqual(448);
});

test('every allowed pitch maps to a built visibility level', () => {
    World.setViewRadius(25);
    buildTable();
    for (let pitch: number = World.minPitch; pitch <= World.maxPitch; pitch++) {
        const level: number = World.visPitchLevel(pitch);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThan(World.visLevelCount());
    }
});
