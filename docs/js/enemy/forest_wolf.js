import { Combatant } from '../mechanics/combat.js';

/** A fast forest wolf. Passive: 15% dodge chance. */
export class ForestWolf extends Combatant {
    constructor(name, maxHp, speed = 5) {
        super(name, maxHp, speed);
        this.dodgeChance = 0.15;
    }
}
