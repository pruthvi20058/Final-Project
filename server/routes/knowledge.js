const express = require('express');
const router = express.Router();
const { conditions, drugInteractions, vectorSearch } = require('../knowledge/medicalKB');

// GET all conditions
router.get('/conditions', (req, res) => {
  res.json(conditions.map(c => ({
    id: c.id, name: c.name, icd10: c.icd10, category: c.category, severity: c.severity
  })));
});

// GET single condition
router.get('/conditions/:id', (req, res) => {
  const cond = conditions.find(c => c.id === req.params.id);
  if (!cond) return res.status(404).json({ error: 'Condition not found' });
  res.json(cond);
});

// POST search
router.post('/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  const results = vectorSearch.search(query, 5);
  res.json(results.map(r => ({
    condition: r.condition,
    relevanceScore: Math.round(r.score * 100)
  })));
});

// GET drug interactions
router.get('/interactions', (req, res) => {
  res.json(drugInteractions);
});

// POST check interactions
router.post('/check-interactions', (req, res) => {
  const { drugs } = req.body;
  if (!drugs || drugs.length < 2) return res.status(400).json({ error: 'At least 2 drugs required' });
  const found = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i].toLowerCase(), b = drugs[j].toLowerCase();
      const match = drugInteractions.find(di =>
        (di.drug1.toLowerCase().includes(a) && di.drug2.toLowerCase().includes(b)) ||
        (di.drug1.toLowerCase().includes(b) && di.drug2.toLowerCase().includes(a))
      );
      if (match) found.push(match);
    }
  }
  res.json(found);
});

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediAgent Clinical Knowledge Base API',
    totalConditions: conditions.length,
    totalDrugInteractions: drugInteractions.length,
    conditions: conditions.map(c => ({ id: c.id, name: c.name, icd10: c.icd10, category: c.category }))
  });
});

module.exports = router;
