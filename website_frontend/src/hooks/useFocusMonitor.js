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
  
  // Store violation timing data for duration calculation
  const violationStartTimeRef = useRef(null);
  const currentViolationIdRef = useRef(null);
  const resizeTimeoutRef = useRef(null);  // For auto-resolving window resize violations
  const violationTypeRef = useRef(null);  // Track what type of violation is active
  const isViolationEndedRef = useRef(false);  // Track if violation has already been ended

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
    
    // Reset tracking vars at start of new violation
    isViolationEndedRef.current = false;
    
    // Record violation start time
    const startTime = new Date();
    violationStartTimeRef.current = startTime;
    violationTypeRef.current = reason;

    onAlarmStartRef.current?.();
    onViolationRef.current?.({ reason, timestamp: startTime.toISOString() });
    
    // Send violation start to backend
    api.post('/violation', { 
      reason, 
      sessionId: sessionId.current,
      startTime: startTime.toISOString()
    }).then(res => {
      // Store violation ID for later update - THIS IS CRITICAL
      if (res.data?.violation?._id) {
        currentViolationIdRef.current = res.data.violation._id;
        console.log('[useFocusMonitor] ✅ Violation recorded with ID:', { 
          id: res.data.violation._id, 
          reason,
          startTime: res.data.violation.startTime
        });
      } else {
        console.warn('[useFocusMonitor] ⚠️ Violation recorded but NO ID returned', res.data);
      }
    }).catch(err => {
      console.error('[useFocusMonitor] ❌ Error recording violation:', err.message);
    });

    buzzerHandleRef.current = startBuzzer(BUZZER_DURATION);
    alarmTimerRef.current = setTimeout(stopAlarm, BUZZER_DURATION);
  }, [stopAlarm]);

  // New function to end violation and calculate duration
  const endViolationWithDuration = useCallback(() => {
    // Prevent ending the same violation multiple times
    if (isViolationEndedRef.current) {
      console.log('[useFocusMonitor] Violation already ended, skipping duplicate end call');
      return;
    }

    if (!violationStartTimeRef.current) {
      console.warn('[useFocusMonitor] ⚠️ No violation start time found');
      return;
    }

    // Check if we have the violation ID
    if (!currentViolationIdRef.current) {
      console.warn('[useFocusMonitor] ⚠️ Violation ID not available yet, will retry in 100ms', {
        startTime: violationStartTimeRef.current,
        sessionId: sessionId.current
      });
      // Retry after a short delay to allow the ID to be captured from the server response
      setTimeout(endViolationWithDuration, 100);
      return;
    }

    // Mark this violation as being processed to prevent duplicate ends
    isViolationEndedRef.current = true;

    const endTime = new Date();
    const duration = endTime - violationStartTimeRef.current;

    console.log('[useFocusMonitor] 📋 Ending violation:', { 
      violationId: currentViolationIdRef.current, 
      type: violationTypeRef.current,
      startTime: violationStartTimeRef.current,
      endTime: endTime,
      durationMs: duration 
    });

    // Send end time and duration to backend
    api.post('/violation/end', {
      violationId: currentViolationIdRef.current,
      endTime: endTime.toISOString()
    }).then(res => {
      console.log('[useFocusMonitor] ✅ Violation ended successfully:', { 
        violationId: currentViolationIdRef.current,
        durationMs: res.data?.violation?.duration,
        endTime: res.data?.violation?.endTime
      });
    }).catch(err => {
      console.error('[useFocusMonitor] ❌ Error ending violation:', err.message, err.response?.data);
    });

    // Reset tracking vars
    violationStartTimeRef.current = null;
    currentViolationIdRef.current = null;
    violationTypeRef.current = null;
  }, []);

  // Function to auto-resolve window resize violations after 10 seconds of no further resizes
  const autoResolveResizeViolation = useCallback(() => {
    if (violationTypeRef.current === 'window_resize') {
      console.log('[useFocusMonitor] ⏱️ Auto-resolving window resize violation');
      isViolationEndedRef.current = false;  // Reset so endViolationWithDuration can be called
      endViolationWithDuration();
      stopAlarm();
      onFocusGainedRef.current?.();
    }
  }, [endViolationWithDuration, stopAlarm]);

  // Cleanup refs when hook unmounts
  useEffect(() => {
    return () => {
      clearTimeout(resizeTimeoutRef.current);
      clearTimeout(alarmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // The hook is inactive if the user is not in a study session
    if (!isStudying) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User has left the tab
        console.log('[useFocusMonitor] 👁️ Tab hidden - recording violation');
        startAlarm('visibility_hidden');
        onFocusLostRef.current?.();
      } else {
        // User has returned - end the violation and calculate duration
        console.log('[useFocusMonitor] 👁️ Tab visible - ending violation');
        isViolationEndedRef.current = false;  // Reset so endViolationWithDuration can be called
        endViolationWithDuration();
        stopAlarm();
        onFocusGainedRef.current?.();
      }
    };

    // Handle window resize events
    const handleWindowResize = () => {
      // Only trigger on significant resizes (avoid small resize events)
      if (isAlarmActive.current) {
        // Already in violation, clear and reset the auto-resolve timer
        clearTimeout(resizeTimeoutRef.current);
      } else {
        // Trigger violation on window resize
        startAlarm('window_resize');
        onFocusLostRef.current?.();
      }

      // Set a timeout to auto-resolve window resize violations after 10 seconds of no further resizes
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        autoResolveResizeViolation();
      }, 10000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, true);
    window.addEventListener('resize', handleWindowResize);

    // When the hook is activated, if the tab is already hidden, trigger the alarm.
    if (document.hidden) {
        startAlarm('visibility_hidden');
        onFocusLostRef.current?.();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(resizeTimeoutRef.current);
      stopAlarm(); // Clean up on unmount or when isStudying becomes false
    };
  }, [isStudying, startAlarm, stopAlarm, endViolationWithDuration, autoResolveResizeViolation]);

  return { stopAlarm, sessionId: sessionId.current };
}
