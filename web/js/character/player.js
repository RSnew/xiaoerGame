import { Combatant } from '../mechanics/combat.js';

/** The player-controlled character. */
export class Player extends Combatant {
    constructor(name, maxHp) {
        super(name, maxHp);
        this.hand = [];
    }

    addCard(card) {
        this.hand.push(card);
    }
}
