/**
 * MediAgent Grounded LLM Explanation Service
 *
 * Synthesizes evidence-grounded explanations from:
 *   1. ML model prediction (treated as invariant - never modified)
 *   2. SHAP feature attribution (treated as invariant - never modified)
 *   3. Retrieved RAG evidence (sources with full citation metadata)
 *
 * Grounding contract (Task 6):
 *  - Uses ONLY supplied patient information and retrieved evidence for
 *    case-specific claims.
 *  - Clearly distinguishes retrieved facts from AI-generated interpretation.
 *  - Explains why each evidence item is relevant to the case.
 *  - References actual source documents (organization, title, URL, date).
 *  - Never invents medical recommendations, dosages, or risk estimates.
 *  - Acknowledges missing or conflicting information.
 *  - States when retrieved evidence is insufficient; never fabricates.
 *  - Never changes the model's predicted probability or outcome.
 *  - Never treats retrieved guidance as proof the patient has a disease.
 */

const { isOutdated, detectConflicts } = require('./ragService');

// Threshold below which relevance is considered weak.
const WEAK_RELEVANCE = 30;

/**
 * Build citation-ready entries from retrieved RAG sources.
 * Each citation refers to an actual retrieved document.
 */
function buildCitations(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return [];
  return sources.map((src) => ({
    sourceId: src.sourceId || null,
    title: src.title || 'Untitled source',
    organization: src.organization || 'Unknown organization',
    publicationDate: src.publicationDate || null,
    retrievedAt: src.retrievedAt || null,
    url: src.url || null,
    documentType: src.documentType || 'Clinical Guideline',
    topic: src.topic || '',
    disease: src.disease || null,
    section: src.section || null,
    page: src.page || null,
    relevanceScore: src.relevanceScore !== undefined ? src.relevanceScore : null,
    excerpt: src.excerpt ? src.excerpt.slice(0, 300) : '',
    outdated: Boolean(src.outdated),
    outdatedReason: src.outdatedReason || null,
  }));
}

/**
 * Summarize retrieved evidence as factual statements, each tied to a source.
 * These are presented as retrieved facts, not AI interpretation.
 */
function summarizeEvidenceFacts(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [
      {
        fact: 'No verified medical evidence sources were retrieved for this case context.',
        sourceId: null,
        sourceTitle: null,
        organization: null,
        type: 'absence_of_evidence',
      },
    ];
  }
  return sources.map((src) => {
    const excerpt = src.excerpt || '';
    const fact = excerpt
      ? `${src.organization} (${src.title}): ${excerpt.slice(0, 220)}${excerpt.length > 220 ? '…' : ''}`
      : `${src.organization} (${src.title}): no detailed excerpt available.`;
    return {
      fact,
      sourceId: src.sourceId,
      sourceTitle: src.title,
      organization: src.organization,
      type: 'retrieved_evidence',
      relevanceScore: src.relevanceScore,
      outdated: Boolean(src.outdated),
    };
  });
}

/**
 * Build an interpretation paragraph that clearly labels AI-generated reasoning
 * and references retrieved sources by title/organization.
 */
function buildInterpretation(mlPrediction, shapExplanation, sources, qualityFlags) {
  const topPositive = (shapExplanation && shapExplanation.topPositiveFactors)
    ? shapExplanation.topPositiveFactors
    : [];
  const topNegative = (shapExplanation && shapExplanation.topNegativeFactors)
    ? shapExplanation.topNegativeFactors
    : [];

  const outcome = mlPrediction.predictedOutcome || 'Screening';
  const pct = mlPrediction.displayProbabilityPct !== undefined
    ? mlPrediction.displayProbabilityPct
    : 0;

  const evidenceTitles = (sources || [])
    .filter((s) => s.title)
    .map((s) => s.title)
    .slice(0, 3);

  const hasEvidence = sources && sources.length > 0;
  const weakEvidence = hasEvidence
    && sources.every((s) => (s.relevanceScore || 0) < WEAK_RELEVANCE);
  const hasConflict = (qualityFlags || []).some((f) => f.type === 'CONFLICTING_GUIDANCE');
  const hasOutdated = (qualityFlags || []).some((f) => f.type === 'OUTDATED_SOURCES');

  let interpretation = '';
  if (!hasEvidence) {
    interpretation =
      `AI interpretation: The ML model classifies this case as ${outcome} with an estimated screening probability of ${pct}%. `
      + `No verified medical evidence was retrieved for this context, so no disease-specific guidance can be cited. `
      + `This is a model-based screening estimate, not a confirmed diagnosis.`;
  } else if (weakEvidence) {
    interpretation =
      `AI interpretation: The ML model classifies this case as ${outcome} with an estimated screening probability of ${pct}%. `
      + `Retrieved evidence is available but weakly related to this specific case context, so it should be treated as general background only. `
      + `Sources reviewed: ${evidenceTitles.join('; ')}. This is not a confirmed diagnosis.`;
  } else {
    interpretation =
      `AI interpretation: The ML model classifies this case as ${outcome} with an estimated screening probability of ${pct}%. `
      + `The primary model drivers pushing toward ${outcome.toLowerCase()} risk are ${topPositive.slice(0, 2).join(' and ') || 'extracted parameters'}. `
      + `Retrieved evidence from ${evidenceTitles.join('; ')} provides general clinical context for this disease area. `
      + `This interpretation is model-based and evidence-contextual, not a confirmed medical diagnosis.`;
  }

  if (hasConflict) {
    interpretation += ' Retrieved sources contain conflicting guidance for this topic; professional clinical interpretation is needed.';
  }
  if (hasOutdated) {
    interpretation += ' Some cited sources are older than 3 years; verify against current guidelines.';
  }

  return interpretation;
}

/**
 * Generate a grounded explanation. ML probability/outcome and SHAP values are
 * preserved exactly; only the explanation text and citation metadata are added.
 */
function generateGroundedExplanation(mlPrediction, shapExplanation, ragResult) {
  if (!mlPrediction) {
    throw new Error('[GroundedLlmService] Missing required ML prediction payload.');
  }

  // ---- Invariants: ML probability & outcome must never change ----
  const predictedOutcome = mlPrediction.predictedOutcome || 'Screening';
  const rawProbability = mlPrediction.estimatedProbability !== undefined
    ? mlPrediction.estimatedProbability
    : 0.0;
  const displayProbabilityPct = mlPrediction.displayProbabilityPct !== undefined
    ? mlPrediction.displayProbabilityPct
    : 0.0;

  // ---- SHAP invariants ----
  const shapFeatures = (shapExplanation && shapExplanation.features)
    ? shapExplanation.features
    : [];
  const topPositive = (shapExplanation && shapExplanation.topPositiveFactors)
    ? shapExplanation.topPositiveFactors
    : [];
  const topNegative = (shapExplanation && shapExplanation.topNegativeFactors)
    ? shapExplanation.topNegativeFactors
    : [];

  // ---- Retrieved evidence ----
  const ragSources = (ragResult && ragResult.sources) ? ragResult.sources : [];
  const qualityFlags = (ragResult && ragResult.qualityFlags) || [];
  const retrievalStatus = ragResult ? ragResult.status : 'INSUFFICIENT_EVIDENCE';

  const citations = buildCitations(ragSources);
  const evidenceFacts = summarizeEvidenceFacts(ragSources);
  const interpretation = buildInterpretation(mlPrediction, shapExplanation, ragSources, qualityFlags);

  // ---- Summary (non-diagnostic screening language) ----
  const summaryText = (predictedOutcome === 'Positive')
    ? `AI-assisted screening evaluated the report and estimated a ${displayProbabilityPct}% screening probability for diabetes (Positive Screening Classification). The primary model feature drivers pushing toward positive risk are ${topPositive.slice(0, 2).join(' and ') || 'extracted parameters'}.`
    : `AI-assisted screening evaluated the report and estimated a ${displayProbabilityPct}% screening probability for diabetes (Negative Screening Classification). The primary model feature drivers pushing toward low risk are ${topNegative.slice(0, 2).join(' and ') || 'extracted parameters'}.`;

  // ---- Limitations ----
  const limitations = [
    'Model evaluated using Pima Indians Diabetes Dataset population benchmarks.',
    'Screening parameters require physician verification alongside patient clinical evaluation.',
    'Retrieved medical evidence provides general clinical context and does not replace evaluation by a qualified healthcare professional.',
  ];
  if (retrievalStatus === 'INSUFFICIENT_EVIDENCE') {
    limitations.push('No verified medical evidence was retrieved for this case context.');
  }
  if (hasConflict(qualityFlags)) {
    limitations.push('Retrieved sources contain conflicting guidance; professional clinical interpretation is needed.');
  }
  if (hasOutdated(qualityFlags)) {
    limitations.push('Some cited sources are older than 3 years; verify against current guidelines.');
  }

  const structuredResponse = {
    summary: summaryText,
    interpretation, // AI-generated, clearly labelled
    evidenceFacts,  // retrieved facts, each tied to a source
    citations,      // full citation metadata for source inspection
    screeningResult: {
      predictedOutcome, // Invariant
      estimatedProbability: rawProbability, // Exact float invariant
      displayProbabilityPct, // Exact display %
    },
    modelExplanation: shapFeatures.map((f) => ({
      feature: f.feature,
      clinicalName: f.clinicalName,
      value: f.value,
      unit: f.unit,
      shapValue: f.shapValue,
      direction: f.direction,
    })),
    topFactors: {
      topPositive,
      topNegative,
    },
    medicalContext: ragSources.map((src) => ({
      claim: src.excerpt
        ? `According to ${src.organization} (${src.title}): ${src.excerpt.slice(0, 140)}...`
        : `According to ${src.organization} (${src.title}): no detailed excerpt available.`,
      sourceId: src.sourceId || null,
      organization: src.organization,
      title: src.title,
      url: src.url,
      relevanceScore: src.relevanceScore,
    })),
    retrievedEvidenceCount: ragSources.length,
    retrievalStatus,
    qualityFlags,
    evidenceGrounded: retrievalStatus === 'SUCCESS' && ragSources.length > 0,
    limitations,
    disclaimer: 'This is an AI-assisted screening result and not a confirmed medical diagnosis. Model explanations describe model behavior and do not establish medical causation. Retrieved medical evidence provides general clinical context and does not replace evaluation by a qualified healthcare professional. Retrieved guidance is not proof that the patient has a disease.',
  };

  return structuredResponse;
}

function hasConflict(flags) {
  return Array.isArray(flags) && flags.some((f) => f.type === 'CONFLICTING_GUIDANCE');
}

function hasOutdated(flags) {
  return Array.isArray(flags) && flags.some((f) => f.type === 'OUTDATED_SOURCES');
}

module.exports = {
  generateGroundedExplanation,
  buildCitations,
  summarizeEvidenceFacts,
  buildInterpretation,
  WEAK_RELEVANCE,
};