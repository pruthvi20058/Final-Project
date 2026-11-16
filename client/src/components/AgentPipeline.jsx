import { useState, useEffect, useRef } from 'react';

const AGENT_CONFIG = {
  'Triage Agent':     { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  icon: '🚨', desc: 'Urgency & vitals classification' },
  'Diagnostic Agent': { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', icon: '🔬', desc: 'Differential diagnosis generation' },
  'RAG Agent':        { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: '📚', desc: 'Evidence-based knowledge retrieval' },
  'Medication Agent': { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', icon: '💊', desc: 'Drug recommendations & interaction check' },
  'Imaging Agent':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: '🖼️', desc: 'Medical image pattern analysis' },
  'Guardrail Agent':  { color: '#00d4aa', bg: 'rgba(0,212,170,0.08)',  border: 'rgba(0,212,170,0.25)', icon: '🛡️', desc: 'Safety validation & compliance' },
};

function PulsingRing({ color }) {
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid ${color}`, opacity: 0.3,
        animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite'
      }} />
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        border: `2px solid ${color}`, opacity: 0.5,
        animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite 0.3s'
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `${color}22`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem'
      }}>
        <div className="spinner" style={{ width: 18, height: 18, borderColor: `${color}33`, borderTopColor: color }} />
      </div>
    </div>
  );
}

function CompletedCheck({ color }) {
  return (
    <div style={{
      width: 48, height: 48, flexShrink: 0, borderRadius: '50%',
      background: `${color}18`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.3rem', animation: 'fadeIn 0.4s ease'
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={`${color}22`} stroke={color} strokeWidth="1.5"/>
        <path d="M8 12l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function PendingBubble({ icon }) {
  return (
    <div style={{
      width: 48, height: 48, flexShrink: 0, borderRadius: '50%',
      background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.3rem', opacity: 0.45
    }}>
      {icon}
    </div>
  );
}

function AgentCard({ step, index, totalSteps, elapsedMs }) {
  const cfg = AGENT_CONFIG[step.agent] || {
    color: '#888', bg: 'rgba(136,136,136,0.08)', border: 'rgba(136,136,136,0.2)', icon: '🤖', desc: ''
  };
  const isRunning = step.status === 'running';
  const isComplete = step.status === 'complete';
  const isPending = step.status === 'pending';

  // Extract key result snippet
  let resultSnippet = null;
  if (isComplete && step.data) {
    if (step.data.triageLevel) resultSnippet = `Triage: ${step.data.triageLevel} (score ${step.data.triageScore}/100)`;
    else if (step.data.primaryDiagnosis) resultSnippet = `Primary: ${step.data.primaryDiagnosis.condition} (${step.data.primaryDiagnosis.confidence}%)`;
    else if (step.data.recommendedMedications?.length) resultSnippet = `${step.data.recommendedMedications.length} medications recommended`;
    else if (step.data.retrievedDocuments?.length) resultSnippet = `${step.data.retrievedDocuments.length} evidence documents retrieved`;
    else if (step.data.findings?.length) resultSnippet = `${step.data.findings.length} imaging finding(s) found`;
    else if (step.data.overallRisk) resultSnippet = `Risk level: ${step.data.overallRisk?.toUpperCase()}`;
    else if (step.data.recommendation) resultSnippet = step.data.recommendation;
  }

  const flags = isComplete && step.data?.flags;
  const reasoning = isComplete && step.data?.reasoning;

  return (
    <div style={{
      display: 'flex', gap: 0, alignItems: 'flex-start',
      animation: 'fadeIn 0.4s ease',
      animationDelay: `${index * 0.05}s`, animationFillMode: 'both'
    }}>
      {/* Vertical connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16, paddingTop: 0 }}>
        {isRunning  ? <PulsingRing color={cfg.color} /> :
         isComplete ? <CompletedCheck color={cfg.color} /> :
                      <PendingBubble icon={cfg.icon} />}
        {index < totalSteps - 1 && (
          <div style={{
            width: 2, flex: 1, minHeight: 20,
            background: isComplete
              ? `linear-gradient(180deg, ${cfg.color}80, var(--border-color))`
              : 'var(--border-color)',
            marginTop: 6, borderRadius: 2,
            transition: 'background 0.5s'
          }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: index < totalSteps - 1 ? 16 : 0,
        background: isRunning ? cfg.bg : isComplete ? cfg.bg : 'var(--bg-secondary)',
        border: `1px solid ${isRunning ? cfg.border : isComplete ? cfg.border : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        transition: 'all 0.4s ease',
        boxShadow: isRunning ? `0 0 20px ${cfg.color}20` : isComplete ? `0 2px 12px ${cfg.color}10` : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isComplete || isRunning ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isPending ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {step.agent}
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
              background: isRunning ? cfg.color : isComplete ? `${cfg.color}22` : 'var(--bg-tertiary)',
              color: isRunning ? '#fff' : isComplete ? cfg.color : 'var(--text-tertiary)',
              border: `1px solid ${isRunning ? cfg.color : isComplete ? `${cfg.color}44` : 'var(--border-color)'}`,
              textTransform: 'uppercase',
              animation: isRunning ? 'pulse 1.5s ease infinite' : 'none'
            }}>
              {step.status}
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
            Queued — waiting for upstream agents
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPipeline({ steps }) {
  const completedCount = steps.filter(s => s.status === 'complete').length;
  const runningStep = steps.find(s => s.status === 'running');
  const allComplete = steps.every(s => s.status === 'complete');
  const [elapsed, setElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const stepStartRef = useRef(Date.now());

  useEffect(() => {
    if (runningStep) stepStartRef.current = Date.now();
  }, [runningStep?.agent]);

  useEffect(() => {
    if (allComplete) return;
    const iv = setInterval(() => {
      setElapsed(Date.now() - stepStartRef.current);
      setTotalElapsed(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(iv);
  }, [allComplete]);

  const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Overall Progress Header */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {allComplete ? '✅ Pipeline Complete' : runningStep ? `⚡ Running: ${runningStep.agent}` : '⏳ Initializing Pipeline...'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
              {allComplete
                ? `All ${steps.length} agents finished in ${(totalElapsed / 1000).toFixed(1)}s`
                : `${completedCount} of ${steps.length} agents complete`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {Math.round(progressPct)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Progress</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 8,
            width: `${progressPct}%`,
            background: allComplete
              ? 'linear-gradient(90deg, var(--accent-success), #059669)'
              : 'linear-gradient(90deg, var(--accent-primary), #6366f1)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: allComplete ? '0 0 12px rgba(16,185,129,0.4)' : '0 0 12px rgba(0,212,170,0.4)'
          }} />
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
          {steps.map((s, i) => {
            const cfg = AGENT_CONFIG[s.agent] || { color: '#888' };
            return (
              <div key={i} title={s.agent} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: s.status === 'complete' ? cfg.color : s.status === 'running' ? cfg.color : 'var(--border-color)',
                opacity: s.status === 'pending' ? 0.35 : 1,
                transition: 'all 0.4s',
                boxShadow: s.status === 'running' ? `0 0 6px ${cfg.color}` : 'none',
                animation: s.status === 'running' ? 'pulse 1s ease infinite' : 'none'
              }} />
            );
          })}
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        {steps.map((step, i) => (
          <AgentCard
            key={step.agent}
            step={step}
            index={i}
            totalSteps={steps.length}
            elapsedMs={runningStep?.agent === step.agent ? elapsed : 0}
          />
        ))}
      </div>

      {/* All complete banner */}
      {allComplete && (
        <div style={{
          marginTop: 24, padding: '18px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(0,212,170,0.08))',
          border: '1px solid rgba(16,185,129,0.3)',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-success)' }}>
            All {steps.length} Agents Complete
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Generating final diagnostic report — please wait a moment…
          </div>
          <div className="spinner" style={{ width: 24, height: 24, margin: '12px auto 0', borderTopColor: 'var(--accent-success)' }} />
        </div>
      )}
    </div>
  );
}
