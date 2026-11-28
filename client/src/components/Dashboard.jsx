import React, { useState, useEffect } from 'react';
import DemoBanner from './DemoBanner';
import SafetyDisclaimer from './SafetyDisclaimer';
import StatusBadge from './StatusBadge';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { reportService, riskService, mlService } from '../services/api';

export default function Dashboard({ onNavigate, doctor }) {
  const [reports, setReports] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [modelReadiness, setModelReadiness] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Load reports in parallel with risk assessments and model readiness
        const [reportsData, riskData, readinessData] = await Promise.allSettled([
          reportService.list(),
          riskService.listRiskAssessments(),
          mlService.getReadiness()
        ]);

        if (mounted) {
          if (reportsData.status === 'fulfilled') {
            setReports(reportsData.value || []);
          } else {
            setReports([]);
          }

          if (riskData.status === 'fulfilled') {
            setRiskAssessments(riskData.value || []);
          } else {
            setRiskAssessments([]);
          }

          if (readinessData.status === 'fulfilled') {
            setModelReadiness(readinessData.value || {});
          } else {
            setModelReadiness({});
          }

          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Unable to load dashboard data.');
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => { mounted = false; };
  }, []);

  // Compute metrics from actual backend data
  const totalReports = reports.length;
  const analyzedReports = reports.filter(r => r.extractionStatus === 'completed' || r.status === 'completed').length;
  const pendingReviews = reports.filter(r => r.verificationStatus === 'pending' || r.pendingReview).length;
  const criticalReports = riskAssessments.filter(r =>
    r.riskCategory === 'critical' || r.riskCategory === 'high' || r.emergencyWarning
  ).length;

  // Compute monthly data from actual report upload dates
  const monthlyMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  reports.forEach(r => {
    const date = r.uploadDate || r.createdAt;
    if (date) {
      try {
        const d = new Date(date);
        const month = monthNames[d.getMonth()];
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      } catch {}
    }
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, count]) => ({ month, reports: count }));

  // Compute risk distribution from actual assessments
  const riskCounts = { low: 0, moderate: 0, high: 0, critical: 0 };
  riskAssessments.forEach(r => {
    const cat = (r.riskCategory || 'low').toLowerCase();
    if (riskCounts[cat] !== undefined) riskCounts[cat]++;
  });
  const riskPieData = [
    { name: 'Low Risk', value: riskCounts.low, color: '#10b981' },
    { name: 'Moderate Risk', value: riskCounts.moderate, color: '#f59e0b' },
    { name: 'High Risk', value: riskCounts.high, color: '#ef4444' },
    { name: 'Critical Risk', value: riskCounts.critical, color: '#7c3aed' }
  ];

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

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

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, color: '#fca5a5' }}>
          <strong>Unable to load dashboard data:</strong> {errorMsg}
        </div>
      )}

      <SafetyDisclaimer compact />

      {/* DASHBOARD KPI CARDS — from actual backend data */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card teal" onClick={() => onNavigate('reports')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">📋</div>
          <div className="metric-value">{totalReports}</div>
          <div className="metric-label">Total Reports Uploaded</div>
          <div className="metric-change up">{analyzedReports} analyzed</div>
        </div>

        <div className="metric-card indigo" onClick={() => onNavigate('predictions')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">🧬</div>
          <div className="metric-value">{analyzedReports}</div>
          <div className="metric-label">Analyzed Reports</div>
          {totalReports > 0
            ? <div className="metric-change up">↑ {Math.round((analyzedReports / totalReports) * 100)}% conversion</div>
            : <div className="metric-change down">No reports yet</div>}
        </div>

        <div className="metric-card blue" onClick={() => onNavigate('review')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon">🩺</div>
          <div className="metric-value">{pendingReviews}</div>
          <div className="metric-label">Pending Doctor Reviews</div>
          {pendingReviews > 0
            ? <div className="metric-change down">⚠ Requires sign-off</div>
            : <div className="metric-change up">All caught up</div>}
        </div>

        <div className="metric-card red">
          <div className="metric-icon">🚨</div>
          <div className="metric-value">{criticalReports}</div>
          <div className="metric-label">Flagged Critical Reports</div>
          {criticalReports > 0
            ? <div className="metric-change down">⚠ High uncertainty / risk</div>
            : <div className="metric-change up">No critical flags</div>}
        </div>
      </div>

      {/* EMPTY STATE */}
      {totalReports === 0 && riskAssessments.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon">📋</div>
          <h3>No reports yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            Upload your first laboratory report to begin clinical decision support analysis.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
            📤 Upload Laboratory Report
          </button>
        </div>
      )}

      {/* RECHARTS ANALYTICS GRAPHS — only when data exists */}
      {totalReports > 0 || riskAssessments.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {monthlyData.length > 0 && (
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
          )}

          {riskAssessments.length > 0 && (
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
          )}
        </div>
      )}

      {/* RECENT REPORTS TABLE */}
      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ color: '#fff' }}>Recent Laboratory Reports</h4>
          <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => onNavigate('reports')}>
            View All Reports →
          </button>
        </div>

        {reports.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No reports found. Upload a laboratory report to get started.
          </div>
        ) : (
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
              {reports.slice(0, 10).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 4px', color: '#fff', fontWeight: 600 }}>{r.patientName || 'Unknown Patient'}</td>
                  <td style={{ padding: '12px 4px', color: 'var(--text-secondary)' }}>{r.filename || r.original_filename || 'Unknown'}</td>
                  <td style={{ padding: '12px 4px', color: 'var(--text-tertiary)' }}>{r.uploadDate || r.createdAt || '—'}</td>
                  <td style={{ padding: '12px 4px' }}>
                    <StatusBadge status={r.extractionStatus || r.status || 'unknown'} />
                  </td>
                  <td style={{ padding: '12px 4px' }}>
                    <StatusBadge status={r.predictionStatus || r.status || 'pending'} />
                  </td>
                  <td style={{ padding: '12px 4px' }}>
                    <StatusBadge status={r.riskLevel || 'unknown'} />
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => onNavigate('predictions')}>
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
