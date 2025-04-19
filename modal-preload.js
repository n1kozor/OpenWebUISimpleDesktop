const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modalAPI', {
    getModels: () => ipcRenderer.invoke('modal-get-models'),
    startChat: (modelName, initialMessage) => ipcRenderer.invoke('modal-start-chat', modelName, initialMessage),
    openChat: (chatId) => ipcRenderer.send('modal-open-chat', chatId),
    close: () => ipcRenderer.send('modal-close')
});
