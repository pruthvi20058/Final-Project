/**
 * Grounded LLM Explanation Synthesis Service
 * Enforces strict grounding contracts: ML probability and outcome are INVARIANT.
 */

function generateGroundedExplanation(mlPrediction, shapExplanation, ragResult) {
  if (!mlPrediction) {
    throw new Error('[GroundedLlmService] Missing required ML prediction payload.');
  }

  // Preserve exact ML probability & outcome invariants (Step 9 & 12)
  const predictedOutcome = mlPrediction.predictedOutcome || 'Screening';
  const rawProbability = mlPrediction.estimatedProbability !== undefined 
    ? mlPrediction.estimatedProbability 
    : 0.0;
  const displayProbabilityPct = mlPrediction.displayProbabilityPct !== undefined 
    ? mlPrediction.displayProbabilityPct 
    : 0.0;

  // Extract SHAP feature drivers
  const shapFeatures = (shapExplanation && shapExplanation.features) 
    ? shapExplanation.features 
    : [];

  const topPositive = (shapExplanation && shapExplanation.topPositiveFactors) 
    ? shapExplanation.topPositiveFactors 
    : [];

  const topNegative = (shapExplanation && shapExplanation.topNegativeFactors) 
    ? shapExplanation.topNegativeFactors 
    : [];

  // Extract retrieved RAG evidence items
  const retrievedSources = (ragResult && ragResult.sources) 
    ? ragResult.sources 
    : [];

  // Build grounded medical context claims (strictly linked to retrieved source IDs)
  const medicalContextClaims = [];
  if (retrievedSources.length > 0) {
    retrievedSources.forEach(src => {
      medicalContextClaims.push({
        claim: `According to ${src.organization} (${src.title}), ${src.excerpt.slice(0, 140)}...`,
        sourceId: src.sourceId,
        organization: src.organization,
        title: src.title,
        url: src.url,
        relevanceScore: src.relevanceScore
      });
    });
  } else {
    medicalContextClaims.push({
      claim: "No verified medical evidence sources were retrieved for this specific query context.",
      sourceId: null
    });
  }

  // Synthesize Summary (Non-diagnostic screening language)
  const summaryText = (predictedOutcome === 'Positive')
    ? `AI-assisted screening evaluated the report and estimated a ${displayProbabilityPct}% screening probability for diabetes (Positive Screening Classification). The primary model feature drivers pushing toward positive risk are ${topPositive.slice(0, 2).join(' and ') || 'extracted parameters'}.`
    : `AI-assisted screening evaluated the report and estimated a ${displayProbabilityPct}% screening probability for diabetes (Negative Screening Classification). The primary model feature drivers pushing toward low risk are ${topNegative.slice(0, 2).join(' and ') || 'extracted parameters'}.`;

  const structuredResponse = {
    summary: summaryText,
    screeningResult: {
      predictedOutcome: predictedOutcome, // Invariant
      estimatedProbability: rawProbability, // Exact float invariant
      displayProbabilityPct: displayProbabilityPct // Exact display %
    },
    modelExplanation: shapFeatures.map(f => ({
      feature: f.feature,
      clinicalName: f.clinicalName,
      value: f.value,
      unit: f.unit,
      shapValue: f.shapValue,
      direction: f.direction
    })),
    topFactors: {
      topPositive: topPositive,
      topNegative: topNegative
    },
    medicalContext: medicalContextClaims,
    retrievedEvidenceCount: retrievedSources.length,
    limitations: [
      "Model evaluated using Pima Indians Diabetes Dataset population benchmarks.",
      "Screening parameters require physician verification alongside patient clinical evaluation."
    ],
    disclaimer: "This is an AI-assisted screening result and not a confirmed medical diagnosis. Model explanations describe model behavior and do not establish medical causation. Retrieved medical evidence provides general clinical context and does not replace evaluation by a qualified healthcare professional."
  };

  return structuredResponse;
}

module.exports = {
  generateGroundedExplanation
};
