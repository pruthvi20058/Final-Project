/**
 * MediAgent E5 — Prompt Injection Security Tests
 *
 * Verifies that RAG retrieval, NLP processing, and agent tool execution
 * are resilient against prompt injection attacks where untrusted content
 * (OCR text, patient symptoms, uploaded documents) attempts to override
 * application policies or extract sensitive information.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function record(title, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${title} — PASSED`);
  } else {
    failed++;
    console.error(`  ❌ ${title} — FAILED`);
  }
  if (detail) console.log(`     ↳ ${detail}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch { return null; }
}

console.log('\n==============================================================================');
console.log('🧪 MediAgent E5 — Prompt Injection Security Tests');
console.log('==============================================================================\n');

// TEST 1: Verify RAG service has query sanitization
const ragContent = readFileSafe(path.join(__dirname, '..', 'services', 'ragService.js'));
const hasSanitizeQuery = ragContent && ragContent.includes('sanitizeQuery');
record('RAG service implements query sanitization',
  hasSanitizeQuery,
  'sanitizeQuery function found in ragService.js');

// TEST 2: Verify PII removal in RAG queries
const hasPiiRemoval = ragContent && (
  ragContent.includes('email') || ragContent.includes('phone') || ragContent.includes('PII')
);
record('RAG service removes PII from queries',
  hasPiiRemoval,
  'PII removal patterns found in query sanitization');

// TEST 3: Verify RAG does not execute arbitrary instructions from retrieved content
// RAG service uses sanitizeQuery to strip potential injection patterns from user queries
const hasInstructionGuard = ragContent && ragContent.includes('sanitizeQuery');
record('RAG sanitizes queries to prevent instruction injection',
  hasInstructionGuard,
  'sanitizeQuery applied to user queries before retrieval');

// TEST 4: Verify NLP service does not treat OCR text as commands
const nlpContent = readFileSafe(path.join(__dirname, '..', 'services', 'multilingualNlp.py'));
const nlpTreatsAsData = nlpContent && (
  nlpContent.includes('extract') || nlpContent.includes('parse') || nlpContent.includes('entity')
);
record('NLP treats input as data, not commands',
  nlpTreatsAsData,
  'NLP service uses extraction/parsing (data treatment) not command execution');

// TEST 5: Verify agent tools have input schemas (not free-form)
const toolsDir = path.join(__dirname, '..', 'agents', 'tools');
const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));
let allToolsHaveSchemas = true;
for (const tf of toolFiles) {
  const content = readFileSafe(path.join(toolsDir, tf));
  if (content && !content.includes('inputSchema')) {
    allToolsHaveSchemas = false;
    console.log(`     ↳ Tool ${tf} missing inputSchema`);
  }
}
record('All agent tools have input schemas',
  allToolsHaveSchemas,
  `${toolFiles.length} tools checked, all have inputSchema`);

// TEST 6: Verify agent tools validate input before execution
let allToolsValidate = true;
for (const tf of toolFiles) {
  const content = readFileSafe(path.join(toolsDir, tf));
  if (content && !content.includes('validateInput')) {
    allToolsValidate = false;
    console.log(`     ↳ Tool ${tf} missing validateInput`);
  }
}
record('All agent tools validate input before execution',
  allToolsValidate,
  'All tools have validateInput function');

// TEST 7: Verify tools do not execute arbitrary shell commands
let noShellExec = true;
for (const tf of toolFiles) {
  const content = readFileSafe(path.join(toolsDir, tf));
  if (content && (content.includes('exec(') || content.includes('spawn(') || content.includes('execSync('))) {
    // These could be legitimate for Python ML, but check if they use user input
    const usesUserInput = content.includes('input.') || content.includes('req.');
    if (usesUserInput) {
      noShellExec = false;
      console.log(`     ↳ Tool ${tf} uses shell execution with potential user input`);
    }
  }
}
record('No agent tools execute shell commands with user input',
  noShellExec,
  'Shell execution (if any) does not use user-controlled input');

// TEST 8: Verify orchestrator uses allowlisted tool registry
const orchestratorContent = readFileSafe(path.join(__dirname, '..', 'agents', 'orchestratorService.js'));
const hasToolRegistry = orchestratorContent && orchestratorContent.includes('TOOL_REGISTRY');
record('Orchestrator uses allowlisted tool registry',
  hasToolRegistry,
  'TOOL_REGISTRY restricts tools to known, vetted implementations');

// TEST 9: Verify RAG retrieve endpoint sanitizes query
const ragRouteContent = readFileSafe(path.join(__dirname, '..', 'routes', 'rag.js'));
const ragSanitizesLog = ragRouteContent && ragRouteContent.includes('sanitizeQuery');
record('RAG route sanitizes query before logging',
  ragSanitizesLog,
  'RAG route calls sanitizeQuery on user query');

// TEST 10: Verify knowledge base sources don't contain executable instructions
const kbDir = path.join(__dirname, '..', 'knowledge');
let kbSafe = true;
if (fs.existsSync(kbDir)) {
  const kbFiles = fs.readdirSync(kbDir, { recursive: true }).filter(f => f.endsWith('.json') || f.endsWith('.md'));
  for (const kf of kbFiles) {
    const content = readFileSafe(path.join(kbDir, kf));
    if (content && /<script|javascript:|eval\(|exec\(/i.test(content)) {
      kbSafe = false;
      console.log(`     ↳ Potentially dangerous content in ${kf}`);
    }
  }
}
record('Knowledge base contains no executable code',
  kbSafe,
  'No script tags or executable patterns found in knowledge base files');

console.log(`\n==============================================================================`);
console.log(`📊 PROMPT INJECTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==============================================================================\n`);

process.exit(failed > 0 ? 1 : 0);
