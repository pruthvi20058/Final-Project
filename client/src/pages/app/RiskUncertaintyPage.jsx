import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import StatusBadge from '../../components/StatusBadge';
import { riskService, reportService } from '../../services/api';

export default function RiskUncertaintyPage({ reportId = 'REP-9001', onNavigate, isAbstain = false }) {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showAbstainOnly, setShowAbstainOnly] = useState(isAbstain);

  async function loadRisk() {
    try {
      setLoadError(null);
      const r = await reportService.getById(reportId || 'REP-9001');
      const res = await riskService.getRisk(r?.id || reportId || 'REP-9001');
      if (r) setReport(r);
      if (res) setData(res);
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
          Quantifying multimodal clinical risk & prediction uncertainty...
        </p>
      </div>
    );
  }

  if (loadError && !data) {
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

  const risk = data?.risk || {};
  const uncertainty = data?.uncertainty || {};
  const contributingParameters = Array.isArray(risk.contributingParameters) && risk.contributingParameters.length > 0
    ? risk.contributingParameters
    : ['Baseline clinical screening parameters within expected variance'];
  const recommendations = Array.isArray(risk.recommendations) && risk.recommendations.length > 0
    ? risk.recommendations
    : ['Continue routine clinical monitoring and follow-up'];
  const overallRisk = (risk.overallRisk || risk.level || 'LOW').toUpperCase();
  const riskScore = risk.riskScore !== undefined ? risk.riskScore : (risk.score !== undefined ? risk.score : 0);
  const extractionConfidence = uncertainty.extractionConfidence !== undefined && uncertainty.extractionConfidence !== null ? uncertainty.extractionConfidence : null;
  const predictionConfidence = uncertainty.predictionConfidence !== undefined && uncertainty.predictionConfidence !== null ? uncertainty.predictionConfidence : null;
  const evidenceConsistency = uncertainty.evidenceConsistency !== undefined && uncertainty.evidenceConsistency !== null ? uncertainty.evidenceConsistency : null;
  const dataCompleteness = uncertainty.dataCompleteness !== undefined && uncertainty.dataCompleteness !== null ? uncertainty.dataCompleteness : null;
  const decisionSupportStatus = uncertainty.decisionSupportStatus !== undefined && uncertainty.decisionSupportStatus !== null ? uncertainty.decisionSupportStatus : null;
  const reportFilename = report?.filename || report?.original_filename || `Report #${reportId}`;
  const shouldAbstain = isAbstain || uncertainty.isAbstain;

  if (showAbstainOnly && shouldAbstain) {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div className="page-header" style={{ marginTop: 16 }}>
          <h2>🛡️ Risk & Uncertainty Engine</h2>
          <p>Uncertainty Quantification & Abstention Decision Support</p>
        </div>

        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛑</div>
          <h2 style={{ color: '#ef4444', fontSize: '1.6rem', marginBottom: 12 }}>
            Reliable Automated Analysis Could Not Be Completed (Abstain)
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: 650, margin: '0 auto 24px', lineHeight: 1.6 }}>
            MediAgent’s uncertainty engine detected critical data gaps or evidence conflicts. To protect patient safety, automated disease prediction has abstained.
          </p>

          <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius-md)', textAlign: 'left', maxWidth: 600, margin: '0 auto 28px' }}>
            <h4 style={{ color: '#fff', marginBottom: 8, fontSize: '0.9rem' }}>Possible Abstention Reasons:</h4>
            <ul style={{ paddingLeft: 20, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Sub-optimal image/PDF quality affecting OCR character confidence (&lt; 80%).</li>
              <li>Missing essential laboratory feature required by XGBoost/Logistic classifier.</li>
              <li>Low model prediction probability confidence interval.</li>
              <li>Conflict detected between ML prediction and retrieved clinical guidelines.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <button className="btn btn-secondary" onClick={() => setShowAbstainOnly(false)}>
              📊 View Full Risk & Uncertainty Metrics
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('upload')}>
              📤 Upload Clearer Report
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
          <h2>🛡️ Risk & Uncertainty Engine</h2>
          <p>Multi-factor risk classification and uncertainty bounds for: <strong style={{ color: '#00d4aa' }}>{reportFilename}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {shouldAbstain && (
            <button className="btn btn-secondary" onClick={() => setShowAbstainOnly(true)}>
              🛑 View Abstention Notice
            </button>
          )}
          <button className="btn btn-primary" onClick={() => onNavigate('trends')}>
            View Longitudinal Trends →
          </button>
        </div>
      </div>

      <SafetyDisclaimer compact />

      {shouldAbstain && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
          borderRadius: 'var(--radius-md)', padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.3rem' }}>⚠️</span>
            <span style={{ fontSize: '0.86rem', color: '#fca5a5' }}>
              <strong>Clinical Guardrail Advisory:</strong> Automated model prediction abstained due to missing feature parameters. Showing baseline multimodal screening assessment.
            </span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => onNavigate('extraction')}>
            Add Missing Data
          </button>
        </div>
      )}

      <div className="grid-2">
        {/* LEFT: RISK ASSESSMENT CARD */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ color: '#fff' }}>Multimodal Clinical Risk Score</h4>
            <StatusBadge status={overallRisk} />
          </div>

          <div style={{
            background: 'var(--bg-elevated)', padding: 20, borderRadius: 'var(--radius-md)',
            textAlign: 'center', marginBottom: 20, border: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              CALCULATED RISK SCORE
            </span>
            <div style={{
              fontSize: '2.8rem', fontWeight: 900,
              color: overallRisk === 'HIGH' || overallRisk === 'CRITICAL' ? '#ef4444' : overallRisk === 'MODERATE' ? '#f59e0b' : '#10b981'
            }}>
              {riskScore} <span style={{ fontSize: '1.2rem', color: 'var(--text-tertiary)' }}>/ 100</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Classification: <strong>{overallRisk} RISK</strong>
            </span>
          </div>

          <h5 style={{ color: '#fff', fontSize: '0.88rem', marginBottom: 8 }}>Contributing Risk Factors:</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {contributingParameters.map((p, idx) => (
              <div key={idx} style={{ background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', padding: '6px 12px', borderRadius: 4, fontSize: '0.8rem', color: '#fff' }}>
                • {p}
              </div>
            ))}
          </div>

          <h5 style={{ color: '#fff', fontSize: '0.88rem', marginBottom: 8 }}>Suggested Clinical Actions:</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                👉 {rec}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: UNCERTAINTY METRICS CARD */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Uncertainty Quantification Breakdown</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>1. OCR Extraction Confidence</span>
                <strong style={{ color: '#10b981' }}>{extractionConfidence !== null ? extractionConfidence + '%' : 'N/A'}</strong>
              </div>
              {extractionConfidence !== null && (
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, extractionConfidence))}%`, height: '100%', background: '#10b981' }} />
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>2. ML Model Prediction Confidence</span>
                <strong style={{ color: '#00d4aa' }}>{predictionConfidence !== null ? predictionConfidence + '%' : 'N/A'}</strong>
              </div>
              {predictionConfidence !== null && (
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, predictionConfidence))}%`, height: '100%', background: '#00d4aa' }} />
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>3. RAG Evidence Consistency</span>
                <strong style={{ color: '#3b82f6' }}>{evidenceConsistency !== null ? evidenceConsistency : 'N/A'}</strong>
              </div>
              {evidenceConsistency !== null && (
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '92%', height: '100%', background: '#3b82f6' }} />
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>4. Clinical Data Completeness</span>
                <strong style={{ color: '#10b981' }}>{dataCompleteness !== null ? dataCompleteness + '%' : 'N/A'}</strong>
              </div>
              {dataCompleteness !== null && (
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, dataCompleteness))}%`, height: '100%', background: '#10b981' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)', textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
              OVERALL DECISION SUPPORT STATUS
            </span>
            <strong style={{ fontSize: '1.05rem', color: '#00d4aa' }}>
              ✓ {decisionSupportStatus !== null ? decisionSupportStatus : 'N/A'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
