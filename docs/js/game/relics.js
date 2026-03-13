/**
 * Relic system — 50 relics across 4 tiers.
 *
 * Relic properties:
 *   id, name, icon, description, tier ('common'|'uncommon'|'rare'|'legendary')
 *   Optional hooks used by GameEngine:
 *     onAcquire(player)          — called when relic is picked up
 *     onRoundStart(ctx)          — called at the start of each round
 *     onRoundEnd(ctx)            — called at the end of each round
 *     onPlayerAttack(ctx)        — called when player deals damage
 *     onPlayerDefend(ctx)        — called when player uses a shield card
 *     onPlayerHeal(ctx)          — called when player heals
 *     onTakeDamage(ctx)          — called when player takes damage
 *     onEnemyKill(ctx)           — called when an enemy is killed
 *     onBattleStart(ctx)         — called at the start of a battle
 *   Static modifiers (numeric, stacked by engine):
 *     bonusDamage, bonusShield, bonusHeal, bonusMaxHp, bonusMaxEnergy,
 *     energyPerRound, cooldownReduction, victoryBonusGold, shopDiscount,
 *     roundTimeBonus (ms), dodgeChance
 */

export const RELIC_TIERS = {
    common:    { label: '普通', color: '#a0a0b0', weight: 50 },
    uncommon:  { label: '稀有', color: '#50a0ff', weight: 30 },
    rare:      { label: '史诗', color: '#c060ff', weight: 15 },
    legendary: { label: '传说', color: '#ffaa00', weight: 5 },
};

/** Master list of all 50 relics. */
export const ALL_RELICS = [

    /* ═══════════════════════════════════════════
     *  COMMON TIER (20 relics) — small bonuses
     * ═══════════════════════════════════════════ */
    {
        id: 'iron_shield',
        name: '铁皮盾',
        icon: '🛡️',
        description: '每回合开始获得 1 点护盾',
        tier: 'common',
        onRoundStart(ctx) { ctx.player.addShield(1); },
    },
    {
        id: 'health_crystal',
        name: '生命水晶',
        icon: '💎',
        description: '最大生命值 +1',
        tier: 'common',
        bonusMaxHp: 1,
        onAcquire(player) { player.maxHp += 1; player.hp += 1; },
    },
    {
        id: 'copper_purse',
        name: '铜币袋',
        icon: '👛',
        description: '每场胜利额外 +1 金币',
        tier: 'common',
        victoryBonusGold: 1,
    },
    {
        id: 'whetstone',
        name: '磨刀石',
        icon: '🪨',
        description: '攻击伤害 +1',
        tier: 'common',
        bonusDamage: 1,
    },
    {
        id: 'leather_armor',
        name: '皮甲',
        icon: '🧥',
        description: '护盾效果 +1',
        tier: 'common',
        bonusShield: 1,
    },
    {
        id: 'herb_pouch',
        name: '草药包',
        icon: '🌿',
        description: '治疗效果 +1',
        tier: 'common',
        bonusHeal: 1,
    },
    {
        id: 'swift_boots',
        name: '疾风靴',
        icon: '👟',
        description: '回合时间 +1 秒',
        tier: 'common',
        roundTimeBonus: 1000,
    },
    {
        id: 'old_compass',
        name: '旧指南针',
        icon: '🧭',
        description: '商店物品价格 -1 金币',
        tier: 'common',
        shopDiscount: 1,
    },
    {
        id: 'lucky_coin',
        name: '幸运币',
        icon: '🪙',
        description: '5% 概率闪避攻击',
        tier: 'common',
        dodgeChance: 0.05,
    },
    {
        id: 'cracked_orb',
        name: '碎裂宝珠',
        icon: '🔮',
        description: '技能冷却减少 1 秒',
        tier: 'common',
        cooldownReduction: 1000,
    },
    {
        id: 'warm_scarf',
        name: '温暖围巾',
        icon: '🧣',
        description: '战斗开始时恢复 1 HP',
        tier: 'common',
        onBattleStart(ctx) { ctx.player.heal(1); },
    },
    {
        id: 'training_dummy',
        name: '训练木桩',
        icon: '🎯',
        description: '每次击杀获得 1 点临时护盾',
        tier: 'common',
        onEnemyKill(ctx) { ctx.player.addShield(1); },
    },
    {
        id: 'bronze_ring',
        name: '青铜戒指',
        icon: '💍',
        description: '最大生命值 +2',
        tier: 'common',
        bonusMaxHp: 2,
        onAcquire(player) { player.maxHp += 2; player.hp += 2; },
    },
    {
        id: 'bread_loaf',
        name: '粗粮面包',
        icon: '🍞',
        description: '战斗开始时恢复 2 HP',
        tier: 'common',
        onBattleStart(ctx) { ctx.player.heal(2); },
    },
    {
        id: 'rusty_dagger',
        name: '生锈匕首',
        icon: '🗡️',
        description: '战斗开始时对敌人造成 1 点伤害',
        tier: 'common',
        onBattleStart(ctx) { ctx.enemy.takeDamage(1); },
    },
    {
        id: 'simple_map',
        name: '简易地图',
        icon: '🗺️',
        description: '商店刷新后多一个选择',
        tier: 'common',
        shopExtraItems: 1,
    },
    {
        id: 'wooden_idol',
        name: '木制神像',
        icon: '🪆',
        description: '每 3 回合自动恢复 1 HP',
        tier: 'common',
        onRoundEnd(ctx) { if (ctx.round % 3 === 0) ctx.player.heal(1); },
    },
    {
        id: 'thick_gloves',
        name: '厚手套',
        icon: '🧤',
        description: '受到的伤害超过 2 时，减少 1 点',
        tier: 'common',
        damageReduction: 1,
        damageReductionThreshold: 2,
    },
    {
        id: 'tiny_bell',
        name: '小铃铛',
        icon: '🔔',
        description: '战斗开始时获得 1 点护盾',
        tier: 'common',
        onBattleStart(ctx) { ctx.player.addShield(1); },
    },
    {
        id: 'energy_pebble',
        name: '能量小石',
        icon: '🪨',
        description: '每回合额外恢复 1 点能量',
        tier: 'common',
        energyPerRound: 1,
    },

    /* ═══════════════════════════════════════════
     *  UNCOMMON TIER (15 relics)
     * ═══════════════════════════════════════════ */
    {
        id: 'vampiric_fang',
        name: '吸血尖牙',
        icon: '🦷',
        description: '每次攻击恢复 1 HP',
        tier: 'uncommon',
        onPlayerAttack(ctx) { ctx.player.heal(1); },
    },
    {
        id: 'mirror_shield',
        name: '镜面盾',
        icon: '🪞',
        description: '护盾被破坏时，反弹 1 点伤害给敌人',
        tier: 'uncommon',
        onShieldBreak(ctx) { ctx.enemy.takeDamage(1); },
    },
    {
        id: 'thunder_stone',
        name: '雷电石',
        icon: '⚡',
        description: '攻击伤害 +2',
        tier: 'uncommon',
        bonusDamage: 2,
    },
    {
        id: 'mana_gem',
        name: '法力宝石',
        icon: '💠',
        description: '最大能量 +1',
        tier: 'uncommon',
        bonusMaxEnergy: 1,
        onAcquire(player) { player.maxEnergy += 1; },
    },
    {
        id: 'iron_will',
        name: '钢铁意志',
        icon: '⛓️',
        description: 'HP 低于 30% 时，伤害 +2',
        tier: 'uncommon',
        lowHpBonusDamage: 2,
        lowHpThreshold: 0.3,
    },
    {
        id: 'healing_totem',
        name: '治愈图腾',
        icon: '🗿',
        description: '每回合结束时恢复 1 HP',
        tier: 'uncommon',
        onRoundEnd(ctx) { ctx.player.heal(1); },
    },
    {
        id: 'shadow_cloak',
        name: '暗影斗篷',
        icon: '🥷',
        description: '15% 概率闪避攻击',
        tier: 'uncommon',
        dodgeChance: 0.15,
    },
    {
        id: 'gold_magnet',
        name: '金币磁铁',
        icon: '🧲',
        description: '每场胜利额外 +2 金币',
        tier: 'uncommon',
        victoryBonusGold: 2,
    },
    {
        id: 'frozen_heart',
        name: '冰冻之心',
        icon: '🧊',
        description: '护盾效果 +2',
        tier: 'uncommon',
        bonusShield: 2,
    },
    {
        id: 'phoenix_feather',
        name: '凤凰羽毛',
        icon: '🪶',
        description: '战斗开始时获得 3 点护盾',
        tier: 'uncommon',
        onBattleStart(ctx) { ctx.player.addShield(3); },
    },
    {
        id: 'quick_draw',
        name: '快速拔刀',
        icon: '⚔️',
        description: '卡牌冷却减少 1 秒',
        tier: 'uncommon',
        cooldownReduction: 1000,
    },
    {
        id: 'life_spring',
        name: '生命之泉',
        icon: '⛲',
        description: '最大生命值 +3',
        tier: 'uncommon',
        bonusMaxHp: 3,
        onAcquire(player) { player.maxHp += 3; player.hp += 3; },
    },
    {
        id: 'thorn_armor',
        name: '荆棘甲',
        icon: '🌵',
        description: '受到攻击时，对敌人造成 1 点伤害',
        tier: 'uncommon',
        onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.enemy.takeDamage(1); },
    },
    {
        id: 'battle_drum',
        name: '战鼓',
        icon: '🥁',
        description: '回合时间 +2 秒',
        tier: 'uncommon',
        roundTimeBonus: 2000,
    },
    {
        id: 'merchant_badge',
        name: '商人徽章',
        icon: '🏷️',
        description: '商店物品价格 -2 金币',
        tier: 'uncommon',
        shopDiscount: 2,
    },

    /* ═══════════════════════════════════════════
     *  RARE TIER (10 relics)
     * ═══════════════════════════════════════════ */
    {
        id: 'blood_amulet',
        name: '鲜血护符',
        icon: '🩸',
        description: '每次攻击恢复 2 HP，但最大 HP -2',
        tier: 'rare',
        onPlayerAttack(ctx) { ctx.player.heal(2); },
        onAcquire(player) { player.maxHp = Math.max(1, player.maxHp - 2); player.hp = Math.min(player.hp, player.maxHp); },
    },
    {
        id: 'storm_blade',
        name: '风暴之刃',
        icon: '🌪️',
        description: '攻击伤害 +3',
        tier: 'rare',
        bonusDamage: 3,
    },
    {
        id: 'eternal_shield',
        name: '不灭之盾',
        icon: '🛡️',
        description: '护盾不再在回合结束时消失',
        tier: 'rare',
        persistentShield: true,
    },
    {
        id: 'time_crystal',
        name: '时间水晶',
        icon: '⏳',
        description: '最大能量 +2',
        tier: 'rare',
        bonusMaxEnergy: 2,
        onAcquire(player) { player.maxEnergy += 2; },
    },
    {
        id: 'berserker_mask',
        name: '狂战士面具',
        icon: '👹',
        description: '攻击伤害 +4，但受到伤害 +1',
        tier: 'rare',
        bonusDamage: 4,
        incomingDamageIncrease: 1,
    },
    {
        id: 'angel_wings',
        name: '天使之翼',
        icon: '🕊️',
        description: '每回合恢复 2 HP',
        tier: 'rare',
        onRoundEnd(ctx) { ctx.player.heal(2); },
    },
    {
        id: 'cursed_sword',
        name: '诅咒之剑',
        icon: '⚔️',
        description: '攻击伤害 x2，但每次攻击消耗 1 HP',
        tier: 'rare',
        damageMultiplier: 2,
        onPlayerAttack(ctx) { ctx.player.takeDamage(1); },
    },
    {
        id: 'golden_crown',
        name: '黄金王冠',
        icon: '👑',
        description: '每场胜利额外 +5 金币',
        tier: 'rare',
        victoryBonusGold: 5,
    },
    {
        id: 'void_cloak',
        name: '虚空斗篷',
        icon: '🌑',
        description: '25% 概率闪避攻击',
        tier: 'rare',
        dodgeChance: 0.25,
    },
    {
        id: 'arcane_focus',
        name: '奥术聚焦',
        icon: '🔮',
        description: '技能和卡牌冷却减少 2 秒',
        tier: 'rare',
        cooldownReduction: 2000,
    },

    /* ═══════════════════════════════════════════
     *  LEGENDARY TIER (5 relics)
     * ═══════════════════════════════════════════ */
    {
        id: 'dragon_heart',
        name: '龙之心',
        icon: '🐉',
        description: '最大 HP +5，攻击 +2，每回合恢复 1 HP',
        tier: 'legendary',
        bonusMaxHp: 5,
        bonusDamage: 2,
        onAcquire(player) { player.maxHp += 5; player.hp += 5; },
        onRoundEnd(ctx) { ctx.player.heal(1); },
    },
    {
        id: 'infinity_gem',
        name: '无限宝石',
        icon: '♾️',
        description: '最大能量 +3，每回合额外 +2 能量',
        tier: 'legendary',
        bonusMaxEnergy: 3,
        energyPerRound: 2,
        onAcquire(player) { player.maxEnergy += 3; },
    },
    {
        id: 'grim_reaper_scythe',
        name: '死神镰刀',
        icon: '💀',
        description: '攻击伤害 +5，击杀后全额恢复能量',
        tier: 'legendary',
        bonusDamage: 5,
        onEnemyKill(ctx) { ctx.player.energy = ctx.player.maxEnergy; },
    },
    {
        id: 'world_tree_seed',
        name: '世界树种子',
        icon: '🌳',
        description: '最大 HP +8，每回合恢复 2 HP，治疗效果 +2',
        tier: 'legendary',
        bonusMaxHp: 8,
        bonusHeal: 2,
        onAcquire(player) { player.maxHp += 8; player.hp += 8; },
        onRoundEnd(ctx) { ctx.player.heal(2); },
    },
    {
        id: 'chaos_orb',
        name: '混沌宝珠',
        icon: '🌀',
        description: '所有卡牌费用 -1（最低 0），冷却减半',
        tier: 'legendary',
        cardCostReduction: 1,
        cooldownMultiplier: 0.5,
    },
];

/** Get a relic definition by id. */
export function getRelicById(id) {
    return ALL_RELICS.find(r => r.id === id);
}

/** Pick N random relics from the pool, excluding already-owned ids, weighted by tier. */
export function pickRandomRelics(count, ownedIds = []) {
    const pool = ALL_RELICS.filter(r => !ownedIds.includes(r.id));
    if (pool.length === 0) return [];

    const result = [];
    const remaining = [...pool];

    for (let i = 0; i < count && remaining.length > 0; i++) {
        const totalWeight = remaining.reduce((sum, r) => sum + (RELIC_TIERS[r.tier]?.weight || 10), 0);
        let roll = Math.random() * totalWeight;
        let picked = remaining[0];
        for (const r of remaining) {
            roll -= (RELIC_TIERS[r.tier]?.weight || 10);
            if (roll <= 0) { picked = r; break; }
        }
        result.push(picked);
        remaining.splice(remaining.indexOf(picked), 1);
    }

    return result;
}

/** Pick N random relics ensuring at least one from a minimum tier. */
export function pickRelicsForReward(count, ownedIds = [], minTier = null) {
    const relics = pickRandomRelics(count, ownedIds);
    if (!minTier || relics.length === 0) return relics;

    const tierOrder = ['common', 'uncommon', 'rare', 'legendary'];
    const minIdx = tierOrder.indexOf(minTier);
    const hasHighTier = relics.some(r => tierOrder.indexOf(r.tier) >= minIdx);

    if (!hasHighTier) {
        const pool = ALL_RELICS.filter(r =>
            !ownedIds.includes(r.id) &&
            !relics.some(x => x.id === r.id) &&
            tierOrder.indexOf(r.tier) >= minIdx
        );
        if (pool.length > 0) {
            relics[0] = pool[Math.floor(Math.random() * pool.length)];
        }
    }

    return relics;
}
