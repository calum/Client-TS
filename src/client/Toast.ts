// custom: task-complete toast. The server sends "<task name>:relictask:" as a game message (mods/relics/scripts/relic_offer.rs2 in
// the root repo); the client draws a fading panel at the top of the game view instead of a chat line. Design: docs/design/task-complete-toast.md.
import { Colour } from '#/graphics/Colour.js';
import Pix2D from '#/graphics/Pix2D.js';
import type PixFont from '#/graphics/PixFont.js';

export const TOAST_MARKER: string = ':relictask:';
export const TOAST_DURATION_MS: number = 2000;
const FADE_IN_MS: number = 200;
const FADE_OUT_MS: number = 300;

const PANEL_W: number = 250;
const PANEL_H: number = 38;
const PANEL_Y: number = 8;
const GOLD: number = 0xc8a03c;

/** The toast text from a game message, or null when the message is not a toast. */
export function parseToastMessage(message: string): string | null {
    if (!message.endsWith(TOAST_MARKER) || message.length === TOAST_MARKER.length) {
        return null;
    }
    return message.substring(0, message.length - TOAST_MARKER.length);
}

/** Opacity 0-256 at `elapsedMs` after the toast started: ramp in, hold, ramp out, 0 once TOAST_DURATION_MS has passed. */
export function toastAlpha(elapsedMs: number): number {
    if (elapsedMs <= 0 || elapsedMs >= TOAST_DURATION_MS) {
        return 0;
    }
    if (elapsedMs < FADE_IN_MS) {
        return Math.round((elapsedMs / FADE_IN_MS) * 256);
    }
    const left: number = TOAST_DURATION_MS - elapsedMs;
    if (left < FADE_OUT_MS) {
        return Math.round((left / FADE_OUT_MS) * 256);
    }
    return 256;
}

/** Draws the panel centred in the 512-wide game view. Clicks are not handled, so it never blocks the player. */
export function drawToast(text: string, elapsedMs: number, titleFont: PixFont | null, bodyFont: PixFont | null): void {
    const alpha: number = toastAlpha(elapsedMs);
    if (alpha === 0 || !titleFont || !bodyFont) {
        return;
    }

    const x: number = ((512 - PANEL_W) / 2) | 0;
    Pix2D.fillRectTrans(x, PANEL_Y, PANEL_W, PANEL_H, 0x1e1a14, (alpha * 220) >> 8);
    Pix2D.drawRectTrans(x, PANEL_Y, PANEL_W, PANEL_H, GOLD, alpha);
    Pix2D.drawRectTrans(x + 3, PANEL_Y + 3, PANEL_H - 6, PANEL_H - 6, GOLD, alpha);
    titleFont.drawStringTrans('R', x + 3 + (((PANEL_H - 6 - titleFont.stringWid('R')) / 2) | 0), PANEL_Y + 24, Colour.YELLOW, alpha);

    const textX: number = x + PANEL_H + 6;
    bodyFont.drawStringTrans('Relic task complete!', textX, PANEL_Y + 16, Colour.YELLOW, alpha);
    bodyFont.drawStringTrans(text, textX, PANEL_Y + 31, Colour.WHITE, alpha);
}
