import { Combatant } from '../mechanics/combat.js';

/** The Dragon boss: high HP, 5% dodge. */
export class Dragon extends Combatant {
    constructor(name, maxHp, speed = 4) {
        super(name, maxHp, speed);
        this.dodgeChance = 0.05;
    }
}
