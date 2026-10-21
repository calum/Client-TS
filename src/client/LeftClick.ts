// custom: "left click attack" setting. The 2004 client demotes an NPC's Attack option to the right-click menu when the NPC's combat level
// is above the player's (Client.addNpcOptions). With this setting ON (the default here) Attack keeps its normal left-click position.
// Docs: docs/design/left-click-attack.md in the root repo.
export const LEFT_CLICK_STORAGE_KEY: string = 'lostcity.leftclickattack.v1';

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void };

/** True when the attack option should be demoted (the stock rule): the NPC out-levels the player and the setting is off. */
export function demoteAttack(leftClickAttack: boolean, npcLevel: number, playerLevel: number): boolean {
    return !leftClickAttack && npcLevel > playerLevel;
}

/** Stored as "1"/"0"; anything else (missing, corrupt, blocked storage) gives the default, ON. */
export function loadLeftClickAttack(storage: StorageLike | null): boolean {
    try {
        return storage?.getItem(LEFT_CLICK_STORAGE_KEY) !== '0';
    } catch (_e) {
        return true;
    }
}

export function saveLeftClickAttack(storage: StorageLike | null, on: boolean): void {
    try {
        storage?.setItem(LEFT_CLICK_STORAGE_KEY, on ? '1' : '0');
    } catch (_e) {
        // storage blocked: the choice lasts until the page is closed
    }
}
