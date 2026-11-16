import { useState, useEffect } from 'react';
import { fetchPatients, createConsultation, subscribeToStream, fetchConsultation } from '../utils/api';
import AgentPipeline from './AgentPipeline';
import DiagnosticReport from './DiagnosticReport';

const COMMON_SYMPTOMS = [
  'fever','cough','headache','chest pain','shortness of breath','fatigue','nausea','vomiting',
  'dizziness','abdominal pain','back pain','joint pain','sore throat','runny nose','diarrhea',
  'constipation','rash','swelling','blurred vision','palpitations','sweating','chills',
  'weight loss','frequent urination','muscle weakness','confusion','wheezing','blood in stool',
  'difficulty swallowing','tingling','numbness','leg pain','urinary frequency','insomnia'
];

export default function ConsultationPanel({ notify }) {
  const [patients, setPatients] = useState([]);
  const [step, setStep] = useState('input'); // input | running | report
  const [selectedPatient, setSelectedPatient] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState({ systolic_bp: '', diastolic_bp: '', heart_rate: '', temperature: '', spo2: '', respiratory_rate: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [consultationId, setConsultationId] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchPatients().then(pts => {
      setPatients(pts);
      if (pts.length > 0) setSelectedPatient(pts[0].id);
    }).catch(() => {});
  }, []);

  const loadDemoData = () => {
    if (patients.length > 0) setSelectedPatient(patients[0].id);
    setChiefComplaint('Patient presents with acute chest pain radiating to left arm and shortness of breath for 2 hours');
    setSymptoms(['chest pain', 'shortness of breath', 'sweating', 'fatigue']);
    setVitals({ systolic_bp: '150', diastolic_bp: '95', heart_rate: '110', temperature: '37.2', spo2: '94', respiratory_rate: '22' });
    notify && notify('Sample chest pain clinical case loaded!', 'success');
  };

  const filteredSuggestions = COMMON_SYMPTOMS.filter(s =>
    s.includes(symptomInput.toLowerCase()) && !symptoms.includes(s)
  ).slice(0, 8);

  const addSymptom = (s) => {
    if (!symptoms.includes(s)) setSymptoms([...symptoms, s]);
    setSymptomInput('');
    setShowSuggestions(false);
  };

  const removeSymptom = (s) => setSymptoms(symptoms.filter(x => x !== s));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
  };

  const handleSubmit = async () => {
    let activePatient = selectedPatient;
    if (!activePatient && patients.length > 0) {
      activePatient = patients[0].id;
      setSelectedPatient(activePatient);
    }

    let currentSymptoms = [...symptoms];
    if (symptomInput.trim() && !currentSymptoms.includes(symptomInput.trim().toLowerCase())) {
      currentSymptoms.push(symptomInput.trim().toLowerCase());
      setSymptoms(currentSymptoms);
      setSymptomInput('');
    }

    if (currentSymptoms.length === 0 && chiefComplaint.trim()) {
      const lower = chiefComplaint.toLowerCase();
      const extracted = COMMON_SYMPTOMS.filter(s => lower.includes(s));
      if (extracted.length > 0) currentSymptoms = extracted;
      else currentSymptoms = ['chest pain', 'shortness of breath'];
      setSymptoms(currentSymptoms);
    }

    if (!activePatient) {
      notify && notify('Please select a patient or create one in Patient Panel', 'error');
      return;
    }

    if (currentSymptoms.length === 0) {
      currentSymptoms = ['chest pain', 'fever'];
      setSymptoms(currentSymptoms);
    }

    const vitalsData = {};
    Object.entries(vitals).forEach(([k, v]) => { if (v) vitalsData[k] = parseFloat(v); });

    setStep('running');
    setPipelineSteps([
      { agent: 'Triage Agent', icon: '🚨', status: 'pending' },
      { agent: 'Diagnostic Agent', icon: '🔬', status: 'pending' },
      { agent: 'RAG Agent', icon: '📚', status: 'pending' },
      { agent: 'Medication Agent', icon: '💊', status: 'pending' },
      ...(uploadedFiles.length > 0 ? [{ agent: 'Imaging Agent', icon: '🖼️', status: 'pending' }] : []),
      { agent: 'Guardrail Agent', icon: '🛡️', status: 'pending' },
    ]);

    try {
      const result = await createConsultation({
        patient_id: activePatient,
        symptoms: currentSymptoms,
        vitals: vitalsData,
        chief_complaint: chiefComplaint || currentSymptoms.join(', '),
        uploaded_images: uploadedFiles
      });

      setConsultationId(result.id);

      // SSE subscription
      const es = subscribeToStream(result.id, (data) => {
        setPipelineSteps(prev => prev.map(s =>
          s.agent === data.agent ? { ...s, status: data.status, data: data.data } : s
        ));

        if (data.agent === 'Pipeline' && data.status === 'complete') {
          es.close();
          setTimeout(() => {
            fetchConsultation(result.id).then(c => {
              setReport(c.final_report || c);
              setStep('report');
            });
          }, 600);
        }
      });

      // Periodic polling safety net to guarantee transition to report
      const pollInterval = setInterval(async () => {
        try {
          const c = await fetchConsultation(result.id);
          if (c && c.status === 'complete') {
            clearInterval(pollInterval);
            try { es.close(); } catch {}
            setReport(c.final_report || c);
            setStep('report');
          }
        } catch {}
      }, 1500);

      // Safety limit for poll interval
      setTimeout(() => clearInterval(pollInterval), 20000);
    } catch (err) {
      notify && notify('Failed to start consultation', 'error');
      setStep('input');
    }
  };

  const resetConsultation = () => {
    setStep('input');
    setSymptoms([]);
    setChiefComplaint('');
    setVitals({ systolic_bp: '', diastolic_bp: '', heart_rate: '', temperature: '', spo2: '', respiratory_rate: '' });
    setUploadedFiles([]);
    setPipelineSteps([]);
    setReport(null);
    setConsultationId(null);
  };

  if (step === 'running') {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h2>🤖 Agent Pipeline Running</h2>
          <p>Multi-agent analysis in progress — streaming results in real-time</p>
        </div>
        <AgentPipeline steps={pipelineSteps} />
      </div>
    );
  }

  if (step === 'report') {
    return (
      <div className="fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h2>📋 Diagnostic Report</h2><p>AI-generated clinical decision support — Review required</p></div>
          <button className="btn btn-primary" onClick={resetConsultation}>+ New Consultation</button>
        </div>
        <DiagnosticReport report={report} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>🤖 AI Consultation</h2>
          <p>Enter patient data and symptoms to run the multi-agent diagnostic pipeline</p>
        </div>
        <button className="btn btn-secondary" onClick={loadDemoData} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent-primary)' }}>
          ⚡ Quick Demo Case (Chest Pain)
        </button>
      </div>

      <div className="grid-2">
        <div>
          {/* Patient Selection */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 12 }}>1. Select Patient</h4>
            <select className="form-select" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
              <option value="">Choose a patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.age}y, {p.gender}</option>
              ))}
            </select>
          </div>

          {/* Symptoms */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 12 }}>2. Symptoms</h4>
            <div className="form-group">
              <label>Chief Complaint</label>
              <input className="form-input" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)}
                placeholder="e.g. Patient presents with persistent cough and fever for 3 days" />
            </div>
            <div className="form-group">
              <label>Add Symptoms</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" value={symptomInput}
                  onChange={e => { setSymptomInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Enter' && symptomInput.trim()) { addSymptom(symptomInput.trim().toLowerCase()); } }}
                  placeholder="Type a symptom (e.g. chest pain, fever)..." />
                {showSuggestions && symptomInput && filteredSuggestions.length > 0 && (
                  <div className="symptom-suggestions">
                    {filteredSuggestions.map(s => (
                      <div key={s} className="symptom-suggestion" onClick={() => addSymptom(s)}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="symptom-chips" style={{ marginTop: 10 }}>
                {symptoms.map(s => (
                  <span key={s} className="chip chip-teal">
                    {s} <span className="chip-remove" onClick={() => removeSymptom(s)}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Quick Add: {' '}
                {['chest pain', 'fever', 'cough', 'shortness of breath', 'headache'].map(s => (
                  <button key={s} type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.72rem', margin: '2px' }}
                    onClick={() => addSymptom(s)}>
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Vitals */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 12 }}>3. Vital Signs</h4>
            <div className="vitals-grid">
              {[
                { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', ph: '120' },
                { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', ph: '80' },
                { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', ph: '72' },
                { key: 'temperature', label: 'Temp', unit: '°C', ph: '37.0' },
                { key: 'spo2', label: 'SpO2', unit: '%', ph: '98' },
                { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', ph: '16' },
              ].map(v => (
                <div key={v.key} className="form-group vital-input">
                  <label>{v.label} ({v.unit})</label>
                  <input className="form-input" type="number" value={vitals[v.key]}
                    onChange={e => setVitals({ ...vitals, [v.key]: e.target.value })}
                    placeholder={v.ph} />
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 12 }}>4. Medical Images (Optional)</h4>
            <div className="upload-zone" onClick={() => document.getElementById('file-upload').click()}>
              <div className="upload-icon">📎</div>
              <p>Click to upload X-rays, CT scans, lab reports</p>
              <p style={{ fontSize: '0.72rem', marginTop: 4 }}>Supports JPG, PNG, PDF — Max 10MB</p>
            </div>
            <input id="file-upload" type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
            {uploadedFiles.length > 0 && (
              <div className="symptom-chips" style={{ marginTop: 10 }}>
                {uploadedFiles.map((f, i) => (
                  <span key={i} className="chip chip-blue">
                    📄 {f} <span className="chip-remove" onClick={() => setUploadedFiles(uploadedFiles.filter((_, j) => j !== i))}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <button className="btn btn-secondary btn-lg" onClick={loadDemoData}>
          ⚡ Auto-Fill Demo Case
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit}
          style={{ minWidth: 280, boxShadow: '0 4px 20px rgba(0, 212, 170, 0.3)' }}>
          🤖 Run AI Analysis Pipeline
        </button>
      </div>
    </div>
  );
}
