import { createAttackCard } from '../card/attack.js';
import { createDefenseCard } from '../card/defense.js';
import { createEmergencyHeal } from '../skill/emergency_heal.js';
import { createFastCycle } from '../skill/fast_cycle.js';

export const MAX_EQUIPPED_CARDS = 4;
export const MAX_EQUIPPED_SKILLS = 2;

export const ALL_CARDS = [
    {
        id: 'attack',
        name: '攻击',
        icon: '⚔️',
        description: '造成 1 点伤害',
        typeBadge: '伤害 1',
        typeClass: 'badge-damage',
        rarity: '普通',
        factory: createAttackCard,
    },
    {
        id: 'defense',
        name: '防御',
        icon: '🛡️',
        description: '获得 1 点护盾，持续 1 回合',
        typeBadge: '护盾 1',
        typeClass: 'badge-shield',
        factory: createDefenseCard,
    },
];

export const ALL_SKILLS = [
    {
        id: 'emergency_heal',
        name: '紧急救治',
        icon: '💊',
        description: '恢复 1 点生命值',
        typeBadge: '治疗 1',
        typeClass: 'badge-heal',
        cooldown: 4,
        factory: createEmergencyHeal,
    },
    {
        id: 'fast_cycle',
        name: '快速循环',
        icon: '🌀',
        description: '开局 5 秒后可用；使当前所有卡牌冷却减少 1 秒',
        typeBadge: '减 CD 1 秒',
        typeClass: 'badge-utility',
        cooldown: 4,
        factory: createFastCycle,
    },
];

export function getCardById(id) {
    return ALL_CARDS.find(c => c.id === id);
}

export function getSkillById(id) {
    return ALL_SKILLS.find(s => s.id === id);
}
