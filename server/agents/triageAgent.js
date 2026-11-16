// Triage Agent — Urgency classification based on vitals and symptoms
const { v4: uuidv4 } = require('uuid');

const CRITICAL_SYMPTOMS = ['chest pain','chest pressure','severe headache','sudden weakness','facial droop','speech difficulty','difficulty breathing','syncope','seizure','unresponsiveness','anaphylaxis','severe bleeding'];
const URGENT_SYMPTOMS = ['high fever','persistent vomiting','severe abdominal pain','hemoptysis','hematuria','altered mental status','severe dehydration','acute vision loss'];

function analyze(vitals, symptoms, patientAge) {
  const steps = [];
  const flags = [];
  let triageScore = 0;
  let level = 'Non-Urgent';

  steps.push({ action: 'Analyzing vital signs', detail: JSON.stringify(vitals) });

  // Check vitals
  if (vitals) {
    if (vitals.systolic_bp > 180 || vitals.diastolic_bp > 120) {
      flags.push({ type: 'CRITICAL', message: `Hypertensive crisis: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg` });
      triageScore += 30;
    } else if (vitals.systolic_bp > 140 || vitals.diastolic_bp > 90) {
      flags.push({ type: 'WARNING', message: `Elevated BP: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg` });
      triageScore += 10;
    } else if (vitals.systolic_bp < 90) {
      flags.push({ type: 'CRITICAL', message: `Hypotension: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg` });
      triageScore += 30;
    }

    if (vitals.heart_rate > 120) {
      flags.push({ type: 'CRITICAL', message: `Tachycardia: HR ${vitals.heart_rate} bpm` });
      triageScore += 25;
    } else if (vitals.heart_rate > 100) {
      flags.push({ type: 'WARNING', message: `Elevated heart rate: ${vitals.heart_rate} bpm` });
      triageScore += 10;
    } else if (vitals.heart_rate < 50) {
      flags.push({ type: 'CRITICAL', message: `Bradycardia: HR ${vitals.heart_rate} bpm` });
      triageScore += 25;
    }

    if (vitals.temperature > 39.5) {
      flags.push({ type: 'CRITICAL', message: `High fever: ${vitals.temperature}°C` });
      triageScore += 20;
    } else if (vitals.temperature > 38) {
      flags.push({ type: 'WARNING', message: `Fever: ${vitals.temperature}°C` });
      triageScore += 8;
    }

    if (vitals.spo2 < 90) {
      flags.push({ type: 'CRITICAL', message: `Severe hypoxia: SpO2 ${vitals.spo2}%` });
      triageScore += 35;
    } else if (vitals.spo2 < 94) {
      flags.push({ type: 'WARNING', message: `Low oxygen: SpO2 ${vitals.spo2}%` });
      triageScore += 15;
    }

    if (vitals.respiratory_rate > 24) {
      flags.push({ type: 'WARNING', message: `Tachypnea: RR ${vitals.respiratory_rate}/min` });
      triageScore += 12;
    }
  }

  steps.push({ action: 'Screening symptoms for critical patterns', detail: `Found ${symptoms.length} reported symptoms` });

  // Check symptoms
  const sympLower = symptoms.map(s => s.toLowerCase());
  const criticalFound = CRITICAL_SYMPTOMS.filter(cs => sympLower.some(s => s.includes(cs)));
  const urgentFound = URGENT_SYMPTOMS.filter(us => sympLower.some(s => s.includes(us)));

  if (criticalFound.length > 0) {
    triageScore += 30;
    flags.push({ type: 'CRITICAL', message: `Critical symptoms detected: ${criticalFound.join(', ')}` });
  }
  if (urgentFound.length > 0) {
    triageScore += 15;
    flags.push({ type: 'WARNING', message: `Urgent symptoms: ${urgentFound.join(', ')}` });
  }

  // Age factor
  if (patientAge > 65) { triageScore += 5; steps.push({ action: 'Age risk adjustment', detail: `Patient age ${patientAge} — added 5 to triage score` }); }
  if (patientAge < 5) { triageScore += 8; steps.push({ action: 'Pediatric risk adjustment', detail: `Patient age ${patientAge} — added 8 to triage score` }); }

  // Classify
  if (triageScore >= 60) level = 'Emergency';
  else if (triageScore >= 40) level = 'Urgent';
  else if (triageScore >= 20) level = 'Semi-Urgent';
  else level = 'Non-Urgent';

  const colorMap = { Emergency: '#ef4444', Urgent: '#f59e0b', 'Semi-Urgent': '#3b82f6', 'Non-Urgent': '#10b981' };

  steps.push({ action: 'Triage classification complete', detail: `Score: ${triageScore} → Level: ${level}` });

  return {
    agent: 'Triage Agent',
    icon: '🚨',
    triageLevel: level,
    triageScore: Math.min(triageScore, 100),
    triageColor: colorMap[level],
    flags,
    reasoning: steps,
    recommendation: level === 'Emergency' ? 'Immediate medical attention required. Activate emergency protocol.'
      : level === 'Urgent' ? 'Prompt evaluation needed within 30 minutes.'
      : level === 'Semi-Urgent' ? 'Evaluation within 1-2 hours. Monitor for deterioration.'
      : 'Routine evaluation. Schedule standard assessment.'
  };
}

module.exports = { analyze };
