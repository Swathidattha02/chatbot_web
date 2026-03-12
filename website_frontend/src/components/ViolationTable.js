import React from 'react';

const REASON_LABELS = {
  tab_switch: { label: 'Tab Switch', color: '#667eea', icon: '\u{1F504}' },
  focus_lost: { label: 'Focus Lost', color: '#f59e0b', icon: '\u{1F634}' },
  window_blur: { label: 'Window Blur', color: '#ff9f43', icon: '\u{1FA9F}' },
  visibility_hidden: { label: 'Tab Hidden', color: '#a29bfe', icon: '\u{1F441}\u{FE0F}' }
};

export default function ViolationTable({ violations, showUser = false }) {
  if (!violations || violations.length === 0) {
    return (
      <div className="admin-empty" style={{ padding: '40px' }}>
        <div className="admin-empty-icon" style={{ fontSize: '32px' }}>&#x2713;</div>
        <h3>No violations recorded</h3>
        <p>All students are focused.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {showUser && <th>User</th>}
            <th>Timestamp</th>
            <th>Reason</th>
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
