const path = require('path');
const { spawn } = require('child_process');

// Translation credentials — loaded from environment, never hardcoded.
// MYMEMORY_EMAIL: optional MyMemory translator contact email (higher rate limit).
// TRANSLATION_PROVIDER: 'mymemory' | 'none' (fallback to dictionary only).
const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'mymemory';
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || null;

function executePythonScript(scriptName, payload) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const inputArg = JSON.stringify(payload);

    const child = spawn('python', [scriptPath, inputArg], {
      cwd: path.join(__dirname, '..')
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf8');
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        console.error(`[PythonExecutor] Error in ${scriptName}:`, stderrData);
        return reject(new Error(stderrData || `Python script exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        console.error(`[PythonExecutor] JSON parse failure from ${scriptName}:`, stdoutData);
        reject(new Error(`Failed to parse output from ${scriptName}: ${err.message}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Processes multilingual clinical text (Kannada, Hindi, English, Tamil, Telugu, etc.)
 */
async function processMultilingualText(text, preferredLanguage = null) {
  if (!text || !text.trim()) {
    return {
      original_text: '',
      detected_language: 'en',
      detected_language_name: 'English',
      normalized_language: 'en',
      normalized_text: '',
      symptoms: [],
      active_symptoms: [],
      negated_symptoms: [],
      historical_symptoms: [],
      medications: [],
      temporal_context: { duration_days: null, has_duration: false, is_historical: false },
      ambiguities: [],
      needs_user_confirmation: false
    };
  }

  return await executePythonScript('multilingualNlp.py', {
    text,
    preferred_language: preferredLanguage,
    translation_provider: TRANSLATION_PROVIDER,
    mymemory_email: MYMEMORY_EMAIL
  });
}

/**
 * Translates text between supported languages
 */
async function translateText(text, sourceLang = 'auto', targetLang = 'en') {
  if (!text || !text.trim() || sourceLang === targetLang) {
    return {
      success: true,
      original_text: text,
      translated_text: text,
      source_lang: sourceLang,
      target_lang: targetLang
    };
  }

  return await executePythonScript('multilingualNlp.py', {
    action: 'translate',
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    translation_provider: TRANSLATION_PROVIDER,
    mymemory_email: MYMEMORY_EMAIL
  });
}

/**
 * Transcribes audio file into text using speechService.py
 */
async function transcribeAudio(audioPath, language = 'auto') {
  return await executePythonScript('speechService.py', {
    audio_path: audioPath,
    language
  });
}

/**
 * Synthesizes multilingual speech response using ttsService.py
 */
async function synthesizeSpeech(text, language = 'en') {
  return await executePythonScript('ttsService.py', {
    text,
    language
  });
}

module.exports = {
  processMultilingualText,
  translateText,
  transcribeAudio,
  synthesizeSpeech
};
