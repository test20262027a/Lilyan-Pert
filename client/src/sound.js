/*
 * Notification sounds are synthesised in the browser, so there is no audio
 * asset to 404 and no "played" state we cannot verify. The chosen key lives in
 * business.notification_settings.sound_key and is validated on the server.
 */
export const SOUND_OPTIONS = ['classic', 'double', 'soft', 'alert'];
export const DEFAULT_SOUND = 'classic';

const TONES = {
  classic: [{ f: 880, at: 0, len: 0.5, gain: 0.16 }],
  double: [
    { f: 988, at: 0, len: 0.22 },
    { f: 1319, at: 0.24, len: 0.34 },
  ],
  soft: [{ f: 660, at: 0, len: 0.55, gain: 0.13, type: 'triangle' }],
  alert: [
    { f: 1175, at: 0, len: 0.14 },
    { f: 880, at: 0.16, len: 0.14 },
    { f: 1175, at: 0.32, len: 0.24 },
  ],
};

/** Plays one of the supported sounds. Returns false when audio is unavailable. */
export function playSound(key) {
  const notes = TONES[key] || TONES[DEFAULT_SOUND];
  const Ctx =
    typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  if (!Ctx) return false;
  try {
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume?.();
    const now = ctx.currentTime;
    let end = 0;
    for (const note of notes) {
      const len = note.len ?? 0.4;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + note.at;
      const stop = start + len;
      osc.type = note.type || 'sine';
      osc.frequency.value = note.f;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.gain ?? 0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(stop + 0.02);
      end = Math.max(end, note.at + len);
    }
    setTimeout(() => ctx.close?.(), (end + 0.4) * 1000);
    return true;
  } catch {
    return false;
  }
}
