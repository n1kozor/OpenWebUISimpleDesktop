let config = null;

const wizardForm = document.getElementById('wizardForm');
wizardForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});


// Show the setup wizard overlay
function showWizard() {
    document.getElementById('wizard-overlay').style.display = 'flex';
    document.getElementById('preloader').style.display = 'none';
    document.getElementById('webviewWrap').style.display = 'none';
    document.querySelector('.window-buttons').style.display = 'none';
    document.querySelector('.drag-overlay').style.display = 'none';
    setTimeout(() => document.getElementById('appNameInput').focus(), 80);
}

// Hide the setup wizard overlay
function hideWizard() {
    document.getElementById('wizard-overlay').style.display = 'none';
    document.getElementById('webviewWrap').style.display = '';
    document.getElementById('preloader').style.display = '';
    document.querySelector('.window-buttons').style.display = '';
    document.querySelector('.drag-overlay').style.display = '';
}

// Wizard step logic for initial setup
function wizardLogic() {
    const appNameInput = document.getElementById('appNameInput');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const webuiUrlInput = document.getElementById('webuiUrlInput');

    const nextToShortcut = document.getElementById('nextToShortcut');
    const nextToApiToken = document.getElementById('nextToApiToken');
    const nextToUrl = document.getElementById('nextToUrl');
    const nextToReady = document.getElementById('nextToReady');
    const wizardStartBtn = document.getElementById('wizardStartBtn');

    const stepAppName = document.getElementById('wizardStepAppName');
    const stepShortcut = document.getElementById('wizardStepShortcut');
    const stepApiToken = document.getElementById('wizardStepApiToken');
    const stepAppUrl = document.getElementById('wizardStepAppUrl');
    const stepReady = document.getElementById('wizardStepReady');

    const wizardError = document.getElementById('wizard-error');

    let wizardData = {};

    if (!webuiUrlInput.value) webuiUrlInput.value = 'http://127.0.0.1:8000';

    appNameInput.addEventListener('input', () => {
        nextToShortcut.disabled = appNameInput.value.trim().length < 2;
    });

    nextToShortcut.addEventListener('click', () => {
        wizardData.appName = appNameInput.value.trim();
        stepAppName.style.display = 'none';
        stepShortcut.style.display = '';
    });

    nextToApiToken.addEventListener('click', () => {
        stepShortcut.style.display = 'none';
        stepApiToken.style.display = '';
        apiTokenInput.focus();
    });

    nextToUrl.addEventListener('click', () => {
        wizardData.apiToken = apiTokenInput.value;
        stepApiToken.style.display = 'none';
        stepAppUrl.style.display = '';
        webuiUrlInput.focus();
    });

    webuiUrlInput.addEventListener('input', () => {
        const url = webuiUrlInput.value.trim();
        nextToReady.disabled = !(url.startsWith('http://') || url.startsWith('https://'));
    });

    nextToReady.addEventListener('click', () => {
        wizardData.webuiUrl = webuiUrlInput.value.trim();
        stepAppUrl.style.display = 'none';
        stepReady.style.display = '';
        wizardStartBtn.focus();
    });

    appNameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !nextToShortcut.disabled) nextToShortcut.click();
    });
    apiTokenInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') nextToUrl.click();
    });
    webuiUrlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !nextToReady.disabled) nextToReady.click();
    });

    wizardStartBtn.addEventListener('click', e => {
        e.preventDefault();
        wizardError.style.display = 'none';

        const fullConfig = {
            iconDarwin: "assets/icons.icns",
            iconWin: "assets/ico.ico",
            bgColor: "#fff",
            borderRadius: 0,
            profileNavOffset: 15,
            sidebarOffset: 15,
            apiToken: wizardData.apiToken || "",
            windowButtons: "right",
            window: {
                width: 1200,
                height: 800,
                minWidth: 500,
                minHeight: 400
            },
            appName: wizardData.appName,
            webuiUrl: wizardData.webuiUrl,
            opacity: 1
        };

        window.electronAPI.saveConfig(fullConfig);

        document.getElementById('wizard-overlay').style.opacity = '0.2';
        document.getElementById('wizard-overlay').style.pointerEvents = 'none';
    });

    window.electronAPI.onConfigSaveError(err => {
        wizardError.textContent = 'Failed to save config: ' + (err?.msg || 'Unknown error.');
        wizardError.style.display = '';
        document.getElementById('wizard-overlay').style.opacity = '1';
        document.getElementById('wizard-overlay').style.pointerEvents = '';
    });

    window.electronAPI.onConfigSaved(() => {
        hideWizard();
        window.electronAPI.getConfig().then(cfg => {
            if (cfg) {
                runAppWithConfig(cfg);
            }
        });
    });
}

// Run app with config, initialize webview and UI
function runAppWithConfig(cfg) {
    config = cfg;
    document.getElementById('preloader-text').innerText = cfg.appName;

    const btnBox = document.querySelector('.window-buttons');
    if (cfg.windowButtons === 'right') {
        btnBox.classList.add('window-buttons-right');
        btnBox.classList.remove('window-buttons-left');
    } else {
        btnBox.classList.add('window-buttons-left');
        btnBox.classList.remove('window-buttons-right');
    }

    document.getElementById('webviewWrap').style.borderRadius = (cfg.borderRadius || 0) + 'px';
    document.getElementById('webview').style.borderRadius = (cfg.borderRadius || 0) + 'px';
    document.body.style.background = cfg.bgColor || '#fff';

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

    webview.addEventListener('did-fail-load', event => {
        if (event.isMainFrame) {
            webviewWrap.style.display = 'none';
            dragOverlay.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'flex';
            preloader.classList.add('preloader-fade');
            setTimeout(() => preloader.remove(), 500);
            lastError = true;
        }
    });

    webview.addEventListener('did-finish-load', () => {
        if (!lastError) {
            preloaderDone = true;
            if (minTimePassed) removePreloader();
            webviewWrap.style.display = '';
            dragOverlay.style.display = '';
            if (errorMsg) errorMsg.style.display = 'none';

            // Margin fix for OpenWebUI UI
            webview.executeJavaScript(`
                const profileNavOffset = ${cfg.profileNavOffset};
                const sidebarOffset = ${cfg.sidebarOffset};
                const nav = document.querySelector('nav.sticky.top-0');
                if (nav && !nav.dataset.movedByElectron) {
                    nav.style.marginTop = profileNavOffset + 'px';
                    nav.style.zIndex = '100';
                    nav.dataset.movedByElectron = '1';
                }
                const sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');
                if (sidebar && !sidebar.dataset.movedByElectron) {
                    sidebar.style.marginTop = sidebarOffset + 'px';
                    sidebar.style.height = 'calc(100vh - ' + sidebarOffset + 'px)';
                    sidebar.style.maxHeight = 'calc(100dvh - ' + sidebarOffset + 'px)';
                    sidebar.dataset.movedByElectron = '1';
                }
                const observer = new MutationObserver(() => {
                    const nav = document.querySelector('nav.sticky.top-0');
                    if (nav && !nav.dataset.movedByElectron) {
                        nav.style.marginTop = profileNavOffset + 'px';
                        nav.style.zIndex = '20';
                        nav.dataset.movedByElectron = '1';
                    }
                    const sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');
                    if (sidebar && !sidebar.dataset.movedByElectron) {
                        sidebar.style.marginTop = sidebarOffset + 'px';
                        sidebar.style.height = 'calc(100vh - ' + sidebarOffset + 'px)';
                        sidebar.style.maxHeight = 'calc(100dvh - ' + sidebarOffset + 'px)';
                        sidebar.dataset.movedByElectron = '1';
                    }
                });
                observer.observe(document.body, {childList:true, subtree:true});
            `);
        }
        lastError = false;
    });

    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (errorMsg) errorMsg.style.display = 'none';
            webviewWrap.style.display = '';
            dragOverlay.style.display = '';
            preloader.classList.remove('preloader-fade');
            document.body.appendChild(preloader);
            lastError = false;
            webview.src = cfg.webuiUrl;
        };
    }
}

// Native window buttons
document.querySelector('.btn-close').onclick = () => window.electronAPI.windowControls.close();
document.querySelector('.btn-min').onclick = () => window.electronAPI.windowControls.minimize();
document.querySelector('.btn-max').onclick = () => window.electronAPI.windowControls.maximize();

// Init app
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

window.electronAPI.onOpenChat((url) => {
    const webview = document.getElementById('webview');
    webview.src = 'about:blank';
    setTimeout(() => {
        webview.src = url;
    }, 100);
});

// Reload app when config saved
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


window.electronAPI.onStartChatWithModel = (modelName) => {
    const webview = document.getElementById('webview');
    webview.src = config.webuiUrl;

    webview.addEventListener('did-finish-load', () => {
        webview.executeJavaScript(`
            const interval = setInterval(() => {
                const textarea = document.querySelector('textarea');
                if (textarea) {
                    textarea.value = "Hi!";
                    textarea.dispatchEvent(new Event('input'));
                    const sendBtn = textarea.closest('form')?.querySelector('button[type="submit"]');
                    if (sendBtn) {
                        sendBtn.click();
                        clearInterval(interval);
                    }
                }
            }, 200);
        `);
    }, { once: true });
};
