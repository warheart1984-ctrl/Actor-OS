/**
 * Optional Electron shell. Web remains the primary surface; this wrapper opens
 * the Vite UI (or a built bundle) in a desktop window. Start the backend and
 * frontend first with `npm run dev` from the repo root.
 */
const { app, BrowserWindow } = require('electron');

const TARGET = process.env.LINEAGE_DESKTOP_URL || 'http://localhost:3000';

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#09090b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.loadURL(TARGET);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
