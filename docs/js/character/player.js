import { Combatant } from '../mechanics/combat.js';

export const MAX_CARDS = 6;
export const MAX_SKILLS = 3;
export const DEFAULT_MAX_ENERGY = 4;

/** The player-controlled character. */
export class Player extends Combatant {
    constructor(name, maxHp, speed = 3, passive = null) {
        super(name, maxHp, speed);
        this.hand = [];
        this.skills = [];
        this.passive = passive;
        this.maxEnergy = DEFAULT_MAX_ENERGY;
        this.energy = this.maxEnergy;
        this.relics = [];
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

    victoryBonusGold() {
        let bonus = this.passive?.victoryBonusGold ? Number(this.passive.victoryBonusGold) : 0;
        for (const r of this.relics) {
            if (r.victoryBonusGold) bonus += r.victoryBonusGold;
        }
        return bonus;
    }

    /** Spend energy. Returns false if not enough. */
    spendEnergy(amount) {
        if (this.energy < amount) return false;
        this.energy -= amount;
        return true;
    }

    /** Refill energy to max at round start. */
    refillEnergy() {
        this.energy = this.maxEnergy;
    }

    /** Add a relic to the player. */
    addRelic(relic) {
        this.relics.push(relic);
        if (relic.onAcquire) relic.onAcquire(this);
    }

    /** Check if player has a specific relic by id. */
    hasRelic(id) {
        return this.relics.some(r => r.id === id);
    }

    /** Get sum of a numeric relic property. */
    relicSum(prop) {
        let sum = 0;
        for (const r of this.relics) {
            if (r[prop]) sum += r[prop];
        }
        return sum;
    }

    /** Reset HP and cooldowns for a new battle. */
    resetForBattle() {
        this.hp = this.maxHp;
        this.shield = 0;
        this.energy = this.maxEnergy;
        for (const card of this.hand) {
            card.setInitialCooldown(0);
        }
        for (const skill of this.skills) {
            skill.setInitialCooldown(0);
        }
    }
}
