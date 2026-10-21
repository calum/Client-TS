// Run with: bun test (in Client-TS). Side-tab hotkeys, remapping and Esc (docs/design/hotkeys-run-esc.md in the root repo).
import { expect, test } from 'bun:test';

import { KEYBINDS_MARKER, KEY_OPTIONS, TABS, defaultBindings, escapeAction, keyFromCh, loadBindings, PANEL, CLOSE_RECT, RESTORE_RECT, dropdownCell, dropdownRect, keyBox, panelHit, saveBindings, setBinding, tabForKey } from '#/client/Keybinds.js';

const tab = (name: string): number => TABS.findIndex(t => t.name === name);

test('F-key and Esc key codes map to key names, other codes to null', () => {
    expect(keyFromCh(1008)).toBe('F1');
    expect(keyFromCh(1019)).toBe('F12');
    expect(keyFromCh(27)).toBe('ESC');
    expect(keyFromCh(65)).toBeNull();
    expect(keyFromCh(1007)).toBeNull();
});

test('default bindings follow the official client: F1 combat, F2 skills, F3 quests, Esc inventory, F4 worn, F5 prayer, F6 magic', () => {
    const b = defaultBindings();
    expect(tabForKey(b, 'F1')).toBe(0);
    expect(tabForKey(b, 'F2')).toBe(1);
    expect(tabForKey(b, 'F3')).toBe(2);
    expect(tabForKey(b, 'ESC')).toBe(3);
    expect(tabForKey(b, 'F4')).toBe(4);
    expect(tabForKey(b, 'F5')).toBe(5);
    expect(tabForKey(b, 'F6')).toBe(6);
    expect(tabForKey(b, 'F12')).toBeNull();
});

test('every key option can be bound to a tab; None binds nothing', () => {
    expect(KEY_OPTIONS).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ESC', 'None']);
    expect(tabForKey(defaultBindings(), 'None')).toBeNull();
});

test('binding a key that another tab holds takes it from that tab (set to None)', () => {
    const b = setBinding(defaultBindings(), tab('Prayer'), 'F1');
    expect(b[tab('Prayer')]).toBe('F1');
    expect(b[tab('Combat Options')]).toBe('None');
    expect(tabForKey(b, 'F1')).toBe(tab('Prayer'));
});

test('setting None does not disturb other tabs', () => {
    const b = setBinding(defaultBindings(), tab('Prayer'), 'None');
    expect(b[tab('Prayer')]).toBe('None');
    expect(b[tab('Magic')]).toBe('F6');
});

test('bindings survive a save and load; garbage storage falls back to defaults', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const b = setBinding(defaultBindings(), tab('Magic'), 'F9');
    saveBindings(storage, b);
    expect(loadBindings(storage)).toEqual(b);

    store.set([...store.keys()][0], '{not json');
    expect(loadBindings(storage)).toEqual(defaultBindings());
    expect(loadBindings({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toEqual(defaultBindings());
});

test('Esc closes what is open before it selects a tab', () => {
    expect(escapeAction({ keybindsOpen: true, textInputOpen: true, modalOpen: true })).toBe('close-keybinds');
    expect(escapeAction({ keybindsOpen: false, textInputOpen: true, modalOpen: true })).toBe('close-text-input');
    expect(escapeAction({ keybindsOpen: false, textInputOpen: false, modalOpen: true })).toBe('close-modal');
    expect(escapeAction({ keybindsOpen: false, textInputOpen: false, modalOpen: false })).toBe('bound-tab');
});

test('the server opens the panel with a game message ending in the marker', () => {
    expect(KEYBINDS_MARKER).toBe(':keybinds:');
});

const mid = (r: { x: number; y: number; w: number; h: number }) => [r.x + (r.w >> 1), r.y + (r.h >> 1)] as const;

test('panel clicks: close, restore, a row opens its dropdown, a dropdown cell picks a key, outside is outside', () => {
    const closed = { open: true, dropdown: -1 };
    expect(panelHit(closed, ...mid(CLOSE_RECT))).toEqual({ kind: 'close' });
    expect(panelHit(closed, ...mid(RESTORE_RECT))).toEqual({ kind: 'restore' });
    expect(panelHit(closed, ...mid(keyBox(5)))).toEqual({ kind: 'row', row: 5 });
    expect(panelHit(closed, PANEL.x + 2, PANEL.y + 2)).toEqual({ kind: 'panel' });
    expect(panelHit(closed, 2, 2)).toEqual({ kind: 'outside' });

    const open = { open: true, dropdown: 12 }; // last row, whose dropdown must stay inside the panel
    const last = KEY_OPTIONS.length - 1;
    expect(panelHit(open, ...mid(dropdownCell(12, 0)))).toEqual({ kind: 'pick', row: 12, key: 'F1' });
    expect(panelHit(open, ...mid(dropdownCell(12, last)))).toEqual({ kind: 'pick', row: 12, key: 'None' });
    const d = dropdownRect(12);
    expect(d.x + d.w).toBeLessThanOrEqual(PANEL.x + PANEL.w);
    expect(d.y + d.h).toBeLessThanOrEqual(PANEL.y + PANEL.h);
});

test('every row, the restore button and the close button are inside the panel and do not overlap', () => {
    const rects = [CLOSE_RECT, RESTORE_RECT, ...TABS.map((_, i) => keyBox(i))];
    for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(PANEL.x);
        expect(r.x + r.w).toBeLessThanOrEqual(PANEL.x + PANEL.w);
        expect(r.y + r.h).toBeLessThanOrEqual(PANEL.y + PANEL.h);
    }
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
        }
    }
});
