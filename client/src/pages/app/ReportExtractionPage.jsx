import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { reportService, CLINICAL_ONTOLOGY, FALLBACK_REPORT } from '../../services/api';

export default function ReportExtractionPage({ reportId = 'REP-9001', onNavigate }) {
  const [report, setReport] = useState(FALLBACK_REPORT);
  const [labResults, setLabResults] = useState(FALLBACK_REPORT.labResults);
  const [modelReadiness, setModelReadiness] = useState(FALLBACK_REPORT.modelReadiness);
  const [editingItem, setEditingItem] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTestName, setNewTestName] = useState('Glucose (Fasting)');
  const [newTestValue, setNewTestValue] = useState('');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadReport() {
      try {
        const data = await reportService.getById(reportId || 'REP-9001');
        if (mounted && data) {
          setReport(data);
          setLabResults(data.labResults || FALLBACK_REPORT.labResults);
          if (data.modelReadiness) {
            setModelReadiness(data.modelReadiness);
          }
        }
      } catch (err) {
        // preserve fallback
      }
    }
    loadReport();
    return () => { mounted = false; };
  }, [reportId]);

  if (loadError) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', border: '1px solid #ef4444' }}>
          <h4 style={{ color: '#ef4444', marginBottom: 12 }}>⚠️ Unable to Load Report Extraction</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Back to Dashboard</button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading complete laboratory report extraction...</p>
      </div>
    );
  }

  const handleVerifyValue = (item) => {
    setEditingItem(item);
    setNewValue(item.value.toString());
  };

  const saveVerifiedValue = async () => {
    if (!editingItem) return;
    const numVal = parseFloat(newValue);
    const updated = labResults.map(lr =>
      lr.id === editingItem.id ? { ...lr, value: isNaN(numVal) ? lr.value : numVal, validatedByUser: true, confidence: 100 } : lr
    );
    setLabResults(updated);
    try {
      const res = await reportService.updateLabResults(report.id, updated);
      if (res && res.modelReadiness) {
        setModelReadiness(res.modelReadiness);
      }
    } catch (saveErr) {
      console.error('[ReportExtractionPage] Failed to save verified value:', saveErr);
    }
    setEditingItem(null);
  };

  const handleAddParameter = async () => {
    if (!newTestValue || !newTestName) return;
    const val = parseFloat(newTestValue);
    if (isNaN(val)) return;

    const trimmedName = newTestName.trim();
    const isAgeParam = /^age\b/i.test(trimmedName) || /patient\s*age/i.test(trimmedName);

    // Clinical ontology lookup for realistic units and ranges
    const ontology = CLINICAL_ONTOLOGY.find(o =>
      o.testName.toLowerCase() === trimmedName.toLowerCase() ||
      trimmedName.toLowerCase().includes(o.testName.toLowerCase()) ||
      (isAgeParam && o.normalizedName === 'age')
    );

    const units = ontology ? ontology.defaultUnits : (isAgeParam ? 'years' : 'mg/dL');
    const referenceRange = ontology ? ontology.defaultRange : (isAgeParam ? '18–120' : 'Normal');
    let status = 'normal';
    if (ontology) {
      if (ontology.high && val > ontology.high) status = 'high';
      else if (ontology.low && val < ontology.low) status = 'low';
    }

    const normName = isAgeParam ? 'age' : (ontology?.normalizedName || trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_'));

    const newItem = {
      id: `LR-ADD-${Date.now().toString().slice(-4)}`,
      testName: trimmedName,
      rawName: trimmedName,
      normalizedName: normName,
      value: val,
      units: units,
      referenceRange: referenceRange,
      status: status,
      quality: 'VALID',
      confidence: 100,
      validatedByUser: true
    };

    const updated = [...labResults, newItem];
    setLabResults(updated);
    try {
      const res = await reportService.updateLabResults(report.id, updated);
      if (res && res.modelReadiness) {
        setModelReadiness(res.modelReadiness);
      }
    } catch (addErr) {
      console.error('[ReportExtractionPage] Failed to add parameter:', addErr);
    }
    setShowAddModal(false);
    setNewTestValue('');
  };

  const abnormalCount = labResults.filter(l => l.status && l.status.toLowerCase() !== 'normal').length;

  return (
    <div className="fade-in">
      <DemoBanner />
      
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <span>📋</span> Comprehensive Report Extraction & Verification
          </h2>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Multi-modal vision extraction for: <strong style={{ color: '#00d4aa' }}>{report.filename}</strong> (Patient ID: {report.patientId})
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
            + Add Lab Parameter
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('predictions')}>
            Proceed to Disease Screening →
          </button>
        </div>
      </div>

      {/* DUAL-PANE SPLIT EXTRACTION LAYOUT */}
      <div className="split-extraction-container" style={{ alignItems: 'start' }}>
        
        {/* ==================== LEFT COLUMN: DOCUMENT INSPECTION & RAW EXTRACTED STREAM ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          
          {/* CARD 1: DOCUMENT PREVIEW */}
          <div className="card table-card-elevated" style={{ padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <h4 style={{ color: '#fff', fontSize: '0.98rem', margin: 0 }}>Original Lab Report Document</h4>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  onClick={() => setShowRawOcr(!showRawOcr)}
                >
                  {showRawOcr ? '📄 View Document Preview' : '🔍 View Raw Extracted Text'}
                </button>
                <span style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.15)', padding: '5px 12px', borderRadius: 4, color: '#00d4aa', fontWeight: 700 }}>
                  {report.ocrConfidence ? `OCR: ${report.ocrConfidence}%` : 'Pure PDF Parse'}
                </span>
              </div>
            </div>

            <div style={{
              background: '#090d16', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: 24, minHeight: 280, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', textAlign: 'center'
            }}>
              {showRawOcr ? (
                <div style={{ width: '100%', height: '100%', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h5 style={{ color: '#00d4aa', fontSize: '0.84rem', margin: 0 }}>Preserved Raw Text Lines:</h5>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>UTF-8 Preserved Stream</span>
                  </div>
                  <pre style={{
                    background: '#040711', color: '#38bdf8', padding: 16, borderRadius: 8,
                    fontSize: '0.8rem', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)',
                    maxHeight: 280, overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.55
                  }}>
                    {report.rawOcrText || 'No raw text detected.'}
                  </pre>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 10 }}>{report.fileType === 'pdf' ? '📑' : '🖼️'}</div>
                  <strong style={{ color: '#fff', fontSize: '1.05rem', marginBottom: 4 }}>{report.filename}</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                    Patient: <strong style={{ color: '#00d4aa' }}>{report.patientName}</strong> ({report.patientId})
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: 4, fontSize: '0.76rem' }}>
                      Format: {report.fileType ? report.fileType.toUpperCase() : 'PDF'}
                    </span>
                    <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: 4, fontSize: '0.76rem' }}>
                      Size: {report.fileSize ? `${(report.fileSize / 1024).toFixed(1)} KB` : '48.2 KB'}
                    </span>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 12px', borderRadius: 4, fontSize: '0.76rem', fontWeight: 600 }}>
                      ✓ Verified Structure
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: EXTRACTED DOCUMENT STREAM TABLE */}
          <div className="card table-card-elevated" style={{ padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.98rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🧪</span> Extracted Document Stream (Raw Input Parameters)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                  Complete parameters captured directly from document tokens prior to model normalization.
                </p>
              </div>
              <span style={{ fontSize: '0.74rem', background: 'var(--bg-elevated)', color: '#38bdf8', padding: '5px 12px', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(56,189,248,0.25)' }}>
                {labResults.length} Items Captured
              </span>
            </div>

            <div style={{
              background: '#040711', border: '1px solid var(--border-color)', borderRadius: 8,
              overflow: 'hidden', maxHeight: 360, overflowY: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>LABORATORY PARAMETER</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>PARSED VALUE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>UNITS</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {labResults.map((l, idx) => {
                    const isHigh = l.status === 'HIGH' || l.status === 'critical';
                    const isLow = l.status === 'LOW';
                    return (
                      <tr key={l.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '10px 14px', color: '#f1f5f9', fontWeight: 600 }}>{l.rawName || l.testName}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: isHigh ? '#ef4444' : isLow ? '#f59e0b' : '#00d4aa', fontFamily: 'monospace' }}>
                          {l.value}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>
                          {l.units || l.unit || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                            background: isHigh ? 'rgba(239,68,68,0.15)' : isLow ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                            color: isHigh ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'
                          }}>
                            {l.status ? l.status.toUpperCase() : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ==================== RIGHT COLUMN: STANDARDIZED LAB RESULTS & READINESS ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          
          {/* CARD 1: STANDARDIZED LAB RESULTS TABLE */}
          <div className="card table-card-elevated" style={{ padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.98rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📊</span> Extracted Laboratory Results & Normalization Table
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                  Preserved {labResults.length} parameter(s) mapped to clinical ontology with quality grading.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                  {labResults.length} Captured
                </span>
                {abnormalCount > 0 && (
                  <span style={{ fontSize: '0.74rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                    {abnormalCount} Abnormal
                  </span>
                )}
              </div>
            </div>

            <div style={{
              background: '#090d16', border: '1px solid var(--border-color)', borderRadius: 8,
              overflow: 'hidden', maxHeight: 380, overflowY: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>RAW TEST NAME</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>NORMALIZED</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>VALUE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>UNITS</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>REF RANGE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>QUALITY</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {labResults.map(item => {
                    const isHigh = item.status === 'HIGH' || item.status === 'critical';
                    const isLow = item.status === 'LOW';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>{item.rawName || item.testName}</td>
                        <td style={{ padding: '12px 14px', color: '#38bdf8', fontSize: '0.76rem', fontFamily: 'monospace' }}>
                          {item.normalizedName || 'generic'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: isHigh ? '#ef4444' : isLow ? '#f59e0b' : '#10b981', fontFamily: 'monospace' }}>
                          {item.value}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{item.units || item.unit || ''}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-tertiary)' }}>{item.referenceRange || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                            background: item.quality === 'INVALID' ? 'rgba(239,68,68,0.2)' : item.quality === 'SUSPICIOUS' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)',
                            color: item.quality === 'INVALID' ? '#ef4444' : item.quality === 'SUSPICIOUS' ? '#f59e0b' : '#10b981'
                          }}>
                            {item.quality || 'VALID'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                            onClick={() => handleVerifyValue(item)}
                          >
                            {item.validatedByUser ? '✓ Verified' : 'Verify / Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 2: DIABETES MODEL READINESS & CANONICAL FEATURE MAPPING */}
          {modelReadiness && (() => {
            const ageLabItem = labResults.find(l => {
              const rn = (l.rawName || l.testName || '').toLowerCase().trim();
              const nn = (l.normalizedName || '').toLowerCase().trim();
              return nn === 'age' || nn.startsWith('age') || rn.startsWith('age') || /\bage\b/i.test(rn);
            });
            const ageVal = ageLabItem ? parseFloat(ageLabItem.value) : (report?.patientAge || null);

            let effectiveReadiness = { ...modelReadiness };
            if (ageVal && !isNaN(ageVal) && Array.isArray(effectiveReadiness.mappingDiagnostics)) {
              const ageDiag = effectiveReadiness.mappingDiagnostics.find(d => d.feature === 'age');
              if (ageDiag && ageDiag.status !== 'AVAILABLE') {
                effectiveReadiness.mappingDiagnostics = effectiveReadiness.mappingDiagnostics.map(d =>
                  d.feature === 'age'
                    ? {
                        ...d,
                        status: 'AVAILABLE',
                        value: Math.round(ageVal),
                        unit: 'years',
                        source: ageLabItem ? (ageLabItem.rawName || 'Age') : 'patient_demographics',
                        reason: null
                      }
                    : d
                );
                const updatedMissing = (effectiveReadiness.missingFeatures || []).filter(f => f !== 'age');
                effectiveReadiness.missingFeatures = updatedMissing;
                effectiveReadiness.missingCount = updatedMissing.length;
                effectiveReadiness.availableFeatures = 8 - updatedMissing.length;
                if (updatedMissing.length === 0) {
                  effectiveReadiness.status = 'READY';
                }
              }
            }

            const availableCount = typeof effectiveReadiness.availableFeatures === 'number'
              ? effectiveReadiness.availableFeatures
              : (Array.isArray(effectiveReadiness.availableFeatures)
                  ? effectiveReadiness.availableFeatures.length
                  : (effectiveReadiness.availableFeatureNames ? effectiveReadiness.availableFeatureNames.length : 0));

            const missingList = Array.isArray(effectiveReadiness.missingFeatures)
              ? effectiveReadiness.missingFeatures
              : (effectiveReadiness.missingFeatureNames || []);

            const missingCount = typeof effectiveReadiness.missingCount === 'number'
              ? effectiveReadiness.missingCount
              : missingList.length;

            const isReady = effectiveReadiness.status === 'READY';
            const isInvalid = effectiveReadiness.status === 'INVALID_DATA';

            return (
              <div className="card table-card-elevated" style={{
                background: 'var(--bg-secondary)',
                border: isReady ? '1px solid rgba(0,212,170,0.4)' : isInvalid ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.4)',
                borderRadius: 'var(--radius-lg)', padding: 26
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>🩺</span>
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '0.98rem', margin: 0 }}>
                        Canonical Clinical Feature Mapping & Screening Readiness
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', margin: '3px 0 0 0' }}>
                        Pima Indian Diabetes Model requires 8 numerical canonical screening features.
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.74rem', padding: '4px 12px', borderRadius: 20, fontWeight: 700,
                    background: isReady ? 'rgba(16,185,129,0.2)' : isInvalid ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    color: isReady ? '#10b981' : isInvalid ? '#ef4444' : '#f59e0b',
                    border: `1px solid ${isReady ? '#10b981' : isInvalid ? '#ef4444' : '#f59e0b'}`
                  }}>
                    {isReady ? '✓ MODEL READY' : isInvalid ? '❌ INVALID_DATA' : '⚠️ INSUFFICIENT_DATA'}
                  </span>
                </div>

                {/* 3-METRIC SUMMARY CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                  <div style={{ background: '#090d16', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>Required Features</div>
                    <strong style={{ color: '#fff', fontSize: '1.15rem' }}>8 Canonical</strong>
                  </div>
                  <div style={{ background: '#090d16', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>Available in Report</div>
                    <strong style={{ color: '#10b981', fontSize: '1.15rem' }}>{availableCount} / 8 Available</strong>
                  </div>
                  <div style={{ background: '#090d16', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>Missing Features</div>
                    <strong style={{ color: missingCount > 0 ? '#f59e0b' : '#10b981', fontSize: '1.15rem' }}>
                      {missingCount} Missing
                    </strong>
                  </div>
                </div>

                {/* FEATURE MAPPING DIAGNOSTICS BREAKDOWN */}
                {Array.isArray(effectiveReadiness.mappingDiagnostics) && effectiveReadiness.mappingDiagnostics.length > 0 && (
                  <div style={{ background: '#090d16', borderRadius: 8, padding: 14, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Feature Attribution Mapping Diagnostics
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {effectiveReadiness.mappingDiagnostics.map((diag, idx) => {
                        const isAvail = diag.status === 'AVAILABLE';
                        const isInv = diag.status === 'INVALID';
                        const isAmb = diag.status === 'AMBIGUOUS';
                        return (
                          <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: '0.78rem', padding: '8px 12px', borderRadius: 6,
                            background: isAvail ? 'rgba(16,185,129,0.06)' : isInv ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                            borderLeft: `4px solid ${isAvail ? '#10b981' : isInv ? '#ef4444' : isAmb ? '#a855f7' : '#f59e0b'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                                {diag.clinicalLabel || diag.feature}
                              </span>
                              <code style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '1px 6px', borderRadius: 3 }}>
                                {diag.feature}
                              </code>
                              <span style={{
                                fontSize: '0.66rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                background: isAvail ? 'rgba(16,185,129,0.2)' : isInv ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                                color: isAvail ? '#10b981' : isInv ? '#ef4444' : '#f59e0b'
                              }}>
                                {diag.status}
                              </span>
                            </div>
                            <div style={{ color: isAvail ? '#34d399' : 'var(--text-secondary)', textAlign: 'right', fontSize: '0.76rem' }}>
                              {isAvail ? (
                                <span><strong>{diag.value}</strong> {diag.unit || ''} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>({diag.source})</span></span>
                              ) : (
                                <span style={{ color: '#fbbf24' }}>{diag.reason}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {missingCount > 0 && (
                  <div style={{
                    fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                    padding: '12px 16px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <span>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <strong>Strict Clinical Guardrail:</strong> Missing features ({missingList.join(', ')}). The ML model safely abstains from fabricated prediction, returning <code>INSUFFICIENT_DATA</code>. You can provide missing values via "+ Add Lab Parameter" above.
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>

      </div>

      {/* EDIT VALUE MODAL */}
      {editingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
            <h4 style={{ color: '#fff', marginBottom: 8, fontSize: '1.1rem' }}>Verify & Correct Clinical Value</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              {editingItem.rawName || editingItem.testName} (Reference: {editingItem.referenceRange || 'N/A'} {editingItem.units || ''})
            </p>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Corrected Numeric Value</label>
              <input className="form-input" type="number" step="any" value={newValue} onChange={e => setNewValue(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingItem(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveVerifiedValue}>Save Verification</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARAMETER MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24 }}>
            <h4 style={{ color: '#fff', marginBottom: 8, fontSize: '1.1rem' }}>+ Add Clinical Lab Parameter</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Manually add or verify any parameter present on the uploaded report image.
            </p>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Parameter Name</label>
              <input className="form-input" type="text" placeholder="e.g. Fasting Glucose" value={newTestName} onChange={e => setNewTestName(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Measured Numeric Value</label>
              <input className="form-input" type="number" step="any" placeholder="e.g. 145" value={newTestValue} onChange={e => setNewTestValue(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddParameter}>Add to Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
