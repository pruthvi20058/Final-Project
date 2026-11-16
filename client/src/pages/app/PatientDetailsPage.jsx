import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { DEMO_PATIENTS, reportService } from '../../services/api';

export default function PatientDetailsPage({ patientId = 'PAT-8001', onNavigate }) {
  const patient = DEMO_PATIENTS.find(p => p.id === patientId) || DEMO_PATIENTS[0];
  const [patientReports, setPatientReports] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      const reports = await reportService.list();
      if (mounted) {
        setPatientReports(reports.filter(r => r.patientId === patient.id || r.patientId === patientId));
      }
    }
    loadReports();
    return () => { mounted = false; };
  }, [patient.id, patientId]);

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🏥 Patient Clinical Profile: {patient.name}</h2>
          <p>ID: {patient.id} • {patient.age} years old • {patient.gender} • Blood Type: {patient.bloodType}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
          + Upload New Lab Report
        </button>
      </div>

      <div className="grid-2">
        {/* LEFT COLUMN: DEMOGRAPHICS & CLINICAL HISTORY */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#fff', marginBottom: 12 }}>Patient Vitals & Demographics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.86rem' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>Age / Gender</span>
                <strong style={{ color: '#fff' }}>{patient.age}y / {patient.gender}</strong>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>Weight / Height</span>
                <strong style={{ color: '#fff' }}>{patient.weight} kg / {patient.height} cm</strong>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>Blood Group</span>
                <strong style={{ color: '#00d4aa' }}>{patient.bloodType}</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#fff', marginBottom: 12 }}>Known Allergies & Contraindications</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {patient.allergies.length > 0 ? (
                patient.allergies.map(a => (
                  <span key={a} style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                    ⛔ {a}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>No known drug allergies reported</span>
              )}
            </div>
          </div>

          <div className="card">
            <h4 style={{ color: '#fff', marginBottom: 12 }}>Current Active Medications</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patient.currentMedications.map(m => (
                <div key={m} style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8, fontSize: '0.86rem', color: '#fff', borderLeft: '3px solid #00d4aa' }}>
                  💊 {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HISTORICAL REPORTS & CLINICAL TIMELINE */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#fff', marginBottom: 12 }}>Diagnosed Medical History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patient.medicalHistory.map((mh, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8 }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.88rem', display: 'block' }}>{mh.condition}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Diagnosed: {mh.diagnosed}</span>
                  </div>
                  <StatusBadge status={mh.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#fff' }}>Laboratory Reports Timeline</h4>
              <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => onNavigate('trends')}>
                View Longitudinal Trends →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {patientReports.length > 0 ? (
                patientReports.map(r => (
                  <div key={r.id} style={{
                    padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.88rem', display: 'block' }}>{r.filename}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Uploaded: {r.uploadDate}</span>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => onNavigate('predictions')}>
                      Inspect Analysis
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>No uploaded laboratory reports for this patient yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
