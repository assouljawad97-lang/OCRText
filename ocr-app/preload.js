const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ocrApi', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  processOCR: (payload) => ipcRenderer.invoke('ocr:process', payload),
  getPreferredLanguages: () => ipcRenderer.invoke('prefs:getLanguages'),
  saveTextResult: (payload) => ipcRenderer.invoke('dialog:saveText', payload)
});
