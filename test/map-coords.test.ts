// Run with: bun test (in Client-TS). World map coordinate maths (docs/design/world-map.md).
import { expect, test } from 'bun:test';

import { MAP_AREAS, areaForTile, mapToScreen, parsePlayerPos, tileToMap } from '#/mapview/MapCoords.js';

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
