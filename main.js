const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 760,
    minWidth: 860,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('open-image-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp']
      }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle('save-text-file', async (_, textContent) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Extracted Text',
    defaultPath: 'ocr-output.txt',
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(filePath, textContent || '', 'utf-8');
  return { canceled: false, filePath };
});

function parseGeminiText(responseData) {
  const candidates = responseData?.candidates;
  return candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function formatAxiosError(error, attemptedModels) {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error?.message;

  if (status === 404) {
    return `Gemini model endpoint not found (404). Tried models: ${attemptedModels.join(', ')}. ` +
      'Set GEMINI_MODEL in .env (example: GEMINI_MODEL=gemini-1.5-flash-latest or GEMINI_MODEL=gemini-2.0-flash).';
  }

  if (apiMessage) {
    return `Gemini API error (${status || 'unknown status'}): ${apiMessage}`;
  }

  if (error?.message) {
    return `Gemini request failed: ${error.message}`;
  }

  return 'Gemini request failed due to an unknown error.';
}

ipcMain.handle('extract-text-from-image', async (_, imagePath) => {
  if (!imagePath) {
    throw new Error('No image selected.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const extension = path.extname(imagePath).toLowerCase();
  const mimeTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };

  const mimeType = mimeTypeMap[extension];
  if (!mimeType) {
    throw new Error('Unsupported image format. Please use JPG, JPEG, PNG, WEBP, or BMP.');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const payload = {
    contents: [
      {
        parts: [
          {
            text: 'Extract all visible text from this image'
          },
          {
            inlineData: {
              mimeType,
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const fallbackModels = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const modelCandidates = configuredModel
    ? [configuredModel, ...fallbackModels.filter((model) => model !== configuredModel)]
    : fallbackModels;

  let lastError;

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });

      const text = parseGeminiText(response.data);
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      return text;
    } catch (error) {
      lastError = error;

      // Retry on model-not-found, otherwise fail fast.
      if (error?.response?.status !== 404) {
        break;
      }
    }
  }

  throw new Error(formatAxiosError(lastError, modelCandidates));
});
