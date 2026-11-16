import { useState, useEffect } from 'react';
import { fetchPatients, createPatient } from '../utils/api';

export default function PatientPanel({ notify }) {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', blood_type: '', weight: '', height: '', allergies: '', current_medications: '', emergency_contact: '' });

  useEffect(() => { loadPatients(); }, []);
  const loadPatients = () => fetchPatients().then(setPatients).catch(() => {});

  const handleCreate = async () => {
    if (!form.name || !form.age || !form.gender) return;
    await createPatient({
      ...form, age: parseInt(form.age), weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
      current_medications: form.current_medications ? form.current_medications.split(',').map(s => s.trim()) : []
    });
    notify('Patient created successfully');
    setShowModal(false);
    setForm({ name: '', age: '', gender: 'Male', blood_type: '', weight: '', height: '', allergies: '', current_medications: '', emergency_contact: '' });
    loadPatients();
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h2>Patients</h2><p>Patient registry and medical records</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Patient</button>
      </div>

      <div className="grid-2">
        <div>
          <div className="patient-list">
            {patients.map(p => (
              <div key={p.id} className={`patient-row ${selected?.id === p.id ? 'selected' : ''}`} onClick={() => setSelected(p)}>
                <div className="patient-avatar">{p.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="patient-info">
                  <h4>{p.name}</h4>
                  <p>{p.age}y • {p.gender} • {p.blood_type || 'N/A'}</p>
                </div>
                {p.allergies?.length > 0 && <span className="chip chip-red">⚠ Allergies</span>}
              </div>
            ))}
          </div>
        </div>

        <div>
          {selected ? (
            <div className="card slide-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div className="patient-avatar" style={{ width: 56, height: 56, fontSize: '1.3rem' }}>{selected.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>{selected.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selected.age}y • {selected.gender} • Blood Type: {selected.blood_type || 'N/A'}</p>
                </div>
              </div>
              <hr className="section-divider" />

              <div className="report-section">
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Vitals Info</h4>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.88rem' }}>
                  <span>Weight: <strong>{selected.weight || '—'} kg</strong></span>
                  <span>Height: <strong>{selected.height || '—'} cm</strong></span>
                </div>
              </div>

              {selected.allergies?.length > 0 && (
                <div className="report-section">
                  <h4 style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>⚠ Allergies</h4>
                  <div className="symptom-chips">
                    {selected.allergies.map((a, i) => <span key={i} className="chip chip-red">{a}</span>)}
                  </div>
                </div>
              )}

              {selected.medical_history?.length > 0 && (
                <div className="report-section">
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Medical History</h4>
                  {selected.medical_history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <span>{h.condition}</span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>Since {h.diagnosed}</span>
                        <span className={`chip ${h.status === 'ongoing' ? 'chip-amber' : h.status === 'managed' ? 'chip-teal' : 'chip-blue'}`}>{h.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selected.current_medications?.length > 0 && (
                <div className="report-section">
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Current Medications</h4>
                  <div className="symptom-chips">
                    {selected.current_medications.map((m, i) => <span key={i} className="chip chip-indigo">💊 {m}</span>)}
                  </div>
                </div>
              )}

              {selected.emergency_contact && (
                <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  📞 Emergency: {selected.emergency_contact}
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3>Select a patient</h3>
                <p>Click on a patient to view their details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Add New Patient</h3>
            <div className="form-group"><label>Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter patient name" /></div>
            <div className="grid-2">
              <div className="form-group"><label>Age *</label><input className="form-input" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
              <div className="form-group"><label>Gender *</label><select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label>Blood Type</label><input className="form-input" value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })} placeholder="e.g. A+" /></div>
              <div className="form-group"><label>Weight (kg)</label><input className="form-input" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Allergies (comma separated)</label><input className="form-input" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Sulfa" /></div>
            <div className="form-group"><label>Current Medications (comma separated)</label><input className="form-input" value={form.current_medications} onChange={e => setForm({ ...form, current_medications: e.target.value })} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" /></div>
            <div className="form-group"><label>Emergency Contact</label><input className="form-input" value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create Patient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
