const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API for window controls
contextBridge.exposeInMainWorld('electronAPI', {
    windowControls: {
        close: () => ipcRenderer.send('win-close'),
        minimize: () => ipcRenderer.send('win-min'),
        maximize: () => ipcRenderer.send('win-max')
    }
});