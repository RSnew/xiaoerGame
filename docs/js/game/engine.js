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

const ROUND_DURATION_MS = 5000;
const ROUND_TICK_MS = 200;
const PLAYER_INITIAL_CARD_COOLDOWN_MS = 1000;
const ENEMY_INITIAL_CARD_COOLDOWN_MS = 2000;
const ENEMY_ACTION_BUFFER_MS = 300;
const STAGES_BEFORE_BOSS = 3;

/**
 * Drives the game: manages state, UI updates, animations, and timed-round flow.
 * Supports multi-stage progression with shop and boss battle.
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
        for (const card of this.player.hand) {
            card.setInitialCooldown(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }

        this.spawnEnemy();

        this.round = 1;
        this.busy = false;
        this.gameOver = false;
        this.roundFinishing = false;
        this.playerUsedCardThisRound = false;
        this.playerDidAnyActionThisRound = false;
        this.enemyActedThisRound = false;
        this.roundEndsAt = 0;
        this.lastTickAt = 0;
        this.enemyActionAt = null;
        this.roundTimerId = null;
    }

    spawnEnemy() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        if (isBoss) {
            this.enemy = new Dragon('巨龙', 8);
            this.enemyCard = new Card('龙息', '造成 2 点伤害', CardEffect.DAMAGE, 2, '🔥', 4000);
        } else {
            const enemyPool = [
                () => new Slime('史莱姆', 3),
                () => new GoblinRogue('哥布林刺客', 4),
                () => new SkeletonMage('骷髅法师', 5),
                () => new ForestWolf('森林狼', 3),
            ];
            this.enemy = enemyPool[Math.floor(Math.random() * enemyPool.length)]();
            this.enemyCard = createAttackCard();
        }
        this.enemyCard.setInitialCooldown(ENEMY_INITIAL_CARD_COOLDOWN_MS);
    }

    logStageStart() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        if (isBoss) {
            this.log('╔══════════════════════════╗', 'system');
            this.log('║      Boss 战！           ║', 'system');
            this.log('╚══════════════════════════╝', 'system');
        } else {
            this.log(`📜 第 ${this.stage}/${STAGES_BEFORE_BOSS} 关`, 'system');
        }
        this.log(`⚔️ 战斗开始！勇者 vs ${this.enemy.name}`, 'system');
        if (this.enemy.dodgeChance > 0) {
            this.log(`🌀 敌方被动：每次受击有 ${Math.round(this.enemy.dodgeChance * 100)}% 概率闪避！`, 'system');
        }
        if (this.enemy.shield > 0) {
            this.log(`🛡️ 敌方被动：初始拥有 ${this.enemy.shield} 点护盾！`, 'system');
        }
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
            enemyPanel:        document.getElementById('enemy-panel'),
            enemyFrame:        document.getElementById('enemy-frame'),
            enemyHpBar:        document.getElementById('enemy-hp-bar'),
            enemyHpNum:        document.getElementById('enemy-hp-num'),
            enemyShieldBadge:  document.getElementById('enemy-shield-badge'),
            enemyShieldVal:    document.getElementById('enemy-shield-val'),
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
                valueLabel = `伤害 ${card.effectValue}`;
            } else if (card.effectType === CardEffect.SHIELD) {
                valueLabel = `护盾 ${card.effectValue}`;
            } else if (card.effectType === CardEffect.HEAL) {
                valueLabel = `治疗 ${card.effectValue}`;
            } else {
                valueLabel = '可用';
            }

            el.innerHTML = `
                <div class="card-icon">${card.icon}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.description}</div>
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

    canPlayerUseCard() {
        return !this.gameOver && !this.busy && !this.playerUsedCardThisRound;
    }

    canPlayerUseSkill() {
        return !this.gameOver && !this.busy;
    }

    isCardDisabled(card) {
        return !this.canPlayerUseCard() || !card.isReady();
    }

    isSkillDisabled(skill) {
        return !this.canPlayerUseSkill() || !skill.isReady();
    }

    syncUI() {
        this.updateTurnBanner();
        this.updateHpBars();
        this.updateShields();
        this.updateActionHint();
    }

    updateTurnBanner() {
        const isBoss = this.stage > STAGES_BEFORE_BOSS;
        const stageLabel = isBoss ? 'Boss' : `${this.stage}/${STAGES_BEFORE_BOSS}关`;
        this.dom.roundText.textContent = `[${stageLabel}] 第 ${this.round} 回合`;
        const remainingMs = this.roundEndsAt > 0
            ? Math.max(0, this.roundEndsAt - Date.now())
            : ROUND_DURATION_MS;
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
        const hasReadyCard = !this.playerUsedCardThisRound && this.player.hand.some(card => card.isReady());
        const hasReadySkill = this.player.skills.some(skill => skill.isReady());
        if (hasReadyCard && hasReadySkill) {
            this.dom.handHint.textContent = '可出卡牌（本回合限 1 张）并可使用技能';
        } else if (hasReadyCard) {
            this.dom.handHint.textContent = '本回合可出 1 张卡牌';
        } else if (hasReadySkill) {
            this.dom.handHint.textContent = '可使用技能（不受回合次数限制）';
        } else if (this.playerUsedCardThisRound) {
            this.dom.handHint.textContent = '本回合卡牌已出，等待技能冷却…';
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
        this.playerUsedCardThisRound = false;
        this.playerDidAnyActionThisRound = false;
        this.enemyActedThisRound = false;
        this.roundFinishing = false;

        const now = Date.now();
        this.lastTickAt = now;
        this.roundEndsAt = now + ROUND_DURATION_MS;
        this.enemyActionAt = this.planEnemyAction(now);

        this.log(`⏱️ 第 ${this.round} 回合开始（5 秒）`, 'system');
        this.renderCards();
        this.renderSkills();
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
        if (earliest >= this.roundEndsAt) return null;
        const latest = this.roundEndsAt - ENEMY_ACTION_BUFFER_MS;
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

        this.player.clearShield();
        this.enemy.clearShield();
        this.round++;

        this.syncUI();
        this.renderCards();
        this.renderSkills();

        this.roundFinishing = false;
        this.startRound();
    }

    async onCardClick(index) {
        if (!this.canPlayerUseCard()) return;
        const card = this.player.hand[index];
        if (!card || !card.isReady()) return;

        this._ensureAudio();
        this.playerUsedCardThisRound = true;
        this.playerDidAnyActionThisRound = true;
        this.busy = true;
        card.triggerCooldown();
        this.renderCards();
        this.renderSkills();
        this.updateActionHint();

        this.log(`▶ 你使用了「${card.name}」！`, 'player');

        if (card.effectType === CardEffect.DAMAGE) {
            await this.performAttack('player', this.enemy, 'enemy', card.effectValue);
        } else if (card.effectType === CardEffect.SHIELD) {
            await this.performDefense('player', this.player, card.effectValue);
        } else if (card.effectType === CardEffect.HEAL) {
            const healed = this.player.heal(card.effectValue);
            await this.animateHeal('player');
            if (healed > 0) {
                if (this.sfx) this.sfx.playHeal();
                this.log(`  ❤️ 恢复了 ${healed} 点生命值！`, 'player');
            } else {
                this.log(`  ❤️ 生命值已满，未恢复。`, 'system');
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
            const healed = this.player.heal(skill.effectValue);
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
            await this.performAttack('player', this.enemy, 'enemy', damage);
            const healed = this.player.heal(heal);
            if (healed > 0) {
                await this.animateHeal('player');
                if (this.sfx) this.sfx.playHeal();
                this.log(`  ❤️ 同时恢复了 ${healed} 点生命值！`, 'player');
            }
            this.updateHpBars();
        } else if (skill.effectType === SkillEffect.GAIN_SHIELD) {
            await this.performDefense('player', this.player, skill.effectValue);
        }

        skill.triggerCooldown();
        this.renderSkills();

        const finished = await this.checkGameOverAfterAction();
        this.busy = false;
        this.renderCards();
        this.renderSkills();
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
            await this.performAttack('enemy', this.player, 'player', this.enemyCard.effectValue);
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
        const baseReward = isBoss
            ? 5 + Math.floor(Math.random() * 4)
            : 1 + Math.floor(Math.random() * 3);
        const bonus = this.player.victoryBonusGold();
        const reward = baseReward + bonus;
        this.gold += reward;

        if (bonus > 0) {
            this.log(`💰 获得 ${reward} 金币！（基础 ${baseReward} + 预备 +${bonus}）`, 'result');
        } else {
            this.log(`💰 获得 ${reward} 金币！`, 'result');
        }
        this.log(`🪙 当前金币：${this.gold}`, 'result');

        if (isBoss) {
            await this.showResult(true, true);
            return;
        }

        await this.showShop();
    }

    /* ========== Shop ========== */

    async showShop() {
        this.stopRoundTimer();
        this.gameOver = true;

        const ownedCardNames = new Set(this.player.hand.map(c => c.name));
        const ownedSkillNames = new Set(this.player.skills.map(s => s.name));

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
            list.style.cssText = 'text-align:left; margin:8px 0;';
            for (const item of shopItems) {
                const btn = document.createElement('button');
                btn.style.cssText = 'display:block; width:100%; margin:6px 0; padding:8px; cursor:pointer; border:1px solid #555; border-radius:6px; background:#2a2a3a; color:#eee; font-size:0.95em;';
                btn.textContent = `${item.meta.icon} ${item.meta.name} — ${item.meta.description} （💰${item.meta.shopPrice}）`;
                btn.addEventListener('click', () => {
                    this.buyShopItem(item, btn);
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

    buyShopItem(item, btn) {
        if (this.gold < item.meta.shopPrice) {
            this.log(`❌ 金币不足！需要 ${item.meta.shopPrice}，当前 ${this.gold}`, 'system');
            return;
        }

        if (item.type === 'card') {
            this.player.addCard(item.meta.factory());
            this.gold -= item.meta.shopPrice;
            this.log(`✅ 购买了「${item.meta.name}」卡！`, 'result');
        } else if (item.type === 'skill') {
            if (!this.player.equipSkill(item.meta.factory())) {
                this.log('❌ 技能栏已满（最多3个）！', 'system');
                return;
            }
            this.gold -= item.meta.shopPrice;
            this.log(`✅ 装备了「${item.meta.name}」技能！`, 'result');
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
        for (const card of this.player.hand) {
            card.setInitialCooldown(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }
        this.spawnEnemy();

        this.renderCards();
        this.renderSkills();
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
            this.dom.resultDetail.textContent = `你击败了巨龙，以 ${this.player.hp}/${this.player.maxHp} HP 通关！`;
        } else if (won) {
            this.dom.resultTitle.textContent = '你胜利了！';
            this.dom.resultDetail.textContent = `经过 ${this.round} 回合激战，${this.player.name} 获胜！`;
        } else {
            this.dom.resultTitle.textContent = '你被击败了…';
            this.dom.resultDetail.textContent = `${this.enemy.name} 在第 ${this.stage} 关第 ${this.round} 回合击败了你。`;
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
