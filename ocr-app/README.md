# OCR Desktop (Electron + Tesseract)

A complete Windows-focused desktop OCR application built with ElectronJS and Tesseract.js.

## Project Structure

```text
ocr-app/
  package.json
  main.js
  preload.js
  renderer.js
  index.html
  styles.css
  README.md
  assets/
  ocr/
    ocrService.js
  utils/
    imagePreprocess.js
    documentClassifier.js
```

## Features

- Modern Electron desktop UI
- Drag-and-drop + file picker for image input
- Supports JPG/JPEG/PNG/BMP and HEIC/HEIF (codec availability depends on platform build)
- OCR extraction with `tesseract.js`
- Multi-language OCR: English (`eng`), Spanish (`spa`), French (`fra`), Arabic (`ara`)
- Preprocessing pipeline for low-quality photos:
  - auto-rotation
  - grayscale conversion
  - contrast normalization
  - noise reduction (median)
  - sharpening
  - thresholding
  - smart upscaling for small images
- Heuristic document detection:
  - Passport
  - ID Card
  - Receipt
  - Printed Document
- Batch OCR (multiple images in one run)
- Copy result to clipboard
- Save output as `.txt`
- Non-blocking UI (OCR runs in Electron main process via IPC)

## Installation

1. Install Node.js 18+ (LTS recommended)
2. Install dependencies:

```bash
cd ocr-app
npm install
```

## Run the App

```bash
npm start
```

## Build Windows Installer (.exe)

From the `ocr-app` folder:

```bash
npm run dist
```

Installer output (NSIS `.exe`) will be generated under:

```text
ocr-app/dist/
```

## Notes

- First OCR run may take longer while language data is initialized.
- For HEIC support, ensure your runtime environment has compatible codec support.
- OCR confidence and document type are shown per image preview card.
