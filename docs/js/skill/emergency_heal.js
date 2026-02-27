import { Skill, SkillEffect } from './skill.js';

/** Creates the "紧急救治" skill: cooldown 20s, heals 1 HP, available at start. */
export function createEmergencyHeal() {
    return new Skill('紧急救治', '恢复 1 点生命值', SkillEffect.HEAL, 1, 20000, '💊');
}
