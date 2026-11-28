# 🛡️ Clinical Risk Stratification, Emergency Alerts and Patient Safety Engine (Task 8)

The Clinical Risk Stratification Engine provides a safe, transparent, and evidence-based clinical risk assessment system that is **separate from disease prediction**. It evaluates emergency warning signs, abnormal verified laboratory findings, relevant risk factors, missing critical information, and evidence availability.

## Architecture

```
server/risk/
├── README.md                      # This file
├── riskEngine.js                  # Central risk assessment engine
├── emergencyWarnings.js           # Emergency warning detection layer
├── clinicalRules.js               # Disease-specific clinical rule configuration with sources
└── labInterpretation.js           # Laboratory result interpretation
```

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Separate from disease prediction** | ML probability is context only — never used for clinical risk scoring |
| **No ML probability as risk** | `mlProbabilityUsedForRisk` is always `false` |
| **Emergency overrides low ML prob** | Low ML probability does not override an emergency warning |
| **Missing info ≠ low risk** | Missing information never results in a low-risk assumption |
| **No fabricated thresholds** | All risk categories based on validated clinical rules only |
| **No unreviewed rules** | Only `reviewed_and_verified` rules are active |
| **No LLM override** | Emergency warnings fire independently of LLM approval |
| **Full traceability** | Every rule execution recorded with source, version, and review status |

## Clinical Safety Rules

1. **Emergency warnings are independent** — `emergencyWarnings.js` detects emergency signs without waiting for ML predictions or RAG responses
2. **LLMs cannot override emergency alerts** — No LLM involvement in emergency detection
3. **ML probability is never used for risk scoring** — `mlProbabilityUsedForRisk: false` in all outputs
4. **Missing information never results in low risk** — Returns `RISK_ASSESSMENT_UNAVAILABLE` when required data is missing
5. **Only reviewed rules are active** — All rules have `reviewStatus: 'reviewed_and_verified'`
6. **No unvalidated disease models** — Unsupported diseases return `RISK_ASSESSMENT_UNAVAILABLE`

## API Endpoints

All endpoints require authentication and enforce patient ownership.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk/assess` | `POST` | Perform clinical risk assessment |
| `/api/risk/assessments` | `GET` | List user's risk assessments |
| `/api/risk/assessments/:id` | `GET` | Get a single risk assessment |
| `/api/risk/categories` | `GET` | Get available risk categories and meanings |
| `/api/risk/sources` | `GET` | Get clinical sources used by the engine |
| `/api/risk/reference-ranges` | `GET` | Get documented lab reference ranges |
| `/api/risk/reference-ranges?param=glucose` | `GET` | Get reference range for a specific parameter |
| `/api/risk/rules` | `GET` | Get active emergency/clinical rules |
| `/api/risk/rules/:disease` | `GET` | Get rules for a specific disease |
| `/api/risk/rule/:ruleId` | `GET` | Get a specific rule by ID |

### POST /api/risk/assess

Request body:
```json
{
  "symptoms": ["difficulty breathing", "fever"],
  "labResults": [
    { "normalizedName": "glucose", "value": 90, "unit": "mg/dL", "validatedByUser": true }
  ],
  "disease": "diabetes",
  "patientContext": { "age": 45, "sex": "female" },
  "prediction": { "status": "SUCCESS", "estimatedProbability": 0.85 }
}
```

Response:
```json
{
  "assessmentId": "RISK-abc123",
  "assessment": {
    "assessmentStatus": "COMPLETED",
    "riskCategory": "EMERGENCY",
    "riskLabel": "Emergency",
    "riskMeaning": "Validated emergency warning rule triggered — immediate medical evaluation required.",
    "emergencyAlert": {
      "triggered": true,
      "severity": "critical",
      "reasons": [...]
    },
    "evaluatedFactors": [...],
    "abnormalFindings": [...],
    "missingInformation": [...],
    "rulesApplied": [...],
    "evidenceReferences": [...],
    "limitations": [...],
    "mlProbabilityUsedForRisk": false,
    "mlProbability": 0.85,
    "inputValid": true,
    "durationMs": 45
  }
}
```

## Risk Categories

| Category | Meaning | Basis |
|----------|---------|-------|
| `EMERGENCY` | Validated emergency warning rule triggered — immediate medical evaluation required | Emergency warning rules from WHO/ADA/CDC sources |
| `HIGH_RISK` | Multiple abnormal verified findings or validated high-risk criteria met | Disease-specific clinical rules |
| `MODERATE_RISK` | Some abnormal verified findings or partial risk criteria met | Disease-specific clinical rules |
| `LOW_RISK` | No emergency warnings and no validated high-risk criteria met | Absence of triggered rules and abnormal findings |
| `UNAVAILABLE` | Cannot assign risk category — required information missing or no validated rules | Insufficient data or no reviewed rules |

**Note**: `UNAVAILABLE` is NOT a low-risk result. It means the assessment cannot be completed.

## Emergency Warning Rules

### General Emergency Rules (10 rules)
Difficulty breathing, chest pain, loss of consciousness, seizures, severe confusion, severe dehydration, persistent vomiting, severe abdominal pain, severe bleeding, signs of shock.

**Source**: WHO Emergency Triage Assessment and Treatment (ETAT) Manual (2016)

### Disease-Specific Emergency Rules (7 rules)

| Disease | Rules | Source |
|---------|-------|--------|
| Dengue | Severe abdominal pain, persistent vomiting, mucosal bleeding, hematocrit rise with platelet drop | WHO Dengue Guidelines (2009, updated 2023) |
| Malaria | Impaired consciousness, prostration, multiple convulsions, respiratory distress, circulatory collapse, severe anemia, hypoglycemia, etc. | WHO Guidelines for Treatment of Malaria (2022) |
| Chikungunya | Severe arthralgia, neurological complications, encephalitis, myocarditis | WHO Chikungunya Fact Sheet (2024) |
| Diabetes | DKA (kussmaul breathing, fruity breath), severe hypoglycemia (< 54 mg/dL), HHS | ADA Standards of Care (2024) |

## Laboratory Interpretation

Uses documented reference ranges from:
- American Diabetes Association (ADA) Standards of Care 2024
- World Health Organization (WHO)
- National Kidney Foundation (NKF) KDOQI
- Merck Manual Professional
- American College of Gastroenterology

**Limitations**:
- Age-, sex-, and pregnancy-specific reference ranges noted but not applied without patient context
- No universal reference range applied to every patient
- Unrecognized parameters are never treated as normal
- Missing values are never invented

## Test Suite

`server/tests/test-risk-engine.js` — 20 test scenarios covering:

1. Emergency warning detection — difficulty breathing
2. Multiple simultaneous warning signs
3. Missing critical information
4. Unverified laboratory data
5. Verified laboratory data — normal values
6. Invalid numerical values
7. Missing units
8. Disease-specific rules — dengue
9. Disease-specific rules — malaria
10. Disease-specific rules — diabetes
11. Unsupported disease — RISK_ASSESSMENT_UNAVAILABLE
12. Missing patient context
13. Model prediction independent of clinical risk (high ML prob, low clinical risk)
14. Low ML probability with emergency warning
15. High ML probability without validated high-risk criteria
16. Risk assessment tool — invalid input rejection
17. Risk assessment tool — dengue emergency via tool
18. Rule catalog — rules with versions
19. Clinical sources — organizations and URLs
20. Output schema — all required fields

Run with: `node server/tests/test-risk-engine.js`

## Frontend

`client/src/pages/app/RiskUncertaintyPage.jsx` — Displays emergency alerts (red banner), risk category, abnormal findings, evaluated factors, rules applied, evidence sources, missing information, and limitations. Never shows a reassuring green indicator when assessment is unavailable.

## Clinical Sources

| Organization | Document | URL |
|-------------|----------|-----|
| WHO | Emergency Triage Assessment and Treatment (ETAT) Manual | https://www.who.int/publications/i/item/9789241547893 |
| WHO | Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control | https://www.who.int/publications/i/item/9789241547871 |
| WHO | Guidelines for the Treatment of Malaria | https://www.who.int/publications/i/item/9789240049195 |
| WHO | Chikungunya Fact Sheet | https://www.who.int/news-room/fact-sheets/detail/chikungunya |
| ADA | Standards of Care in Diabetes — 2024 | https://diabetescare.diabetesjournals.org/content/47/Supplement_1 |

## Limitations

- Risk categories are based on validated clinical rules, not predictive models
- No numerical risk score is presented as a clinically validated probability
- Age/sex/pregnancy-specific reference ranges require patient context
- Only diseases with reviewed and verified rules are supported
- Emergency warnings are based on symptom/lab pattern matching, not clinical examination
- This system is a decision support tool, not a replacement for professional medical judgment
