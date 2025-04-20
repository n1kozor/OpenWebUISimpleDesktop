let config = null;

function setWizardTheme(theme) {
    const overlay = document.getElementById('wizard-overlay');
    const inner = document.getElementById('wizardForm');
    overlay.classList.remove('dark', 'light');
    inner.classList.remove('dark', 'light');
    overlay.classList.add(theme);
    inner.classList.add(theme);
    document.getElementById('darkThemeBtn').classList.toggle('active', theme === 'dark');
    document.getElementById('lightThemeBtn').classList.toggle('active', theme === 'light');
}

function showWizard() {
    document.getElementById('wizard-overlay').style.display = 'flex';
    document.getElementById('preloader').style.display = 'none';
    document.getElementById('webviewWrap').style.display = 'none';
    document.querySelector('.window-buttons').style.display = 'none';
    document.querySelector('.drag-overlay').style.display = 'none';
    setTimeout(() => document.getElementById('appNameInput').focus(), 80);
}

function hideWizard() {
    document.getElementById('wizard-overlay').style.display = 'none';
    document.getElementById('webviewWrap').style.display = '';
    document.getElementById('preloader').style.display = '';
    document.querySelector('.window-buttons').style.display = '';
    document.querySelector('.drag-overlay').style.display = '';
}

function wizardLogic() {
    const wizardStepIds = [
        'wizardStepAppName',
        'wizardStepShortcut',
        'wizardStepApiToken',
        'wizardStepAppUrl',
        'wizardStepPreloaderTheme',
        'wizardStepReady'
    ];
    const steps = wizardStepIds.map(id => document.getElementById(id));
    function showStep(idx) {
        steps.forEach((step, i) => {
            step.style.display = (i === idx) ? (wizardStepIds[i] === 'wizardStepReady' ? 'flex' : 'block') : 'none';
        });
        if(idx === 0) setTimeout(()=>appNameInput.focus(), 80);
        if(idx === 2) setTimeout(()=>apiTokenInput.focus(), 80);
        if(idx === 3) setTimeout(()=>webuiUrlInput.focus(), 80);
    }
    const appNameInput = document.getElementById('appNameInput');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const webuiUrlInput = document.getElementById('webuiUrlInput');
    const nextToShortcut = document.getElementById('nextToShortcut');
    const nextToApiToken = document.getElementById('nextToApiToken');
    const nextToUrl = document.getElementById('nextToUrl');
    const nextToPreloaderTheme = document.getElementById('nextToPreloaderTheme');
    const nextToReady = document.getElementById('nextToReady');
    const wizardStartBtn = document.getElementById('wizardStartBtn');
    const wizardError = document.getElementById('wizard-error');
    const preloaderBtnDark = document.getElementById('preloaderThemeDark');
    const preloaderBtnLight = document.getElementById('preloaderThemeLight');
    const scanNetworkBtn = document.getElementById('scanNetworkBtn');
    const scanResultDiv = document.getElementById('networkScanResult');
    let wizardData = {};
    let preloaderThemeValue = null;
    appNameInput.addEventListener('input', () => {
        nextToShortcut.disabled = appNameInput.value.trim().length < 1;
    });
    nextToShortcut.addEventListener('click', () => {
        wizardData.appName = appNameInput.value.trim();
        showStep(1);
    });
    nextToApiToken.addEventListener('click', () => {
        showStep(2);
        apiTokenInput.focus();
    });
    nextToUrl.addEventListener('click', () => {
        wizardData.apiToken = apiTokenInput.value;
        showStep(3);
        webuiUrlInput.focus();
    });
    function validateUrl(url) {
        url = url.trim();
        return url.startsWith('http://') || url.startsWith('https://');
    }
    webuiUrlInput.addEventListener('input', () => {
        nextToPreloaderTheme.disabled = !validateUrl(webuiUrlInput.value);
    });
    nextToPreloaderTheme.addEventListener('click', () => {
        wizardData.webuiUrl = webuiUrlInput.value.trim();
        showStep(4);
        nextToReady.disabled = true;
        preloaderThemeValue = null;
        preloaderBtnDark.classList.remove('selected');
        preloaderBtnLight.classList.remove('selected');
    });
    [preloaderBtnDark, preloaderBtnLight].forEach(btn => {
        btn.onclick = () => {
            preloaderBtnDark.classList.toggle('selected', btn === preloaderBtnDark);
            preloaderBtnLight.classList.toggle('selected', btn === preloaderBtnLight);
            preloaderThemeValue = btn.dataset.theme;
            nextToReady.disabled = false;
        };
    });
    nextToReady.addEventListener('click', () => {
        showStep(5);
        wizardStartBtn.focus();
    });
    wizardStartBtn.addEventListener('click', e => {
        e.preventDefault();
        wizardError.style.display = 'none';
        const fullConfig = {
            iconDarwin: "assets/ico.icns",
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
            preloaderTheme: preloaderThemeValue || "dark",
            opacity: 1
        };
        window.electronAPI.saveConfig(fullConfig);
        document.getElementById('wizard-overlay').style.opacity = '0.2';
        document.getElementById('wizard-overlay').style.pointerEvents = 'none';
    });
    appNameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !nextToShortcut.disabled) nextToShortcut.click();
    });
    apiTokenInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') nextToUrl.click();
    });
    webuiUrlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !nextToPreloaderTheme.disabled) nextToPreloaderTheme.click();
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
            if (cfg) runAppWithConfig(cfg);
        });
    });

    if (scanNetworkBtn) {
        let scanLoaderInterval = null;
        scanNetworkBtn.onclick = async () => {
            scanNetworkBtn.disabled = true;
            let dots = 0;
            scanResultDiv.innerHTML = `<div style="color:#888;font-style:italic;text-align:center;">Scanning local network<span id="dots"></span></div>`;
            scanLoaderInterval = setInterval(() => {
                dots = (dots + 1) % 4;
                document.getElementById('dots').textContent = '.'.repeat(dots);
            }, 500);
            try {
                const servers = await window.electronAPI.scanOpenwebui();
                clearInterval(scanLoaderInterval);
                if (servers.length === 0) {
                    scanResultDiv.innerHTML = `<div style="color:#e77; font-weight:bold; text-align:center;">No OpenWebUI server found on local network.</div>`;
                } else {
                    scanResultDiv.innerHTML =
                        `<div style="font-weight:bold; margin-bottom:8px; color:#77aaff; text-align:center;">Found OpenWebUI server${servers.length>1?'s':''}:</div>` +
                        servers.map(s =>
                            `<div style="margin-bottom:10px; text-align:center;">
              <a href="#" class="found-server"
                data-ip="${s.ip}" data-port="${s.port}"
                style="
                  display:inline-block;
                  padding: 10px 20px;
                  border-radius: 10px;
                  background: linear-gradient(90deg, #22aaff 40%, #38e4e4 100%);
                  color: #fff;
                  font-weight:700;
                  text-decoration:none;
                  font-size:1.12em;
                  margin-bottom:5px;
                  box-shadow: 0 2px 10px #0002;
                  transition: background 0.2s;
                  text-align:center;
                "
                onmouseover="this.style.background='#2377b6';"
                onmouseout="this.style.background='linear-gradient(90deg, #22aaff 40%, #38e4e4 100%)';"
              >
                ${s.ip}:${s.port} <span style="font-size:.92em; font-weight:400;">(v${s.version})</span>
              </a>
            </div>`
                        ).join("");
                    document.querySelectorAll('.found-server').forEach(link => {
                        link.onclick = (e) => {
                            e.preventDefault();
                            webuiUrlInput.value = `http://${link.dataset.ip}:${link.dataset.port}`;
                            scanResultDiv.innerHTML = `<div style="color:#5c5; font-weight:600; text-align:center;">Selected: ${webuiUrlInput.value}</div>`;
                            nextToPreloaderTheme.disabled = !validateUrl(webuiUrlInput.value);
                        };
                    });
                }
            } catch (err) {
                clearInterval(scanLoaderInterval);
                scanResultDiv.innerHTML = `<div style="color:#e55; font-weight:600; text-align:center;">Error during scan: ${err}</div>`;
            } finally {
                scanNetworkBtn.disabled = false;
                clearInterval(scanLoaderInterval);
            }
        };
    }
}

function runAppWithConfig(cfg) {
    config = cfg;
    document.getElementById('preloader-text').innerText = cfg.appName;
    const preloader = document.getElementById('preloader');
    preloader.classList.remove('preloader-dark', 'preloader-light');
    if (cfg.preloaderTheme === 'light') {
        preloader.classList.add('preloader-light');
    } else {
        preloader.classList.add('preloader-dark');
    }
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
    const preloaderElem = document.getElementById('preloader');
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
        preloaderElem.classList.add('preloader-fade');
        setTimeout(() => preloaderElem.remove(), 500);
    }
    webview.addEventListener('did-fail-load', event => {
        if (event.isMainFrame) {
            webviewWrap.style.display = 'none';
            dragOverlay.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'flex';
            preloaderElem.classList.add('preloader-fade');
            setTimeout(() => preloaderElem.remove(), 500);
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
            webview.executeJavaScript(`         const profileNavOffset = ${cfg.profileNavOffset};         const sidebarOffset = ${cfg.sidebarOffset};         const nav = document.querySelector('nav.sticky.top-0');         if (nav && !nav.dataset.movedByElectron) {           nav.style.marginTop = profileNavOffset + 'px';           nav.style.zIndex = '100';           nav.dataset.movedByElectron = '1';         }         const sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');         if (sidebar && !sidebar.dataset.movedByElectron) {           sidebar.style.marginTop = sidebarOffset + 'px';           sidebar.style.height = 'calc(100vh - ' + sidebarOffset + 'px)';           sidebar.style.maxHeight = 'calc(100dvh - ' + sidebarOffset + 'px)';           sidebar.dataset.movedByElectron = '1';         }         const observer = new MutationObserver(() => {           const nav = document.querySelector('nav.sticky.top-0');           if (nav && !nav.dataset.movedByElectron) {             nav.style.marginTop = profileNavOffset + 'px';             nav.style.zIndex = '20';             nav.dataset.movedByElectron = '1';           }           const sidebar = document.querySelector('div.py-2.my-auto.flex.flex-col.justify-between');           if (sidebar && !sidebar.dataset.movedByElectron) {             sidebar.style.marginTop = sidebarOffset + 'px';             sidebar.style.height = 'calc(100vh - ' + sidebarOffset + 'px)';             sidebar.style.maxHeight = 'calc(100dvh - ' + sidebarOffset + 'px)';             sidebar.dataset.movedByElectron = '1';           }         });         observer.observe(document.body, {childList:true, subtree:true});       `);
        }
        lastError = false;
    });
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (errorMsg) errorMsg.style.display = 'none';
            webviewWrap.style.display = '';
            dragOverlay.style.display = '';
            preloaderElem.classList.remove('preloader-fade');
            document.body.appendChild(preloaderElem);
            lastError = false;
            webview.src = cfg.webuiUrl;
        };
    }
}
document.querySelector('.btn-close').onclick = () => window.electronAPI.windowControls.close();
document.querySelector('.btn-min').onclick = () => window.electronAPI.windowControls.minimize();
document.querySelector('.btn-max').onclick = () => window.electronAPI.windowControls.maximize();

function init() {
    setWizardTheme('dark');
    document.getElementById('darkThemeBtn').onclick = () => setWizardTheme('dark');
    document.getElementById('lightThemeBtn').onclick = () => setWizardTheme('light');
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
        webview.executeJavaScript(`       const interval = setInterval(() => {         const textarea = document.querySelector('textarea');         if (textarea) {           textarea.value = "Hi!";           textarea.dispatchEvent(new Event('input'));           const sendBtn = textarea.closest('form')?.querySelector('button[type="submit"]');           if (sendBtn) {             sendBtn.click();             clearInterval(interval);           }         }       }, 200);     `);
    }, { once: true });
};