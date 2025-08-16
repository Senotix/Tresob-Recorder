const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  chooseSaveLocation: (defaultName) => ipcRenderer.invoke('choose-save-location', defaultName),
  saveVideoFile: (arrayBuffer, filePath) => ipcRenderer.invoke('save-video-file', arrayBuffer, filePath),
  platform: process.platform
});