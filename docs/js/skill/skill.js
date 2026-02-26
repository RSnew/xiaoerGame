/** Skill effect types. */
export const SkillEffect = Object.freeze({
    HEAL: 'heal',
});

/** An equippable skill with a cooldown. */
export class Skill {
    constructor(name, description, effectType, effectValue, cooldown, icon = '💊') {
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.icon = icon;
    }

    isReady() {
        return this.currentCooldown === 0;
    }

    triggerCooldown() {
        this.currentCooldown = this.cooldown;
    }

    /** Tick one turn. Returns true if the skill just became ready. */
    tickCooldown() {
        if (this.currentCooldown > 0) {
            this.currentCooldown--;
            return this.currentCooldown === 0;
        }
        return false;
    }
}
