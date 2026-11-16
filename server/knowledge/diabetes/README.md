# MediAgent Clinical Knowledge Base — Diabetes Module

This directory contains verified, evidence-grounded clinical guideline sources for the MediAgent Diabetes decision support system.

## Provenance Policy
- Every document in `sources.json` is linked to an authentic clinical organization (ADA, NIDDK, CDC, WHO).
- Sources include explicit metadata: `id`, `title`, `organization`, `publicationDate`, `url`, `documentType`, `topic`, `version`, and `retrievedAt`.
- Fabricated citations, random SEO health blogs, and LLM-generated sources are strictly prohibited.

## Usage in RAG Engine
1. Retrieval queries are constructed from validated clinical feature names and screening outcomes.
2. Patient PII is stripped prior to query execution.
3. If no matching sources are found, the engine returns `status: "INSUFFICIENT_EVIDENCE"` rather than generating fake citations.
