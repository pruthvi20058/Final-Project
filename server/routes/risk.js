/**
 * MediAgent Task 8 — Clinical Risk Assessment API Routes
 *
 * Endpoints for clinical risk stratification, emergency alert detection,
 * and laboratory interpretation. All routes require authentication and
 * enforce patient/user ownership.
 *
 * Risk assessment is SEPARATE from disease prediction. ML probability
 * is never used as a clinical risk score.
 *
 * Endpoints:
 *   POST   /api/risk/assess          — Perform clinical risk assessment
 *   GET    /api/risk/assessments/:id — Get a saved risk assessment
 *   GET    /api/risk/assessments     — List user's risk assessments
 *   GET    /api/risk/categories      — Get available risk categories
 *   GET    /api/risk/sources         — Get clinical sources used
 *   GET    /api/risk/reference-ranges — Get documented lab reference ranges
 *   GET    /api/risk/rules           — Get active emergency/clinical rules
 *   GET    /api/risk/rules/:disease  — Get rules for a specific disease
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const {
  saveAssessmentRisk,
  getAssessmentRisk,
  getAssessmentRisksByUser
} = require('../db/database');
const {
  assessRisk,
  getRiskCategories,
  getClinicalSources,
  listReferenceRanges,
  getReferenceRange,
  detectEmergencyWarnings,
  checkDiseaseRuleAvailability,
  getActiveEmergencyRules,
  getRuleById,
  interpretLabResults
} = require('../risk/riskEngine');

const SUPPORTED_DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];

// POST /api/risk/assess — Perform clinical risk assessment
router.post('/assess', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      symptoms,
      labResults,
      disease,
      patientContext,
      prediction,
      save = true
    } = req.body || {};

    // At least one input required
    if (!symptoms && !labResults && !disease) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INPUT',
          message: 'At least one of: symptoms, labResults, or disease is required.'
        }
      });
    }

    // Validate disease if provided
    if (disease && !SUPPORTED_DISEASES.includes(disease.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DISEASE',
          message: `Unsupported disease: ${disease}. Supported: ${SUPPORTED_DISEASES.join(', ')}`
        }
      });
    }

    // Perform risk assessment (ML probability is context only, never used for risk scoring)
    const result = await assessRisk(
      { symptoms, labResults, disease, patientContext, prediction },
      { startedAt: Date.now() }
    );

    const assessmentId = `RISK-${uuidv4().slice(0, 8)}`;

    // Persist if requested
    if (save) {
      try {
        saveAssessmentRisk({
          id: assessmentId,
          user_id: userId,
          patient_id: (patientContext && patientContext.patientId) || null,
          disease: disease || null,
          status: result.status,
          riskCategory: result.riskCategory,
          emergencyAlert: JSON.stringify(result.emergencyAlert || {}),
          abnormalFindings: JSON.stringify(result.abnormalFindings || []),
          rulesApplied: JSON.stringify(result.rulesApplied || []),
          evidenceReferences: JSON.stringify(result.evidenceReferences || []),
          limitations: JSON.stringify(result.limitations || []),
          mlProbability: result.mlProbability || null,
          mlProbabilityUsedForRisk: false,
          durationMs: result.durationMs || 0,
          createdAt: new Date().toISOString()
        });
      } catch (persistErr) {
        console.error(`[RiskRoute] Failed to persist risk assessment ${assessmentId}:`, persistErr.message);
        // Continue — assessment result is still returned
      }
    }

    return res.json({
      success: true,
      assessmentId,
      userId,
      assessment: result
    });
  } catch (err) {
    console.error('[RiskRoute] Assess error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Risk assessment failed' }
    });
  }
});

// GET /api/risk/assessments — List user's risk assessments
router.get('/assessments', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const assessments = getAssessmentRisksByUser(userId);
    return res.json({ success: true, assessments, count: assessments.length });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list risk assessments' }
    });
  }
});

// GET /api/risk/assessments/:id — Get a saved risk assessment
router.get('/assessments/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const assessment = getAssessmentRisk(req.params.id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'ASSESSMENT_NOT_FOUND', message: 'Risk assessment not found' }
      });
    }
    if (assessment.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this risk assessment' }
      });
    }
    return res.json({
      success: true,
      assessment: {
        ...assessment,
        emergencyAlert: assessment.emergencyAlert ? JSON.parse(assessment.emergencyAlert) : {},
        abnormalFindings: assessment.abnormalFindings ? JSON.parse(assessment.abnormalFindings) : [],
        rulesApplied: assessment.rulesApplied ? JSON.parse(assessment.rulesApplied) : [],
        evidenceReferences: assessment.evidenceReferences ? JSON.parse(assessment.evidenceReferences) : [],
        limitations: assessment.limitations ? JSON.parse(assessment.limitations) : []
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve risk assessment' }
    });
  }
});

// GET /api/risk/categories — Get available risk categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = getRiskCategories();
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve risk categories' }
    });
  }
});

// GET /api/risk/sources — Get clinical sources used
router.get('/sources', authenticateToken, (req, res) => {
  try {
    const sources = getClinicalSources();
    return res.json({ success: true, sources, count: sources.length });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve clinical sources' }
    });
  }
});

// GET /api/risk/reference-ranges — Get documented lab reference ranges
router.get('/reference-ranges', authenticateToken, (req, res) => {
  try {
    const param = req.query.param;
    if (param) {
      const range = getReferenceRange(param);
      if (!range) {
        return res.status(404).json({
          success: false,
          error: { code: 'PARAMETER_NOT_FOUND', message: `No documented reference range for: ${param}` }
        });
      }
      return res.json({ success: true, referenceRange: range });
    }
    const ranges = listReferenceRanges();
    return res.json({ success: true, referenceRanges: ranges, count: ranges.length });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve reference ranges' }
    });
  }
});

// GET /api/risk/rules — Get active emergency/clinical rules
router.get('/rules', authenticateToken, (req, res) => {
  try {
    const disease = req.query.disease;
    const rules = disease ? getActiveEmergencyRules(disease) : getActiveEmergencyRules();
    return res.json({
      success: true,
      rules,
      count: rules.length,
      disease: disease || null
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve rules' }
    });
  }
});

// GET /api/risk/rules/:disease — Get rules for a specific disease
router.get('/rules/:disease', authenticateToken, (req, res) => {
  try {
    const disease = req.params.disease.toLowerCase();
    if (!SUPPORTED_DISEASES.includes(disease)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DISEASE', message: `Unsupported disease: ${disease}` }
      });
    }
    const availability = checkDiseaseRuleAvailability(disease);
    const rules = availability.available ? getActiveEmergencyRules(disease) : [];
    return res.json({
      success: true,
      disease,
      available: availability.available,
      reason: availability.reason,
      rules,
      count: rules.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve disease rules' }
    });
  }
});

// GET /api/risk/rule/:ruleId — Get a specific rule by ID
router.get('/rule/:ruleId', authenticateToken, (req, res) => {
  try {
    const rule = getRuleById(req.params.ruleId);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: { code: 'RULE_NOT_FOUND', message: `Rule not found: ${req.params.ruleId}` }
      });
    }
    return res.json({ success: true, rule });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve rule' }
    });
  }
});

module.exports = router;
