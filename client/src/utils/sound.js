/**
 * Plays a pleasant modern 2-tone notification chime using Web Audio API
 */
export const playCallChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);

    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);

    // Tone 2: 880 Hz (A5) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    gain2.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (err) {
    console.warn('Audio playback not permitted or unavailable:', err);
  }
};
