const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const sharp = require('sharp');

/**
 * Preprocesses an image for better OCR quality.
 * Pipeline:
 * - Auto-rotate from EXIF
 * - Grayscale
 * - Contrast normalize
 * - Median denoise
 * - Adaptive-ish threshold with linear sharpen + binary threshold
 * - Resize up to improve tiny text
 */
async function preprocessImage(imagePath) {
  const sourceBuffer = await fs.readFile(imagePath);
  const metadata = await sharp(sourceBuffer).metadata();

  let pipeline = sharp(sourceBuffer, { failOn: 'none' })
    .rotate() // auto orientation from metadata
    .grayscale()
    .normalise()
    .median(1)
    .sharpen({ sigma: 1.2, m1: 0.8, m2: 1.1, x1: 2, y2: 10, y3: 20 })
    .threshold(140, { grayscale: true });

  // Upscale small images to help with tiny text.
  if ((metadata.width || 0) < 1400) {
    pipeline = pipeline.resize({ width: 1800, fit: 'inside', withoutEnlargement: false });
  }

  const outputBuffer = await pipeline.png({ quality: 100, compressionLevel: 9 }).toBuffer();

  const tempName = `${path.basename(imagePath, path.extname(imagePath))}-${crypto.randomUUID()}.png`;
  const previewPath = path.join(os.tmpdir(), tempName);
  await fs.writeFile(previewPath, outputBuffer);

  return {
    ocrBuffer: outputBuffer,
    previewPath,
    originalFormat: metadata.format,
    width: metadata.width,
    height: metadata.height
  };
}

module.exports = {
  preprocessImage
};
