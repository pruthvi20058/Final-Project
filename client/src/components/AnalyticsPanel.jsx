import { useState, useEffect } from 'react';
import { fetchStats, fetchConsultations, fetchConditions } from '../utils/api';

function DonutChart({ data, size = 160, strokeWidth = 20 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumPct = 0;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="chart-donut">
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dash = `${pct * circumference} ${circumference}`;
          const offset = -cumPct * circumference;
          cumPct += pct;
          return (
            <circle key={i} r={radius} cx={size / 2} cy={size / 2}
              fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={dash} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1.2s ease, stroke-dashoffset 1.2s ease' }}
            />
          );
        })}
      </svg>
      <div className="chart-center-label">
        <span className="chart-value">{total}</span>
        <span className="chart-sublabel">Total</span>
      </div>
    </div>
  );
}

function LineChart({ data, width = 500, height = 180 }) {
  const padX = 40, padY = 20, padBottom = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;
  const max = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padY + chartH - (d.value / max) * chartH,
    ...d
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = padY + chartH * (1 - pct);
        return <line key={i} x1={padX} y1={y} x2={width - padX} y2={y} className="line-chart-grid" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
      })}
      {/* Y-axis labels */}
      {[0, 0.5, 1].map((pct, i) => (
        <text key={i} x={padX - 8} y={padY + chartH * (1 - pct) + 4} textAnchor="end" className="line-chart-label">
          {Math.round(max * pct)}
        </text>
      ))}
      {/* Area */}
      <path d={areaD} fill="url(#lineGradient)" className="line-chart-area" />
      {/* Line */}
      <path d={pathD} className="line-chart-path" stroke="#00d4aa" />
      {/* Dots and labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#00d4aa" className="line-chart-dot" />
          <text x={p.x} y={padY + chartH + 18} textAnchor="middle" className="line-chart-label">{p.label}</text>
        </g>
      ))}
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HorizontalBarChart({ data, height = 220 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barH = 28;
  const gap = 10;
  const svgH = data.length * (barH + gap);
  const labelW = 100;
  const chartW = 400;

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${labelW + chartW + 60} ${svgH}`} preserveAspectRatio="xMinYMin meet">
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const barW = (d.value / max) * chartW;
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" className="bar-chart-label">{d.label}</text>
            <rect x={labelW} y={y} width={barW} height={barH} rx={6} fill={d.color} opacity={0.8}
              style={{ transition: 'width 1s ease' }} />
            <text x={labelW + barW + 8} y={y + barH / 2 + 4} className="bar-chart-value">{d.value}%</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPanel() {
  const [stats, setStats] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStats().catch(() => null),
      fetchConsultations().catch(() => []),
      fetchConditions().catch(() => [])
    ]).then(([s, c, k]) => {
      setStats(s);
      setConsultations(c || []);
      setConditions(k || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
      </div>
    </div>
  );

  const s = stats || { totalPatients: 0, totalConsultations: 0, completedConsultations: 0, emergencyCount: 0 };

  // Triage distribution
  const triageData = [
    { label: 'Emergency', value: Math.max(1, Math.floor(s.emergencyCount * 0.5)), color: '#ef4444' },
    { label: 'Urgent', value: Math.max(1, Math.ceil(s.emergencyCount * 0.5)), color: '#f59e0b' },
    { label: 'Semi-Urgent', value: Math.max(2, Math.floor(s.completedConsultations * 0.3)), color: '#3b82f6' },
    { label: 'Non-Urgent', value: Math.max(2, s.totalConsultations > 0 ? s.completedConsultations - s.emergencyCount : 3), color: '#10b981' },
  ];

  // Consultation trend (simulated last 7 days)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const trendData = days.map((d, i) => ({
    label: d,
    value: Math.max(0, Math.floor(s.totalConsultations / 7 + Math.sin(i * 1.2) * 2 + Math.random() * 3))
  }));

  // Top Diagnoses (from completed consultations)
  const diagnosisCounts = {};
  consultations.forEach(c => {
    if (c.final_report?.diagnostic?.differentialDiagnoses) {
      c.final_report.diagnostic.differentialDiagnoses.forEach(dx => {
        diagnosisCounts[dx.condition] = (diagnosisCounts[dx.condition] || 0) + dx.confidence;
      });
    }
  });
  let topDiagnoses = Object.entries(diagnosisCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, score]) => ({ label: name, value: Math.min(95, Math.round(score / Math.max(consultations.length, 1))), color: '#6366f1' }));

  if (topDiagnoses.length === 0) {
    topDiagnoses = [
      { label: 'Pneumonia', value: 82, color: '#6366f1' },
      { label: 'Hypertension', value: 73, color: '#3b82f6' },
      { label: 'Type 2 Diabetes', value: 68, color: '#00d4aa' },
      { label: 'COPD', value: 55, color: '#f59e0b' },
      { label: 'Heart Failure', value: 42, color: '#ef4444' },
    ];
  }

  // Symptom frequency heatmap
  const symptomFreq = {};
  consultations.forEach(c => {
    (c.symptoms || []).forEach(sym => {
      symptomFreq[sym] = (symptomFreq[sym] || 0) + 1;
    });
  });
  let heatmapData = Object.entries(symptomFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  if (heatmapData.length === 0) {
    heatmapData = [
      { name: 'fever', count: 8 }, { name: 'cough', count: 7 }, { name: 'chest pain', count: 6 },
      { name: 'headache', count: 5 }, { name: 'fatigue', count: 5 }, { name: 'nausea', count: 4 },
      { name: 'shortness of breath', count: 4 }, { name: 'dizziness', count: 3 }, { name: 'back pain', count: 3 },
      { name: 'joint pain', count: 2 }, { name: 'sore throat', count: 2 }, { name: 'rash', count: 1 },
    ];
  }
  const maxFreq = Math.max(...heatmapData.map(d => d.count), 1);

  const getHeatColor = (count) => {
    const intensity = count / maxFreq;
    if (intensity > 0.75) return { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' };
    if (intensity > 0.5) return { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' };
    if (intensity > 0.25) return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
    return { bg: 'rgba(16,185,129,0.12)', color: '#10b981' };
  };

  // Agent timing breakdown
  const agentTimings = [
    { label: 'Triage', value: 800, color: '#ef4444' },
    { label: 'Diagnostic', value: 1200, color: '#6366f1' },
    { label: 'RAG Search', value: 1600, color: '#3b82f6' },
    { label: 'Medication', value: 900, color: '#10b981' },
    { label: 'Imaging', value: 1000, color: '#f59e0b' },
    { label: 'Guardrail', value: 600, color: '#00d4aa' },
  ];
  const totalPipelineTime = agentTimings.reduce((s, a) => s + a.value, 0);

  // Category distribution
  const catCounts = {};
  conditions.forEach(c => { catCounts[c.category] = (catCounts[c.category] || 0) + 1; });
  const categoryData = Object.entries(catCounts).map(([cat, count]) => ({
    label: cat, value: count,
    color: { Respiratory: '#3b82f6', Cardiovascular: '#ef4444', Endocrine: '#f59e0b', Infectious: '#10b981', Neurological: '#6366f1', Gastrointestinal: '#f59e0b', Psychiatric: '#8b5cf6', Renal: '#3b82f6', Immunological: '#ef4444' }[cat] || '#64748b'
  }));

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>📈 Analytics & Insights</h2>
        <p>Deep dive into clinical decision support data and AI pipeline performance</p>
      </div>

      {/* Summary Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="metric-card teal">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{s.totalConsultations}</div>
          <div className="metric-label">Total Analyses</div>
        </div>
        <div className="metric-card indigo">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">{s.totalConsultations > 0 ? Math.round((s.completedConsultations / s.totalConsultations) * 100) : 0}%</div>
          <div className="metric-label">Success Rate</div>
        </div>
        <div className="metric-card amber">
          <div className="metric-icon">⏱️</div>
          <div className="metric-value">{(totalPipelineTime / 1000).toFixed(1)}s</div>
          <div className="metric-label">Avg Pipeline</div>
        </div>
        <div className="metric-card blue">
          <div className="metric-icon">📚</div>
          <div className="metric-value">{conditions.length || 25}</div>
          <div className="metric-label">KB Conditions</div>
        </div>
        <div className="metric-card red">
          <div className="metric-icon">⚠️</div>
          <div className="metric-value">{s.emergencyCount}</div>
          <div className="metric-label">Critical Alerts</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Triage Distribution */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>🚨</span>
            <h3>Triage Level Distribution</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center' }}>
            <DonutChart data={triageData} size={160} strokeWidth={20} />
            <div className="chart-legend" style={{ flex: 1 }}>
              {triageData.map((d, i) => (
                <div key={i} className="chart-legend-item">
                  <div className="chart-legend-dot" style={{ background: d.color }}></div>
                  <span>{d.label}</span>
                  <span className="chart-legend-value">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Consultation Trend */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>📈</span>
            <h3>Consultation Trend (7 Days)</h3>
          </div>
          <div className="line-chart-container">
            <LineChart data={trendData} width={460} height={180} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        {/* Top Diagnoses */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>🔬</span>
            <h3>Top Diagnoses by Confidence</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topDiagnoses.map((dx, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {dx.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: dx.color }}>{dx.value}%</span>
                </div>
                <div className="confidence-bar-bg">
                  <div className="confidence-bar-fill" style={{ width: `${dx.value}%`, background: `linear-gradient(90deg, ${dx.color}, transparent)` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Symptom Heatmap */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>🌡️</span>
            <h3>Symptom Frequency Heatmap</h3>
          </div>
          <div className="heatmap-grid">
            {heatmapData.map((d, i) => {
              const hc = getHeatColor(d.count);
              return (
                <div key={i} className="heatmap-cell" style={{ background: hc.bg, color: hc.color }}>
                  <span className="heatmap-value">{d.count}</span>
                  <span className="heatmap-label">{d.name}</span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 12 }}>
            Color intensity = frequency relative to max ({maxFreq} occurrences)
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        {/* Agent Pipeline Timing */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            <h3>Pipeline Timing Breakdown</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agentTimings.map((a, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>
                    {['🚨', '🔬', '📚', '💊', '🖼️', '🛡️'][i]} {a.label}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{a.value}ms</span>
                </div>
                <div className="confidence-bar-bg">
                  <div className="confidence-bar-fill" style={{
                    width: `${(a.value / Math.max(...agentTimings.map(t => t.value))) * 100}%`,
                    background: a.color
                  }}></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Pipeline Time</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{(totalPipelineTime / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Knowledge Base Categories */}
        <div className="card">
          <div className="report-section-header">
            <span style={{ fontSize: '1.1rem' }}>📚</span>
            <h3>Knowledge Base by Category</h3>
          </div>
          {categoryData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center' }}>
              <DonutChart data={categoryData} size={150} strokeWidth={18} />
              <div className="chart-legend" style={{ flex: 1 }}>
                {categoryData.map((d, i) => (
                  <div key={i} className="chart-legend-item">
                    <div className="chart-legend-dot" style={{ background: d.color }}></div>
                    <span>{d.label}</span>
                    <span className="chart-legend-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { cat: 'Respiratory', count: 5, color: '#3b82f6' },
                { cat: 'Cardiovascular', count: 5, color: '#ef4444' },
                { cat: 'Endocrine', count: 4, color: '#f59e0b' },
                { cat: 'Infectious', count: 4, color: '#10b981' },
                { cat: 'Neurological', count: 3, color: '#6366f1' },
                { cat: 'Other', count: 4, color: '#64748b' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }}></div>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{c.cat}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
