import { useState, useEffect, useRef } from 'react';

const AGENT_CONFIG = {
  'symptom_analysis_tool':     { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  icon: '🩺', desc: 'Symptom extraction & validation' },
  'lab_report_analysis_tool':  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)',  icon: '📄', desc: 'Lab report OCR & value extraction' },
  'data_verification_tool':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',  icon: '✅', desc: 'Patient verification gate' },
  'disease_readiness_tool':    { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)',  icon: '🔍', desc: 'Disease model readiness check' },
  'disease_prediction_tool':   { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)',  icon: '🔬', desc: 'ML disease prediction' },
  'shap_explanation_tool':     { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)',  icon: '📊', desc: 'SHAP feature attribution' },
  'medical_evidence_tool':     { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)',  icon: '📚', desc: 'Medical evidence retrieval (RAG)' },
  'risk_assessment_tool':      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',  icon: '⚖️', desc: 'Clinical risk assessment' },
  'report_generation_tool':    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  icon: '📋', desc: 'Final assessment report' }
};

// Legacy agent names for backward compatibility with existing SSE pipeline
const LEGACY_AGENT_MAP = {
  'Triage Agent':     { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  icon: '🚨', desc: 'Urgency & vitals classification' },
  'Diagnostic Agent': { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', icon: '🔬', desc: 'Differential diagnosis generation' },
  'RAG Agent':        { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: '📚', desc: 'Evidence-based knowledge retrieval' },
  'Medication Agent': { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', icon: '💊', desc: 'Drug recommendations & interaction check' },
  'Imaging Agent':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: '🖼️', desc: 'Medical image pattern analysis' },
  'Guardrail Agent':  { color: '#00d4aa', bg: 'rgba(0,212,170,0.08)',  border: 'rgba(0,212,170,0.25)',  icon: '🛡️', desc: 'Safety validation & compliance' }
};

function cfgFor(step) {
  const key = step.agent || step.tool;
  return AGENT_CONFIG[key] || LEGACY_AGENT_MAP[key] || {
    color: '#888', bg: 'rgba(136,136,136,0.08)', border: 'rgba(136,136,136,0.2)', icon: '🤖', desc: ''
  };
}

function PulsingRing({ color }) {
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${color}`, opacity: 0.3, animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }} />
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: `2px solid ${color}`, opacity: 0.5, animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite 0.3s' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
        <div className="spinner" style={{ width: 18, height: 18, borderColor: `${color}33`, borderTopColor: color }} />
      </div>
    </div>
  );
}

function CompletedCheck({ color }) {
  return (
    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', animation: 'fadeIn 0.4s ease' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={`${color}22`} stroke={color} strokeWidth="1.5" />
        <path d="M8 12l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function PendingBubble({ icon }) {
  return (
    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', opacity: 0.45 }}>
      {icon}
    </div>
  );
}

function FailedBubble({ color }) {
  return (
    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: `2px solid ${color || '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
    ⚠
    </div>
  );
}

function AgentCard({ step, index, totalSteps, elapsedMs }) {
  const cfg = cfgFor(step);
  const agentName = step.agent || step.tool || 'Unknown';
  const isRunning = step.status === 'running';
  const isComplete = step.status === 'complete' || step.status === 'COMPLETED' || step.status === 'SUCCESS' || step.status === 'VERIFIED';
  const isFailed = step.status === 'failed' || step.status === 'FAILED';
  const isSkipped = step.status === 'skipped' || step.status === 'SKIPPED';
  const isPending = step.status === 'pending' || step.status === 'PENDING' || step.status === 'AWAITING_VERIFICATION';

  // Extract key result snippet
  let resultSnippet = null;
  const data = step.data || step.outputSummary || {};
  if (isComplete && data) {
    if (data.triageLevel) resultSnippet = `Triage: ${data.triageLevel} (score ${data.triageScore}/100)`;
    else if (data.primaryDiagnosis) resultSnippet = `Primary: ${data.primaryDiagnosis.condition} (${data.primaryDiagnosis.confidence}%)`;
    else if (data.recommendedMedications?.length) resultSnippet = `${data.recommendedMedications.length} medications recommended`;
    else if (data.retrievedDocuments?.length) resultSnippet = `${data.retrievedDocuments.length} evidence documents retrieved`;
    else if (data.findings?.length) resultSnippet = `${data.findings.length} imaging finding(s) found`;
    else if (data.overallRisk) resultSnippet = `Risk level: ${data.overallRisk?.toUpperCase()}`;
    else if (data.activeSymptoms?.length) resultSnippet = `${data.activeSymptoms.length} active symptom(s) extracted`;
    else if (data.availableFeatures?.length) resultSnippet = `${data.availableFeatures.length}/${data.requiredFeatures?.length || '?'} features available`;
    else if (data.predictedOutcome) resultSnippet = `${data.predictedOutcome} (${(data.displayProbabilityPct || 0).toFixed(1)}%)`;
    else if (data.retrievedEvidenceCount) resultSnippet = `${data.retrievedEvidenceCount} evidence source(s) retrieved`;
    else if (data.riskScore !== undefined) resultSnippet = `Risk: ${data.overallRisk || '—'} (${data.riskScore || '—'})`;
    else if (data.recommendation) resultSnippet = data.recommendation;
  }

  const flags = isComplete && (data?.flags || step.flags);
  const reasoning = isComplete && (data?.reasoning || step.reasoning);
  const error = step.error || (data && data.error);

  return (
    <div style={{
      display: 'flex', gap: 0, alignItems: 'flex-start',
      animation: 'fadeIn 0.4s ease',
      animationDelay: `${index * 0.05}s`, animationFillMode: 'both'
    }}>
      {/* Vertical connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16, paddingTop: 0 }}>
        {isRunning ? <PulsingRing color={cfg.color} /> :
         isComplete ? <CompletedCheck color={cfg.color} /> :
         isFailed ? <FailedBubble color={cfg.color} /> :
         isSkipped ? <PendingBubble icon={cfg.icon} /> :
                      <PendingBubble icon={cfg.icon} />}
        {index < totalSteps - 1 && (
          <div style={{
            width: 2, flex: 1, minHeight: 20,
            background: isComplete
              ? `linear-gradient(180deg, ${cfg.color}80, var(--border-color))`
              : isFailed ? 'rgba(239,68,68,0.3)' : 'var(--border-color)',
            marginTop: 6, borderRadius: 2,
            transition: 'background 0.5s'
          }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: index < totalSteps - 1 ? 16 : 0,
        background: isRunning ? cfg.bg : isComplete ? cfg.bg : isFailed ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
        border: `1px solid ${isRunning ? cfg.border : isComplete ? cfg.border : isFailed ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        transition: 'all 0.4s ease',
        boxShadow: isRunning ? `0 0 20px ${cfg.color}20` : isComplete ? `0 2px 12px ${cfg.color}10` : isFailed ? `0 2px 12px rgba(239,68,68,0.15)` : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isComplete || isRunning ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isPending ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {agentName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 1 }}>{cfg.desc}</div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isRunning && elapsedMs > 0 && (
              <span style={{ fontSize: '0.72rem', color: cfg.color, fontVariantNumeric: 'tabular-nums' }}>
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em',
              background: isRunning ? cfg.color : isComplete ? `${cfg.color}22` : isFailed ? 'rgba(239,68,68,0.15)' : isSkipped ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
              color: isRunning ? '#fff' : isComplete ? cfg.color : isFailed ? '#ef4444' : 'var(--text-tertiary)',
              border: `1px solid ${isRunning ? cfg.color : isComplete ? `${cfg.color}44` : isFailed ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
              textTransform: 'uppercase',
              animation: isRunning ? 'pulse 1.5s ease infinite' : 'none'
            }}>
              {isSkipped ? 'SKIPPED' : step.status}
            </span>
          </div>
        </div>

        {/* Running message */}
        {isRunning && step.data?.message && (
          <div style={{ fontSize: '0.83rem', color: cfg.color, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ animation: 'ellipsis 1.5s infinite' }}>▶</span>
            {step.data.message}
          </div>
        )}

        {/* Error message */}
        {isFailed && error && (
          <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 6, background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #ef4444' }}>
            {error.length > 120 ? error.slice(0, 120) + '…' : error}
          </div>
        )}

        {/* Complete: result summary */}
        {isComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {resultSnippet && (
              <div style={{
                fontSize: '0.83rem', color: cfg.color, fontWeight: 600,
                padding: '6px 10px', background: `${cfg.color}12`, borderRadius: 6,
                borderLeft: `3px solid ${cfg.color}`
              }}>
                {resultSnippet}
              </div>
            )}

            {/* Flags / warnings */}
            {flags && flags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {flags.slice(0, 2).map((f, i) => (
                  <span key={i} style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20,
                    background: f.type === 'CRITICAL' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: f.type === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                    border: `1px solid ${f.type === 'CRITICAL' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`
                  }}>
                    {f.type === 'CRITICAL' ? '🔴' : '🟡'} {f.message.length > 45 ? f.message.slice(0, 45) + '…' : f.message}
                  </span>
                ))}
                {flags.length > 2 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', padding: '2px 8px' }}>
                    +{flags.length - 2} more
                  </span>
                )}
              </div>
            )}

            {/* Last reasoning step */}
            {reasoning && reasoning.length > 0 && (
              <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', gap: 5 }}>
                <span style={{ color: cfg.color }}>→</span>
                <span>{reasoning[reasoning.length - 1].action}: {reasoning[reasoning.length - 1].detail?.slice(0, 60)}{reasoning[reasoning.length - 1].detail?.length > 60 ? '…' : ''}</span>
              </div>
            )}
          </div>
        )}

        {isPending && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            {step.status === 'AWAITING_VERIFICATION' ? '⏸ Waiting for patient verification…' : 'Queued — waiting for upstream agents'}
          </div>
        )}

        {isSkipped && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            ⏭ Skipped — upstream dependency unavailable
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPipeline({ steps, workflowStatus, onVerify }) {
  const completedCount = steps.filter(s => s.status === 'complete' || s.status === 'COMPLETED' || s.status === 'SUCCESS' || s.status === 'VERIFIED').length;
  const failedCount = steps.filter(s => s.status === 'failed' || s.status === 'FAILED').length;
  const skippedCount = steps.filter(s => s.status === 'skipped' || s.status === 'SKIPPED').length;
  const runningStep = steps.find(s => s.status === 'running');
  const pendingStep = steps.find(s => s.status === 'pending' || s.status === 'PENDING' || s.status === 'AWAITING_VERIFICATION');
  const allComplete = steps.length > 0 && steps.every(s => s.status === 'complete' || s.status === 'COMPLETED' || s.status === 'SUCCESS' || s.status === 'VERIFIED');
  const allDone = allComplete || workflowStatus === 'COMPLETED' || workflowStatus === 'PARTIALLY_COMPLETED' || workflowStatus === 'FAILED';

  const [elapsed, setElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const stepStartRef = useRef(Date.now());

  useEffect(() => {
    const active = runningStep || pendingStep;
    if (active) stepStartRef.current = Date.now();
  }, [runningStep, pendingStep]);

  useEffect(() => {
    if (allDone) return;
    const iv = setInterval(() => {
      setElapsed(Date.now() - stepStartRef.current);
      setTotalElapsed(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(iv);
  }, [allDone]);

  const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const statusLabels = {
    CREATED: 'Created — awaiting start',
    INPUT_RECEIVED: 'Input received',
    PROCESSING: 'Processing in progress',
    AWAITING_VERIFICATION: 'Awaiting patient verification',
    VERIFIED: 'Verified — resuming assessment',
    ANALYZING: 'Analyzing clinical data',
    EVIDENCE_RETRIEVAL: 'Retrieving medical evidence',
    COMPLETED: 'Completed',
    PARTIALLY_COMPLETED: 'Partially completed',
    FAILED: 'Failed'
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Overall Progress Header */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {workflowStatus === 'AWAITING_VERIFICATION'
                ? '⏸ Assessment Paused — Verification Required'
                : allDone
                  ? workflowStatus === 'FAILED' ? '❌ Assessment Failed' : workflowStatus === 'PARTIALLY_COMPLETED' ? '⚠️ Assessment Partially Complete' : '✅ Pipeline Complete'
                  : runningStep ? `⚡ Running: ${cfgFor(runningStep).desc || runningStep.agent || runningStep.tool}`
                  : '⏳ Initializing Pipeline…'
              }
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
              {allDone
                ? (workflowStatus === 'FAILED' ? 'No tools completed successfully.'
                   : workflowStatus === 'PARTIALLY_COMPLETED' ? `${completedCount} of ${steps.length} steps complete, ${failedCount} failed, ${skippedCount} skipped`
                   : `All ${steps.length} steps finished in ${(totalElapsed / 1000).toFixed(1)}s`)
                : `${completedCount} of ${steps.length} steps complete${failedCount > 0 ? `, ${failedCount} failed` : ''}${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {Math.round(progressPct)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Progress</div>
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          background: workflowStatus === 'AWAITING_VERIFICATION' ? 'rgba(245,158,11,0.12)' :
                      workflowStatus === 'FAILED' ? 'rgba(239,68,68,0.12)' :
                      workflowStatus === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
          color: workflowStatus === 'AWAITING_VERIFICATION' ? '#f59e0b' :
                 workflowStatus === 'FAILED' ? '#ef4444' :
                 workflowStatus === 'COMPLETED' ? '#10b981' : '#3b82f6',
          border: '1px solid rgba(59,130,246,0.3)',
          marginBottom: 10, display: 'inline-block'
        }}>
          {typeof statusLabels === 'object' && statusLabels[workflowStatus] ? statusLabels[workflowStatus] : workflowStatus}
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 8,
            width: `${progressPct}%`,
            background: allDone
              ? workflowStatus === 'FAILED' ? 'linear-gradient(90deg, #ef4444, #dc2626)' : workflowStatus === 'PARTIALLY_COMPLETED' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, var(--accent-success), #059669)'
              : 'linear-gradient(90deg, var(--accent-primary), #6366f1)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: allDone && workflowStatus !== 'FAILED' ? '0 0 12px rgba(16,185,129,0.4)' : '0 0 12px rgba(0,212,170,0.4)'
          }} />
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
          {steps.map((s, i) => {
            const cfg = cfgFor(s);
            const isComplete = s.status === 'complete' || s.status === 'COMPLETED' || s.status === 'SUCCESS' || s.status === 'VERIFIED';
            const isFailed = s.status === 'failed' || s.status === 'FAILED';
            return (
              <div key={i} title={`${s.agent || s.tool}: ${s.status}`} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isComplete ? cfg.color : isFailed ? '#ef4444' : s.status === 'running' ? cfg.color : 'var(--border-color)',
                opacity: (s.status === 'pending' || s.status === 'PENDING') ? 0.35 : 1,
                transition: 'all 0.4s',
                boxShadow: s.status === 'running' ? `0 0 6px ${cfg.color}` : 'none',
                animation: s.status === 'running' ? 'pulse 1s ease infinite' : 'none'
              }} />
            );
          })}
        </div>

        {/* Verification gate notice */}
        {workflowStatus === 'AWAITING_VERIFICATION' && onVerify && (
          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>
              ⏸ Patient verification required to continue
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              The assessment is paused until you confirm your symptoms. Please review and confirm to resume.
            </div>
            <button onClick={onVerify} style={{
              background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px',
              borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
            }}>
              Confirm Symptoms & Resume
            </button>
          </div>
        )}
      </div>

      {/* Agent Cards */}
      <div>
        {steps.map((step, i) => (
          <AgentCard
            key={step.agent || step.tool || i}
            step={step}
            index={i}
            totalSteps={steps.length}
            elapsedMs={(runningStep && (runningStep.agent === step.agent || runningStep.tool === step.tool) ? elapsed : 0)}
          />
        ))}
      </div>

      {/* All complete banner */}
      {allDone && workflowStatus === 'COMPLETED' && (
        <div style={{
          marginTop: 24, padding: '18px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(0,212,170,0.08))',
          border: '1px solid rgba(16,185,129,0.3)', animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-success)' }}>
            All {steps.length} Agents Complete
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Final assessment report is ready.
          </div>
        </div>
      )}

      {allDone && workflowStatus === 'FAILED' && (
        <div style={{
          marginTop: 24, padding: '18px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>❌</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ef4444' }}>
            Assessment Failed
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            No tools completed successfully. Please check inputs and try again.
          </div>
        </div>
      )}

      {allDone && workflowStatus === 'PARTIALLY_COMPLETED' && (
        <div style={{
          marginTop: 24, padding: '18px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f59e0b' }}>
            Partially Completed
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Some steps failed or were skipped. Review available results below.
          </div>
        </div>
      )}
    </div>
  );
}
