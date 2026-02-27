import { Skill, SkillEffect } from './skill.js';

/**
 * Creates the "快速循环" skill:
 * - 冷却：20 秒（4 回合）
 * - 开局 5 秒后可用（初始冷却 1 回合）
 * - 效果：为当前所有卡牌减少 1 秒 CD
 */
export function createFastCycle() {
    const s = new Skill(
        '快速循环',
        '开局 5 秒后可用；使当前所有卡牌冷却减少 1 秒',
        SkillEffect.REDUCE_ALL_CARD_COOLDOWN,
        1, // seconds
        4,
        '🌀'
    );
    s.currentCooldown = 1;
    return s;
}

