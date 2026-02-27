/** Skill effect types. */
export const SkillEffect = Object.freeze({
    HEAL: 'heal',
    REDUCE_ALL_CARD_COOLDOWN: 'reduce_all_card_cooldown',
});

/** An equippable skill with a cooldown. */
export class Skill {
    constructor(name, description, effectType, effectValue, cooldownMs, icon = '💊') {
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.cooldownMs = Math.max(0, Number(cooldownMs) || 0);
        this.remainingCooldownMs = 0;
        this.icon = icon;
    }

    isReady() {
        return this.remainingCooldownMs === 0;
    }

    triggerCooldown() {
        this.remainingCooldownMs = this.cooldownMs;
    }

    setInitialCooldown(ms) {
        this.remainingCooldownMs = Math.max(0, Number(ms) || 0);
    }

    tickCooldown(deltaMs) {
        const d = Math.max(0, Number(deltaMs) || 0);
        if (this.remainingCooldownMs > 0 && d > 0) {
            const before = this.remainingCooldownMs;
            this.remainingCooldownMs = Math.max(0, this.remainingCooldownMs - d);
            return before > 0 && this.remainingCooldownMs === 0;
        }
        return false;
    }

    remainingCooldownSeconds() {
        if (this.remainingCooldownMs === 0) return 0;
        return Math.ceil(this.remainingCooldownMs / 1000);
    }
}
