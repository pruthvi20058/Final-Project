import React, { useState } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { reportService } from '../../services/api';

export default function ReportUploadPage({ onNavigate, onStartAnalysis }) {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [patientId, setPatientId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileDrop = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const droppedFile = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : e.target.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(droppedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleAnalyze = async () => {
    setErrorMessage('');
    if (!file) {
      setErrorMessage('Please select a laboratory report file (PDF, JPG, PNG) first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await reportService.upload({
        file,
        patientId,
        symptoms,
        history
      });

      setIsAnalyzing(false);
      if (onStartAnalysis && result.report) {
        onStartAnalysis(result.report);
      }
    } catch (err) {
      setIsAnalyzing(false);
      setErrorMessage(err.message || 'Unable to connect to the MediAgent backend server. Please check your connection.');
    }
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>📤 Upload Laboratory Report</h2>
        <p>Upload a patient laboratory document (JPG, PNG, PDF) for backend OCR extraction, ML disease classification, and RAG decision support.</p>
      </div>

      <SafetyDisclaimer compact />

      {errorMessage && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px', color: '#fca5a5',
          fontSize: '0.88rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 10 }}>
        {/* LEFT: DRAG AND DROP ZONE */}
        <div className="card">
          <h4 style={{ color: '#fff', marginBottom: 16 }}>1. Select Laboratory Report File</h4>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('report-file-input').click()}
            style={{
              border: '2px dashed var(--accent-primary)', borderRadius: 'var(--radius-lg)',
              padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
              background: 'rgba(0, 212, 170, 0.03)', transition: 'var(--transition)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📄</div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>
              Drop laboratory report here
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              or <span style={{ color: '#00d4aa', fontWeight: 600, textDecoration: 'underline' }}>Browse files</span> from your device
            </p>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block' }}>
              Supported Formats: JPG, JPEG, PNG, PDF (Max file size: 15 MB)
            </span>
          </div>
          <input
            id="report-file-input"
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileDrop}
          />

          {file && (
            <div style={{
              marginTop: 20, padding: 14, background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.4rem' }}>{file.type.includes('pdf') ? '📕' : '🖼️'}</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#fff', display: 'block' }}>{file.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setFile(null); setFilePreview(null); }}>
                  Remove
                </button>
              </div>
              {filePreview && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <img src={filePreview} alt="Upload preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border-color)' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: OPTIONAL METADATA */}
        <div className="card">
          <h4 style={{ color: '#fff', marginBottom: 16 }}>2. Patient & Clinical Context (Optional)</h4>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Patient Identification</label>
            <select className="form-select" value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">Auto-Detect from Lab Document / Unspecified</option>
              <option value="PAT-8001">PAT-8001 — Sarah Johnson (45y, Female)</option>
              <option value="PAT-8002">PAT-8002 — Michael Chen (62y, Male)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Presenting Symptoms</label>
            <textarea className="form-input" rows={2} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="e.g. fatigue, polyuria, blurred vision..." />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Relevant Medical History</label>
            <textarea className="form-input" rows={2} value={history} onChange={e => setHistory(e.target.value)} placeholder="e.g. Type 2 Diabetes, Hypertension..." />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onNavigate('dashboard')}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? '⏳ Running OCR & ML Pipeline...' : '🤖 Upload & Run ML Pipeline →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
