'use strict';

/**
 * MediAgent — Laboratory Report Image Preprocessing
 *
 * Sharp-based preprocessing pipeline for laboratory report images prior to
 * OCR. Records all preprocessing steps as provenance metadata so downstream
 * consumers can reason about image quality.
 *
 * DESIGN PRINCIPLES (per Enhancement E3 Section 5-6):
 * - No OpenCV dependency; sharp is already a project dependency.
 * - Operations are orientation-preserving (no content-destroying transforms).
 * - Every applied step is recorded; the metadata is returned alongside the
 *   processed buffer for OCR provenance.
 * - All transformations are deterministic given the same input.
 */

const sharp = require('sharp');

const PREPROCESSING_VERSION = '1.0.0-e3';

/**
 * Supported input formats for preprocessing.
 */
const SUPPORTED_INPUT_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'tif', 'bmp'];

/**
 * Default preprocessing profile: grayscale → normalize contrast → light sharpen.
 * These preserve document content while improving OCR legibility for typical
 * lab reports (black text on white/off-white paper).
 */
const DEFAULT_PROFILE = {
  grayscale: true,
  normalize: true,
  sharpen: true, // sigma 1, flat 1, jagged 2 (mild)
  rotate: null, // null = no forced rotation; orientation from EXIF only
  flatten: true, // remove alpha / transparency
  density: null // no forced resizing (preserve original resolution)
};

/**
 * Run the preprocessing pipeline on an image buffer.
 *
 * @param {Buffer} inputBuffer - original image buffer
 * @param {Object} options - optional overrides for DEFAULT_PROFILE
 * @returns {Promise<{
 *   processedBuffer: Buffer,
 *   format: string,
 *   width: number,
 *   height: number,
 *   size: number,
 *   steps: string[],
 *   metadata: Object
 * }>}
 */
async function preprocessImage(inputBuffer, options = {}) {
  const profile = { ...DEFAULT_PROFILE, ...options };
  const steps = [];

  let pipeline = sharp(inputBuffer, { failOnError: false });

  // Read original metadata first (before transforms) for provenance
  const originalMeta = await pipeline.metadata();

  // 1. EXIF orientation (apply only, do not rotate content arbitrarily)
  // sharp auto-rotates based on EXIF orientation by default; we keep this
  // so scanned pages that were captured sideways are upright for OCR.
  pipeline = pipeline.rotate();
  if (originalMeta.orientation) {
    steps.push(`exif-orientation:${originalMeta.orientation}`);
  } else {
    steps.push('exif-orientation:none');
  }

  // 2. Flatten transparency / remove alpha channel
  if (profile.flatten) {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    steps.push('flatten:white-background');
  }

  // 3. Grayscale conversion — reduces color noise in scanned documents
  if (profile.grayscale) {
    pipeline = pipeline.grayscale();
    steps.push('grayscale:luma');
  }

  // 4. Normalize contrast — stretches histogram to full range
  if (profile.normalize) {
    pipeline = pipeline.normalize();
    steps.push('normalize:histogram-stretch');
  }

  // 5. Mild sharpen — improves text edge contrast without inventing detail
  if (profile.sharpen) {
    pipeline = pipeline.sharpen({ sigma: 1, flat: 1, jagged: 2 });
    steps.push('sharpen:sigma1-flat1-jagged2');
  }

  // 6. Preserve original resolution; do NOT upscale (avoids inventing detail)
  // No resize step unless explicitly requested.

  const processedBuffer = await pipeline.toBuffer();
  const processedMeta = await sharp(processedBuffer).metadata();

  return {
    processedBuffer,
    format: processedMeta.format || 'unknown',
    width: processedMeta.width || 0,
    height: processedMeta.height || 0,
    size: processedBuffer.length,
    steps,
    metadata: {
      preprocessingVersion: PREPROCESSING_VERSION,
      originalFormat: originalMeta.format,
      originalWidth: originalMeta.width,
      originalHeight: originalMeta.height,
      originalSize: inputBuffer.length,
      orientation: originalMeta.orientation || null,
      density: originalMeta.density || null,
      appliedSteps: steps,
      profile
    }
  };
}

/**
 * Validate that a file is an image format we can preprocess.
 */
function isSupportedImageFormat(mimeType, extension) {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  const mime = (mimeType || '').toLowerCase();
  return SUPPORTED_INPUT_FORMATS.includes(ext) ||
    mime.includes('image/') ||
    mime.includes('tiff');
}

module.exports = {
  preprocessImage,
  isSupportedImageFormat,
  PREPROCESSING_VERSION,
  DEFAULT_PROFILE,
  SUPPORTED_INPUT_FORMATS
};
