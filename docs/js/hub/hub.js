import * as auth from '../auth/auth.js';
import {
    ALL_CARDS, ALL_SKILLS,
    MAX_EQUIPPED_CARDS, MAX_EQUIPPED_SKILLS,
    getCardById, getSkillById,
} from './registry.js';
import {
    loadState, saveState,
    getEquippedCards, setEquippedCards,
    getEquippedSkills, setEquippedSkills,
} from './state.js';

/* ========== DOM refs ========== */
const dom = {
    guestBar:       document.getElementById('guest-bar'),
    userBar:        document.getElementById('user-bar'),
    goldDisplay:    document.getElementById('gold-display'),
    hubGoldValue:   document.getElementById('hub-gold-value'),
    userName:       document.getElementById('user-name'),
    btnOpenAuth:    document.getElementById('btn-open-auth'),
    btnLogout:      document.getElementById('btn-logout'),
    authModal:      document.getElementById('auth-modal'),
    btnCloseAuth:   document.getElementById('btn-close-auth'),
    authTabs:       document.querySelectorAll('.auth-tab'),
    loginForm:      document.getElementById('login-form'),
    registerForm:   document.getElementById('register-form'),
    loginError:     document.getElementById('login-error'),
    regError:       document.getElementById('reg-error'),
    hubTabs:        document.querySelectorAll('.hub-tab'),
    panelCards:     document.getElementById('panel-cards'),
    panelSkills:    document.getElementById('panel-skills'),
    panelShop:      document.getElementById('panel-shop'),
    equippedCards:  document.getElementById('equipped-cards'),
    availableCards: document.getElementById('available-cards'),
    cardCounter:    document.getElementById('card-counter'),
    equippedSkills: document.getElementById('equipped-skills'),
    availableSkills:document.getElementById('available-skills'),
    skillCounter:   document.getElementById('skill-counter'),
    btnBattle:      document.getElementById('btn-battle'),
};

const panels = {
    cards:  dom.panelCards,
    skills: dom.panelSkills,
    shop:   dom.panelShop,
};

/* ========== Boot ========== */
document.addEventListener('DOMContentLoaded', async () => {
    try { await auth.init(); } catch { /* CDN unavailable */ }

    bindHubTabs();
    bindAuthUI();
    renderAll();

    if (auth.isConfigured()) {
        auth.onAuthStateChange(handleAuthChange);
        const session = await auth.getSession();
        if (session) await showLoggedIn();
    } else {
        dom.userBar.classList.add('hidden');
    }
});

/* ========== Hub Tab Switching ========== */
function bindHubTabs() {
    dom.hubTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const panel = tab.dataset.panel;
            dom.hubTabs.forEach(t => t.classList.toggle('active', t === tab));
            Object.entries(panels).forEach(([key, el]) => {
                el.classList.toggle('hidden', key !== panel);
            });
        });
    });
}

/* ========== Render All ========== */
function renderAll() {
    renderCards();
    renderSkills();
    updateBattleButton();
}

/* ========== Cards Rendering ========== */
function renderCards() {
    const equipped = getEquippedCards();

    dom.cardCounter.textContent = `${equipped.length} / ${MAX_EQUIPPED_CARDS}`;
    dom.cardCounter.classList.toggle('full', equipped.length >= MAX_EQUIPPED_CARDS);

    dom.equippedCards.innerHTML = '';
    equipped.forEach((cardId, idx) => {
        const meta = getCardById(cardId);
        if (!meta) return;
        const el = createCardElement(meta, true, idx);
        dom.equippedCards.appendChild(el);
    });

    for (let i = equipped.length; i < MAX_EQUIPPED_CARDS; i++) {
        dom.equippedCards.appendChild(createEmptySlot('卡牌'));
    }

    dom.availableCards.innerHTML = '';
    ALL_CARDS.forEach(meta => {
        const el = createAvailableCard(meta);
        dom.availableCards.appendChild(el);
    });
}

function createCardElement(meta, isEquipped, index) {
    const el = document.createElement('div');
    el.className = 'hub-card';
    el.innerHTML = `
        <div class="card-icon">${meta.icon}</div>
        <div class="card-name">${meta.name}</div>
        <div class="card-desc">${meta.description}</div>
        <div class="card-badge ${meta.typeClass}">${meta.typeBadge}</div>
    `;

    if (isEquipped) {
        const mark = document.createElement('div');
        mark.className = 'equipped-mark';
        mark.textContent = '✓';
        el.appendChild(mark);

        const btn = document.createElement('button');
        btn.className = 'btn-remove';
        btn.textContent = '✕';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            unequipCard(index);
        });
        el.appendChild(btn);

        el.addEventListener('click', () => unequipCard(index));
    }

    return el;
}

function createAvailableCard(meta) {
    const el = document.createElement('div');
    el.className = 'hub-card';
    el.innerHTML = `
        <div class="card-icon">${meta.icon}</div>
        <div class="card-name">${meta.name}</div>
        <div class="card-desc">${meta.description}</div>
        <div class="card-badge ${meta.typeClass}">${meta.typeBadge}</div>
    `;

    el.addEventListener('click', () => {
        equipCard(meta.id);
    });

    return el;
}

function equipCard(cardId) {
    const equipped = getEquippedCards();
    if (equipped.length >= MAX_EQUIPPED_CARDS) {
        showToast('卡牌栏位已满（最多 4 张）');
        return;
    }
    equipped.push(cardId);
    setEquippedCards(equipped);
    renderCards();
    updateBattleButton();
    showToast(`已装备「${getCardById(cardId).name}」`);
}

function unequipCard(index) {
    const equipped = getEquippedCards();
    const removed = equipped.splice(index, 1);
    setEquippedCards(equipped);
    renderCards();
    updateBattleButton();
    const meta = getCardById(removed[0]);
    if (meta) showToast(`已卸下「${meta.name}」`);
}

/* ========== Skills Rendering ========== */
function renderSkills() {
    const equipped = getEquippedSkills();

    dom.skillCounter.textContent = `${equipped.length} / ${MAX_EQUIPPED_SKILLS}`;
    dom.skillCounter.classList.toggle('full', equipped.length >= MAX_EQUIPPED_SKILLS);

    dom.equippedSkills.innerHTML = '';
    equipped.forEach((skillId, idx) => {
        const meta = getSkillById(skillId);
        if (!meta) return;
        const el = createSkillElement(meta, true, idx);
        dom.equippedSkills.appendChild(el);
    });

    for (let i = equipped.length; i < MAX_EQUIPPED_SKILLS; i++) {
        dom.equippedSkills.appendChild(createEmptySlot('技能'));
    }

    dom.availableSkills.innerHTML = '';
    ALL_SKILLS.forEach(meta => {
        const el = createAvailableSkill(meta);
        dom.availableSkills.appendChild(el);
    });
}

function createSkillElement(meta, isEquipped, index) {
    const el = document.createElement('div');
    el.className = 'hub-card hub-skill-card';
    const delayText = meta.initialDelaySeconds && meta.initialDelaySeconds > 0
        ? `；开局 ${meta.initialDelaySeconds} 秒后可用`
        : '';
    el.innerHTML = `
        <div class="card-icon">${meta.icon}</div>
        <div class="card-name">${meta.name}</div>
        <div class="card-desc">${meta.description}</div>
        <div class="card-badge ${meta.typeClass}">${meta.typeBadge}</div>
        <div class="cooldown-info">冷却：${meta.cooldownSeconds} 秒${delayText}</div>
    `;

    if (isEquipped) {
        const mark = document.createElement('div');
        mark.className = 'equipped-mark';
        mark.textContent = '✓';
        el.appendChild(mark);

        const btn = document.createElement('button');
        btn.className = 'btn-remove';
        btn.textContent = '✕';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            unequipSkill(index);
        });
        el.appendChild(btn);

        el.addEventListener('click', () => unequipSkill(index));
    }

    return el;
}

function createAvailableSkill(meta) {
    const el = document.createElement('div');
    el.className = 'hub-card hub-skill-card';
    const delayText = meta.initialDelaySeconds && meta.initialDelaySeconds > 0
        ? `；开局 ${meta.initialDelaySeconds} 秒后可用`
        : '';
    el.innerHTML = `
        <div class="card-icon">${meta.icon}</div>
        <div class="card-name">${meta.name}</div>
        <div class="card-desc">${meta.description}</div>
        <div class="card-badge ${meta.typeClass}">${meta.typeBadge}</div>
        <div class="cooldown-info">冷却：${meta.cooldownSeconds} 秒${delayText}</div>
    `;

    el.addEventListener('click', () => {
        equipSkill(meta.id);
    });

    return el;
}

function equipSkill(skillId) {
    const equipped = getEquippedSkills();
    if (equipped.length >= MAX_EQUIPPED_SKILLS) {
        showToast('技能栏位已满（最多 2 个）');
        return;
    }
    equipped.push(skillId);
    setEquippedSkills(equipped);
    renderSkills();
    updateBattleButton();
    showToast(`已装备「${getSkillById(skillId).name}」`);
}

function unequipSkill(index) {
    const equipped = getEquippedSkills();
    const removed = equipped.splice(index, 1);
    setEquippedSkills(equipped);
    renderSkills();
    updateBattleButton();
    const meta = getSkillById(removed[0]);
    if (meta) showToast(`已卸下「${meta.name}」`);
}

/* ========== Empty Slot ========== */
function createEmptySlot(type) {
    const el = document.createElement('div');
    el.className = 'empty-slot';
    el.innerHTML = `
        <div class="empty-slot-icon">+</div>
        <div>空${type}栏位</div>
    `;
    return el;
}

/* ========== Battle Button ========== */
function updateBattleButton() {
    const cards = getEquippedCards();
    if (cards.length === 0) {
        dom.btnBattle.classList.add('disabled');
        dom.btnBattle.title = '请至少装备 1 张卡牌';
    } else {
        dom.btnBattle.classList.remove('disabled');
        dom.btnBattle.title = '';
    }
}

/* ========== Toast ========== */
let toastTimer = null;
let toastFadeTimer = null;

function showToast(message) {
    const toast = document.getElementById('toast-container');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);
    if (toastFadeTimer) clearTimeout(toastFadeTimer);

    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    toast.style.transition = 'none';

    toastTimer = setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease';
        toast.style.opacity = '0';
        toastFadeTimer = setTimeout(() => { toast.style.display = 'none'; }, 450);
        toastTimer = null;
    }, 2500);
}

/* ========== Auth UI (same as main.js) ========== */
function bindAuthUI() {
    dom.btnOpenAuth.addEventListener('click', () => showModal());
    dom.btnCloseAuth.addEventListener('click', () => hideModal());
    dom.btnLogout.addEventListener('click', handleLogout);
    dom.authModal.addEventListener('click', (e) => {
        if (e.target === dom.authModal) hideModal();
    });
    dom.authTabs.forEach(tab =>
        tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    );
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.registerForm.addEventListener('submit', handleRegister);
}

function showModal() { dom.authModal.classList.remove('hidden'); clearErrors(); }
function hideModal() { dom.authModal.classList.add('hidden'); }

function switchTab(tab) {
    dom.authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    dom.loginForm.classList.toggle('hidden', tab !== 'login');
    dom.registerForm.classList.toggle('hidden', tab !== 'register');
    clearErrors();
}

function clearErrors() {
    dom.loginError.classList.add('hidden');
    dom.regError.classList.add('hidden');
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

function setSubmitLoading(form, loading) {
    const btn = form.querySelector('.auth-submit');
    btn.disabled = loading;
    btn.textContent = loading ? '请稍候…' : (form === dom.loginForm ? '登录' : '注册');
}

async function handleLogin(e) {
    e.preventDefault();
    if (!auth.isConfigured()) {
        showError(dom.loginError, '请先配置 Supabase（见 js/auth/config.js）');
        return;
    }
    clearErrors();
    setSubmitLoading(dom.loginForm, true);
    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await auth.signIn(email, password);
        hideModal();
    } catch (err) {
        showError(dom.loginError, err.message);
    } finally {
        setSubmitLoading(dom.loginForm, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    if (!auth.isConfigured()) {
        showError(dom.regError, '请先配置 Supabase（见 js/auth/config.js）');
        return;
    }
    clearErrors();
    setSubmitLoading(dom.registerForm, true);
    try {
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        await auth.signUp(email, password, username);
        hideModal();
    } catch (err) {
        showError(dom.regError, err.message);
    } finally {
        setSubmitLoading(dom.registerForm, false);
    }
}

async function handleLogout() { await auth.signOut(); }

async function handleAuthChange(session) {
    if (session) await showLoggedIn();
    else showLoggedOut();
}

async function showLoggedIn() {
    const profile = await auth.getProfile();
    if (!profile) return;
    dom.userName.textContent = profile.username;
    dom.goldDisplay.textContent = `🪙 ${profile.gold}`;
    dom.hubGoldValue.textContent = profile.gold;
    dom.guestBar.classList.add('hidden');
    dom.userBar.classList.remove('hidden');
}

function showLoggedOut() {
    dom.guestBar.classList.remove('hidden');
    dom.userBar.classList.add('hidden');
    dom.hubGoldValue.textContent = '0';
}
