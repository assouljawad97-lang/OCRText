const path = require('path');
const { createWorker } = require('tesseract.js');

const { preprocessImage } = require('../utils/imagePreprocess');
const { classifyDocument } = require('../utils/documentClassifier');

async function runOCR(imagePath, selectedLanguages = ['eng']) {
  const worker = await createWorker();
  const langString = Array.isArray(selectedLanguages) && selectedLanguages.length
    ? selectedLanguages.join('+')
    : 'eng';

  try {
    await worker.loadLanguage(langString);
    await worker.initialize(langString);

    // Improves OCR for mixed-quality mobile photos.
    await worker.setParameters({
      tessedit_pageseg_mode: '1',
      preserve_interword_spaces: '1'
    });

    const preprocessed = await preprocessImage(imagePath);

    let orientation = 0;
    try {
      const detection = await worker.detect(preprocessed.ocrBuffer);
      orientation = detection?.data?.orientation?.angle || 0;
    } catch {
      // Orientation detection can fail for very small/noisy images.
      orientation = 0;
    }

    const {
      data: { text, confidence, lines }
    } = await worker.recognize(preprocessed.ocrBuffer);

    return {
      imagePath,
      previewPath: preprocessed.previewPath || imagePath,
      text: text?.trim() || '',
      confidence,
      orientation,
      lines: (lines || []).map((line) => ({
        text: line.text,
        bbox: line.bbox
      })),
      metadata: {
        originalFormat: preprocessed.originalFormat,
        width: preprocessed.width,
        height: preprocessed.height
      }
    };
  } finally {
    await worker.terminate();
  }
}

function analyzeDocumentType(text) {
  return classifyDocument(text);
}

module.exports = {
  runOCR,
  analyzeDocumentType
};
