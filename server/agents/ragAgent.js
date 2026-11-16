// RAG Agent — Retrieval-Augmented Generation using TF-IDF vector search
const { vectorSearch, conditions } = require('../knowledge/medicalKB');

function analyze(query, symptoms, diagnoses) {
  const steps = [];

  const searchQuery = [query, ...(symptoms || []), ...(diagnoses || []).map(d => d.condition || '')].join(' ');

  steps.push({ action: 'Constructing search query', detail: `Query tokens from symptoms + diagnoses` });
  steps.push({ action: 'Performing TF-IDF vector similarity search', detail: `Searching across ${conditions.length} medical documents` });

  const results = vectorSearch.search(searchQuery, 5);

  steps.push({ action: 'Retrieved top matches', detail: `${results.length} relevant documents found` });

  const retrievedDocuments = results.map((r, i) => {
    steps.push({
      action: `Document #${i + 1}: ${r.condition.name}`,
      detail: `Relevance: ${(r.score * 100).toFixed(1)}% | Category: ${r.condition.category}`
    });

    return {
      title: r.condition.name,
      category: r.condition.category,
      icd10: r.condition.icd10,
      relevanceScore: Math.round(r.score * 100),
      guidelines: r.condition.guidelines,
      evidenceLevel: r.condition.evidence_level,
      differentials: r.condition.differentials,
      source: `MediAgent KB — ${r.condition.name} Clinical Guidelines (Evidence Level ${r.condition.evidence_level})`,
      citation: `MediAgent Medical Knowledge Base v1.0, ${r.condition.category} Section, ICD-10: ${r.condition.icd10}`
    };
  });

  steps.push({ action: 'Compiling evidence summaries', detail: 'Formatting citations and guidelines' });

  return {
    agent: 'RAG Agent',
    icon: '📚',
    retrievedDocuments,
    totalSearched: conditions.length,
    searchMethod: 'TF-IDF Cosine Similarity',
    reasoning: steps,
    recommendation: retrievedDocuments.length > 0
      ? `Retrieved ${retrievedDocuments.length} relevant clinical guidelines. Top match: "${retrievedDocuments[0].title}" (${retrievedDocuments[0].relevanceScore}% relevance).`
      : 'No strongly matching documents found. Consider broadening search terms or manual literature review.'
  };
}

module.exports = { analyze };
