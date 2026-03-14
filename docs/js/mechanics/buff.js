/**
 * Buff / Debuff system.
 *
 * Each buff has:
 *   id        — unique identifier
 *   name      — display name
 *   icon      — emoji
 *   stacks    — current stack count (≥1)
 *   maxStacks — max allowed stacks (0 = unlimited)
 *   duration  — remaining rounds (0 = permanent until removed)
 *   type      — 'buff' | 'debuff'
 *   description(stacks) — returns text for current stack count
 *
 * Registered buff definitions live in BUFF_DEFS.
 */

/** Buff / debuff instance attached to a combatant. */
export class Buff {
    constructor(def, stacks = 1, duration = 0) {
        this.id = def.id;
        this.def = def;
        this.stacks = Math.min(stacks, def.maxStacks || Infinity);
        this.duration = duration; // 0 = permanent
    }

    get name() { return this.def.name; }
    get icon() { return this.def.icon; }
    get type() { return this.def.type; }

    /** Add stacks (clamped to maxStacks). */
    addStacks(n) {
        const max = this.def.maxStacks || Infinity;
        this.stacks = Math.min(this.stacks + n, max);
    }

    /** Tick duration. Returns true if expired. */
    tick() {
        if (this.duration <= 0) return false; // permanent
        this.duration -= 1;
        return this.duration <= 0;
    }

    /** Get description for current stacks. */
    describe() {
        return this.def.description(this.stacks);
    }
}

/* ═══════════════════════════════════════════
 *  Buff Definitions Registry
 * ═══════════════════════════════════════════ */

export const BUFF_DEFS = {};

function registerBuff(def) {
    BUFF_DEFS[def.id] = def;
}

/* ─── 滋润 (Nourish) ─── */
registerBuff({
    id: 'nourish',
    name: '滋润',
    icon: '💧',
    type: 'buff',
    maxStacks: 20,
    description: (stacks) => `回复效果 +${stacks * 5}%`,
    /** Returns the heal multiplier bonus for current stacks (e.g. 2 stacks → 0.10). */
    healBonus: (stacks) => stacks * 0.05,
});

/* ─── 脆弱 (Fragile) ─── */
registerBuff({
    id: 'fragile',
    name: '脆弱',
    icon: '🔻',
    type: 'debuff',
    maxStacks: 20,
    description: (stacks) => `受到伤害 +${stacks * 5}%`,
    /** Returns the incoming damage multiplier bonus (e.g. 2 stacks → 0.10). */
    damageIncrease: (stacks) => stacks * 0.05,
});

/* ═══════════════════════════════════════════
 *  Buff Manager — manages buffs on a combatant
 * ═══════════════════════════════════════════ */

export class BuffManager {
    constructor() {
        /** @type {Buff[]} */
        this.buffs = [];
    }

    /** Apply or stack a buff by id. */
    apply(id, stacks = 1, duration = 0) {
        const def = BUFF_DEFS[id];
        if (!def) return null;

        const existing = this.buffs.find(b => b.id === id);
        if (existing) {
            existing.addStacks(stacks);
            // Refresh duration if new duration is longer
            if (duration > 0 && duration > existing.duration) {
                existing.duration = duration;
            }
            return existing;
        }

        const buff = new Buff(def, stacks, duration);
        this.buffs.push(buff);
        return buff;
    }

    /** Remove a buff by id. */
    remove(id) {
        this.buffs = this.buffs.filter(b => b.id !== id);
    }

    /** Get a buff by id (or null). */
    get(id) {
        return this.buffs.find(b => b.id === id) || null;
    }

    /** Get current stacks of a buff (0 if absent). */
    stacks(id) {
        return this.get(id)?.stacks || 0;
    }

    /** Tick all buff durations, removing expired ones. Returns list of expired buff ids. */
    tick() {
        const expired = [];
        this.buffs = this.buffs.filter(b => {
            if (b.tick()) {
                expired.push(b.id);
                return false;
            }
            return true;
        });
        return expired;
    }

    /** Clear all buffs. */
    clear() {
        this.buffs = [];
    }

    /** Whether any buffs exist. */
    get hasBuff() {
        return this.buffs.length > 0;
    }
}
