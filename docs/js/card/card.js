/** Card effect types — extend this object when adding new effects. */
export const CardEffect = Object.freeze({
    DAMAGE: 'damage',
    SHIELD: 'shield',
    HEAL: 'heal',
});

/** Card category — physical cards use energy, spell cards use mana. */
export const CardType = Object.freeze({
    PHYSICAL: 'physical',
    SPELL: 'spell',
});

/** A playable card. */
export class Card {
    constructor(name, description, effectType, effectValue, icon = '⚔️', cooldownMs = 3000, energyCost = 1, cardType = CardType.PHYSICAL, manaCost = 0) {
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.icon = icon;
        this.cooldownMs = cooldownMs;
        this.energyCost = energyCost;
        this.cardType = cardType;
        this.manaCost = manaCost;
        this.remainingCooldownMs = 0;
    }

    /** Whether this card is a spell (uses mana). */
    get isSpell() { return this.cardType === CardType.SPELL; }

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
