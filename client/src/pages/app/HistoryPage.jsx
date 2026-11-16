import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';

export default function HistoryPage({ onNavigate }) {
  const historyTimeline = [
    { date: '2026-08-18 10:16', type: 'Clinical Sign-Off', detail: 'Dr. Pavan Kumar ACCEPTED AI decision support report for REP-9001 (Sarah Johnson).', status: 'accepted' },
    { date: '2026-08-18 10:15', type: 'Analysis Complete', detail: '11-Step agentic pipeline completed analysis for REP-9001 (Type 2 Diabetes Risk: 74%).', status: 'complete' },
    { date: '2026-08-17 14:32', type: 'Report Uploaded', detail: 'Cardiac biomarkers report uploaded for Michael Chen (PAT-8002).', status: 'analyzed' },
    { date: '2026-08-15 09:10', type: 'Patient Registered', detail: 'Emma Williams (PAT-8003) added to clinical registry.', status: 'passed' }
  ];

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>📜 Patient & System Clinical Timeline</h2>
        <p>Complete audit history of report uploads, pipeline executions, and physician sign-offs.</p>
      </div>

      <div className="card" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {historyTimeline.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid #00d4aa'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.date} • {item.type}</span>
                <p style={{ fontSize: '0.86rem', color: '#fff', marginTop: 2 }}>{item.detail}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
