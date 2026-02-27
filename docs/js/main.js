import { GameEngine } from './game/engine.js';
import { MusicManager } from './audio/music.js';
import { SfxManager } from './audio/sfx.js';
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
    btnMusic:    document.getElementById('btn-music'),
    volumeSlider:document.getElementById('volume-slider'),
};

const music  = new MusicManager();
const sfx    = new SfxManager();
let   engine = null;

/* ========== Boot ========== */
document.addEventListener('DOMContentLoaded', async () => {
    try { await auth.init(); } catch { /* CDN unavailable */ }

    hydrateAudioSettings();

    engine = new GameEngine({
        onVictory: handleVictory,
        music,
        sfx,
    });

    bindAuthUI();
    bindMusicUI();

    if (auth.isConfigured()) {
        auth.onAuthStateChange(handleAuthChange);
        const session = await auth.getSession();
        if (session) await showLoggedIn();
    } else {
        dom.userBar.classList.add('hidden');
    }
});

/* ========== Music UI ========== */
function bindMusicUI() {
    dom.btnMusic.addEventListener('click', () => {
        const targetMuted = !music.muted;
        syncMuteTo(targetMuted);
        dom.btnMusic.textContent = targetMuted ? '🔇' : '🎵';
        dom.btnMusic.title = targetMuted ? '取消静音' : '静音';
        persistAudioSettings();
    });
    dom.volumeSlider.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        music.setVolume(v);
        sfx.setVolume(v);
        if (music.muted) syncMuteTo(false);
        dom.btnMusic.textContent = '🎵';
        dom.btnMusic.title = '静音';
        persistAudioSettings();
    });
}

function syncMuteTo(muted) {
    if (music.muted !== muted) music.toggleMute();
    if (sfx.muted !== muted) sfx.toggleMute();
}

function hydrateAudioSettings() {
    try {
        const vRaw = localStorage.getItem('xiaoer.audio.volume');
        const mRaw = localStorage.getItem('xiaoer.audio.muted');
        const v = vRaw === null ? Number(dom.volumeSlider.value) : Number(vRaw);
        const muted = mRaw === '1';

        dom.volumeSlider.value = String(Math.max(0, Math.min(1, isFinite(v) ? v : 0.45)));
        music.setVolume(Number(dom.volumeSlider.value));
        sfx.setVolume(Number(dom.volumeSlider.value));
        syncMuteTo(muted);
        dom.btnMusic.textContent = muted ? '🔇' : '🎵';
        dom.btnMusic.title = muted ? '取消静音' : '静音';
    } catch { /* ok */ }
}

function persistAudioSettings() {
    try {
        localStorage.setItem('xiaoer.audio.volume', String(dom.volumeSlider.value));
        localStorage.setItem('xiaoer.audio.muted', music.muted ? '1' : '0');
    } catch { /* ok */ }
}

/* ========== Victory → Gold ========== */
async function handleVictory(bonus = 0) {
    const extra = Math.max(0, Number(bonus) || 0);

    // Guest mode (or auth not configured): still show a local reward so the game loop is complete.
    if (!auth.isConfigured()) {
        return Math.floor(Math.random() * 3) + 1 + extra;
    }

    const reward = await auth.addBattleReward(extra);
    if (reward) {
        await refreshGold();
        return reward;
    }

    // Auth configured but not logged in (or RPC failed): fall back to local reward display.
    return Math.floor(Math.random() * 3) + 1 + extra;
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
