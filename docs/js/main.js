import { GameEngine } from './game/engine.js';
import * as auth from './auth/auth.js';

/* ========== DOM refs ========== */
const dom = {
    guestBar:    document.getElementById('guest-bar'),
    userBar:     document.getElementById('user-bar'),
    goldDisplay: document.getElementById('gold-display'),
    userName:    document.getElementById('user-name'),
    btnOpenAuth: document.getElementById('btn-open-auth'),
    btnLogout:   document.getElementById('btn-logout'),
    authModal:   document.getElementById('auth-modal'),
    btnCloseAuth:document.getElementById('btn-close-auth'),
    authTabs:    document.querySelectorAll('.auth-tab'),
    loginForm:   document.getElementById('login-form'),
    registerForm:document.getElementById('register-form'),
    loginError:  document.getElementById('login-error'),
    regError:    document.getElementById('reg-error'),
};

let engine = null;

/* ========== Boot ========== */
document.addEventListener('DOMContentLoaded', async () => {
    try { await auth.init(); } catch { /* CDN unavailable */ }

    engine = new GameEngine({
        onVictory: handleVictory,
    });

    bindAuthUI();

    if (auth.isConfigured()) {
        auth.onAuthStateChange(handleAuthChange);
        const session = await auth.getSession();
        if (session) await showLoggedIn();
    } else {
        dom.userBar.classList.add('hidden');
    }
});

/* ========== Victory → Gold ========== */
async function handleVictory() {
    const reward = await auth.addBattleReward();
    if (reward) await refreshGold();
    return reward;
}

/* ========== Auth UI ========== */
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

function showModal() {
    dom.authModal.classList.remove('hidden');
    clearErrors();
}

function hideModal() {
    dom.authModal.classList.add('hidden');
}

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

/* ========== Auth Handlers ========== */
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

async function handleLogout() {
    await auth.signOut();
}

/* ========== Session State ========== */
async function handleAuthChange(session) {
    if (session) {
        await showLoggedIn();
    } else {
        showLoggedOut();
    }
}

async function showLoggedIn() {
    const profile = await auth.getProfile();
    if (!profile) return;
    dom.userName.textContent = profile.username;
    dom.goldDisplay.textContent = `🪙 ${profile.gold}`;
    dom.guestBar.classList.add('hidden');
    dom.userBar.classList.remove('hidden');
}

function showLoggedOut() {
    dom.guestBar.classList.remove('hidden');
    dom.userBar.classList.add('hidden');
}

async function refreshGold() {
    const profile = await auth.getProfile();
    if (profile) {
        dom.goldDisplay.textContent = `🪙 ${profile.gold}`;
    }
}
