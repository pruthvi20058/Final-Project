import React, { useState, useEffect } from 'react';
import { orchestratorService } from '../../services/api';
import AgentPipeline from '../../components/AgentPipeline';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';

const SCENARIOS = [
  { id: 'symptoms_only', label: 'Symptoms Only', desc: 'Describe your symptoms; agent extracts, verifies, and assesses.' },
  { id: 'lab_report_only', label: 'Lab Report Only', desc: 'Upload a lab report; agent extracts values, checks readiness, and predicts.' },
  { id: 'combined', label: 'Symptoms + Lab Report', desc: 'Provide both symptoms and a lab report for a combined assessment.' }
];

const DISEASES = [
  { id: 'diabetes', label: 'Diabetes Mellitus' },
  { id: 'dengue', label: 'Dengue Fever' },
  { id: 'malaria', label: 'Malaria' },
  { id: 'chikungunya', label: 'Chikungunya' },
  { id: 'typhoid', label: 'Typhoid Fever' }
];

export default function AgentWorkflowPage({ onNavigate }) {
  const [phase, setPhase] = useState('input'); // 'input' | 'running' | 'result'
  const [scenario, setScenario] = useState('symptoms_only');
  const [disease, setDisease] = useState('diabetes');
  const [symptomsText, setSymptomsText] = useState('');
  const [verifiedSymptoms, setVerifiedSymptoms] = useState([]);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [labFile, setLabFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [steps, setSteps] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);
  const [confirmationSymptoms, setConfirmationSymptoms] = useState([]);

  // Start assessment
  const handleStart = async () => {
    setError('');
    setLoading(true);

    const payload = {
      scenario,
      disease,
      text: symptomsText.trim() || undefined,
      language: 'en',
      userConfirmed: false,
      verifiedSymptoms: []
    };

    if (scenario === 'lab_report_only' || scenario === 'combined') {
      if (!labFile) {
        setError('Please select a lab report file.');
        setLoading(false);
        return;
      }
      // The file must be uploaded via /api/reports/upload first. The backend
      // returns a report ID which is used to reference the stored file.
      // This frontend passes the file name for display; the actual upload
      // is handled by ReportUploadPage before the agent workflow starts.
      payload.labFileName = labFile.name;
      payload.mimeType = labFile.type;
    }

    try {
      const res = await orchestratorService.startAssessment(payload);
      if (!res.success) {
        setError(res.error?.message || 'Failed to start assessment');
        setLoading(false);
        return;
      }
      setAssessment({ id: res.assessmentId, status: res.status, scenario: res.scenario });
      setWorkflowStatus(res.status);
      setPhase('running');
      startPolling(res.assessmentId);
    } catch (err) {
      setError(err.message || 'Unable to start assessment');
      setLoading(false);
    }
  };

  const startPolling = (assessmentId) => {
    const fetchStatus = async () => {
      try {
        const data = await orchestratorService.getAssessment(assessmentId);
        if (!data.success) return;
        const a = data.assessment;
        const executions = data.toolExecutions || [];
        setWorkflowStatus(a.status);
        setAssessment(a);

        // Convert executions to pipeline steps
        const pipelineSteps = executions.map((e, i) => ({
          agent: e.toolName,
          tool: e.toolName,
          status: e.status === 'COMPLETED' ? 'complete' : e.status === 'FAILED' ? 'failed' : e.status === 'SKIPPED' ? 'skipped' : 'pending',
          data: e.outputSummary || {},
          error: e.errorMessage || null,
          durationMs: e.durationMs
        }));
        setSteps(pipelineSteps);

        if (a.status === 'AWAITING_VERIFICATION') {
          clearInterval(pollInterval);
          setPhase('verification');
          // Extract symptoms from the first symptom_analysis_tool execution if available
          const sympExec = executions.find(e => e.toolName === 'symptom_analysis_tool');
          if (sympExec && sympExec.outputSummary && sympExec.outputSummary.activeSymptoms) {
            setConfirmationSymptoms(sympExec.outputSummary.activeSymptoms);
          }
        } else if (a.status === 'COMPLETED' || a.status === 'FAILED' || a.status === 'PARTIALLY_COMPLETED') {
          clearInterval(pollInterval);
          setPhase('result');
        }
      } catch (err) {
        console.warn('[AgentWorkflowPage] Poll error:', err.message);
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, 2000);
    setPollInterval(iv);
  };

  // Confirm symptoms and resume
  const handleVerify = async () => {
    setLoading(true);
    try {
      await orchestratorService.verifyAssessment(assessment.id, {
        userConfirmed: true,
        verifiedSymptoms: confirmationSymptoms,
        scenario,
        symptoms: symptomsText.trim() ? [symptomsText.trim()] : [],
        text: symptomsText.trim(),
        disease
      });
      setUserConfirmed(true);
      setPhase('running');
      startPolling(assessment.id);
    } catch (err) {
      setError(err.message || 'Verification failed');
      setLoading(false);
    }
  };

  const handleResume = () => {
    setPhase('running');
    startPolling(assessment.id);
  };

  const handleReset = () => {
    clearInterval(pollInterval);
    setPhase('input');
    setAssessment(null);
    setWorkflowStatus(null);
    setSteps([]);
    setError('');
    setUserConfirmed(false);
    setConfirmationSymptoms([]);
  };

  useEffect(() => {
    return () => clearInterval(pollInterval);
  }, []);

  const canStart = scenario === 'symptoms_only' ? symptomsText.trim().length > 0 : !!labFile;

  const statusColor = {
    CREATED: '#6b7280',
    INPUT_RECEIVED: '#3b82f6',
    PROCESSING: '#3b82f6',
    AWAITING_VERIFICATION: '#f59e0b',
    VERIFIED: '#10b981',
    ANALYZING: '#3b82f6',
    EVIDENCE_RETRIEVAL: '#0ea5e9',
    COMPLETED: '#10b981',
    PARTIALLY_COMPLETED: '#f59e0b',
    FAILED: '#ef4444'
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>
          🤖 Agentic Clinical Workflow
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-tertiary)', marginBottom: 16 }}>
          Task 7 — Agentic AI orchestration coordinates symptom analysis, lab report processing,
          verification, disease prediction, SHAP explanation, evidence retrieval, risk assessment,
          and report generation through an allowlisted tool registry.
        </p>
      </div>

      {/* Input Phase */}
      {phase === 'input' && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>
            1. Choose Assessment Scenario
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8,
                  border: `1px solid ${scenario === s.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: scenario === s.id ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{s.desc}</div>
              </button>
            ))}
          </div>

          {scenario === 'symptoms_only' || scenario === 'combined' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
                2. Describe Symptoms
              </div>
              <textarea
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g. high fever, joint pain, headache for 3 days"
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.86rem', fontFamily: 'inherit' }}
              />
            </div>
          )}

          {(scenario === 'lab_report_only' || scenario === 'combined') && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
                3. Upload Lab Report
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setLabFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: '0.82rem' }}
              />
              {labFile && (
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>
                  {labFile.name} ({(labFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                ⚠ File upload path is passed to the backend orchestrator. Ensure the file has been uploaded
                via /api/reports/upload so a server-side path is available.
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
              4. Target Disease (optional)
            </div>
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.86rem' }}
            >
              <option value="diabetes">Diabetes Mellitus (Pima model)</option>
              <option value="dengue">Dengue Fever</option>
              <option value="malaria">Malaria</option>
              <option value="chikungunya">Chikungunya</option>
              <option value="typhoid">Typhoid Fever</option>
            </select>
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading || !canStart}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, background: loading || !canStart ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color: loading || !canStart ? 'var(--text-tertiary)' : '#fff', border: 'none',
              fontSize: '0.88rem', fontWeight: 600, cursor: loading || !canStart ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Starting assessment…' : `Start ${scenario.replace('_', ' ')} Assessment`}
          </button>
        </div>
      )}

      {/* Verification Phase */}
      {phase === 'verification' && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 12, color: '#f59e0b' }}>
            ⏸ Patient Verification Required
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            The agent has extracted symptoms and paused for your confirmation before proceeding to
            disease prediction. Please review the extracted symptoms.
          </p>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 6, color: 'var(--text-tertiary)' }}>
              Extracted Symptoms
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {confirmationSymptoms.length > 0
                ? confirmationSymptoms.map((s, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)', fontSize: '0.78rem', color: 'var(--text-primary)'
                    }}>
                      {s}
                    </span>
                  ))
                : <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    No symptoms extracted. Please describe symptoms in the input phase.
                  </span>}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'start', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={userConfirmed}
                onChange={(e) => setUserConfirmed(e.target.checked)}
              />
              <span>I confirm the symptoms above are accurate and I consent to clinical assessment.</span>
            </label>
          </div>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleReset}
              style={{ flex: 1, padding: '10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || !userConfirmed}
              style={{ flex: 1, padding: '10px', borderRadius: 6, background: loading || !userConfirmed ? 'var(--bg-tertiary)' : '#f59e0b', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: loading || !userConfirmed ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Verifying…' : 'Confirm & Resume Assessment'}
            </button>
          </div>
        </div>
      )}

      {/* Running / Result Phase */}
      {(phase === 'running' || phase === 'result') && assessment && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Assessment {assessment.id} — {assessment.scenario.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Status: <span style={{ color: statusColor[workflowStatus] || '#6b7280', fontWeight: 600 }}>{workflowStatus}</span>
              </div>
            </div>
            <button onClick={handleReset} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}>
              New Assessment
            </button>
          </div>

          <AgentPipeline steps={steps} workflowStatus={workflowStatus} />

          {phase === 'result' && workflowStatus !== 'FAILED' && (
            <div style={{ marginTop: 24, padding: '18px 20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text-tertiary)' }}>
                Final Assessment Summary
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Workflow status: <strong>{workflowStatus}</strong>. Steps completed:
                {steps.filter(s => s.status === 'complete').length} of {steps.length}.
                <br />
                Retrieve the full assessment via GET /api/orchestrator/assessments/{id}.
              </div>
            </div>
          )}

          {phase === 'result' && workflowStatus === 'FAILED' && (
            <div style={{ marginTop: 24, padding: '18px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10, color: '#ef4444' }}>
                Assessment Failed
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                No tools completed successfully. Please verify your inputs and try again.
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'input' && (
        <SafetyDisclaimer />
      )}
    </div>
  );
}
