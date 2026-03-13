/**
 * Relic system — 200 relics across 4 tiers.
 * ~30% are economy/management (运营) relics marked with tag: 'economy'.
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

/** Master list of all 200 relics. */
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

    /* ═══════════════════════════════════════════════════════════════════
     *  EXPANSION — 150 NEW RELICS (IDs 51-200)
     *  ~45 economy/运营 relics (tag: 'economy'), ~105 combat/utility
     * ═══════════════════════════════════════════════════════════════════ */

    /* ───────── COMMON — Combat / Utility (30) ───────── */
    { id: 'stone_skin', name: '石肤术', icon: '🪨', tier: 'common', description: '受到伤害超过 3 时减少 1 点', damageReduction: 1, damageReductionThreshold: 3 },
    { id: 'wooden_buckler', name: '木圆盾', icon: '🪵', tier: 'common', description: '战斗开始时获得 2 点护盾', onBattleStart(ctx) { ctx.player.addShield(2); } },
    { id: 'bandage_roll', name: '绷带卷', icon: '🩹', tier: 'common', description: '每 2 回合恢复 1 HP', onRoundEnd(ctx) { if (ctx.round % 2 === 0) ctx.player.heal(1); } },
    { id: 'sharp_fang', name: '锋利兽牙', icon: '🦴', tier: 'common', description: '战斗开始时对敌人造成 2 伤害', onBattleStart(ctx) { ctx.enemy.takeDamage(2); } },
    { id: 'focus_lens', name: '聚焦镜', icon: '🔍', tier: 'common', description: '暴击卡能量消耗 -1', cardIdCostReduction: { critical_strike: 1 } },
    { id: 'feather_cap', name: '羽毛帽', icon: '🎩', tier: 'common', description: '3% 概率闪避攻击', dodgeChance: 0.03 },
    { id: 'clay_pot', name: '陶罐', icon: '🏺', tier: 'common', description: '战斗开始恢复 3 HP', onBattleStart(ctx) { ctx.player.heal(3); } },
    { id: 'bone_charm', name: '骨质护符', icon: '💀', tier: 'common', description: '最大 HP +1，攻击 +1', bonusMaxHp: 1, bonusDamage: 1, onAcquire(player) { player.maxHp += 1; player.hp += 1; } },
    { id: 'spark_stone', name: '火花石', icon: '✨', tier: 'common', description: '每 4 回合对敌人造成 2 伤害', onRoundEnd(ctx) { if (ctx.round % 4 === 0) ctx.enemy.takeDamage(2); } },
    { id: 'iron_boots', name: '铁靴', icon: '🥾', tier: 'common', description: '护盾效果 +1，回合时间 -0.5 秒', bonusShield: 1, roundTimeBonus: -500 },
    { id: 'moss_cloak', name: '苔藓斗篷', icon: '🧶', tier: 'common', description: '每回合结束获得 1 护盾', onRoundEnd(ctx) { ctx.player.addShield(1); } },
    { id: 'glass_eye', name: '玻璃眼', icon: '👁️', tier: 'common', description: '回合时间 +0.5 秒', roundTimeBonus: 500 },
    { id: 'cracked_shield', name: '碎裂盾', icon: '🛡️', tier: 'common', description: '战斗开始获得 2 护盾，但最大 HP -1', onBattleStart(ctx) { ctx.player.addShield(2); }, onAcquire(player) { player.maxHp = Math.max(1, player.maxHp - 1); player.hp = Math.min(player.hp, player.maxHp); } },
    { id: 'red_pepper', name: '红辣椒', icon: '🌶️', tier: 'common', description: '攻击伤害 +1，受到治疗 -1', bonusDamage: 1, healReduction: 1 },
    { id: 'silk_ribbon', name: '丝带', icon: '🎀', tier: 'common', description: '技能冷却减少 0.5 秒', cooldownReduction: 500 },
    { id: 'pebble_bag', name: '碎石袋', icon: '🎒', tier: 'common', description: '击杀时对下一个敌人造成 1 伤害', onEnemyKill(ctx) { ctx.carryOverDamage = (ctx.carryOverDamage || 0) + 1; } },
    { id: 'stale_bread', name: '干面包', icon: '🥖', tier: 'common', description: '战斗开始恢复 1 HP，获得 1 护盾', onBattleStart(ctx) { ctx.player.heal(1); ctx.player.addShield(1); } },
    { id: 'tin_ring', name: '锡戒指', icon: '💍', tier: 'common', description: '最大 HP +3', bonusMaxHp: 3, onAcquire(player) { player.maxHp += 3; player.hp += 3; } },
    { id: 'snake_fang', name: '蛇牙', icon: '🐍', tier: 'common', description: '战斗开始对敌人造成 1 伤害并获得 1 护盾', onBattleStart(ctx) { ctx.enemy.takeDamage(1); ctx.player.addShield(1); } },
    { id: 'cotton_shield', name: '棉甲', icon: '🧵', tier: 'common', description: '受到伤害总是减少 1 点（最低 0）', flatDamageReduction: 1 },
    { id: 'candle_stub', name: '蜡烛头', icon: '🕯️', tier: 'common', description: '第 1 回合攻击伤害 +3', onRoundStart(ctx) { if (ctx.round === 1) ctx.firstRoundBonus = 3; } },
    { id: 'straw_doll', name: '稻草人偶', icon: '🧸', tier: 'common', description: '受到致命伤害时保留 1 HP（仅一次）', deathSave: true },
    { id: 'pine_cone', name: '松果', icon: '🌲', tier: 'common', description: '每回合开始恢复 1 能量（已含于基础，额外 +1）', energyPerRound: 1 },
    { id: 'chalk_dust', name: '粉笔粉', icon: '⚪', tier: 'common', description: '8% 概率闪避', dodgeChance: 0.08 },
    { id: 'cracked_mirror', name: '碎镜子', icon: '🪞', tier: 'common', description: '护盾被破时获得 1 能量', onShieldBreak(ctx) { ctx.player.energy = Math.min(ctx.player.energy + 1, ctx.player.maxEnergy); } },
    { id: 'rusty_nail', name: '生锈钉子', icon: '📌', tier: 'common', description: '受击时 20% 概率对敌人造成 1 伤害', onTakeDamage(ctx) { if (Math.random() < 0.2) ctx.enemy.takeDamage(1); } },
    { id: 'wool_hat', name: '毛线帽', icon: '🧢', tier: 'common', description: '治疗效果 +1', bonusHeal: 1 },
    { id: 'chipped_blade', name: '缺口刀', icon: '🔪', tier: 'common', description: '攻击伤害 +1', bonusDamage: 1 },
    { id: 'small_drum', name: '小鼓', icon: '🪘', tier: 'common', description: '战斗开始卡牌冷却减少 0.5 秒', onBattleStart(ctx) { for (const c of ctx.player.hand) c.reduceCooldown(500); } },
    { id: 'cloth_wrap', name: '布条', icon: '🩻', tier: 'common', description: '最大 HP +2', bonusMaxHp: 2, onAcquire(player) { player.maxHp += 2; player.hp += 2; } },

    /* ───────── COMMON — Economy / 运营 (15) ───────── */
    { id: 'piggy_bank', name: '小猪存钱罐', icon: '🐷', tier: 'common', tag: 'economy', description: '每场胜利额外 +1 金币', victoryBonusGold: 1 },
    { id: 'bargain_tag', name: '打折标签', icon: '🏷️', tier: 'common', tag: 'economy', description: '商店价格 -1', shopDiscount: 1 },
    { id: 'penny_pouch', name: '零钱袋', icon: '💰', tier: 'common', tag: 'economy', description: '战斗开始时获得 1 金币', onBattleStart(ctx) { ctx.engine.gold += 1; } },
    { id: 'worn_ledger', name: '破旧账本', icon: '📒', tier: 'common', tag: 'economy', description: '商店遗物价格 -2', shopRelicDiscount: 2 },
    { id: 'tin_cup', name: '锡杯', icon: '🥤', tier: 'common', tag: 'economy', description: '每回合有 10% 概率获得 1 金币', onRoundEnd(ctx) { if (Math.random() < 0.1) ctx.engine.gold += 1; } },
    { id: 'street_smarts', name: '市井智慧', icon: '🧠', tier: 'common', tag: 'economy', description: '精英战胜利额外 +2 金币', eliteBonusGold: 2 },
    { id: 'old_wallet', name: '旧钱包', icon: '👝', tier: 'common', tag: 'economy', description: '每场胜利额外 +1 金币', victoryBonusGold: 1 },
    { id: 'copper_ring', name: '铜戒', icon: '⭕', tier: 'common', tag: 'economy', description: '宝箱事件金币 +2', treasureBonusGold: 2 },
    { id: 'price_guide', name: '价目表', icon: '📋', tier: 'common', tag: 'economy', description: '商店卡牌价格 -1', shopCardDiscount: 1 },
    { id: 'tip_jar', name: '小费罐', icon: '🫙', tier: 'common', tag: 'economy', description: '击杀敌人时 30% 概率 +1 金币', onEnemyKill(ctx) { if (Math.random() < 0.3) ctx.engine.gold += 1; } },
    { id: 'loyalty_card', name: '会员卡', icon: '💳', tier: 'common', tag: 'economy', description: '在商店购买后下次商店 -1 折扣', loyaltyDiscount: 1 },
    { id: 'bottle_caps', name: '瓶盖', icon: '🧢', tier: 'common', tag: 'economy', description: '每 5 回合获得 1 金币', onRoundEnd(ctx) { if (ctx.round % 5 === 0) ctx.engine.gold += 1; } },
    { id: 'market_map', name: '集市地图', icon: '🗺️', tier: 'common', tag: 'economy', description: '商店额外多 1 个遗物选择', shopExtraRelics: 1 },
    { id: 'beggars_bowl', name: '乞丐碗', icon: '🥣', tier: 'common', tag: 'economy', description: 'HP 低于 50% 时胜利额外 +2 金币', lowHpBonusGold: 2 },
    { id: 'coin_flip', name: '硬币翻转', icon: '🎲', tier: 'common', tag: 'economy', description: '战斗胜利 50% 概率额外 +2 金币', victoryGoldChance: { chance: 0.5, amount: 2 } },

    /* ───────── UNCOMMON — Combat / Utility (25) ───────── */
    { id: 'flame_gauntlet', name: '烈焰护手', icon: '🔥', tier: 'uncommon', description: '攻击伤害 +2，战斗开始对敌人造成 2 伤害', bonusDamage: 2, onBattleStart(ctx) { ctx.enemy.takeDamage(2); } },
    { id: 'ice_ward', name: '冰霜结界', icon: '❄️', tier: 'uncommon', description: '每回合开始获得 2 护盾', onRoundStart(ctx) { ctx.player.addShield(2); } },
    { id: 'soul_lantern', name: '灵魂灯笼', icon: '🏮', tier: 'uncommon', description: '击杀恢复 3 HP', onEnemyKill(ctx) { ctx.player.heal(3); } },
    { id: 'venom_blade', name: '淬毒之刃', icon: '🗡️', tier: 'uncommon', description: '攻击后敌人每回合额外受 1 伤害（毒）', poisonPerAttack: 1 },
    { id: 'oak_bark', name: '橡木树皮', icon: '🪵', tier: 'uncommon', description: '最大 HP +4', bonusMaxHp: 4, onAcquire(player) { player.maxHp += 4; player.hp += 4; } },
    { id: 'wind_charm', name: '风之护符', icon: '🍃', tier: 'uncommon', description: '12% 闪避，回合时间 +1 秒', dodgeChance: 0.12, roundTimeBonus: 1000 },
    { id: 'ruby_pendant', name: '红宝石坠', icon: '❤️‍🔥', tier: 'uncommon', description: '攻击恢复 1 HP，治疗 +1', onPlayerAttack(ctx) { ctx.player.heal(1); }, bonusHeal: 1 },
    { id: 'obsidian_shard', name: '黑曜石碎片', icon: '🖤', tier: 'uncommon', description: '攻击伤害 +2，受到伤害超过 3 时减 1', bonusDamage: 2, damageReduction: 1, damageReductionThreshold: 3 },
    { id: 'steel_gauntlet', name: '钢铁护手', icon: '🤖', tier: 'uncommon', description: '护盾效果 +2，每回合开始获得 1 护盾', bonusShield: 2, onRoundStart(ctx) { ctx.player.addShield(1); } },
    { id: 'phantom_ring', name: '幽灵戒指', icon: '👻', tier: 'uncommon', description: '20% 闪避', dodgeChance: 0.2 },
    { id: 'rage_potion', name: '狂怒药水', icon: '🧪', tier: 'uncommon', description: 'HP 低于 50% 时攻击 +3', lowHpBonusDamage: 3, lowHpThreshold: 0.5 },
    { id: 'emerald_ring', name: '翡翠戒指', icon: '💚', tier: 'uncommon', description: '最大 HP +3，治疗效果 +1', bonusMaxHp: 3, bonusHeal: 1, onAcquire(player) { player.maxHp += 3; player.hp += 3; } },
    { id: 'bone_shield', name: '骸骨盾', icon: '☠️', tier: 'uncommon', description: '战斗开始获得 4 护盾', onBattleStart(ctx) { ctx.player.addShield(4); } },
    { id: 'lightning_rod', name: '避雷针', icon: '🌩️', tier: 'uncommon', description: '每 2 回合对敌人造成 3 伤害', onRoundEnd(ctx) { if (ctx.round % 2 === 0) ctx.enemy.takeDamage(3); } },
    { id: 'blood_vial', name: '血液瓶', icon: '🩸', tier: 'uncommon', description: '受击时恢复 1 HP', onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.player.heal(1); } },
    { id: 'energy_crystal', name: '能量水晶', icon: '🔋', tier: 'uncommon', description: '最大能量 +1，每回合额外 +1 能量', bonusMaxEnergy: 1, energyPerRound: 1, onAcquire(player) { player.maxEnergy += 1; } },
    { id: 'wolf_pelt', name: '狼皮', icon: '🐺', tier: 'uncommon', description: '攻击 +1，闪避 +8%', bonusDamage: 1, dodgeChance: 0.08 },
    { id: 'crystal_ball', name: '水晶球', icon: '🔮', tier: 'uncommon', description: '卡牌冷却减少 1.5 秒', cooldownReduction: 1500 },
    { id: 'fire_shield', name: '火盾', icon: '🔥', tier: 'uncommon', description: '护盾被破时对敌人造成 2 伤害', onShieldBreak(ctx) { ctx.enemy.takeDamage(2); } },
    { id: 'moonstone', name: '月光石', icon: '🌙', tier: 'uncommon', description: '每回合恢复 1 HP 和 1 护盾', onRoundStart(ctx) { ctx.player.heal(1); ctx.player.addShield(1); } },
    { id: 'spike_armor', name: '尖刺铠甲', icon: '🦔', tier: 'uncommon', description: '受击时反弹 2 伤害', onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.enemy.takeDamage(2); } },
    { id: 'swift_dagger', name: '迅捷匕首', icon: '🗡️', tier: 'uncommon', description: '攻击卡冷却减少 1 秒，攻击 +1', bonusDamage: 1, cooldownReduction: 1000 },
    { id: 'ancient_tome', name: '古老典籍', icon: '📖', tier: 'uncommon', description: '技能冷却减少 2 秒', cooldownReduction: 2000 },
    { id: 'bear_claw', name: '熊爪', icon: '🐻', tier: 'uncommon', description: '攻击 +2，最大 HP +2', bonusDamage: 2, bonusMaxHp: 2, onAcquire(player) { player.maxHp += 2; player.hp += 2; } },
    { id: 'smoke_bomb', name: '烟雾弹', icon: '💨', tier: 'uncommon', description: '战斗开始 10% 闪避持续 3 回合', battleStartDodge: { chance: 0.1, rounds: 3 } },

    /* ───────── UNCOMMON — Economy / 运营 (15) ───────── */
    { id: 'silver_purse', name: '银币袋', icon: '💰', tier: 'uncommon', tag: 'economy', description: '每场胜利额外 +3 金币', victoryBonusGold: 3 },
    { id: 'trade_license', name: '贸易许可证', icon: '📜', tier: 'uncommon', tag: 'economy', description: '商店价格 -3', shopDiscount: 3 },
    { id: 'treasure_map', name: '藏宝图', icon: '🗺️', tier: 'uncommon', tag: 'economy', description: '宝箱事件金币翻倍', treasureGoldMultiplier: 2 },
    { id: 'tax_collector', name: '收税官', icon: '🏛️', tier: 'uncommon', tag: 'economy', description: '每场战斗开始获得 2 金币', onBattleStart(ctx) { ctx.engine.gold += 2; } },
    { id: 'compound_interest', name: '复利存款', icon: '📈', tier: 'uncommon', tag: 'economy', description: '每场胜利后，每 10 金币额外 +1 金币', goldInterestRate: 10 },
    { id: 'guild_card', name: '公会卡', icon: '🃏', tier: 'uncommon', tag: 'economy', description: '精英战胜利额外 +4 金币', eliteBonusGold: 4 },
    { id: 'haggle_charm', name: '砍价护符', icon: '🤝', tier: 'uncommon', tag: 'economy', description: '商店所有物品 -2 金币', shopDiscount: 2 },
    { id: 'insurance_scroll', name: '保险契约', icon: '📃', tier: 'uncommon', tag: 'economy', description: '战败时保留 50% 金币', defeatGoldKeep: 0.5 },
    { id: 'coupon_book', name: '优惠券册', icon: '🎫', tier: 'uncommon', tag: 'economy', description: '每第 3 次购买免费', freeEveryN: 3 },
    { id: 'gold_tooth', name: '金牙', icon: '🦷', tier: 'uncommon', tag: 'economy', description: '击杀敌人 +1 金币', onEnemyKill(ctx) { ctx.engine.gold += 1; } },
    { id: 'stock_certificate', name: '股票凭证', icon: '📊', tier: 'uncommon', tag: 'economy', description: '每关结束后金币 +10%', stageEndGoldPercent: 0.1 },
    { id: 'mining_pick', name: '矿镐', icon: '⛏️', tier: 'uncommon', tag: 'economy', description: '宝箱事件额外 +3 金币', treasureBonusGold: 3 },
    { id: 'merchant_cart', name: '商人马车', icon: '🛒', tier: 'uncommon', tag: 'economy', description: '商店多显示 2 件商品', shopExtraItems: 2 },
    { id: 'investment_ledger', name: '投资账本', icon: '📗', tier: 'uncommon', tag: 'economy', description: '每持有 5 件遗物，胜利 +1 金币', relicCountGoldBonus: 5 },
    { id: 'toll_collector', name: '过路费收集器', icon: '🚧', tier: 'uncommon', tag: 'economy', description: '每回合有 15% 概率获得 1 金币', onRoundEnd(ctx) { if (Math.random() < 0.15) ctx.engine.gold += 1; } },

    /* ───────── RARE — Combat / Utility (20) ───────── */
    { id: 'demon_horn', name: '恶魔角', icon: '😈', tier: 'rare', description: '攻击 +4，每次攻击有 20% 概率额外 +3 伤害', bonusDamage: 4, critChance: 0.2, critBonusDamage: 3 },
    { id: 'celestial_armor', name: '天界铠甲', icon: '✨', tier: 'rare', description: '每回合获得 3 护盾，护盾效果 +2', bonusShield: 2, onRoundStart(ctx) { ctx.player.addShield(3); } },
    { id: 'life_drain', name: '生命虹吸', icon: '💜', tier: 'rare', description: '每次攻击恢复 2 HP', onPlayerAttack(ctx) { ctx.player.heal(2); } },
    { id: 'gravity_well', name: '重力场', icon: '🕳️', tier: 'rare', description: '敌人每回合受 2 伤害', onRoundEnd(ctx) { ctx.enemy.takeDamage(2); } },
    { id: 'diamond_skin', name: '钻石皮肤', icon: '💎', tier: 'rare', description: '所有受到的伤害 -2', flatDamageReduction: 2 },
    { id: 'phoenix_egg', name: '凤凰蛋', icon: '🥚', tier: 'rare', description: '受到致命伤时恢复 50% HP（每场一次）', deathSaveHeal: 0.5 },
    { id: 'fury_band', name: '狂怒腕带', icon: '💢', tier: 'rare', description: 'HP 低于 40% 时攻击 +5', lowHpBonusDamage: 5, lowHpThreshold: 0.4 },
    { id: 'electric_field', name: '电场', icon: '⚡', tier: 'rare', description: '受击时对敌造成 3 反伤', onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.enemy.takeDamage(3); } },
    { id: 'rune_of_haste', name: '急速符文', icon: '💨', tier: 'rare', description: '回合时间 +3 秒，冷却 -2 秒', roundTimeBonus: 3000, cooldownReduction: 2000 },
    { id: 'titan_belt', name: '泰坦腰带', icon: '🦾', tier: 'rare', description: '最大 HP +6，护盾效果 +3', bonusMaxHp: 6, bonusShield: 3, onAcquire(player) { player.maxHp += 6; player.hp += 6; } },
    { id: 'shadow_blade', name: '暗影之刃', icon: '🌑', tier: 'rare', description: '攻击 +3，15% 闪避', bonusDamage: 3, dodgeChance: 0.15 },
    { id: 'spirit_link', name: '灵魂链接', icon: '🔗', tier: 'rare', description: '受击时恢复 2 HP', onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.player.heal(2); } },
    { id: 'frost_nova', name: '霜冻新星', icon: '❄️', tier: 'rare', description: '战斗开始获得 6 护盾', onBattleStart(ctx) { ctx.player.addShield(6); } },
    { id: 'dual_blades', name: '双刃', icon: '⚔️', tier: 'rare', description: '攻击 +3，卡牌冷却 -1.5 秒', bonusDamage: 3, cooldownReduction: 1500 },
    { id: 'ancient_shield', name: '远古盾', icon: '🛡️', tier: 'rare', description: '护盾不消失，每回合获得 2 护盾', persistentShield: true, onRoundStart(ctx) { ctx.player.addShield(2); } },
    { id: 'energy_reactor', name: '能量反应堆', icon: '☢️', tier: 'rare', description: '最大能量 +2，每回合额外 +1', bonusMaxEnergy: 2, energyPerRound: 1, onAcquire(player) { player.maxEnergy += 2; } },
    { id: 'war_banner', name: '战旗', icon: '🚩', tier: 'rare', description: '攻击 +2，护盾 +2，治疗 +1', bonusDamage: 2, bonusShield: 2, bonusHeal: 1 },
    { id: 'mirror_armor', name: '镜甲', icon: '🪞', tier: 'rare', description: '护盾破碎反弹 3 伤害，受击反弹 1 伤害', onShieldBreak(ctx) { ctx.enemy.takeDamage(3); }, onTakeDamage(ctx) { if (ctx.actualDamage > 0) ctx.enemy.takeDamage(1); } },
    { id: 'blood_pact', name: '血之契约', icon: '📕', tier: 'rare', description: '攻击 x2，但每回合失去 1 HP', damageMultiplier: 2, onRoundEnd(ctx) { ctx.player.takeDamage(1); } },
    { id: 'nether_cloak', name: '虚界斗篷', icon: '🌌', tier: 'rare', description: '30% 闪避，但最大 HP -3', dodgeChance: 0.3, onAcquire(player) { player.maxHp = Math.max(1, player.maxHp - 3); player.hp = Math.min(player.hp, player.maxHp); } },

    /* ───────── RARE — Economy / 运营 (10) ───────── */
    { id: 'midas_touch', name: '点金术', icon: '🤌', tier: 'rare', tag: 'economy', description: '每次攻击获得 1 金币', onPlayerAttack(ctx) { ctx.engine.gold += 1; } },
    { id: 'golden_goose', name: '金蛋鹅', icon: '🪿', tier: 'rare', tag: 'economy', description: '每场胜利额外 +5 金币', victoryBonusGold: 5 },
    { id: 'diamond_card', name: '钻石卡', icon: '💎', tier: 'rare', tag: 'economy', description: '商店价格 -5', shopDiscount: 5 },
    { id: 'fortune_cat', name: '招财猫', icon: '🐱', tier: 'rare', tag: 'economy', description: '每回合 25% 概率获得 2 金币', onRoundEnd(ctx) { if (Math.random() < 0.25) ctx.engine.gold += 2; } },
    { id: 'treasure_hunter', name: '寻宝猎人', icon: '🏴‍☠️', tier: 'rare', tag: 'economy', description: '宝箱事件金币 x3', treasureGoldMultiplier: 3 },
    { id: 'vault_key', name: '金库钥匙', icon: '🔑', tier: 'rare', tag: 'economy', description: '每 5 金币存款产生 +1 利息（每关）', goldInterestRate: 5 },
    { id: 'auction_gavel', name: '拍卖锤', icon: '🔨', tier: 'rare', tag: 'economy', description: '商店遗物价格减半', shopRelicHalfPrice: true },
    { id: 'bounty_board', name: '赏金公告', icon: '📰', tier: 'rare', tag: 'economy', description: '精英战胜利额外 +8 金币', eliteBonusGold: 8 },
    { id: 'tax_haven', name: '避税天堂', icon: '🏝️', tier: 'rare', tag: 'economy', description: '战败时保留 100% 金币', defeatGoldKeep: 1.0 },
    { id: 'royal_decree', name: '皇家法令', icon: '👑', tier: 'rare', tag: 'economy', description: '每场战斗开始获得 5 金币', onBattleStart(ctx) { ctx.engine.gold += 5; } },

    /* ───────── LEGENDARY — Combat / Utility (10) ───────── */
    { id: 'god_slayer', name: '弑神者', icon: '⚔️', tier: 'legendary', description: '攻击 +7，击杀回满 HP', bonusDamage: 7, onEnemyKill(ctx) { ctx.player.hp = ctx.player.maxHp; } },
    { id: 'immortal_aegis', name: '不朽神盾', icon: '🛡️', tier: 'legendary', description: '每回合获得 5 护盾，护盾不消失', persistentShield: true, onRoundStart(ctx) { ctx.player.addShield(5); } },
    { id: 'soul_harvest', name: '灵魂收割', icon: '👻', tier: 'legendary', description: '击杀后最大 HP +2，攻击 +1（永久）', onEnemyKill(ctx) { ctx.player.maxHp += 2; ctx.player.hp += 2; } },
    { id: 'time_stop', name: '时间停止', icon: '⏰', tier: 'legendary', description: '回合时间 +5 秒，冷却 -3 秒', roundTimeBonus: 5000, cooldownReduction: 3000 },
    { id: 'demonic_pact', name: '恶魔契约', icon: '😈', tier: 'legendary', description: '攻击 x3，但每回合失去 2 HP', damageMultiplier: 3, onRoundEnd(ctx) { ctx.player.takeDamage(2); } },
    { id: 'celestial_blessing', name: '天赐神恩', icon: '😇', tier: 'legendary', description: '最大 HP +10，每回合回 3 HP', bonusMaxHp: 10, onAcquire(player) { player.maxHp += 10; player.hp += 10; }, onRoundEnd(ctx) { ctx.player.heal(3); } },
    { id: 'void_heart', name: '虚空之心', icon: '🖤', tier: 'legendary', description: '40% 闪避，攻击 +3', dodgeChance: 0.4, bonusDamage: 3 },
    { id: 'phoenix_rebirth', name: '凤凰涅槃', icon: '🔥', tier: 'legendary', description: '死亡时复活并全回 HP（每场一次），攻击 +3', deathSaveFullHeal: true, bonusDamage: 3 },
    { id: 'omnipotence', name: '全知全能', icon: '🌟', tier: 'legendary', description: '攻击 +3，护盾 +3，治疗 +3，HP +5', bonusDamage: 3, bonusShield: 3, bonusHeal: 3, bonusMaxHp: 5, onAcquire(player) { player.maxHp += 5; player.hp += 5; } },
    { id: 'unlimited_energy', name: '无尽能源', icon: '♾️', tier: 'legendary', description: '最大能量 +4，每回合额外 +3', bonusMaxEnergy: 4, energyPerRound: 3, onAcquire(player) { player.maxEnergy += 4; } },

    /* ───────── LEGENDARY — Economy / 运营 (5) ───────── */
    { id: 'philosopher_stone', name: '贤者之石', icon: '⚗️', tier: 'legendary', tag: 'economy', description: '每次攻击获得 2 金币，胜利 +10 金币', onPlayerAttack(ctx) { ctx.engine.gold += 2; }, victoryBonusGold: 10 },
    { id: 'money_printer', name: '印钞机', icon: '🖨️', tier: 'legendary', tag: 'economy', description: '每回合获得 3 金币', onRoundEnd(ctx) { ctx.engine.gold += 3; } },
    { id: 'dragon_hoard', name: '龙的宝库', icon: '🐲', tier: 'legendary', tag: 'economy', description: '战斗胜利后金币 +50%', victoryGoldMultiplier: 1.5 },
    { id: 'merchant_empire', name: '商业帝国', icon: '🏰', tier: 'legendary', tag: 'economy', description: '商店免费，每场战斗 +3 金币', shopDiscount: 999, onBattleStart(ctx) { ctx.engine.gold += 3; } },
    { id: 'golden_touch', name: '点石成金', icon: '✋', tier: 'legendary', tag: 'economy', description: '所有金币获取翻倍', goldMultiplier: 2 },

    /* ───────── ADDITIONAL 20 to reach 200 ───────── */

    /* Common — Combat (5) */
    { id: 'copper_buckle', name: '铜扣', icon: '🔩', tier: 'common', description: '最大 HP +1，护盾 +1', bonusMaxHp: 1, bonusShield: 1, onAcquire(player) { player.maxHp += 1; player.hp += 1; } },
    { id: 'old_bandana', name: '旧头巾', icon: '🎭', tier: 'common', description: '4% 闪避', dodgeChance: 0.04 },
    { id: 'splinter_arrow', name: '碎裂箭矢', icon: '🏹', tier: 'common', description: '战斗开始对敌人造成 3 伤害', onBattleStart(ctx) { ctx.enemy.takeDamage(3); } },
    { id: 'willow_bark', name: '柳树皮', icon: '🌿', tier: 'common', description: '每 4 回合恢复 2 HP', onRoundEnd(ctx) { if (ctx.round % 4 === 0) ctx.player.heal(2); } },
    { id: 'sand_bag', name: '沙袋', icon: '🎒', tier: 'common', description: '受到超过 3 点伤害时减少 2', damageReduction: 2, damageReductionThreshold: 3 },

    /* Common — Economy (3) */
    { id: 'rusty_scale', name: '生锈天平', icon: '⚖️', tier: 'common', tag: 'economy', description: '每场胜利 +1 金币', victoryBonusGold: 1 },
    { id: 'bent_spoon', name: '弯勺', icon: '🥄', tier: 'common', tag: 'economy', description: '战斗开始获得 1 金币', onBattleStart(ctx) { ctx.engine.gold += 1; } },
    { id: 'receipt_pile', name: '收据堆', icon: '🧾', tier: 'common', tag: 'economy', description: '商店卡牌和技能价格 -1', shopDiscount: 1 },

    /* Uncommon — Combat (4) */
    { id: 'sapphire_ring', name: '蓝宝石戒指', icon: '💙', tier: 'uncommon', description: '护盾 +3，每回合获得 1 护盾', bonusShield: 3, onRoundStart(ctx) { ctx.player.addShield(1); } },
    { id: 'flame_tongue', name: '火舌', icon: '👅', tier: 'uncommon', description: '攻击 +2，战斗开始对敌造成 3 伤害', bonusDamage: 2, onBattleStart(ctx) { ctx.enemy.takeDamage(3); } },
    { id: 'vine_whip', name: '藤鞭', icon: '🌱', tier: 'uncommon', description: '每回合对敌人造成 1 伤害并恢复 1 HP', onRoundEnd(ctx) { ctx.enemy.takeDamage(1); ctx.player.heal(1); } },
    { id: 'hawk_eye', name: '鹰眼', icon: '🦅', tier: 'uncommon', description: '攻击 +1，卡牌冷却 -1.5 秒', bonusDamage: 1, cooldownReduction: 1500 },

    /* Uncommon — Economy (2) */
    { id: 'gold_detector', name: '探金仪', icon: '📡', tier: 'uncommon', tag: 'economy', description: '宝箱事件额外 +5 金币', treasureBonusGold: 5 },
    { id: 'pawn_ticket', name: '当铺票', icon: '🎟️', tier: 'uncommon', tag: 'economy', description: '可以卖掉遗物获得 3 金币', sellRelicPrice: 3 },

    /* Rare — Combat (3) */
    { id: 'earthquake', name: '地震', icon: '🌋', tier: 'rare', description: '每 3 回合对敌造成 5 伤害', onRoundEnd(ctx) { if (ctx.round % 3 === 0) ctx.enemy.takeDamage(5); } },
    { id: 'soul_armor', name: '灵魂铠', icon: '🦴', tier: 'rare', description: '受到伤害 -3（最低 0），最大 HP +3', flatDamageReduction: 3, bonusMaxHp: 3, onAcquire(player) { player.maxHp += 3; player.hp += 3; } },
    { id: 'chain_lightning', name: '连锁闪电', icon: '⛈️', tier: 'rare', description: '攻击 +3，每次攻击 30% 概率额外 +4 伤害', bonusDamage: 3, critChance: 0.3, critBonusDamage: 4 },

    /* Rare — Economy (2) */
    { id: 'bank_vault', name: '银行金库', icon: '🏦', tier: 'rare', tag: 'economy', description: '每关结束金币 +20%', stageEndGoldPercent: 0.2 },
    { id: 'black_market', name: '黑市通行证', icon: '🕶️', tier: 'rare', tag: 'economy', description: '商店额外出售 1 件传说遗物（价格 x2）', shopLegendaryAccess: true },

    /* Legendary — Economy (1) */
    { id: 'infinity_wallet', name: '无底钱袋', icon: '💸', tier: 'legendary', tag: 'economy', description: '每回合 +2 金币，胜利 +8，商店 -5', onRoundEnd(ctx) { ctx.engine.gold += 2; }, victoryBonusGold: 8, shopDiscount: 5 },
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
