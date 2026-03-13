import { Card, CardEffect } from './card.js';

/** Creates the heal card (restores 1 HP, 4s cooldown). */
export function createHealCard() {
    return new Card('治愈', '恢复 1 点生命值', CardEffect.HEAL, 1, '❤️', 4000);
}
