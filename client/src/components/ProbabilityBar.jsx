import React from 'react';

export default function ProbabilityBar({ disease, probability, severity = 'moderate', icd10, isPrimary = false }) {
  const getColor = () => {
    if (probability >= 70) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (probability >= 30) return 'linear-gradient(90deg, #f59e0b, #d97706)';
    return 'linear-gradient(90deg, #3b82f6, #2563eb)';
  };

  return (
    <div style={{
      marginBottom: 16, padding: '14px 18px',
      background: isPrimary ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-secondary)',
      border: `1px solid ${isPrimary ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-md)', transition: 'var(--transition)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: isPrimary ? '1.02rem' : '0.92rem' }}>
            {disease}
          </span>
          {icd10 && (
            <span style={{
              marginLeft: 8, fontSize: '0.72rem', background: 'var(--bg-tertiary)',
              padding: '2px 6px', borderRadius: 4, color: 'var(--text-tertiary)'
            }}>
              ICD-10: {icd10}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: 800, fontSize: isPrimary ? '1.2rem' : '1rem', color: probability >= 70 ? '#ef4444' : probability >= 30 ? '#f59e0b' : '#3b82f6' }}>
            {probability}%
          </span>
        </div>
      </div>

      <div style={{ height: 10, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, probability))}%`,
          height: '100%', background: getColor(), borderRadius: 6,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  );
}
