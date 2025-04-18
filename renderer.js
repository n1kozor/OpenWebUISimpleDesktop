// -------------------------
// NO FETCH! Only IPC for config!
// -------------------------

let config = null;

// Show the setup wizard overlay
function showWizard() {
    document.getElementById('wizard-overlay').style.display = 'flex';
    document.getElementById('preloader').style.display = 'none';
    document.getElementById('webviewWrap').style.display = 'none';
    document.querySelector('.window-buttons').style.display = 'none';
    document.querySelector('.drag-overlay').style.display = 'none';
    setTimeout(() => document.getElementById('appNameInput').focus(), 80);
}

// Hide the wizard
function hideWizard() {
    document.getElementById('wizard-overlay').style.display = 'none';
    document.getElementById('webviewWrap').style.display = '';
    document.getElementById('preloader').style.display = '';
    document.querySelector('.window-buttons').style.display = '';
    document.querySelector('.drag-overlay').style.display = '';
}

// Wizard step logic
function wizardLogic() {
    const appNameInput = document.getElementById('appNameInput');
    const webuiUrlInput = document.getElementById('webuiUrlInput');
    const nextToUrl = document.getElementById('nextToUrl');
    const nextToReady = document.getElementById('nextToReady');
    const wizardStartBtn = document.getElementById('wizardStartBtn');
    const stepAppName = document.getElementById('wizardStepAppName');
    const stepAppUrl = document.getElementById('wizardStepAppUrl');
    const stepReady = document.getElementById('wizardStepReady');
    const wizardError = document.getElementById('wizard-error');
    let wizardData = {};

    // Fill server URL field with default value if empty
    if (!webuiUrlInput.value) webuiUrlInput.value = 'http://localhost:8080';

    // App name
    appNameInput.addEventListener('input', () => {
        nextToUrl.disabled = appNameInput.value.trim().length < 2;
    });

    nextToUrl.addEventListener('click', () => {
        wizardData.appName = appNameInput.value.trim();
        stepAppName.style.display = 'none';
        stepAppUrl.style.display = '';
        webuiUrlInput.focus();
    });

    // URL
    webuiUrlInput.addEventListener('input', () => {
        let url = webuiUrlInput.value.trim();
        nextToReady.disabled = !(url.startsWith('http://') || url.startsWith('https://'));
    });

    nextToReady.addEventListener('click', () => {
        wizardData.webuiUrl = webuiUrlInput.value.trim();
        stepAppUrl.style.display = 'none';
        stepReady.style.display = '';
        wizardStartBtn.focus();
    });

    // Enter = next
    appNameInput.addEventListener('keydown', e => {
        if (e.key === "Enter" && !nextToUrl.disabled) nextToUrl.click();
    });
    webuiUrlInput.addEventListener('keydown', e => {
        if (e.key === "Enter" && !nextToReady.disabled) nextToReady.click();
    });

    // Save config (via IPC)
    wizardStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        wizardError.style.display = "none";
        window.electronAPI.saveConfig({
            appName: wizardData.appName,
            webuiUrl: wizardData.webuiUrl
        });
        document.getElementById('wizard-overlay').style.opacity = '0.2';
        document.getElementById('wizard-overlay').style.pointerEvents = 'none';
    });

    // Listen for config save error!
    window.electronAPI.onConfigSaveError((err) => {
        wizardError.textContent = "Failed to save config: " + (err?.msg || "Unknown error.");
        wizardError.style.display = "";
        document.getElementById('wizard-overlay').style.opacity = '1';
        document.getElementById('wizard-overlay').style.pointerEvents = '';
    });
}

// Main app logic (when config exists)
function runAppWithConfig(cfg) {
    document.getElementById('preloader-text').innerText = cfg.appName;
    const btnBox = document.querySelector('.window-buttons');
    if (cfg.windowButtons === "right") {
        btnBox.classList.add('window-buttons-right');
        btnBox.classList.remove('window-buttons-left');
    } else {
        btnBox.classList.add('window-buttons-left');
        btnBox.classList.remove('window-buttons-right');
    }
    document.getElementById('webviewWrap').style.borderRadius = (cfg.borderRadius||0) + "px";
    document.getElementById('webview').style.borderRadius = (cfg.borderRadius||0) + "px";
    document.body.style.background = cfg.bgColor || "#fff";
    const webview = document.getElementById('webview');
    webview.src = cfg.webuiUrl;

    const preloader = document.getElementById('preloader');
    const errorMsg = document.getElementById('connection-error-message');
    const refreshBtn = document.getElementById('connection-error-refresh');
    const webviewWrap = document.getElementById('webviewWrap');
    const dragOverlay = document.querySelector('.drag-overlay');

    let preloaderDone = false;
    let minTimePassed = false;
    let lastError = false;

    setTimeout(() => {
        minTimePassed = true;
        if (preloaderDone) removePreloader();
    }, 3000);

    function removePreloader() {
        preloader.classList.add('preloader-fade');
        setTimeout(() => preloader.remove(), 500);
    }

    // Handle connection error
    webview.addEventListener('did-fail-load', function onFail(event) {
        if (event.isMainFrame) {
            webviewWrap.style.display = "none";
            dragOverlay.style.display = "none";
            if (errorMsg) errorMsg.style.display = "flex";
            preloader.classList.add('preloader-fade');
            setTimeout(() => preloader.remove(), 500);
            lastError = true;
        }
    });

    webview.addEventListener('did-finish-load', function onLoad() {
        if (!lastError) {
            preloaderDone = true;
            if (minTimePassed) removePreloader();
            webviewWrap.style.display = "";
            dragOverlay.style.display = "";
            if (errorMsg) errorMsg.style.display = "none";

            // Margin fix for OpenWebUI
            webview.executeJavaScript(`
                let profileNavOffset = ${cfg.profileNavOffset};
                let sidebarOffset = ${cfg.sidebarOffset};
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
            `);
        }
        lastError = false;
    });

    // Refresh button logic
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (errorMsg) errorMsg.style.display = "none";
            webviewWrap.style.display = "";
            dragOverlay.style.display = "";
            preloader.classList.remove('preloader-fade');
            document.body.appendChild(preloader); // put back if removed
            lastError = false;
            webview.src = cfg.webuiUrl;
        };
    }
}

// Native window controls
document.querySelector('.btn-close').onclick = () => window.electronAPI.windowControls.close();
document.querySelector('.btn-min').onclick = () => window.electronAPI.windowControls.minimize();
document.querySelector('.btn-max').onclick = () => window.electronAPI.windowControls.maximize();

// Init (get config via IPC! No fetch!)
function init() {
    window.electronAPI.getConfig().then(cfg => {
        if (!cfg) {
            showWizard();
            wizardLogic();
        } else {
            config = cfg;
            hideWizard();
            runAppWithConfig(cfg);
        }
    });
}
init();

// Wizard save: reload app with new config
window.electronAPI.onReloadApp(() => {
    setTimeout(() => {
        window.electronAPI.getConfig().then(cfg => {
            if (cfg) {
                config = cfg;
                hideWizard();
                runAppWithConfig(cfg);
            }
        });
    }, 400);
});