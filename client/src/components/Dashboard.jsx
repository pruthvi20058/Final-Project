import React, { useState, useEffect } from 'react';
import DemoBanner from './DemoBanner';
import SafetyDisclaimer from './SafetyDisclaimer';
import StatusBadge from './StatusBadge';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { reportService } from '../services/api';

export default function Dashboard({ onNavigate, doctor }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      const data = await reportService.list();
      if (mounted) setReports(data || []);
    }
    loadReports();
    return () => { mounted = false; };
  }, []);

  const monthlyData = [
    { month: 'Apr', reports: 42 },
    { month: 'May', reports: 68 },
    { month: 'Jun', reports: 95 },
    { month: 'Jul', reports: 120 },
    { month: 'Aug', reports: 148 }
  ];

  const riskPieData = [
    { name: 'Low Risk', value: 45, color: '#10b981' },
    { name: 'Moderate Risk', value: 35, color: '#f59e0b' },
    { name: 'High Risk', value: 15, color: '#ef4444' },
    { name: 'Critical Risk', value: 5, color: '#7c3aed' }
  ];

  return (
    <div className="fade-in">
      <DemoBanner />

      {/* DASHBOARD HEADER */}
      <div className="greeting-header" style={{ marginTop: 16 }}>
        <div className="greeting-text">
          <h2>Welcome back, {doctor?.name || 'Dr. Clinician'}</h2>
          <p>MediAgent Clinical Decision Support — Multimodal Laboratory Intelligence System</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('evaluation')}>
            🏆 View Research Benchmarks
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
            📤 Upload Report
          </button>
        </div>
      </div>

      <SafetyDisclaimer compact />

      {/* SECTION 10: DASHBOARD kPI CARDS */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card teal" onClick={() => onNavigate('reports')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">📋</div>
          <div className="metric-value">148</div>
          <div className="metric-label">Total Reports Uploaded</div>
          <div className="metric-change up">↑ 24% this month</div>
        </div>

        <div className="metric-card indigo" onClick={() => onNavigate('predictions')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">🧬</div>
          <div className="metric-value">142</div>
          <div className="metric-label">Analyzed Reports</div>
          <div className="metric-change up">↑ 96.0% Conversion</div>
        </div>

        <div className="metric-card blue" onClick={() => onNavigate('review')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">🩺</div>
          <div className="metric-value">6</div>
          <div className="metric-label">Pending Doctor Reviews</div>
          <div className="metric-change down">⚠ Requires Sign-off</div>
        </div>

        <div className="metric-card red">
          <div className="metric-icon">🚨</div>
          <div className="metric-value">3</div>
          <div className="metric-label">Flagged Critical Reports</div>
          <div className="metric-change down">⚠ High Uncertainty / Risk</div>
        </div>
      </div>

      {/* SECTION 11: RECHARTS ANALYTICS GRAPHS */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Reports Processed Over Time</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="var(--text-tertiary)" />
                <YAxis stroke="var(--text-tertiary)" />
                <Tooltip contentStyle={{ background: '#0d1321', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="reports" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Risk Severity Distribution</h4>
          <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1321', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT REPORTS TABLE */}
      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ color: '#fff' }}>Recent Laboratory Reports</h4>
          <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => onNavigate('reports')}>
            View All Reports →
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '8px 4px' }}>Patient</th>
              <th style={{ padding: '8px 4px' }}>Report Filename</th>
              <th style={{ padding: '8px 4px' }}>Date</th>
              <th style={{ padding: '8px 4px' }}>Extraction Status</th>
              <th style={{ padding: '8px 4px' }}>Prediction Status</th>
              <th style={{ padding: '8px 4px' }}>Risk</th>
              <th style={{ padding: '8px 4px', textAlign: 'right' }}>Review Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 4px', color: '#fff', fontWeight: 600 }}>{r.patientName}</td>
                <td style={{ padding: '12px 4px', color: 'var(--text-secondary)' }}>{r.filename}</td>
                <td style={{ padding: '12px 4px', color: 'var(--text-tertiary)' }}>{r.uploadDate}</td>
                <td style={{ padding: '12px 4px' }}><StatusBadge status="passed" /></td>
                <td style={{ padding: '12px 4px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '12px 4px' }}><StatusBadge status="moderate" /></td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => onNavigate('predictions')}>
                    Inspect Report →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
