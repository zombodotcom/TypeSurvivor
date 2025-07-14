// src/audio.js
// Modular audio system for background music, SFX, and death sounds

class AudioSystem {
  constructor() {
    // State
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.deathSoundsEnabled = true;
    this.musicVolume = 0.2;
    this.sfxVolume = 0.2;
    this.deathVolume = 0.2;
    this.music = null;
    this.currentMusicTrack = null;
    this.musicList = [];
    this.sfxList = [];
    this.deathList = [];
    this.musicIndex = 0;
    this.musicLoaded = false;
    this.keepMusicOnPause = true;
    this.testDeathAudio = null;
    this.isMuted = false;
    this._prevVolumes = { music: 0.2, sfx: 0.2, death: 0.2 };
    // Restore settings from localStorage
    this._loadSettings();
    // Preload lists
    this.loadLists();
  }

  _saveSettings() {
    const settings = {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      deathSoundsEnabled: this.deathSoundsEnabled,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      deathVolume: this.deathVolume,
      keepMusicOnPause: this.keepMusicOnPause,
      isMuted: this.isMuted
    };
    localStorage.setItem('audioSettings', JSON.stringify(settings));
  }

  _loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('audioSettings'));
      if (!settings) return;
      this.musicEnabled = settings.musicEnabled ?? this.musicEnabled;
      this.sfxEnabled = settings.sfxEnabled ?? this.sfxEnabled;
      this.deathSoundsEnabled = settings.deathSoundsEnabled ?? this.deathSoundsEnabled;
      this.musicVolume = settings.musicVolume ?? this.musicVolume;
      this.sfxVolume = settings.sfxVolume ?? this.sfxVolume;
      this.deathVolume = settings.deathVolume ?? this.deathVolume;
      this.keepMusicOnPause = settings.keepMusicOnPause ?? this.keepMusicOnPause;
      this.isMuted = settings.isMuted ?? this.isMuted;
    } catch (e) {}
  }

  async loadLists() {
    try {
      const musicRes = await fetch('/sounds/background/list.json');
      this.musicList = await musicRes.json();
    } catch (e) {
      this.musicList = [];
    }
    try {
      const deathRes = await fetch('/sounds/enemy-death/list.json');
      this.deathList = await deathRes.json();
    } catch (e) {
      this.deathList = [];
    }
    // SFX: all files in enemy-death/ except those in deathList
    this.sfxList = this.deathList.filter(f => !f.toLowerCase().includes('death') && !f.toLowerCase().includes('game over'));
    this.musicLoaded = true;
  }

  // --- Music ---
  playMusic(track = null) {
    if (!this.musicEnabled || !this.musicLoaded) return;
    if (this.music) {
      this.music.pause();
      this.music = null;
    }
    if (!track) {
      if (!this.musicList.length) return;
      track = this.musicList[this.musicIndex % this.musicList.length];
      this.musicIndex++;
    }
    this.currentMusicTrack = track;
    this.music = new Audio(`/sounds/background/${track}`);
    this.music.loop = true;
    this.music.volume = this._sliderToGain(this.musicVolume);
    this.music.play();
  }
  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music = null;
    }
  }
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this._saveSettings();
    if (!enabled) this.stopMusic();
    else this.playMusic(this.currentMusicTrack);
  }
  // Logarithmic mapping for perceived loudness
  _sliderToGain(slider) {
    return Math.pow(slider, 2);
  }
  setMusicVolume(vol) {
    this.musicVolume = vol;
    this._saveSettings();
    if (this.music) this.music.volume = this._sliderToGain(vol);
  }
  setSFXVolume(vol) {
    this.sfxVolume = vol;
    this._saveSettings();
  }
  setDeathVolume(vol) {
    this.deathVolume = vol;
    this._saveSettings();
  }
  setKeepMusicOnPause(enabled) {
    this.keepMusicOnPause = enabled;
    this._saveSettings();
  }
  getMusicList() {
    return this.musicList;
  }
  selectMusic(track) {
    if (!track || !this.musicList.includes(track)) return;
    this.playMusic(track);
  }

  // --- SFX ---
  playSFX(file = null) {
    if (!this.sfxEnabled) return;
    let sfxFile = file;
    if (!sfxFile) {
      if (!this.sfxList.length) return;
      const idx = Math.floor(Math.random() * this.sfxList.length);
      sfxFile = this.sfxList[idx];
    }
    const audio = new Audio(`/sounds/enemy-death/${sfxFile}`);
    audio.volume = this.sfxVolume;
    audio.play();
  }
  setSFXEnabled(enabled) {
    this.sfxEnabled = enabled;
    this._saveSettings();
  }

  // --- Death Sounds ---
  playDeathSound(file = null) {
    // Clear, unmodified death sound for all enemies
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    let deathFile = file;
    if (!deathFile) {
      const idx = Math.floor(Math.random() * this.deathList.length);
      deathFile = this.deathList[idx];
    }
    const audio = new Audio(`/sounds/enemy-death/${deathFile}`);
    audio.volume = this._sliderToGain(this.deathVolume);
    audio.play();
  }

  playDeathSoundTier2(file = null) {
    // Subtle echo and slight pitch drop for tier 2 impact
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    let deathFile = file;
    if (!deathFile) {
      const idx = Math.floor(Math.random() * this.deathList.length);
      deathFile = this.deathList[idx];
    }
    this._playDeathSoundWithEcho(deathFile, 0.15, 0.3, 0.93); // 150ms delay, 30% echo volume, 0.93x rate
  }

  playDeathSoundTier3(file = null) {
    // Old-style boss death: main hit (0.7x pitch, 1.5x vol), 3 echoes, and a thud
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    let deathFile = file;
    if (!deathFile) {
      const idx = Math.floor(Math.random() * this.deathList.length);
      deathFile = this.deathList[idx];
    }
    const src = `/sounds/enemy-death/${deathFile}`;
    // Main hit
    const main = new Audio(src);
    main.volume = Math.min(1, this._sliderToGain(this.deathVolume) * 1.5);
    main.playbackRate = 0.7;
    main.play();
    // Echoes
    const echo = (delay, vol) => {
      const e = new Audio(src);
      e.volume = this._sliderToGain(this.deathVolume) * vol;
      e.playbackRate = 0.7;
      setTimeout(() => e.play(), delay);
    };
    echo(100, 0.6);
    echo(200, 0.4);
    echo(300, 0.2);
    // Thud
    setTimeout(() => {
      const thud = new Audio(src);
      thud.volume = this._sliderToGain(this.deathVolume) * 0.3;
      thud.playbackRate = 0.5;
      thud.play();
    }, 50);
  }

  _playDeathSoundWithEcho(file, delaySeconds, echoVolume, rate = 1.0) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    fetch(`/sounds/enemy-death/${file}`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        // Main hit
        const source1 = audioCtx.createBufferSource();
        source1.buffer = audioBuffer;
        source1.playbackRate.value = rate;
        const gain1 = audioCtx.createGain();
        gain1.gain.value = this._sliderToGain(this.deathVolume);
        source1.connect(gain1);
        gain1.connect(audioCtx.destination);
        source1.start();

        // Echo
        const source2 = audioCtx.createBufferSource();
        source2.buffer = audioBuffer;
        source2.playbackRate.value = rate;
        const gain2 = audioCtx.createGain();
        gain2.gain.value = this._sliderToGain(this.deathVolume) * echoVolume;
        source2.connect(gain2);
        gain2.connect(audioCtx.destination);
        source2.start(audioCtx.currentTime + delaySeconds);

        // Clean up
        source1.onended = () => {
          if (audioCtx.state !== 'closed') audioCtx.close();
        };
        source2.onended = () => {
          if (audioCtx.state !== 'closed') audioCtx.close();
        };
      })
      .catch(error => {
        console.error('Error playing death sound with echo:', error);
        // Fallback to regular play
        this.playDeathSound(file);
      });
  }

  playTestDeathSound() {
    if (this.testDeathAudio) {
      this.testDeathAudio.pause();
      this.testDeathAudio = null;
    }
    if (!this.deathList.length) return;
    const idx = Math.floor(Math.random() * this.deathList.length);
    const file = this.deathList[idx];
    const audio = new Audio(`/sounds/enemy-death/${file}`);
    audio.volume = this._sliderToGain(this.deathVolume);
    audio.play();
    this.testDeathAudio = audio;
  }

  async playLayeredDeathSound({ rate = 0.7, baseVolume = 1.5, layers = [
    { delay: 0, volume: 1.5 },
    { delay: 0.10, volume: 0.7 },
    { delay: 0.20, volume: 0.4 },
    { delay: 0.30, volume: 0.2 }
  ] } = {}) {
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    const idx = Math.floor(Math.random() * this.deathList.length);
    const file = this.deathList[idx];
    const url = `/sounds/enemy-death/${file}`;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    for (const layer of layers) {
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = rate;
      const gain = audioCtx.createGain();
      gain.gain.value = this._sliderToGain(this.deathVolume) * baseVolume * layer.volume;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(audioCtx.currentTime + layer.delay);
      source.onended = () => audioCtx.close();
    }
  }

  async playDeathSoundWithEffects({ rate = 0.93, gainBoost = 1.08, fadeMs = 250, reverbDuration = 0.12, reverbDecay = 1.2 } = {}) {
    // Subtle pitch drop and short reverb for tier 2
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    const idx = Math.floor(Math.random() * this.deathList.length);
    const file = this.deathList[idx];
    const url = `/sounds/enemy-death/${file}`;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = rate;
    const gain = audioCtx.createGain();
    gain.gain.value = this._sliderToGain(this.deathVolume) * gainBoost;
    const convolver = audioCtx.createConvolver();
    convolver.buffer = this._createImpulseResponse(audioCtx, reverbDuration, reverbDecay);
    source.connect(gain);
    gain.connect(convolver);
    convolver.connect(audioCtx.destination);
    gain.gain.setValueAtTime(gain.gain.value, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + fadeMs / 1000);
    source.start();
    source.onended = () => audioCtx.close();
  }
  _createImpulseResponse(ctx, duration, decay) {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return impulse;
  }

  muteAll() {
    if (this.isMuted) return;
    this._prevVolumes = {
      music: this.musicVolume,
      sfx: this.sfxVolume,
      death: this.deathVolume
    };
    this.setMusicVolume(0);
    this.setSFXVolume(0);
    this.setDeathVolume(0);
    this.isMuted = true;
    this._saveSettings();
  }
  unmuteAll() {
    if (!this.isMuted) return;
    this.setMusicVolume(this._prevVolumes.music);
    this.setSFXVolume(this._prevVolumes.sfx);
    this.setDeathVolume(this._prevVolumes.death);
    this.isMuted = false;
    this._saveSettings();
  }

  async playDeathSoundWithEcho({ rate = 0.9, gainBoost = 1.12, echoDelay = 80, echoVolume = 0.2 } = {}) {
    // Slightly stronger effect for tier 3 (boss): pitch, echo, short reverb
    if (!this.deathSoundsEnabled || !this.deathList.length) return;
    const idx = Math.floor(Math.random() * this.deathList.length);
    const file = this.deathList[idx];
    const url = `/sounds/enemy-death/${file}`;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(arrayBuffer);
    // First play (main hit)
    const play = (vol, delay, reverb = false) => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = rate;
      const gain = audioCtx.createGain();
      gain.gain.value = this._sliderToGain(this.deathVolume) * gainBoost * vol;
      if (reverb) {
        const convolver = audioCtx.createConvolver();
        convolver.buffer = this._createImpulseResponse(audioCtx, 0.15, 1.3);
        source.connect(gain);
        gain.connect(convolver);
        convolver.connect(audioCtx.destination);
      } else {
        source.connect(gain);
        gain.connect(audioCtx.destination);
      }
      source.start(audioCtx.currentTime + delay);
      source.onended = () => audioCtx.close();
    };
    play(1, 0, true); // Main hit with reverb
    play(echoVolume, echoDelay / 1000, false); // Echo, no reverb
  }
}

const audioSystem = new AudioSystem();
export default audioSystem; 