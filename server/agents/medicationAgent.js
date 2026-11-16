// Medication Agent — Treatment recommendations with drug interaction checking
const { conditions, drugInteractions } = require('../knowledge/medicalKB');

function analyze(diagnoses, currentMedications, allergies) {
  const steps = [];
  const medications = [];
  const interactions = [];
  const warnings = [];

  const currentMeds = (currentMedications || []).map(m => typeof m === 'string' ? m : '');
  const allergyList = (allergies || []).map(a => a.toLowerCase());

  steps.push({ action: 'Reviewing current medications', detail: currentMeds.length > 0 ? currentMeds.join(', ') : 'No current medications' });
  steps.push({ action: 'Loading allergy profile', detail: allergyList.length > 0 ? allergyList.join(', ') : 'No known allergies' });

  const topDiagnoses = (diagnoses || []).slice(0, 3);

  topDiagnoses.forEach(dx => {
    const cond = conditions.find(c => c.id === dx.conditionId || c.name === dx.condition);
    if (!cond) return;

    steps.push({ action: `Generating treatment plan for ${cond.name}`, detail: `Evidence Level: ${cond.evidence_level}` });

    cond.treatments.forEach(treatment => {
      // Check allergies
      const allergyConflict = allergyList.find(a => treatment.toLowerCase().includes(a));
      if (allergyConflict) {
        warnings.push({
          type: 'ALLERGY',
          severity: 'critical',
          message: `⚠️ ${treatment} — CONTRAINDICATED due to ${allergyConflict} allergy`,
          drug: treatment
        });
        steps.push({ action: `ALLERGY BLOCK: ${treatment}`, detail: `Patient allergic to ${allergyConflict}` });
        return;
      }

      // Check drug interactions
      const drugName = treatment.split(' ')[0];
      currentMeds.forEach(cm => {
        const cmName = cm.split(' ')[0];
        const interaction = drugInteractions.find(di =>
          (di.drug1.toLowerCase() === drugName.toLowerCase() && di.drug2.toLowerCase() === cmName.toLowerCase()) ||
          (di.drug2.toLowerCase() === drugName.toLowerCase() && di.drug1.toLowerCase() === cmName.toLowerCase())
        );
        if (interaction) {
          interactions.push({
            newDrug: treatment,
            existingDrug: cm,
            severity: interaction.severity,
            effect: interaction.effect
          });
          steps.push({ action: `Interaction detected: ${drugName} ↔ ${cmName}`, detail: `${interaction.severity}: ${interaction.effect}` });
        }
      });

      medications.push({
        name: treatment,
        forCondition: cond.name,
        evidenceLevel: cond.evidence_level,
        interactionFlag: interactions.some(i => i.newDrug === treatment)
      });
    });
  });

  steps.push({ action: 'Medication safety review complete', detail: `${medications.length} medications, ${interactions.length} interactions, ${warnings.length} allergy warnings` });

  return {
    agent: 'Medication Agent',
    icon: '💊',
    recommendedMedications: medications,
    drugInteractions: interactions,
    allergyWarnings: warnings,
    reasoning: steps,
    recommendation: warnings.length > 0
      ? `⚠️ ${warnings.length} allergy conflict(s) detected. Alternative medications required. ${interactions.length > 0 ? `${interactions.length} drug interaction(s) flagged.` : ''}`
      : interactions.length > 0
        ? `${interactions.length} drug interaction(s) found. Review required before prescribing. ${medications.length} treatments recommended.`
        : `${medications.length} treatments recommended. No allergies or critical interactions detected.`
  };
}

module.exports = { analyze };
