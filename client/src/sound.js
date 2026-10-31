/*
 * Notification ringtones, synthesised in the browser so there is no audio file
 * to 404, no licence to track and no "played" state we cannot verify. The
 * chosen key lives in business.notification_settings.sound_key and the level in
 * notification_settings.sound_volume; both are validated on the server.
 *
 * Every tone is written as an explicit pattern of notes instead of one generic
 * beep: distinct pitches, waveforms and rhythms so the staff can tell them
 * apart across a busy room. Loudness is bought with gain staging, not raw
 * gain — each pattern's summed peaks stay inside a fixed budget, then one
 * compressor and one master stage (the user's volume) do the mastering, so a
 * louder setting stays clean instead of clipping.
 */
export const SOUND_OPTIONS = [
  'classic',
  'double',
  'triple',
  'digital',
  'fast',
  'loud',
  'bell',
  'phone',
  'alert',
  'modern',
  'custom',
  'power',
  'soft',
  'wave',
  'pulse',
];
export const DEFAULT_SOUND = 'classic';
export const DEFAULT_VOLUME = 85;

/*
 * One note: `f` hertz, `at`/`len` seconds, `v` peak gain and `w` waveform.
 * `bend` glides the voice to another frequency over its length (used by the
 * wave tone); `harm` adds a quieter octave partial so bells ring out.
 * Peaks are deliberately kept small — the compressor and master stage below
 * turn them into the finished, consistently loud ringtone.
 */
const RINGTONES = {
  /* One warm bell strike, the familiar default. */
  classic: [
    { f: 880, at: 0, len: 0.34, v: 0.30, w: 'triangle', harm: 0.4 },
    { f: 1320, at: 0.02, len: 0.28, v: 0.12, w: 'sine' },
  ],
  /* Two rising chimes: "new order" in two syllables. */
  double: [
    { f: 988, at: 0, len: 0.17, v: 0.30, w: 'triangle', harm: 0.35 },
    { f: 1319, at: 0.21, len: 0.30, v: 0.30, w: 'triangle', harm: 0.35 },
  ],
  /* Three quick rising chimes, brighter than the double. */
  triple: [
    { f: 1046, at: 0, len: 0.12, v: 0.26, w: 'triangle' },
    { f: 1318, at: 0.14, len: 0.12, v: 0.26, w: 'triangle' },
    { f: 1568, at: 0.28, len: 0.26, v: 0.28, w: 'triangle', harm: 0.4 },
  ],
  /* Clean square-wave data blips: short, unmistakably digital. */
  digital: [
    { f: 1568, at: 0, len: 0.06, v: 0.24, w: 'square' },
    { f: 1568, at: 0.09, len: 0.06, v: 0.24, w: 'square' },
    { f: 2093, at: 0.18, len: 0.14, v: 0.22, w: 'square' },
  ],
  /* Rapid four-note run for a busy counter. */
  fast: [
    { f: 1760, at: 0, len: 0.055, v: 0.24, w: 'square' },
    { f: 1318, at: 0.075, len: 0.055, v: 0.24, w: 'square' },
    { f: 1760, at: 0.15, len: 0.055, v: 0.24, w: 'square' },
    { f: 2093, at: 0.225, len: 0.11, v: 0.22, w: 'square' },
  ],
  /* High, hard-struck bell with a doubled voice: cuts through kitchen noise. */
  loud: [
    { f: 1046, at: 0, len: 0.24, v: 0.26, w: 'square', harm: 0.5 },
    { f: 1568, at: 0, len: 0.24, v: 0.20, w: 'triangle' },
    { f: 1568, at: 0.28, len: 0.30, v: 0.26, w: 'triangle', harm: 0.5 },
  ],
  /* Long tolling bell that rings out and decays slowly. */
  bell: [
    { f: 659, at: 0, len: 0.72, v: 0.28, w: 'triangle', harm: 0.55 },
    { f: 1977, at: 0, len: 0.5, v: 0.09, w: 'sine' },
  ],
  /* The old telephone cadence: two long rings with a gap between them. */
  phone: [
    { f: 440, at: 0, len: 0.34, v: 0.22, w: 'square', harm: 0.25 },
    { f: 480, at: 0, len: 0.34, v: 0.20, w: 'square' },
    { f: 440, at: 0.5, len: 0.34, v: 0.22, w: 'square', harm: 0.25 },
    { f: 480, at: 0.5, len: 0.34, v: 0.20, w: 'square' },
  ],
  /* Urgent three-step alarm, the classic "check me now" shape. */
  alert: [
    { f: 1175, at: 0, len: 0.11, v: 0.26, w: 'square' },
    { f: 880, at: 0.13, len: 0.11, v: 0.26, w: 'square' },
    { f: 1175, at: 0.26, len: 0.22, v: 0.26, w: 'square' },
  ],
  /* Smooth modern chime: rising then falling, soft-edged. */
  modern: [
    { f: 1318, at: 0, len: 0.16, v: 0.24, w: 'triangle', harm: 0.2 },
    { f: 1760, at: 0.18, len: 0.16, v: 0.24, w: 'triangle', harm: 0.2 },
    { f: 1046, at: 0.36, len: 0.30, v: 0.24, w: 'triangle', harm: 0.3 },
  ],
  /* A four-note arpeggio: musical, distinctly "house tone". */
  custom: [
    { f: 784, at: 0, len: 0.1, v: 0.22, w: 'triangle' },
    { f: 988, at: 0.1, len: 0.1, v: 0.22, w: 'triangle' },
    { f: 1175, at: 0.2, len: 0.1, v: 0.22, w: 'triangle' },
    { f: 1568, at: 0.3, len: 0.28, v: 0.26, w: 'triangle', harm: 0.4 },
  ],
  /* Low body plus a high accent: weighty and impossible to miss. */
  power: [
    { f: 196, at: 0, len: 0.42, v: 0.20, w: 'sawtooth' },
    { f: 1318, at: 0, len: 0.18, v: 0.22, w: 'triangle', harm: 0.4 },
    { f: 1568, at: 0.3, len: 0.30, v: 0.26, w: 'triangle', harm: 0.4 },
  ],
  /* Gentle lone tone for quiet rooms. */
  soft: [{ f: 660, at: 0, len: 0.55, v: 0.22, w: 'sine', harm: 0.15 }],
  /* Rising sweep into a held chime — a swooping "wave" of sound. */
  wave: [
    { f: 700, at: 0, len: 0.32, v: 0.24, w: 'triangle', bend: 1400 },
    { f: 1400, at: 0.34, len: 0.36, v: 0.26, w: 'triangle', harm: 0.4 },
  ],
  /* Heartbeat pulse: four short strikes, even in a loud room. */
  pulse: [
    { f: 880, at: 0, len: 0.08, v: 0.24, w: 'triangle' },
    { f: 880, at: 0.13, len: 0.08, v: 0.24, w: 'triangle' },
    { f: 1108, at: 0.26, len: 0.08, v: 0.24, w: 'triangle' },
    { f: 1108, at: 0.39, len: 0.16, v: 0.26, w: 'triangle', harm: 0.35 },
  ],
};

/*
 * One shared context for the whole session. Browsers cap the number of live
 * contexts and every context needs a user gesture before it may sound, so the
 * same one is reused and resumed instead of building and closing a new one for
 * each preview.
 */
let sharedCtx = null;

function audioContext() {
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctx();
  return sharedCtx;
}

/** The user's saved level (0–100) as a mastered output gain. */
function masterGainFor(volume) {
  const level = Math.min(100, Math.max(0, Number(volume)));
  const safe = Number.isFinite(level) ? level : DEFAULT_VOLUME;
  // A gentle curve: quiet settings still audible, full settings loud but never
  // past the headroom the limiter below was tuned for.
  return Math.pow(safe / 100, 1.35) * 0.85;
}

function schedule(ctx, notes, volume) {
  const now = ctx.currentTime + 0.01;

  /* Mastering chain: compressor holds the peaks together (so stacked notes and
     the phone's doubled voice stay even), then the master stage applies the
     listener's volume. Nothing here raises gain without control. */
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 18;
  comp.ratio.value = 5;
  comp.attack.value = 0.003;
  comp.release.value = 0.22;

  const master = ctx.createGain();
  master.gain.value = masterGainFor(volume);
  comp.connect(master).connect(ctx.destination);

  let end = 0;
  for (const note of notes) {
    const start = now + note.at;
    const len = note.len ?? 0.3;
    const stop = start + len;
    end = Math.max(end, note.at + len);

    const gain = ctx.createGain();
    // Short fade-in avoids the click that a hard start would add, and the
    // exponential tail is what makes a bell read as struck rather than cut.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(note.v ?? 0.24, 0.0002), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    gain.connect(comp);

    const voices = [{ ratio: 1, gain: 1, type: note.w || 'sine' }];
    if (note.harm) voices.push({ ratio: 2, gain: note.harm, type: note.w === 'square' ? 'square' : 'sine' });

    for (const voice of voices) {
      const osc = ctx.createOscillator();
      const level = ctx.createGain();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(note.f * voice.ratio, start);
      if (note.bend) {
        osc.frequency.exponentialRampToValueAtTime(note.bend * voice.ratio, stop);
      }
      level.gain.value = voice.gain;
      osc.connect(level).connect(gain);
      osc.start(start);
      osc.stop(stop + 0.03);
    }
  }
  // Once the last voice has decayed the chain is disconnected, so repeated
  // previews never pile up idle nodes on the context.
  setTimeout(() => {
    try {
      comp.disconnect();
      master.disconnect();
    } catch {
      /* already gone */
    }
  }, (end + 0.6) * 1000);

  return end;
}

/**
 * Plays one ringtone at the saved volume.
 * Resolves to 'ok', 'blocked' (the browser refused to start audio before a user
 * gesture) or 'unsupported' (no Web Audio at all), so the caller can say which.
 */
export async function playSound(key, volume = DEFAULT_VOLUME) {
  const notes = RINGTONES[key] || RINGTONES[DEFAULT_SOUND];
  const ctx = audioContext();
  if (!ctx) return 'unsupported';
  try {
    if (ctx.state !== 'running') {
      // Some browsers (and every automation shell without an output device)
      // leave resume() pending instead of rejecting, so the wait is bounded:
      // either the context starts, or the caller is told it was blocked.
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    }
    // Autoplay policies keep a context suspended until a real gesture arrives;
    // that is a browser decision, not a failure of the tone.
    if (ctx.state !== 'running') return 'blocked';
    schedule(ctx, notes, volume);
    return 'ok';
  } catch {
    return 'blocked';
  }
}

/** True when this browser can make a notification sound at all. */
export function soundSupported() {
  return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
}
