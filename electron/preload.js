const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('downloader', {
  ensureBinaries: () => ipcRenderer.invoke('downloader:ensureBinaries'),
  pickFolder: () => ipcRenderer.invoke('downloader:pickFolder'),
  startDownload: (options) => ipcRenderer.invoke('downloader:start', options),
  getConfig: () => ipcRenderer.invoke('downloader:getConfig'),
  onProgress: (callback) => {
    ipcRenderer.on('downloader:progress', (_event, data) => callback(data));
  },
  onFinished: (callback) => {
    ipcRenderer.on('downloader:finished', (_event, result) => callback(result));
  },
});


