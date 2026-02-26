/** Card effect types — extend this object when adding new effects. */
export const CardEffect = Object.freeze({
    DAMAGE: 'damage',
    // Future: HEAL, SHIELD, DRAW, …
});

/** A playable card. */
export class Card {
    constructor(name, description, effectType, effectValue, icon = '⚔️') {
        this.name = name;
        this.description = description;
        this.effectType = effectType;
        this.effectValue = effectValue;
        this.icon = icon;
    }
}
