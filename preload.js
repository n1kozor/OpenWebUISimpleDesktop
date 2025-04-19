const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    windowControls: {
        close: () => ipcRenderer.send('win-close'),
        minimize: () => ipcRenderer.send('win-min'),
        maximize: () => ipcRenderer.send('win-max'),
    },
    getConfig: () => ipcRenderer.invoke('get-config'),
    onOpenChat: (callback) => ipcRenderer.on('open-chat', (event, url) => callback(url)),
    onReloadApp: (cb) => ipcRenderer.on('reload-app', cb),
    saveConfig: (config) => ipcRenderer.send('save-config', config),
    onConfigSaved: (cb) => ipcRenderer.on('config-saved', cb),
    onConfigSaveError: (cb) => ipcRenderer.on('config-save-error', (event, err) => cb(err)),
    onStartChatWithModel: (cb) => ipcRenderer.on('start-chat-with-model', (event, modelName) => cb(modelName)),
    scanOpenwebui: () => ipcRenderer.invoke('scan-openwebui')


});