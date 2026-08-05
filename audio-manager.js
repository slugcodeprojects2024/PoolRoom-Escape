// audio-manager.js — playlist music, one-shot SFX, positional ambience
//
// Every file is optional. Anything that fails to load becomes a silent buffer,
// so the game runs identically with an empty audio folder and gets louder as
// you fill it in. Nothing here throws on a missing file.
import * as THREE from 'three';
import { AUDIO_MANIFEST, AUDIO_SETTINGS } from './audio-manifest.js';

// Module-scope scratch so updateListener allocates nothing per frame
const _fwd = new THREE.Vector3();

export class AudioManager {
    constructor(settings = {}) {
        this.settings = { ...AUDIO_SETTINGS, ...settings };
        this.ctx = null;
        this.buffers = new Map();
        this.ready = false;
        this.enabled = true;

        this.musicOrder = [];
        this.musicIndex = 0;
        this.currentTrack = null;
        this.trackTimer = null;
        this.inChaseMode = false;
        this.loops = new Map();
    }

    // Must be called from a user gesture — browsers refuse to start an
    // AudioContext otherwise. The start overlay's click is the right place.
    async init() {
        if (this.ctx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { this.enabled = false; return; }

        this.ctx = new Ctx();
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        this.master = this.ctx.createGain();
        this.master.gain.value = this.settings.masterVolume;
        this.master.connect(this.ctx.destination);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.settings.musicVolume;
        this.musicBus.connect(this.master);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = this.settings.sfxVolume;
        this.sfxBus.connect(this.master);

        this.silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);

        await this.preload();
        this.ready = true;
    }

    async preload() {
        const paths = new Set();
        const collect = (v) => {
            if (!v) return;
            if (typeof v === 'string') paths.add(v);
            else if (Array.isArray(v)) v.forEach(collect);
            else if (v.file) paths.add(v.file);
            else Object.values(v).forEach(collect);
        };
        collect(AUDIO_MANIFEST.music);
        collect(AUDIO_MANIFEST.chase);
        collect(AUDIO_MANIFEST.sfx);
        collect(AUDIO_MANIFEST.ambience);

        await Promise.all([...paths].map(p => this.load(p)));

        const loaded = [...this.buffers.values()].filter(b => b !== this.silent).length;
        console.log(`🔊 audio: ${loaded}/${paths.size} files loaded`);
    }

    async load(path) {
        if (this.buffers.has(path)) return this.buffers.get(path);
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(res.status);
            const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
            this.buffers.set(path, buf);
            return buf;
        } catch (e) {
            // Missing or undecodable: register silence and carry on
            this.buffers.set(path, this.silent);
            return this.silent;
        }
    }

    get(entry) {
        if (!entry) return this.silent;
        if (Array.isArray(entry)) entry = entry[Math.floor(Math.random() * entry.length)];
        return this.buffers.get(entry) || this.silent;
    }

    // ---- one-shots -------------------------------------------------------

    // play('footstep', { volume: 0.6, rate: 0.95 })
    // Small random pitch variation is what stops repeated sounds — footsteps
    // above all — from reading as a loop.
    play(name, opts = {}) {
        if (!this.ready || !this.enabled) return null;
        const buffer = this.get(AUDIO_MANIFEST.sfx[name]);
        if (buffer === this.silent) return null;

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;

        const jitter = opts.pitchJitter !== undefined ? opts.pitchJitter : 0.08;
        src.playbackRate.value = (opts.rate || 1) * (1 + (Math.random() * 2 - 1) * jitter);

        const gain = this.ctx.createGain();
        gain.gain.value = opts.volume !== undefined ? opts.volume : 1;

        if (opts.position) {
            const panner = this.ctx.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = opts.refDistance || 60;
            panner.maxDistance = opts.maxDistance || 2000;
            panner.positionX.value = opts.position.x;
            panner.positionY.value = opts.position.y;
            panner.positionZ.value = opts.position.z;
            src.connect(gain).connect(panner).connect(this.sfxBus);
        } else {
            src.connect(gain).connect(this.sfxBus);
        }

        src.start();
        return src;
    }

    // ---- music playlist --------------------------------------------------

    startMusic() {
        if (!this.ready || !this.enabled) return;
        const tracks = AUDIO_MANIFEST.music.filter(p => this.get(p) !== this.silent);
        if (tracks.length === 0) return;

        this.musicOrder = tracks.slice();
        if (this.settings.shuffleMusic) {
            for (let i = this.musicOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.musicOrder[i], this.musicOrder[j]] = [this.musicOrder[j], this.musicOrder[i]];
            }
        }
        this.musicIndex = 0;
        this.playNextTrack();
    }

    playNextTrack() {
        if (this.inChaseMode || this.musicOrder.length === 0) return;

        const path = this.musicOrder[this.musicIndex % this.musicOrder.length];
        this.musicIndex++;
        const buffer = this.get(path);
        const fade = this.settings.trackFadeSeconds;

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        src.connect(gain).connect(this.musicBus);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(1, now + fade);

        // Schedule the fade-out to land exactly at the end of the buffer
        const outAt = Math.max(fade, buffer.duration - fade);
        gain.gain.setValueAtTime(1, now + outAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + buffer.duration);

        src.start(now);
        this.currentTrack = { src, gain };

        const nextIn = (buffer.duration + this.settings.gapBetweenTracks) * 1000;
        clearTimeout(this.trackTimer);
        this.trackTimer = setTimeout(() => this.playNextTrack(), nextIn);
    }

    // Call when the eye reveals itself. Crossfades out of the playlist and
    // loops the chase track until stopped.
    startChase() {
        if (!this.ready || this.inChaseMode) return;
        this.inChaseMode = true;
        clearTimeout(this.trackTimer);

        const fade = this.settings.chaseFadeSeconds;
        this.fadeOutTrack(this.currentTrack, fade);
        this.currentTrack = null;

        const buffer = this.get(AUDIO_MANIFEST.chase);
        if (buffer === this.silent) return;

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        // Explicit loop points. Set these if your track has a lead-in that
        // shouldn't repeat — src.loopStart = 4.0 to skip the first 4 seconds.
        src.loopStart = 0;
        src.loopEnd = buffer.duration;

        const gain = this.ctx.createGain();
        src.connect(gain).connect(this.musicBus);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(1, now + fade);
        src.start(now);

        this.chaseTrack = { src, gain };
    }

    stopChase(fadeSeconds = 2) {
        this.inChaseMode = false;
        this.fadeOutTrack(this.chaseTrack, fadeSeconds);
        this.chaseTrack = null;
    }

    fadeOutTrack(track, seconds) {
        if (!track) return;
        const now = this.ctx.currentTime;
        try {
            track.gain.gain.cancelScheduledValues(now);
            track.gain.gain.setValueAtTime(Math.max(0.0001, track.gain.gain.value), now);
            track.gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
            track.src.stop(now + seconds + 0.05);
        } catch (e) { /* already stopped */ }
    }

    // ---- looping positional ambience -------------------------------------

    startAmbience(name) {
        if (!this.ready || this.loops.has(name)) return;
        const def = AUDIO_MANIFEST.ambience[name];
        if (!def) return;
        const buffer = this.get(def.file);
        if (buffer === this.silent) return;

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = def.volume !== undefined ? def.volume : 1;

        const panner = this.ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = def.refDistance || 100;
        panner.maxDistance = 3000;
        const p = def.position || [0, 0, 0];
        panner.positionX.value = p[0];
        panner.positionY.value = p[1];
        panner.positionZ.value = p[2];

        src.connect(gain).connect(panner).connect(this.master);
        src.start();
        this.loops.set(name, { src, gain, panner });
    }

    startAllAmbience() {
        Object.keys(AUDIO_MANIFEST.ambience).forEach(n => this.startAmbience(n));
    }

    // ---- listener --------------------------------------------------------

    // Call each frame with the camera so positional audio tracks the player.
    updateListener(camera) {
        if (!this.ready) return;
        const l = this.ctx.listener;
        const p = camera.position;

        if (l.positionX) {
            l.positionX.value = p.x;
            l.positionY.value = p.y;
            l.positionZ.value = p.z;
        } else {
            l.setPosition(p.x, p.y, p.z);   // deprecated path, Safari
        }

        camera.getWorldDirection(_fwd);
        if (l.forwardX) {
            l.forwardX.value = _fwd.x;
            l.forwardY.value = _fwd.y;
            l.forwardZ.value = _fwd.z;
            l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
        } else {
            l.setOrientation(_fwd.x, _fwd.y, _fwd.z, 0, 1, 0);
        }
    }

    // ---- footsteps -------------------------------------------------------

    // Distance-based rather than timer-based, so steps stay in sync with
    // actual movement whether walking, sprinting, or being slowed by water.
    updateFootsteps(position, isMoving, onGround, inWater, strideLength = 34) {
        if (!this.ready) return;
        if (!this._lastStepPos) { this._lastStepPos = position.clone(); return; }

        if (!isMoving || !onGround) {
            this._lastStepPos.copy(position);
            return;
        }
        const dx = position.x - this._lastStepPos.x;
        const dz = position.z - this._lastStepPos.z;
        if (dx * dx + dz * dz >= strideLength * strideLength) {
            this.play(inWater ? 'footstep_water' : 'footstep', { volume: 0.5 });
            this._lastStepPos.copy(position);
        }
    }

    // ---- volume ----------------------------------------------------------

    setMasterVolume(v) { if (this.master) this.master.gain.value = v; }
    setMusicVolume(v)  { if (this.musicBus) this.musicBus.gain.value = v; }
    setSfxVolume(v)    { if (this.sfxBus) this.sfxBus.gain.value = v; }

    setEnabled(on) {
        this.enabled = on;
        if (this.master) this.master.gain.value = on ? this.settings.masterVolume : 0;
    }
}