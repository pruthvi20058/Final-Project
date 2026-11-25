import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { evaluationService } from '../../services/api';

export default function EvaluationDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [evalStatus, setEvalStatus] = useState(null);
  const [evalMessage, setEvalMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadMetrics() {
      try {
        setLoading(true);
        const data = await evaluationService.getMetrics();
        if (mounted) {
          setMetrics(data.metrics || null);
          setEvalStatus(data.status || null);
          setEvalMessage(data.message || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load evaluation metrics');
          setEvalStatus('ERROR');
          setEvalMessage(err.message || 'Unable to connect to the MediAgent server.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMetrics();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 60, textAlign: 'center' }}>
        <DemoBanner />
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading evaluation metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
        <DemoBanner />
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Unable to Load Evaluation Metrics</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry ↻
        </button>
      </div>
    );
  }

  // NOT_EVALUATED state — no fabricated metrics
  if (evalStatus === 'NOT_EVALUATED' || !metrics) {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div className="page-header" style={{ marginTop: 16 }}>
          <h2>🏆 Research & Evaluation Dashboard</h2>
          <p>Quantitative benchmark evaluation comparing MediAgent multimodal workflow against general-purpose LLM baselines.</p>
        </div>

        <SafetyDisclaimer compact />

        <div style={{ padding: 40, textAlign: 'center', maxWidth: 640, margin: '40px auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
          <h3 style={{ color: '#f59e0b', marginBottom: 12, fontSize: '1.4rem' }}>Evaluation Not Performed</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.92rem' }}>{evalMessage || 'No model evaluation has been performed. Metrics are unavailable until a reproducible evaluation is executed against a held-out test set.'}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No accuracy, precision, recall, F1, ROC-AUC, or OCR metrics are displayed. Fabricated performance numbers are never presented as genuine results.
          </p>
        </div>
      </div>
    );
  }

  // AVAILABLE state — show real metrics
  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🏆 Research & Evaluation Dashboard</h2>
        <p>Quantitative benchmark evaluation from most recent reproducible evaluation run.</p>
      </div>

      <SafetyDisclaimer compact />

      {/* METRICS CARDS */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card teal">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">{metrics.modelAccuracy !== undefined ? (metrics.modelAccuracy * 100).toFixed(1) + '%' : 'N/A'}</div>
          <div className="metric-label">Model Accuracy</div>
          <div className="metric-change up">↑ From evaluation run</div>
        </div>

        <div className="metric-card indigo">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{metrics.f1Score !== undefined ? (metrics.f1Score * 100).toFixed(1) + '%' : 'N/A'}</div>
          <div className="metric-label">Macro F1 Score</div>
          <div className="metric-change up">↑ From evaluation run</div>
        </div>

        <div className="metric-card blue">
          <div className="metric-icon">📈</div>
          <div className="metric-value">{metrics.rocAuc !== undefined ? metrics.rocAuc.toFixed(3) : 'N/A'}</div>
          <div className="metric-label">ROC-AUC Score</div>
          <div className="metric-change up">↑ From evaluation run</div>
        </div>

        <div className="metric-card red">
          <div className="metric-icon">📉</div>
          <div className="metric-value">{metrics.brierScore !== undefined ? metrics.brierScore.toFixed(3) : 'N/A'}</div>
          <div className="metric-label">Brier Calibration Score</div>
          <div className="metric-change up">↓ From evaluation run</div>
        </div>
      </div>

      <div className="grid-2">
        {/* OCR EXTRACTION ACCURACY BREAKDOWN */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Computer Vision & OCR Extraction Benchmarks</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Overall OCR Text Character Accuracy', val: metrics.ocrMetrics?.ocrAccuracy },
              { label: 'Numeric Test Value Extraction Accuracy', val: metrics.ocrMetrics?.valueExtractionAccuracy },
              { label: 'Measurement Unit Extraction Accuracy', val: metrics.ocrMetrics?.unitExtractionAccuracy },
              { label: 'Reference Range Boundary Parsing', val: metrics.ocrMetrics?.referenceRangeAccuracy }
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <strong style={{ color: '#00d4aa' }}>{item.val !== undefined ? (item.val * 100).toFixed(1) + '%' : 'N/A'}</strong>
                </div>
                {item.val !== undefined && (
                  <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${item.val * 100}%`, height: '100%', background: '#00d4aa' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BENCHMARK COMPARISON TABLE */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>General-Purpose LLM vs MediAgent Benchmark</h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px' }}>Metric</th>
                <th style={{ padding: '8px 4px', textAlign: 'center' }}>GPT-4 Baseline</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#00d4aa' }}>MediAgent</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 4px', color: '#fff' }}>Classification Accuracy</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#94a3b8' }}>{metrics.gptComparison?.gpt4Accuracy !== undefined ? (metrics.gptComparison.gpt4Accuracy * 100).toFixed(1) + '%' : 'N/A'}</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#00d4aa', fontWeight: 700 }}>{metrics.gptComparison?.mediagentAccuracy !== undefined ? (metrics.gptComparison.mediagentAccuracy * 100).toFixed(1) + '%' : 'N/A'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 4px', color: '#fff' }}>F1 Score</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#94a3b8' }}>{metrics.gptComparison?.gpt4F1 !== undefined ? metrics.gptComparison.gpt4F1.toFixed(3) : 'N/A'}</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#00d4aa', fontWeight: 700 }}>{metrics.gptComparison?.mediagentF1 !== undefined ? metrics.gptComparison.mediagentF1.toFixed(3) : 'N/A'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 4px', color: '#fff' }}>Clinical Hallucination Rate</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#ef4444' }}>{metrics.gptComparison?.gpt4HallucinationRate !== undefined ? (metrics.gptComparison.gpt4HallucinationRate * 100).toFixed(1) + '%' : 'N/A'}</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{metrics.gptComparison?.mediagentHallucinationRate !== undefined ? (metrics.gptComparison.mediagentHallucinationRate * 100).toFixed(1) + '%' : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
