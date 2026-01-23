// main.js
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const crypto = require('crypto');
const {
    readConfig,
    saveConfig,
    getIconPath,
    apiFetch,
    scanNetworkForOpenWebUI
} = require('./utils');

let mainWindow = null;
let modalWindow = null;
let tray = null;
let isQuiting = false;

// Config flags
const config = readConfig();
// Default to true (append switch) if config is missing or property is missing/true
if (!config || config.disableGpu !== false) {
    app.commandLine.appendSwitch('disable-gpu');
}
if (!config || config.ignoreCertificateErrors !== false) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
}

function createMainWindow() {
    const config = readConfig();
    mainWindow = new BrowserWindow({
        width: config?.window?.width || 1200,
        height: config?.window?.height || 800,
        minWidth: config?.window?.minWidth || 500,
        minHeight: config?.window?.minHeight || 400,
        frame: false,
        backgroundColor: config?.bgColor || '#fff',
        roundedCorners: true,
        hasShadow: true,
        resizable: true,
        icon: getIconPath(config || {}),
        title: config?.appName || 'OpenwebuiSimpleDesktop',
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            webviewTag: true,
            partition: 'persist:openwebui'
        }
    });

    const opacity = config?.opacity;
    if (typeof opacity === 'number' && opacity >= 0 && opacity <= 1) {
        mainWindow.setOpacity(opacity);
    }

    mainWindow.loadFile('index.html');

    mainWindow.on('close', event => {
        if (!isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    ipcMain.on('win-close', () => mainWindow.close());
    ipcMain.on('win-min', () => mainWindow.minimize());
    ipcMain.on('win-max', () => {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
}

function createModalWindow() {
    if (modalWindow) {
        modalWindow.focus();
        return;
    }
    modalWindow = new BrowserWindow({
        width: 400,
        height: 330,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        backgroundColor: '#00000000',
        frame: false,
        show: false,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'modal-preload.js'),
            nodeIntegration: false
        }
    });
    modalWindow.loadFile('modal.html');
    modalWindow.once('ready-to-show', () => modalWindow.show());
    modalWindow.on('closed', () => { modalWindow = null; });
}

// only allow a single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // someone tried to run a second instance, we should focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createMainWindow();

        // tray
        const iconPath = getIconPath({});
        tray = new Tray(iconPath);
        const trayMenu = Menu.buildFromTemplate([
            {
                label: 'Show App',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            {
                label: 'Quit',
                click: () => {
                    isQuiting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('OpenwebuiSimpleDesktop');
        tray.setContextMenu(trayMenu);

        // global shortcut for modal
        globalShortcut.register('Control+Shift+Space', () => {
            createModalWindow();
        });
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('window-all-closed', e => {
        if (process.platform !== 'darwin') {
            e.preventDefault();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });

    // ======= IPC and API logic below =======

    ipcMain.handle('get-config', () => {
        try { return readConfig(); }
        catch { return null; }
    });

    ipcMain.on('save-config', (event, configData) => {
        try {
            saveConfig(configData);
            event.sender.send('config-saved');
        } catch (err) {
            event.sender.send('config-save-error', err.message);
        }
    });

    ipcMain.handle('modal-get-models', async () => {
        const cfg = readConfig();
        const data = await apiFetch(cfg, '/api/models');
        return data.data || [];
    });

    ipcMain.handle('modal-start-chat', async (event, modelName, initialMessageRaw) => {
        const cfg = readConfig();
        const now = Math.floor(Date.now() / 1000);
        const initialMessage = initialMessageRaw?.trim() || "Hi!";
        const userId = crypto.randomUUID();
        const assistantId = crypto.randomUUID();

        // create new chat
        const newChatResp = await apiFetch(cfg, '/api/v1/chats/new', {
            method: 'POST',
            body: JSON.stringify({
                chat: {
                    title: 'Chat from Modal',
                    models: [modelName],
                    params: {},
                    history: { messages: {}, currentId: "" },
                    messages: [],
                    tags: [],
                    timestamp: now
                }
            })
        });
        const chatId = newChatResp?.id;
        if (!chatId) throw new Error("❌ Could not create new chat");

        // get assistant response
        const completionResp = await apiFetch(cfg, '/api/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
                model: modelName,
                messages: [{
                    role: 'user',
                    content: initialMessage,
                    timestamp: now
                }]
            })
        });
        const assistantMessage = completionResp?.choices?.[0]?.message?.content;
        if (!assistantMessage) throw new Error("❌ Missing assistant response");

        // update chat with both messages
        await apiFetch(cfg, `/api/v1/chats/${chatId}`, {
            method: 'POST',
            body: JSON.stringify({
                chat: {
                    history: {
                        messages: {
                            [userId]: {
                                id: userId,
                                parentId: null,
                                childrenIds: [assistantId],
                                role: 'user',
                                content: initialMessage,
                                timestamp: now,
                                models: [modelName]
                            },
                            [assistantId]: {
                                id: assistantId,
                                parentId: userId,
                                childrenIds: [],
                                role: 'assistant',
                                content: assistantMessage,
                                model: modelName,
                                modelName: modelName,
                                modelIdx: 0,
                                userContext: null,
                                timestamp: now + 1,
                                done: true
                            }
                        },
                        currentId: assistantId
                    },
                    messages: [
                        {
                            id: userId,
                            parentId: null,
                            childrenIds: [assistantId],
                            role: 'user',
                            content: initialMessage,
                            timestamp: now,
                            models: [modelName]
                        },
                        {
                            id: assistantId,
                            parentId: userId,
                            childrenIds: [],
                            role: 'assistant',
                            content: assistantMessage,
                            model: modelName,
                            modelName: modelName,
                            modelIdx: 0,
                            userContext: null,
                            timestamp: now + 1,
                            done: true
                        }
                    ]
                }
            })
        });

        return chatId;
    });

    ipcMain.on('modal-open-chat', (event, chatId) => {
        if (!chatId) return;
        if (!mainWindow) {
            createMainWindow();
            mainWindow.once('ready-to-show', () => {
                openChatAndFocus(mainWindow, chatId);
            });
        } else {
            if (!mainWindow.isVisible()) mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            openChatAndFocus(mainWindow, chatId);
        }
        if (modalWindow) modalWindow.close();
    });

    ipcMain.on('modal-close', () => {
        if (modalWindow) modalWindow.close();
    });

    function openChatAndFocus(win, chatId) {
        const cfg = readConfig();
        const url = `${cfg.webuiUrl.replace(/\/$/, '')}/c/${chatId}`;
        win.webContents.send('open-chat', url);
        win.focus();
    }

    ipcMain.handle('scan-openwebui', async () => {
        return await scanNetworkForOpenWebUI();
    });
}
