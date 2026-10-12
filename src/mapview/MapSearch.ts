// Search over the world-map index (Engine-TS/public/mapsearch.json, built by scripts/build-map-search.mjs;
// docs/design/map-search.md). Pure functions so they can be unit tested.

import { areaForTile } from '#/mapview/MapCoords.js';

export type SearchKind = 'npc' | 'obj' | 'loc';
export type IndexEntry = { id: string; name: string; kind: SearchKind; at: number[] };
export type SearchIndex = { v: number; entries: IndexEntry[] };
export type SearchResult = { entry: IndexEntry; count: number };
export type Spawn = { x: number; z: number; level: number; area: number };

// Every whitespace-separated word of the query must appear in the internal name or the display name
// (case-insensitive, spaces removed from both so "mithril rock" finds "mithrilrock1").
// Ranked: exact name, then prefix, then the rest; ties by spawn count.
export function searchIndex(index: SearchIndex, query: string, limit: number = 20): SearchResult[] {
    const words: string[] = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
        return [];
    }
    const joined: string = words.join('');
    const scored: { r: SearchResult; rank: number }[] = [];
    for (const entry of index.entries) {
        const id: string = entry.id.toLowerCase().replace(/[\s_]/g, '');
        const name: string = entry.name.toLowerCase().replace(/[\s_]/g, '');
        if (!words.every(w => id.includes(w) || name.includes(w) || (words.length > 1 && (id.includes(joined) || name.includes(joined))))) {
            continue;
        }
        const rank: number = id === joined || name === joined ? 0 : id.startsWith(joined) || name.startsWith(joined) ? 1 : 2;
        scored.push({ r: { entry, count: entry.at.length / 3 }, rank });
    }
    scored.sort((a, b) => a.rank - b.rank || b.r.count - a.r.count || (a.r.entry.id < b.r.entry.id ? -1 : 1));
    return scored.slice(0, limit).map(s => s.r);
}

// Unpacks [x, z, level, ...] and tags each tile with its map area; tiles outside every area are dropped.
export function spawnsOf(entry: IndexEntry): Spawn[] {
    const out: Spawn[] = [];
    for (let i = 0; i + 2 < entry.at.length; i += 3) {
        const area: number = areaForTile(entry.at[i], entry.at[i + 1]);
        if (area !== -1) {
            out.push({ x: entry.at[i], z: entry.at[i + 1], level: entry.at[i + 2], area });
        }
    }
    return out;
}

// The spawn to pan to: closest to the player among those in the area being viewed; if there are none
// there, the closest anywhere. Without a player position, the first one in the viewed area (else the first overall).
export function nearestSpawn(spawns: Spawn[], from: { x: number; z: number; level: number } | null, fromArea: number): Spawn | null {
    if (spawns.length === 0) {
        return null;
    }
    const inArea: Spawn[] = spawns.filter(s => s.area === fromArea);
    const pool: Spawn[] = inArea.length > 0 ? inArea : spawns;
    if (!from) {
        return pool[0];
    }
    let best: Spawn = pool[0];
    let bestD: number = Number.MAX_VALUE;
    for (const s of pool) {
        const d: number = (s.x - from.x) ** 2 + (s.z - from.z) ** 2;
        if (d < bestD) {
            bestD = d;
            best = s;
        }
    }
    return best;
}

// The order Next/Previous walks through: the viewed area first, then the other areas by number; inside an
// area nearest the player first (index order when there is no player position).
export function orderSpawns(spawns: Spawn[], from: { x: number; z: number; level: number } | null, fromArea: number): Spawn[] {
    const rank = (a: number): number => (a === fromArea ? -1 : a);
    const dist = (s: Spawn): number => (from ? (s.x - from.x) ** 2 + (s.z - from.z) ** 2 : 0);
    return spawns
        .map((s, i) => ({ s, i }))
        .sort((a, b) => rank(a.s.area) - rank(b.s.area) || dist(a.s) - dist(b.s) || a.i - b.i)
        .map(e => e.s);
}

// The spawn after (direction > 0) or before the current one, wrapping around. With none selected: first or last.
export function stepSpawn(ordered: Spawn[], current: Spawn | null, direction: number): Spawn | null {
    if (ordered.length === 0) {
        return null;
    }
    const at: number = current ? ordered.indexOf(current) : -1;
    if (at === -1) {
        return direction > 0 ? ordered[0] : ordered[ordered.length - 1];
    }
    return ordered[(at + (direction > 0 ? 1 : -1) + ordered.length) % ordered.length];
}
