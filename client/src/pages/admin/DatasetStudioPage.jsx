import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { mlService } from '../../services/api';

const DISEASES = [
  { id: 'diabetes', label: 'Diabetes Mellitus', icon: '🩺', badge: 'Tabular Pima' },
  { id: 'malaria', label: 'Malaria', icon: '🦟', badge: 'Tabular & Image ZIP' },
  { id: 'dengue', label: 'Dengue Fever', icon: '🩸', badge: 'Clinical & Serology' },
  { id: 'typhoid', label: 'Typhoid (Enteric Fever)', icon: '🌡️', badge: 'Widal & Culture' },
  { id: 'chikungunya', label: 'Chikungunya', icon: '🦴', badge: 'SINAN Clinical' }
];

export default function DatasetStudioPage({ initialDisease = 'diabetes', onNavigate }) {
  const [selectedDisease, setSelectedDisease] = useState(initialDisease);
  const [samples, setSamples] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Training Configuration State
  const [targetColumn, setTargetColumn] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [algorithm, setAlgorithm] = useState('random_forest');
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  // Live Test Sandbox State
  const [testFeatures, setTestFeatures] = useState({});
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load sample datasets on mount
  useEffect(() => {
    async function loadSamples() {
      try {
        const res = await mlService.getSampleDatasets();
        if (res && res.success && res.samples) {
          setSamples(res.samples);
          // Auto-select sample matching disease
          const match = res.samples.find(s => s.disease === selectedDisease);
          if (match) {
            setSelectedFilePath(match.absolute_path || match.path);
          }
        }
      } catch (err) {
        console.warn('Failed to load sample datasets:', err.message);
      }
    }
    loadSamples();
  }, [selectedDisease]);

  // Inspect dataset when selectedFilePath changes
  const runInspection = async (filePathToInspect = selectedFilePath) => {
    if (!filePathToInspect) return;
    setInspecting(true);
    setErrorMsg(null);
    setInspectionData(null);
    setTrainingResult(null);
    setTestResult(null);

    try {
      const res = await mlService.inspectDataset(filePathToInspect, selectedDisease);
      if (res && res.success && res.inspection) {
        const insp = res.inspection;
        setInspectionData(insp);
        if (insp.suggested_target) {
          setTargetColumn(insp.suggested_target);
        }
        if (insp.columns) {
          const feats = insp.columns.filter(c => c !== insp.suggested_target);
          setSelectedFeatures(feats);
          // Initialize test sandbox inputs
          const initInputs = {};
          feats.forEach(f => { initInputs[f] = ''; });
          setTestFeatures(initInputs);
        }
      } else {
        setErrorMsg(res.error?.message || 'Failed to inspect dataset.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Dataset inspection error.');
    } finally {
      setInspecting(false);
    }
  };

  const handleDiseaseChange = (diseaseId) => {
    setSelectedDisease(diseaseId);
    setInspectionData(null);
    setTrainingResult(null);
    setTestResult(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    const match = samples.find(s => s.disease === diseaseId);
    if (match) {
      setSelectedFilePath(match.absolute_path || match.path);
    } else {
      setSelectedFilePath('');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('dataset', file);
    formData.append('disease', selectedDisease);

    try {
      setInspecting(true);
      const res = await mlService.uploadDataset(formData);
      if (res && res.success && res.dataset) {
        setSuccessMsg(`Dataset "${res.dataset.original_filename}" uploaded successfully!`);
        setSelectedFilePath(res.dataset.stored_path);
        // Automatically inspect the newly uploaded dataset
        await runInspection(res.dataset.stored_path);
      } else {
        setErrorMsg(res.error?.message || 'Dataset upload failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Upload error.');
    } finally {
      setInspecting(false);
    }
  };

  const handleFeatureToggle = (col) => {
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const handleTrainModel = async () => {
    if (!selectedFilePath || !targetColumn || selectedFeatures.length === 0) {
      setErrorMsg('Please select a dataset, target column, and at least one feature column.');
      return;
    }

    setTraining(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTrainingResult(null);

    try {
      const payload = {
        disease: selectedDisease,
        dataset_path: selectedFilePath,
        target_column: targetColumn,
        feature_columns: selectedFeatures,
        algorithm: algorithm,
        user_confirmed: true
      };
      const res = await mlService.trainModel(payload);
      if (res && res.success && res.training) {
        setTrainingResult(res.training);
        setSuccessMsg(`✅ Model for ${selectedDisease.toUpperCase()} successfully trained and registered!`);
      } else {
        setErrorMsg(res.error?.message || res.message || 'Model training failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred during training.');
    } finally {
      setTraining(false);
    }
  };

  const handleRunTestPrediction = async () => {
    setTestingModel(true);
    setErrorMsg(null);
    try {
      const res = await mlService.predictDisease(selectedDisease, testFeatures);
      if (res && res.success && res.prediction) {
        setTestResult(res.prediction);
      } else {
        setErrorMsg(res.error?.message || 'Prediction failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error testing prediction.');
    } finally {
      setTestingModel(false);
    }
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <span>🧪</span> Multi-Disease Dataset & Training Studio
          </h2>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Upload, inspect, confirm schema, and train independent disease models. Never applies diabetes features to other diseases.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onNavigate && onNavigate('models')}>
            View Model Registry →
          </button>
        </div>
      </div>

      {/* DISEASE SELECTOR TABS */}
      <div style={{ display: 'flex', gap: 10, margin: '20px 0', flexWrap: 'wrap' }}>
        {DISEASES.map(d => {
          const isActive = selectedDisease === d.id;
          return (
            <button
              key={d.id}
              onClick={() => handleDiseaseChange(d.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                background: isActive ? '#00d4aa' : 'var(--bg-secondary)',
                color: isActive ? '#090d16' : '#fff',
                border: isActive ? '1px solid #00d4aa' : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(0,212,170,0.25)' : 'none'
              }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
              <span style={{
                fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4,
                background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                color: isActive ? '#090d16' : '#94a3b8'
              }}>
                {d.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.86rem'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.86rem'
        }}>
          {successMsg}
        </div>
      )}

      {/* STEP 1: DATASET SOURCE SELECTOR & UPLOAD */}
      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
        <h4 style={{ color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📂</span> Step 1: Select or Upload Disease Dataset
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Sample Datasets Dropdown */}
          <div style={{ background: '#090d16', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              Use Verified Clinical Dataset (Built-in)
            </label>
            <select
              value={selectedFilePath}
              onChange={(e) => setSelectedFilePath(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)',
                color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.85rem'
              }}
            >
              <option value="">-- Choose a built-in cohort --</option>
              {samples.map((s, idx) => (
                <option key={idx} value={s.absolute_path || s.path}>
                  [{s.disease.toUpperCase()}] {s.filename} ({s.format.toUpperCase()} - {s.records} rows)
                </option>
              ))}
            </select>
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => runInspection()}
                disabled={!selectedFilePath || inspecting}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                {inspecting ? 'Inspecting...' : '🔍 Inspect Selected Dataset'}
              </button>
            </div>
          </div>

          {/* Upload Custom File Dropzone */}
          <div style={{ background: '#090d16', padding: 16, borderRadius: 8, border: '1px dashed rgba(0,212,170,0.4)', textAlign: 'center' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              Upload Custom Dataset (CSV, XLSX, JSON, or ZIP)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.json,.zip"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="dataset-upload-input"
            />
            <label
              htmlFor="dataset-upload-input"
              className="btn btn-secondary"
              style={{ cursor: 'pointer', display: 'inline-block', marginTop: 6, fontSize: '0.82rem' }}
            >
              📥 Upload Dataset File
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
              Supports CSV, XLSX, JSON tabular datasets, and ZIP image archives for Malaria microscopy.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 2: DATASET INSPECTION & SUITABILITY */}
      {inspectionData && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊</span> Step 2: Inspection & Disease Suitability Analysis
            </h4>
            <span style={{
              fontSize: '0.78rem', padding: '4px 10px', borderRadius: 20, fontWeight: 700,
              background: inspectionData.disease_suitability?.score >= 70 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
              color: inspectionData.disease_suitability?.score >= 70 ? '#10b981' : '#f59e0b',
              border: `1px solid ${inspectionData.disease_suitability?.score >= 70 ? '#10b981' : '#f59e0b'}`
            }}>
              Suitability: {inspectionData.disease_suitability?.score ?? 'N/A'}/100 ({inspectionData.disease_suitability?.status || 'VALID'})
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Format / Type</div>
              <strong style={{ color: '#00d4aa', fontSize: '1rem' }}>{inspectionData.format?.toUpperCase()} ({inspectionData.dataset_type})</strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Records</div>
              <strong style={{ color: '#fff', fontSize: '1rem' }}>{inspectionData.row_count ?? 0} rows</strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Columns</div>
              <strong style={{ color: '#fff', fontSize: '1rem' }}>{inspectionData.column_count ?? 0} features</strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Missing Values</div>
              <strong style={{ color: (inspectionData.missing_cells_percentage || 0) > 10 ? '#ef4444' : '#10b981', fontSize: '1rem' }}>
                {inspectionData.missing_cells_percentage ?? 0}%
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Duplicate Rows</div>
              <strong style={{ color: (inspectionData.duplicate_rows_count || 0) > 0 ? '#f59e0b' : '#10b981', fontSize: '1rem' }}>
                {inspectionData.duplicate_rows_count ?? 0}
              </strong>
            </div>
          </div>

          {/* Clinical Suitability Analysis Box */}
          <div style={{ background: '#090d16', padding: 14, borderRadius: 8, marginBottom: 16, borderLeft: '4px solid #00d4aa' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00d4aa', marginBottom: 4 }}>
              Clinical Compatibility Rationale:
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              {inspectionData.disease_suitability?.rationale || 'Dataset matches canonical schema and expected feature types.'}
            </p>
            {inspectionData.disease_suitability?.matched_keywords?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Recognized Clinical Markers:</span>
                {inspectionData.disease_suitability.matched_keywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '1px 6px', borderRadius: 4 }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: MAPPING & TRAINING CONFIGURATION */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚙️</span> Step 3: Schema Confirmation & Training Configuration
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
              {/* Target Column Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                  Select Target (Diagnosis / Label Column):
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => {
                    const t = e.target.value;
                    setTargetColumn(t);
                    setSelectedFeatures(inspectionData.columns.filter(c => c !== t));
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#090d16',
                    color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.85rem'
                  }}
                >
                  {inspectionData.candidate_targets?.map((ct, i) => (
                    <option key={i} value={ct.column}>
                      🎯 {ct.column} ({ct.unique_values_count} classes: {ct.sample_classes?.slice(0, 3).join(', ')})
                    </option>
                  ))}
                  {inspectionData.columns?.filter(c => !inspectionData.candidate_targets?.some(ct => ct.column === c)).map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
                {inspectionData.class_distribution && targetColumn && inspectionData.class_distribution[targetColumn] && (
                  <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#94a3b8' }}>
                    Class balance: {JSON.stringify(inspectionData.class_distribution[targetColumn])}
                  </div>
                )}
              </div>

              {/* Algorithm Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                  Training Algorithm:
                </label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#090d16',
                    color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.85rem'
                  }}
                >
                  <option value="random_forest">Random Forest Classifier (Ensemble)</option>
                  <option value="logistic_regression">Logistic Regression (L2 Regularized)</option>
                  <option value="gradient_boosting">Gradient Boosting Classifier</option>
                  <option value="auto">Auto Model Selection (Cross-Validated)</option>
                </select>
              </div>
            </div>

            {/* Feature Checkboxes */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                  Select Features to Include in Training ({selectedFeatures.length} of {inspectionData.columns?.filter(c => c !== targetColumn).length} selected):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedFeatures(inspectionData.columns.filter(c => c !== targetColumn))}
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    Select All
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedFeatures([])}
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8,
                background: '#090d16', padding: 12, borderRadius: 8, maxHeight: 220, overflowY: 'auto'
              }}>
                {inspectionData.columns?.filter(c => c !== targetColumn).map((col, i) => {
                  const isChecked = selectedFeatures.includes(col);
                  const dType = inspectionData.data_types?.[col] || 'unknown';
                  return (
                    <label
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem',
                        padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                        background: isChecked ? 'rgba(0,212,170,0.1)' : 'transparent',
                        border: isChecked ? '1px solid rgba(0,212,170,0.3)' : '1px solid transparent',
                        color: isChecked ? '#fff' : '#94a3b8'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleFeatureToggle(col)}
                      />
                      <span style={{ fontWeight: 600 }}>{col}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>({dType})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* TRAIN ACTION BUTTON */}
            <div style={{ textAlign: 'right' }}>
              <button
                className="btn btn-primary"
                onClick={handleTrainModel}
                disabled={training || selectedFeatures.length === 0 || !targetColumn}
                style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 700 }}
              >
                {training ? '⏳ Training Disease Model...' : `🚀 Train Model for ${selectedDisease.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: TRAINING RESULTS & EVALUATION METRICS DASHBOARD */}
      {trainingResult && (
        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🏆</span> Training Complete — Model Evaluation Metrics
            </h4>
            <span style={{ fontSize: '0.74rem', background: '#090d16', padding: '3px 8px', borderRadius: 4, color: '#38bdf8' }}>
              Saved to: {trainingResult.model_path ? 'server/ml/diseases/' + selectedDisease : 'Registry'}
            </span>
          </div>

          {/* 6-Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Accuracy</div>
              <strong style={{ color: '#00d4aa', fontSize: '1.2rem' }}>
                {(trainingResult.metrics?.accuracy * 100)?.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sensitivity (Recall)</div>
              <strong style={{ color: '#10b981', fontSize: '1.2rem' }}>
                {(trainingResult.metrics?.recall * 100)?.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Specificity</div>
              <strong style={{ color: '#38bdf8', fontSize: '1.2rem' }}>
                {(trainingResult.metrics?.specificity * 100)?.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Precision</div>
              <strong style={{ color: '#fff', fontSize: '1.2rem' }}>
                {(trainingResult.metrics?.precision * 100)?.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>F1-Score</div>
              <strong style={{ color: '#f59e0b', fontSize: '1.2rem' }}>
                {trainingResult.metrics?.f1?.toFixed(3)}
              </strong>
            </div>
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROC-AUC</div>
              <strong style={{ color: '#a855f7', fontSize: '1.2rem' }}>
                {trainingResult.metrics?.roc_auc?.toFixed(3)}
              </strong>
            </div>
          </div>

          {/* Confusion Matrix & Feature Importance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Confusion Matrix */}
            <div style={{ background: '#090d16', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
                CLINICAL CONFUSION MATRIX
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: '#10b981' }}>True Positives (TP)</div>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{trainingResult.metrics?.confusion_matrix?.tp ?? 0}</strong>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>False Positives (FP)</div>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{trainingResult.metrics?.confusion_matrix?.fp ?? 0}</strong>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>False Negatives (FN)</div>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{trainingResult.metrics?.confusion_matrix?.fn ?? 0}</strong>
                </div>
                <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>True Negatives (TN)</div>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{trainingResult.metrics?.confusion_matrix?.tn ?? 0}</strong>
                </div>
              </div>
            </div>

            {/* Feature Importance */}
            <div style={{ background: '#090d16', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>
                TOP FEATURE IMPORTANCES
              </div>
              {trainingResult.feature_importance ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(trainingResult.feature_importance).slice(0, 6).map(([feat, imp], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                      <span style={{ color: '#fff' }}>{feat}</span>
                      <span style={{ color: '#00d4aa', fontWeight: 700 }}>{(imp * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  Coefficients mapped directly to linear screening decision function.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: INTERACTIVE LIVE PREDICTION TEST SANDBOX */}
      {inspectionData && (
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔬</span> Step 5: Test Model Prediction Sandbox ({selectedDisease.toUpperCase()})
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Validate that the {selectedDisease.toUpperCase()} model accepts only its own disease-specific features and returns valid clinical probabilities.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16
          }}>
            {selectedFeatures.slice(0, 10).map((col, idx) => (
              <div key={idx}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: 4 }}>
                  {col}:
                </label>
                <input
                  type="text"
                  placeholder="0 or test value"
                  value={testFeatures[col] || ''}
                  onChange={(e) => setTestFeatures({ ...testFeatures, [col]: e.target.value })}
                  style={{
                    width: '100%', padding: '6px 10px', background: '#090d16',
                    color: '#fff', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: '0.82rem'
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleRunTestPrediction}
              disabled={testingModel}
              style={{ fontSize: '0.84rem', padding: '8px 18px' }}
            >
              {testingModel ? 'Evaluating...' : '⚡ Run Test Inference'}
            </button>
            {testResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: '0.82rem', padding: '4px 12px', borderRadius: 4, fontWeight: 700,
                  background: testResult.predicted_class === 1 || testResult.predicted_class === 'Positive' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                  color: testResult.predicted_class === 1 || testResult.predicted_class === 'Positive' ? '#ef4444' : '#10b981'
                }}>
                  Prediction: {testResult.predicted_label || testResult.predicted_class}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#00d4aa' }}>
                  Risk Probability: {(testResult.probability * 100)?.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
