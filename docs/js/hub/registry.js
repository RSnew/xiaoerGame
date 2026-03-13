import { createAttackCard } from '../card/attack.js';
import { createDefenseCard } from '../card/defense.js';
import { createCriticalStrikeCard } from '../card/critical_strike.js';
import { createHealCard } from '../card/heal.js';
import { createEmergencyHeal } from '../skill/emergency_heal.js';
import { createFastCycle } from '../skill/fast_cycle.js';
import { createVampiricTouch } from '../skill/vampiric_touch.js';
import { createWarCry } from '../skill/war_cry.js';

export const MAX_EQUIPPED_CARDS = 6;
export const MAX_EQUIPPED_SKILLS = 3;

export const ALL_CARDS = [
    {
        id: 'attack',
        name: '攻击',
        icon: '⚔️',
        description: '造成 1 点伤害（⚡1）',
        typeBadge: '伤害 1',
        typeClass: 'badge-damage',
        energyCost: 1,
        rarity: '普通',
        factory: createAttackCard,
    },
    {
        id: 'defense',
        name: '防御',
        icon: '🛡️',
        description: '获得 1 点护盾，持续 1 回合（⚡1）',
        typeBadge: '护盾 1',
        typeClass: 'badge-shield',
        energyCost: 1,
        factory: createDefenseCard,
    },
    {
        id: 'critical_strike',
        name: '暴击',
        icon: '💥',
        description: '造成 2 点伤害（⚡2，5秒冷却）',
        typeBadge: '伤害 2',
        typeClass: 'badge-damage',
        energyCost: 2,
        shopPrice: 4,
        factory: createCriticalStrikeCard,
    },
    {
        id: 'heal',
        name: '治愈',
        icon: '❤️',
        description: '恢复 1 点生命值（⚡1，4秒冷却）',
        typeBadge: '治疗 1',
        typeClass: 'badge-heal',
        energyCost: 1,
        shopPrice: 3,
        factory: createHealCard,
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
        cooldownSeconds: 20,
        initialDelaySeconds: 0,
        factory: createEmergencyHeal,
    },
    {
        id: 'fast_cycle',
        name: '快速循环',
        icon: '🌀',
        description: '开局 5 秒后可用；使当前所有卡牌冷却减少 1 秒',
        typeBadge: '减 CD 1 秒',
        typeClass: 'badge-utility',
        cooldownSeconds: 20,
        initialDelaySeconds: 5,
        factory: createFastCycle,
    },
    {
        id: 'vampiric_touch',
        name: '吸血之触',
        icon: '🧛',
        description: '对敌方造成 1 伤害并恢复 1 血（18秒冷却）',
        typeBadge: '吸血',
        typeClass: 'badge-damage',
        cooldownSeconds: 18,
        initialDelaySeconds: 0,
        shopPrice: 5,
        factory: createVampiricTouch,
    },
    {
        id: 'war_cry',
        name: '战吼',
        icon: '📯',
        description: '获得 2 点护盾（12秒冷却）',
        typeBadge: '护盾 2',
        typeClass: 'badge-shield',
        cooldownSeconds: 12,
        initialDelaySeconds: 0,
        shopPrice: 4,
        factory: createWarCry,
    },
];

export function getCardById(id) {
    return ALL_CARDS.find(c => c.id === id);
}

export function getSkillById(id) {
    return ALL_SKILLS.find(s => s.id === id);
}
