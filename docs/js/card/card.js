/** Card effect types — extend this object when adding new effects. */
export const CardEffect = Object.freeze({
    DAMAGE: 'damage',
    SHIELD: 'shield',
    // Future: HEAL, DRAW, …
});

/** A playable card. */
export class Card {
    constructor(name, description, effectType, effectValue, icon = '⚔️', cooldownMs = 3000) {
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.icon = icon;
        this.cooldownMs = cooldownMs;
        this.remainingCooldownMs = 0;
    }

    isReady() {
        return this.remainingCooldownMs === 0;
    }

    triggerCooldown() {
        this.remainingCooldownMs = this.cooldownMs;
    }

    setInitialCooldown(ms) {
        this.remainingCooldownMs = Math.max(0, ms);
    }

    tickCooldown(deltaMs) {
        this.remainingCooldownMs = Math.max(0, this.remainingCooldownMs - Math.max(0, deltaMs));
    }

    reduceCooldown(ms) {
        this.remainingCooldownMs = Math.max(0, this.remainingCooldownMs - Math.max(0, ms));
    }

    remainingCooldownSeconds() {
        if (this.remainingCooldownMs === 0) return 0;
        return Math.ceil(this.remainingCooldownMs / 1000);
    }
}
