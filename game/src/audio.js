// All sound is synthesised at run time with WebAudio oscillators — no audio files,
// no network. An engine hum whose pitch follows the throttle, a bright chime when a
// ring is flown, a dull thud on damage, and a little fanfare on landing.

export function createAudio() {
  let context = null;
  let humOsc = null;
  let humGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return context !== null;
    started = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      humOsc = context.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.value = 62;
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 320;
      humGain = context.createGain();
      humGain.gain.value = 0;
      humOsc.connect(lowpass);
      lowpass.connect(humGain);
      humGain.connect(context.destination);
      humOsc.start();
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  /** Start (or resume) the audio context; call from a user gesture. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume();
  }

  /** Follow the engine: throttle 0..1 and whether the game is actually flying. */
  function engine(throttle, flying) {
    if (!context || !humOsc || !humGain) return;
    const target = muted || !flying ? 0 : 0.035 + throttle * 0.035;
    humGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
    humOsc.frequency.setTargetAtTime(52 + throttle * 58, context.currentTime, 0.15);
  }

  function tone(freq, when, length, type, volume) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, context.currentTime + when);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + when + length);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(context.currentTime + when);
    osc.stop(context.currentTime + when + length + 0.05);
  }

  function chime() {
    if (!ensure()) return;
    tone(880, 0, 0.35, 'sine', 0.16);
    tone(1318, 0.07, 0.4, 'sine', 0.12);
  }

  function thud() {
    if (!ensure()) return;
    tone(90, 0, 0.3, 'triangle', 0.25);
    tone(55, 0.05, 0.35, 'sine', 0.2);
  }

  function fanfare() {
    if (!ensure()) return;
    tone(523, 0, 0.25, 'triangle', 0.14);
    tone(659, 0.12, 0.25, 'triangle', 0.14);
    tone(784, 0.24, 0.5, 'triangle', 0.16);
  }

  function toggleMute() {
    muted = !muted;
    if (humGain && context) humGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
    return muted;
  }

  return { unlock, engine, chime, thud, fanfare, toggleMute, isMuted: () => muted };
}
