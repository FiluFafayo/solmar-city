// All sound is synthesized with Web Audio: no audio files, no network.
// Engine hum, sirens, pickup blips and crash thuds.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.engineGain = null;
    this.siren = null;
    this.sirenGain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Engine: a low sawtooth whose pitch follows the speed.
      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engine.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engine.start();
      // Siren: two tones that alternate while the heat is on.
      this.siren = this.ctx.createOscillator();
      this.siren.type = 'triangle';
      this.siren.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.siren.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.siren.start();
      this.sirenPhase = 0;
    } catch {
      this.ctx = null;
    }
  }

  // Called every frame with the driving state.
  update(driving, speed, wanted) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (this.engineGain) {
      const target = driving ? 0.025 + Math.abs(speed) / 540 * 0.03 : 0;
      this.engineGain.gain.setTargetAtTime(target, t, 0.1);
      this.engine.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.22, t, 0.1);
    }
    if (this.sirenGain) {
      const target = wanted >= 2 ? 0.018 : 0;
      this.sirenGain.gain.setTargetAtTime(target, t, 0.2);
      this.sirenPhase = (this.sirenPhase + 1) % 40;
      this.siren.frequency.value = this.sirenPhase < 20 ? 700 : 950;
    }
  }

  blip(freq, seconds) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + seconds);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + seconds);
    } catch { /* sound is decoration; never break the game */ }
  }

  sirenBlip() {
    this.blip(950, 0.15);
    setTimeout(() => this.blip(700, 0.15), 160);
  }

  thud() {
    if (!this.ctx || this.muted) return;
    try {
      const len = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.25;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch { /* decoration */ }
  }

  fanfare() {
    this.blip(523, 0.12);
    setTimeout(() => this.blip(659, 0.12), 120);
    setTimeout(() => this.blip(784, 0.2), 240);
  }

  sting() {
    this.blip(220, 0.3);
    setTimeout(() => this.blip(165, 0.4), 200);
  }
}
