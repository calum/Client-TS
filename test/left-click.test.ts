// Run with: bun test (in Client-TS). "Left click attack" setting (docs/design/left-click-attack.md in the root repo).
import { expect, test } from 'bun:test';

import { LEFT_CLICK_STORAGE_KEY, demoteAttack, loadLeftClickAttack, saveLeftClickAttack } from '#/client/LeftClick.js';

const memory = (init: Record<string, string> = {}) => {
    const data: Record<string, string> = { ...init };
    return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
};

test('stock rule when the setting is off: Attack is demoted only when the NPC out-levels the player', () => {
    expect(demoteAttack(false, 100, 50)).toBe(true);
    expect(demoteAttack(false, 50, 50)).toBe(false);
    expect(demoteAttack(false, 10, 50)).toBe(false);
});

test('with the setting on, Attack is never demoted', () => {
    expect(demoteAttack(true, 100, 50)).toBe(false);
    expect(demoteAttack(true, 900, 3)).toBe(false);
});

test('default is ON when nothing is stored, storage is null, or the value is corrupt', () => {
    expect(loadLeftClickAttack(memory())).toBe(true);
    expect(loadLeftClickAttack(null)).toBe(true);
    expect(loadLeftClickAttack(memory({ [LEFT_CLICK_STORAGE_KEY]: 'banana' }))).toBe(true);
});

test('the choice persists through storage', () => {
    const s = memory();
    saveLeftClickAttack(s, false);
    expect(loadLeftClickAttack(s)).toBe(false);
    saveLeftClickAttack(s, true);
    expect(loadLeftClickAttack(s)).toBe(true);
});

test('blocked storage does not throw', () => {
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadLeftClickAttack(bad)).toBe(true);
    expect(() => saveLeftClickAttack(bad, false)).not.toThrow();
});
