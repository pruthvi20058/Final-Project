const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');

const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
const mlDir = path.join(__dirname, '..', 'ml');
const commonDir = path.join(mlDir, 'common');
const datasetsUploadDir = path.join(__dirname, '..', 'uploads', 'datasets');

if (!fs.existsSync(datasetsUploadDir)) {
  fs.mkdirSync(datasetsUploadDir, { recursive: true });
}

// Multer Storage Configuration for Datasets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, datasetsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `dataset-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls', '.json', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported dataset format '${ext}'. Allowed: CSV, XLSX, JSON, and ZIP (for image archives).`), false);
  }
};

const uploadDataset = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for image archives
});

// Helper to run a Python script and parse JSON output
function runPythonJson(scriptPath, args = [], inputData = null, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCmd, [scriptPath, ...args], {
      cwd: path.join(__dirname, '..', '..')
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { child.kill(); } catch {}
        reject(new Error(`Python process timed out after ${timeoutMs}ms: ${scriptPath}`));
      }
    }, timeoutMs);

    if (inputData) {
      child.stdin.write(typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
      child.stdin.end();
    }

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;

      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(`Python script failed (code ${code}): ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        // Fallback: try finding first JSON object in stdout
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return resolve(JSON.parse(jsonMatch[0]));
          } catch {}
        }
        reject(new Error(`Failed to parse Python JSON output: ${stdout || stderr}`));
      }
    });
  });
}

// 1. POST /api/ml/datasets/upload — Upload and automatically inspect dataset
router.post('/datasets/upload', (req, res) => {
  uploadDataset.single('dataset')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No dataset file provided in request.' });
    }

    const disease = (req.body.disease || '').toLowerCase().trim();
    const filePath = req.file.path;
    const inspectorScript = path.join(commonDir, 'dataset_inspector.py');

    try {
      const args = [filePath];
      if (disease) {
        args.push('--disease', disease);
      }

      const inspection = await runPythonJson(inspectorScript, args);

      return res.json({
        success: true,
        filePath,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        fileSize: req.file.size,
        disease,
        inspection
      });
    } catch (inspectErr) {
      return res.status(500).json({
        success: false,
        error: `Dataset inspection failed: ${inspectErr.message}`,
        filePath
      });
    }
  });
});

// 2. POST /api/ml/datasets/inspect — Inspect an existing or sample dataset
router.post('/datasets/inspect', async (req, res) => {
  try {
    const { filePath, disease } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath parameter is required.' });
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', '..', filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: `File not found at: ${filePath}` });
    }

    const inspectorScript = path.join(commonDir, 'dataset_inspector.py');
    const args = [fullPath];
    if (disease) {
      args.push('--disease', disease.toLowerCase().trim());
    }

    const inspection = await runPythonJson(inspectorScript, args);
    return res.json({ success: true, filePath: fullPath, inspection });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/ml/datasets/samples — List bundled reference datasets for each disease
router.get('/datasets/samples', (req, res) => {
  try {
    const dataDir = path.join(mlDir, 'data');
    const samples = [
      {
        disease: 'diabetes',
        diseaseName: 'Type 2 Diabetes Mellitus',
        fileName: 'pima_diabetes.csv',
        filePath: 'server/ml/data/pima_diabetes.csv',
        targetColumn: 'outcome',
        description: 'Pima Indians Diabetes Dataset (768 patient observations, 8 numerical features)'
      },
      {
        disease: 'dengue',
        diseaseName: 'Dengue Fever Infection',
        fileName: 'dengue_clinical.csv',
        filePath: 'server/ml/data/dengue_clinical.csv',
        targetColumn: 'Outcome',
        description: 'Dengue Clinical Hematology & Serology Cohort (1000 patients, 14 features)'
      },
      {
        disease: 'malaria',
        diseaseName: 'Malaria Clinical Severity',
        fileName: 'malaria_clinical.csv',
        filePath: 'server/ml/data/malaria_clinical.csv',
        targetColumn: 'severe_maleria',
        description: 'Clinical Malaria Emergency Severity Cohort (337 patients, 17 features)'
      },
      {
        disease: 'chikungunya',
        diseaseName: 'Chikungunya Arboviral Disease',
        fileName: 'chikungunya_clinical.csv',
        filePath: 'server/ml/data/chikungunya_clinical.csv',
        targetColumn: 'target',
        description: 'Brazil Ministry of Health SINAN Arboviral Cohort (10000 records, 12 features)'
      },
      {
        disease: 'typhoid',
        diseaseName: 'Typhoid Enteric Fever',
        fileName: 'typhoid_clinical.csv',
        filePath: 'server/ml/data/typhoid_clinical.csv',
        targetColumn: 'typhoid_diagnosis',
        description: 'TyphoDx-BD Clinical Enteric Fever Cohort (600 patients, 14 features)'
      }
    ];

    const available = samples.map(s => ({
      ...s,
      exists: fs.existsSync(path.join(__dirname, '..', '..', s.filePath))
    }));

    return res.json({ success: true, samples: available });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/ml/train — Validate dataset and train a disease-specific model
router.post('/train', async (req, res) => {
  try {
    const { disease, datasetPath, targetColumn, featureColumns, algorithm } = req.body;

    if (!disease) {
      return res.status(400).json({ success: false, error: 'disease parameter is required (diabetes, dengue, malaria, chikungunya, typhoid).' });
    }

    const diseaseKey = disease.toLowerCase().trim();
    const validDiseases = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];
    if (!validDiseases.includes(diseaseKey)) {
      return res.status(400).json({
        success: false,
        error: `Unknown disease '${disease}'. Supported diseases: ${validDiseases.join(', ')}.`
      });
    }

    let fullDataPath = datasetPath;
    if (!fullDataPath) {
      // Default to bundled sample dataset
      const sampleMap = {
        diabetes: 'server/ml/data/pima_diabetes.csv',
        dengue: 'server/ml/data/dengue_clinical.csv',
        malaria: 'server/ml/data/malaria_clinical.csv',
        chikungunya: 'server/ml/data/chikungunya_clinical.csv',
        typhoid: 'server/ml/data/typhoid_clinical.csv'
      };
      fullDataPath = path.join(__dirname, '..', '..', sampleMap[diseaseKey]);
    } else if (!path.isAbsolute(fullDataPath)) {
      fullDataPath = path.join(__dirname, '..', '..', fullDataPath);
    }

    if (!fs.existsSync(fullDataPath)) {
      return res.status(404).json({ success: false, error: `Dataset file not found at: ${fullDataPath}` });
    }

    // Step 1: Pre-training Validation
    const validatorScript = path.join(commonDir, 'dataset_validator.py');
    const validatorArgs = [
      fullDataPath,
      targetColumn || 'target',
      JSON.stringify(featureColumns || []),
      '--disease', diseaseKey
    ];

    try {
      const valResult = await runPythonJson(validatorScript, validatorArgs);
      if (!valResult.is_valid) {
        return res.status(400).json({
          success: false,
          error: 'Dataset failed clinical validation checks.',
          validation: valResult
        });
      }
    } catch (valErr) {
      console.warn('[ML Route] Validator notice:', valErr.message);
    }

    // Step 2: Invoke Disease-Specific Trainer
    const trainerScript = path.join(mlDir, 'diseases', diseaseKey, 'train.py');
    if (!fs.existsSync(trainerScript)) {
      return res.status(500).json({ success: false, error: `Trainer script for ${diseaseKey} not found at: ${trainerScript}` });
    }

    const trainArgs = [fullDataPath];
    const trainResult = await runPythonJson(trainerScript, trainArgs, null, 120000); // 2 min timeout for image training

    return res.json({
      success: true,
      disease: diseaseKey,
      ...trainResult
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: `Model training failed: ${err.message}` });
  }
});

// 5. GET /api/ml/models — Retrieve Model Registry for all diseases
router.get('/models', async (req, res) => {
  try {
    const registryScript = path.join(commonDir, 'model_registry.py');
    const registry = await runPythonJson(registryScript, []);
    return res.json({ success: true, models: registry });
  } catch (err) {
    // Fallback: direct JSON read
    const regPath = path.join(mlDir, 'models', 'model_registry.json');
    if (fs.existsSync(regPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(regPath, 'utf8'));
        return res.json({ success: true, models: raw });
      } catch {}
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /api/ml/models/:disease — Retrieve specific disease model metadata and feature schema
router.get('/models/:disease', async (req, res) => {
  try {
    const diseaseKey = req.params.disease.toLowerCase().trim();
    const registryScript = path.join(commonDir, 'model_registry.py');
    const modelInfo = await runPythonJson(registryScript, [diseaseKey]);

    // Also attach the full canonical feature schema if present
    const schemaPath = path.join(mlDir, 'diseases', diseaseKey, 'feature_schema.json');
    let featureSchema = null;
    if (fs.existsSync(schemaPath)) {
      try {
        featureSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      } catch {}
    }

    return res.json({ success: true, disease: diseaseKey, model: modelInfo, featureSchema });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/ml/predict/:disease — Execute prediction on disease-specific model
router.post('/predict/:disease', async (req, res) => {
  try {
    const diseaseKey = req.params.disease.toLowerCase().trim();
    const predictorScript = path.join(commonDir, 'prediction_interface.py');

    const payload = {
      disease: diseaseKey,
      features: req.body.features || req.body,
      image_path: req.body.image_path || null
    };

    const prediction = await runPythonJson(predictorScript, [], payload);
    return res.json({ success: true, ...prediction });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
