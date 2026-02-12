// iOS-safe Web Audio API wrapper
// Lazy init on first user gesture, ctx.resume() before every play

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicSource = null;
    this.initialized = false;
    this.muted = false;
    this.sounds = {};
  }

  init() {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.4;
    this.sfxGain.connect(this.masterGain);

    this.initialized = true;

    // iOS requires AudioContext resume on user gesture
    const resumeAudio = () => {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      document.removeEventListener('touchstart', resumeAudio);
      document.removeEventListener('touchend', resumeAudio);
      document.removeEventListener('click', resumeAudio);
    };
    document.addEventListener('touchstart', resumeAudio);
    document.addEventListener('touchend', resumeAudio);
    document.addEventListener('click', resumeAudio);

    // Preload sounds
    this.loadSound('shoot', 'sounds/shoot.mp3');
    this.loadSound('explode', 'sounds/explode.mp3');
    this.loadSound('hit', 'sounds/hit.mp3');
    this.loadSound('powerup', 'sounds/powerup.mp3');
    this.loadSound('death', 'sounds/death.mp3');
    this.loadSound('music', 'music/track.mp3');
  }

  async loadSound(name, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.sounds[name] = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      // Sound file not found — expected with placeholder files
    }
  }

  playSound(name) {
    if (!this.initialized || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.sounds[name]) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.sounds[name];
    source.connect(this.sfxGain);
    source.start(0);
  }

  startMusic() {
    if (!this.initialized) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.sounds['music']) {
      setTimeout(() => this.startMusic(), 500);
      return;
    }
    this.stopMusic();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.3;
    this.musicGain.connect(this.masterGain);
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.sounds['music'];
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start(0);
  }

  stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch (_) {}
      this.musicSource.disconnect();
      this.musicSource = null;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
  }

  pauseMusic() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resumeMusic() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    return this.muted;
  }
}
