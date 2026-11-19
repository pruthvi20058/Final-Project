const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', 'mediagent.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initTables();
    seedData();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      blood_type TEXT NOT NULL,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      allergies TEXT DEFAULT '[]',
      history TEXT DEFAULT '[]',
      current_medications TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clinical_cases (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      chief_complaint TEXT NOT NULL,
      presenting_symptoms TEXT DEFAULT '[]',
      vitals TEXT DEFAULT '{}',
      lab_reports TEXT DEFAULT '[]',
      triage_category TEXT NOT NULL,
      final_report TEXT,
      agent_trace TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      symptoms TEXT DEFAULT '[]',
      vitals TEXT DEFAULT '{}',
      chief_complaint TEXT DEFAULT '',
      uploaded_images TEXT DEFAULT '[]',
      triage_result TEXT,
      diagnostic_result TEXT,
      medication_result TEXT,
      rag_result TEXT,
      image_result TEXT,
      guardrail_result TEXT,
      final_report TEXT,
      agent_trace TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      specialty TEXT NOT NULL,
      license_number TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      patient_name TEXT,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      raw_ocr_text TEXT,
      ocr_confidence REAL DEFAULT 95.0,
      chief_complaint TEXT,
      symptoms TEXT,
      history TEXT,
      status TEXT DEFAULT 'analyzed',
      demographics TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      raw_name TEXT,
      normalized_name TEXT,
      value REAL NOT NULL,
      units TEXT,
      reference_range TEXT,
      status TEXT NOT NULL,
      quality TEXT DEFAULT 'VALID',
      confidence REAL DEFAULT 95.0,
      validated_by_user INTEGER DEFAULT 0,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL UNIQUE,
      model_name TEXT DEFAULT 'MediAgent Random Forest Classifier',
      model_version TEXT DEFAULT 'v1.0.0',
      predicted_class TEXT NOT NULL,
      probability REAL NOT NULL,
      differentials TEXT DEFAULT '[]',
      model_info TEXT DEFAULT '{}',
      shap_contributions TEXT DEFAULT '[]',
      evidence TEXT DEFAULT '{}',
      risk TEXT DEFAULT '{}',
      uncertainty TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rag_records (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      prediction_id TEXT,
      model_version TEXT DEFAULT 'v2.0.0-pima-diabetes',
      retrieval_timestamp TEXT DEFAULT (datetime('now')),
      query TEXT NOT NULL,
      source_ids TEXT DEFAULT '[]',
      retrieved_documents TEXT DEFAULT '[]',
      relevance_scores TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      prediction_id TEXT,
      model_version TEXT DEFAULT 'v2.0.0-pima-diabetes',
      action TEXT NOT NULL,
      source_ids TEXT DEFAULT '[]',
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS multilingual_consultations (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      input_type TEXT NOT NULL,
      original_language TEXT NOT NULL,
      detected_language TEXT NOT NULL,
      original_text TEXT NOT NULL,
      original_transcript TEXT,
      normalized_text TEXT NOT NULL,
      clinical_entities TEXT DEFAULT '{}',
      user_confirmed INTEGER DEFAULT 0,
      user_corrections TEXT DEFAULT '{}',
      assessment_result TEXT DEFAULT '{}',
      audio_metadata TEXT DEFAULT '{}',
      audio_url TEXT,
      tts_audio_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medical_sources (
      id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      publication_date TEXT,
      access_date TEXT,
      review_date TEXT,
      document_version TEXT
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      active_ingredients TEXT NOT NULL,
      composition TEXT NOT NULL,
      therapeutic_category TEXT NOT NULL,
      uses TEXT NOT NULL,
      mechanism TEXT,
      side_effects TEXT NOT NULL,
      adverse_effects TEXT NOT NULL,
      contraindications TEXT NOT NULL,
      precautions TEXT NOT NULL,
      interactions TEXT NOT NULL,
      storage TEXT NOT NULL,
      pregnancy_lactation TEXT NOT NULL,
      source_id TEXT NOT NULL,
      last_reviewed_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES medical_sources(id)
    );

    CREATE TABLE IF NOT EXISTS diseases (
      id TEXT PRIMARY KEY,
      disease_name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      clinical_type TEXT DEFAULT 'disease',
      description TEXT NOT NULL,
      causes TEXT NOT NULL,
      transmission TEXT NOT NULL,
      incubation_period TEXT,
      risk_factors TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      complications TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      treatment_information TEXT NOT NULL,
      prevention TEXT NOT NULL,
      warning_signs TEXT NOT NULL,
      last_reviewed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS disease_guidelines (
      id TEXT PRIMARY KEY,
      disease_id TEXT NOT NULL,
      guideline_type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_id TEXT NOT NULL,
      FOREIGN KEY (disease_id) REFERENCES diseases(id),
      FOREIGN KEY (source_id) REFERENCES medical_sources(id)
    );

    CREATE TABLE IF NOT EXISTS health_chat_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_role TEXT NOT NULL,
      original_language TEXT DEFAULT 'en',
      original_message TEXT NOT NULL,
      translated_query TEXT,
      response TEXT NOT NULL,
      sources TEXT DEFAULT '[]',
      tool_invoked TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES health_chat_sessions(session_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);
    CREATE INDEX IF NOT EXISTS idx_medicines_brand ON medicines(brand_name);
    CREATE INDEX IF NOT EXISTS idx_diseases_slug ON diseases(slug);
    CREATE INDEX IF NOT EXISTS idx_disease_guidelines_disease ON disease_guidelines(disease_id);
    CREATE INDEX IF NOT EXISTS idx_health_chat_messages_session ON health_chat_messages(session_id);
  `);

  // Graceful column migrations for existing databases
  try { db.exec("ALTER TABLE lab_results ADD COLUMN raw_name TEXT;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN normalized_name TEXT;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN quality TEXT DEFAULT 'VALID';"); } catch {}
  try { db.exec("ALTER TABLE reports ADD COLUMN demographics TEXT;"); } catch {}
}

function seedData() {
  const patientCount = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  if (patientCount === 0) {
    const patients = [
      {
        id: 'PAT-8001', name: 'Sarah Johnson', age: 45, gender: 'Female',
        blood_type: 'A+', weight: 68, height: 165,
        allergies: JSON.stringify(['Penicillin', 'Sulfonamides']),
        history: JSON.stringify(['Type 2 Diabetes (2021)', 'Essential Hypertension (2019)']),
        current_medications: JSON.stringify(['Metformin 1000mg BID', 'Lisinopril 10mg Daily'])
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO patients (id, name, age, gender, blood_type, weight, height, allergies, history, current_medications)
      VALUES (@id, @name, @age, @gender, @blood_type, @weight, @height, @allergies, @history, @current_medications)
    `);
    for (const p of patients) stmt.run(p);
  }

  // Ensure default demo report REP-9001 exists with 20 generic lab parameters
  const rep9001 = db.prepare('SELECT id FROM reports WHERE id = ?').get('REP-9001');
  if (!rep9001) {
    const defaultReport = {
      id: 'REP-9001',
      patient_id: 'PAT-8001',
      patient_name: 'Sarah Johnson',
      original_filename: 'Comprehensive_Metabolic_Report_Sarah_Johnson.pdf',
      stored_filename: 'REP-9001.pdf',
      file_type: 'pdf',
      file_size: 48200,
      raw_ocr_text: 'COMPREHENSIVE METABOLIC LABORATORY REPORT\nPatient: Sarah Johnson | Age: 45 Y | Sex: Female\nGlucose (Fasting): 148 mg/dL (70-99)\nHbA1c: 7.2 % (4.0-5.6)\nDiastolic Blood Pressure: 82 mmHg (60-80)\nSerum Creatinine: 1.1 mg/dL (0.6-1.2)\neGFR: 84 mL/min (>90)\nBUN: 18 mg/dL (7-20)\nALT (SGPT): 38 U/L (7-56)\nAST (SGOT): 32 U/L (10-40)\nTotal Bilirubin: 0.8 mg/dL (0.2-1.2)\nTotal Cholesterol: 215 mg/dL (<200)\nTriglycerides: 175 mg/dL (<150)\nHDL Cholesterol: 44 mg/dL (>50)\nLDL Cholesterol: 136 mg/dL (<100)\nHemoglobin: 13.6 g/dL (12.0-16.0)\nWBC Count: 7100 cells/µL (4000-11000)\nPlatelets: 240000 cells/µL (150000-450000)\nSodium: 141 mEq/L (135-145)\nPotassium: 4.3 mEq/L (3.5-5.0)\nChloride: 101 mEq/L (96-106)\nCalcium: 9.5 mg/dL (8.5-10.2)',
      ocr_confidence: 98.5,
      chief_complaint: 'Routine comprehensive laboratory screening and diabetic review.',
      symptoms: 'mild fatigue, increased thirst',
      history: 'Type 2 Diabetes (2021), Essential Hypertension (2019)',
      status: 'analyzed',
      demographics: JSON.stringify({ age: 45, sex: 'Female' })
    };
    saveReportRecord(defaultReport);

    const genericLabParams = [
      { testName: 'Glucose (Fasting)', rawName: 'Glucose (Fasting)', normalizedName: 'glucose', value: 148, units: 'mg/dL', referenceRange: '70-99', status: 'HIGH', quality: 'VALID', confidence: 99 },
      { testName: 'HbA1c', rawName: 'HbA1c', normalizedName: 'hba1c', value: 7.2, units: '%', referenceRange: '4.0-5.6', status: 'HIGH', quality: 'VALID', confidence: 98 },
      { testName: 'Diastolic Blood Pressure', rawName: 'Diastolic Blood Pressure', normalizedName: 'diastolic_bp', value: 82, units: 'mmHg', referenceRange: '60-80', status: 'HIGH', quality: 'VALID', confidence: 97 },
      { testName: 'Serum Creatinine', rawName: 'Serum Creatinine', normalizedName: 'creatinine', value: 1.1, units: 'mg/dL', referenceRange: '0.6-1.2', status: 'NORMAL', quality: 'VALID', confidence: 99 },
      { testName: 'eGFR', rawName: 'eGFR', normalizedName: 'egfr', value: 84, units: 'mL/min', referenceRange: '>90', status: 'LOW', quality: 'VALID', confidence: 96 },
      { testName: 'Blood Urea Nitrogen', rawName: 'Blood Urea Nitrogen', normalizedName: 'bun', value: 18, units: 'mg/dL', referenceRange: '7-20', status: 'NORMAL', quality: 'VALID', confidence: 98 },
      { testName: 'ALT (SGPT)', rawName: 'ALT (SGPT)', normalizedName: 'alt', value: 38, units: 'U/L', referenceRange: '7-56', status: 'NORMAL', quality: 'VALID', confidence: 99 },
      { testName: 'AST (SGOT)', rawName: 'AST (SGOT)', normalizedName: 'ast', value: 32, units: 'U/L', referenceRange: '10-40', status: 'NORMAL', quality: 'VALID', confidence: 98 },
      { testName: 'Total Bilirubin', rawName: 'Total Bilirubin', normalizedName: 'total_bilirubin', value: 0.8, units: 'mg/dL', referenceRange: '0.2-1.2', status: 'NORMAL', quality: 'VALID', confidence: 97 },
      { testName: 'Total Cholesterol', rawName: 'Total Cholesterol', normalizedName: 'total_cholesterol', value: 215, units: 'mg/dL', referenceRange: '<200', status: 'HIGH', quality: 'VALID', confidence: 98 },
      { testName: 'Triglycerides', rawName: 'Triglycerides', normalizedName: 'triglycerides', value: 175, units: 'mg/dL', referenceRange: '<150', status: 'HIGH', quality: 'VALID', confidence: 97 },
      { testName: 'HDL Cholesterol', rawName: 'HDL Cholesterol', normalizedName: 'hdl', value: 44, units: 'mg/dL', referenceRange: '>50', status: 'LOW', quality: 'VALID', confidence: 96 },
      { testName: 'LDL Cholesterol', rawName: 'LDL Cholesterol', normalizedName: 'ldl', value: 136, units: 'mg/dL', referenceRange: '<100', status: 'HIGH', quality: 'VALID', confidence: 97 },
      { testName: 'Hemoglobin', rawName: 'Hemoglobin', normalizedName: 'hemoglobin', value: 13.6, units: 'g/dL', referenceRange: '12.0-16.0', status: 'NORMAL', quality: 'VALID', confidence: 99 },
      { testName: 'WBC Count', rawName: 'WBC Count', normalizedName: 'wbc', value: 7100, units: 'cells/µL', referenceRange: '4000-11000', status: 'NORMAL', quality: 'VALID', confidence: 98 },
      { testName: 'Platelet Count', rawName: 'Platelet Count', normalizedName: 'platelets', value: 240000, units: 'cells/µL', referenceRange: '150000-450000', status: 'NORMAL', quality: 'VALID', confidence: 97 },
      { testName: 'Serum Sodium', rawName: 'Serum Sodium', normalizedName: 'sodium', value: 141, units: 'mEq/L', referenceRange: '135-145', status: 'NORMAL', quality: 'VALID', confidence: 99 },
      { testName: 'Serum Potassium', rawName: 'Serum Potassium', normalizedName: 'potassium', value: 4.3, units: 'mEq/L', referenceRange: '3.5-5.0', status: 'NORMAL', quality: 'VALID', confidence: 98 },
      { testName: 'Chloride', rawName: 'Chloride', normalizedName: 'chloride', value: 101, units: 'mEq/L', referenceRange: '96-106', status: 'NORMAL', quality: 'VALID', confidence: 97 },
      { testName: 'Calcium', rawName: 'Calcium', normalizedName: 'calcium', value: 9.5, units: 'mg/dL', referenceRange: '8.5-10.2', status: 'NORMAL', quality: 'VALID', confidence: 98 }
    ];
    saveLabResultsRecord('REP-9001', genericLabParams);
  }

  // --- HEALTH COMPANION SEEDING ---
  try {
    const { MEDICAL_SOURCES, MEDICINES, DISEASES, DISEASE_GUIDELINES } = require('./healthCompanionSeed');

    // 1. Seed Medical Sources
    const sourceCount = db.prepare('SELECT COUNT(*) as c FROM medical_sources').get().c;
    if (sourceCount === 0) {
      const sourceStmt = db.prepare(`
        INSERT INTO medical_sources (id, source_name, source_url, publication_date, access_date, review_date, document_version)
        VALUES (@id, @source_name, @source_url, @publication_date, @access_date, @review_date, @document_version)
      `);
      for (const s of MEDICAL_SOURCES) {
        sourceStmt.run(s);
      }
    }

    // 2. Seed Medicines
    const medCount = db.prepare('SELECT COUNT(*) as c FROM medicines').get().c;
    if (medCount === 0) {
      const medStmt = db.prepare(`
        INSERT INTO medicines (
          id, brand_name, generic_name, active_ingredients, composition,
          therapeutic_category, uses, mechanism, side_effects, adverse_effects,
          contraindications, precautions, interactions, storage, pregnancy_lactation,
          source_id, last_reviewed_at
        ) VALUES (
          @id, @brand_name, @generic_name, @active_ingredients, @composition,
          @therapeutic_category, @uses, @mechanism, @side_effects, @adverse_effects,
          @contraindications, @precautions, @interactions, @storage, @pregnancy_lactation,
          @source_id, @last_reviewed_at
        )
      `);
      for (const m of MEDICINES) {
        medStmt.run(m);
      }
    }

    // 3. Seed Diseases
    const diseaseCount = db.prepare('SELECT COUNT(*) as c FROM diseases').get().c;
    if (diseaseCount === 0) {
      const disStmt = db.prepare(`
        INSERT INTO diseases (
          id, disease_name, slug, clinical_type, description, causes, transmission,
          incubation_period, risk_factors, symptoms, complications, diagnosis,
          treatment_information, prevention, warning_signs, last_reviewed_at
        ) VALUES (
          @id, @disease_name, @slug, @clinical_type, @description, @causes, @transmission,
          @incubation_period, @risk_factors, @symptoms, @complications, @diagnosis,
          @treatment_information, @prevention, @warning_signs, @last_reviewed_at
        )
      `);
      for (const d of DISEASES) {
        disStmt.run(d);
      }
    }

    // 4. Seed Disease Guidelines
    const guideCount = db.prepare('SELECT COUNT(*) as c FROM disease_guidelines').get().c;
    if (guideCount === 0) {
      const disMap = {};
      const allDis = db.prepare('SELECT id, slug FROM diseases').all();
      for (const item of allDis) {
        disMap[item.slug] = item.id;
      }

      const guideStmt = db.prepare(`
        INSERT INTO disease_guidelines (id, disease_id, guideline_type, content, source_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < DISEASE_GUIDELINES.length; i++) {
        const g = DISEASE_GUIDELINES[i];
        const diseaseId = disMap[g.disease_slug];
        if (diseaseId) {
          const guideId = `DG-${g.disease_slug}-${g.guideline_type}-${i}`;
          guideStmt.run(guideId, diseaseId, g.guideline_type, g.content, g.source_id);
        }
      }
    }

    // Seed demo consultation if none exists
    const consultationCount = db.prepare('SELECT COUNT(*) as c FROM consultations').get().c;
    if (consultationCount === 0) {
      db.prepare(`
        INSERT INTO consultations (id, patient_id, symptoms, vitals, chief_complaint, triage_result, status)
        VALUES (?, ?, ?, ?, ?, ?, 'complete')
      `).run(
        'CON-1001',
        'PAT-8001',
        JSON.stringify(['mild fatigue', 'increased thirst', 'frequent urination']),
        JSON.stringify({ bloodPressure: '135/85', heartRate: 78, temperature: 98.6 }),
        'Routine follow-up for diabetes management and blood glucose monitoring',
        JSON.stringify({ triageLevel: 'Routine', recommendation: 'Monitor fasting glucose and HbA1c' })
      );
    }
  } catch (err) {
    console.warn('[DB] Health Companion seeding error:', err.message);
  }
}

function saveReportRecord(reportObj) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO reports (id, patient_id, patient_name, original_filename, stored_filename, file_type, file_size, raw_ocr_text, ocr_confidence, chief_complaint, symptoms, history, status, demographics, created_at)
    VALUES (@id, @patient_id, @patient_name, @original_filename, @stored_filename, @file_type, @file_size, @raw_ocr_text, @ocr_confidence, @chief_complaint, @symptoms, @history, @status, @demographics, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      raw_ocr_text = excluded.raw_ocr_text,
      ocr_confidence = excluded.ocr_confidence,
      demographics = excluded.demographics,
      status = excluded.status
  `);

  const demoStr = reportObj.demographics
    ? (typeof reportObj.demographics === 'string' ? reportObj.demographics : JSON.stringify(reportObj.demographics))
    : (reportObj.patientDemographics ? JSON.stringify(reportObj.patientDemographics) : null);

  stmt.run({
    id: reportObj.id,
    patient_id: reportObj.patient_id || 'PAT-GENERIC',
    patient_name: reportObj.patient_name || 'Generic Patient',
    original_filename: reportObj.original_filename,
    stored_filename: reportObj.stored_filename,
    file_type: reportObj.file_type || 'pdf',
    file_size: reportObj.file_size || 0,
    raw_ocr_text: reportObj.raw_ocr_text || '',
    ocr_confidence: reportObj.ocr_confidence !== undefined ? reportObj.ocr_confidence : null,
    chief_complaint: reportObj.chief_complaint || '',
    symptoms: reportObj.symptoms || '',
    history: reportObj.history || '',
    status: reportObj.status || 'analyzed',
    demographics: demoStr
  });
}

function saveLabResultsRecord(reportId, labResults) {
  const database = getDb();
  database.prepare('DELETE FROM lab_results WHERE report_id = ?').run(reportId);

  const insertStmt = database.prepare(`
    INSERT INTO lab_results (id, report_id, test_name, raw_name, normalized_name, value, units, reference_range, status, quality, confidence, validated_by_user)
    VALUES (@id, @report_id, @test_name, @raw_name, @normalized_name, @value, @units, @reference_range, @status, @quality, @confidence, @validated_by_user)
  `);

  const tx = database.transaction((items) => {
    for (const item of items) {
      const uniqueId = `LR-${reportId.replace('REP-', '')}-${uuidv4().slice(0, 6)}`;
      
      let refRangeStr = '';
      if (typeof item.referenceRange === 'string') {
        refRangeStr = item.referenceRange;
      } else if (typeof item.reference_range === 'string') {
        refRangeStr = item.reference_range;
      } else if (item.referenceRange && typeof item.referenceRange === 'object') {
        refRangeStr = item.referenceRange.raw || JSON.stringify(item.referenceRange);
      } else if (item.reference_range && typeof item.reference_range === 'object') {
        refRangeStr = item.reference_range.raw || JSON.stringify(item.reference_range);
      }

      let unitsStr = '';
      if (typeof item.units === 'string') {
        unitsStr = item.units;
      } else if (typeof item.unit === 'string') {
        unitsStr = item.unit;
      } else if (item.units && typeof item.units === 'object') {
        unitsStr = JSON.stringify(item.units);
      }

      insertStmt.run({
        id: uniqueId,
        report_id: reportId,
        test_name: item.testName || item.test_name || item.rawName || 'Lab Test',
        raw_name: item.rawName || item.raw_name || item.testName || 'Lab Test',
        normalized_name: item.normalizedName || item.normalized_name || '',
        value: item.value,
        units: unitsStr,
        reference_range: refRangeStr,
        status: item.status || 'normal',
        quality: item.quality || 'VALID',
        confidence: item.confidence !== undefined ? item.confidence : 95.0,
        validated_by_user: item.validatedByUser ? 1 : 0
      });
    }
  });
  tx(labResults);
}

function savePredictionRecord(pred) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO predictions (id, report_id, model_name, model_version, predicted_class, probability, differentials, model_info, shap_contributions, evidence, risk, uncertainty, created_at)
    VALUES (@id, @report_id, @model_name, @model_version, @predicted_class, @probability, @differentials, @model_info, @shap_contributions, @evidence, @risk, @uncertainty, datetime('now'))
    ON CONFLICT(report_id) DO UPDATE SET
      predicted_class = excluded.predicted_class,
      probability = excluded.probability,
      differentials = excluded.differentials,
      model_info = excluded.model_info,
      shap_contributions = excluded.shap_contributions,
      evidence = excluded.evidence,
      risk = excluded.risk,
      uncertainty = excluded.uncertainty,
      created_at = datetime('now')
  `);
  stmt.run({
    id: pred.id || `PRED-${uuidv4().slice(0, 8)}`,
    report_id: pred.reportId,
    model_name: pred.modelName || 'MediAgent Pima Diabetes Classifier',
    model_version: pred.modelVersion || 'v2.0.0-pima-diabetes',
    predicted_class: pred.predictedClass || 'Negative',
    probability: pred.probability || 0.0,
    differentials: JSON.stringify(pred.differentials || []),
    model_info: JSON.stringify(pred.modelInfo || {}),
    shap_contributions: JSON.stringify(pred.shapContributions || pred.explanation || []),
    evidence: JSON.stringify(pred.evidence || {}),
    risk: JSON.stringify(pred.risk || {}),
    uncertainty: JSON.stringify(pred.uncertainty || {})
  });
}

function saveRagRecord(ragObj) {
  const database = getDb();
  const id = `RAG-${uuidv4().slice(0, 8)}`;
  const stmt = database.prepare(`
    INSERT INTO rag_records (id, report_id, prediction_id, model_version, query, source_ids, retrieved_documents, relevance_scores, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    id,
    ragObj.reportId || 'REP-UNKNOWN',
    ragObj.predictionId || 'PRED-UNKNOWN',
    ragObj.modelVersion || 'v2.0.0-pima-diabetes',
    ragObj.query || '',
    JSON.stringify(ragObj.sourceIds || []),
    JSON.stringify(ragObj.sources || []),
    JSON.stringify(ragObj.relevanceScores || [])
  );
  return id;
}

function saveAuditLog(auditObj) {
  const database = getDb();
  const id = `AUD-${uuidv4().slice(0, 8)}`;
  const stmt = database.prepare(`
    INSERT INTO audit_logs (id, report_id, prediction_id, model_version, action, source_ids, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    id,
    auditObj.reportId || null,
    auditObj.predictionId || null,
    auditObj.modelVersion || 'v2.0.0-pima-diabetes',
    auditObj.action || 'RAG_EVIDENCE_RETRIEVAL',
    JSON.stringify(auditObj.sourceIds || []),
    JSON.stringify(auditObj.details || {})
  );
  return id;
}

function getReportRecord(reportId) {
  const database = getDb();
  const rep = database.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
  if (!rep) return null;

  // Retrieve associated patient record if available
  let patient = null;
  if (rep.patient_id) {
    try {
      patient = database.prepare('SELECT * FROM patients WHERE id = ?').get(rep.patient_id);
    } catch {}
  }

  // Parse stored demographics JSON
  let demographics = null;
  if (rep.demographics) {
    try {
      demographics = typeof rep.demographics === 'string' ? JSON.parse(rep.demographics) : rep.demographics;
    } catch {}
  }

  const labResultsRows = database.prepare('SELECT * FROM lab_results WHERE report_id = ?').all(reportId);
  const labResults = labResultsRows.map(r => ({
    id: r.id,
    testName: r.test_name,
    rawName: r.raw_name || r.test_name,
    normalizedName: r.normalized_name || '',
    value: r.value,
    units: r.units,
    unit: r.units,
    referenceRange: r.reference_range,
    status: r.status,
    quality: r.quality || 'VALID',
    confidence: r.confidence,
    validatedByUser: Boolean(r.validated_by_user)
  }));

  return {
    id: rep.id,
    patientId: rep.patient_id,
    patientName: rep.patient_name || (patient ? patient.name : 'Unknown'),
    patientAge: demographics && demographics.age ? demographics.age : (patient ? patient.age : null),
    patientGender: demographics && demographics.sex ? demographics.sex : (patient ? patient.gender : null),
    patientWeight: patient ? patient.weight : null,
    patientHeight: patient ? patient.height : null,
    patientDemographics: demographics || (patient ? { age: patient.age, sex: patient.gender } : null),
    filename: rep.original_filename,
    storedFilename: rep.stored_filename,
    fileType: rep.file_type,
    fileSize: rep.file_size,
    rawOcrText: rep.raw_ocr_text,
    ocrConfidence: rep.ocr_confidence,
    chiefComplaint: rep.chief_complaint,
    symptoms: rep.symptoms ? rep.symptoms.split(',').map(s => s.trim()) : [],
    history: rep.history,
    status: rep.status,
    uploadDate: rep.created_at,
    labResults
  };
}

function getPredictionRecord(reportId) {
  const database = getDb();
  const p = database.prepare('SELECT * FROM predictions WHERE report_id = ?').get(reportId);
  if (!p) return null;

  const diffs = JSON.parse(p.differentials || '[]');
  const isPositive = p.predicted_class && (p.predicted_class.includes('Positive') || p.predicted_class.includes('Elevated') || (typeof p.probability === 'number' && p.probability >= 0.5));
  const displayPct = typeof p.probability === 'number' && p.probability <= 1 ? Math.round(p.probability * 1000) / 10 : (p.probability || 0);

  const topPrediction = {
    disease: isPositive ? 'Type 2 Diabetes Mellitus' : 'Low Risk / Negative for Diabetes',
    probability: displayPct,
    severity: isPositive ? 'high' : 'low',
    icd10: isPositive ? 'E11.9' : 'Z13.1',
    reasoning: isPositive ? 'Elevated probability based on clinical laboratory indicators.' : 'Laboratory parameters indicate low risk for Type 2 Diabetes.',
    supportingFeatures: []
  };

  const differentials = diffs.length > 0 ? diffs : [
    {
      disease: isPositive ? 'Pre-diabetes / Impaired Fasting Glucose' : 'Type 2 Diabetes Mellitus',
      probability: isPositive ? Math.max(0, Math.round((100 - displayPct) * 10) / 10) : displayPct,
      severity: 'moderate',
      icd10: isPositive ? 'R73.01' : 'E11.9'
    }
  ];

  return {
    id: p.id,
    reportId: p.report_id,
    modelName: p.model_name,
    modelVersion: p.model_version,
    predictedClass: p.predicted_class,
    probability: p.probability,
    displayProbabilityPct: displayPct,
    topPrediction,
    differentials,
    modelInfo: JSON.parse(p.model_info || '{}'),
    shapContributions: JSON.parse(p.shap_contributions || '[]'),
    evidence: JSON.parse(p.evidence || '{}'),
    risk: JSON.parse(p.risk || '{}'),
    uncertainty: JSON.parse(p.uncertainty || '{}'),
    createdAt: p.created_at
  };
}

function getAllReportRecords() {
  const database = getDb();
  const reps = database.prepare('SELECT * FROM reports ORDER BY created_at DESC').all();
  return reps.map(rep => {
    const labResults = database.prepare('SELECT * FROM lab_results WHERE report_id = ?').all(rep.id).map(r => ({
      id: r.id,
      testName: r.test_name,
      rawName: r.raw_name || r.test_name,
      normalizedName: r.normalized_name || '',
      value: r.value,
      units: r.units,
      unit: r.units,
      referenceRange: r.reference_range,
      status: r.status,
      quality: r.quality || 'VALID',
      confidence: r.confidence
    }));
    return {
      id: rep.id,
      patientId: rep.patient_id,
      patientName: rep.patient_name,
      filename: rep.original_filename,
      storedFilename: rep.stored_filename,
      fileType: rep.file_type,
      uploadDate: rep.created_at,
      status: rep.status,
      ocrConfidence: rep.ocr_confidence,
      labResults
    };
  });
}

function saveMultilingualConsultation(c) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO multilingual_consultations (
      id, patient_id, input_type, original_language, detected_language,
      original_text, original_transcript, normalized_text, clinical_entities,
      user_confirmed, user_corrections, assessment_result, audio_metadata,
      audio_url, tts_audio_url, created_at
    ) VALUES (
      @id, @patient_id, @input_type, @original_language, @detected_language,
      @original_text, @original_transcript, @normalized_text, @clinical_entities,
      @user_confirmed, @user_corrections, @assessment_result, @audio_metadata,
      @audio_url, @tts_audio_url, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      user_confirmed = excluded.user_confirmed,
      user_corrections = excluded.user_corrections,
      assessment_result = excluded.assessment_result,
      tts_audio_url = excluded.tts_audio_url
  `);

  stmt.run({
    id: c.id,
    patient_id: c.patientId || c.patient_id || 'PAT-GENERIC',
    input_type: c.inputType || c.input_type || 'text',
    original_language: c.originalLanguage || c.original_language || 'en',
    detected_language: c.detectedLanguage || c.detected_language || 'en',
    original_text: c.originalText || c.original_text || '',
    original_transcript: c.originalTranscript || c.original_transcript || null,
    normalized_text: c.normalizedText || c.normalized_text || '',
    clinical_entities: typeof c.clinicalEntities === 'string' ? c.clinicalEntities : JSON.stringify(c.clinicalEntities || {}),
    user_confirmed: c.userConfirmed ? 1 : 0,
    user_corrections: typeof c.userCorrections === 'string' ? c.userCorrections : JSON.stringify(c.userCorrections || {}),
    assessment_result: typeof c.assessmentResult === 'string' ? c.assessmentResult : JSON.stringify(c.assessmentResult || {}),
    audio_metadata: typeof c.audioMetadata === 'string' ? c.audioMetadata : JSON.stringify(c.audioMetadata || {}),
    audio_url: c.audioUrl || c.audio_url || null,
    tts_audio_url: c.ttsAudioUrl || c.tts_audio_url || null
  });

  return getMultilingualConsultation(c.id);
}

function getMultilingualConsultation(id) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM multilingual_consultations WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    inputType: row.input_type,
    originalLanguage: row.original_language,
    detectedLanguage: row.detected_language,
    originalText: row.original_text,
    originalTranscript: row.original_transcript,
    normalizedText: row.normalized_text,
    clinicalEntities: JSON.parse(row.clinical_entities || '{}'),
    userConfirmed: Boolean(row.user_confirmed),
    userCorrections: JSON.parse(row.user_corrections || '{}'),
    assessmentResult: JSON.parse(row.assessment_result || '{}'),
    audioMetadata: JSON.parse(row.audio_metadata || '{}'),
    audioUrl: row.audio_url,
    ttsAudioUrl: row.tts_audio_url,
    createdAt: row.created_at
  };
}

function getAllMultilingualConsultations() {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM multilingual_consultations ORDER BY created_at DESC').all();
  return rows.map(row => ({
    id: row.id,
    patientId: row.patient_id,
    inputType: row.input_type,
    originalLanguage: row.original_language,
    detectedLanguage: row.detected_language,
    originalText: row.original_text,
    originalTranscript: row.original_transcript,
    normalizedText: row.normalized_text,
    clinicalEntities: JSON.parse(row.clinical_entities || '{}'),
    userConfirmed: Boolean(row.user_confirmed),
    userCorrections: JSON.parse(row.user_corrections || '{}'),
    assessmentResult: JSON.parse(row.assessment_result || '{}'),
    audioMetadata: JSON.parse(row.audio_metadata || '{}'),
    audioUrl: row.audio_url,
    ttsAudioUrl: row.tts_audio_url,
    createdAt: row.created_at
  }));
}

// ============================================================================
// HEALTH COMPANION HELPERS (Medicines, Diseases, Guidelines, Sources, Chat)
// ============================================================================

function getAllMedicines({ query = '', category = '', limit = 50 } = {}) {
  const database = getDb();
  let sql = `
    SELECT m.*, s.source_name, s.source_url, s.publication_date
    FROM medicines m
    LEFT JOIN medical_sources s ON m.source_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (query && query.trim()) {
    const q = `%${query.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(m.brand_name) LIKE ? OR LOWER(m.generic_name) LIKE ? OR LOWER(m.active_ingredients) LIKE ? OR LOWER(m.therapeutic_category) LIKE ?)`;
    params.push(q, q, q, q);
  }

  if (category && category.trim()) {
    sql += ` AND LOWER(m.therapeutic_category) LIKE ?`;
    params.push(`%${category.trim().toLowerCase()}%`);
  }

  sql += ` ORDER BY m.generic_name ASC LIMIT ?`;
  params.push(limit);

  const rows = database.prepare(sql).all(...params);
  return rows.map(row => ({
    id: row.id,
    brandName: row.brand_name,
    genericName: row.generic_name,
    activeIngredients: JSON.parse(row.active_ingredients || '[]'),
    composition: row.composition,
    therapeuticCategory: row.therapeutic_category,
    uses: row.uses,
    mechanism: row.mechanism,
    sideEffects: JSON.parse(row.side_effects || '[]'),
    adverseEffects: row.adverse_effects,
    contraindications: row.contraindications,
    precautions: row.precautions,
    interactions: row.interactions,
    storage: row.storage,
    pregnancyLactation: row.pregnancy_lactation,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    lastReviewedAt: row.last_reviewed_at
  }));
}

function getMedicineById(idOrName) {
  if (!idOrName) return null;
  const database = getDb();
  const row = database.prepare(`
    SELECT m.*, s.source_name, s.source_url, s.publication_date
    FROM medicines m
    LEFT JOIN medical_sources s ON m.source_id = s.id
    WHERE m.id = ? OR LOWER(m.generic_name) = ? OR LOWER(m.brand_name) LIKE ?
  `).get(idOrName, idOrName.toLowerCase(), `%${idOrName.toLowerCase()}%`);

  if (!row) return null;
  return {
    id: row.id,
    brandName: row.brand_name,
    genericName: row.generic_name,
    activeIngredients: JSON.parse(row.active_ingredients || '[]'),
    composition: row.composition,
    therapeuticCategory: row.therapeutic_category,
    uses: row.uses,
    mechanism: row.mechanism,
    sideEffects: JSON.parse(row.side_effects || '[]'),
    adverseEffects: row.adverse_effects,
    contraindications: row.contraindications,
    precautions: row.precautions,
    interactions: row.interactions,
    storage: row.storage,
    pregnancyLactation: row.pregnancy_lactation,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    lastReviewedAt: row.last_reviewed_at
  };
}

function getAllDiseases() {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM diseases ORDER BY disease_name ASC').all();
  return rows.map(row => ({
    id: row.id,
    diseaseName: row.disease_name,
    slug: row.slug,
    clinicalType: row.clinical_type || 'disease',
    description: row.description,
    causes: row.causes,
    transmission: row.transmission,
    incubationPeriod: row.incubation_period,
    riskFactors: JSON.parse(row.risk_factors || '[]'),
    symptoms: JSON.parse(row.symptoms || '[]'),
    complications: JSON.parse(row.complications || '[]'),
    diagnosis: JSON.parse(row.diagnosis || '{}'),
    treatmentInformation: row.treatment_information,
    prevention: row.prevention,
    warningSigns: JSON.parse(row.warning_signs || '[]'),
    lastReviewedAt: row.last_reviewed_at
  }));
}

function getDiseaseBySlug(slug) {
  if (!slug) return null;
  const database = getDb();
  const row = database.prepare('SELECT * FROM diseases WHERE slug = ? OR id = ?').get(slug, slug);
  if (!row) return null;

  // Fetch all guidelines associated with this disease
  const guidelines = database.prepare(`
    SELECT dg.guideline_type, dg.content, s.source_name, s.source_url, s.publication_date
    FROM disease_guidelines dg
    LEFT JOIN medical_sources s ON dg.source_id = s.id
    WHERE dg.disease_id = ?
  `).all(row.id);

  const guidelinesMap = {};
  for (const g of guidelines) {
    let parsedContent;
    try {
      parsedContent = JSON.parse(g.content);
    } catch {
      parsedContent = g.content;
    }
    guidelinesMap[g.guideline_type] = {
      content: parsedContent,
      sourceName: g.source_name,
      sourceUrl: g.source_url,
      publicationDate: g.publication_date
    };
  }

  return {
    id: row.id,
    diseaseName: row.disease_name,
    slug: row.slug,
    clinicalType: row.clinical_type || 'disease',
    description: row.description,
    causes: row.causes,
    transmission: row.transmission,
    incubationPeriod: row.incubation_period,
    riskFactors: JSON.parse(row.risk_factors || '[]'),
    symptoms: JSON.parse(row.symptoms || '[]'),
    complications: JSON.parse(row.complications || '[]'),
    diagnosis: JSON.parse(row.diagnosis || '{}'),
    treatmentInformation: row.treatment_information,
    prevention: row.prevention,
    warningSigns: JSON.parse(row.warning_signs || '[]'),
    lastReviewedAt: row.last_reviewed_at,
    guidelines: guidelinesMap
  };
}

function getDiseaseGuidelines(slug, type) {
  const database = getDb();
  let sql = `
    SELECT dg.guideline_type, dg.content, s.source_name, s.source_url, s.publication_date, d.disease_name, d.slug
    FROM disease_guidelines dg
    JOIN diseases d ON dg.disease_id = d.id
    LEFT JOIN medical_sources s ON dg.source_id = s.id
    WHERE (d.slug = ? OR d.id = ?)
  `;
  const params = [slug, slug];

  if (type) {
    sql += ` AND dg.guideline_type = ?`;
    params.push(type);
  }

  const rows = database.prepare(sql).all(...params);
  return rows.map(r => {
    let parsed;
    try { parsed = JSON.parse(r.content); } catch { parsed = r.content; }
    return {
      guidelineType: r.guideline_type,
      diseaseName: r.disease_name,
      diseaseSlug: r.slug,
      content: parsed,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      publicationDate: r.publication_date
    };
  });
}

function getAllMedicalSources() {
  const database = getDb();
  return database.prepare('SELECT * FROM medical_sources ORDER BY source_name ASC').all().map(r => ({
    id: r.id,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    publicationDate: r.publication_date,
    accessDate: r.access_date,
    reviewDate: r.review_date,
    documentVersion: r.document_version
  }));
}

function createOrGetHealthSession(sessionId, preferredLanguage = 'en') {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM health_chat_sessions WHERE session_id = ?').get(sessionId);
  if (existing) {
    if (preferredLanguage && existing.preferred_language !== preferredLanguage) {
      database.prepare('UPDATE health_chat_sessions SET preferred_language = ? WHERE session_id = ?').run(preferredLanguage, sessionId);
      existing.preferred_language = preferredLanguage;
    }
    return {
      id: existing.id,
      sessionId: existing.session_id,
      preferredLanguage: existing.preferred_language,
      createdAt: existing.created_at
    };
  }

  const id = `HCS-${uuidv4().slice(0, 8)}`;
  database.prepare(`
    INSERT INTO health_chat_sessions (id, session_id, preferred_language, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(id, sessionId, preferredLanguage || 'en');

  return {
    id,
    sessionId,
    preferredLanguage: preferredLanguage || 'en',
    createdAt: new Date().toISOString()
  };
}

function saveHealthChatMessage({
  sessionId,
  role = 'user',
  originalLanguage = 'en',
  originalMessage = '',
  translatedQuery = null,
  response = '',
  sources = [],
  toolInvoked = null
}) {
  const database = getDb();
  createOrGetHealthSession(sessionId, originalLanguage);

  const id = `HCM-${uuidv4().slice(0, 10)}`;
  const sourcesStr = typeof sources === 'string' ? sources : JSON.stringify(sources || []);

  database.prepare(`
    INSERT INTO health_chat_messages (
      id, session_id, message_role, original_language, original_message,
      translated_query, response, sources, tool_invoked, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    sessionId,
    role,
    originalLanguage,
    originalMessage,
    translatedQuery,
    response,
    sourcesStr,
    toolInvoked
  );

  return {
    id,
    sessionId,
    role,
    originalLanguage,
    originalMessage,
    translatedQuery,
    response,
    sources: Array.isArray(sources) ? sources : JSON.parse(sourcesStr),
    toolInvoked,
    createdAt: new Date().toISOString()
  };
}

function getHealthChatHistory(sessionId) {
  const database = getDb();
  const rows = database.prepare(`
    SELECT * FROM health_chat_messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(sessionId);

  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.message_role,
    originalLanguage: r.original_language,
    originalMessage: r.original_message,
    translatedQuery: r.translated_query,
    response: r.response,
    sources: JSON.parse(r.sources || '[]'),
    toolInvoked: r.tool_invoked,
    createdAt: r.created_at
  }));
}

function getAllHealthChatSessions() {
  const database = getDb();
  const rows = database.prepare(`
    SELECT s.*, COUNT(m.id) as message_count, MAX(m.created_at) as last_activity
    FROM health_chat_sessions s
    LEFT JOIN health_chat_messages m ON s.session_id = m.session_id
    GROUP BY s.session_id
    ORDER BY COALESCE(MAX(m.created_at), s.created_at) DESC
  `).all();

  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    preferredLanguage: r.preferred_language,
    createdAt: r.created_at,
    messageCount: r.message_count,
    lastActivity: r.last_activity || r.created_at
  }));
}

function deleteHealthChatSession(sessionId) {
  const database = getDb();
  database.prepare('DELETE FROM health_chat_messages WHERE session_id = ?').run(sessionId);
  const info = database.prepare('DELETE FROM health_chat_sessions WHERE session_id = ?').run(sessionId);
  return { success: info.changes > 0, sessionId };
}

module.exports = {
  getDb,
  saveReportRecord,
  saveLabResultsRecord,
  savePredictionRecord,
  saveRagRecord,
  saveAuditLog,
  getReportRecord,
  getPredictionRecord,
  getAllReportRecords,
  saveMultilingualConsultation,
  getMultilingualConsultation,
  getAllMultilingualConsultations,
  getAllMedicines,
  getMedicineById,
  getAllDiseases,
  getDiseaseBySlug,
  getDiseaseGuidelines,
  getAllMedicalSources,
  createOrGetHealthSession,
  saveHealthChatMessage,
  getHealthChatHistory,
  getAllHealthChatSessions,
  deleteHealthChatSession
};
