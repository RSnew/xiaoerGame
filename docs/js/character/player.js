import { Combatant } from '../mechanics/combat.js';

export const MAX_SKILLS = 2;

/** The player-controlled character. */
export class Player extends Combatant {
    constructor(name, maxHp) {
        super(name, maxHp);
        this.hand = [];
        this.skills = [];
    }

    addCard(card) {
        this.hand.push(card);
    }

    /** Equip a skill. Returns false if already at max capacity. */
    equipSkill(skill) {
        if (this.skills.length >= MAX_SKILLS) return false;
        this.skills.push(skill);
        return true;
    }

    /** Tick all skill cooldowns by one turn. */
    tickSkillCooldowns() {
        for (const skill of this.skills) {
            skill.tickCooldown();
        }
    }
}
