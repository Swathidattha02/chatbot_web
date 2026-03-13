import { useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const BUZZER_DURATION = 30000; // 30 seconds
const INACTIVITY_THRESHOLD = 5000; // 5 seconds

let audioContext = null;
let audioUnlocked = false;

// ─── AudioContext: single shared instance ────────────────────────────────────
function getAudioContext() {
  if (!audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      audioContext = new AC();
    }
  }
  return audioContext;
}

// ─── Unlock audio on first user gesture ──────────────────────────────────────
function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const unlock = () => {
    if (audioUnlocked) return;
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(0.001);

    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    audioUnlocked = true;
  };

  ['click', 'keydown', 'mousedown', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, unlock, { once: true, capture: true });
  });
}

unlockAudio();

// ─── Buzzer: DUAL oscillators + distortion siren ────────────────────────────
function startBuzzer(duration = 30) {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const stopAt = now + duration;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = 1100;

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 1100;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 2;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;

  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);

  const distortion = ctx.createWaveShaper();
  distortion.curve = makeAggressiveDistortionCurve(400);
  distortion.oversample = '4x';

  const mixer = ctx.createGain();
  mixer.gain.value = 1.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.95, now);
  masterGain.gain.setValueAtTime(0.95, stopAt);

  osc1.connect(mixer);
  osc2.connect(mixer);
  mixer.connect(distortion);
  distortion.connect(masterGain);
  masterGain.connect(ctx.destination);

  lfo.start(now);
  osc1.start(now);
  osc2.start(now);

  lfo.stop(stopAt);
  osc1.stop(stopAt);
  osc2.stop(stopAt);

  return {
    stop: () => {
      try {
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
        osc1.stop(ctx.currentTime + 0.06);
        osc2.stop(ctx.currentTime + 0.06);
        lfo.stop(ctx.currentTime + 0.06);
      } catch (_) { /* already stopped */ }
    }
  };
}

function makeAggressiveDistortionCurve(amount) {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * (amount / 100)));
  }
  return curve;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFocusMonitor({
  onViolation,
  onAlarmStart,
  onAlarmStop,
  onFocusLost,
  onFocusGained,
  isStudying, // <-- Renamed from 'enabled' for clarity
}) {
  const alarmTimerRef   = useRef(null);
  const buzzerHandleRef = useRef(null);
  const isAlarmActive   = useRef(false);
  const sessionId       = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  // Use refs for callbacks to prevent re-renders
  const onViolationRef   = useRef(onViolation);
  const onAlarmStartRef  = useRef(onAlarmStart);
  const onAlarmStopRef   = useRef(onAlarmStop);
  const onFocusLostRef   = useRef(onFocusLost);
  const onFocusGainedRef = useRef(onFocusGained);

  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onAlarmStartRef.current = onAlarmStart; }, [onAlarmStart]);
  useEffect(() => { onAlarmStopRef.current = onAlarmStop; }, [onAlarmStop]);
  useEffect(() => { onFocusLostRef.current = onFocusLost; }, [onFocusLost]);
  useEffect(() => { onFocusGainedRef.current = onFocusGained; }, [onFocusGained]);


  const stopAlarm = useCallback(() => {
    clearTimeout(alarmTimerRef.current);
    alarmTimerRef.current = null;
    buzzerHandleRef.current?.stop();
    buzzerHandleRef.current = null;
    isAlarmActive.current = false;
    onAlarmStopRef.current?.();
  }, []);

  const startAlarm = useCallback((reason) => {
    if (isAlarmActive.current) return;
    isAlarmActive.current = true;

    onAlarmStartRef.current?.();
    onViolationRef.current?.({ reason, timestamp: new Date().toISOString() });
    api.post('/violation', { reason, sessionId: sessionId.current }).catch(() => {});

    buzzerHandleRef.current = startBuzzer(BUZZER_DURATION);
    alarmTimerRef.current = setTimeout(stopAlarm, BUZZER_DURATION);
  }, [stopAlarm]);

  useEffect(() => {
    // The hook is inactive if the user is not in a study session
    if (!isStudying) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User has left the tab
        startAlarm('visibility_hidden');
        onFocusLostRef.current?.();
      } else {
        // User has returned
        stopAlarm();
        onFocusGainedRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, true);

    // When the hook is activated, if the tab is already hidden, trigger the alarm.
    if (document.hidden) {
        startAlarm('visibility_hidden');
        onFocusLostRef.current?.();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      stopAlarm(); // Clean up on unmount or when isStudying becomes false
    };
  }, [isStudying, startAlarm, stopAlarm]);

  return { stopAlarm, sessionId: sessionId.current };
}
