let config = null;

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
    // Functions from wizard.js are now available globally if wizard.js is loaded first
    if (typeof setWizardTheme === 'function') {
        setWizardTheme('dark');
        document.getElementById('darkThemeBtn').onclick = () => setWizardTheme('dark');
        document.getElementById('lightThemeBtn').onclick = () => setWizardTheme('light');
    }

    window.electronAPI.getConfig().then(cfg => {
        if (!cfg) {
             if (typeof showWizard === 'function' && typeof wizardLogic === 'function') {
                showWizard();
                wizardLogic();
            }
        } else {
            config = cfg;
            if (typeof hideWizard === 'function') hideWizard();
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
                if (typeof hideWizard === 'function') hideWizard();
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
