# AI OCR Scanner (Electron + Gemini Vision)

Desktop OCR application for Windows built with **ElectronJS** that extracts text from images using the **Google Gemini Vision API**.

## Features

- Drag & drop image upload
- File picker upload
- Supported image formats: `JPG`, `JPEG`, `PNG`, `WEBP`, `BMP`
- Image preview before OCR
- OCR using Gemini API with model fallback (`gemini-1.5-flash-latest`, `gemini-1.5-flash`, `gemini-2.0-flash`)
- Loading indicator during extraction
- Copy extracted text to clipboard
- Save extracted text to `.txt`
- Windows installer build (`.exe`) using `electron-builder`

## Project Structure

```txt
ai-ocr-app/
├── package.json
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── styles.css
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 18+ (recommended: Node.js 20 LTS)
- npm
- A Google AI Studio API key with Gemini access

## 1) Install dependencies

```bash
npm install
```

## 2) Configure Gemini API key

1. Get your key from Google AI Studio.
2. Create a `.env` file in the project root.
3. Add your API key:

```env
GEMINI_API_KEY=your_api_key_here
# Optional: force a specific model
GEMINI_MODEL=gemini-1.5-flash-latest
```

You can copy from the template:

```bash
cp .env.example .env
```

## 3) Run the app (development)

```bash
npm start
```

## 4) Build Windows installer (.exe)

```bash
npm run build
```

Build output is generated in the default `dist/` folder by `electron-builder`.

---

## How OCR works in this app

When you click **Extract Text**:

1. App reads the image from disk (`fs.readFileSync`)
2. Converts image bytes to Base64
3. Detects MIME type from extension
4. Sends request to Gemini REST endpoint:

```txt
https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
(default model fallback order: gemini-1.5-flash-latest -> gemini-1.5-flash -> gemini-2.0-flash)
```

5. Uses prompt:

```txt
Extract all visible text from this image
```

6. Receives text response and renders it in the text box

---

## Gemini request format used

The app sends this shape (simplified):

```json
{
  "contents": [
    {
      "parts": [
        { "text": "Extract all visible text from this image" },
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "<base64_image_data>"
          }
        }
      ]
    }
  ]
}
```

---

## Usage guide

1. Open app.
2. Drag and drop an image into the drop area **or** click **Select Image**.
3. Confirm preview appears.
4. Click **Extract Text**.
5. Wait for processing spinner to finish.
6. Review OCR output in the text area.
7. Use:
   - **Copy to Clipboard** to copy text
   - **Save as .txt** to export result

---

## Troubleshooting

### `Missing GEMINI_API_KEY environment variable`
- Ensure `.env` exists at project root.
- Ensure key is defined as `GEMINI_API_KEY=...`.
- Restart app after changing environment values.

### `Unsupported image format`
- Use supported formats only: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`.

### Empty OCR response
- Try a clearer image (better light, less blur, higher resolution).
- Check API key validity and quota.


### `404 model not found` when extracting text
- This app automatically retries multiple Gemini model names.
- Optionally force a working model in `.env`:
  ```env
  GEMINI_MODEL=gemini-1.5-flash-latest
  ```
- If your account/region does not expose a model, use another available Gemini model.

### `429 quota/rate limit` when extracting text
- Your API key/project has no remaining quota for the selected model.
- Wait the suggested retry window, then try again.
- In Google AI Studio / Google Cloud, verify billing and quota limits.
- Optionally set a different model in `.env`:
  ```env
  GEMINI_MODEL=gemini-1.5-flash-latest
  ```

### Build issues on Windows
- Install latest Node.js LTS.
- Clean install dependencies:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

## Security note

- Keep `.env` out of version control.
- Never hardcode or share your real API key in source files.
