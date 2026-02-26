import { Card, CardEffect } from './card.js';

/** Creates the basic defense card (1 shield for 1 turn). */
export function createDefenseCard() {
    return new Card('防御', '获得 1 点护盾，持续 1 回合', CardEffect.SHIELD, 1, '🛡️');
}
