import { Combatant } from '../mechanics/combat.js';

/**
 * A goblin rogue with the "躲闪大师" passive:
 * 10% chance to completely dodge each incoming hit.
 */
export class GoblinRogue extends Combatant {
    constructor(name, maxHp, speed = 4) {
        super(name, maxHp, speed);
        /** Probability [0, 1] of dodging an incoming hit. */
        this.dodgeChance = 0.1;
    }
}
