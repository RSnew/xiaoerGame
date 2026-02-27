/**
 * Procedural combat sound effects (SFX) using Web Audio API.
 *
 * Design goals:
 * - No audio files, no dependencies.
 * - Short, readable, "gamey" feedback for: attack / hit / defend / block / heal.
 * - Safe by default: if AudioContext is unavailable or blocked, fail silently.
 */
export class SfxManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;

        this.volume = 0.55;
        this.muted = false;

        // Simple limiter to avoid loud stacking.
        this._playing = 0;
        this._maxPoly = 6;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        try {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        } catch { /* ok */ }
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.06);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.muted ? 0 : this.volume,
                this.ctx.currentTime,
                0.06,
            );
        }
        return this.muted;
    }

    /* ======== Public SFX API ======== */

    playAttack(side = 'player') {
        const up = side === 'player';
        this._attack({ pitchBias: up ? 1 : 0.92, intensity: 1.0 });
    }

    playHit(amount = 1) {
        const intensity = Math.max(0.7, Math.min(1.25, 0.85 + amount * 0.18));
        this._hit({ intensity });
    }

    playDefense(side = 'player') {
        const up = side === 'player';
        this._defend({ pitchBias: up ? 1.0 : 0.96, intensity: 1.0 });
    }

    playBlock() {
        this._block({ intensity: 1.0 });
    }

    playHeal() {
        this._heal({ intensity: 1.0 });
    }

    /* ======== Internals ======== */

    _okToPlay() {
        if (this.muted) return false;
        if (!this.ctx || !this.masterGain) return false;
        if (this._playing >= this._maxPoly) return false;
        return true;
    }

    _withPoly(fn) {
        this._playing++;
        try { fn(); } finally {
            // Decrement after a short grace period (typical SFX length).
            setTimeout(() => { this._playing = Math.max(0, this._playing - 1); }, 450);
        }
    }

    _noiseBuffer(seconds) {
        const ctx = this.ctx;
        const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            // Slightly pink-ish tilt by averaging two randoms.
            data[i] = ((Math.random() * 2 - 1) + (Math.random() * 2 - 1)) * 0.5;
        }
        return buf;
    }

    _envGain(start, peak, attack, release) {
        const ctx = this.ctx;
        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.setTargetAtTime(Math.max(0, peak), start, Math.max(0.001, attack));
        g.gain.setTargetAtTime(0, start + Math.max(0.01, attack), Math.max(0.01, release));
        return g;
    }

    _attack({ pitchBias = 1, intensity = 1 } = {}) {
        try {
            this.init();
            this.resume();
            if (!this._okToPlay()) return;

            this._withPoly(() => {
                const ctx = this.ctx;
                const now = ctx.currentTime;
                const bus = ctx.createGain();
                bus.gain.value = 0.9;
                bus.connect(this.masterGain);

                // "Slash": short filtered noise burst.
                const noise = ctx.createBufferSource();
                noise.buffer = this._noiseBuffer(0.07);
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = 950 * pitchBias;
                bp.Q.value = 1.2;
                const envN = this._envGain(now, 0.11 * intensity, 0.004, 0.05);
                noise.connect(bp);
                bp.connect(envN);
                envN.connect(bus);
                noise.start(now);
                noise.stop(now + 0.09);

                // "Whoosh": quick downward pitch sweep.
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(420 * pitchBias, now);
                osc.frequency.exponentialRampToValueAtTime(140 * pitchBias, now + 0.11);
                const envO = this._envGain(now, 0.08 * intensity, 0.005, 0.08);
                osc.connect(envO);
                envO.connect(bus);
                osc.start(now);
                osc.stop(now + 0.18);
            });
        } catch { /* ok */ }
    }

    _hit({ intensity = 1 } = {}) {
        try {
            this.init();
            this.resume();
            if (!this._okToPlay()) return;

            this._withPoly(() => {
                const ctx = this.ctx;
                const now = ctx.currentTime;
                const bus = ctx.createGain();
                bus.gain.value = 1.0;
                bus.connect(this.masterGain);

                // "Thud": low osc + tiny noise click.
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(86, now + 0.14);
                const env = this._envGain(now, 0.14 * intensity, 0.004, 0.14);
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 680;
                lp.Q.value = 0.7;
                osc.connect(lp);
                lp.connect(env);
                env.connect(bus);
                osc.start(now);
                osc.stop(now + 0.25);

                const click = ctx.createBufferSource();
                click.buffer = this._noiseBuffer(0.02);
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 1200;
                const envC = this._envGain(now, 0.05 * intensity, 0.001, 0.02);
                click.connect(hp);
                hp.connect(envC);
                envC.connect(bus);
                click.start(now);
                click.stop(now + 0.03);
            });
        } catch { /* ok */ }
    }

    _defend({ pitchBias = 1, intensity = 1 } = {}) {
        try {
            this.init();
            this.resume();
            if (!this._okToPlay()) return;

            this._withPoly(() => {
                const ctx = this.ctx;
                const now = ctx.currentTime;
                const bus = ctx.createGain();
                bus.gain.value = 0.95;
                bus.connect(this.masterGain);

                // "Shield up": rising shimmer.
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(520 * pitchBias, now);
                osc1.frequency.exponentialRampToValueAtTime(980 * pitchBias, now + 0.12);
                const env1 = this._envGain(now, 0.07 * intensity, 0.006, 0.22);
                osc1.connect(env1);
                env1.connect(bus);
                osc1.start(now);
                osc1.stop(now + 0.35);

                const osc2 = ctx.createOscillator();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(320 * pitchBias, now + 0.01);
                osc2.frequency.exponentialRampToValueAtTime(620 * pitchBias, now + 0.14);
                const env2 = this._envGain(now + 0.01, 0.045 * intensity, 0.01, 0.2);
                osc2.connect(env2);
                env2.connect(bus);
                osc2.start(now + 0.01);
                osc2.stop(now + 0.33);
            });
        } catch { /* ok */ }
    }

    _block({ intensity = 1 } = {}) {
        try {
            this.init();
            this.resume();
            if (!this._okToPlay()) return;

            this._withPoly(() => {
                const ctx = this.ctx;
                const now = ctx.currentTime;
                const bus = ctx.createGain();
                bus.gain.value = 0.9;
                bus.connect(this.masterGain);

                // "Clink": two high partials with fast decay.
                const mk = (freq, tOff, peak) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    const env = this._envGain(now + tOff, peak * intensity, 0.001, 0.08);
                    osc.connect(env);
                    env.connect(bus);
                    osc.start(now + tOff);
                    osc.stop(now + tOff + 0.16);
                };
                mk(1200, 0, 0.07);
                mk(820, 0.01, 0.06);
                mk(1560, 0.02, 0.035);
            });
        } catch { /* ok */ }
    }

    _heal({ intensity = 1 } = {}) {
        try {
            this.init();
            this.resume();
            if (!this._okToPlay()) return;

            this._withPoly(() => {
                const ctx = this.ctx;
                const now = ctx.currentTime;
                const bus = ctx.createGain();
                bus.gain.value = 0.9;
                bus.connect(this.masterGain);

                const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
                notes.forEach((f, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = f;
                    const start = now + i * 0.06;
                    const env = this._envGain(start, 0.05 * intensity, 0.01, 0.18);
                    osc.connect(env);
                    env.connect(bus);
                    osc.start(start);
                    osc.stop(start + 0.28);
                });
            });
        } catch { /* ok */ }
    }
}

