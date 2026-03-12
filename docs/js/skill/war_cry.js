import { Skill, SkillEffect } from './skill.js';

/** Creates the "战吼" skill: gain 2 shield. Cooldown 12s. */
export function createWarCry() {
    return new Skill('战吼', '获得 2 点护盾', SkillEffect.GAIN_SHIELD, 2, 12000, '📯');
}
