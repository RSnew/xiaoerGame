import { Combatant } from '../mechanics/combat.js';

/** A basic slime enemy. */
export class Slime extends Combatant {
    constructor(name, maxHp, speed = 3) {
        super(name, maxHp, speed);
    }
}
