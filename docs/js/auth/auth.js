import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let supabase = null;

const ERROR_ZH = {
    'Invalid login credentials': '邮箱或密码错误',
    'User already registered': '该邮箱已注册',
    'Password should be at least 6 characters': '密码至少需要 6 位',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Too fast': '操作太快，请稍后再试',
    'Not authenticated': '请先登录',
};

function translateError(msg) {
    for (const [en, zh] of Object.entries(ERROR_ZH)) {
        if (msg.includes(en)) return zh;
    }
    return msg;
}

/** Whether Supabase credentials have been configured. */
export function isConfigured() {
    return SUPABASE_URL && !SUPABASE_URL.startsWith('YOUR_');
}

/** Initialise the Supabase client. Call once on page load. */
export async function init() {
    if (!isConfigured()) return;
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'xiaoer-auth',
            storage: window.localStorage,
        },
    });
}

/** Register a new account. */
export async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
    });
    if (error) throw new Error(translateError(error.message));
    return data;
}

/** Log in with email + password. */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw new Error(translateError(error.message));
    return data;
}

/** Log out. */
export async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
}

/** Get current session (null if not logged in). */
export async function getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/** Fetch the logged-in user's profile (username, gold). */
export async function getProfile() {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('username, gold')
        .single();
    if (error) return null;
    return data;
}

/** Award battle gold (1–3, server-side random). Returns amount or null. */
export async function addBattleReward() {
    if (!supabase) return null;
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await supabase.rpc('add_battle_reward');
    if (error) {
        console.warn('Battle reward failed:', error.message);
        return null;
    }
    return data;
}

/** Listen for auth state changes. */
export function onAuthStateChange(callback) {
    if (!supabase) return;
    supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
