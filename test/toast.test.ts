// Run with: bun test (in Client-TS). The task-complete toast: marker parsing and the fade timing (docs/design/task-complete-toast.md in the root repo).
import { expect, test } from 'bun:test';

import { TOAST_DURATION_MS, parseToastMessage, toastAlpha } from '#/client/Toast.js';

test('a message ending in :relictask: is a toast with the text before it', () => {
    expect(parseToastMessage('Catch a lobster:relictask:')).toBe('Catch a lobster');
});

test('other messages are not toasts', () => {
    expect(parseToastMessage('Relic task 12 complete!')).toBeNull();
    expect(parseToastMessage('x:tradereq:')).toBeNull();
    expect(parseToastMessage(':relictask:')).toBeNull();
});

test('alpha ramps in, holds, ramps out over 2 seconds, then ends', () => {
    expect(TOAST_DURATION_MS).toBe(2000);
    expect(toastAlpha(0)).toBe(0);
    expect(toastAlpha(100)).toBeGreaterThan(0);
    expect(toastAlpha(100)).toBeLessThan(256);
    expect(toastAlpha(200)).toBe(256);
    expect(toastAlpha(1000)).toBe(256);
    expect(toastAlpha(1850)).toBeGreaterThan(0);
    expect(toastAlpha(1850)).toBeLessThan(256);
    expect(toastAlpha(2000)).toBe(0);
    expect(toastAlpha(2500)).toBe(0);
    expect(toastAlpha(-5)).toBe(0);
});
