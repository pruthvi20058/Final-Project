/**
 * MediAgent Medicine Packaging & Strip OCR Service
 * Extracts text from medicine boxes, strips, and labels using Tesseract.js and fuzzy matching.
 */

const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}
const { getAllMedicines } = require('../db/database');

/**
 * Normalizes text for medicine matching: removes special characters, lowercase
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Preprocess image for OCR using sharp if available
 */
async function preprocessMedicineImage(inputPath) {
  if (!sharp) return inputPath;
  try {
    const ext = path.extname(inputPath);
    const preprocessedPath = inputPath.replace(ext, `_preprocessed.png`);
    await sharp(inputPath)
      .resize({ width: 1800, withoutEnlargement: false, fit: 'inside' })
      .grayscale()
      .normalise()
      .sharpen()
      .toFile(preprocessedPath);
    return preprocessedPath;
  } catch (err) {
    console.warn('[MedicineOCR] Preprocessing failed, using original:', err.message);
    return inputPath;
  }
}

/**
 * Identify medicine from image file
 */
async function identifyMedicineFromImage(imagePath) {
  if (!fs.existsSync(imagePath)) {
    return {
      success: false,
      error: 'Image file not found on server'
    };
  }

  let worker = null;
  let preprocessedPath = null;

  try {
    preprocessedPath = await preprocessMedicineImage(imagePath);
    worker = await Tesseract.createWorker('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: '3', // Fully automatic page segmentation
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,/%+ '
    });

    const ret = await worker.recognize(preprocessedPath);
    const rawText = ret.data.text || '';
    const confidence = ret.data.confidence ? Math.round(ret.data.confidence) : 80;

    await worker.terminate();
    worker = null;

    // Clean up temporary preprocessed image if different from original
    if (preprocessedPath && preprocessedPath !== imagePath && fs.existsSync(preprocessedPath)) {
      try { fs.unlinkSync(preprocessedPath); } catch {}
    }

    const normalizedOcr = normalizeText(rawText);
    const ocrWords = normalizedOcr.split(/\s+/).filter(w => w.length >= 3);

    // Fetch all catalog medicines to match against
    const allMedicines = getAllMedicines({ limit: 100 });
    const matches = [];

    for (const med of allMedicines) {
      let score = 0;
      const brandParts = normalizeText(med.brandName).split(/\s+/).filter(w => w.length >= 3);
      const genericParts = normalizeText(med.genericName).split(/\s+/).filter(w => w.length >= 3);
      const activeParts = (med.activeIngredients || []).flatMap(ai => normalizeText(ai).split(/\s+/).filter(w => w.length >= 3));

      // 1. Direct whole-phrase substring checks in OCR text
      if (normalizedOcr.includes(normalizeText(med.genericName))) {
        score += 85;
      }
      for (const brand of med.brandName.split(',')) {
        const cleanBrand = normalizeText(brand);
        if (cleanBrand.length >= 3 && normalizedOcr.includes(cleanBrand)) {
          score += 90;
        }
      }

      // 2. Individual word hits
      let brandHits = 0;
      for (const bp of brandParts) {
        if (ocrWords.includes(bp)) brandHits++;
      }
      let genericHits = 0;
      for (const gp of genericParts) {
        if (ocrWords.includes(gp)) genericHits++;
      }
      let activeHits = 0;
      for (const ap of activeParts) {
        if (ocrWords.includes(ap)) activeHits++;
      }

      score += (brandHits * 25) + (genericHits * 20) + (activeHits * 15);

      // Strength checks (e.g. 650, 500, 400, 250, 40, 10)
      const compositionMatch = med.composition.match(/(\d+)\s*(mg|g|mcg|ml)/i);
      if (compositionMatch && normalizedOcr.includes(compositionMatch[1])) {
        score += 15;
      }

      if (score > 20) {
        matches.push({
          medicine: med,
          matchScore: Math.min(score, 99),
          detectedTerms: [...new Set([...brandParts, ...genericParts])].filter(t => ocrWords.includes(t))
        });
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = matches.length > 0 ? matches[0] : null;

    return {
      success: true,
      rawOcrText: rawText.trim(),
      confidence,
      matchedMedicine: bestMatch ? bestMatch.medicine : null,
      matchConfidence: bestMatch ? bestMatch.matchScore : 0,
      detectedTerms: bestMatch ? bestMatch.detectedTerms : [],
      candidateMedicines: matches.slice(0, 4).map(m => ({
        id: m.medicine.id,
        brandName: m.medicine.brandName,
        genericName: m.medicine.genericName,
        therapeuticCategory: m.medicine.therapeuticCategory,
        composition: m.medicine.composition,
        matchScore: m.matchScore
      })),
      requiresConfirmation: true, // Always require user confirmation
      message: bestMatch
        ? `Detected "${bestMatch.medicine.genericName}" (${bestMatch.medicine.brandName.split(',')[0].trim()}). Please confirm before viewing complete prescribing information.`
        : 'Could not automatically identify a registered medicine from the image text. You may select or search from the medicine directory.'
    };
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch {}
    }
    if (preprocessedPath && preprocessedPath !== imagePath && fs.existsSync(preprocessedPath)) {
      try { fs.unlinkSync(preprocessedPath); } catch {}
    }
    console.error('[MedicineOCR] Error processing image:', err);
    return {
      success: false,
      error: `Medicine OCR failed: ${err.message}`
    };
  }
}

module.exports = {
  identifyMedicineFromImage,
  normalizeText
};
