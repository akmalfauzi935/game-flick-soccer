/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple lightweight synthesizer using Web Audio API to generate high quality retro audio effects.
class AudioSynth {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialize when user interacts
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // resume context if suspended (browser security blocks autoplay)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (enabled) {
      this.initContext();
    }
  }

  public getSoundEnabled() {
    return this.soundEnabled;
  }

  // Ref whistle: High pitch detuned dual-tone with vibrato
  public playWhistle() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // We create two oscillators slightly detuned to create the "whistle trill"
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1030, now);
    osc2.frequency.exponentialRampToValueAtTime(1230, now + 0.1);

    // Detune modulation (vibrato)
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modulator.frequency.setValueAtTime(45, now); // Vibrato speed
    modGain.gain.setValueAtTime(30, now); // Detune depth

    modulator.connect(modGain);
    modGain.connect(osc1.frequency);
    modGain.connect(osc2.frequency);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.setValueAtTime(0.2, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    modulator.start(now);
    osc1.start(now);
    osc2.start(now);

    modulator.stop(now + 0.5);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  // Ball kicking: low frequencies rapidly sweeping down
  public playKick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Swoosh on swipe: lowpass filtered noise sweep
  public playSwoosh() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // populate buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.25);
  }

  // Goal celebration: a crowd roar noise + a beautiful chord rise
  public playGoal() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.8;

    // 1. Crowd roar (white noise with bandpass filtering and panning)
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const crowd = this.ctx.createBufferSource();
    crowd.buffer = buffer;

    const crowdFilter = this.ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.setValueAtTime(350, now);
    crowdFilter.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    crowdFilter.Q.setValueAtTime(1.5, now);

    const crowdGain = this.ctx.createGain();
    crowdGain.gain.setValueAtTime(0, now);
    crowdGain.gain.linearRampToValueAtTime(0.5, now + 0.15);
    crowdGain.gain.linearRampToValueAtTime(0.4, now + 0.6);
    crowdGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    crowd.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(this.ctx.destination);
    crowd.start(now);
    crowd.stop(now + duration);

    // 2. Victory Arpeggio (happy soccer chord: C4, E4, G4, C5)
    _playBeep(this.ctx, 261.63, 0.3, 0.1, now);     // C4
    _playBeep(this.ctx, 329.63, 0.3, 0.1, now + 0.1); // E4
    _playBeep(this.ctx, 392.00, 0.3, 0.1, now + 0.2); // G4
    _playBeep(this.ctx, 523.25, 0.6, 0.15, now + 0.3); // C5
    _playBeep(this.ctx, 659.25, 0.8, 0.2, now + 0.5); // E5 (stinger!)
  }

  // Goalkeeper blocks the ball
  public playSave() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Miss / Out of bounds sound
  public playMiss() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // Coin collected
  public playCoin() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Standard high-pitched retro coin sound
    _playBeep(this.ctx, 987.77, 0.08, 0.08, now, 'sine'); // B5
    _playBeep(this.ctx, 1318.51, 0.25, 0.08, now + 0.06, 'sine'); // E6
  }

  // Game over buzzer
  public playGameOver() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.8);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(153, now);
    osc2.frequency.exponentialRampToValueAtTime(92, now + 0.8);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  }
}

// Private helper to play synth beeps
function _playBeep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number,
  time: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.02);
  gain.gain.setValueAtTime(volume, time + duration - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration);
}

const audioSynth = new AudioSynth();
export default audioSynth;
