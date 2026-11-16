import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { DEMO_EVALUATION } from '../../services/api';

export default function EvaluationDashboard() {
  const evalData = DEMO_EVALUATION;

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🏆 Research & Evaluation Dashboard</h2>
        <p>Quantitative benchmark evaluation comparing MediAgent multimodal workflow against general-purpose LLM baselines.</p>
      </div>

      <SafetyDisclaimer compact />

      {/* METRICS CARDS */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card teal">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">{(evalData.modelAccuracy * 100).toFixed(1)}%</div>
          <div className="metric-label">Model Accuracy</div>
          <div className="metric-change up">↑ Calibrated XGBoost</div>
        </div>

        <div className="metric-card indigo">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{(evalData.f1Score * 100).toFixed(1)}%</div>
          <div className="metric-label">Macro F1 Score</div>
          <div className="metric-change up">↑ Balanced Precision/Recall</div>
        </div>

        <div className="metric-card blue">
          <div className="metric-icon">📈</div>
          <div className="metric-value">{evalData.rocAuc.toFixed(3)}</div>
          <div className="metric-label">ROC-AUC Score</div>
          <div className="metric-change up">↑ Discriminative Ability</div>
        </div>

        <div className="metric-card red">
          <div className="metric-icon">📉</div>
          <div className="metric-value">{evalData.brierScore.toFixed(3)}</div>
          <div className="metric-label">Brier Calibration Score</div>
          <div className="metric-change up">↓ Lower Probability Error</div>
        </div>
      </div>

      <div className="grid-2">
        {/* OCR EXTRACTION ACCURACY BREAKDOWN */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Computer Vision & OCR Extraction Benchmarks</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Overall OCR Text Character Accuracy', val: evalData.ocrMetrics.ocrAccuracy },
              { label: 'Numeric Test Value Extraction Accuracy', val: evalData.ocrMetrics.valueExtractionAccuracy },
              { label: 'Measurement Unit Extraction Accuracy', val: evalData.ocrMetrics.unitExtractionAccuracy },
              { label: 'Reference Range Boundary Parsing', val: evalData.ocrMetrics.referenceRangeAccuracy }
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <strong style={{ color: '#00d4aa' }}>{(item.val * 100).toFixed(1)}%</strong>
                </div>
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${item.val * 100}%`, height: '100%', background: '#00d4aa' }} />
                </div>
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
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#94a3b8' }}>{(evalData.gptComparison.gpt4Accuracy * 100).toFixed(1)}%</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#00d4aa', fontWeight: 700 }}>{(evalData.gptComparison.mediagentAccuracy * 100).toFixed(1)}%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 4px', color: '#fff' }}>F1 Score</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#94a3b8' }}>{evalData.gptComparison.gpt4F1.toFixed(3)}</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#00d4aa', fontWeight: 700 }}>{evalData.gptComparison.mediagentF1.toFixed(3)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 4px', color: '#fff' }}>Clinical Hallucination Rate</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#ef4444' }}>{(evalData.gptComparison.gpt4HallucinationRate * 100).toFixed(1)}%</td>
                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{(evalData.gptComparison.mediagentHallucinationRate * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
