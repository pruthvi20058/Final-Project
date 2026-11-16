import React from 'react';

export default function StatusBadge({ status, type = 'status' }) {
  const getStyle = () => {
    const s = (status || '').toLowerCase();
    if (['critical', 'high', 'failed', 'rejected', 'conflict_detected'].includes(s)) {
      return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' };
    }
    if (['moderate', 'urgent', 'warnings', 'modified', 'low_confidence'].includes(s)) {
      return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' };
    }
    if (['normal', 'low', 'passed', 'accepted', 'complete', 'high_consistency'].includes(s)) {
      return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' };
    }
    return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
  };

  const style = getStyle();

  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
      textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      {status}
    </span>
  );
}
