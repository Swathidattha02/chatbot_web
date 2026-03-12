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
export function useFocusMonitor({ onViolation, onAlarmStart, onAlarmStop, onCountdown }) {
  const alarmTimerRef      = useRef(null);
  const countdownRef       = useRef(null);
  const inactivityRef      = useRef(null);
  const buzzerHandleRef    = useRef(null);
  const isAlarmActive      = useRef(false);
  const lastActivity       = useRef(Date.now());
  const sessionId          = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const onViolationRef = useRef(onViolation);
  const onAlarmStartRef = useRef(onAlarmStart);
  const onAlarmStopRef = useRef(onAlarmStop);
  const onCountdownRef = useRef(onCountdown);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onAlarmStartRef.current = onAlarmStart; }, [onAlarmStart]);
  useEffect(() => { onAlarmStopRef.current = onAlarmStop; }, [onAlarmStop]);
  useEffect(() => { onCountdownRef.current = onCountdown; }, [onCountdown]);

  const stopAlarm = useCallback(() => {
    clearTimeout(alarmTimerRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(inactivityRef.current);
    alarmTimerRef.current = null;
    countdownRef.current  = null;
    inactivityRef.current = null;

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

    buzzerHandleRef.current = startBuzzer(30);

    let remaining = 30;
    onCountdownRef.current?.(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      onCountdownRef.current?.(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);

    alarmTimerRef.current = setTimeout(() => {
      stopAlarm();
    }, BUZZER_DURATION);
  }, [stopAlarm]);

  const resetInactivity = useCallback(() => {
    lastActivity.current = Date.now();
    clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      if (!isAlarmActive.current) {
        startAlarm('focus_lost');
      }
    }, INACTIVITY_THRESHOLD);
  }, [startAlarm]);

  // ── Away-time tracking ─────────────────────────────────────────────────────
  const leaveTimeRef = useRef(null);
  const isAwayRef = useRef(false);

  const handleVisibilityForAwayTime = useCallback(() => {
    if (document.hidden) {
      if (!isAwayRef.current) {
        leaveTimeRef.current = new Date();
        isAwayRef.current = true;
      }
    } else if (isAwayRef.current && leaveTimeRef.current) {
      const returnTime = new Date();
      const duration = Math.floor((returnTime - leaveTimeRef.current) / 1000);

      api.post('/away-time', {
        sessionId: sessionId.current,
        leftAt: leaveTimeRef.current,
        returnedAt: returnTime,
        duration
      }).catch(() => {});

      leaveTimeRef.current = null;
      isAwayRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      handleVisibilityForAwayTime();
      if (document.hidden && !isAlarmActive.current) {
        startAlarm('visibility_hidden');
      }
    };

    const onBlur = () => {
      if (!isAlarmActive.current) {
        startAlarm('window_blur');
      }
    };

    const onFocus = () => {
      resetInactivity();
    };

    const onResize = () => {
      if (!isAlarmActive.current) {
        startAlarm('tab_switch');
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    const onActivity = () => resetInactivity();

    document.addEventListener('visibilitychange', onVisibility, true);
    window.addEventListener('blur',   onBlur,   true);
    window.addEventListener('focus',  onFocus,  true);
    window.addEventListener('resize', onResize, true);
    activityEvents.forEach(ev => document.addEventListener(ev, onActivity, true));

    resetInactivity();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility, true);
      window.removeEventListener('blur',   onBlur,   true);
      window.removeEventListener('focus',  onFocus,  true);
      window.removeEventListener('resize', onResize, true);
      activityEvents.forEach(ev => document.removeEventListener(ev, onActivity, true));
      stopAlarm();
    };
  }, [startAlarm, stopAlarm, resetInactivity, handleVisibilityForAwayTime]);

  return { stopAlarm, sessionId: sessionId.current };
}
