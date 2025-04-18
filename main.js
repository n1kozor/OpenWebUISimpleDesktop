// Disable GPU for stability (esp. on Windows)
const { app, BrowserWindow, ipcMain } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
// Allow self-signed/invalid certificates (for local dev)
app.commandLine.appendSwitch('ignore-certificate-errors');

const path = require('path');
const fs = require('fs');

// Always use the executable's directory for config.json
const isPackaged = app.isPackaged;
const appDir = isPackaged ? path.dirname(process.execPath) : __dirname;
const configPath = path.join(appDir, 'config.json');

function getIconPath(cfg) {
    return process.platform === "darwin"
        ? path.join(__dirname, cfg?.iconDarwin ?? "assets/icons.icns")
        : path.join(__dirname, cfg?.iconWin ?? "assets/ico.ico");
}

function readConfig() {
    try {
        const c = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log("Config loaded:", c);
        return c;
    } catch(e) {
        console.log("No config found at", configPath);
        return null;
    }
}

function createMainWindow() {
    let config = readConfig();
    const win = new BrowserWindow({
        width: config?.window?.width ?? 1200,
        height: config?.window?.height ?? 800,
        minWidth: config?.window?.minWidth ?? 500,
        minHeight: config?.window?.minHeight ?? 400,
        frame: false,
        backgroundColor: config?.bgColor ?? "#fff",
        roundedCorners: true,
        hasShadow: true,
        resizable: true,
        icon: getIconPath(config ?? {}),
        title: config?.appName ?? "OpenwebuiSimpleDesktop",
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            webviewTag: true
        }
    });
    win.loadFile('index.html');

    // Window controls IPC
    ipcMain.on('win-close', () => win.close());
    ipcMain.on('win-min', () => win.minimize());
    ipcMain.on('win-max', () => win.isMaximized() ? win.unmaximize() : win.maximize());

    // Save config from wizard
    ipcMain.on('save-config', (event, userConfig) => {
        console.log('IPC save-config received. User config:', userConfig);
        console.log('Saving config to:', configPath);
        try {
            const defaultConfig = {
                iconDarwin: "assets/icons.icns",
                iconWin: "assets/ico.ico",
                bgColor: "#fff",
                borderRadius: 0,
                profileNavOffset: 15,
                sidebarOffset: 15,
                windowButtons: "right",
                window: {
                    width: 1200,
                    height: 800,
                    minWidth: 500,
                    minHeight: 400
                }
            };
            const mergedWindow = Object.assign({}, defaultConfig.window, userConfig.window || {});
            const finalConfig = Object.assign({}, defaultConfig, userConfig, { window: mergedWindow });
            fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), 'utf8');
            console.log("Config saved OK");
            event.reply('config-saved');
            win.webContents.send('reload-app');
        } catch(e) {
            console.error("FAILED TO SAVE config.json! Error:", e);
            event.reply('config-save-error', {msg: e.message});
            win.webContents.send('reload-app'); // Try again (wizard will reload)
        }
    });

    // Handle config read from renderer (IPC)
    ipcMain.handle('get-config', () => {
        try {
            return readConfig();
        } catch (e) {
            return null;
        }
    });

    // Debug: log all IPC errors globally (optional)
    ipcMain.on('error', (e) => {
        console.error("IPC Error:", e);
    });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});