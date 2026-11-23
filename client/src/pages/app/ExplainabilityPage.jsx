import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { predictionService, reportService, FALLBACK_XAI, FALLBACK_REPORT } from '../../services/api';

const DISEASES = [
  { id: 'diabetes', label: 'Diabetes Mellitus', icon: '🩺' },
  { id: 'chikungunya', label: 'Chikungunya', icon: '🦴' },
  { id: 'dengue', label: 'Dengue Fever', icon: '🩸' },
  { id: 'malaria', label: 'Malaria', icon: '🦟' },
  { id: 'typhoid', label: 'Typhoid Fever', icon: '🌡️' }
];

export default function ExplainabilityPage({ predictionId, reportId = 'REP-9001', onNavigate }) {
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [xai, setXai] = useState(FALLBACK_XAI);
  const [report, setReport] = useState(FALLBACK_REPORT);

  useEffect(() => {
    let mounted = true;
    async function loadXAI() {
      try {
        const activeId = reportId || (predictionId ? predictionId.replace('PRED-', '') : 'REP-9001');
        const r = await reportService.getById(activeId);
        let activeDisease = selectedDisease;
        if (!activeDisease && r) {
          const meta = [r.disease || '', r.filename || '', r.chiefComplaint || ''].join(' ').toLowerCase();
          if (/chikungunya|chikv|polyarthralgia/i.test(meta)) activeDisease = 'chikungunya';
          else if (/dengue|ns1/i.test(meta)) activeDisease = 'dengue';
          else if (/malaria|plasmodium/i.test(meta)) activeDisease = 'malaria';
          else if (/typhoid|widal/i.test(meta)) activeDisease = 'typhoid';
          else activeDisease = 'diabetes';
          setSelectedDisease(activeDisease);
        } else if (!activeDisease) {
          activeDisease = 'diabetes';
          setSelectedDisease('diabetes');
        }

        const data = await predictionService.getXAI(r?.id || activeId, activeDisease);
        if (mounted && data) {
          if (r) setReport(r);
          setXai(data);
        }
      } catch {
        // preserve fallback
      }
    }
    loadXAI();
    return () => { mounted = false; };
  }, [predictionId, reportId, selectedDisease]);

  if (!xai || !report) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Computing TreeSHAP feature attributions...</p>
      </div>
    );
  }

  const currentDisease = selectedDisease || 'diabetes';

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>💡 Explainable AI (XAI) & SHAP Attribution</h2>
          <p>"Why did the model make this prediction?" — Calculated for <strong style={{ color: '#00d4aa' }}>{report.filename}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('evidence')}>
          View Medical Evidence (RAG) →
        </button>
      </div>

      <SafetyDisclaimer compact />

      {/* DISEASE SELECTOR TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {DISEASES.map(d => {
          const isSel = currentDisease === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDisease(d.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                background: isSel ? '#00d4aa' : 'rgba(255,255,255,0.06)',
                color: isSel ? '#090d16' : '#94a3b8',
                border: isSel ? '1px solid #00d4aa' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        {/* LEFT COLUMN: SHAP FEATURE IMPORTANCE CHART */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ color: '#fff' }}>SHAP Feature Attribution Weights</h4>
            <span style={{ fontSize: '0.72rem', color: '#00d4aa', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 }}>
              TreeSHAP Explainer Engine
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            {xai.shapSummaryText}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {xai.featureImportance.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{item.feature}</span>
                  <span style={{ color: item.impact === 'positive' ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {item.impact === 'positive' ? '+' : '-'}{(item.importance * 100).toFixed(1)}%
                  </span>
                </div>

                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, item.importance * 100 * 2)}%`, height: '100%',
                    background: item.impact === 'positive' ? '#ef4444' : '#10b981',
                    borderRadius: 4
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: 3 FEATURE CATEGORIES */}
        <div>
          {/* TOP CONTRIBUTING FACTORS */}
          <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <h4 style={{ color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔺</span> Top Contributing Factors (High Positive Weight)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {xai.topContributingFactors.map((f, i) => (
                <div key={i} style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', color: '#fff' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* SUPPORTING FACTORS */}
          <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <h4 style={{ color: '#00d4aa', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔹</span> Supporting Background Factors
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {xai.supportingFactors.map((f, i) => (
                <div key={i} style={{ background: 'rgba(0, 212, 170, 0.08)', borderLeft: '3px solid #00d4aa', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', color: '#fff' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* FACTORS REDUCING CONFIDENCE */}
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔻</span> Factors Reducing Confidence (Mitigating Signals)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {xai.factorsReducingConfidence.map((f, i) => (
                <div key={i} style={{ background: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid #f59e0b', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', color: '#fff' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
