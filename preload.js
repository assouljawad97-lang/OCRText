const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  extractTextFromImage: (imagePath) => ipcRenderer.invoke('extract-text-from-image', imagePath),
  saveTextFile: (textContent) => ipcRenderer.invoke('save-text-file', textContent)
});
