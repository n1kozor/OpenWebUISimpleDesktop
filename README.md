

![Screenshot 2025-04-18 193738](https://github.com/user-attachments/assets/1fe084f2-9270-41bc-8df3-95d4a627f3df)

# OpenWebUISimpleDesktop

**OpenWebUISimpleDesktop** is a minimal, modern Electron-based desktop wrapper for [OpenWebUI](https://github.com/open-webui/open-webui). This app provides a native desktop experience for OpenWebUI, with native window controls and seamless integration.

---

## Features

- Simple and clean Electron shell for OpenWebUI
- Customizable window size, color, and more via `config.json`
- Native desktop window controls (minimize, maximize, close)
- Easy to build for Windows and macOS

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [OpenWebUI](https://github.com/open-webui/open-webui) running somewhere accessible (e.g., `http://localhost:8000/`)

---

## Installation

1. **Clone or download** this repository.
2. **Install dependencies:**

```bash
npm install
```

---

## Configuration

All application settings are managed in the `config.json` file in the project root.

**Example:**

```json
{
"appName": "OpenwebuiSimpleDesktop",
"iconDarwin": "assets/icns.icns",
"iconWin": "assets/ico.ico",
"webuiUrl": "http://localhost:8080/",
"bgColor": "#101014",
"borderRadius": 16,
"profileNavOffset": 5,
"sidebarOffset": 15,
"window": { "width": 1200, "height": 800, "minWidth": 500, "minHeight": 400 }
}
```

- **`webuiUrl`**: Set this to the URL where your OpenWebUI server is running.
- Make sure your icon files exist at the paths given in `iconDarwin` and `iconWin`, or adjust as needed.

---

## Usage

### Development Mode

To run the app in development mode:

```bash
npx electron main.js
```

### Build Distributable

To build for your platform (Windows or macOS) using [electron-builder](https://www.electron.build/):

```bash
npm run dist
```
- Output installers/packages will appear in the `dist/` folder.
- Configuration for packaging is in the `package.json` under the `build` key.

---

## Customization

- **Change the OpenWebUI server address:**
  Edit the `"webuiUrl"` value in `config.json` before building.
- **Change window or visual settings:**
  Edit the corresponding values in `config.json`.

---

## Troubleshooting

- **Blank window or cannot connect:**
  Ensure that your `webuiUrl` is correct and the OpenWebUI server is actually running and accessible from your machine.
- **Icons not appearing:**
  Make sure the icon files exist at the specified paths, or update the config accordingly.

---


## Credits

- [OpenWebUI](https://github.com/open-webui/open-webui)
- [Electron](https://www.electronjs.org/)

---
