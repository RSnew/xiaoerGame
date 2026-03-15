import { Player } from '../character/player.js';
import { Slime } from '../enemy/slime.js';
import { GoblinRogue } from '../enemy/goblin_rogue.js';
import { SkeletonMage } from '../enemy/skeleton_mage.js';
import { ForestWolf } from '../enemy/forest_wolf.js';
import { Dragon } from '../enemy/dragon.js';
import { createAttackCard } from '../card/attack.js';
import { createDefenseCard } from '../card/defense.js';
import { Card, CardEffect } from '../card/card.js';
import { SkillEffect } from '../skill/skill.js';
import { createEmergencyHeal } from '../skill/emergency_heal.js';
import { createFastCycle } from '../skill/fast_cycle.js';
import { getEquippedCards, getEquippedSkills } from '../hub/state.js';
import { getCardById, getSkillById, ALL_CARDS, ALL_SKILLS } from '../hub/registry.js';
import { ALL_RELICS, RELIC_TIERS, pickRelicsForReward } from './relics.js';
import { BUFF_DEFS } from '../mechanics/buff.js';

const BASE_ROUND_DURATION_MS = 5000;
const ROUND_TICK_MS = 200;
const PLAYER_INITIAL_CARD_COOLDOWN_MS = 1000;
const ENEMY_INITIAL_CARD_COOLDOWN_MS = 2000;
const ENEMY_ACTION_BUFFER_MS = 300;
const STAGES_BEFORE_BOSS = 6;
const ELITE_CHANCE = 0.25;

/**
 * Drives the game: manages state, UI updates, animations, and timed-round flow.
 * Supports roguelike multi-stage progression with energy, relics, shop, events, and boss battle.
 */
export class GameEngine {
    constructor(options = {}) {
        this.onVictory = options.onVictory || (() => Promise.resolve(null));
        this.music = options.music || null;
        this.sfx = options.sfx || null;
        this.gold = 0;
        this.stage = 1;
        this.cacheDom();
        this.bindRestart();
        this.initState();
        this.renderEnergy();
        this.renderMana();
        this.renderRelics();
        this.renderCards();
        this.renderSkills();
        this.syncUI();
        this.logStageStart();
        this.startRound();
    }

    /* ========== Initialisation ========== */

    initState() {
        this.player = new Player('勇者', 3, 3, {
            id: 'prepared',
            name: '预备',
            description: '胜利后额外获得 1 金币',
            victoryBonusGold: 1,
        });

        const cardIds = getEquippedCards();
        if (cardIds.length > 0) {
            for (const id of cardIds) {
                const meta = getCardById(id);
                if (meta) this.player.addCard(meta.factory());
            }
        } else {
            this.player.addCard(createAttackCard());
            this.player.addCard(createDefenseCard());
        }

        const skillIds = getEquippedSkills();
        if (skillIds.length > 0) {
            for (const id of skillIds) {
                const meta = getSkillById(id);
                if (meta) this.player.equipSkill(meta.factory());
            }
        } else {
            this.player.equipSkill(createEmergencyHeal());
            this.player.equipSkill(createFastCycle());
        }

        this._applyRelicCardModifiers();

        for (const card of this.player.hand) {
            card.setInitialCooldown(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }

        this.spawnEnemy();

        this.round = 1;
        this.busy = false;
        this.gameOver = false;
        this.roundFinishing = false;
        this.playerDidAnyActionThisRound = false;
        this.enemyActedThisRound = false;
        this.roundEndsAt = 0;
        this.lastTickAt = 0;
        this.enemyActionAt = null;
        this.roundTimerId = null;
    }

    /** Get the round duration including relic bonuses. */
    getRoundDuration() {
        let bonus = 0;
        for (const r of this.player.relics) {
            if (r.roundTimeBonus) bonus += r.roundTimeBonus;
        }
        return BASE_ROUND_DURATION_MS + bonus;
    }

    _applyRelicCardModifiers() {
        const costReduce = this.player.relicSum('cardCostReduction');
        const cdMultiplier = this.player.relics.find(r => r.cooldownMultiplier)?.cooldownMultiplier;

        for (const card of this.player.hand) {
            if (costReduce > 0) {
                card.energyCost = Math.max(0, card.energyCost - costReduce);
            }
            if (cdMultiplier != null) {
                card.cooldownMs = Math.max(500, Math.floor(card.cooldownMs * cdMultiplier));
            }
            const cdReduce = this.player.relicSum('cooldownReduction');
            if (cdReduce > 0) {
                card.cooldownMs = Math.max(500, card.cooldownMs - cdReduce);
            }
        }
    }

    _isEliteStage() {
        return this._currentStageIsElite === true;
    }

    spawnEnemy() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        if (isBoss) {
            this.enemy = new Dragon('巨龙', 10 + this.stage);
            this.enemyCard = new Card('龙息', '造成 3 点伤害', CardEffect.DAMAGE, 3, '🔥', 4000);
        } else {
            this._currentStageIsElite = this.stage > 1 && Math.random() < ELITE_CHANCE;
            const hpScale = Math.floor(this.stage * 0.5);
            const enemyPool = [
                () => ({ e: new Slime('史莱姆', 3 + hpScale), card: createAttackCard() }),
                () => ({ e: new GoblinRogue('哥布林刺客', 4 + hpScale), card: createAttackCard() }),
                () => ({ e: new SkeletonMage('骷髅法师', 5 + hpScale), card: createAttackCard() }),
                () => ({ e: new ForestWolf('森林狼', 3 + hpScale), card: createAttackCard() }),
            ];
            const { e, card } = enemyPool[Math.floor(Math.random() * enemyPool.length)]();
            this.enemy = e;
            this.enemyCard = card;

            if (this._isEliteStage()) {
                this.enemy.maxHp += 3;
                this.enemy.hp += 3;
                this.enemy.name = '精英 ' + this.enemy.name;
                this.enemyCard.effectValue += 1;
            }

            // Scale enemy attack with stage
            if (this.stage >= 4) {
                this.enemyCard.effectValue += 1;
            }
        }
        this.enemyCard.setInitialCooldown(ENEMY_INITIAL_CARD_COOLDOWN_MS);
    }

    logStageStart() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        if (isBoss) {
            this.log('╔══════════════════════════╗', 'system');
            this.log('║      Boss 战！           ║', 'system');
            this.log('╚══════════════════════════╝', 'system');
        } else if (this._isEliteStage()) {
            this.log(`⭐ 第 ${this.stage}/${STAGES_BEFORE_BOSS} 关 — 精英战！`, 'system');
        } else {
            this.log(`📜 第 ${this.stage}/${STAGES_BEFORE_BOSS} 关`, 'system');
        }
        this.log(`⚔️ 战斗开始！勇者 vs ${this.enemy.name}`, 'system');
        this.log(`⚡ 能量：${this.player.energy}/${this.player.maxEnergy}`, 'system');
        if (this.enemy.dodgeChance > 0) {
            this.log(`🌀 敌方被动：每次受击有 ${Math.round(this.enemy.dodgeChance * 100)}% 概率闪避！`, 'system');
        }
        if (this.enemy.shield > 0) {
            this.log(`🛡️ 敌方被动：初始拥有 ${this.enemy.shield} 点护盾！`, 'system');
        }

        // Fire relic onBattleStart hooks
        const ctx = { player: this.player, enemy: this.enemy, engine: this };
        for (const r of this.player.relics) {
            if (r.onBattleStart) r.onBattleStart(ctx);
        }
        this.updateHpBars();
        this.updateShields();
    }

    cacheDom() {
        this.dom = {
            roundText:         document.getElementById('round-text'),
            phaseText:         document.getElementById('phase-text'),
            playerPanel:       document.getElementById('player-panel'),
            playerFrame:       document.getElementById('player-frame'),
            playerHpBar:       document.getElementById('player-hp-bar'),
            playerHpNum:       document.getElementById('player-hp-num'),
            playerShieldBadge: document.getElementById('player-shield-badge'),
            playerShieldVal:   document.getElementById('player-shield-val'),
            playerBuffBar:     document.getElementById('player-buff-bar'),
            energyBar:         document.getElementById('energy-bar'),
            energyNum:         document.getElementById('energy-num'),
            energyPips:        document.getElementById('energy-pips'),
            manaBar:           document.getElementById('mana-bar'),
            manaFill:          document.getElementById('mana-fill'),
            manaNum:           document.getElementById('mana-num'),
            relicBar:          document.getElementById('relic-bar'),
            enemyPanel:        document.getElementById('enemy-panel'),
            enemyFrame:        document.getElementById('enemy-frame'),
            enemyHpBar:        document.getElementById('enemy-hp-bar'),
            enemyHpNum:        document.getElementById('enemy-hp-num'),
            enemyShieldBadge:  document.getElementById('enemy-shield-badge'),
            enemyShieldVal:    document.getElementById('enemy-shield-val'),
            enemyBuffBar:      document.getElementById('enemy-buff-bar'),
            handCards:         document.getElementById('hand-cards'),
            handHint:          document.getElementById('hand-hint'),
            skillCards:        document.getElementById('skill-cards'),
            logBody:           document.getElementById('log-body'),
            overlay:           document.getElementById('overlay'),
            resultIcon:        document.getElementById('result-icon'),
            resultTitle:       document.getElementById('result-title'),
            resultDetail:      document.getElementById('result-detail'),
            resultGold:        document.getElementById('result-gold'),
        };
    }

    bindRestart() {
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
    }

    /* ========== Rendering ========== */

    renderEnergy() {
        if (!this.dom.energyPips) return;
        this.dom.energyPips.innerHTML = '';
        for (let i = 0; i < this.player.maxEnergy; i++) {
            const pip = document.createElement('div');
            pip.className = 'energy-pip' + (i < this.player.energy ? ' energy-pip-full' : '');
            this.dom.energyPips.appendChild(pip);
        }
        if (this.dom.energyNum) {
            this.dom.energyNum.textContent = `${this.player.energy}/${this.player.maxEnergy}`;
        }
    }

    renderMana() {
        if (!this.dom.manaBar) return;
        const show = this.player.hasSpellCards();
        this.dom.manaBar.classList.toggle('hidden', !show);
        if (!show) return;
        const pct = this.player.maxMana > 0 ? (this.player.mana / this.player.maxMana * 100) : 0;
        if (this.dom.manaFill) this.dom.manaFill.style.width = `${pct}%`;
        if (this.dom.manaNum) this.dom.manaNum.textContent = `${this.player.mana}/${this.player.maxMana}`;
    }

    renderBuffs() {
        this._renderBuffBar(this.player, this.dom.playerBuffBar);
        this._renderBuffBar(this.enemy, this.dom.enemyBuffBar);
    }

    _renderBuffBar(combatant, container) {
        if (!container) return;
        const buffs = combatant.buffManager?.buffs || [];
        container.innerHTML = '';
        for (const b of buffs) {
            const el = document.createElement('div');
            el.className = 'buff-icon' + (b.type === 'debuff' ? ' debuff' : '');
            el.title = `${b.name}（${b.stacks}层）: ${b.describe()}` +
                       (b.duration > 0 ? `\n剩余 ${b.duration} 回合` : '');
            el.innerHTML = `${b.icon}` +
                           (b.stacks > 1 ? `<span class="buff-stacks">${b.stacks}</span>` : '');
            container.appendChild(el);
        }
    }

    renderRelics() {
        if (!this.dom.relicBar) return;
        this.dom.relicBar.innerHTML = '';
        for (const r of this.player.relics) {
            const el = document.createElement('div');
            el.className = `relic-icon relic-${r.tier}`;
            el.textContent = r.icon;
            el.title = `${r.name}（${RELIC_TIERS[r.tier].label}）: ${r.description}`;
            this.dom.relicBar.appendChild(el);
        }
    }

    renderCards() {
        this.dom.handCards.innerHTML = '';
        this.player.hand.forEach((card, i) => {
            const el = document.createElement('div');
            el.className = 'card' + (this.isCardDisabled(card) ? ' card-disabled' : '');
            el.dataset.index = i;

            let valueLabel;
            if (!card.isReady()) {
                valueLabel = `冷却 ${card.remainingCooldownSeconds()} 秒`;
            } else if (card.effectType === CardEffect.DAMAGE) {
                valueLabel = `伤害 ${this._calcDamage(card.effectValue)}`;
            } else if (card.effectType === CardEffect.SHIELD) {
                valueLabel = `护盾 ${card.effectValue + this.player.relicSum('bonusShield')}`;
            } else if (card.effectType === CardEffect.HEAL) {
                valueLabel = `治疗 ${this._calcHeal(card.effectValue)}`;
            } else {
                valueLabel = '可用';
            }

            const costPips = '⚡'.repeat(card.energyCost);
            const manaCostHtml = card.isSpell
                ? `<div class="card-mana-cost">🔮 ${card.manaCost}</div>`
                : '';

            el.innerHTML = `
                <div class="card-icon">${card.icon}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.description}</div>
                <div class="card-cost">${costPips || '免费'}</div>
                ${manaCostHtml}
                <div class="card-value">${valueLabel}</div>
            `;
            el.addEventListener('click', () => this.onCardClick(i));
            this.dom.handCards.appendChild(el);
        });
    }

    renderSkills() {
        if (!this.dom.skillCards) return;
        this.dom.skillCards.innerHTML = '';
        this.player.skills.forEach((skill, i) => {
            const el = document.createElement('div');
            el.className = 'card skill-card' + (this.isSkillDisabled(skill) ? ' card-disabled' : '');
            el.dataset.skillIndex = i;
            el.innerHTML = `
                <div class="card-icon">${skill.icon}</div>
                <div class="card-name">${skill.name}</div>
                <div class="card-desc">${skill.description}</div>
                <div class="card-value">${skill.isReady() ? '可用' : `冷却 ${skill.remainingCooldownSeconds()} 秒`}</div>
            `;
            el.addEventListener('click', () => this.onSkillClick(i));
            this.dom.skillCards.appendChild(el);
        });
    }

    canPlayerUseCard(card) {
        if (this.gameOver || this.busy) return false;
        if (card && this.player.energy < card.energyCost) return false;
        if (card && card.isSpell && this.player.mana < card.manaCost) return false;
        return true;
    }

    canPlayerUseSkill() {
        return !this.gameOver && !this.busy;
    }

    isCardDisabled(card) {
        return !this.canPlayerUseCard(card) || !card.isReady();
    }

    isSkillDisabled(skill) {
        return !this.canPlayerUseSkill() || !skill.isReady();
    }

    syncUI() {
        this.updateTurnBanner();
        this.updateHpBars();
        this.updateShields();
        this.renderEnergy();
        this.renderMana();
        this.renderBuffs();
        this.updateActionHint();
    }

    updateTurnBanner() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        const stageLabel = isBoss ? 'Boss' : `${this.stage}/${STAGES_BEFORE_BOSS}关`;
        this.dom.roundText.textContent = `[${stageLabel}] 第 ${this.round} 回合`;
        const roundDuration = this.getRoundDuration();
        const remainingMs = this.roundEndsAt > 0
            ? Math.max(0, this.roundEndsAt - Date.now())
            : roundDuration;
        this.dom.phaseText.textContent = `剩余 ${(remainingMs / 1000).toFixed(1)} 秒`;
        this.dom.phaseText.className = 'phase-player';
    }

    updateHpBars() {
        this.setHpBar('player', this.player);
        this.setHpBar('enemy', this.enemy);
    }

    setHpBar(side, combatant) {
        const pct = combatant.hpPercent();
        const bar = side === 'player' ? this.dom.playerHpBar : this.dom.enemyHpBar;
        const num = side === 'player' ? this.dom.playerHpNum : this.dom.enemyHpNum;
        bar.style.width = pct + '%';
        bar.className = 'hp-fill ' + (pct > 60 ? 'hp-high' : pct > 30 ? 'hp-mid' : 'hp-low');
        num.textContent = `${combatant.hp} / ${combatant.maxHp}`;
    }

    updateShields() {
        this.setShieldBadge('player', this.player.shield);
        this.setShieldBadge('enemy', this.enemy.shield);
    }

    setShieldBadge(side, value) {
        const badge = side === 'player' ? this.dom.playerShieldBadge : this.dom.enemyShieldBadge;
        const span  = side === 'player' ? this.dom.playerShieldVal : this.dom.enemyShieldVal;
        if (value > 0) {
            badge.classList.remove('hidden');
            span.textContent = value;
        } else {
            badge.classList.add('hidden');
        }
    }

    updateActionHint() {
        if (this.gameOver) {
            this.dom.handHint.textContent = '战斗结束';
            return;
        }
        if (this.busy) {
            this.dom.handHint.textContent = '动作结算中…';
            return;
        }
        const hasReadyCard = this.player.hand.some(card => card.isReady() && this.player.energy >= card.energyCost);
        const hasReadySkill = this.player.skills.some(skill => skill.isReady());
        if (hasReadyCard && hasReadySkill) {
            this.dom.handHint.textContent = `可出卡牌（消耗能量）并可使用技能 ⚡${this.player.energy}/${this.player.maxEnergy}`;
        } else if (hasReadyCard) {
            this.dom.handHint.textContent = `可出卡牌 ⚡${this.player.energy}/${this.player.maxEnergy}`;
        } else if (hasReadySkill) {
            this.dom.handHint.textContent = '可使用技能（不消耗能量）';
        } else if (this.player.energy === 0) {
            this.dom.handHint.textContent = '能量耗尽，等待下回合…';
        } else {
            this.dom.handHint.textContent = '等待冷却中…';
        }
    }

    log(msg, type = '') {
        const div = document.createElement('div');
        div.className = 'log-entry' + (type ? ` log-${type}` : '');
        div.textContent = msg;
        this.dom.logBody.appendChild(div);
        this.dom.logBody.scrollTop = this.dom.logBody.scrollHeight;
    }

    /* ========== Turn flow ========== */

    _ensureAudio() {
        if (this.music && this.music.currentTrack !== 'battle') {
            this.music.playBattleBGM();
        }
        if (this.sfx) {
            this.sfx.init();
            this.sfx.resume();
        }
    }

    startRound() {
        if (this.gameOver) return;

        this.stopRoundTimer();
        this.playerDidAnyActionThisRound = false;
        this.enemyActedThisRound = false;
        this.roundFinishing = false;

        // Refill energy at round start
        const extraEnergy = this.player.relicSum('energyPerRound');
        this.player.refillEnergy();
        if (extraEnergy > 0) {
            this.player.energy = Math.min(this.player.energy + extraEnergy, this.player.maxEnergy + extraEnergy);
        }

        // Fire relic onRoundStart hooks
        const ctx = { player: this.player, enemy: this.enemy, round: this.round, engine: this };
        for (const r of this.player.relics) {
            if (r.onRoundStart) r.onRoundStart(ctx);
        }

        const roundDuration = this.getRoundDuration();
        const now = Date.now();
        this.lastTickAt = now;
        this.roundEndsAt = now + roundDuration;
        this.enemyActionAt = this.planEnemyAction(now);

        this.log(`⏱️ 第 ${this.round} 回合开始（${(roundDuration / 1000).toFixed(0)} 秒）⚡${this.player.energy}`, 'system');
        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.syncUI();
        this.roundTimerId = window.setInterval(() => this.tickRound(), ROUND_TICK_MS);
    }

    stopRoundTimer() {
        if (this.roundTimerId !== null) {
            clearInterval(this.roundTimerId);
            this.roundTimerId = null;
        }
    }

    planEnemyAction(roundStartMs) {
        const earliest = roundStartMs + this.enemyCard.remainingCooldownMs;
        const roundDuration = this.getRoundDuration();
        const roundEnd = roundStartMs + roundDuration;
        if (earliest >= roundEnd) return null;
        const latest = roundEnd - ENEMY_ACTION_BUFFER_MS;
        if (earliest >= latest) return earliest;
        const windowMs = latest - earliest;
        return earliest + Math.floor(Math.random() * (windowMs + 1));
    }

    tickRound() {
        if (this.gameOver) {
            this.stopRoundTimer();
            return;
        }

        const now = Date.now();
        const deltaMs = Math.max(0, now - this.lastTickAt);
        this.lastTickAt = now;
        this.tickCardCooldowns(deltaMs);
        this.tickSkillCooldowns(deltaMs);

        if (
            !this.enemyActedThisRound &&
            this.enemyActionAt !== null &&
            now >= this.enemyActionAt &&
            now < this.roundEndsAt &&
            this.enemyCard.isReady() &&
            !this.busy
        ) {
            void this.executeEnemyAction();
        }

        this.updateTurnBanner();
        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.updateActionHint();

        if (now >= this.roundEndsAt && !this.roundFinishing && !this.busy) {
            void this.finishRound();
        }
    }

    tickCardCooldowns(deltaMs) {
        for (const card of this.player.hand) {
            card.tickCooldown(deltaMs);
        }
        this.enemyCard.tickCooldown(deltaMs);
    }

    tickSkillCooldowns(deltaMs) {
        this.player.tickSkillCooldowns(deltaMs);
    }

    async finishRound() {
        if (this.roundFinishing || this.gameOver) return;
        this.roundFinishing = true;
        this.stopRoundTimer();

        if (!this.playerDidAnyActionThisRound) {
            this.log('⌛ 你本回合未行动。', 'system');
        }
        if (!this.enemyActedThisRound) {
            this.log(`⌛ ${this.enemy.name} 本回合未行动。`, 'system');
        }

        // Fire relic onRoundEnd hooks
        const ctx = { player: this.player, enemy: this.enemy, round: this.round, engine: this };
        for (const r of this.player.relics) {
            if (r.onRoundEnd) r.onRoundEnd(ctx);
        }

        // Tick buff durations
        const playerExpired = this.player.buffManager.tick();
        for (const id of playerExpired) {
            this.log(`  💨 「${BUFF_DEFS[id]?.name || id}」效果消失了`, 'system');
        }
        const enemyExpired = this.enemy.buffManager.tick();
        for (const id of enemyExpired) {
            this.log(`  💨 ${this.enemy.name} 的「${BUFF_DEFS[id]?.name || id}」效果消失了`, 'system');
        }

        // Clear shields unless player has persistent shield relic
        const hasPersistentShield = this.player.relics.some(r => r.persistentShield);
        if (!hasPersistentShield) {
            this.player.clearShield();
        }
        this.enemy.clearShield();
        this.round++;

        this.syncUI();
        this.renderCards();
        this.renderSkills();

        // Check if relic healing killed the enemy (thorn armor, etc.)
        if (!this.enemy.isAlive()) {
            this.log(`💀 ${this.enemy.name} 被击败了！`, 'result');
            await this.delay(400);
            await this.handleVictory();
            return;
        }

        this.roundFinishing = false;
        this.startRound();
    }

    /** Calculate damage with relic bonuses. */
    _calcDamage(baseAmount) {
        let amount = baseAmount;
        amount += this.player.relicSum('bonusDamage');

        // Damage multiplier relics (e.g. cursed sword)
        const multiplier = this.player.relics.find(r => r.damageMultiplier)?.damageMultiplier;
        if (multiplier) amount = Math.floor(amount * multiplier);

        // Low HP bonus damage
        for (const r of this.player.relics) {
            if (r.lowHpBonusDamage && r.lowHpThreshold) {
                if (this.player.hp / this.player.maxHp <= r.lowHpThreshold) {
                    amount += r.lowHpBonusDamage;
                }
            }
        }

        return amount;
    }

    /** Calculate heal amount with relic + buff bonuses. */
    _calcHeal(baseAmount) {
        let amount = baseAmount + this.player.relicSum('bonusHeal');
        // Nourish buff: +5% per stack
        const nourishBuff = this.player.buffManager.get('nourish');
        if (nourishBuff) {
            amount = Math.floor(amount * (1 + BUFF_DEFS.nourish.healBonus(nourishBuff.stacks)));
        }
        return amount;
    }

    async onCardClick(index) {
        const card = this.player.hand[index];
        if (!card || !card.isReady()) return;
        if (!this.canPlayerUseCard(card)) return;

        this._ensureAudio();
        this.player.spendEnergy(card.energyCost);
        if (card.isSpell) this.player.spendMana(card.manaCost);
        this.playerDidAnyActionThisRound = true;
        this.busy = true;
        card.triggerCooldown();
        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.renderMana();
        this.updateActionHint();

        const costText = card.isSpell
            ? `⚡-${card.energyCost} 🔮-${card.manaCost}`
            : `⚡-${card.energyCost}`;
        this.log(`▶ 你使用了「${card.name}」！（${costText}）`, 'player');

        if (card.effectType === CardEffect.DAMAGE) {
            const dmg = this._calcDamage(card.effectValue);
            await this.performAttack('player', this.enemy, 'enemy', dmg);
            // Fire relic onPlayerAttack hooks
            const ctx = { player: this.player, enemy: this.enemy, damage: dmg, engine: this };
            for (const r of this.player.relics) {
                if (r.onPlayerAttack) r.onPlayerAttack(ctx);
            }
            this.updateHpBars();
        } else if (card.effectType === CardEffect.SHIELD) {
            const shieldAmt = card.effectValue + this.player.relicSum('bonusShield');
            await this.performDefense('player', this.player, shieldAmt);
            for (const r of this.player.relics) {
                if (r.onPlayerDefend) r.onPlayerDefend({ player: this.player, engine: this });
            }
        } else if (card.effectType === CardEffect.HEAL) {
            const healAmt = this._calcHeal(card.effectValue);
            const healed = this.player.heal(healAmt);
            await this.animateHeal('player');
            if (healed > 0) {
                if (this.sfx) this.sfx.playHeal();
                this.log(`  ❤️ 恢复了 ${healed} 点生命值！`, 'player');
                for (const r of this.player.relics) {
                    if (r.onPlayerHeal) r.onPlayerHeal({ player: this.player, healed, engine: this });
                }
            } else {
                this.log(`  ❤️ 生命值已满，未恢复。`, 'system');
            }
            this.updateHpBars();
        }

        const finished = await this.checkGameOverAfterAction();
        this.busy = false;
        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.syncUI();
        if (finished) return;
    }

    async onSkillClick(index) {
        if (!this.canPlayerUseSkill()) return;
        const skill = this.player.skills[index];
        if (!skill.isReady()) return;

        this._ensureAudio();
        this.playerDidAnyActionThisRound = true;
        this.busy = true;
        this.renderCards();
        this.renderSkills();
        this.updateActionHint();

        this.log(`▶ 你使用了技能「${skill.name}」！`, 'player');

        if (skill.effectType === SkillEffect.HEAL) {
            const healAmt = this._calcHeal(skill.effectValue);
            const healed = this.player.heal(healAmt);
            await this.animateHeal('player');
            if (healed > 0) {
                if (this.sfx) this.sfx.playHeal();
                this.log(`  ❤️ 恢复了 ${healed} 点生命值！`, 'player');
            } else {
                this.log(`  ❤️ 生命值已满，未恢复。`, 'system');
            }
            this.updateHpBars();
        } else if (skill.effectType === SkillEffect.REDUCE_ALL_CARD_COOLDOWN) {
            const reduceMs = Math.max(0, Number(skill.effectValue)) * 1000;
            for (const card of this.player.hand) {
                card.reduceCooldown(reduceMs);
            }
            this.log('  🌀 当前所有卡牌冷却减少了 1 秒！', 'player');
        } else if (skill.effectType === SkillEffect.DAMAGE_AND_HEAL) {
            const { damage, heal } = skill.effectValue;
            const dmg = this._calcDamage(damage);
            await this.performAttack('player', this.enemy, 'enemy', dmg);
            const healAmt = this._calcHeal(heal);
            const healed = this.player.heal(healAmt);
            if (healed > 0) {
                await this.animateHeal('player');
                if (this.sfx) this.sfx.playHeal();
                this.log(`  ❤️ 同时恢复了 ${healed} 点生命值！`, 'player');
            }
            this.updateHpBars();
        } else if (skill.effectType === SkillEffect.GAIN_SHIELD) {
            const shieldAmt = skill.effectValue + this.player.relicSum('bonusShield');
            await this.performDefense('player', this.player, shieldAmt);
        }

        skill.triggerCooldown();
        this.renderSkills();

        const finished = await this.checkGameOverAfterAction();
        this.busy = false;
        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.syncUI();
        if (finished) return;
    }

    async executeEnemyAction() {
        if (this.enemyActedThisRound || this.gameOver || !this.enemyCard.isReady()) return;
        if (this.busy) return;

        this.enemyActedThisRound = true;
        this.busy = true;

        this.enemyCard.triggerCooldown();
        this.log(`▶ ${this.enemy.name} 使用了「${this.enemyCard.name}」！`, 'enemy');

        if (this.enemyCard.effectType === CardEffect.DAMAGE) {
            let dmg = this.enemyCard.effectValue;

            // Player dodge chance from relics
            const totalDodge = this.player.relicSum('dodgeChance');
            if (totalDodge > 0 && Math.random() < totalDodge) {
                this.log(`  💨 ${this.player.name} 闪避了攻击！`, 'system');
                this.busy = false;
                this.renderCards();
                this.renderSkills();
                this.syncUI();
                return;
            }

            // Damage reduction relics
            for (const r of this.player.relics) {
                if (r.damageReduction && r.damageReductionThreshold && dmg >= r.damageReductionThreshold) {
                    dmg = Math.max(0, dmg - r.damageReduction);
                }
            }
            // Incoming damage increase relics (e.g. berserker mask)
            dmg += this.player.relicSum('incomingDamageIncrease');

            const shieldBefore = this.player.shield;
            await this.performAttack('enemy', this.player, 'player', dmg);
            const shieldAfter = this.player.shield;

            // Shield break hook
            if (shieldBefore > 0 && shieldAfter === 0) {
                for (const r of this.player.relics) {
                    if (r.onShieldBreak) r.onShieldBreak({ player: this.player, enemy: this.enemy, engine: this });
                }
                this.updateHpBars();
            }

            // onTakeDamage hooks
            const actualDamage = dmg - (shieldBefore - shieldAfter);
            if (actualDamage > 0 || shieldBefore > shieldAfter) {
                for (const r of this.player.relics) {
                    if (r.onTakeDamage) r.onTakeDamage({ player: this.player, enemy: this.enemy, actualDamage: Math.max(0, actualDamage), engine: this });
                }
                this.updateHpBars();
            }
        } else if (this.enemyCard.effectType === CardEffect.HEAL) {
            const healed = this.enemy.heal(this.enemyCard.effectValue);
            if (healed > 0) {
                this.log(`  ❤️ ${this.enemy.name} 恢复了 ${healed} 点生命值！`, 'enemy');
            }
            this.updateHpBars();
        }

        const finished = await this.checkGameOverAfterAction();
        this.busy = false;
        this.renderCards();
        this.renderSkills();
        this.syncUI();
        if (finished) return;
    }

    async checkGameOverAfterAction() {
        if (!this.enemy.isAlive()) {
            this.log(`💀 ${this.enemy.name} 被击败了！`, 'result');
            // Fire relic onEnemyKill hooks
            const ctx = { player: this.player, enemy: this.enemy, engine: this };
            for (const r of this.player.relics) {
                if (r.onEnemyKill) r.onEnemyKill(ctx);
            }
            this.renderEnergy();
            await this.delay(400);
            await this.handleVictory();
            return true;
        }
        if (!this.player.isAlive()) {
            this.log(`💀 ${this.player.name} 被击败了！`, 'result');
            await this.delay(400);
            await this.showResult(false);
            return true;
        }
        return false;
    }

    async handleVictory() {
        this.stopRoundTimer();

        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        const isElite = this._isEliteStage();
        const baseReward = isBoss
            ? 8 + Math.floor(Math.random() * 5)
            : isElite
                ? 3 + Math.floor(Math.random() * 3)
                : 1 + Math.floor(Math.random() * 3);
        const bonus = this.player.victoryBonusGold();
        const reward = baseReward + bonus;
        this.gold += reward;

        if (bonus > 0) {
            this.log(`💰 获得 ${reward} 金币！（基础 ${baseReward} + 遗物/被动 +${bonus}）`, 'result');
        } else {
            this.log(`💰 获得 ${reward} 金币！`, 'result');
        }
        this.log(`🪙 当前金币：${this.gold}`, 'result');

        if (isBoss) {
            await this.showResult(true, true);
            return;
        }

        // Roguelike: show relic reward for elite kills, or random events
        if (isElite) {
            await this.showRelicReward('uncommon');
        } else if (Math.random() < 0.4) {
            await this.showRelicReward('common');
        }

        await this.showInterStageEvent();
    }

    /* ========== Relic Reward Screen ========== */

    async showRelicReward(minTier = null) {
        const ownedIds = this.player.relics.map(r => r.id);
        const choices = pickRelicsForReward(3, ownedIds, minTier);
        if (choices.length === 0) return;

        return new Promise(resolve => {
            const overlay = this.dom.overlay;
            this.dom.resultIcon.textContent = '🎁';
            this.dom.resultTitle.textContent = '选择一件遗物！';
            this.dom.resultDetail.innerHTML = '';
            this.dom.resultGold.classList.add('hidden');

            const list = document.createElement('div');
            list.className = 'relic-choice-list';

            for (const relic of choices) {
                const btn = document.createElement('button');
                btn.className = `relic-choice-btn relic-choice-${relic.tier}`;
                btn.innerHTML = `
                    <span class="relic-choice-icon">${relic.icon}</span>
                    <span class="relic-choice-name">${relic.name}</span>
                    <span class="relic-choice-tier" style="color:${RELIC_TIERS[relic.tier].color}">[${RELIC_TIERS[relic.tier].label}]</span>
                    <span class="relic-choice-desc">${relic.description}</span>
                `;
                btn.addEventListener('click', () => {
                    this.player.addRelic(relic);
                    this._applyRelicCardModifiers();
                    this.log(`🎁 获得遗物「${relic.name}」：${relic.description}`, 'result');
                    this.renderRelics();
                    this.syncUI();
                    overlay.classList.add('hidden');
                    this.dom.resultDetail.innerHTML = '';
                    resolve();
                });
                list.appendChild(btn);
            }

            // Skip button
            const skipBtn = document.createElement('button');
            skipBtn.className = 'relic-choice-btn relic-choice-skip';
            skipBtn.textContent = '跳过';
            skipBtn.addEventListener('click', () => {
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                resolve();
            });
            list.appendChild(skipBtn);

            this.dom.resultDetail.appendChild(list);
            overlay.classList.remove('hidden');
        });
    }

    /* ========== Inter-Stage Events (Roguelike) ========== */

    async showInterStageEvent() {
        const roll = Math.random();

        if (roll < 0.3) {
            // Rest event
            await this.showRestEvent();
        } else if (roll < 0.55) {
            // Treasure event (free relic if none given)
            if (this.player.relics.length < ALL_RELICS.length) {
                await this.showTreasureEvent();
            } else {
                await this.showShop();
            }
        } else {
            // Shop
            await this.showShop();
        }
    }

    async showRestEvent() {
        return new Promise(resolve => {
            const overlay = this.dom.overlay;
            this.dom.resultIcon.textContent = '🏕️';
            this.dom.resultTitle.textContent = '路边营火';
            this.dom.resultDetail.innerHTML = '';
            this.dom.resultGold.classList.add('hidden');

            const list = document.createElement('div');
            list.style.cssText = 'display:flex; flex-direction:column; gap:10px; margin:12px 0;';

            const healAmount = Math.ceil(this.player.maxHp * 0.5);

            const restBtn = document.createElement('button');
            restBtn.className = 'relic-choice-btn';
            restBtn.textContent = `🔥 休息（恢复 ${healAmount} HP）`;
            restBtn.addEventListener('click', () => {
                const healed = this.player.heal(healAmount);
                this.log(`🏕️ 在营火旁休息，恢复了 ${healed} HP`, 'result');
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                this.advanceToNextStage();
                resolve();
            });
            list.appendChild(restBtn);

            const smithBtn = document.createElement('button');
            smithBtn.className = 'relic-choice-btn';
            smithBtn.textContent = '🔨 锻造（一张卡牌伤害/护盾/治疗 +1）';
            smithBtn.addEventListener('click', () => {
                if (this.player.hand.length > 0) {
                    const card = this.player.hand[Math.floor(Math.random() * this.player.hand.length)];
                    card.effectValue += 1;
                    this.log(`🔨 锻造了「${card.name}」，效果值 +1！`, 'result');
                }
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                this.advanceToNextStage();
                resolve();
            });
            list.appendChild(smithBtn);

            const skipBtn = document.createElement('button');
            skipBtn.className = 'relic-choice-btn relic-choice-skip';
            skipBtn.textContent = '跳过，继续冒险';
            skipBtn.addEventListener('click', () => {
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                this.advanceToNextStage();
                resolve();
            });
            list.appendChild(skipBtn);

            this.dom.resultDetail.appendChild(list);
            overlay.classList.remove('hidden');
        });
    }

    async showTreasureEvent() {
        return new Promise(resolve => {
            const overlay = this.dom.overlay;
            this.dom.resultIcon.textContent = '💎';
            this.dom.resultTitle.textContent = '发现宝箱！';
            this.dom.resultDetail.innerHTML = '';
            this.dom.resultGold.classList.add('hidden');

            const list = document.createElement('div');
            list.style.cssText = 'display:flex; flex-direction:column; gap:10px; margin:12px 0;';

            const goldAmount = 3 + Math.floor(Math.random() * 5);

            const goldBtn = document.createElement('button');
            goldBtn.className = 'relic-choice-btn';
            goldBtn.textContent = `🪙 拿走金币（+${goldAmount}）`;
            goldBtn.addEventListener('click', () => {
                this.gold += goldAmount;
                this.log(`💎 从宝箱中获得 ${goldAmount} 金币！`, 'result');
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                this.advanceToNextStage();
                resolve();
            });
            list.appendChild(goldBtn);

            const relicBtn = document.createElement('button');
            relicBtn.className = 'relic-choice-btn';
            relicBtn.textContent = '🎁 打开暗格（随机遗物）';
            relicBtn.addEventListener('click', async () => {
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                await this.showRelicReward('common');
                this.advanceToNextStage();
                resolve();
            });
            list.appendChild(relicBtn);

            this.dom.resultDetail.appendChild(list);
            overlay.classList.remove('hidden');
        });
    }

    /* ========== Shop ========== */

    async showShop() {
        this.stopRoundTimer();
        this.gameOver = true;

        const ownedCardNames = new Set(this.player.hand.map(c => c.name));
        const ownedSkillNames = new Set(this.player.skills.map(s => s.name));
        const shopDiscount = this.player.relicSum('shopDiscount');

        const shopItems = [];
        for (const meta of ALL_CARDS) {
            if (meta.shopPrice && !ownedCardNames.has(meta.name)) {
                shopItems.push({ type: 'card', meta });
            }
        }
        for (const meta of ALL_SKILLS) {
            if (meta.shopPrice && !ownedSkillNames.has(meta.name)) {
                shopItems.push({ type: 'skill', meta });
            }
        }

        // Add random relic to shop
        const ownedRelicIds = this.player.relics.map(r => r.id);
        const shopRelics = pickRelicsForReward(2, ownedRelicIds);
        for (const relic of shopRelics) {
            const basePrice = { common: 5, uncommon: 8, rare: 12, legendary: 18 }[relic.tier] || 8;
            shopItems.push({ type: 'relic', meta: { ...relic, shopPrice: basePrice, name: relic.name, icon: relic.icon, description: relic.description } });
        }

        const overlay = this.dom.overlay;
        this.dom.resultIcon.textContent = '🛒';
        this.dom.resultTitle.textContent = `第 ${this.stage} 关胜利！— 商店`;
        this.dom.resultGold.textContent = `🪙 当前金币：${this.gold}`;
        this.dom.resultGold.classList.remove('hidden');

        if (shopItems.length === 0) {
            this.dom.resultDetail.textContent = '商店已售罄！你拥有了所有物品。';
        } else {
            this.dom.resultDetail.innerHTML = '';
            const list = document.createElement('div');
            list.style.cssText = 'text-align:left; margin:8px 0; max-height:300px; overflow-y:auto;';
            for (const item of shopItems) {
                const price = Math.max(0, (item.meta.shopPrice || 0) - shopDiscount);
                const btn = document.createElement('button');
                btn.style.cssText = 'display:block; width:100%; margin:6px 0; padding:8px; cursor:pointer; border:1px solid #555; border-radius:6px; background:#2a2a3a; color:#eee; font-size:0.95em;';

                const typeLabel = item.type === 'relic'
                    ? `[${RELIC_TIERS[item.meta.tier]?.label || '遗物'}]`
                    : item.type === 'card' ? '[卡牌]' : '[技能]';

                btn.textContent = `${item.meta.icon} ${typeLabel} ${item.meta.name} — ${item.meta.description} （💰${price}）`;
                btn.addEventListener('click', () => {
                    this.buyShopItem(item, btn, price);
                });
                list.appendChild(btn);
            }
            this.dom.resultDetail.appendChild(list);
        }

        const restartBtn = document.getElementById('btn-restart');
        const originalText = restartBtn.textContent;
        restartBtn.textContent = '继续冒险 ➡️';
        overlay.classList.remove('hidden');

        return new Promise(resolve => {
            const handler = () => {
                restartBtn.removeEventListener('click', handler);
                restartBtn.textContent = originalText;
                overlay.classList.add('hidden');
                this.dom.resultDetail.innerHTML = '';
                this.dom.resultGold.classList.add('hidden');
                this.advanceToNextStage();
                resolve();
            };
            restartBtn.addEventListener('click', handler, { once: true });
        });
    }

    buyShopItem(item, btn, price) {
        if (this.gold < price) {
            this.log(`❌ 金币不足！需要 ${price}，当前 ${this.gold}`, 'system');
            return;
        }

        if (item.type === 'card') {
            this.player.addCard(item.meta.factory());
            this.gold -= price;
            this.log(`✅ 购买了「${item.meta.name}」卡！`, 'result');
        } else if (item.type === 'skill') {
            if (!this.player.equipSkill(item.meta.factory())) {
                this.log('❌ 技能栏已满（最多3个）！', 'system');
                return;
            }
            this.gold -= price;
            this.log(`✅ 装备了「${item.meta.name}」技能！`, 'result');
        } else if (item.type === 'relic') {
            const relic = ALL_RELICS.find(r => r.id === item.meta.id);
            if (relic) {
                this.player.addRelic(relic);
                this._applyRelicCardModifiers();
                this.gold -= price;
                this.log(`✅ 获得遗物「${relic.name}」！`, 'result');
                this.renderRelics();
            }
        }

        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.textContent += ' ✅ 已购买';
        this.dom.resultGold.textContent = `🪙 当前金币：${this.gold}`;
    }

    advanceToNextStage() {
        this.stage++;
        this.round = 1;
        this.gameOver = false;

        this.player.resetForBattle();
        this._applyRelicCardModifiers();
        for (const card of this.player.hand) {
            card.setInitialCooldown(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }
        this.spawnEnemy();

        this.renderCards();
        this.renderSkills();
        this.renderEnergy();
        this.renderMana();
        this.renderRelics();
        this.syncUI();
        this.logStageStart();
        this.startRound();
    }

    /* ========== Actions ========== */

    async performAttack(attackerSide, target, targetSide, amount) {
        if (this.sfx) this.sfx.playAttack(attackerSide);
        await this.animateAttack(attackerSide);

        if (targetSide === 'enemy' && target.dodgeChance > 0 && Math.random() < target.dodgeChance) {
            this.log(`  💨 ${target.name} 闪避了攻击！`, 'system');
            return;
        }

        // Fragile debuff: +5% damage taken per stack
        const fragileBuff = target.buffManager.get('fragile');
        if (fragileBuff) {
            amount = Math.floor(amount * (1 + BUFF_DEFS.fragile.damageIncrease(fragileBuff.stacks)));
        }

        const shieldBefore = target.shield;
        target.takeDamage(amount);
        const absorbed = shieldBefore - target.shield;
        const actual = amount - absorbed;

        if (absorbed > 0) {
            this.log(`  🛡️ ${target.name}的护盾抵消了 ${absorbed} 点伤害！`, 'system');
        }

        if (actual > 0) {
            if (this.sfx) this.sfx.playHit(actual);
            await this.animateHit(targetSide, actual);
            this.log(`  对 ${target.name} 造成了 ${actual} 点伤害！`, attackerSide);
        } else {
            if (this.sfx) this.sfx.playBlock();
            await this.animateShieldBlock(targetSide);
            this.log(`  攻击被完全抵挡！`, 'system');
        }

        this.updateHpBars();
        this.updateShields();
    }

    async performDefense(side, combatant, amount) {
        combatant.addShield(amount);
        if (this.sfx) this.sfx.playDefense(side);
        await this.animateDefense(side);
        this.log(`  🛡️ 获得了 ${amount} 点护盾！`, side);
        this.updateShields();
    }

    /* ========== Animations ========== */

    async animateAttack(side) {
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;
        this.retrigger(frame, 'anim-attack');
        await this.delay(400);
        frame.classList.remove('anim-attack');
    }

    async animateHit(side, amount) {
        const panel = side === 'player' ? this.dom.playerPanel : this.dom.enemyPanel;
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;

        this.retrigger(panel, 'anim-hit');
        this.retrigger(frame, 'anim-flash');

        const popup = document.createElement('div');
        popup.className = 'dmg-popup';
        popup.textContent = `-${amount}`;
        panel.appendChild(popup);

        await this.delay(700);
        panel.classList.remove('anim-hit');
        frame.classList.remove('anim-flash');
        popup.remove();
    }

    async animateDefense(side) {
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;
        this.retrigger(frame, 'anim-defend');
        await this.delay(600);
        frame.classList.remove('anim-defend');
    }

    async animateShieldBlock(side) {
        const panel = side === 'player' ? this.dom.playerPanel : this.dom.enemyPanel;
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;

        this.retrigger(frame, 'anim-shield-block');

        const popup = document.createElement('div');
        popup.className = 'shield-popup';
        popup.textContent = '🛡️';
        panel.appendChild(popup);

        await this.delay(650);
        frame.classList.remove('anim-shield-block');
        popup.remove();
    }

    async animateHeal(side) {
        const panel = side === 'player' ? this.dom.playerPanel : this.dom.enemyPanel;

        const popup = document.createElement('div');
        popup.className = 'heal-popup';
        popup.textContent = '+❤️';
        panel.appendChild(popup);

        await this.delay(700);
        popup.remove();
    }

    retrigger(el, cls) {
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
    }

    /* ========== Game over ========== */

    async showResult(won, isFinalVictory = false) {
        this.stopRoundTimer();
        this.gameOver = true;

        if (this.music) {
            if (won) this.music.playVictoryMusic();
            else     this.music.playDefeatMusic();
        }

        this.dom.resultIcon.textContent  = won ? '🎉' : '💀';
        if (isFinalVictory) {
            this.dom.resultTitle.textContent = '恭喜通关！';
            this.dom.resultDetail.textContent = `你击败了巨龙，以 ${this.player.hp}/${this.player.maxHp} HP 通关！收集了 ${this.player.relics.length} 件遗物。`;
        } else if (won) {
            this.dom.resultTitle.textContent = '你胜利了！';
            this.dom.resultDetail.textContent = `经过 ${this.round} 回合激战，${this.player.name} 获胜！`;
        } else {
            this.dom.resultTitle.textContent = '你被击败了…';
            this.dom.resultDetail.textContent = `${this.enemy.name} 在第 ${this.stage} 关第 ${this.round} 回合击败了你。收集了 ${this.player.relics.length} 件遗物。`;
        }

        this.dom.resultGold.textContent = `🪙 总金币：${this.gold}`;
        this.dom.resultGold.classList.remove('hidden');

        try {
            const bonus = this.player.victoryBonusGold();
            if (won) await this.onVictory(bonus);
        } catch { /* auth not configured */ }

        this.dom.overlay.classList.remove('hidden');
    }

    restart() {
        this.stopRoundTimer();
        this.dom.overlay.classList.add('hidden');
        this.dom.resultGold.classList.add('hidden');
        this.dom.logBody.innerHTML = '';
        this.gold = 0;
        this.stage = 1;
        this.initState();
        this.renderEnergy();
        this.renderRelics();
        this.renderCards();
        this.renderSkills();
        this.syncUI();
        this.logStageStart();
        this.startRound();
        if (this.music) this.music.playBattleBGM();
    }

    /* ========== Utility ========== */

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
