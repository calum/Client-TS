// Run with: bun test (in Client-TS). World map search (docs/design/map-search.md).
import { expect, test } from 'bun:test';

import { type IndexEntry, type SearchIndex, nearestSpawn, searchIndex, spawnsOf } from '#/mapview/MapSearch.js';

const index: SearchIndex = {
    v: 1,
    entries: [
        { id: 'mithrilrock1', name: 'mithrilrock1', kind: 'loc', at: [3000, 3100, 0, 3001, 3100, 0] },
        { id: 'mithrilrock2', name: 'mithrilrock2', kind: 'loc', at: [3002, 3100, 0] },
        { id: 'mithril_arrow', name: 'Mithril arrow', kind: 'obj', at: [3200, 3300, 0] },
        { id: 'giant', name: 'Giant', kind: 'npc', at: [3100, 3200, 0, 3110, 3210, 0] },
        { id: 'mossgiant', name: 'Moss giant', kind: 'npc', at: [3150, 3200, 0] },
        { id: 'knife', name: 'Knife', kind: 'obj', at: [3210, 3310, 0] }
    ]
};

test('a partial, case-insensitive query finds internal names and display names', () => {
    expect(searchIndex(index, 'MITH').map(r => r.entry.id).sort()).toEqual(['mithril_arrow', 'mithrilrock1', 'mithrilrock2']);
    expect(searchIndex(index, 'moss giant').map(r => r.entry.id)).toEqual(['mossgiant']);
});

test('several words must all match, spaces ignored between them', () => {
    expect(searchIndex(index, 'mithril rock').map(r => r.entry.id).sort()).toEqual(['mithrilrock1', 'mithrilrock2']);
});

test('results carry the spawn count and rank exact and prefix matches first', () => {
    const r = searchIndex(index, 'giant');
    expect(r[0].entry.id).toBe('giant');
    expect(r[0].count).toBe(2);
    expect(r.map(x => x.entry.id)).toEqual(['giant', 'mossgiant']);
});

test('an empty query and no match give no results; the limit applies', () => {
    expect(searchIndex(index, '  ')).toEqual([]);
    expect(searchIndex(index, 'zzz')).toEqual([]);
    expect(searchIndex(index, 'mith', 2).length).toBe(2);
});

test('spawnsOf unpacks coordinates, tags the map area and drops tiles outside every area', () => {
    const e: IndexEntry = { id: 'x', name: 'x', kind: 'npc', at: [3222, 3218, 0, 3068, 10256, 0, 10, 10, 0] };
    expect(spawnsOf(e)).toEqual([
        { x: 3222, z: 3218, level: 0, area: 0 },
        { x: 3068, z: 10256, level: 0, area: 1 }
    ]);
});

test('nearestSpawn prefers the viewed area, then the closest tile', () => {
    const s = [
        { x: 3000, z: 3000, level: 0, area: 0 },
        { x: 3100, z: 3100, level: 0, area: 0 },
        { x: 3068, z: 10256, level: 0, area: 1 }
    ];
    expect(nearestSpawn(s, { x: 3090, z: 3090, level: 0 }, 0)).toEqual(s[1]);
    // viewing the dungeon: the dungeon match wins even though a surface one is "closer" on paper
    expect(nearestSpawn(s, { x: 3090, z: 3090, level: 0 }, 1)).toEqual(s[2]);
    // nothing in the viewed area: fall back to the closest anywhere
    expect(nearestSpawn([s[0]], { x: 3090, z: 3090, level: 0 }, 1)).toEqual(s[0]);
    expect(nearestSpawn([], null, 0)).toBeNull();
    // no player position: the first spawn in the viewed area, else the first one
    expect(nearestSpawn(s, null, 0)).toEqual(s[0]);
    expect(nearestSpawn([s[2], s[0]], null, 0)).toEqual(s[0]);
    expect(nearestSpawn([s[2]], null, 0)).toEqual(s[2]);
});
