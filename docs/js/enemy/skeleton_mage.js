import { Combatant } from '../mechanics/combat.js';

/** A skeleton mage enemy. Passive: starts with 1 shield. */
export class SkeletonMage extends Combatant {
    constructor(name, maxHp, speed = 2) {
        super(name, maxHp, speed);
        this.shield = 1; // passive: 亡灵护盾
    }
}
