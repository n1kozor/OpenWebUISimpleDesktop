![Screenshot 2025-04-18 193738](https://github.com/user-attachments/assets/b362b4b3-5c77-4123-8995-0323e588103e)


# OpenWebUISimpleDesktop

**OpenWebUISimpleDesktop** is a minimal, modern Electron desktop wrapper for [OpenWebUI](https://github.com/open-webui/open-webui).  
It provides a native desktop experience with native window controls and seamless integration, packaged as a simple Electron app with a built-in setup wizard.

---

## Features

- Clean, lightweight Electron shell for OpenWebUI
- Built-in first-launch setup wizard to configure app name and OpenWebUI server URL
- Settings saved to `config.json` beside the executable for easy user customization
- Native window controls (minimize, maximize, close)
- Customizable window size, colors, and UI offsets via config
- Displays a connection error message with retry button if the server is unreachable
- Cross-platform support: Windows and macOS
- Easy development with Node.js and Electron

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A running instance of [OpenWebUI](https://github.com/open-webui/open-webui) accessible via HTTP (e.g. `http://localhost:8080`)

---

## Installation

1. Clone or download this repository.
2. Navigate to the project folder in a terminal.
3. Install dependencies by running:  
   `npm install`

---

## Configuration

All settings are stored in `config.json` **next to the executable** after the first run wizard completes.  
You can edit this file manually anytime to change app settings.

### Example `config.json` content:

```json
{
  "appName": "OpenwebuiSimpleDesktop",
  "iconDarwin": "assets/icons.icns",
  "iconWin": "assets/ico.ico",
  "webuiUrl": "http://localhost:8080/",
  "bgColor": "#fff",
  "borderRadius": 0,
  "profileNavOffset": 15,
  "sidebarOffset": 15,
  "windowButtons": "right",
  "window": {
    "width": 1200,
    "height": 800,
    "minWidth": 500,
    "minHeight": 400
  }
}
```

`webuiUrl`: The URL where your OpenWebUI server is running.  
`windowButtons`: Position of window control buttons, `"right"` or `"left"`.  

Adjust icon paths if you customize icons.

---

## Fine-Tuning UI Offsets in `config.json`

Adjust these values to fix UI margins/offsets in OpenWebUI's webview:

- `profileNavOffset`: 15  
- `sidebarOffset`: 15  

Typical values range from 10 to 20 depending on your theme and UI.

---

# First Launch Setup Wizard
## Enter the Application Name 
![Screenshot 2025-04-19 015513](https://github.com/user-attachments/assets/d699195c-5f50-4ad2-9971-381d41b51aab)

## Enter the OpenWebUI Server URL (defaults to `http://localhost:8080`)  
![Screenshot 2025-04-19 015525](https://github.com/user-attachments/assets/7ea2ea5f-e192-49e1-8768-a123ac05eaa6)

## Click Start to save and launch the app 
![Screenshot 2025-04-19 015534](https://github.com/user-attachments/assets/42852644-d4a2-495c-960c-83e542fe7acc)







On first launch, a simple, clean wizard appears asking you to:  
- Enter the Application Name  
- Enter the OpenWebUI Server URL (defaults to `http://localhost:8080`)  
- Click Start to save and launch the app  

---

## Connection Error Handling


If the app cannot connect to the OpenWebUI server, it displays a clear Connection error message with:  
- Instructions to check your `config.json` settings  
- A Refresh button to retry connecting without restarting the app  


![Screenshot 2025-04-19 015544](https://github.com/user-attachments/assets/b99c5045-dca0-4299-a794-e2f417ec6b26)


---

## Usage

### Development Mode

Run the app in development mode with:

`npx electron main.js`

This will start the app loading local files and allowing you to develop and test.

---

### Build Distributable

To build a Windows or macOS installer/package using electron-builder, run:

`npm run dist`

- Output installers are created inside the dist folder.  
- Packaging settings are in package.json under the "build" key.

---

## Troubleshooting

- Blank window or connection refused:  
  Make sure your OpenWebUI server URL in config.json is correct and your OpenWebUI server is running and reachable.

- Config file not found after wizard:  
  The config.json file is saved next to the executable. Ensure the app has write permissions to its folder.

- Icons missing:  
  Verify icon files exist at the paths set in config.json or update paths to your custom icons.

---

## Credits

- OpenWebUI  
- Electron  

---

Enjoy using OpenWebUISimpleDesktop!  
