import { Player } from '../character/player.js';
import { Slime } from '../enemy/slime.js';
import { createAttackCard } from '../card/attack.js';
import { CardEffect } from '../card/card.js';
import { TurnPhase, phaseLabel } from '../mechanics/turn.js';

/**
 * Drives the game: manages state, UI updates, animations, and turn flow.
 */
export class GameEngine {
    constructor() {
        this.initState();
        this.cacheDom();
        this.bindRestart();
        this.renderCards();
        this.updateHpBars();
        this.updateTurnBanner();
        this.log('⚔️ 战斗开始！勇者 vs 史莱姆', 'system');
    }

    /* ---------- Initialisation ---------- */

    initState() {
        this.player = new Player('勇者', 3);
        this.player.addCard(createAttackCard());
        this.enemy = new Slime('史莱姆', 3);
        this.phase = TurnPhase.PLAYER;
        this.round = 1;
        this.busy = false;
        this.gameOver = false;
    }

    cacheDom() {
        this.dom = {
            roundText:   document.getElementById('round-text'),
            phaseText:   document.getElementById('phase-text'),
            playerPanel: document.getElementById('player-panel'),
            playerFrame: document.getElementById('player-frame'),
            playerHpBar: document.getElementById('player-hp-bar'),
            playerHpNum: document.getElementById('player-hp-num'),
            enemyPanel:  document.getElementById('enemy-panel'),
            enemyFrame:  document.getElementById('enemy-frame'),
            enemyHpBar:  document.getElementById('enemy-hp-bar'),
            enemyHpNum:  document.getElementById('enemy-hp-num'),
            handCards:   document.getElementById('hand-cards'),
            handHint:    document.getElementById('hand-hint'),
            logBody:     document.getElementById('log-body'),
            overlay:     document.getElementById('overlay'),
            resultIcon:  document.getElementById('result-icon'),
            resultTitle: document.getElementById('result-title'),
            resultDetail:document.getElementById('result-detail'),
        };
    }

    bindRestart() {
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.restart();
        });
    }

    /* ---------- Rendering ---------- */

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
                <div class="card-value">伤害 ${card.effectValue}</div>
            `;
            el.addEventListener('click', () => this.onCardClick(i));
            this.dom.handCards.appendChild(el);
        });
    }

    setCardsEnabled(enabled) {
        const cards = this.dom.handCards.querySelectorAll('.card');
        cards.forEach(c => c.classList.toggle('card-disabled', !enabled));
        this.dom.handHint.textContent = enabled ? '点击卡牌使用' : '等待中…';
    }

    updateTurnBanner() {
        this.dom.roundText.textContent = `第 ${this.round} 回合`;
        this.dom.phaseText.textContent = phaseLabel(this.phase);
        this.dom.phaseText.className = this.phase === TurnPhase.PLAYER
            ? 'phase-player' : 'phase-enemy';
    }

    updateHpBars() {
        this.setHp('player', this.player);
        this.setHp('enemy', this.enemy);
    }

    setHp(side, combatant) {
        const pct = combatant.hpPercent();
        const bar = side === 'player' ? this.dom.playerHpBar : this.dom.enemyHpBar;
        const num = side === 'player' ? this.dom.playerHpNum : this.dom.enemyHpNum;
        bar.style.width = pct + '%';
        bar.className = 'hp-fill ' + this.hpClass(pct);
        num.textContent = `${combatant.hp} / ${combatant.maxHp}`;
    }

    hpClass(pct) {
        if (pct > 60) return 'hp-high';
        if (pct > 30) return 'hp-mid';
        return 'hp-low';
    }

    log(msg, type = '') {
        const div = document.createElement('div');
        div.className = 'log-entry' + (type ? ` log-${type}` : '');
        div.textContent = msg;
        this.dom.logBody.appendChild(div);
        this.dom.logBody.scrollTop = this.dom.logBody.scrollHeight;
    }

    /* ---------- Turn flow ---------- */

    async onCardClick(index) {
        if (this.busy || this.gameOver || this.phase !== TurnPhase.PLAYER) return;
        this.busy = true;
        this.setCardsEnabled(false);

        const card = this.player.hand[index];

        // --- Player plays ---
        this.log(`▶ 你使用了「${card.name}」！`, 'player');
        await this.animateAttack('player');
        this.applyEffect(card, this.enemy);
        await this.animateHit('enemy', card.effectValue);
        this.updateHpBars();

        if (!this.enemy.isAlive()) {
            this.log(`💀 ${this.enemy.name} 被击败了！`, 'result');
            await this.delay(400);
            this.showResult(true);
            return;
        }

        // --- Switch to enemy turn ---
        this.phase = TurnPhase.ENEMY;
        this.updateTurnBanner();
        await this.delay(600);

        // --- Enemy plays ---
        const enemyCard = createAttackCard();
        this.log(`▶ ${this.enemy.name} 使用了「${enemyCard.name}」！`, 'enemy');
        await this.animateAttack('enemy');
        this.applyEffect(enemyCard, this.player);
        await this.animateHit('player', enemyCard.effectValue);
        this.updateHpBars();

        if (!this.player.isAlive()) {
            this.log(`💀 ${this.player.name} 被击败了！`, 'result');
            await this.delay(400);
            this.showResult(false);
            return;
        }

        // --- Next round ---
        await this.delay(350);
        this.phase = TurnPhase.PLAYER;
        this.round++;
        this.updateTurnBanner();
        this.setCardsEnabled(true);
        this.busy = false;
    }

    applyEffect(card, target) {
        if (card.effectType === CardEffect.DAMAGE) {
            target.takeDamage(card.effectValue);
        }
    }

    /* ---------- Animations ---------- */

    async animateAttack(side) {
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;
        frame.classList.remove('anim-attack');
        void frame.offsetWidth;
        frame.classList.add('anim-attack');
        await this.delay(400);
        frame.classList.remove('anim-attack');
    }

    async animateHit(side, amount) {
        const panel = side === 'player' ? this.dom.playerPanel : this.dom.enemyPanel;
        const frame = side === 'player' ? this.dom.playerFrame : this.dom.enemyFrame;

        // Shake + flash
        panel.classList.remove('anim-hit');
        frame.classList.remove('anim-flash');
        void panel.offsetWidth;
        panel.classList.add('anim-hit');
        frame.classList.add('anim-flash');

        // Floating damage number
        const popup = document.createElement('div');
        popup.className = 'dmg-popup';
        popup.textContent = `-${amount}`;
        panel.appendChild(popup);

        await this.delay(700);

        panel.classList.remove('anim-hit');
        frame.classList.remove('anim-flash');
        popup.remove();
    }

    /* ---------- Game over ---------- */

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
        this.updateHpBars();
        this.updateTurnBanner();
        this.setCardsEnabled(true);
        this.log('⚔️ 新的战斗开始！', 'system');
    }

    /* ---------- Utility ---------- */

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
