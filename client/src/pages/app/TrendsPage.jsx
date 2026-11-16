import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { DEMO_TRENDS, DEMO_REPORT_COMPARISON } from '../../services/api';

export default function TrendsPage({ patientId = 'PAT-8001', onNavigate }) {
  const trends = DEMO_TRENDS;
  const comparison = DEMO_REPORT_COMPARISON;

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📈 Longitudinal Trends & Report Comparison</h2>
          <p>Multi-report trajectory tracking and side-by-side delta analysis for Sarah Johnson (PAT-8001).</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('clinical-report')}>
          Generate Full Clinical Report →
        </button>
      </div>

      <SafetyDisclaimer compact />

      {/* RECHARTS LONGITUDINAL TIMELINE GRAPH */}
      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 24 }}>
        <h4 style={{ color: '#fff', marginBottom: 16 }}>Biomarker Trajectory Over Time (Jan 2026 – Aug 2026)</h4>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" />
              <Tooltip contentStyle={{ background: '#0d1321', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="HbA1c" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} name="HbA1c (%)" />
              <Line type="monotone" dataKey="Glucose" stroke="#f59e0b" strokeWidth={2} dot={{ r: 5 }} name="Fasting Glucose (mg/dL)" />
              <Line type="monotone" dataKey="Hemoglobin" stroke="#00d4aa" strokeWidth={2} dot={{ r: 5 }} name="Hemoglobin (g/dL)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* REPORT COMPARISON TABLE */}
      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h4 style={{ color: '#fff' }}>Side-by-Side Lab Report Comparison</h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Comparing Previous Report (2026-06-10) vs Current Report (2026-08-18)
            </span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '10px 4px' }}>Test Parameter</th>
              <th style={{ padding: '10px 4px' }}>Previous Result</th>
              <th style={{ padding: '10px 4px' }}>Current Result</th>
              <th style={{ padding: '10px 4px' }}>Units</th>
              <th style={{ padding: '10px 4px' }}>Change Delta</th>
              <th style={{ padding: '10px 4px' }}>Trend Direction</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 4px', color: '#fff', fontWeight: 600 }}>{item.testName}</td>
                <td style={{ padding: '12px 4px', color: 'var(--text-secondary)' }}>{item.previousValue}</td>
                <td style={{ padding: '12px 4px', fontWeight: 700, color: item.isAbnormal ? '#ef4444' : '#10b981' }}>
                  {item.currentValue}
                </td>
                <td style={{ padding: '12px 4px', color: 'var(--text-tertiary)' }}>{item.unit}</td>
                <td style={{ padding: '12px 4px', fontWeight: 700, color: item.changePercent > 0 ? '#ef4444' : '#10b981' }}>
                  {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                </td>
                <td style={{ padding: '12px 4px' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: item.trend === 'up' ? 'rgba(239, 68, 68, 0.12)' : item.trend === 'down' ? 'rgba(0, 212, 170, 0.12)' : 'rgba(255,255,255,0.06)',
                    color: item.trend === 'up' ? '#ef4444' : item.trend === 'down' ? '#00d4aa' : '#94a3b8'
                  }}>
                    {item.trend === 'up' ? '↑ Increased' : item.trend === 'down' ? '↓ Decreased' : '→ Stable'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
