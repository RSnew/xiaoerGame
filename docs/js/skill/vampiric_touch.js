import { Skill, SkillEffect } from './skill.js';

/** Creates the "吸血之触" skill: deal 1 damage + heal 1 HP. Cooldown 18s. */
export function createVampiricTouch() {
    return new Skill('吸血之触', '对敌方造成 1 点伤害，同时恢复 1 点生命值', SkillEffect.DAMAGE_AND_HEAL, { damage: 1, heal: 1 }, 18000, '🧛');
}
