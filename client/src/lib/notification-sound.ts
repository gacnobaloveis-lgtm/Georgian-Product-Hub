export function playMessageSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    function note(freq: number, start: number, duration: number, vol = 0.28) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    }

    // Facebook Messenger style: quick D5 → A5
    note(587.33, 0, 0.18);      // D5
    note(880.0,  0.16, 0.28);   // A5

  } catch {
    // ignore — browser may block AudioContext before user interaction
  }
}
