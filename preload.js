const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    windowControls: {
        close: ()    => ipcRenderer.send('win-close'),
        minimize: () => ipcRenderer.send('win-min'),
        maximize: () => ipcRenderer.send('win-max')
    },
    saveConfig: (config) => ipcRenderer.send('save-config', config),
    onConfigSaved: (cb) => ipcRenderer.on('config-saved', cb),
    onConfigSaveError: (cb) => ipcRenderer.on('config-save-error', (event, err) => cb(err)),
    onReloadApp: (cb) => ipcRenderer.on('reload-app', cb),
    getConfig: () => ipcRenderer.invoke('get-config'),
});