import { Card, CardEffect } from './card.js';

/** Creates the critical strike card (2 damage, 5s cooldown). */
export function createCriticalStrikeCard() {
    return new Card('暴击', '造成 2 点伤害', CardEffect.DAMAGE, 2, '💥', 5000, 2);
}
