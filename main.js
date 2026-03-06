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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

  const response = await axios.post(endpoint, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 120000
  });

  const candidates = response.data?.candidates;
  const text = candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
});
