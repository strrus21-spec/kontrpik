const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kp', {
  loadData: () => ipcRenderer.sendSync('load-data'),
  refresh: (icons) => ipcRenderer.invoke('refresh', { icons }),
  resetData: () => ipcRenderer.invoke('reset-data'),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, msg) => cb(msg))
});
