// Fetch config.json (async is needed in Electron renderer)
fetch('config.json')
    .then(response => response.json())
    .then(config => {
        // Set app name in preloader
        document.getElementById('preloader-text').innerText = config.appName;

        // Set webview source
        document.getElementById('webview').src = config.webuiUrl;

        // Window control buttons placement (left or right)
        const btnBox = document.querySelector('.window-buttons');
        if (config.windowButtons === "right") {
            btnBox.classList.add('window-buttons-right');
            btnBox.classList.remove('window-buttons-left');
        } else {
            btnBox.classList.add('window-buttons-left');
            btnBox.classList.remove('window-buttons-right');
        }

        // Preloader logic: at least 3s, then fade out after webview load
        const preloader = document.getElementById('preloader');
        const webview = document.getElementById('webview');
        let preloaderDone = false;
        let minTimePassed = false;
        setTimeout(() => {
            minTimePassed = true;
            if (preloaderDone) {
                removePreloader();
            }
        }, 3000);
        webview.addEventListener('did-finish-load', () => {
            preloaderDone = true;
            if (minTimePassed) {
                removePreloader();
            }
            // Margin/offset fix logic for OpenWebUI
            webview.executeJavaScript(`
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
            `);
        });

        function removePreloader() {
            const preloader = document.getElementById('preloader');
            preloader.classList.add('preloader-fade');
            setTimeout(() => preloader.remove(), 500);
        }
    });

// Window (native) controls
document.querySelector('.btn-close').onclick = () => window.electronAPI.windowControls.close();
document.querySelector('.btn-min').onclick = () => window.electronAPI.windowControls.minimize();
document.querySelector('.btn-max').onclick = () => window.electronAPI.windowControls.maximize();