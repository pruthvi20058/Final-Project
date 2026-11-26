import React from 'react';

export default function StatusBadge({ status, type = 'status', customColor }) {
  const colorMap = {
    ONLINE: '#10b981',
    CONFIGURED: '#10b981',
    OFFLINE: '#ef4444',
    UNAVAILABLE: '#f59e0b',
    UNKNOWN: '#94a3b8',
    ERROR: '#ef4444'
  };

  const getStyle = () => {
    const s = (status || '').toUpperCase();
    if (customColor) {
      return { bg: `rgba(${hexToRgb(customColor)}, 0.12)`, border: `1px solid ${customColor}`, color: customColor };
    }
    if (colorMap[s]) {
      const c = colorMap[s];
      return { bg: `rgba(${hexToRgb(c)}, 0.12)`, border: `1px solid ${c}`, color: c };
    }
    const ss = (status || '').toLowerCase();
    if (['critical', 'high', 'failed', 'rejected', 'conflict_detected'].includes(ss)) {
      return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' };
    }
    if (['moderate', 'urgent', 'warnings', 'modified', 'low_confidence'].includes(ss)) {
      return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' };
    }
    if (['normal', 'low', 'passed', 'accepted', 'complete', 'high_consistency'].includes(ss)) {
      return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' };
    }
    return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' };
  };

  const style = getStyle();

  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: style.bg, border: style.border, color: style.color,
      textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      {status}
    </span>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
}
