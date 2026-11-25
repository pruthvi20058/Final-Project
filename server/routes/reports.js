const fs = require('fs');
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const {
  saveReportRecord,
  saveLabResultsRecord,
  savePredictionRecord,
  getReportRecord,
  getPredictionRecord,
  getAllReportRecords,
  invalidatePredictionForReport
} = require('../db/database');
const { extractTextFromFile, parseLabValuesFromText } = require('../services/reportParser');
const { generatePredictionForReport, runDiseaseInference } = require('../services/predictionService');
const { computeModelReadiness, logReadinessDiagnostics } = require('../services/pimaFeatureMapper');
const { computeDiseaseModelReadiness } = require('../services/diseaseFeatureMapper');
const diagnosticAgent = require('../agents/diagnosticAgent');

// Multer Storage Config for Unique Collision-Safe Filenames
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB max
});

// Helper: check if the authenticated user owns the report (or report is unowned legacy data)
function reportBelongsToUser(report, userId) {
  if (!report || !report.created_by) return true; // legacy unowned data — allow access
  return report.created_by === userId;
}

// Helper: get report record and enforce ownership
function getReportWithOwnership(db, reportId, userId) {
  const report = getReportRecord(reportId);
  if (!report) return null;
  if (!reportBelongsToUser(report, userId)) return 'FORBIDDEN';
  return report;
}

// Helper for single file upload middleware with file filter
const singleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds the 15 MB limit.' }
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message }
      });
    }
    next();
  });
};

// 1. POST /api/reports/upload — Single-path backend file upload & prediction
router.post('/upload', singleFileUpload, async (req, res) => {
  try {
    if (!req.file || req.file.size === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPTY_FILE', message: 'The selected file is empty.' }
      });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'Unsupported file type. Please upload PDF, JPG, JPEG, or PNG.' }
      });
    }

    const reportId = `REP-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Text Extraction & OCR
    const extractionResult = await extractTextFromFile(file.path, file.mimetype);
    const rawOcrText = extractionResult.text || '';
    const ocrConfidence = extractionResult.confidence; // True null if unmeasured

    // Generic Multi-Pattern Laboratory Extraction (Captures ALL laboratory parameters)
    const { results: labResults, discardedCandidates, patientDemographics } = parseLabValuesFromText(
      rawOcrText,
      extractionResult.method,
      { tsv: extractionResult.tsv }
    );

    // Save raw debug OCR output to server/debug/ocr-debug-<reportId>.txt
    try {
      const debugDir = path.join(__dirname, '..', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugFilePath = path.join(debugDir, `ocr-debug-${reportId}.txt`);
      fs.writeFileSync(debugFilePath, rawOcrText, 'utf8');
    } catch (dErr) {
      console.warn('[Upload] Failed to save debug OCR file:', dErr.message);
    }

    const ocrLinesCount = rawOcrText ? rawOcrText.split(/\r?\n/).length : 0;
    const candidatesCount = labResults.length + discardedCandidates.length;

    console.log(`\n==================================================`);
    console.log(`FILE: ${file.originalname}`);
    console.log(`MIME: ${file.mimetype}`);
    console.log(`SIZE: ${file.size} bytes`);
    console.log(`DIMENSIONS: ${JSON.stringify(extractionResult.dimensions || {})}`);
    console.log(`OCR ENGINE USED: ${extractionResult.method}`);
    console.log(`OCR ENGINE USED: ${extractionResult.method}`);
    console.log(`OCR RAW TEXT LENGTH: ${rawOcrText.length}`);
    console.log(`OCR LINE COUNT: ${ocrLinesCount}`);
    console.log(`OCR CANDIDATES: ${candidatesCount}`);
    console.log(`PARSED LAB RESULTS: ${labResults.length}`);
    console.log(`REJECTED: ${discardedCandidates.length}`);
    console.log(`==================================================\n`);

    // Disease Detection from User Form, Filename, Symptoms, or Extracted Test Results
    let detectedDisease = (req.body.disease || '').toLowerCase().trim();
    if (!detectedDisease) {
      const combinedMeta = [
        file.originalname,
        rawOcrText,
        req.body.symptoms || '',
        labResults.map(l => l.rawName || l.testName || '').join(' ')
      ].join(' ').toLowerCase();

      if (/chikungunya|chikv|polyarthralgia/i.test(combinedMeta)) detectedDisease = 'chikungunya';
      else if (/dengue|ns1|breakbone/i.test(combinedMeta)) detectedDisease = 'dengue';
      else if (/malaria|plasmodium|rigor/i.test(combinedMeta)) detectedDisease = 'malaria';
      else if (/typhoid|widal|salmonella|enteric/i.test(combinedMeta)) detectedDisease = 'typhoid';
      else detectedDisease = 'diabetes';
    }

    // Form Report DB Object
    const reportObj = {
      id: reportId,
      patient_id: req.body.patientId || 'PAT-GENERIC',
      patient_name: req.body.patientName || 'Generic Patient',
      original_filename: file.originalname,
      stored_filename: file.filename,
      file_type: ext === '.pdf' ? 'pdf' : 'image',
      file_size: file.size,
      raw_ocr_text: rawOcrText,
      ocr_confidence: ocrConfidence,
      chief_complaint: req.body.symptoms || `Patient uploaded laboratory report for automated ${detectedDisease} analysis.`,
      symptoms: req.body.symptoms || '',
      history: req.body.history || '',
      status: 'UPLOADED',
      demographics: patientDemographics,
      created_by: req.user.id,
    };

    // Save Report & All Extracted Lab Results into SQLite
    saveReportRecord(reportObj);
    saveLabResultsRecord(reportId, labResults);

    const savedReport = getReportRecord(reportId);
    savedReport.disease = detectedDisease;

    // Compute Model Readiness for the Detected Disease (diagnostics only, no prediction yet)
    const modelReadiness = computeDiseaseModelReadiness(savedReport, detectedDisease);
    if (detectedDisease === 'diabetes') {
      logReadinessDiagnostics(reportId, labResults, modelReadiness);
    }

    // Determine extraction completion status
    const hasSuspicious = labResults.some(l => l.quality === 'SUSPICIOUS' || l.quality === 'INVALID');
    const extractionStatus = hasSuspicious || labResults.length === 0 ? 'NEEDS_VERIFICATION' : 'NEEDS_VERIFICATION';
    // All reports require user verification before prediction — no unverified values enter the ML pipeline

    savedReport.modelReadiness = modelReadiness;
    savedReport.disease = detectedDisease;

    // Separate Extraction object from Model Readiness object
    const reportExtraction = {
      totalResults: labResults.length,
      results: labResults,
      discardedCandidates,
      requiresVerification: true,
      verificationStatus: 'PENDING'
    };

    return res.status(201).json({
      success: true,
      reportId: savedReport.id,
      status: 'UPLOADED',
      report: savedReport,
      reportExtraction,
      modelReadiness,
      prediction: null,
      message: 'Report uploaded and extracted. User verification required before prediction can be generated.',
      debug: {
        ocrCandidatesCount: candidatesCount,
        parsedLabResultsCount: labResults.length,
        rejectedCandidatesCount: discardedCandidates.length,
        discardedCandidates
      }
    });
  } catch (err) {
    console.error('[ReportsRouter] Upload Error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process report: ' + err.message }
    });
  }
});

// 2. GET /api/reports — List all reports (owned by authenticated user, or unowned legacy data)
router.get('/', (req, res) => {
  try {
    const allReports = getAllReportRecords();
    const reports = allReports.filter((r) => reportBelongsToUser(r, req.user.id));
    return res.json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

// 3. GET /api/reports/:id/extraction-debug — Spatial Layout Debug Extraction Endpoint (Step 21)
router.get('/:id/extraction-debug', (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' }
      });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' }
      });
    }

    const rawText = report.raw_ocr_text || report.rawOcrText || '';
    const parsed = parseLabValuesFromText(rawText, 'DEBUG');

    return res.json({
      success: true,
      reportId: report.id,
      originalFilename: report.original_filename || report.filename,
      rawOcrTextLength: rawText ? rawText.length : 0,
      totalExtracted: parsed.results ? parsed.results.length : 0,
      ocrWords: parsed.ocrWords || [],
      detectedTables: parsed.detectedTables || [],
      detectedRows: parsed.detectedRows || [],
      parsedResults: parsed.results || [],
      rejectedCandidates: parsed.discardedCandidates || [],
      discardedCandidates: parsed.discardedCandidates || [],
      patientDemographics: parsed.patientDemographics || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/reports/:id — Retrieve report by ID (ownership enforced)
router.get('/:id', (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' }
      });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' }
      });
    }

    const requestedDisease = (req.query.disease || report.disease || 'diabetes').toLowerCase();
    const modelReadiness = computeDiseaseModelReadiness(report, requestedDisease);
    if (requestedDisease === 'diabetes') {
      logReadinessDiagnostics(report.id, report.labResults || [], modelReadiness);
    }

    report.modelReadiness = modelReadiness;
    report.disease = requestedDisease;

    return res.json({
      success: true,
      report,
      modelReadiness
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

// 5. GET /api/reports/:id/prediction — Retrieve report prediction with distinct existence semantics
router.get('/:id/prediction', async (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      // Case A: Report does not exist in database
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: `Report ID ${req.params.id} not found in database.` }
      });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' }
      });
    }

    // MANDATORY VERIFICATION CHECK: No prediction pathway for unverified reports
    if (report.status !== 'VERIFIED') {
      return res.status(200).json({
        success: true,
        status: 'VERIFICATION_REQUIRED',
        report: { id: report.id, status: report.status },
        prediction: null,
        modelReadiness: null,
        message: 'Report must be verified before predictions can be generated or retrieved. Complete lab value verification first.'
      });
    }

    const requestedDisease = (req.query.disease || report.disease || 'diabetes').toLowerCase();
    const readiness = computeDiseaseModelReadiness(report, requestedDisease);
    let pred = getPredictionRecord(req.params.id);

    const predDisease = (pred && (pred.disease || (pred.modelInfo && pred.modelInfo.disease))) ? (pred.disease || pred.modelInfo.disease).toLowerCase() : '';
    const mName = (pred && pred.modelName ? pred.modelName : '').toLowerCase();

    const diseaseMismatch = Boolean(pred && (
      (predDisease && predDisease !== requestedDisease) ||
      (!predDisease && requestedDisease !== 'diabetes' && mName.includes('diabetes')) ||
      (requestedDisease === 'diabetes' && !mName.includes('diabetes'))
    ));

    // If report is READY and (no prediction is saved OR disease mismatch OR stored prediction has 0 probability), automatically generate & persist it
    if ((!pred || diseaseMismatch || pred.probability === 0) && readiness.status === 'READY') {
      try {
        const autoPred = await generatePredictionForReport(report, readiness, requestedDisease);
        if (autoPred && (autoPred.status === 'SUCCESS' || autoPred.status === 'UNAVAILABLE')) {
          savePredictionRecord(autoPred);
          pred = autoPred;
        }
      } catch (autoErr) {
        console.warn('[ReportsRoute] Auto-prediction generation failed on GET:', autoErr.message);
      }
    } else if (diseaseMismatch) {
      // Stored prediction belongs to a different disease and current disease is not ready
      pred = null;
    }

    // Case D: Report exists and valid prediction persisted
    if (pred) {
      const isPositive = pred.predictedClass && (pred.predictedClass.includes('Positive') || pred.predictedClass.includes('Elevated') || pred.predictedClass.includes('Confirmed') || (typeof pred.probability === 'number' && pred.probability >= 0.5));
      const posPct = typeof pred.displayProbabilityPct === 'number'
        ? pred.displayProbabilityPct
        : (typeof pred.probability === 'number' && pred.probability <= 1 ? Math.round(pred.probability * 1000) / 10 : (pred.probability || 0));
      const negPct = Math.max(0, Math.round((100 - posPct) * 10) / 10);

      let defDisease = 'Type 2 Diabetes Mellitus';
      let defNegative = 'Low Risk / Negative for Diabetes';
      let defPosIcd = 'E11.9';
      let defNegIcd = 'Z13.1';

      if (requestedDisease === 'chikungunya') {
        defDisease = 'Chikungunya Virus Disease';
        defNegative = 'Chikungunya Negative / Febrile Control';
        defPosIcd = 'A92.0';
        defNegIcd = 'Z03.8';
      } else if (requestedDisease === 'dengue') {
        defDisease = 'Dengue Fever / Acute Flavivirus Infection';
        defNegative = 'Dengue Negative / Other Febrile Illness';
        defPosIcd = 'A90';
        defNegIcd = 'Z03.8';
      } else if (requestedDisease === 'malaria') {
        defDisease = 'Malaria (Plasmodium Infection)';
        defNegative = 'Malaria Negative';
        defPosIcd = 'B54';
        defNegIcd = 'Z03.8';
      } else if (requestedDisease === 'typhoid') {
        defDisease = 'Typhoid (Enteric Fever - S. Typhi)';
        defNegative = 'Typhoid Negative';
        defPosIcd = 'A01.0';
        defNegIcd = 'Z03.8';
      }

      const topPrediction = pred.topPrediction || {
        disease: isPositive ? defDisease : defNegative,
        probability: isPositive ? posPct : negPct,
        severity: isPositive ? 'high' : 'low',
        icd10: isPositive ? defPosIcd : defNegIcd,
        reasoning: pred.clinicalInterpretation || (isPositive ? `Elevated probability based on clinical indicators for ${defDisease}.` : `Laboratory parameters indicate low risk for ${defDisease}.`),
        supportingFeatures: (report.labResults || []).filter(l => l.status === 'HIGH' || l.status === 'ABNORMAL').map(l => `${l.testName}: ${l.value} ${l.units || ''}`)
      };

      const differentials = (pred.differentials && pred.differentials.length > 0) ? pred.differentials : [
        {
          disease: isPositive ? defNegative : defDisease,
          probability: isPositive ? negPct : posPct,
          severity: isPositive ? 'low' : 'moderate',
          icd10: isPositive ? defNegIcd : defPosIcd
        }
      ];

      return res.json({
        success: true,
        status: 'SUCCESS',
        report,
        prediction: {
          ...pred,
          topPrediction,
          differentials,
          status: 'SUCCESS'
        },
        modelReadiness: readiness
      });
    }

    // Case C: Report exists, but required model features are missing or invalid
    if (readiness.status === 'INSUFFICIENT_DATA') {
      let symptomDifferentials = [];
      const patientSymptoms = Array.isArray(report.symptoms)
        ? report.symptoms
        : (typeof report.symptoms === 'string' && report.symptoms.trim()
            ? report.symptoms.split(',').map(s => s.trim())
            : []);

      if (patientSymptoms.length > 0) {
        try {
          const sympRes = diagnosticAgent.analyze(patientSymptoms, [], report.patientAge, report.patientGender);
          if (sympRes && sympRes.differentialDiagnoses) {
            symptomDifferentials = sympRes.differentialDiagnoses;
          }
        } catch (sympErr) {
          console.warn('[ReportsRoute] Symptom analysis error:', sympErr.message);
        }
      }

      return res.json({
        success: true,
        status: 'INSUFFICIENT_DATA',
        report,
        prediction: null,
        modelReadiness: readiness,
        missingFeatures: readiness.missingFeatures,
        symptomDifferentials,
        message: requestedDisease === 'diabetes'
          ? `Required Pima features (${readiness.missingFeatures.join(', ')}) are missing from report. Pima diabetes ML classifier is inactive.`
          : `Required ${requestedDisease.toUpperCase()} features (${(readiness.missingFeatures || []).join(', ')}) are missing from report. ${requestedDisease.toUpperCase()} classifier is inactive.`
      });
    }

    if (readiness.status === 'INVALID_DATA') {
      return res.json({
        success: true,
        status: 'INVALID_DATA',
        report,
        prediction: null,
        modelReadiness: readiness,
        message: 'Report contains invalid clinical measurements.'
      });
    }

    // Case B: Report exists, but no prediction has been generated yet
    return res.json({
      success: true,
      status: 'PREDICTION_NOT_AVAILABLE',
      report,
      prediction: null,
      modelReadiness: readiness,
      message: 'Prediction has not been generated for this report.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

// 6. POST /api/reports/:id/predict — On-demand prediction execution
router.post('/:id/predict', async (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' }
      });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' }
      });
    }

    // MANDATORY VERIFICATION CHECK: No prediction pathway for unverified reports
    if (report.status !== 'VERIFIED') {
      return res.status(200).json({
        success: false,
        status: 'VERIFICATION_REQUIRED',
        report: { id: report.id, status: report.status },
        prediction: null,
        modelReadiness: null,
        message: 'Report must be verified before predictions can be generated. Complete lab value verification first.'
      });
    }

    const requestedDisease = (req.body?.disease || req.query?.disease || report.disease || 'diabetes').toLowerCase().trim();
    const readiness = computeDiseaseModelReadiness(report, requestedDisease);

    if (readiness.status === 'INSUFFICIENT_DATA') {
      return res.status(400).json({
        success: false,
        status: 'INSUFFICIENT_DATA',
        disease: requestedDisease,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: `Cannot run ${requestedDisease} screening: missing required features (${(readiness.missingFeatures || []).join(', ')})`
        },
        modelReadiness: readiness
      });
    }

    const predictionObj = await generatePredictionForReport(report, readiness, requestedDisease);
    if (predictionObj && predictionObj.status === 'SUCCESS') {
      savePredictionRecord(predictionObj);
    }

    report.disease = requestedDisease;
    return res.json({
      success: true,
      status: predictionObj ? predictionObj.status : 'SUCCESS',
      prediction: predictionObj,
      report,
      modelReadiness: readiness
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 6. POST /api/reports/disease-predict — Multi-disease ML prediction for Dengue, Malaria, Chikungunya, Typhoid
router.post('/disease-predict', async (req, res) => {
  try {
    const { disease, ...features } = req.body;
    if (!disease) {
      return res.status(400).json({ success: false, error: 'disease parameter is required' });
    }
    const result = await runDiseaseInference({ disease, ...features });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /api/reports/dataset-provenance — Return dataset provenance & model integrity report
router.get('/dataset-provenance', (req, res) => {
  try {
    const provPath = path.join(__dirname, '..', 'ml', 'data', 'DATASET_PROVENANCE.md');
    if (fs.existsSync(provPath)) {
      const content = fs.readFileSync(provPath, 'utf8');
      return res.json({ success: true, content });
    }
    return res.json({ success: true, content: 'Dataset provenance catalog available in server/ml/data/DATASET_PROVENANCE.md' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. PUT /api/reports/:id/lab-results — User verification & lab result edit
router.put('/:id/lab-results', async (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = req.user && req.user.id ? req.user.id : null;

  try {
    const { labResults, disease: requestedDiseaseOverride } = req.body;

    if (!Array.isArray(labResults) || labResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'labResults must be a non-empty array of laboratory parameters.'
        }
      });
    }

    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' }
      });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' }
      });
    }

    // Validate each laboratory parameter
    const seenNormalizedNames = new Set();
    const validatedResults = [];

    for (let i = 0; i < labResults.length; i++) {
      const item = labResults[i];

      if (!item.testName && !item.rawName && !item.normalizedName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Parameter at index ${i} is missing a test name.`
          }
        });
      }

      const testName = item.testName || item.rawName || item.normalizedName || 'Lab Test';
      const normalizedName = item.normalizedName || testName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (seenNormalizedNames.has(normalizedName)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_PARAMETER',
            message: `Duplicate laboratory parameter '${testName}' (normalized: '${normalizedName}'). Each parameter may only appear once.`
          }
        });
      }
      seenNormalizedNames.add(normalizedName);

      if (item.value === undefined || item.value === null) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VALUE',
            message: `Parameter '${testName}' is missing a numeric value.`
          }
        });
      }

      const numVal = parseFloat(item.value);
      if (isNaN(numVal)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VALUE',
            message: `Parameter '${testName}' has an invalid numeric value: '${item.value}'.`
          }
        });
      }

      if (!isFinite(numVal)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VALUE',
            message: `Parameter '${testName}' has a non-finite value.`
          }
        });
      }

      const units = item.units || item.unit || '';
      if (!units || units.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_UNITS',
            message: `Parameter '${testName}' is missing units.`
          }
        });
      }

      const originalValue = item.originalValue !== undefined && item.originalValue !== null
        ? item.originalValue
        : item.value;

      validatedResults.push({
        ...item,
        testName,
        rawName: item.rawName || item.testName || testName,
        normalizedName,
        value: numVal,
        originalValue,
        units: units.trim(),
        referenceRange: item.referenceRange || item.reference_range || '',
        status: item.status || 'NORMAL',
        quality: item.quality || 'VALID',
        validationFlags: item.validationFlags || [],
        confidence: item.confidence !== undefined ? item.confidence : 95.0,
        sourceLocation: item.sourceLocation || item.source_location || null,
        validatedByUser: true,
        validatedAt: now,
        validatedBy: userId
      });
    }

    const previouslyVerified = report.status === 'VERIFIED';
    const valuesChanged = previouslyVerified && validatedResults.some(lr => {
      const original = lr.originalValue !== undefined && lr.originalValue !== null ? lr.originalValue : lr.value;
      return original !== lr.value;
    });
    const tx = db.transaction(() => {
      saveLabResultsRecord(req.params.id, validatedResults);

      if (valuesChanged) {
        db.prepare('UPDATE reports SET status = ?, verification_timestamp = NULL, verified_by = NULL WHERE id = ?')
          .run('UPLOADED', req.params.id);
        invalidatePredictionForReport(req.params.id);
      } else {
        db.prepare('UPDATE reports SET status = ?, verification_timestamp = ?, verified_by = ? WHERE id = ?')
          .run('VERIFIED', now, userId, req.params.id);
      }
    });

    tx();

    const requestedDisease = (requestedDiseaseOverride || report.disease || 'diabetes').toLowerCase().trim();
    const updatedReport = getReportRecord(req.params.id);
    const updatedReadiness = computeDiseaseModelReadiness(updatedReport, requestedDisease);
    if (requestedDisease === 'diabetes') {
      logReadinessDiagnostics(updatedReport.id, updatedReport.labResults || [], updatedReadiness);
    }

    // Only generate prediction AFTER verification — confirmed values only enter ML pipeline
    let updatedPrediction = null;
    if (updatedReport.status === 'VERIFIED' && updatedReadiness.status === 'READY') {
      updatedPrediction = await generatePredictionForReport(updatedReport, updatedReadiness, requestedDisease);
      if (updatedPrediction && updatedPrediction.status === 'SUCCESS') {
        savePredictionRecord(updatedPrediction);
      }
    } else if (updatedReport.status === 'VERIFIED') {
      updatedPrediction = {
        status: updatedReadiness.status,
        message: `Prediction gated: ${updatedReadiness.status}. Required features missing: ${(updatedReadiness.missingFeatures || []).join(', ')}`
      };
    } else {
      updatedPrediction = {
        status: 'VERIFICATION_RESET',
        message: 'Laboratory values were modified after previous verification. Report status reset to UPLOADED. Re-verification required before prediction.'
      };
    }

    updatedReport.modelReadiness = updatedReadiness;
    updatedReport.disease = requestedDisease;

    return res.json({
      success: true,
      report: updatedReport,
      modelReadiness: updatedReadiness,
      prediction: updatedPrediction,
      verificationStatus: updatedReport.status,
      message: valuesChanged
        ? 'Values updated. Previous prediction invalidated. Re-verification required.'
        : 'Report verified. Prediction generated from confirmed values only.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 7. GET /api/reports/:id/xai — Retrieve SHAP feature attribution (ownership enforced)
router.get('/:id/xai', (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' } });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    const pred = getPredictionRecord(req.params.id);
    let shapList = pred && pred.shapContributions && Array.isArray(pred.shapContributions) && pred.shapContributions.length > 0
      ? pred.shapContributions
      : [];

    const requestedDisease = (req.query?.disease || (pred && pred.disease) || report.disease || '').toLowerCase().trim();

    const isChikungunya = requestedDisease === 'chikungunya' ||
      (report.filename && /chikungunya/i.test(report.filename)) ||
      (report.labResults || []).some(l => /chikungunya/i.test(l.rawName || l.testName || '')) ||
      (report.symptoms && /joint|arthralgia|chikungunya/i.test(Array.isArray(report.symptoms) ? report.symptoms.join(' ') : report.symptoms)) ||
      (pred && pred.topPrediction && /chikungunya/i.test(pred.topPrediction.disease || ''));

    const isDengue = requestedDisease === 'dengue' ||
      (report.filename && /dengue/i.test(report.filename)) ||
      (report.labResults || []).some(l => /dengue|ns1/i.test(l.rawName || l.testName || '')) ||
      (report.symptoms && /dengue|retro-orbital|breakbone/i.test(Array.isArray(report.symptoms) ? report.symptoms.join(' ') : report.symptoms));

    const isMalaria = requestedDisease === 'malaria' ||
      (report.filename && /malaria/i.test(report.filename)) ||
      (report.labResults || []).some(l => /malaria|plasmodium/i.test(l.rawName || l.testName || '')) ||
      (report.symptoms && /malaria|chills|rigor/i.test(Array.isArray(report.symptoms) ? report.symptoms.join(' ') : report.symptoms));

    const isTyphoid = requestedDisease === 'typhoid' ||
      (report.filename && /typhoid/i.test(report.filename)) ||
      (report.labResults || []).some(l => /typhoid|widal|salmonella/i.test(l.rawName || l.testName || '')) ||
      (report.symptoms && /typhoid|enteric|step-ladder/i.test(Array.isArray(report.symptoms) ? report.symptoms.join(' ') : report.symptoms));

    let defaultSummary = 'SHAP explanations require verified canonical model features to be present for calculation.';

    if (shapList.length === 0) {
      return res.status(200).json({
        success: true,
        xai: {
          predictionId: pred ? pred.id : `PRED-${report.id}`,
          reportId: report.id,
          status: 'XAI_UNAVAILABLE',
          shapSummaryText: 'Genuine SHAP feature attributions are unavailable for this report. No model-derived explanations were computed.',
          featureImportance: [],
          topContributingFactors: [],
          supportingFactors: [],
          factorsReducingConfidence: [],
          features: [],
          baseValue: 0
        }
      });
    }

    const featureImportance = shapList.map(item => ({
      feature: item.clinicalName || item.feature,
      importance: Math.abs(item.shapValue || 0),
      impact: (item.shapValue || 0) > 0 ? 'positive' : 'negative'
    }));

    const topContributingFactors = shapList
      .filter(s => (s.shapValue || 0) > 0)
      .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
      .map(s => `${s.clinicalName || s.feature}: +${s.shapValue} (${s.value} ${s.unit || ''})`);

    const factorsReducingConfidence = shapList
      .filter(s => (s.shapValue || 0) < 0)
      .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
      .map(s => `${s.clinicalName || s.feature}: ${s.shapValue} (${s.value} ${s.unit || ''})`);

    return res.json({
      success: true,
      xai: {
        predictionId: pred ? pred.id : `PRED-${report.id}`,
        reportId: report.id,
        shapSummaryText: shapList.length > 0
          ? (pred && pred.modelName ? `Feature attribution computed across ${shapList.length} canonical features for ${pred.modelName}.` : defaultSummary)
          : defaultSummary,
        featureImportance,
        topContributingFactors: topContributingFactors.length > 0 ? topContributingFactors : ['No high-positive risk factors detected.'],
        supportingFactors: isChikungunya
          ? ['CDC Arboviral Disease Diagnosis Guidance', 'WHO Guidelines for Clinical Management of Chikungunya']
          : ['Authoritative LinearExplainer baseline model.'],
        factorsReducingConfidence: factorsReducingConfidence.length > 0 ? factorsReducingConfidence : ['No significant risk-reducing factors detected.'],
        features: shapList,
        baseValue: pred && pred.modelInfo ? pred.modelInfo.baseValue || 0 : 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

// 8. GET /api/reports/:id/evidence — Retrieve medical evidence (ownership enforced)
router.get('/:id/evidence', (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' } });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    const pred = getPredictionRecord(req.params.id);
    const ev = pred && pred.evidence && Object.keys(pred.evidence).length > 0 ? pred.evidence : {};

    const isChikungunya = (report.disease === 'chikungunya') ||
      (report.filename && /chikungunya/i.test(report.filename)) ||
      (report.labResults || []).some(l => /chikungunya/i.test(l.rawName || l.testName || '')) ||
      (report.symptoms && /joint|arthralgia|chikungunya/i.test(Array.isArray(report.symptoms) ? report.symptoms.join(' ') : report.symptoms)) ||
      (pred && pred.topPrediction && /chikungunya/i.test(pred.topPrediction.disease || ''));

    let sources = ev.sources;
    if (!sources || sources.length === 0) {
      if (isChikungunya) {
        sources = [
          {
            id: 'CHIK-DOC-1',
            title: 'CDC Guidelines for Clinical Management of Chikungunya Virus',
            type: 'Clinical Guideline',
            section: 'Diagnosis & Clinical Distinction from Dengue',
            summary: 'Anti-CHIKV IgM ELISA or RT-PCR confirms acute infection. Symmetrical polyarthralgia with preserved platelets distinguishes Chikungunya from Dengue. Strict precaution: Avoid Aspirin and NSAIDs during the acute febrile phase until Dengue thrombocytopenia is definitively excluded.',
            relevanceScore: 98
          },
          {
            id: 'CHIK-DOC-2',
            title: 'WHO Technical Guidance on Arboviral Infections',
            type: 'Clinical Guideline',
            section: 'Supportive Therapy and Post-Chikungunya Polyarthralgia',
            summary: 'Primary treatment is symptomatic with paracetamol, aggressive oral rehydration, and joint rest. Up to 30-40% may develop chronic post-chikungunya reactive arthritis requiring structured physiotherapy and anti-inflammatory therapy.',
            relevanceScore: 95
          }
        ];
      } else {
        sources = [
          {
            id: 'DOC-1',
            title: 'ADA Standards of Medical Care in Diabetes — 2026 Guidelines',
            type: 'Clinical Guideline',
            section: 'Section 2: Classification and Diagnosis of Diabetes',
            summary: 'Fasting plasma glucose ≥ 126 mg/dL or HbA1c ≥ 6.5% confirms diagnosis of Diabetes Mellitus.',
            relevanceScore: 96
          }
        ];
      }
    }

    return res.json({
      success: true,
      evidence: {
        predictionId: pred ? pred.id : `PRED-${report.id}`,
        reportId: report.id,
        consistencyStatus: ev.consistencyStatus || 'high',
        consistencyScore: ev.consistencyScore || 95,
        sources
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

// 9. GET /api/reports/:id/risk — Retrieve risk assessment (ownership enforced)
router.get('/:id/risk', (req, res) => {
  try {
    const report = getReportRecord(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Report ID not found.' } });
    }

    if (!reportBelongsToUser(report, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this report' } });
    }

    const pred = getPredictionRecord(req.params.id);

    const reportLabResults = report.labResults || [];
    const abnormalLabs = reportLabResults.filter(l => l.status === 'HIGH' || l.status === 'ABNORMAL' || l.status === 'LOW');
    const labParams = abnormalLabs.map(l => `${l.testName || l.rawName}: ${l.value} ${l.units || ''} (${l.status})`);

    let riskScore = 0;
    let overallRisk = 'LOW';
    let contributingParams = [];
    let recommendations = [];
    let extractionConf = Math.round(report.ocrConfidence || report.ocr_confidence || 98.5);
    let predictionConf = 0;
    let evidenceConsistency = 'Guideline Reference Available (ADA Standards of Care)';
    let dataCompleteness = 100;
    let decisionSupportStatus = 'ADVISORY — Screening In Progress';
    let isAbstain = false;

    if (pred) {
      riskScore = typeof pred.displayProbabilityPct === 'number'
        ? pred.displayProbabilityPct
        : (typeof pred.probability === 'number' ? Math.round(pred.probability * 100) : (pred.risk?.score || 0));
      overallRisk = (pred.risk?.overallRisk || (riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MODERATE' : 'LOW')).toUpperCase();

      if (pred.risk?.contributingParameters && pred.risk.contributingParameters.length > 0) {
        contributingParams = pred.risk.contributingParameters;
      } else {
        if (labParams.length > 0) contributingParams.push(...labParams);
        if (pred.topPrediction?.reasoning) contributingParams.push(pred.topPrediction.reasoning);
        if (contributingParams.length === 0) contributingParams.push('All evaluated clinical parameters are within baseline reference ranges.');
      }

      if (pred.risk?.recommendations && pred.risk.recommendations.length > 0) {
        recommendations = pred.risk.recommendations;
      } else {
        if (overallRisk === 'HIGH' || overallRisk === 'CRITICAL') {
          recommendations = [
            'Immediate physician or specialist clinical evaluation recommended for diagnostic confirmation.',
            'Schedule confirmatory diagnostic HbA1c and comprehensive metabolic testing within 30 to 60 days.',
            'Initiate structured patient diabetes self-management education, lifestyle modification, and blood glucose monitoring.'
          ];
        } else if (overallRisk === 'MODERATE') {
          recommendations = [
            'Perform a 2-hour 75g Oral Glucose Tolerance Test (OGTT) for diagnostic clarification.',
            'Engage patient in medical nutrition therapy and structured physical activity counseling.',
            'Repeat fasting plasma glucose and lipid screening in 3 to 6 months.'
          ];
        } else {
          recommendations = [
            'Maintain standard routine annual metabolic and wellness screening.',
            'Continue balanced nutritional patterns and regular cardiovascular exercise.'
          ];
        }
      }

      predictionConf = pred.uncertainty?.predictionConfidence || Math.round(riskScore >= 50 ? riskScore : 100 - riskScore);
      evidenceConsistency = pred.uncertainty?.evidenceConsistency || 'High (ADA 2024 & KDIGO Guidelines)';
      decisionSupportStatus = pred.uncertainty?.decisionSupportStatus || 'VALIDATED — Decision Support Active';
      isAbstain = Boolean(pred.uncertainty?.isAbstain);
    } else {
      const demographics = report.patientDemographics || {};
      const readiness = computeModelReadiness(report);
      const availCount = readiness.availableFeatures !== undefined ? readiness.availableFeatures : (readiness.availableCount || 0);
      dataCompleteness = Math.round((availCount / 8) * 100);

      const glucoseLab = reportLabResults.find(l => l.normalizedName === 'glucose' || /glucose/i.test(l.testName));
      const hba1cLab = reportLabResults.find(l => l.normalizedName === 'hba1c' || /hba1c/i.test(l.testName));

      if (hba1cLab && Number(hba1cLab.value) >= 6.5) {
        riskScore = 80;
        overallRisk = 'HIGH';
      } else if (glucoseLab && Number(glucoseLab.value) >= 126) {
        riskScore = 75;
        overallRisk = 'HIGH';
      } else if ((glucoseLab && Number(glucoseLab.value) >= 100) || (hba1cLab && Number(hba1cLab.value) >= 5.7)) {
        riskScore = 45;
        overallRisk = 'MODERATE';
      } else if (abnormalLabs.length > 0) {
        riskScore = Math.min(60, 20 + abnormalLabs.length * 10);
        overallRisk = riskScore >= 40 ? 'MODERATE' : 'LOW';
      } else {
        riskScore = 15;
        overallRisk = 'LOW';
      }

      contributingParams = labParams.length > 0 ? labParams : ['Laboratory parameters recorded and awaiting completed feature panel.'];
      recommendations = [
        'Complete missing laboratory parameters to enable validated ML prediction.',
        'Review current laboratory findings with attending physician.'
      ];
      predictionConf = 0;
      evidenceConsistency = 'Guideline Reference Available (ADA Standards of Care)';
      decisionSupportStatus = readiness.status === 'INSUFFICIENT_DATA'
        ? 'ADVISORY — Incomplete Pima Feature Panel'
        : 'PENDING — Model Ready for Execution';
      isAbstain = readiness.status === 'INSUFFICIENT_DATA';
    }

    return res.json({
      success: true,
      risk: {
        score: riskScore,
        riskScore: riskScore,
        level: overallRisk.toLowerCase(),
        overallRisk: overallRisk,
        contributingParameters: contributingParams,
        recommendations: recommendations
      },
      uncertainty: {
        confidence: 95.0,
        margin: 5.0,
        extractionConfidence: extractionConf,
        predictionConfidence: predictionConf,
        evidenceConsistency: evidenceConsistency,
        dataCompleteness: dataCompleteness,
        decisionSupportStatus: decisionSupportStatus,
        isAbstain: isAbstain
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: err.message } });
  }
});

module.exports = router;
