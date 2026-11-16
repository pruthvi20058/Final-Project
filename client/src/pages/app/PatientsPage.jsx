import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import { DEMO_PATIENTS } from '../../services/api';

export default function PatientsPage({ onNavigate, onSelectPatient }) {
  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🏥 Patient Clinical Registry</h2>
          <p>Active patient profiles, medical histories, and laboratory records.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {DEMO_PATIENTS.map(p => (
          <div key={p.id} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <strong style={{ color: '#fff', fontSize: '1.1rem', display: 'block' }}>{p.name}</strong>
                <span style={{ fontSize: '0.75rem', color: '#00d4aa' }}>ID: {p.id}</span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                {p.age}y, {p.gender}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              <div>Blood Group: <strong style={{ color: '#fff' }}>{p.bloodType}</strong></div>
              <div>Allergies: <span style={{ color: p.allergies.length ? '#ef4444' : 'var(--text-tertiary)' }}>{p.allergies.join(', ') || 'None'}</span></div>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.78rem' }} onClick={() => { onSelectPatient(p.id); onNavigate('patient-details'); }}>
              View Clinical Profile & Timeline →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
