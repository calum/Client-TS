// Pure coordinate helpers for the world map (docs/design/world-map.md).
// Origins and sizes mirror MapView.reloadMain / reloadDungeon / reloadExtra.

export type MapArea = { id: number; originX: number; originZ: number; width: number; height: number };
export type PlayerPos = { x: number; z: number; level: number };

export const MAP_AREAS: MapArea[] = [
    { id: 0, originX: 32 << 6, originZ: 41 << 6, width: 25 << 6, height: 22 << 6 },
    { id: 1, originX: 32 << 6, originZ: 141 << 6, width: 25 << 6, height: 22 << 6 },
    { id: 2, originX: 28 << 6, originZ: 63 << 6, width: 21 << 6, height: 17 << 6 }
];

export const WORLD_MAP_CHANNEL: string = 'lostcity-worldmap';

// Absolute tile to the area that holds it (0 main, 1 dungeon, 2 extra) or -1.
export function areaForTile(x: number, z: number): number {
    for (const a of MAP_AREAS) {
        if (x >= a.originX && x < a.originX + a.width && z >= a.originZ && z < a.originZ + a.height) {
            return a.id;
        }
    }
    return -1;
}

// Map-space position of a tile (z is flipped: north is up), as in MapView's label drawing.
export function tileToMap(area: MapArea, x: number, z: number): { x: number; y: number } {
    return { x: x - area.originX, y: area.originZ + area.height - z };
}

// Map-space position to a pixel inside the drawn window, as in MapView's label drawing.
export function mapToScreen(mapX: number, mapY: number, left: number, top: number, right: number, bottom: number, width: number, height: number): { x: number; y: number } {
    return {
        x: ((width * (mapX - left)) / (right - left)) | 0,
        y: ((height * (mapY - top)) / (bottom - top)) | 0
    };
}

export function parsePlayerPos(data: unknown): PlayerPos | null {
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const d = data as Record<string, unknown>;
    if (typeof d.x !== 'number' || typeof d.z !== 'number' || typeof d.level !== 'number') {
        return null;
    }
    return { x: d.x, z: d.z, level: d.level };
}
