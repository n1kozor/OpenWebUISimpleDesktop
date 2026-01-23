const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const configDir = app.getPath('appData');
const configPath = path.join(configDir, 'config.json');

function readConfig() {
    try {
        if (!fs.existsSync(configPath)) return null;
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return null;
    }
}

function saveConfig(configData) {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
}

function getIconPath(cfg) {
    return process.platform === 'darwin'
        ? path.join(__dirname, cfg?.iconDarwin ?? 'assets/ico.icns')
        : path.join(__dirname, cfg?.iconWin ?? 'assets/ico.ico');
}

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

function getLocalSubnetIPs() {
    const interfaces = os.networkInterfaces();
    let ips = [];
    for (const ifaceList of Object.values(interfaces)) {
        for (const iface of ifaceList) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const sub = iface.address.split('.').slice(0,3).join('.');
                for (let i = 1; i <= 254; i++) {
                    ips.push(`${sub}.${i}`);
                }
            }
        }
    }
    return [...new Set(ips)];
}

function compareVersion(a, b) {
    const aa = a.split('.').map(Number);
    const bb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
        const x = aa[i] || 0, y = bb[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

function checkOpenWebUI(ip, port) {
    return new Promise(resolve => {
        const req = http.get({ host: ip, port, path: '/api/version', timeout: 1000 }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.version && compareVersion(json.version, "0.6.5") >= 0) {
                        resolve({ ip, port, version: json.version });
                        return;
                    }
                } catch {}
                resolve(null);
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.abort(); resolve(null); });
    });
}

async function scanNetworkForOpenWebUI() {
    const PORTS = [8000, 8080, 5000, 8001];
    const ips = getLocalSubnetIPs();
    const CONCURRENCY = 20;
    let results = [];
    const tasks = [];
    for (const ip of ips) {
        for (const port of PORTS) {
            tasks.push({ ip, port });
        }
    }
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const slice = tasks.slice(i, i + CONCURRENCY);
        const found = await Promise.all(slice.map(t => checkOpenWebUI(t.ip, t.port)));
        results.push(...found.filter(Boolean));
    }
    const unique = [];
    const seen = new Set();
    for (const r of results) {
        const key = `${r.ip}:${r.port}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(r);
        }
    }
    return unique;
}

module.exports = {
    readConfig,
    saveConfig,
    getIconPath,
    apiFetch,
    scanNetworkForOpenWebUI
};
