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

export const ZOOM_STEPS: number[] = [3, 4, 6, 8];

// Next zoom level in the given direction (1 in, -1 out), clamped to the ends of ZOOM_STEPS.
export function stepZoom(current: number, direction: number): number {
    let index: number = ZOOM_STEPS.indexOf(current);
    if (index === -1) {
        index = 1;
    }
    index = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index + (direction > 0 ? 1 : -1)));
    return ZOOM_STEPS[index];
}

// True when a new position is in a different map area from the previous one (so the map should follow).
export function shouldFollowArea(prev: PlayerPos | null, next: PlayerPos): boolean {
    if (!prev) {
        return false;
    }
    const to: number = areaForTile(next.x, next.z);
    return to !== -1 && to !== areaForTile(prev.x, prev.z);
}

// Pull an off-screen point onto the window edge. `inside` is true when no clamping was needed.
export function clampToScreen(x: number, y: number, width: number, height: number, margin: number): { x: number; y: number; inside: boolean } {
    const cx: number = Math.max(margin, Math.min(width - margin, x));
    const cy: number = Math.max(margin, Math.min(height - margin, y));
    return { x: cx, y: cy, inside: cx === x && cy === y };
}
