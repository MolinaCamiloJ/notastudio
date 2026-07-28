// main.js — Proceso principal de Electron para NotaStudio
const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// ---------- Configuración ----------
const CONFIG_PATH = path.join(__dirname, 'config.json');
const USER_DATA_DIR = app.getPath('userData');
const SESSION_FILE = path.join(USER_DATA_DIR, 'session.dat');

function loadAppConfig() {
  const examplePath = path.join(__dirname, 'config.example.json');
  if (!fs.existsSync(CONFIG_PATH)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, CONFIG_PATH);
    } else {
      throw new Error('No se encontró config.json ni config.example.json');
    }
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

let appConfig;
try {
  appConfig = loadAppConfig();
} catch (e) {
  appConfig = { githubClientId: '', githubClientSecret: '', oauthCallbackPort: 53219 };
}

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 720,
    minHeight: 560,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'pug_icon.ico' : 'pug_icon.png'),
    backgroundColor: '#FFFFFF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Persistencia segura de la sesión ----------
function saveSession(data) {
  const json = JSON.stringify(data);
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(SESSION_FILE, safeStorage.encryptString(json));
  } else {
    fs.writeFileSync(SESSION_FILE, json, 'utf-8');
  }
}

function readSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    const raw = fs.readFileSync(SESSION_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(raw));
    }
    return JSON.parse(raw.toString('utf-8'));
  } catch (e) {
    return null;
  }
}

function clearSession() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

// ---------- Flujo de login con GitHub (OAuth con cierre automático de pestaña) ----------
let oauthServer = null;

function startOAuthLogin() {
  return new Promise((resolve, reject) => {
    const port = appConfig.oauthCallbackPort || 53219;
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const state = Math.random().toString(36).slice(2);

    if (!appConfig.githubClientId) {
      reject(new Error('MISSING_CLIENT_ID'));
      return;
    }

    if (oauthServer) {
      oauthServer.close();
      oauthServer = null;
    }

    oauthServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      const closeTabHtml = (title, message) => `
        <html><head><meta charset="utf-8"><title>${title}</title>
        <style>
          body{font-family:sans-serif;background:#DEC4A0;color:#3C3936;
               display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
          .box{background:#fff;padding:32px 40px;border-radius:16px;text-align:center;
               box-shadow:0 8px 24px rgba(0,0,0,0.12)}
        </style></head>
        <body><div class="box"><h2>${title}</h2><p>${message}</p></div>
        <script>setTimeout(()=>{window.close();}, 1200);</script>
        </body></html>`;

      if (!code || returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(closeTabHtml('Error de autenticación', 'Podés cerrar esta pestaña.'));
        oauthServer.close();
        oauthServer = null;
        reject(new Error('OAUTH_FAILED'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(closeTabHtml('¡Listo!', 'Ya podés volver a NotaStudio. Esta pestaña se cerrará sola.'));
      oauthServer.close();
      oauthServer = null;

      try {
        const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            client_id: appConfig.githubClientId,
            client_secret: appConfig.githubClientSecret,
            code,
            redirect_uri: redirectUri
          })
        });
        const tokenData = await tokenResp.json();
        if (!tokenData.access_token) {
          reject(new Error('NO_ACCESS_TOKEN'));
          return;
        }

        const userResp = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'NotaStudio-App'
          }
        });
        const userData = await userResp.json();

        const session = { accessToken: tokenData.access_token, username: userData.login };
        saveSession(session);
        resolve(session);
      } catch (err) {
        reject(err);
      }
    });

    oauthServer.listen(port, '127.0.0.1', () => {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${appConfig.githubClientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${state}`;
      shell.openExternal(authUrl);
    });
  });
}

ipcMain.handle('auth:login', async () => {
  try {
    const session = await startOAuthLogin();
    return { ok: true, username: session.username };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('auth:getSession', async () => {
  const session = readSession();
  if (!session) return { ok: false };
  return { ok: true, username: session.username };
});

ipcMain.handle('auth:logout', async () => {
  clearSession();
  return { ok: true };
});

// ---------- Salir de la aplicación ----------
ipcMain.handle('app:quit', async () => {
  app.quit();
});

// ---------- Selección de carpeta ----------
ipcMain.handle('folder:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false };
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  return { ok: true, folderPath, folderName };
});

// ---------- Subida del repositorio ----------
function runGitCommand(args, cwd, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd });
    let stderrBuf = '';

    proc.stdout.on('data', (d) => { /* silencioso */ });
    proc.stderr.on('data', (d) => {
      const text = d.toString();
      stderrBuf += text;
      const match = text.match(/(\d{1,3})%/);
      if (match && onProgress) {
        onProgress(Math.min(100, parseInt(match[1], 10)));
      }
    });

    proc.on('error', (err) => reject(err));
    proc.on('close', (codeNum) => {
      if (codeNum === 0) resolve();
      else reject(new Error(stderrBuf || `git ${args.join(' ')} falló con código ${codeNum}`));
    });
  });
}

ipcMain.handle('repo:upload', async (event, { folderPath, repoName }) => {
  const session = readSession();
  if (!session) return { ok: false, error: 'NO_SESSION' };

  const sendProgress = (percent) => {
    event.sender.send('repo:progress', { percent });
  };

  try {
    sendProgress(2);

    // 1. Crear el repositorio remoto en GitHub si no existe
    const createResp = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'User-Agent': 'NotaStudio-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: repoName, private: false })
    });

    if (!createResp.ok && createResp.status !== 422) {
      // 422 = el repo ya existe, lo tratamos como aceptable
      const errData = await createResp.json().catch(() => ({}));
      throw new Error(errData.message || 'No se pudo crear el repositorio en GitHub');
    }

    sendProgress(15);

    const remoteUrl = `https://github.com/${session.username}/${repoName}.git`;
    const gitDir = path.join(folderPath, '.git');

    if (!fs.existsSync(gitDir)) {
      await runGitCommand(['init'], folderPath);
    }
    sendProgress(25);

    // Configurar remoto
    await runGitCommand(['remote', 'remove', 'origin'], folderPath).catch(() => {});
    await runGitCommand(['remote', 'add', 'origin', remoteUrl], folderPath);
    sendProgress(35);

    await runGitCommand(['add', '.'], folderPath);
    sendProgress(45);

    await runGitCommand(['commit', '-m', 'Subida inicial desde NotaStudio', '--allow-empty'], folderPath)
      .catch(() => {}); // si no hay cambios para commitear, seguimos igual
    sendProgress(55);

    await runGitCommand(['branch', '-M', 'main'], folderPath);
    sendProgress(60);

    // Usamos una URL con token embebido solo en memoria del proceso, para autenticar el push
    const authRemote = `https://${session.username}:${session.accessToken}@github.com/${session.username}/${repoName}.git`;
    await runGitCommand(['push', '-u', authRemote, 'main', '--progress'], folderPath, (p) => {
      // el progreso real de "git push" se mapea entre 60% y 100%
      const mapped = 60 + Math.round((p / 100) * 40);
      sendProgress(Math.min(100, mapped));
    });

    sendProgress(100);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
