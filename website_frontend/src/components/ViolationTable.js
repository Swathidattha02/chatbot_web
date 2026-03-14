import React from 'react';

const REASON_LABELS = {
  tab_switch: { label: 'Tab Switch', color: '#667eea', icon: '\u{1F504}' },
  focus_lost: { label: 'Focus Lost', color: '#f59e0b', icon: '\u{1F634}' },
  window_blur: { label: 'Window Blur', color: '#ff9f43', icon: '\u{1FA9F}' },
  visibility_hidden: { label: 'Tab Hidden', color: '#a29bfe', icon: '\u{1F441}\u{FE0F}' },
  window_resize: { label: 'Window Resize', color: '#ec4899', icon: '\u{1F5A5}' }
};

// Helper function to format milliseconds to readable duration
function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '0s';

  // Clamp negative or tiny values to 0 for safety
  if (ms < 0) ms = 0;
  if (ms === 0) return '0s';

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Format time to HH:MM:SS format
function formatTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });
}

// Threshold for showing "(ongoing)" - only for very recent violations (2 minutes)
const ONGOING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export default function ViolationTable({ violations, showUser = false, activityLogView = false }) {
  if (!violations || violations.length === 0) {
    return (
      <div className="admin-empty" style={{ padding: '40px' }}>
        <div className="admin-empty-icon" style={{ fontSize: '32px' }}>&#x2713;</div>
        <h3>No violations recorded</h3>
        <p>All students are focused.</p>
      </div>
    );
  }

  // If activity log view, show Focus Activity Log format
  if (activityLogView) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {showUser && <th>User</th>}
              <th>Event</th>
              <th>Left Time</th>
              <th>Return Time</th>
              <th>Away Duration</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v, i) => {
              const reasonInfo = REASON_LABELS[v.reason] || { label: v.reason, color: '#64748b', icon: '\u26A0\uFE0F' };
              const startT = new Date(v.startTime);
              const endT = v.endTime ? new Date(v.endTime) : null;
              const now = Date.now();
              let violationAge = now - startT;

              // Guard against clock / timezone issues where startTime appears in the future
              if (violationAge < 0) {
                console.warn('[ViolationTable] Negative violationAge detected, clamping to 0 for', v._id);
                violationAge = 0;
              }
              
              // CRITICAL: Only show "(ongoing)" for violations < 2 minutes without endTime
              // Anything older is a historical record and should NEVER show "(ongoing)"
              const hasEndTime = !!endT || (v.endTime && v.endTime !== null);
              const isVeryRecent = violationAge < ONGOING_THRESHOLD_MS;
              const isOngoing = !hasEndTime && isVeryRecent;
              
              // Debug logging
              if (i < 2) {
                console.log(`[ViolationTable] Violation ${i}:`, {
                  hasEndTime,
                  isVeryRecent,
                  isOngoing,
                  violationAge: Math.floor(violationAge / 1000) + 's',
                  startT: startT.toLocaleTimeString(),
                  endT: endT ? endT.toLocaleTimeString() : 'null',
                  duration: v.duration,
                  reason: v.reason
                });
              }
              
              // Calculate duration - use ONLY real stored data, never fabricate
              let displayDuration;
              let isStillAway;
              if (typeof v.duration === 'number' && v.duration > 0) {
                // Use real stored duration (best source of truth from backend)
                displayDuration = v.duration;
                isStillAway = false;
              } else if (endT) {
                // Calculate from real recorded times: endTime - startTime
                displayDuration = endT - startT;
                isStillAway = false;
              } else if (isOngoing) {
                // Very recent violation without return - calculate current elapsed time (real-time tracking)
                displayDuration = violationAge;
                isStillAway = true;
              } else {
                // Old violation without endTime and no stored duration - use safe fallback (0s = data not recorded)
                // CRITICAL RULE: Violations >= 2 minutes old NEVER show "(ongoing)"
                // This ensures old logged-out sessions always display as fixed historical records
                displayDuration = 0;
                isStillAway = false;
              }

              // Clamp any negative duration to 0 so UI never shows -1s or similar
              if (displayDuration < 0) {
                console.warn('[ViolationTable] Negative displayDuration detected, clamping to 0 for', v._id, 'value:', displayDuration);
                displayDuration = 0;
              }

              // FINAL SAFETY CHECK: Force isStillAway to false for any violation >= 2 minutes old
              // This guarantees even with stale data, no "(ongoing)" appears for old violations
              if (violationAge >= ONGOING_THRESHOLD_MS) {
                isStillAway = false;
              }
              
              return (
                <tr key={v._id || i}>
                  {showUser && (
                    <td>
                      <div className="admin-teacher-name">
                        <div className="admin-avatar-sm">{reasonInfo.icon}</div>
                        {v.username || 'Unknown'}
                      </div>
                    </td>
                  )}
                  <td>
                    <span style={{
                      background: `${reasonInfo.color}20`,
                      color: reasonInfo.color,
                      padding: '4px 12px',
                      borderRadius: '100px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      letterSpacing: '0.3px',
                    }}>
                      {reasonInfo.label}
                    </span>
                  </td>
                  <td style={{ color: '#1e1b4b', fontWeight: 600, fontSize: '12px' }}>
                    {formatTime(v.startTime)}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '12px' }}>
                    {endT ? formatTime(v.endTime) : isStillAway ? <span style={{color: '#f59e0b', fontWeight: 600}}>● Still Away</span> : <span style={{color: '#94a3b8'}}>—</span>}
                  </td>
                  <td style={{ 
                    color: (() => {
                      if (isStillAway) return '#f59e0b';
                      return displayDuration > 0 ? '#dc2626' : '#10b981';
                    })(),
                    fontWeight: 700,
                    fontSize: '12px'
                  }}>
                    {isStillAway ? `${formatDuration(displayDuration)} (ongoing)` : formatDuration(displayDuration)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Standard table view (original format)
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {showUser && <th>User</th>}
            <th>Timestamp</th>
            <th>Reason</th>
            <th>Duration</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          {violations.map((v, i) => {
            const reasonInfo = REASON_LABELS[v.reason] || { label: v.reason, color: '#64748b', icon: '\u26A0\uFE0F' };
            const ts = new Date(v.timestamp);
            return (
              <tr key={v._id || i}>
                {showUser && (
                  <td>
                    <div className="admin-teacher-name">
                      <div className="admin-avatar-sm">{reasonInfo.icon}</div>
                      {v.username || 'Unknown'}
                    </div>
                  </td>
                )}
                <td>
                  <span style={{ color: '#1e1b4b', fontWeight: 600 }}>{ts.toLocaleDateString()}</span>
                  {' '}
                  <span style={{ color: '#64748b' }}>{ts.toLocaleTimeString()}</span>
                </td>
                <td>
                  <span style={{
                    background: `${reasonInfo.color}20`,
                    color: reasonInfo.color,
                    padding: '4px 12px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    letterSpacing: '0.3px',
                  }}>
                    {reasonInfo.label}
                  </span>
                </td>
                <td style={{ 
                  color: v.duration > 0 ? '#dc2626' : '#10b981', 
                  fontWeight: 600,
                  fontSize: '12px'
                }}>
                  {formatDuration(v.duration)}
                </td>
                <td style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                  {v.sessionId ? v.sessionId.slice(-8) : '\u2014'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
