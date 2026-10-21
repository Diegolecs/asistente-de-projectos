/**
 * Native Web Audio API sound generator for UI accomplishments.
 * Produces a short, elegant, harmonic chime without external audio assets.
 */
class SoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a crisp, subtle, positive achievement chime (E5 -> G#5 -> B5 arpeggio with soft exponential decay).
   * Short, pleasant, non-intrusive.
   */
  playTaskCompletedChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 659.25, time: 0.0, dur: 0.18 }, // E5
        { freq: 830.61, time: 0.08, dur: 0.22 }, // G#5
        { freq: 987.77, time: 0.16, dur: 0.35 }, // B5
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Gentle attack and exponential decay to prevent clicks
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.12, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      // Audio might be blocked by browser policy prior to interaction; fail silently
    }
  }
}

export const soundEffects = new SoundService();
