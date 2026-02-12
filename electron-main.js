import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In dev, load from Vite server; in prod, load built files
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080/game.html');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'game.html'));
  }

  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
