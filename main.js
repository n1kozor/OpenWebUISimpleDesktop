const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const isPackaged = app.isPackaged;
const appDir = isPackaged ? path.dirname(process.execPath) : __dirname;
const configPath = path.join(appDir, 'config.json');

let mainWindow = null;
let modalWindow = null;
let tray = null;
let isQuiting = false;

app.commandLine.appendSwitch('disable-gpu');
// Allow self-signed/invalid certificates (for local dev)
app.commandLine.appendSwitch('ignore-certificate-errors');

function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return null;
    }
}

function getIconPath(cfg) {
    return process.platform === 'darwin'
        ? path.join(__dirname, cfg?.iconDarwin ?? 'assets/icons.icns')
        : path.join(__dirname, cfg?.iconWin ?? 'assets/ico.ico');
}

function createMainWindow() {
    let config = readConfig();
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
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
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
        height: 420,
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
    modalWindow.once('ready-to-show', () => {
        modalWindow.show();
    });
    modalWindow.on('closed', () => {
        modalWindow = null;
    });
}

app.whenReady().then(() => {
    createMainWindow();

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

    globalShortcut.register('Control+Shift+Space', () => {
        createModalWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {

    if (process.platform !== 'darwin') {

        e.preventDefault();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

async function apiFetch(cfg, endpoint, options = {}) {
    if (!cfg?.webuiUrl) throw new Error('No webuiUrl in config');
    let baseUrl = cfg.webuiUrl.replace(/^http:\/\/localhost/, 'http://127.0.0.1');
    const url = new URL(endpoint, baseUrl).href;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (cfg.apiToken) {
        headers['Authorization'] = `Bearer ${cfg.apiToken}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

ipcMain.handle('get-config', () => {
    try {
        return readConfig();
    } catch {
        return null;
    }
});

ipcMain.on('save-config', (event, configData) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        event.sender.send('config-saved');
    } catch (err) {
        console.error('Failed to save config:', err);
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

    const newChatResponse = await apiFetch(cfg, '/api/v1/chats/new', {
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

    const chatId = newChatResponse?.id;
    if (!chatId) throw new Error("❌ Could not create new chat");

    const completionResponse = await apiFetch(cfg, '/api/chat/completions', {
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

    const assistantMessage = completionResponse?.choices?.[0]?.message?.content;
    if (!assistantMessage) throw new Error("❌ Missing assistant response");

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
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        openChatAndFocus(mainWindow, chatId);
    }

    if (modalWindow) {
        modalWindow.close();
    }
});

function openChatAndFocus(win, chatId) {
    const cfg = readConfig();
    const url = `${cfg.webuiUrl.replace(/\/$/, '')}/c/${chatId}`;
    win.webContents.send('open-chat', url);
    win.focus();
}

ipcMain.on('modal-close', () => {
    if (modalWindow) modalWindow.close();
});