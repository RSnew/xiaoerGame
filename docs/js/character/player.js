import { Combatant } from '../mechanics/combat.js';

export const MAX_CARDS = 4;
export const MAX_SKILLS = 2;

/** The player-controlled character. */
export class Player extends Combatant {
    constructor(name, maxHp, speed = 3) {
        super(name, maxHp, speed);
        this.hand = [];
        this.skills = [];
    }

    /** Add a card to hand. Returns false if already at max capacity. */
    addCard(card) {
        if (this.hand.length >= MAX_CARDS) return false;
        this.hand.push(card);
        return true;
    }

    /** Equip a skill. Returns false if already at max capacity. */
    equipSkill(skill) {
        if (this.skills.length >= MAX_SKILLS) return false;
        this.skills.push(skill);
        return true;
    }

    /** Tick all skill cooldowns by one turn. */
    tickSkillCooldowns(deltaMs) {
        for (const skill of this.skills) {
            skill.tickCooldown(deltaMs);
        }
    }
}
