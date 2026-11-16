// Diagnostic Agent — Differential diagnosis via symptom matching
const { conditions } = require('../knowledge/medicalKB');

function analyze(symptoms, patientHistory, patientAge, patientGender) {
  const steps = [];
  const sympLower = symptoms.map(s => s.toLowerCase().trim());

  steps.push({ action: 'Parsing symptom input', detail: `${sympLower.length} symptoms: ${sympLower.join(', ')}` });
  steps.push({ action: 'Cross-referencing against knowledge base', detail: `Scanning ${conditions.length} conditions` });

  const scored = conditions.map(cond => {
    const condSymptoms = cond.symptoms.map(s => s.toLowerCase());
    let matchCount = 0;
    const matchedSymptoms = [];
    const unmatchedSymptoms = [];

    sympLower.forEach(s => {
      const found = condSymptoms.some(cs => cs.includes(s) || s.includes(cs));
      if (found) { matchCount++; matchedSymptoms.push(s); }
      else unmatchedSymptoms.push(s);
    });

    let score = condSymptoms.length > 0 ? (matchCount / condSymptoms.length) * 60 : 0;
    score += (matchCount / Math.max(sympLower.length, 1)) * 40;

    // History boost
    const historyItems = patientHistory || [];
    historyItems.forEach(h => {
      const hName = (h.condition || '').toLowerCase();
      if (cond.risk_factors.some(rf => hName.includes(rf.toLowerCase()) || rf.toLowerCase().includes(hName))) {
        score += 8;
      }
    });

    // Demographics
    if (cond.risk_factors.some(rf => rf.includes('age over') && patientAge > parseInt(rf.match(/\d+/)?.[0] || 0))) score += 5;
    if (cond.risk_factors.some(rf => rf.toLowerCase().includes(patientGender?.toLowerCase() || ''))) score += 3;

    return {
      condition: cond.name,
      conditionId: cond.id,
      icd10: cond.icd10,
      category: cond.category,
      confidence: Math.min(Math.round(score), 98),
      matchedSymptoms,
      unmatchedSymptoms: unmatchedSymptoms.slice(0, 3),
      severity: cond.severity,
      supportingEvidence: matchedSymptoms.map(s => `Patient reports "${s}" — consistent with ${cond.name}`),
      contradictingEvidence: unmatchedSymptoms.length > matchCount
        ? [`${unmatchedSymptoms.length} reported symptoms not typically associated with ${cond.name}`]
        : []
    };
  });

  const ranked = scored.filter(s => s.confidence > 10).sort((a, b) => b.confidence - a.confidence).slice(0, 5);

  steps.push({ action: 'Ranking differential diagnoses', detail: `Top ${ranked.length} matches identified` });

  ranked.forEach((r, i) => {
    steps.push({
      action: `Differential #${i + 1}: ${r.condition}`,
      detail: `Confidence: ${r.confidence}% | ${r.matchedSymptoms.length} matching symptoms | Severity: ${r.severity}`
    });
  });

  steps.push({ action: 'Generating diagnostic summary', detail: 'Compiling evidence and recommendations' });

  return {
    agent: 'Diagnostic Agent',
    icon: '🔬',
    differentialDiagnoses: ranked,
    primaryDiagnosis: ranked[0] || null,
    reasoning: steps,
    recommendation: ranked.length > 0
      ? `Primary consideration: ${ranked[0].condition} (${ranked[0].confidence}% confidence). ${ranked.length > 1 ? `Consider ${ranked[1].condition} as differential.` : ''} Further workup recommended.`
      : 'Insufficient symptom data for reliable differential. Recommend comprehensive history and physical examination.'
  };
}

module.exports = { analyze };
