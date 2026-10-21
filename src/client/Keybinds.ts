// custom: side-tab hotkeys, a remap panel and the Esc rules. Rev 274 has none of this; the layout copies the official client's
// Settings > Controls > Keybinds (a key per tab, F1-F12 / ESC / None, "Restore default keybinds"). The panel is drawn by the client
// (like Toast.ts) and opened with `::keybinds` or a game message ending in KEYBINDS_MARKER. Bindings live in the browser's
// localStorage, not on the server. Design: docs/design/hotkeys-run-esc.md in the root repo.
import { Colour } from '#/graphics/Colour.js';
import Pix2D from '#/graphics/Pix2D.js';
import type PixFont from '#/graphics/PixFont.js';

export const KEYBINDS_MARKER: string = ':keybinds:';
export const STORAGE_KEY: string = 'lostcity.keybinds.v1';

export const KEY_OPTIONS: string[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ESC', 'None'];
export type KeyName = string;

/** `icon` is the sidebar index used by Client.activeIcon / sideIcon (index 7 is unused in this revision). */
export const TABS: { icon: number; name: string; def: KeyName }[] = [
    { icon: 0, name: 'Combat Options', def: 'F1' },
    { icon: 1, name: 'Skills', def: 'F2' },
    { icon: 2, name: 'Quest Journal', def: 'F3' },
    { icon: 3, name: 'Inventory', def: 'ESC' },
    { icon: 4, name: 'Worn Equipment', def: 'F4' },
    { icon: 5, name: 'Prayer', def: 'F5' },
    { icon: 6, name: 'Magic', def: 'F6' },
    { icon: 8, name: 'Friends List', def: 'F8' },
    { icon: 9, name: 'Ignore List', def: 'F9' },
    { icon: 10, name: 'Logout', def: 'None' },
    { icon: 11, name: 'Game Options', def: 'F10' },
    { icon: 12, name: 'Player Controls', def: 'F11' },
    { icon: 13, name: 'Music Player', def: 'None' }
];

export type Bindings = KeyName[];

export function defaultBindings(): Bindings {
    return TABS.map(t => t.def);
}

/** Key name for a queued key code: GameShell queues F1-F12 as 1008-1019 and Esc as 27. */
export function keyFromCh(ch: number): KeyName | null {
    if (ch >= 1008 && ch <= 1019) {
        return 'F' + (ch - 1007);
    }
    return ch === 27 ? 'ESC' : null;
}

/** Index into TABS of the tab bound to `key`, or null. */
export function tabForKey(b: Bindings, key: KeyName): number | null {
    if (key === 'None') {
        return null;
    }
    const i: number = b.indexOf(key);
    return i === -1 ? null : i;
}

/** Returns new bindings; a key held by another tab is taken from it (that tab becomes None). */
export function setBinding(b: Bindings, tab: number, key: KeyName): Bindings {
    return b.map((old, i) => (i === tab ? key : key !== 'None' && old === key ? 'None' : old));
}

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export function loadBindings(storage: StorageLike | null): Bindings {
    try {
        const raw: string | null = storage?.getItem(STORAGE_KEY) ?? null;
        if (raw !== null) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === TABS.length && parsed.every(k => KEY_OPTIONS.includes(k))) {
                return parsed as Bindings;
            }
        }
    } catch (_e) {
        // blocked or corrupt storage: use the defaults
    }
    return defaultBindings();
}

export function saveBindings(storage: StorageLike | null, b: Bindings): void {
    try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(b));
    } catch (_e) {
        // storage blocked: bindings last until the page is closed
    }
}

export type EscAction = 'close-keybinds' | 'close-text-input' | 'close-modal' | 'bound-tab';

/** What Esc does: close the topmost thing that is open, else select the tab bound to ESC. */
export function escapeAction(s: { keybindsOpen: boolean; textInputOpen: boolean; modalOpen: boolean }): EscAction {
    if (s.keybindsOpen) {
        return 'close-keybinds';
    }
    if (s.textInputOpen) {
        return 'close-text-input';
    }
    return s.modalOpen ? 'close-modal' : 'bound-tab';
}

// ---------------------------------------------------------------- panel layout (coordinates in the 512x334 game view)

export type Rect = { x: number; y: number; w: number; h: number };
export const PANEL: Rect = { x: 36, y: 30, w: 440, h: 270 };
export const CLOSE_RECT: Rect = { x: PANEL.x + PANEL.w - 24, y: PANEL.y + 6, w: 18, h: 18 };
const ROWS_PER_COL: number = 7;
const COL_W: number = 210;
const ROW_H: number = 28;
const KEY_BOX_W: number = 70;
const CELL_W: number = 40;
const CELL_H: number = 16;
const CELL_COLS: number = 4;

export function rowLabelPos(i: number): { x: number; y: number } {
    return { x: PANEL.x + 16 + ((i / ROWS_PER_COL) | 0) * COL_W, y: PANEL.y + 44 + (i % ROWS_PER_COL) * ROW_H };
}

export function keyBox(i: number): Rect {
    const p = rowLabelPos(i);
    return { x: p.x + 110, y: p.y, w: KEY_BOX_W, h: 20 };
}

/** The "Restore default keybinds" button takes the slot after the last row. */
export const RESTORE_RECT: Rect = (() => {
    const p = rowLabelPos(TABS.length);
    return { x: p.x, y: p.y, w: 180, h: 20 };
})();

export function dropdownRect(row: number): Rect {
    const box: Rect = keyBox(row);
    const w: number = CELL_W * CELL_COLS;
    const h: number = CELL_H * Math.ceil(KEY_OPTIONS.length / CELL_COLS);
    return { x: Math.min(box.x, PANEL.x + PANEL.w - w - 4), y: Math.min(box.y + box.h, PANEL.y + PANEL.h - h - 4), w, h };
}

export function dropdownCell(row: number, k: number): Rect {
    const d: Rect = dropdownRect(row);
    return { x: d.x + (k % CELL_COLS) * CELL_W, y: d.y + ((k / CELL_COLS) | 0) * CELL_H, w: CELL_W, h: CELL_H };
}

function within(r: Rect, x: number, y: number): boolean {
    return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export type PanelState = { open: boolean; dropdown: number };
export type PanelHit = { kind: 'close' } | { kind: 'restore' } | { kind: 'row'; row: number } | { kind: 'pick'; row: number; key: KeyName } | { kind: 'panel' } | { kind: 'outside' };

/** What a click at (x, y) in game-view coordinates hits. An open dropdown is on top and takes every click inside the panel first. */
export function panelHit(s: PanelState, x: number, y: number): PanelHit {
    if (s.dropdown !== -1) {
        for (let k: number = 0; k < KEY_OPTIONS.length; k++) {
            if (within(dropdownCell(s.dropdown, k), x, y)) {
                return { kind: 'pick', row: s.dropdown, key: KEY_OPTIONS[k] };
            }
        }
    }
    if (!within(PANEL, x, y)) {
        return { kind: 'outside' };
    }
    if (within(CLOSE_RECT, x, y)) {
        return { kind: 'close' };
    }
    if (within(RESTORE_RECT, x, y)) {
        return { kind: 'restore' };
    }
    for (let i: number = 0; i < TABS.length; i++) {
        if (within(keyBox(i), x, y)) {
            return { kind: 'row', row: i };
        }
    }
    return { kind: 'panel' };
}

const GOLD: number = 0xc8a03c;
const DARK: number = 0x2b261c;

function box(r: Rect, fill: number): void {
    Pix2D.fillRect(r.x, r.y, r.w, r.h, fill);
    Pix2D.drawRect(r.x, r.y, r.w, r.h, 0x000000);
}

export function drawKeybinds(s: PanelState, b: Bindings, mouseX: number, mouseY: number, titleFont: PixFont | null, bodyFont: PixFont | null): void {
    if (!s.open || !titleFont || !bodyFont) {
        return;
    }
    Pix2D.fillRectTrans(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x1e1a14, 235);
    Pix2D.drawRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, GOLD);
    Pix2D.drawRect(PANEL.x + 1, PANEL.y + 1, PANEL.w - 2, PANEL.h - 2, 0x5a4b2a);
    titleFont.centreString('Keybinds', PANEL.x + ((PANEL.w / 2) | 0), PANEL.y + 22, Colour.ORANGE1);
    box(CLOSE_RECT, within(CLOSE_RECT, mouseX, mouseY) ? 0x6b3a2a : DARK);
    titleFont.centreString('X', CLOSE_RECT.x + 9, CLOSE_RECT.y + 14, Colour.WHITE);

    for (let i: number = 0; i < TABS.length; i++) {
        const p = rowLabelPos(i);
        bodyFont.drawString(TABS[i].name, p.x, p.y + 14, Colour.WHITE);
        const kb: Rect = keyBox(i);
        box(kb, s.dropdown === i || within(kb, mouseX, mouseY) ? 0x4a4030 : DARK);
        bodyFont.centreString(b[i], kb.x + ((kb.w / 2) | 0), kb.y + 14, b[i] === 'None' ? 0x9a9a9a : Colour.ORANGE1);
    }
    box(RESTORE_RECT, within(RESTORE_RECT, mouseX, mouseY) ? 0x4a4030 : DARK);
    bodyFont.centreString('Restore default keybinds', RESTORE_RECT.x + 90, RESTORE_RECT.y + 14, Colour.WHITE);
    bodyFont.centreString('Esc closes this panel. Saved in this browser.', PANEL.x + ((PANEL.w / 2) | 0), PANEL.y + PANEL.h - 8, 0x9a9a9a);

    if (s.dropdown !== -1) {
        const d: Rect = dropdownRect(s.dropdown);
        box(d, 0x14110c);
        for (let k: number = 0; k < KEY_OPTIONS.length; k++) {
            const c: Rect = dropdownCell(s.dropdown, k);
            if (within(c, mouseX, mouseY)) {
                Pix2D.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, 0x4a4030);
            }
            bodyFont.centreString(KEY_OPTIONS[k], c.x + ((c.w / 2) | 0), c.y + 12, KEY_OPTIONS[k] === b[s.dropdown] ? Colour.YELLOW : Colour.WHITE);
        }
    }
}
