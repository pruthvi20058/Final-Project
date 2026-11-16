// Agent Orchestrator — Coordinates the multi-agent pipeline with SSE streaming
const triageAgent = require('./triageAgent');
const diagnosticAgent = require('./diagnosticAgent');
const medicationAgent = require('./medicationAgent');
const ragAgent = require('./ragAgent');
const imageAgent = require('./imageAgent');
const guardrailAgent = require('./guardrailAgent');

const activeStreams = new Map();
const stepHistory = new Map();

function registerStream(consultationId, res) {
  activeStreams.set(consultationId, res);
  // Replay buffered events
  const history = stepHistory.get(consultationId) || [];
  history.forEach(evt => {
    if (res && !res.writableEnded) {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    }
  });
}

function removeStream(consultationId) {
  activeStreams.delete(consultationId);
  setTimeout(() => stepHistory.delete(consultationId), 30000);
}

function sendStep(consultationId, agentName, status, data) {
  const evt = { agent: agentName, status, data, timestamp: Date.now() };
  if (!stepHistory.has(consultationId)) {
    stepHistory.set(consultationId, []);
  }
  stepHistory.get(consultationId).push(evt);

  const res = activeStreams.get(consultationId);
  if (res && !res.writableEnded) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPipeline(consultationId, { symptoms, vitals, patientAge, patientGender, patientHistory, currentMedications, allergies, uploadedImages, chiefComplaint }) {
  const trace = [];
  const results = {};

  // Step 1: Triage Agent
  sendStep(consultationId, 'Triage Agent', 'running', { message: 'Analyzing vitals and symptom urgency...' });
  await delay(800);
  results.triage = triageAgent.analyze(vitals, symptoms, patientAge);
  trace.push({ agent: 'Triage Agent', icon: '🚨', status: 'complete', duration: 800, result: results.triage });
  sendStep(consultationId, 'Triage Agent', 'complete', results.triage);

  // Step 2: Diagnostic + RAG in parallel
  sendStep(consultationId, 'Diagnostic Agent', 'running', { message: 'Generating differential diagnoses...' });
  sendStep(consultationId, 'RAG Agent', 'running', { message: 'Searching medical knowledge base...' });
  await delay(1200);

  results.diagnostic = diagnosticAgent.analyze(symptoms, patientHistory, patientAge, patientGender);
  trace.push({ agent: 'Diagnostic Agent', icon: '🔬', status: 'complete', duration: 1200, result: results.diagnostic });
  sendStep(consultationId, 'Diagnostic Agent', 'complete', results.diagnostic);

  await delay(400);

  results.rag = ragAgent.analyze(chiefComplaint || symptoms.join(' '), symptoms, results.diagnostic.differentialDiagnoses);
  trace.push({ agent: 'RAG Agent', icon: '📚', status: 'complete', duration: 1600, result: results.rag });
  sendStep(consultationId, 'RAG Agent', 'complete', results.rag);

  // Step 3: Medication Agent (depends on diagnostic)
  sendStep(consultationId, 'Medication Agent', 'running', { message: 'Checking treatments and drug interactions...' });
  await delay(900);
  results.medication = medicationAgent.analyze(results.diagnostic.differentialDiagnoses, currentMedications, allergies);
  trace.push({ agent: 'Medication Agent', icon: '💊', status: 'complete', duration: 900, result: results.medication });
  sendStep(consultationId, 'Medication Agent', 'complete', results.medication);

  // Step 4: Image Agent (if images provided)
  if (uploadedImages && uploadedImages.length > 0) {
    sendStep(consultationId, 'Imaging Agent', 'running', { message: `Analyzing ${uploadedImages.length} medical image(s)...` });
    await delay(1000);
    results.image = imageAgent.analyze(uploadedImages);
    trace.push({ agent: 'Imaging Agent', icon: '🖼️', status: 'complete', duration: 1000, result: results.image });
    sendStep(consultationId, 'Imaging Agent', 'complete', results.image);
  }

  // Step 5: Guardrail Agent (final validation)
  sendStep(consultationId, 'Guardrail Agent', 'running', { message: 'Running safety and compliance checks...' });
  await delay(600);
  results.guardrail = guardrailAgent.analyze(results.triage, results.diagnostic, results.medication);
  trace.push({ agent: 'Guardrail Agent', icon: '🛡️', status: 'complete', duration: 600, result: results.guardrail });
  sendStep(consultationId, 'Guardrail Agent', 'complete', results.guardrail);

  // Final report
  const finalReport = {
    consultationId,
    timestamp: new Date().toISOString(),
    triage: results.triage,
    diagnostic: results.diagnostic,
    medication: results.medication,
    rag: results.rag,
    image: results.image || null,
    guardrail: results.guardrail,
    summary: {
      triageLevel: results.triage.triageLevel,
      primaryDiagnosis: results.diagnostic.primaryDiagnosis?.condition || 'Undetermined',
      confidence: results.diagnostic.primaryDiagnosis?.confidence || 0,
      riskLevel: results.guardrail.overallRisk,
      humanReviewRequired: results.guardrail.humanReviewRequired,
      totalAgentsRun: trace.length,
      totalDuration: trace.reduce((sum, t) => sum + t.duration, 0)
    }
  };

  sendStep(consultationId, 'Pipeline', 'complete', { summary: finalReport.summary });

  return { finalReport, trace };
}

module.exports = { runPipeline, registerStream, removeStream };
