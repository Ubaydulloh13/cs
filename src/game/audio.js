export class GameAudio {
  constructor(volume = 0.45) {
    this.volume = volume;
    this.ctx = null;
  }
  unlock() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume().catch(() => {});
  }
  tone(freq, duration, volume = 0.2, type = "sine", end = 0) {
    if (!this.ctx || !this.volume) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (end)
      o.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    g.gain.setValueAtTime(volume * this.volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
  shot(weapon, local = true) {
    if (!this.ctx || !this.volume) return;
    const c = this.ctx,
      len = weapon === "awp" ? 0.28 : 0.13,
      buffer = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = weapon === "mp5" ? 2500 : 1800;
    gain.gain.setValueAtTime(
      (local ? 0.36 : 0.07) * this.volume,
      c.currentTime,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + len);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
    this.tone(
      weapon === "awp" ? 95 : 140,
      0.11,
      local ? 0.2 : 0.04,
      "triangle",
      40,
    );
  }
  hit() {
    this.tone(1100, 0.055, 0.11, "sine", 700);
  }
  reload() {
    this.tone(420, 0.09, 0.08, "square", 200);
  }
  step() {
    this.tone(80, 0.055, 0.07, "triangle", 30);
  }
  dispose() {
    this.ctx?.close().catch(() => {});
  }
}
