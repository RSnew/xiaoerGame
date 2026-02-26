import { Player } from '../character/player.js';
import { Slime } from '../enemy/slime.js';
import { createAttackCard } from '../card/attack.js';
import { createDefenseCard } from '../card/defense.js';
import { CardEffect } from '../card/card.js';
import { TurnPhase, phaseLabel } from '../mechanics/turn.js';

/**
 * Drives the game: manages state, UI updates, animations, and turn flow.
 */
export class GameEngine {
    constructor() {
        this.cacheDom();
        this.bindRestart();
        this.initState();
        this.renderCards();
        this.syncUI();
        this.log('⚔️ 战斗开始！勇者 vs 史莱姆', 'system');
    }

    /* ========== Initialisation ========== */

    initState() {
        this.player = new Player('勇者', 3);
        this.player.addCard(createAttackCard());
        this.player.addCard(createDefenseCard());
        this.enemy = new Slime('史莱姆', 3);
        this.phase = TurnPhase.PLAYER;
        this.round = 1;
        this.busy = false;
        this.gameOver = false;
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
            logBody:           document.getElementById('log-body'),
            overlay:           document.getElementById('overlay'),
            resultIcon:        document.getElementById('result-icon'),
            resultTitle:       document.getElementById('result-title'),
            resultDetail:      document.getElementById('result-detail'),
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
            el.className = 'card';
            el.dataset.index = i;
            el.innerHTML = `
                <div class="card-icon">${card.icon}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.description}</div>
                <div class="card-value">${card.effectType === CardEffect.DAMAGE ? '伤害' : '护盾'} ${card.effectValue}</div>
            `;
            el.addEventListener('click', () => this.onCardClick(i));
            this.dom.handCards.appendChild(el);
        });
    }

    setCardsEnabled(enabled) {
        this.dom.handCards.querySelectorAll('.card').forEach(c =>
            c.classList.toggle('card-disabled', !enabled)
        );
        this.dom.handHint.textContent = enabled ? '点击卡牌使用' : '等待中…';
    }

    syncUI() {
        this.updateTurnBanner();
        this.updateHpBars();
        this.updateShields();
    }

    updateTurnBanner() {
        this.dom.roundText.textContent = `第 ${this.round} 回合`;
        this.dom.phaseText.textContent = phaseLabel(this.phase);
        this.dom.phaseText.className = this.phase === TurnPhase.PLAYER ? 'phase-player' : 'phase-enemy';
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

    log(msg, type = '') {
        const div = document.createElement('div');
        div.className = 'log-entry' + (type ? ` log-${type}` : '');
        div.textContent = msg;
        this.dom.logBody.appendChild(div);
        this.dom.logBody.scrollTop = this.dom.logBody.scrollHeight;
    }

    /* ========== Turn flow ========== */

    async onCardClick(index) {
        if (this.busy || this.gameOver || this.phase !== TurnPhase.PLAYER) return;
        this.busy = true;
        this.setCardsEnabled(false);

        const card = this.player.hand[index];
        this.log(`▶ 你使用了「${card.name}」！`, 'player');

        if (card.effectType === CardEffect.DAMAGE) {
            await this.performAttack('player', this.enemy, 'enemy', card.effectValue);
        } else if (card.effectType === CardEffect.SHIELD) {
            await this.performDefense('player', this.player, card.effectValue);
        }

        if (!this.enemy.isAlive()) {
            this.log(`💀 ${this.enemy.name} 被击败了！`, 'result');
            await this.delay(400);
            this.showResult(true);
            return;
        }

        // --- Enemy turn ---
        this.phase = TurnPhase.ENEMY;
        this.updateTurnBanner();
        await this.delay(600);

        const enemyCard = createAttackCard();
        this.log(`▶ ${this.enemy.name} 使用了「${enemyCard.name}」！`, 'enemy');
        await this.performAttack('enemy', this.player, 'player', enemyCard.effectValue);

        if (!this.player.isAlive()) {
            this.log(`💀 ${this.player.name} 被击败了！`, 'result');
            await this.delay(400);
            this.showResult(false);
            return;
        }

        // --- Next round: clear shields ---
        await this.delay(350);
        this.player.clearShield();
        this.enemy.clearShield();
        this.phase = TurnPhase.PLAYER;
        this.round++;
        this.syncUI();
        this.setCardsEnabled(true);
        this.busy = false;
    }

    /* ========== Actions ========== */

    async performAttack(attackerSide, target, targetSide, amount) {
        await this.animateAttack(attackerSide);

        const shieldBefore = target.shield;
        target.takeDamage(amount);
        const absorbed = shieldBefore - target.shield;
        const actual = amount - absorbed;

        if (absorbed > 0) {
            this.log(`  🛡️ ${target.name}的护盾抵消了 ${absorbed} 点伤害！`, 'system');
        }

        if (actual > 0) {
            await this.animateHit(targetSide, actual);
            this.log(`  对 ${target.name} 造成了 ${actual} 点伤害！`, attackerSide);
        } else {
            await this.animateShieldBlock(targetSide);
            this.log(`  攻击被完全抵挡！`, 'system');
        }

        this.updateHpBars();
        this.updateShields();
    }

    async performDefense(side, combatant, amount) {
        combatant.addShield(amount);
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

    /** Remove then re-add a class, forcing the browser to restart the animation. */
    retrigger(el, cls) {
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
    }

    /* ========== Game over ========== */

    showResult(won) {
        this.gameOver = true;
        this.dom.resultIcon.textContent  = won ? '🎉' : '💀';
        this.dom.resultTitle.textContent = won ? '你胜利了！' : '你被击败了…';
        this.dom.resultDetail.textContent = won
            ? `经过 ${this.round} 回合激战，${this.player.name} 以 ${this.player.hp}/${this.player.maxHp} HP 获胜！`
            : `${this.enemy.name} 在第 ${this.round} 回合击败了你。`;
        this.dom.overlay.classList.remove('hidden');
    }

    restart() {
        this.dom.overlay.classList.add('hidden');
        this.dom.logBody.innerHTML = '';
        this.initState();
        this.renderCards();
        this.syncUI();
        this.setCardsEnabled(true);
        this.log('⚔️ 新的战斗开始！', 'system');
    }

    /* ========== Utility ========== */

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
