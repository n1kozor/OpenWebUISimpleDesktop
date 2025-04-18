const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');


// Ignore self-signed or invalid SSL certificates
app.commandLine.appendSwitch('ignore-certificate-errors');
// --- LOAD config.json ---
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

// --- Main window ---
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
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    });

    win.loadURL(
        'data:text/html;charset=UTF-8,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.appName}</title>
        <style>
          html, body {
            width: 100vw; height: 100vh;
            margin: 0; padding: 0; border: none;
            background: ${config.bgColor};
            font-family: Arial, sans-serif;
            color: #fff;
            overflow: hidden;
            user-select: none;
          }
          .webview-wrap {
            position: absolute;
            left: 0; top: 0; right: 0; bottom: 0;
            width: 100vw; height: 100vh;
            border-radius: ${config.borderRadius}px;
            background: ${config.bgColor};
            overflow: hidden;
          }
          webview {
            width: 100vw; height: 100vh;
            border: none;
            border-radius: ${config.borderRadius}px;
            background: ${config.bgColor};
            -webkit-app-region: no-drag;
          }
          .drag-overlay {
            position: absolute;
            left: 0; top: 0;
            width: 100vw;
            height: 15px;
            z-index: 150;
            -webkit-app-region: drag;
            background: transparent;
            pointer-events: auto;
          }
          .window-buttons {
            position: absolute;
            top: 10px;
            left: 10px;
            display: flex;
            gap: 10px;
            z-index: 200;
            background: none;
            -webkit-app-region: no-drag;
          }
          .window-btn {
            width: 12px; height: 12px;
            border-radius: 50%; border: none; outline: none;
            opacity: 0.88; cursor: pointer; transition: opacity 0.2s;
            box-shadow: none;
          }
          .window-btn:active { opacity: 1; }
          .btn-close { background: #f45c5c; }
          .btn-min { background: #fdbc40; }
          .btn-max { background: #37cd4c; }
        </style>
      </head>
      <body>
        <div class="webview-wrap">
          <webview id="webview" src="${config.webuiUrl}" allowpopups></webview>
        </div>
        <div class="drag-overlay"></div>
        <div class="window-buttons">
          <button class="window-btn btn-close" title="Close"></button>
          <button class="window-btn btn-min" title="Minimize"></button>
          <button class="window-btn btn-max" title="Maximize"></button>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          document.querySelector('.btn-close').onclick = () => ipcRenderer.send('win-close');
          document.querySelector('.btn-min').onclick = () => ipcRenderer.send('win-min');
          document.querySelector('.btn-max').onclick = () => ipcRenderer.send('win-max');
          const webview = document.getElementById('webview');
          webview.addEventListener('did-finish-load', function() {
            webview.executeJavaScript(\`
              let profileNavOffset = ${config.profileNavOffset};
              let sidebarOffset = ${config.sidebarOffset};
              var nav = document.querySelector('nav.sticky.top-0');
              if (nav && !nav.dataset.movedByElectron) {
                nav.style.marginTop = profileNavOffset + "px";
                nav.style.zIndex = "100";
                nav.dataset.movedByElectron = "1";
              }
              var sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');
              if (sidebar && !sidebar.dataset.movedByElectron) {
                sidebar.style.marginTop = sidebarOffset + "px";
                sidebar.style.height = "calc(100vh - " + sidebarOffset + "px)";
                sidebar.style.maxHeight = "calc(100dvh - " + sidebarOffset + "px)";
                sidebar.dataset.movedByElectron = "1";
              }
              var observer = new MutationObserver(function() {
                var nav = document.querySelector('nav.sticky.top-0');
                if (nav && !nav.dataset.movedByElectron) {
                  nav.style.marginTop = profileNavOffset + "px";
                  nav.style.zIndex = "20";
                  nav.dataset.movedByElectron = "1";
                }
                var sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');
                if (sidebar && !sidebar.dataset.movedByElectron) {
                  sidebar.style.marginTop = sidebarOffset + "px";
                  sidebar.style.height = "calc(100vh - " + sidebarOffset + "px)";
                  sidebar.style.maxHeight = "calc(100dvh - " + sidebarOffset + "px)";
                  sidebar.dataset.movedByElectron = "1";
                }
              });
              observer.observe(document.body, {childList:true, subtree:true});
            \`);
          });
        </script>
      </body>
      </html>
    `)
    );

    ipcMain.on('win-close', () => win.close());
    ipcMain.on('win-min', () => win.minimize());
    ipcMain.on('win-max', () => win.isMaximized() ? win.unmaximize() : win.maximize());
}

app.setName(config.appName);
app.whenReady().then(createMainWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });