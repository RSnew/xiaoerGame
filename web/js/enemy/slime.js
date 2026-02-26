import { Combatant } from '../mechanics/combat.js';

/** A basic slime enemy. */
export class Slime extends Combatant {
    constructor(name, maxHp) {
        super(name, maxHp);
    }
}
