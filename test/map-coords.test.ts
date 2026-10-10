// Run with: bun test (in Client-TS). World map coordinate maths (docs/design/world-map.md).
import { expect, test } from 'bun:test';

import { MAP_AREAS, areaForTile, clampToScreen, mapToScreen, parsePlayerPos, shouldFollowArea, stepZoom, tileToMap } from '#/mapview/MapCoords.js';

test('areas match the origins and sizes MapView uses for main, dungeon and extra', () => {
    expect(MAP_AREAS.map(a => [a.originX, a.originZ, a.width, a.height])).toEqual([
        [32 << 6, 41 << 6, 25 << 6, 22 << 6],
        [32 << 6, 141 << 6, 25 << 6, 22 << 6],
        [28 << 6, 63 << 6, 21 << 6, 17 << 6]
    ]);
});

test('areaForTile picks main, dungeon, extra or none', () => {
    expect(areaForTile(3222, 3218)).toBe(0); // Lumbridge
    expect(areaForTile(2717, 9802)).toBe(1); // King Black Dragon lair
    expect(areaForTile(3000, 4500)).toBe(2);
    expect(areaForTile(100, 100)).toBe(-1);
});

test('tileToMap flips z so north is up', () => {
    expect(tileToMap(MAP_AREAS[0], 3222, 3218)).toEqual({ x: 1174, y: 814 });
    expect(tileToMap(MAP_AREAS[1], 2717, 9802)).toEqual({ x: 669, y: 630 });
});

test('mapToScreen maps the window corners and centre', () => {
    expect(mapToScreen(100, 200, 100, 200, 300, 400, 900, 600)).toEqual({ x: 0, y: 0 });
    expect(mapToScreen(200, 300, 100, 200, 300, 400, 900, 600)).toEqual({ x: 450, y: 300 });
});

test('parsePlayerPos accepts only numeric x, z, level', () => {
    expect(parsePlayerPos({ x: 3222, z: 3218, level: 0 })).toEqual({ x: 3222, z: 3218, level: 0 });
    expect(parsePlayerPos({ x: '1', z: 2, level: 0 })).toBeNull();
    expect(parsePlayerPos(null)).toBeNull();
    expect(parsePlayerPos({ x: 1, z: 2 })).toBeNull();
});

test('stepZoom walks 3, 4, 6, 8 and clamps', () => {
    expect(stepZoom(4, 1)).toBe(6);
    expect(stepZoom(8, 1)).toBe(8);
    expect(stepZoom(4, -1)).toBe(3);
    expect(stepZoom(3, -1)).toBe(3);
    expect(stepZoom(6, -1)).toBe(4);
});

test('shouldFollowArea only when the area changes after a first position', () => {
    const lumb = { x: 3222, z: 3218, level: 0 };
    const kbd = { x: 3068, z: 10256, level: 0 };
    expect(shouldFollowArea(null, lumb)).toBe(false);
    expect(shouldFollowArea(lumb, { x: 3223, z: 3218, level: 0 })).toBe(false);
    expect(shouldFollowArea(lumb, kbd)).toBe(true);
    expect(shouldFollowArea(kbd, { x: 100, z: 100, level: 0 })).toBe(false); // outside every area
});

test('clampToScreen leaves inside points and pulls outside ones to the margin', () => {
    expect(clampToScreen(100, 100, 900, 600, 10)).toEqual({ x: 100, y: 100, inside: true });
    expect(clampToScreen(-50, 300, 900, 600, 10)).toEqual({ x: 10, y: 300, inside: false });
    expect(clampToScreen(2000, 900, 900, 600, 10)).toEqual({ x: 890, y: 590, inside: false });
});
