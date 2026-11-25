const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

let db = null;

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Sync version of hashPassword for use in seed/initialization contexts.
 * @param {string} plainPassword
 * @returns {string} bcrypt hash
 */
function hashPasswordSync(plainPassword) {
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

/**
 * Sync version of verifyPassword for use in login contexts.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {boolean}
 */
function verifyPasswordSync(plainPassword, hash) {
  return bcrypt.compareSync(plainPassword, hash);
}

/**
 * Migrate existing plaintext passwords in the doctors table to bcrypt hashes.
 * Any doctor with a non-null `password` and null `password_hash` gets their
 * plaintext password hashed and stored in `password_hash`, then `password` is cleared.
 * This runs once at startup and never logs or returns plaintext passwords.
 */
function migratePlaintextPasswords() {
  try {
    const doctors = db.prepare('SELECT id, password, password_hash FROM doctors WHERE password IS NOT NULL AND password_hash IS NULL').all();
    for (const doctor of doctors) {
      try {
        const hash = hashPasswordSync(doctor.password);
        db.prepare('UPDATE doctors SET password_hash = ?, password = NULL WHERE id = ?').run(hash, doctor.id);
      } catch (err) {
        console.warn(`[DB] Failed to migrate password for doctor ${doctor.id}:`, err.message);
      }
    }
  } catch {
    // Table may not exist yet or column may be missing; ignore
  }
}

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
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES doctors(id)
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
      password TEXT,
      password_hash TEXT,
      specialty TEXT NOT NULL,
      license_number TEXT NOT NULL,
      role TEXT DEFAULT 'doctor',
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
      status TEXT DEFAULT 'UPLOADED',
      verification_timestamp TEXT,
      verified_by TEXT,
      demographics TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      raw_name TEXT,
      normalized_name TEXT,
      value REAL NOT NULL,
      original_value REAL,
      units TEXT,
      reference_range TEXT,
      status TEXT NOT NULL,
      quality TEXT DEFAULT 'VALID',
      validation_flags TEXT DEFAULT '[]',
      confidence REAL DEFAULT 95.0,
      source_location TEXT,
      validated_by_user INTEGER DEFAULT 0,
      validated_at TEXT,
      validated_by TEXT,
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
  try { db.exec("ALTER TABLE doctors ADD COLUMN password_hash TEXT;"); } catch {}
  try { db.exec("ALTER TABLE doctors ADD COLUMN role TEXT DEFAULT 'doctor';"); } catch {}
  try { db.exec("ALTER TABLE patients ADD COLUMN created_by TEXT;"); } catch {}
  try { db.exec("ALTER TABLE reports ADD COLUMN created_by TEXT;"); } catch {}
  try { db.exec("ALTER TABLE reports ADD COLUMN status TEXT DEFAULT 'UPLOADED';"); } catch {}
  try { db.exec("ALTER TABLE reports ADD COLUMN verification_timestamp TEXT;"); } catch {}
  try { db.exec("ALTER TABLE reports ADD COLUMN verified_by TEXT;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN original_value REAL;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN validation_flags TEXT DEFAULT '[]';"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN source_location TEXT;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN validated_at TEXT;"); } catch {}
  try { db.exec("ALTER TABLE lab_results ADD COLUMN validated_by TEXT;"); } catch {}
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

  // Seed default doctor account with hashed password
  const doctorCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
  if (doctorCount === 0) {
    const defaultPasswordHash = hashPasswordSync('MediAgent@2026!Secure');
    db.prepare(`
      INSERT INTO doctors (id, name, email, password_hash, specialty, license_number, role, created_at)
      VALUES (@id, @name, @email, @password_hash, @specialty, @license_number, @role, datetime('now'))
    `).run({
      id: 'DOC-001',
      name: 'Dr. Pavan Kumar',
      email: 'pavan@mediagent.com',
      password_hash: defaultPasswordHash,
      specialty: 'General Medicine',
      license_number: 'MG-2026-001',
      role: 'doctor',
    });
  } else {
    // Migrate any existing plaintext passwords to bcrypt hashes
    migratePlaintextPasswords();
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
    INSERT INTO reports (id, patient_id, patient_name, original_filename, stored_filename, file_type, file_size, raw_ocr_text, ocr_confidence, chief_complaint, symptoms, history, status, verification_timestamp, verified_by, demographics, created_at)
    VALUES (@id, @patient_id, @patient_name, @original_filename, @stored_filename, @file_type, @file_size, @raw_ocr_text, @ocr_confidence, @chief_complaint, @symptoms, @history, @status, @verification_timestamp, @verified_by, @demographics, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      raw_ocr_text = excluded.raw_ocr_text,
      ocr_confidence = excluded.ocr_confidence,
      demographics = excluded.demographics,
      status = excluded.status,
      verification_timestamp = excluded.verification_timestamp,
      verified_by = excluded.verified_by
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
    chief_complaint: reportObj.chief_complaint || reportObj.chiefComplaint || '',
    symptoms: Array.isArray(reportObj.symptoms) ? reportObj.symptoms.join(', ') : (reportObj.symptoms || ''),
    history: reportObj.history || '',
    status: reportObj.status || 'UPLOADED',
    verification_timestamp: reportObj.verification_timestamp || null,
    verified_by: reportObj.verified_by || null,
    demographics: demoStr
  });
}

function saveLabResultsRecord(reportId, labResults) {
  const database = getDb();
  database.prepare('DELETE FROM lab_results WHERE report_id = ?').run(reportId);

  const insertStmt = database.prepare(`
    INSERT INTO lab_results (id, report_id, test_name, raw_name, normalized_name, value, original_value, units, reference_range, status, quality, validation_flags, confidence, source_location, validated_by_user, validated_at, validated_by)
    VALUES (@id, @report_id, @test_name, @raw_name, @normalized_name, @value, @original_value, @units, @reference_range, @status, @quality, @validation_flags, @confidence, @source_location, @validated_by_user, @validated_at, @validated_by)
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

      let validationFlagsStr = '[]';
      if (item.validationFlags && Array.isArray(item.validationFlags)) {
        validationFlagsStr = JSON.stringify(item.validationFlags);
      } else if (item.validation_flags && typeof item.validation_flags === 'string') {
        validationFlagsStr = item.validation_flags;
      }

      insertStmt.run({
        id: uniqueId,
        report_id: reportId,
        test_name: item.testName || item.test_name || item.rawName || 'Lab Test',
        raw_name: item.rawName || item.raw_name || item.testName || 'Lab Test',
        normalized_name: item.normalizedName || item.normalized_name || '',
        value: item.value,
        original_value: item.originalValue !== undefined ? item.originalValue : item.value,
        units: unitsStr,
        reference_range: refRangeStr,
        status: item.status || 'normal',
        quality: item.quality || 'VALID',
        validation_flags: validationFlagsStr,
        confidence: item.confidence !== undefined ? item.confidence : 95.0,
        source_location: item.sourceLocation || item.source_location || null,
        validated_by_user: item.validatedByUser ? 1 : 0,
        validated_at: item.validatedAt || null,
        validated_by: item.validatedBy || null
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
      model_name = excluded.model_name,
      model_version = excluded.model_version,
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

  const modelInfoPayload = {
    ...(pred.modelInfo || {}),
    topPrediction: pred.topPrediction,
    disease: pred.disease || pred.targetDisease,
    modelName: pred.modelName,
    modelVersion: pred.modelVersion
  };

  stmt.run({
    id: pred.id || `PRED-${uuidv4().slice(0, 8)}`,
    report_id: pred.reportId,
    model_name: pred.modelName || 'MediAgent Pima Diabetes Classifier',
    model_version: pred.modelVersion || 'v2.0.0-pima-diabetes',
    predicted_class: pred.predictedClass || 'Negative',
    probability: pred.probability || 0.0,
    differentials: JSON.stringify(pred.differentials || []),
    model_info: JSON.stringify(modelInfoPayload),
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
    originalValue: r.original_value,
    units: r.units,
    unit: r.units,
    referenceRange: r.reference_range,
    status: r.status,
    quality: r.quality || 'VALID',
    validationFlags: r.validation_flags ? JSON.parse(r.validation_flags) : [],
    confidence: r.confidence,
    sourceLocation: r.source_location,
    validatedByUser: Boolean(r.validated_by_user),
    validatedAt: r.validated_at,
    validatedBy: r.validated_by
  }));

  const metaText = [
    rep.original_filename || '',
    rep.chief_complaint || '',
    rep.raw_ocr_text || '',
    labResults.map(l => `${l.rawName || ''} ${l.testName || ''}`).join(' ')
  ].join(' ').toLowerCase();

  let detectedDisease = 'diabetes';
  if (/chikungunya|chikv|polyarthralgia/i.test(metaText)) {
    detectedDisease = 'chikungunya';
  } else if (/dengue|ns1|breakbone/i.test(metaText)) {
    detectedDisease = 'dengue';
  } else if (/malaria|plasmodium|rigor/i.test(metaText)) {
    detectedDisease = 'malaria';
  } else if (/typhoid|widal|salmonella|enteric/i.test(metaText)) {
    detectedDisease = 'typhoid';
  }

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
    disease: detectedDisease,
    uploadDate: rep.created_at,
    createdBy: rep.created_by,
    labResults
  };
}

function getPredictionRecord(reportId) {
  const database = getDb();
  const p = database.prepare('SELECT * FROM predictions WHERE report_id = ?').get(reportId);
  if (!p) return null;

  const diffs = JSON.parse(p.differentials || '[]');
  const isPositive = p.predicted_class && (p.predicted_class.includes('Positive') || p.predicted_class.includes('Elevated') || p.predicted_class.includes('Confirmed') || (typeof p.probability === 'number' && p.probability >= 0.5));
  const posPct = typeof p.probability === 'number' && p.probability <= 1 ? Math.round(p.probability * 1000) / 10 : (p.probability || 0);
  const displayPct = posPct;
  const negPct = Math.max(0, Math.round((100 - posPct) * 10) / 10);

  const parsedModelInfo = JSON.parse(p.model_info || '{}');
  const mName = (p.model_name || parsedModelInfo.modelName || '').toLowerCase();
  const storedDisease = (parsedModelInfo.disease || '').toLowerCase();

  let diseaseName = 'Type 2 Diabetes Mellitus';
  let negativeName = 'Low Risk / Negative for Diabetes';
  let posIcd = 'E11.9';
  let negIcd = 'Z13.1';

  if (mName.includes('chikungunya') || storedDisease === 'chikungunya') {
    diseaseName = 'Chikungunya Virus Disease';
    negativeName = 'Chikungunya Negative / Febrile Control';
    posIcd = 'A92.0';
    negIcd = 'Z03.8';
  } else if (mName.includes('dengue') || storedDisease === 'dengue') {
    diseaseName = 'Dengue Fever / Acute Flavivirus Infection';
    negativeName = 'Dengue Negative / Other Febrile Illness';
    posIcd = 'A90';
    negIcd = 'Z03.8';
  } else if (mName.includes('malaria') || storedDisease === 'malaria') {
    diseaseName = 'Malaria (Plasmodium Infection)';
    negativeName = 'Malaria Negative';
    posIcd = 'B54';
    negIcd = 'Z03.8';
  } else if (mName.includes('typhoid') || storedDisease === 'typhoid') {
    diseaseName = 'Typhoid (Enteric Fever - S. Typhi)';
    negativeName = 'Typhoid Negative';
    posIcd = 'A01.0';
    negIcd = 'Z03.8';
  }

  const topPrediction = parsedModelInfo.topPrediction || {
    disease: isPositive ? diseaseName : negativeName,
    probability: isPositive ? posPct : negPct,
    severity: isPositive ? 'high' : 'low',
    icd10: isPositive ? posIcd : negIcd,
    reasoning: isPositive ? `Elevated probability for ${diseaseName}.` : `Laboratory parameters indicate low risk for ${diseaseName}.`,
    supportingFeatures: []
  };

  const differentials = diffs.length > 0 ? diffs : [
    {
      disease: isPositive ? negativeName : diseaseName,
      probability: isPositive ? negPct : posPct,
      severity: isPositive ? 'low' : 'moderate',
      icd10: isPositive ? negIcd : posIcd
    }
  ];

  return {
    id: p.id,
    reportId: p.report_id,
    disease: storedDisease || (mName.includes('chikungunya') ? 'chikungunya' : mName.includes('dengue') ? 'dengue' : mName.includes('malaria') ? 'malaria' : mName.includes('typhoid') ? 'typhoid' : 'diabetes'),
    modelName: p.model_name,
    modelVersion: p.model_version,
    predictedClass: p.predicted_class,
    probability: p.probability,
    displayProbabilityPct: displayPct,
    topPrediction,
    differentials,
    modelInfo: parsedModelInfo,
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
      originalValue: r.original_value,
      units: r.units,
      unit: r.units,
      referenceRange: r.reference_range,
      status: r.status,
      quality: r.quality || 'VALID',
      validationFlags: r.validation_flags ? JSON.parse(r.validation_flags) : [],
      confidence: r.confidence,
      sourceLocation: r.source_location,
      validatedByUser: Boolean(r.validated_by_user),
      validatedAt: r.validated_at,
      validatedBy: r.validated_by
    }));

    const metaText = [
      rep.original_filename || '',
      rep.chief_complaint || '',
      rep.raw_ocr_text || '',
      labResults.map(l => `${l.rawName || ''} ${l.testName || ''}`).join(' ')
    ].join(' ').toLowerCase();

    let repDisease = 'diabetes';
    if (/chikungunya|chikv|polyarthralgia/i.test(metaText)) {
      repDisease = 'chikungunya';
    } else if (/dengue|ns1|breakbone/i.test(metaText)) {
      repDisease = 'dengue';
    } else if (/malaria|plasmodium|rigor/i.test(metaText)) {
      repDisease = 'malaria';
    } else if (/typhoid|widal|salmonella|enteric/i.test(metaText)) {
      repDisease = 'typhoid';
    }

    return {
      id: rep.id,
      patientId: rep.patient_id,
      patientName: rep.patient_name,
      filename: rep.original_filename,
      storedFilename: rep.stored_filename,
      fileType: rep.file_type,
      disease: repDisease,
      uploadDate: rep.created_at,
      status: rep.status,
      ocrConfidence: rep.ocr_confidence,
      createdBy: rep.created_by,
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

/**
 * Look up a doctor by email (case-insensitive).
 * @param {string} email
 * @returns {Object|null} doctor record with password_hash included
 */
function getDoctorByEmail(email) {
  const database = getDb();
  return database.prepare('SELECT * FROM doctors WHERE LOWER(email) = LOWER(?)').get(email.trim());
}

/**
 * Create a new doctor account with a hashed password.
 * @param {Object} data - { id, name, email, password, specialty, licenseNumber, role }
 * @returns {Object} created doctor (without password fields)
 */
async function createDoctor(data) {
  const database = getDb();
  const passwordHash = await hashPassword(data.password);

  database.prepare(`
    INSERT INTO doctors (id, name, email, password_hash, specialty, license_number, role, created_at)
    VALUES (@id, @name, @email, @password_hash, @specialty, @license_number, @role, datetime('now'))
  `).run({
    id: data.id,
    name: data.name,
    email: data.email,
    password_hash: passwordHash,
    specialty: data.specialty,
    license_number: data.licenseNumber,
    role: data.role || 'doctor',
  });

  const row = database.prepare('SELECT id, name, email, specialty, license_number, role, created_at FROM doctors WHERE email = ?').get(data.email);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    specialty: row.specialty,
    licenseNumber: row.license_number,
    role: row.role,
    createdAt: row.created_at,
  };
}

/**
 * Delete a doctor's session tokens (logout).
 * @param {string} token - JWT token to invalidate (note: JWTs are stateless;
 *   client-side removal is the primary logout mechanism. This is a no-op
 *   kept for interface compatibility.)
 */
function revokeToken() {
  // JWTs are stateless; logout is handled client-side by removing the token.
  // A server-side token blacklist could be added here in future if needed.
  return { success: true };
}

module.exports = {
  getDb,
  hashPassword,
  verifyPassword,
  hashPasswordSync,
  verifyPasswordSync,
  getDoctorByEmail,
  createDoctor,
  revokeToken,
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
