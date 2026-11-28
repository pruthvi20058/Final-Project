import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import StatusBadge from '../../components/StatusBadge';
import { riskService } from '../../services/api';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  moderate: '#3b82f6',
  low: '#10b981',
  unavailable: '#6b7280'
};

const RISK_CATEGORY_COLORS = {
  EMERGENCY: '#ef4444',
  HIGH_RISK: '#f59e0b',
  MODERATE_RISK: '#3b82f6',
  LOW_RISK: '#10b981',
  UNAVAILABLE: '#6b7280'
};

export default function RiskUncertaintyPage({ reportId = 'REP-9001', onNavigate, isAbstain = false }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showAbstainOnly, setShowAbstainOnly] = useState(isAbstain);

  async function loadRisk() {
    try {
      setLoadError(null);
      // Use the risk assessment ID from reportId (or create a fresh assessment)
      const res = await riskService.getRiskAssessment(reportId);
      if (res) setAssessment(res);
      setLoading(false);
    } catch (err) {
      setLoadError(err.message || 'Unable to connect to the MediAgent server. Please try again.');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRisk();
  }, [reportId]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Evaluating clinical risk and emergency indicators…
        </p>
      </div>
    );
  }

  if (loadError && !assessment) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', maxWidth: 600, margin: '0 auto', padding: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h3 style={{ color: '#ef4444', marginBottom: 8 }}>Unable to Load Risk Assessment</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{loadError}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
              📋 Reports List
            </button>
            <button className="btn btn-primary" onClick={loadRisk}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    assessmentStatus = 'UNAVAILABLE',
    riskCategory = 'UNAVAILABLE',
    riskLabel = 'Unknown',
    riskMeaning = '',
    emergencyAlert = { triggered: false, severity: null, reasons: [] },
    evaluatedFactors = [],
    abnormalFindings = [],
    missingInformation = [],
    rulesApplied = [],
    evidenceReferences = [],
    limitations = [],
    mlProbabilityUsedForRisk = false,
    mlProbability = null
  } = assessment;

  const shouldAbstain = isAbstain || assessmentStatus === 'RISK_ASSESSMENT_UNAVAILABLE';

  if (showAbstainOnly && shouldAbstain) {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div className="page-header" style={{ marginTop: 16 }}>
          <h2>🛡️ Risk & Safety Assessment</h2>
          <p>Clinical risk stratification and emergency warning evaluation</p>
        </div>

        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛑</div>
          <h2 style={{ color: '#ef4444', fontSize: '1.6rem', marginBottom: 12 }}>
            Risk Assessment Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 650, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Sufficient verified clinical information was not available to assign a risk category.
            Missing information never results in a low-risk assumption — the assessment remains unavailable.
          </p>

          {missingInformation.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius-md)', textAlign: 'left', maxWidth: 600, margin: '0 auto 28px' }}>
              <h4 style={{ color: '#fff', marginBottom: 8, fontSize: '0.9rem' }}>Missing Information:</h4>
              <ul style={{ paddingLeft: 20, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {missingInformation.map((m, i) => (
                  <li key={i}>{typeof m === 'string' ? m : m.message || String(m)}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <button className="btn btn-secondary" onClick={() => setShowAbstainOnly(false)}>
              📊 View Full Risk & Safety Details
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('upload')}>
              📤 Add Clinical Data
            </button>
            <button className="btn btn-primary" onClick={() => onNavigate('review')}>
              🩺 Physician Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🛡️ Risk & Safety Assessment</h2>
          <p>Clinical risk stratification and emergency warning evaluation — separate from disease prediction</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {shouldAbstain && (
            <button className="btn btn-secondary" onClick={() => setShowAbstainOnly(true)}>
              🛑 View Abstention Notice
            </button>
          )}
          <button className="btn btn-secondary" onClick={loadRisk}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <SafetyDisclaimer compact />

      {/* EMERGENCY ALERT BANNER — always at top, cannot be dismissed by LLM */}
      {emergencyAlert.triggered && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '18px 22px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14
        }}>
          <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🚨</div>
          <div>
            <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.1rem' }}>
              EMERGENCY WARNING — {emergencyAlert.severity?.toUpperCase() || 'CRITICAL'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {emergencyAlert.reasons.map(r => r.message).join(' ')}
            </p>
            <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 8, fontStyle: 'italic' }}>
              This alert is based on validated clinical rules and is independent of ML predictions.
              Seek immediate medical evaluation.
            </p>
          </div>
        </div>
      )}

      {/* RISK CATEGORY CARD */}
      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ color: '#fff' }}>Clinical Risk Category</h4>
          <span style={{
            padding: '4px 12px',
            borderRadius: 20,
            background: RISK_CATEGORY_COLORS[riskCategory] || '#6b7280',
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {riskLabel} ({riskCategory})
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
          {riskMeaning}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            Assessment: <strong>{assessmentStatus}</strong>
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            ML Probability Used: <strong style={{ color: mlProbabilityUsedForRisk ? '#ef4444' : '#10b981' }}>
              {mlProbabilityUsedForRisk ? 'YES (UNSAFE)' : 'NO (Correct)'}
            </strong>
          </span>
          {mlProbability !== null && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              ML Probability (context only): <strong>{(mlProbability * 100).toFixed(1)}%</strong>
            </span>
          )}
        </div>

        {/* WARNING: Never show green for unavailable/incomplete */}
        {riskCategory === 'UNAVAILABLE' && (
          <div style={{
            background: 'rgba(107, 114, 128, 0.15)',
            border: '1px solid #6b7280',
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: '#6b7280'
          }}>
            ⚠️ Risk assessment is <strong>unavailable</strong> — insufficient verified clinical information.
            No risk category has been assigned. This is NOT a low-risk result.
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* LEFT: ABNORMAL FINDINGS */}
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <h4 style={{ color: '#fff', marginBottom: 12 }}>Abnormal Verified Findings</h4>
          {abnormalFindings.length > 0 ? (
            <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              {abnormalFindings.map((f, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <strong>{f.testName}</strong>: {f.value} {f.unit || ''} — {f.status}
                  {f.referenceRange && (
                    <>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Reference: {f.referenceRange}
                      </span>
                    </>
                  )}
                  {f.interpretation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {f.interpretation}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              No abnormal verified laboratory findings detected.
            </p>
          )}
        </div>

        {/* RIGHT: EVALUATED FACTORS */}
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <h4 style={{ color: '#fff', marginBottom: 12 }}>Evaluated Factors</h4>
          {evaluatedFactors.length > 0 ? (
            <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              {evaluatedFactors.map((f, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <strong>{f.factor}:</strong> {f.description}
                  {f.matchedCount !== undefined && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    ({f.matchedCount} matches)
                  </span>}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              No factors evaluated.
            </p>
          )}
        </div>
      </div>

      {/* RULES APPLIED */}
      {rulesApplied.length > 0 && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <h4 style={{ color: '#fff', marginBottom: 12 }}>Clinical Rules Applied</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 12 }}>
            Every rule below is traceable to a validated clinical source with version tracking.
          </p>
          <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            {rulesApplied.map((r, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{r.ruleId || 'Lab reference range'}</strong>
                {r.alertMessage && (
                    <>
                      <br />
                      <span style={{ color: '#fff', fontSize: '0.78rem' }}>{r.alertMessage}</span>
                    </>
                  )}
                {r.sourceOrganization && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Source: {r.sourceOrganization} — {r.sourceDocument} (v{r.ruleVersion}, {r.reviewStatus})
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EVIDENCE REFERENCES */}
      {evidenceReferences.length > 0 && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <h4 style={{ color: '#fff', marginBottom: 12 }}>Evidence Sources</h4>
          <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            {evidenceReferences.map((e, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{e.organization}</strong> — {e.document}
                {e.section && (
                    <>
                      <br />
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                        Section: {e.section} | Published: {e.publicationDate} | Rule v{e.ruleVersion}
                      </span>
                    </>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MISSING INFORMATION */}
      {missingInformation.length > 0 && (
        <div className="card" style={{ background: 'rgba(107, 114, 128, 0.1)', border: '1px solid #6b7280', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <h4 style={{ color: '#6b7280', marginBottom: 10, fontSize: '0.9rem' }}>Missing Information</h4>
          <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            {missingInformation.map((m, i) => (
              <li key={i}>{typeof m === 'string' ? m : m.message || String(m)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* LIMITATIONS */}
      {limitations.length > 0 && (
        <div className="card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <h4 style={{ color: '#f59e0b', marginBottom: 10, fontSize: '0.9rem' }}>Important Limitations</h4>
          <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            {limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
          📋 Reports List
        </button>
        <button className="btn btn-primary" onClick={() => onNavigate('review')}>
          🩺 Physician Review
        </button>
      </div>
    </div>
  );
}
