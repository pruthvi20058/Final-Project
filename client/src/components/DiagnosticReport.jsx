export default function DiagnosticReport({ report, patientName }) {
  if (!report) return <div className="empty-state"><h3>No report available</h3></div>;

  const t = report.triage || {};
  const d = report.diagnostic || {};
  const m = report.medication || {};
  const r = report.rag || {};
  const img = report.image || null;
  const g = report.guardrail || {};

  const triageClass = {
    Emergency: 'triage-emergency', Urgent: 'triage-urgent',
    'Semi-Urgent': 'triage-semi-urgent', 'Non-Urgent': 'triage-non-urgent'
  }[t.triageLevel] || '';

  const confColor = (c) => c >= 70 ? 'var(--accent-success)' : c >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)';

  const handlePrint = () => window.print();

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediagent-report-${report.consultationId?.slice(0, 8) || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const lines = [
      `MEDIAGENT DIAGNOSTIC REPORT`,
      `Generated: ${new Date(report.timestamp || Date.now()).toLocaleString()}`,
      `Consultation ID: ${report.consultationId || 'N/A'}`,
      ``,
      `== TRIAGE ==`,
      `Level: ${t.triageLevel || 'N/A'} | Score: ${t.triageScore || 0}/100`,
      `Recommendation: ${t.recommendation || ''}`,
      ...(t.flags?.map(f => `  [${f.type}] ${f.message}`) || []),
      ``,
      `== DIFFERENTIAL DIAGNOSES ==`,
      ...(d.differentialDiagnoses?.map((dx, i) =>
        `  ${i + 1}. ${dx.condition} (${dx.confidence}%) — ${dx.icd10}`
      ) || []),
      ``,
      `== MEDICATIONS ==`,
      ...(m.recommendedMedications?.map(med => `  • ${med.name} (for ${med.forCondition})`) || []),
      ...(m.allergyWarnings?.map(w => `  ⚠ ${w.message}`) || []),
      ``,
      `== SAFETY & COMPLIANCE ==`,
      `Overall Risk: ${g.overallRisk?.toUpperCase() || 'N/A'}`,
      `Human Review Required: ${g.humanReviewRequired ? 'YES' : 'No'}`,
      ...(g.disclaimers?.map(d => `  * ${d}`) || []),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediagent-report-${report.consultationId?.slice(0, 8) || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      {/* Export / Print Bar */}
      <div className="report-print-bar print-hide">
        <button className="btn btn-secondary btn-sm" onClick={handleExportText} title="Export as plain text">
          📄 Export .TXT
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleExportJSON} title="Export raw JSON data">
          📦 Export JSON
        </button>
        <button className="btn btn-primary btn-sm" onClick={handlePrint} title="Print this report">
          🖨️ Print Report
        </button>
      </div>

      {/* Summary Bar */}
      {report.summary && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderLeft: `4px solid ${t.triageColor || 'var(--accent-primary)'}` }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`triage-badge ${triageClass}`}>🚨 {t.triageLevel || 'N/A'}</span>
            <span style={{ fontSize: '0.9rem' }}>Primary: <strong>{report.summary.primaryDiagnosis}</strong></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Confidence: <strong style={{ color: confColor(report.summary.confidence) }}>{report.summary.confidence}%</strong>
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              ⏱ {report.summary.totalAgentsRun} agents · {((report.summary.totalDuration || 0) / 1000).toFixed(1)}s
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`chip ${g.overallRisk === 'critical' ? 'chip-red' : g.overallRisk === 'high' ? 'chip-amber' : 'chip-teal'}`}>
              Risk: {g.overallRisk?.toUpperCase()}
            </span>
            {g.humanReviewRequired && <span className="chip chip-red">⚠ Human Review Required</span>}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Triage */}
        <div className="card">
          <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>🚨</span><h3>Triage Assessment</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className={`triage-badge ${triageClass}`}>{t.triageLevel}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Score: {t.triageScore}/100</span>
          </div>
          <p style={{ fontSize: '0.85rem', marginBottom: 12 }}>{t.recommendation}</p>
          {t.flags?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {t.flags.map((f, i) => (
                <div key={i} className={`chip ${f.type === 'CRITICAL' ? 'chip-red' : 'chip-amber'}`} style={{ justifyContent: 'flex-start' }}>
                  {f.type === 'CRITICAL' ? '🔴' : '🟡'} {f.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Differential Diagnoses */}
        <div className="card">
          <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>🔬</span><h3>Differential Diagnoses</h3></div>
          {d.differentialDiagnoses?.map((dx, i) => (
            <div key={i} className="diagnosis-item">
              <div className="dx-header">
                <span className="dx-name">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {dx.condition}</span>
                <span className="dx-icd">{dx.icd10}</span>
              </div>
              <div className="confidence-bar-container">
                <div className="confidence-label">
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{dx.category}</span>
                  <span style={{ fontWeight: 700, color: confColor(dx.confidence) }}>{dx.confidence}%</span>
                </div>
                <div className="confidence-bar-bg">
                  <div className="confidence-bar-fill" style={{ width: `${dx.confidence}%`, background: `linear-gradient(90deg, ${confColor(dx.confidence)}, transparent)` }}></div>
                </div>
              </div>
              {dx.matchedSymptoms?.length > 0 && (
                <div className="dx-evidence">
                  <span style={{ color: 'var(--accent-success)' }}>✓</span> Matching: {dx.matchedSymptoms.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Medications */}
        <div className="card">
          <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>💊</span><h3>Medication Recommendations</h3></div>
          {m.allergyWarnings?.length > 0 && m.allergyWarnings.map((w, i) => (
            <div key={i} className="chip chip-red" style={{ marginBottom: 8, display: 'flex' }}>{w.message}</div>
          ))}
          {m.drugInteractions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--accent-warning)', marginBottom: 6 }}>⚠ Drug Interactions</h4>
              {m.drugInteractions.map((di, i) => (
                <div key={i} style={{ fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <strong>{di.newDrug}</strong> ↔ <strong>{di.existingDrug}</strong>
                  <span className={`chip ${di.severity === 'major' ? 'chip-red' : 'chip-amber'}`} style={{ marginLeft: 8 }}>{di.severity}</span>
                  <div style={{ marginTop: 2 }}>{di.effect}</div>
                </div>
              ))}
            </div>
          )}
          {m.recommendedMedications?.map((med, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
              marginBottom: 6, border: '1px solid var(--border-color)', fontSize: '0.85rem'
            }}>
              <span>💊 {med.name}</span>
              <span className="chip chip-blue" style={{ fontSize: '0.68rem' }}>For: {med.forCondition}</span>
            </div>
          ))}
          {(!m.recommendedMedications || m.recommendedMedications.length === 0) && !m.allergyWarnings?.length && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No specific medications indicated at this time.</p>
          )}
        </div>

        {/* RAG Evidence */}
        <div className="card">
          <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>📚</span><h3>Evidence & Guidelines (RAG)</h3></div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Search method: {r.searchMethod} | Documents searched: {r.totalSearched}
          </div>
          {r.retrievedDocuments?.map((doc, i) => (
            <div key={i} style={{
              padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
              marginBottom: 8, border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: '0.88rem' }}>{doc.title}</strong>
                <span className="chip chip-teal">{doc.relevanceScore}% relevance</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{doc.guidelines}</p>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6, fontStyle: 'italic' }}>
                📖 {doc.citation}
              </div>
            </div>
          ))}
          {(!r.retrievedDocuments || r.retrievedDocuments.length === 0) && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No specific evidence documents retrieved for this case.</p>
          )}
        </div>

        {/* Imaging */}
        {img && img.findings?.length > 0 && (
          <div className="card">
            <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>🖼️</span><h3>Imaging Analysis</h3></div>
            {img.findings.map((f, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.88rem' }}>{f.modality}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{f.filename}</span>
                </div>
                <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: 18 }}>
                  {f.observations.map((o, j) => <li key={j} style={{ marginBottom: 3 }}>{o}</li>)}
                </ul>
                <p style={{ fontSize: '0.82rem', marginTop: 6, fontWeight: 600 }}>Impression: {f.impression}</p>
              </div>
            ))}
          </div>
        )}

        {/* Guardrail */}
        <div className="card">
          <div className="report-section-header"><span style={{ fontSize: '1.2rem' }}>🛡️</span><h3>Safety & Compliance</h3></div>
          <div style={{ marginBottom: 12 }}>
            <span className={`chip ${g.overallRisk === 'critical' ? 'chip-red' : g.overallRisk === 'high' ? 'chip-amber' : 'chip-teal'}`}>
              Risk Level: {g.overallRisk?.toUpperCase()}
            </span>
            {g.humanReviewRequired && (
              <span className="chip chip-red" style={{ marginLeft: 8 }}>⚠ Physician Review Required</span>
            )}
          </div>
          {g.safetyFlags?.map((f, i) => (
            <div key={i} className={`chip ${f.level === 'CRITICAL' ? 'chip-red' : f.level === 'HIGH' ? 'chip-amber' : 'chip-blue'}`}
              style={{ display: 'flex', marginBottom: 6, justifyContent: 'flex-start' }}>
              {f.message}
            </div>
          ))}
          <div className="disclaimer-box" style={{ marginTop: 14 }}>
            {g.disclaimers?.map((d, i) => <p key={i}>{d}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
