const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[Parser] Optional sharp package not available. Raw OCR will be used.');
}

// Expanded Canonical Lab Term Normalization Map
const NORMALIZATION_MAP = {
  // Glycemic
  'glucose': 'glucose',
  'fasting blood sugar': 'glucose',
  'fasting glucose': 'glucose',
  'fbs': 'glucose',
  'blood sugar': 'glucose',
  'plasma glucose': 'glucose',
  'plas': 'glucose',
  'hba1c': 'hba1c',
  'a1c': 'hba1c',
  'glycated hemoglobin': 'hba1c',

  // Pima & Vital Parameters
  'body mass index': 'bmi',
  'bmi': 'bmi',
  'mass': 'bmi',
  'diastolic blood pressure': 'diastolic_bp',
  'diastolic bp': 'diastolic_bp',
  'blood pressure': 'blood_pressure',
  'pres': 'diastolic_bp',
  'bp': 'blood_pressure',
  'insulin': 'insulin',
  'serum insulin': 'insulin',
  '2-hour insulin': 'insulin',
  'insu': 'insulin',
  'pregnancies': 'pregnancies',
  'pregnancy count': 'pregnancies',
  'preg': 'pregnancies',
  'triceps skin fold': 'skin_fold',
  'skin thickness': 'skin_fold',
  'skin': 'skin_fold',
  'diabetes pedigree': 'pedigree',
  'pedigree': 'pedigree',
  'pedi': 'pedigree',
  'age': 'age',

  // Renal & Electrolytes
  'creatinine': 'creatinine',
  'serum creatinine': 'creatinine',
  'egfr': 'egfr',
  'gfr': 'egfr',
  'estimated glomerular filtration rate': 'egfr',
  'bun': 'bun',
  'blood urea nitrogen': 'bun',
  'urea': 'bun',
  'potassium': 'potassium',
  'serum potassium': 'potassium',
  'sexum potassium': 'potassium',
  'sodium': 'sodium',
  'serum sodium': 'sodium',
  'chloride': 'chloride',
  'a chloride': 'chloride',
  'bicarbonate': 'bicarbonate',

  // Hepatic
  'alt': 'alt',
  'gpt': 'alt',
  'gpt (alt)': 'alt',
  'sgpt': 'alt',
  'alanine aminotransferase': 'alt',
  'ast': 'ast',
  'got': 'ast',
  'got (ast)': 'ast',
  'sgot': 'ast',
  'aspartate aminotransferase': 'ast',
  'bilirubin': 'total_bilirubin',
  'total bilirubin': 'total_bilirubin',
  'alkaline phosphatase': 'alkaline_phosphatase',

  // Hematology
  'hemoglobin': 'hemoglobin',
  'fmwoclosm': 'hemoglobin',
  'hb': 'hemoglobin',
  'hgb': 'hemoglobin',
  'wbc': 'wbc',
  'wbc count': 'wbc',
  'total count': 'wbc',
  'white blood cell': 'wbc',
  'rbc': 'rbc',
  'red blood cell': 'rbc',
  'red blood cells': 'rbc',
  'platelets': 'platelets',
  'platelet count': 'platelets',
  'pratelet count': 'platelets',
  'mcv': 'mcv',
  'mch': 'mch',
  'mchc': 'mchc',
  'packed cell volume': 'pcv',
  'hematocrit': 'pcv',
  'hct': 'pcv',
  'pcv': 'pcv',
  'neutrophils': 'neutrophils',
  'lymphocytes': 'lymphocytes',
  'eosinophils': 'eosinophils',
  'monocytes': 'monocytes',
  'basophils': 'basophils',

  // Lipids
  'total cholesterol': 'total_cholesterol',
  'cholesterol': 'total_cholesterol',
  'hdl': 'hdl_cholesterol',
  'hdl cholesterol': 'hdl_cholesterol',
  'ldl': 'ldl_cholesterol',
  'ldl cholesterol': 'ldl_cholesterol',
  'triglycerides': 'triglycerides',

  // Endocrine & Minerals
  'tsh': 'tsh',
  'thyroid stimulating hormone': 'tsh',
  'vitamin d': 'vitamin_d',
  'uric acid': 'uric_acid',
  'calcium': 'calcium',
  'phosphorus': 'phosphorus',
  'magnesium': 'magnesium'
};

const VALID_UNITS = new Set([
  'mg/dl', 'g/dl', 'u/l', 'uu/ml', 'µu/ml', 'meq/l', 'cells/µl', 'cells/ul',
  'calls/cu', 'cells/cu', 'lakha/cu', 'lakhs/cu', '/µl', '/ul', 'pg/ml', 'mieu/l',
  'fl', 'pg', '%', 'kg/m²', 'mmhg', 'count', 'mm', 'score', 'mmol/l', 'ng/ml',
  'ardl', 'ml/min', 'thousand/ul', 'g/l', 'iu/l'
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-sorted keys by length descending to match most specific names first
const SORTED_NORMALIZATION_KEYS = Object.keys(NORMALIZATION_MAP).sort((a, b) => b.length - a.length);

function normalizeLabName(rawName) {
  if (!rawName) return 'unknown_test';
  const clean = rawName.toLowerCase().trim()
    .replace(/^[@#\*~\_\|\-\+\:\=]+/, '')
    .replace(/^[\s:\-\=\.\+]+|[\s:\-\=\.\+]+$/g, '')
    .replace(/\s+/g, ' ');

  // 1. Direct exact match
  if (NORMALIZATION_MAP[clean]) {
    return NORMALIZATION_MAP[clean];
  }

  // 2. Word boundary match on descending length keys (longest first)
  for (const key of SORTED_NORMALIZATION_KEYS) {
    if (clean === key) {
      return NORMALIZATION_MAP[key];
    }
    if (key.length <= 4) {
      // Short abbreviations (e.g. ast, alt, bun, pcv, wbc, rbc, fbs, bmi) MUST match with strict word boundaries
      const regex = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(key)}(?:$|[^a-z0-9])`, 'i');
      if (regex.test(clean)) {
        return NORMALIZATION_MAP[key];
      }
    } else {
      if (clean.includes(key)) {
        return NORMALIZATION_MAP[key];
      }
    }
  }
  return clean.replace(/[^a-z0-9]/gi, '_');
}

/**
 * Extract TSV Words from Tesseract TSV string
 */
function parseTSVWords(tsvString) {
  if (!tsvString || typeof tsvString !== 'string') return [];
  const lines = tsvString.split(/\r?\n/);
  const words = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length >= 12 && parts[0] === '5') {
      const text = parts[11] ? parts[11].trim() : '';
      if (text) {
        const conf = parseFloat(parts[10]);
        words.push({
          text,
          x: parseInt(parts[6], 10),
          y: parseInt(parts[7], 10),
          width: parseInt(parts[8], 10),
          height: parseInt(parts[9], 10),
          confidence: isNaN(conf) || conf < 0 ? null : Math.round(conf)
        });
      }
    }
  }
  return words;
}

/**
 * Group OCR Words vertically into Visual Y-Lines
 */
function groupWordsIntoLines(words, lineTolerance = 22) {
  if (!words || words.length === 0) return [];
  const sorted = [...words].sort((a, b) => a.y - b.y);
  const lines = [];

  for (const word of sorted) {
    let matchedLine = lines.find(l => Math.abs(l.y - word.y) <= lineTolerance);
    if (!matchedLine) {
      matchedLine = { y: word.y, words: [] };
      lines.push(matchedLine);
    }
    matchedLine.words.push(word);
    matchedLine.y = Math.round(matchedLine.words.reduce((sum, w) => sum + w.y, 0) / matchedLine.words.length);
  }

  lines.forEach(l => l.words.sort((a, b) => a.x - b.x));
  lines.sort((a, b) => a.y - b.y);
  return lines;
}

/**
 * Parse Structured Reference Range string into low, high, operator
 */
function parseReferenceRangeStruct(refStr) {
  if (!refStr) return { raw: '', low: null, high: null, operator: null };

  const raw = refStr.trim();
  const rangeMatch = raw.match(/([<>]?=?)\s*(-?\d+(?:\.\d+)?)\s*[\-–]\s*(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      raw,
      low: parseFloat(rangeMatch[2]),
      high: parseFloat(rangeMatch[3]),
      operator: rangeMatch[1] || null
    };
  }

  const opMatch = raw.match(/([<>]?=?)\s*(-?\d+(?:\.\d+)?)/);
  if (opMatch && opMatch[1]) {
    const val = parseFloat(opMatch[2]);
    return {
      raw,
      low: opMatch[1].includes('>') ? val : null,
      high: opMatch[1].includes('<') ? val : null,
      operator: opMatch[1]
    };
  }

  return { raw, low: null, high: null, operator: null };
}

/**
 * Robust clinical demographic extraction avoiding page number collisions
 */
function extractDemographicsFromText(lineText, demographics) {
  if (!lineText || typeof lineText !== 'string' || !demographics) return;

  // Guard: if line is purely page numbering (e.g. "Page 1 of 2", "Page: 1"), do NOT parse age
  const isPurePageLine = /page\s+\d+(\s+of\s+\d+)?/i.test(lineText) && !/\bage\b/i.test(lineText);
  if (isPurePageLine) return;

  // Age extraction: require explicit age keyword with word boundaries
  // Matches: "Age: 45", "Age / Sex: 45 / F", "Age: 45 Years", "Patient Age - 45", "Age 45"
  const ageMatch = lineText.match(/(?:age\s*[\/:]\s*(?:sex|gender)|patient\s+age|\bage\b)\s*[:=/\-]?\s*(\d{1,3})\s*(?:years?|yrs?|y\b)?/i);
  if (ageMatch && demographics.age === null) {
    const parsedAge = parseInt(ageMatch[1], 10);
    // Biological plausibility check for patient age
    if (parsedAge >= 1 && parsedAge <= 120) {
      demographics.age = parsedAge;
    }
  }

  // Sex / Gender extraction
  // Matches: "Sex: Female", "Gender: Male", "Age/Sex: 45/F", "Sex: M", "Gender: F"
  const sexMatch = lineText.match(/(?:sex|gender)\s*[:=/\-]?\s*(female|male|f\b|m\b)/i)
    || lineText.match(/[\/,]\s*(female|male|f\b|m\b)\b/i);
  if (sexMatch && demographics.sex === null) {
    const val = sexMatch[1].toUpperCase();
    demographics.sex = val.startsWith('F') ? 'Female' : 'Male';
  }
}

let _sharedWorkerInstance = null;

async function getOrCreateTesseractWorker() {
  if (!_sharedWorkerInstance) {
    const langPath = path.join(__dirname, '..');
    const worker = await Tesseract.createWorker('eng', 1, {
      langPath: langPath,
      cachePath: langPath,
      gzip: false
    });
    await worker.setParameters({ tessedit_pageseg_mode: '3' });
    _sharedWorkerInstance = worker;
  }
  return _sharedWorkerInstance;
}

async function runOptimizedOCR(imageBuffer) {
  try {
    const worker = await getOrCreateTesseractWorker();
    return await worker.recognize(imageBuffer, {}, { tsv: true });
  } catch (err) {
    console.warn('[Parser] OCR recognition error, recreating worker instance:', err.message);
    if (_sharedWorkerInstance) {
      try { await _sharedWorkerInstance.terminate(); } catch {}
      _sharedWorkerInstance = null;
    }
    const worker = await getOrCreateTesseractWorker();
    return await worker.recognize(imageBuffer, {}, { tsv: true });
  }
}

async function extractTextFromFile(filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found on server');
  }

  const fileExt = path.extname(filePath).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);
  const isRealPdf = fileBuffer.length >= 4 && fileBuffer.toString('utf8', 0, 4) === '%PDF';

  // 1. PDF Text Extraction (Selectable Text or Scanned OCR Fallback)
  if (isRealPdf) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData.text && pdfData.text.trim().length > 30) {
        return {
          text: pdfData.text,
          tsv: '',
          pages: pdfData.numpages || 1,
          confidence: null,
          method: 'PDF_PARSE'
        };
      }
    } catch (err) {
      console.warn('[Parser] PDF text extraction fallback:', err.message);
    }

    // Scanned / Image-based PDF Fallback: Render pages to images using PyMuPDF and run OCR
    try {
      const { execFileSync } = require('child_process');
      const tempOutDir = path.join(path.dirname(filePath), `pdf_rendered_${Date.now()}`);
      const pyScript = path.join(__dirname, 'pdfRenderer.py');
      const pyOut = execFileSync('python', [pyScript, filePath, tempOutDir], { encoding: 'utf8' });
      const renderResult = JSON.parse(pyOut);

      if (renderResult.pages && renderResult.pages.length > 0) {
        let combinedText = '';
        let combinedTsv = '';
        let totalConfidence = 0;
        let confCount = 0;

        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({ tessedit_pageseg_mode: '3' });

        for (const pageInfo of renderResult.pages) {
          if (fs.existsSync(pageInfo.imagePath)) {
            let pageImgBuf = fs.readFileSync(pageInfo.imagePath);
            if (sharp) {
              try {
                pageImgBuf = await sharp(pageImgBuf).grayscale().normalize().sharpen().toBuffer();
              } catch (e) {}
            }
            const ret = await worker.recognize(pageImgBuf, {}, { tsv: true });
            if (ret.data.text) {
              combinedText += (combinedText ? '\n--- PAGE BREAK ---\n' : '') + ret.data.text;
            }
            if (ret.data.tsv) {
              combinedTsv += ret.data.tsv + '\n';
            }
            if (ret.data.confidence) {
              totalConfidence += ret.data.confidence;
              confCount++;
            }
            try { fs.unlinkSync(pageInfo.imagePath); } catch (e) {}
          }
        }
        await worker.terminate();
        try { fs.rmdirSync(tempOutDir); } catch (e) {}

        const avgConf = confCount > 0 ? Math.round(totalConfidence / confCount) : null;
        return {
          text: combinedText,
          tsv: combinedTsv,
          pages: renderResult.pageCount || 1,
          confidence: avgConf,
          method: 'SCANNED_PDF_OCR'
        };
      }
    } catch (scannedErr) {
      console.warn('[Parser] Scanned PDF rendering/OCR fallback failed:', scannedErr.message);
      return { text: '', tsv: '', pages: 1, confidence: null, method: 'FAILED_UNREADABLE_PDF' };
    }
  }

  // 2. Image Tesseract OCR with TSV & Bounding Boxes
  if (['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(fileExt) || (mimeType && mimeType.startsWith('image/'))) {
    try {
      let imageBuffer = fs.readFileSync(filePath);
      let dimensions = { width: null, height: null };

      if (sharp) {
        try {
          const meta = await sharp(imageBuffer).metadata();
          dimensions = { width: meta.width, height: meta.height };
          
          let pipeline = sharp(imageBuffer).grayscale();

          // Intelligent resizing for document OCR:
          // Optimal OCR resolution is 1300px - 1500px width.
          // Never double an already high-res image (e.g. 1700px -> 3400px caused 4x OCR slowdown).
          if (meta.width && meta.width > 1500) {
            pipeline = pipeline.resize({ width: 1400, fit: 'inside' });
          } else if (meta.width && meta.width < 900) {
            pipeline = pipeline.resize({ width: Math.min(meta.width * 2, 1300), fit: 'inside' });
          }

          imageBuffer = await pipeline
            .normalize()
            .toBuffer();
        } catch (sErr) {
          console.warn('[Parser] Sharp preprocessing skipped:', sErr.message);
        }
      }

      let ret = await runOptimizedOCR(imageBuffer);

      if ((!ret.data.text || ret.data.text.trim().length < 30) && sharp) {
        const worker = await getOrCreateTesseractWorker();
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        const fallbackRet = await worker.recognize(imageBuffer, {}, { tsv: true });
        if (fallbackRet.data.text && fallbackRet.data.text.length > (ret.data.text || '').length) {
          ret = fallbackRet;
        }
        await worker.setParameters({ tessedit_pageseg_mode: '3' });
      }

      return {
        text: ret.data.text || '',
        tsv: ret.data.tsv || '',
        pages: 1,
        confidence: ret.data.confidence ? Math.round(ret.data.confidence) : null,
        method: 'TESSERACT_OCR',
        dimensions
      };
    } catch (err) {
      console.warn('[Parser] Image Tesseract OCR failed:', err.message);
      return { text: '', tsv: '', pages: 1, confidence: null, method: 'FAILED' };
    }
  }

  try {
    const buf = fs.readFileSync(filePath);
    if (!buf.includes(0x00)) {
      return { text: buf.toString('utf8'), tsv: '', pages: 1, confidence: null, method: 'RAW_TEXT' };
    }
  } catch (err) {}

  return { text: '', tsv: '', pages: 1, confidence: null, method: 'UNKNOWN' };
}

/**
 * Layout & Table-Aware Spatial Laboratory Report Extractor
 */
function parseLabValuesFromText(rawText, extractionMethod = 'PDF_PARSE', extraData = {}) {
  const tsvString = extraData.tsv || '';
  const ocrWords = parseTSVWords(tsvString);
  const results = [];
  const discardedCandidates = [];
  const patientDemographics = { age: null, sex: null };
  const detectedTables = [];
  const detectedRows = [];
  const seenMatches = new Set();

  let idCounter = 1;
  let currentSection = 'GENERAL LABORATORY';

  // --- PATH A: SPATIAL LAYOUT-AWARE EXTRACTION (WHEN OCR TSV WORDS EXIST) ---
  if (ocrWords.length > 0) {
    const visualLines = groupWordsIntoLines(ocrWords, 22);

    // 1. Detect Header X-Column Regions across visual lines
    let nameMaxX = 700;
    let resultMaxX = 1150;
    let unitMaxX = 1500;

    // Scan lines for Header Keyword positions
    for (const line of visualLines) {
      const lineText = line.words.map(w => w.text).join(' ');
      if (/test|parameter|result|unit|reference|normal/i.test(lineText)) {
        const resWord = line.words.find(w => /result|value/i.test(w.text));
        const unitWord = line.words.find(w => /unit|units/i.test(w.text));
        const refWord = line.words.find(w => /reference|normal|interval/i.test(w.text));

        if (resWord) nameMaxX = Math.max(resWord.x - 20, 500);
        if (unitWord) resultMaxX = Math.max(unitWord.x - 20, nameMaxX + 200);
        if (refWord) unitMaxX = Math.max(refWord.x - 20, resultMaxX + 200);
      }
    }

    // 2. Iterate Visual Lines spatially
    for (let i = 0; i < visualLines.length; i++) {
      const line = visualLines[i];
      const lineText = line.words.map(w => w.text).join(' ');
      const bbox = {
        x0: Math.min(...line.words.map(w => w.x)),
        y0: Math.min(...line.words.map(w => w.y)),
        x1: Math.max(...line.words.map(w => w.x + w.width)),
        y1: Math.max(...line.words.map(w => w.y + w.height))
      };

      // Detect Section Headers (Must NOT contain numeric lab values)
      if (!/\d/.test(lineText) && /^(HEMATOLOGY|BIOCHEMISTRY|LIPID|KIDNEY|RENAL|PIMA|LIVER|HEPATIC|VITAMIN|MINERAL|THYROID|URINE|COMPLETE BLOOD COUNT|SERUM ELECTROLYTES)/i.test(lineText)) {
        currentSection = lineText.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '').trim();
        detectedTables.push({ section: currentSection, y: line.y });
        continue;
      }

      // Reject Non-Lab Metadata Lines (Phone, Page Number, Report ID, Dates, Hospital Info, Top noise)
      if (
        line.y < 30 ||
        /(\+?\d{1,3}[\s\-]?)?\(?\d{3,5}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/.test(lineText) ||
        /ph:|phone|tel:|mobile|expertise|empowering|-40401234/i.test(lineText) ||
        /page\s+\d+\s+of|medical\s+laboratory\s+page/i.test(lineText) ||
        /report\s+no:|accession|barcode|nabl|registration|hospital|clinic|doctor|dr\./i.test(lineText) ||
        /^(patient|sample|received|reported|date|time|address|email|website|test\s+name|normal\s+ranges)\b/i.test(lineText)
      ) {
        // Demographics Separation
        extractDemographicsFromText(lineText, patientDemographics);

        discardedCandidates.push({ line: lineText, reason: 'Non-lab metadata, phone, or demographic line', boundingBox: bbox });
        continue;
      }

      // 3. Assign Line Words to Spatial Columns based on X position
      let nameWords = line.words.filter(w => w.x < nameMaxX);
      let resultWords = line.words.filter(w => w.x >= nameMaxX && w.x < resultMaxX);
      let unitWords = line.words.filter(w => w.x >= resultMaxX && w.x < unitMaxX);
      let refWords = line.words.filter(w => w.x >= unitMaxX);

      // Fallback column assignment if nameWords is empty but resultWords has tokens
      if (nameWords.length === 0 && line.words.length >= 2) {
        const firstNumIdx = line.words.findIndex(w => /^\d+(?:\.\d+)?$/.test(w.text));
        if (firstNumIdx > 0) {
          nameWords = line.words.slice(0, firstNumIdx);
          resultWords = line.words.slice(firstNumIdx, firstNumIdx + 1);
          unitWords = line.words.slice(firstNumIdx + 1, firstNumIdx + 2);
          refWords = line.words.slice(firstNumIdx + 2);
        }
      }

      const rawName = nameWords.map(w => w.text).join(' ').replace(/^[@#\*~_\-\+\s]+/, '').replace(/^0\s+/, '').trim();
      const rawResultText = resultWords.map(w => w.text).join(' ').trim();
      const rawUnitText = unitWords.map(w => w.text).join(' ').trim();
      const rawRefText = refWords.map(w => w.text).join(' ').trim();

      // Extract numeric value from resultWords or line fallback
      let numVal = NaN;
      let rawValStr = '';

      const numMatch = rawResultText.match(/([<>]?\s*-?\d+(?:[\.'']\d+)?)/) || lineText.match(/(?:^|\s)([<>]?\s*-?\d+(?:[\.'']\d+)?)(?:\s|$)/);
      if (numMatch) {
        rawValStr = numMatch[1].replace(/[<>\s]/g, '').replace("'", '.');
        numVal = parseFloat(rawValStr);
      }

      if (isNaN(numVal) || rawName.length < 2) {
        if (/\d/.test(lineText)) {
          discardedCandidates.push({ line: lineText, reason: 'Could not resolve valid numeric lab result or name too short', boundingBox: bbox });
        }
        continue;
      }

      // Unit Validation & Normalization
      let cleanUnit = rawUnitText || (lineText.match(/(mg\/dL|g\/dL|U\/L|uU\/mL|µU\/mL|mEq\/L|cells\/µL|Lakhs\/cu|fL|pg|%|mmol\/L|ng\/mL|pg\/mL|mL\/min)/i) || [''])[0];
      if (/^ardl$/i.test(cleanUnit) || /^mp'd/i.test(cleanUnit)) cleanUnit = 'mg/dL';
      else if (/^mmol/i.test(cleanUnit)) cleanUnit = 'mmol/L';
      else if (/^u[\/'\\]l$/i.test(cleanUnit) || /^un$/i.test(cleanUnit)) cleanUnit = 'U/L';
      else if (/^g[\/'\\]d[l1]$/i.test(cleanUnit)) cleanUnit = 'g/dL';

      // Reject if Unit is a Test Name (e.g. Value=1.1, Unit="ALT")
      if (cleanUnit && !VALID_UNITS.has(cleanUnit.toLowerCase()) && Object.keys(NORMALIZATION_MAP).some(k => k === cleanUnit.toLowerCase())) {
        discardedCandidates.push({ line: lineText, reason: `Invalid unit (${cleanUnit}) - unit is a test parameter name`, boundingBox: bbox });
        continue;
      }

      const normalizedName = normalizeLabName(rawName);
      const matchKey = `${normalizedName}_${numVal}_${currentSection}`;
      if (seenMatches.has(matchKey)) {
        discardedCandidates.push({ line: lineText, reason: 'Duplicate measurement in same section', boundingBox: bbox });
        continue;
      }
      seenMatches.add(matchKey);

      // Data Quality Classification
      let quality = 'VALID';
      let status = 'NORMAL';
      const validationFlags = [];

      // Physiological plausibility bounds per parameter
      const PHYSIOLOGICAL_BOUNDS = {
        // Hematology
        pcv: { max: 60, min: 10, unit: '%' },        // Hematocrit / Packed Cell Volume
        hemoglobin: { min: 3, max: 25, unit: 'g/dL' },
        wbc: { min: 500, max: 100000, unit: 'cells/µL' },
        rbc: { min: 1.0, max: 8.0, unit: 'million/µL' },
        platelets: { min: 10, max: 1000, unit: 'lakhs/µL' },
        mcv: { min: 50, max: 120, unit: 'fL' },
        mch: { min: 15, max: 40, unit: 'pg' },
        mchc: { min: 20, max: 40, unit: 'g/dL' },
        // Biochemical
        glucose: { min: 20, max: 600, unit: 'mg/dL' },
        creatinine: { min: 0.1, max: 20, unit: 'mg/dL' },
        bun: { min: 1, max: 100, unit: 'mg/dL' },
        alt: { min: 1, max: 2000, unit: 'U/L' },
        ast: { min: 1, max: 2000, unit: 'U/L' },
        total_bilirubin: { min: 0.1, max: 30, unit: 'mg/dL' },
        hba1c: { min: 3.0, max: 20.0, unit: '%' },
        bmi: { min: 10, max: 70, unit: 'kg/m²' },
        age: { min: 1, max: 120, unit: 'years' }
      };

      const bounds = PHYSIOLOGICAL_BOUNDS[normalizedName];

      if (numVal < 0) {
        quality = 'INVALID';
        status = 'INVALID';
        validationFlags.push('negative_value');
      } else if (bounds) {
        if (numVal < bounds.min || numVal > bounds.max) {
          quality = 'SUSPICIOUS';
          validationFlags.push(`value_outside_physiological_range(${bounds.min}-${bounds.max}${bounds.unit})`);
        }
        // HCT-specific: flag values > 60% (physiologically impossible for humans)
        if (normalizedName === 'pcv' && numVal > 60) {
          validationFlags.push('hematocrit_above_60_percent_physiologically_impossible');
        }
      }

      // Existing high-value flags (kept for backward compatibility)
      if ((normalizedName === 'glucose' && numVal > 300) || (normalizedName === 'creatinine' && numVal > 5) || (normalizedName === 'alt' && numVal > 200)) {
        if (quality === 'VALID') quality = 'SUSPICIOUS';
        validationFlags.push('high_value_flagged');
        status = 'HIGH';
      } else if (normalizedName === 'glucose' && numVal >= 126) {
        status = 'HIGH';
      } else if (normalizedName === 'hba1c' && numVal >= 6.5) {
        status = 'HIGH';
      } else if (normalizedName === 'hemoglobin' && numVal < 11) {
        status = 'LOW';
      }

      // Decimal placement detection: flag whole numbers > 100 that could be shifted decimals
      // (e.g. OCR reads "39.5" as "395" when the decimal point is dropped)
      if (numVal > 100 && Number.isInteger(numVal) && normalizedName !== 'wbc' && normalizedName !== 'platelets') {
        const shifted = numVal / 10;
        const shiftedBounds = bounds ? bounds : {};
        if (shifted >= (shiftedBounds.min || 0) && shifted <= (shiftedBounds.max || Infinity)) {
          validationFlags.push(`possible_decimal_shift(value_${numVal}_may_be_${shifted})`);
          if (quality === 'VALID') quality = 'SUSPICIOUS';
        }
      }

      // Calculate extraction confidence from OCR word tokens
      const rowWordConfs = line.words.map(w => w.confidence).filter(c => c !== null);
      const avgConf = rowWordConfs.length > 0 ? Math.round(rowWordConfs.reduce((a, b) => a + b, 0) / rowWordConfs.length) : null;

      const labItem = {
        id: `LR-${reportIdPrefix(extractionMethod)}-${idCounter++}`,
        section: currentSection,
        rawName: rawName,
        normalizedName: normalizedName,
        testName: rawName,
        value: numVal,
        originalValue: numVal,
        unit: cleanUnit,
        units: cleanUnit,
        referenceRange: parseReferenceRangeStruct(rawRefText),
        status: status,
        quality: quality,
        validationFlags: validationFlags,
        source: {
          page: 1,
          text: lineText,
          boundingBox: bbox
        },
        sourceLocation: bbox ? `x:${bbox.x0},y:${bbox.y0},w:${bbox.x1 - bbox.x0},h:${bbox.y1 - bbox.y0}` : null,
        extractionMethod: extractionMethod,
        confidence: avgConf,
        validatedByUser: false
      };

      results.push(labItem);
      detectedRows.push(labItem);
    }
  }

  // --- PATH B: FALLBACK LINE-TEXT EXTRACTION (WHEN OCR TSV WORDS UNAVAILABLE) ---
  if (results.length === 0 && rawText) {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const colonPattern = /^([@#\*~_\-\+\s]*[A-Za-z0-9\s%\(\)\/\-\+\.]{2,45})\s*[:=]\s*([<>]?\s*-?\d+(?:[\.'']\d+)?)\s*([a-zA-Z%µ/°\d²'\-]+)?(?:\s*[\(\[]?([<>]?\s*\d+(?:[\.'']\d+)?\s*[\-–]\s*\d+(?:[\.'']\d+)?|[<>]?\s*\d+(?:[\.'']\d+)?)[\)\]]?)?/i;
    const spaceUnitPattern = /^([@#\*~_\-\+\s]*[A-Za-z0-9\s%\(\)\/\-\+\.]{2,45})\s+([<>]?\s*-?\d+(?:[\.'']\d+)?)\s*(mg\/dL|mg['\/]d[l1]?|g\/dL|g['\/]d[l1]?|U\/L|u[\/'\\]l|uU\/mL|µU\/mL|mEq\/L|cells\/µL|cells\/uL|calls\/cu|cells\/cu|lakha\/cu|lakhs\/cu|\/µL|\/uL|pg\/mL|mIU\/L|fL|pg|%|kg\/m²|kg\/m2|mmHg|count|mm|score|mmol\/L|mmol[\/'\\][l1]|ng\/mL|ardl|ml\/min)(?:\s+|$)/i;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];

      // Track Section Headers in PATH B (Must NOT contain numeric lab values)
      if (!/\d/.test(lineText) && /^(HEMATOLOGY|BIOCHEMISTRY|LIPID|KIDNEY|RENAL|PIMA|LIVER|HEPATIC|VITAMIN|MINERAL|THYROID|URINE|COMPLETE BLOOD COUNT|SERUM ELECTROLYTES)/i.test(lineText)) {
        currentSection = lineText.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '').trim();
        detectedTables.push({ section: currentSection });
        continue;
      }

      // Reject Non-Lab Metadata Lines (Phone, Page Number, Report ID, Dates, Age/Sex, Hospital Info)
      if (
        /(\+?\d{1,3}[\s\-]?)?\(?\d{3,5}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/.test(lineText) ||
        /ph:|phone|tel:|mobile|expertise|empowering|-40401234/i.test(lineText) ||
        /page\s+\d+\s+of|medical\s+laboratory\s+page/i.test(lineText) ||
        /report\s+no:|accession|barcode|nabl|registration|hospital|clinic|doctor|dr\./i.test(lineText) ||
        /^(patient|sample|received|reported|date|time|address|email|website|age\s*[\/:=]?|sex\s*[\/:=]?|gender)\b/i.test(lineText) ||
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(lineText) ||
        /\d{1,2}:\d{2}\s*(?:AM|PM|MM)/i.test(lineText)
      ) {
        // Demographics Separation
        extractDemographicsFromText(lineText, patientDemographics);

        discardedCandidates.push({ line: lineText, reason: 'Non-lab metadata, phone, date, or demographic line' });
        continue;
      }

      const match = lineText.match(colonPattern) || lineText.match(spaceUnitPattern);
      if (match) {
        const rawName = match[1].replace(/^[@#\*~_\-\+\s]+/, '').trim();
        const rawValStr = match[2].replace(/[<>\s]/g, '').replace("'", '.');
        const numVal = parseFloat(rawValStr);
        const unit = match[3] ? match[3].trim() : '';

        if (!isNaN(numVal) && rawName.length >= 2 && !/^(page|total|date|id|no|test|result|units|range|ref|flag|status|sample|received|hosp|mrn|age|sex|gender)$/i.test(rawName)) {
          const normalizedName = normalizeLabName(rawName);

          let quality = 'VALID';
          let status = 'NORMAL';
          const validationFlags = [];

          // Physiological plausibility bounds per parameter
          const PHYSIOLOGICAL_BOUNDS = {
            pcv: { max: 60, min: 10, unit: '%' },
            hemoglobin: { min: 3, max: 25, unit: 'g/dL' },
            wbc: { min: 500, max: 100000, unit: 'cells/µL' },
            rbc: { min: 1.0, max: 8.0, unit: 'million/µL' },
            platelets: { min: 10, max: 1000, unit: 'lakhs/µL' },
            mcv: { min: 50, max: 120, unit: 'fL' },
            mch: { min: 15, max: 40, unit: 'pg' },
            mchc: { min: 20, max: 40, unit: 'g/dL' },
            glucose: { min: 20, max: 600, unit: 'mg/dL' },
            creatinine: { min: 0.1, max: 20, unit: 'mg/dL' },
            bun: { min: 1, max: 100, unit: 'mg/dL' },
            alt: { min: 1, max: 2000, unit: 'U/L' },
            ast: { min: 1, max: 2000, unit: 'U/L' },
            total_bilirubin: { min: 0.1, max: 30, unit: 'mg/dL' },
            hba1c: { min: 3.0, max: 20.0, unit: '%' },
            bmi: { min: 10, max: 70, unit: 'kg/m²' },
            age: { min: 1, max: 120, unit: 'years' }
          };

          const bounds = PHYSIOLOGICAL_BOUNDS[normalizedName];

          if (numVal < 0) {
            quality = 'INVALID';
            status = 'INVALID';
            validationFlags.push('negative_value');
          } else if (bounds) {
            if (numVal < bounds.min || numVal > bounds.max) {
              quality = 'SUSPICIOUS';
              validationFlags.push(`value_outside_physiological_range(${bounds.min}-${bounds.max}${bounds.unit})`);
            }
            if (normalizedName === 'pcv' && numVal > 60) {
              validationFlags.push('hematocrit_above_60_percent_physiologically_impossible');
            }
          }

          if ((normalizedName === 'glucose' && numVal > 300) || (normalizedName === 'creatinine' && numVal > 5) || (normalizedName === 'alt' && numVal > 200)) {
            if (quality === 'VALID') quality = 'SUSPICIOUS';
            validationFlags.push('high_value_flagged');
            status = 'HIGH';
          } else if (normalizedName === 'glucose' && numVal >= 126) {
            status = 'HIGH';
          } else if (normalizedName === 'hba1c' && numVal >= 6.5) {
            status = 'HIGH';
          } else if (normalizedName === 'hemoglobin' && numVal < 11) {
            status = 'LOW';
          }

          if (numVal > 100 && Number.isInteger(numVal) && normalizedName !== 'wbc' && normalizedName !== 'platelets') {
            const shifted = numVal / 10;
            const shiftedBounds = bounds ? bounds : {};
            if (shifted >= (shiftedBounds.min || 0) && shifted <= (shiftedBounds.max || Infinity)) {
              validationFlags.push(`possible_decimal_shift(value_${numVal}_may_be_${shifted})`);
              if (quality === 'VALID') quality = 'SUSPICIOUS';
            }
          }

          const labItem = {
            id: `LR-${reportIdPrefix(extractionMethod)}-${idCounter++}`,
            section: currentSection,
            rawName: rawName,
            normalizedName: normalizedName,
            testName: rawName,
            value: numVal,
            originalValue: numVal,
            unit: unit,
            units: unit,
            referenceRange: parseReferenceRangeStruct(match[4] || ''),
            status: status,
            quality: quality,
            validationFlags: validationFlags,
            source: { page: 1, text: lineText },
            sourceLocation: null,
            extractionMethod: extractionMethod,
            confidence: null,
            validatedByUser: false
          };

          results.push(labItem);
          detectedRows.push(labItem);
        }
      }
    }
  }

  // Synchronize demographic age and lab parameters
  if (patientDemographics.age !== null) {
    const hasAgeLab = results.some(r => r.normalizedName === 'age' || /^age\b/i.test(r.testName || '') || /^age\b/i.test(r.rawName || ''));
    if (!hasAgeLab) {
      results.unshift({
        id: `LR-DEMO-AGE`,
        testName: 'Age',
        rawName: `Age ${patientDemographics.age}`,
        normalizedName: 'age',
        value: patientDemographics.age,
        unit: 'years',
        units: 'years',
        referenceRange: '18-120',
        status: 'NORMAL',
        quality: 'VALID',
        source: { page: 1, text: `Demographics Age: ${patientDemographics.age}` },
        extractionMethod: extractionMethod,
        confidence: 100,
        validatedByUser: true
      });
    }
  } else {
    // If results contains an age lab item, synchronize it into patientDemographics.age
    const ageLab = results.find(r => r.normalizedName === 'age' || /^age\b/i.test(r.testName || '') || /^age\b/i.test(r.rawName || ''));
    if (ageLab && ageLab.value) {
      const aNum = parseInt(ageLab.value, 10);
      if (!isNaN(aNum) && aNum >= 1 && aNum <= 120) {
        patientDemographics.age = aNum;
      }
    }
  }

  return {
    results,
    patientDemographics,
    detectedTables,
    detectedRows,
    ocrWords,
    discardedCandidates
  };
}

function reportIdPrefix(method) {
  return method === 'PDF_PARSE' ? 'PDF' : (method === 'TESSERACT_OCR' || method === 'SCANNED_PDF_OCR') ? 'OCR' : 'GEN';
}

module.exports = {
  NORMALIZATION_MAP,
  VALID_UNITS,
  extractTextFromFile,
  parseLabValuesFromText,
  normalizeLabName,
  parseTSVWords,
  groupWordsIntoLines,
  extractDemographicsFromText
};
