const path = require('path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');

const { runOCR, analyzeDocumentType } = require('./ocr/ocrService');

let store;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'OCR Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  const { default: Store } = await import('electron-store');
  store = new Store({
    name: 'ocr-app-preferences',
    defaults: {
      lastUsedLanguages: ['eng']
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Supported Images',
        extensions: ['png', 'jpg', 'jpeg', 'bmp', 'heic', 'heif']
      }
    ]
  });

  if (canceled) return [];
  return filePaths;
});

ipcMain.handle('ocr:process', async (_, payload) => {
  const { imagePaths, languages } = payload;

  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('No images provided for OCR.');
  }

  if (store && Array.isArray(languages) && languages.length > 0) {
    store.set('lastUsedLanguages', languages);
  }

  const results = [];
  for (const imagePath of imagePaths) {
    const fallbackLanguages = store ? store.get('lastUsedLanguages') : ['eng'];
    const result = await runOCR(imagePath, languages || fallbackLanguages);
    const documentType = analyzeDocumentType(result.text);
    results.push({
      ...result,
      documentType
    });
  }

  return results;
});

ipcMain.handle('prefs:getLanguages', async () => {
  return store ? store.get('lastUsedLanguages') : ['eng'];
});

ipcMain.handle('dialog:saveText', async (_, payload) => {
  const { defaultName, content } = payload;
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save OCR Result',
    defaultPath: defaultName,
    filters: [{ name: 'Text File', extensions: ['txt'] }]
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  const fs = require('fs/promises');
  await fs.writeFile(filePath, content, 'utf-8');
  return { saved: true, filePath };
});
