const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable GPU for stability (esp. on Windows)
app.commandLine.appendSwitch('disable-gpu');
// Allow self-signed/invalid certificates (for local dev)
app.commandLine.appendSwitch('ignore-certificate-errors');

// Load config
const configPath = path.join(__dirname, 'config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error('ERROR: config.json not found or invalid:', e);
    process.exit(1);
}

// Icon path by OS
const iconPath = process.platform === "darwin"
    ? path.join(__dirname, config.iconDarwin)
    : path.join(__dirname, config.iconWin);

// Create the main application window
function createMainWindow() {
    const win = new BrowserWindow({
        width: config.window.width,
        height: config.window.height,
        minWidth: config.window.minWidth,
        minHeight: config.window.minHeight,
        frame: false,
        backgroundColor: config.bgColor,
        roundedCorners: true,
        hasShadow: true,
        resizable: true,
        icon: iconPath,
        title: config.appName,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');

    // Window control IPC handlers
    ipcMain.on('win-close', () => win.close());
    ipcMain.on('win-min', () => win.minimize());
    ipcMain.on('win-max', () => win.isMaximized() ? win.unmaximize() : win.maximize());
}

// Expose config to preload/renderer (if needed)
module.exports = config;

app.setName(config.appName);
app.whenReady().then(createMainWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });