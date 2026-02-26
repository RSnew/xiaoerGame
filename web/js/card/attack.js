import { Card, CardEffect } from './card.js';

/** Creates the basic attack card (1 damage). */
export function createAttackCard() {
    return new Card('攻击', '造成 1 点伤害', CardEffect.DAMAGE, 1, '⚔️');
}
