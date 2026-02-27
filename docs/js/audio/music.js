/**
 * Procedural music engine using Web Audio API.
 *
 * Generates soft, ambient background music for battle and short jingles for
 * victory / defeat settlement screens.  Everything is synthesised at runtime
 * – no audio files required.
 *
 * Musical palette:
 *   - Pentatonic scale (C D E G A) for a universally pleasant, natural feel.
 *   - Sine + triangle oscillators for warmth.
 *   - Heavy low-pass filtering and long envelopes for softness.
 *   - Algorithmic reverb (convolution with a generated impulse response).
 */

/* ---- Frequency table (Hz) ---- */
const F = {
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, G3: 196.00, A3: 220.00,
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50,
};

export class MusicManager {
    constructor() {
        this.ctx        = null;
        this.masterGain = null;
        this.reverb     = null;
        this.reverbSend = null;
        this.volume     = 0.45;
        this.muted      = false;

        this._trackGain  = null;
        this._timers     = [];
        this._gen        = 0;
        this.currentTrack = null;
    }

    /* ======== Lifecycle ======== */

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);

        this.reverb     = this._createReverb(2.8, 2.2);
        this.reverbSend = this.ctx.createGain();
        this.reverbSend.gain.value = 0.35;
        this.reverb.connect(this.reverbSend);
        this.reverbSend.connect(this.masterGain);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.muted ? 0 : this.volume, this.ctx.currentTime, 0.08,
            );
        }
        return this.muted;
    }

    /* ======== Track switching ======== */

    /** Fade out the current track and prepare a fresh bus for the next one. */
    _switchTrack(name, fadeOut = 0.8) {
        this._gen++;
        const gen = this._gen;
        this._clearTimers();

        if (this._trackGain) {
            const old = this._trackGain;
            const now = this.ctx.currentTime;
            old.gain.setTargetAtTime(0, now, fadeOut / 4);
            setTimeout(() => { try { old.disconnect(); } catch { /* ok */ } }, fadeOut * 1200);
        }

        const bus = this.ctx.createGain();
        bus.gain.value = 0;
        bus.connect(this.masterGain);
        bus.connect(this.reverb);
        this._trackGain = bus;
        this.currentTrack = name;
        return gen;
    }

    _isActive(gen) { return this._gen === gen; }

    _clearTimers() {
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
    }

    _timer(fn, ms) {
        const id = setTimeout(fn, ms);
        this._timers.push(id);
        return id;
    }

    stopAll(fadeOut = 1.0) {
        if (!this.ctx) return;
        this._switchTrack(null, fadeOut);
        this.currentTrack = null;
    }

    /* ======== Tone primitive ======== */

    /**
     * Schedule a single synthesised tone routed through the current track bus.
     * All times are AudioContext‑relative.
     */
    _tone(bus, {
        freq, type = 'sine', start, dur,
        peak = 0.05, attack = 0.1, release = 0.3,
        filterFreq = 800, filterQ = 0.7,
        detune = 0, vibRate = 0, vibDepth = 0,
    }) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const flt = ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;

        flt.type  = 'lowpass';
        flt.frequency.value = filterFreq;
        flt.Q.value = filterQ;

        env.gain.value = 0;
        env.gain.setTargetAtTime(peak, start, attack);
        if (dur) {
            const relAt = start + Math.max(0, dur - release);
            env.gain.setTargetAtTime(0, relAt, release / 3);
        }

        if (vibRate > 0) {
            const lfo  = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.frequency.value = vibRate;
            lfoG.gain.value = vibDepth;
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lfo.start(start);
            if (dur) lfo.stop(start + dur + 1);
        }

        osc.connect(flt);
        flt.connect(env);
        env.connect(bus);

        osc.start(start);
        if (dur) osc.stop(start + dur + 0.5);

        return { osc, env };
    }

    /* ======== Reverb ======== */

    _createReverb(seconds, decay) {
        const len  = this.ctx.sampleRate * seconds;
        const buf  = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        const conv = this.ctx.createConvolver();
        conv.buffer = buf;
        return conv;
    }

    /* ================================================================
     *  BATTLE BGM
     *  ─ gentle pad drone  ─ pentatonic arpeggio  ─ occasional bells
     * ================================================================ */

    playBattleBGM() {
        this.init();
        this.resume();
        if (this.currentTrack === 'battle') return;

        const gen = this._switchTrack('battle', 0.8);
        const bus = this._trackGain;

        this._timer(() => {
            if (!this._isActive(gen)) return;
            bus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.6);
            this._battlePad(bus, gen);
            this._battleArpeggio(bus, gen);
            this._battleBells(bus, gen);
        }, 700);
    }

    _battlePad(bus, gen) {
        const now = this.ctx.currentTime;
        [
            { freq: F.C3, detune:  0 },
            { freq: F.E3, detune:  3 },
            { freq: F.G3, detune: -2 },
        ].forEach(v => {
            this._tone(bus, {
                freq: v.freq, type: 'sine', start: now,
                peak: 0.045, attack: 3.5, filterFreq: 280, filterQ: 0.4,
                detune: v.detune, vibRate: 0.1, vibDepth: 2.5,
            });
        });
    }

    _battleArpeggio(bus, gen) {
        const phrases = [
            [F.C4, F.E4, F.G4, F.A4],
            [F.G4, F.E4, F.D4, F.C4],
            [F.D4, F.G4, F.A4, F.C5],
            [F.A4, F.G4, F.E4, F.D4],
        ];
        const bpm       = 64;
        const beatMs    = (60 / bpm) * 1000;
        const noteDur   = 60 / bpm * 1.3;
        let pi = 0, ni = 0;

        const tick = () => {
            if (!this._isActive(gen)) return;

            const freq = phrases[pi % phrases.length][ni];
            this._tone(bus, {
                freq, type: 'triangle', start: this.ctx.currentTime,
                dur: noteDur, peak: 0.032, attack: 0.07,
                release: noteDur * 0.45, filterFreq: 850, filterQ: 0.5,
                vibRate: 4.2, vibDepth: 1.8,
            });

            ni++;
            if (ni >= phrases[pi % phrases.length].length) { ni = 0; pi++; }

            const jitter = (Math.random() - 0.5) * 40;
            this._timer(tick, beatMs + jitter);
        };

        this._timer(tick, 2200);
    }

    _battleBells(bus, gen) {
        const pool = [F.C5, F.E5, F.G5, F.A5];

        const ring = () => {
            if (!this._isActive(gen)) return;

            const freq = pool[Math.floor(Math.random() * pool.length)];
            this._tone(bus, {
                freq, type: 'sine', start: this.ctx.currentTime,
                dur: 2.2, peak: 0.013, attack: 0.01,
                release: 1.6, filterFreq: 1400, filterQ: 0.3,
            });

            this._timer(ring, 3500 + Math.random() * 3500);
        };

        this._timer(ring, 4500);
    }

    /* ================================================================
     *  VICTORY JINGLE
     *  ─ ascending pentatonic melody  ─ warm C‑major pad  ─ sparkle
     * ================================================================ */

    playVictoryMusic() {
        this.init();
        this.resume();

        const gen = this._switchTrack('victory', 0.35);
        const bus = this._trackGain;

        this._timer(() => {
            if (!this._isActive(gen)) return;
            bus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.15);
            const now = this.ctx.currentTime;

            [F.C3, F.E3, F.G3].forEach(freq => {
                this._tone(bus, {
                    freq, type: 'sine', start: now,
                    dur: 4.5, peak: 0.05, attack: 0.8,
                    release: 2.2, filterFreq: 380,
                    vibRate: 0.18, vibDepth: 2,
                });
            });

            [
                { freq: F.C4, t: 0.00 },
                { freq: F.E4, t: 0.22 },
                { freq: F.G4, t: 0.44 },
                { freq: F.C5, t: 0.76 },
                { freq: F.E5, t: 1.10 },
            ].forEach(({ freq, t }) => {
                this._tone(bus, {
                    freq, type: 'triangle', start: now + t,
                    dur: 1.3, peak: 0.06, attack: 0.02,
                    release: 0.9, filterFreq: 1200, filterQ: 0.4,
                    vibRate: 4.8, vibDepth: 2.5,
                });
            });

            [F.G5, F.A5, F.C6].forEach((freq, i) => {
                this._tone(bus, {
                    freq, type: 'sine', start: now + 1.4 + i * 0.14,
                    dur: 1.8, peak: 0.018, attack: 0.01,
                    release: 1.2, filterFreq: 1800,
                });
            });

            this._timer(() => { this.currentTrack = null; }, 5500);
        }, 400);
    }

    /* ================================================================
     *  DEFEAT JINGLE
     *  ─ descending melody  ─ C‑minor pad  ─ muted, contemplative
     * ================================================================ */

    playDefeatMusic() {
        this.init();
        this.resume();

        const gen = this._switchTrack('defeat', 0.35);
        const bus = this._trackGain;

        this._timer(() => {
            if (!this._isActive(gen)) return;
            bus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.15);
            const now = this.ctx.currentTime;

            [F.C3, F.Eb3, F.G3].forEach(freq => {
                this._tone(bus, {
                    freq, type: 'sine', start: now,
                    dur: 5.0, peak: 0.04, attack: 1.2,
                    release: 2.5, filterFreq: 260,
                    vibRate: 0.12, vibDepth: 2,
                });
            });

            [
                { freq: F.A4, t: 0.00 },
                { freq: F.G4, t: 0.32 },
                { freq: F.E4, t: 0.64 },
                { freq: F.D4, t: 1.00 },
                { freq: F.C4, t: 1.45 },
            ].forEach(({ freq, t }) => {
                this._tone(bus, {
                    freq, type: 'triangle', start: now + t,
                    dur: 1.5, peak: 0.042, attack: 0.04,
                    release: 1.0, filterFreq: 750, filterQ: 0.5,
                    vibRate: 4.5, vibDepth: 3.5,
                });
            });

            this._timer(() => { this.currentTrack = null; }, 6000);
        }, 400);
    }
}
