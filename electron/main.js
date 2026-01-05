const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

const YTDLP_FILE_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const FFMPEG_FILE_NAME = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const CONFIG_FILE_NAME = 'yt-downloader-config.json';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In packaged app, __dirname points to resources/app.asar/electron or resources/app/electron
    // dist folder is at the same level as electron folder
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading HTML from:', htmlPath);
    console.log('File exists:', fs.existsSync(htmlPath));
    
    mainWindow.loadFile(htmlPath).catch((err) => {
      console.error('Failed to load HTML:', err);
      // Fallback: try alternative path
      const altPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
      console.log('Trying alternative path:', altPath);
      mainWindow.loadFile(altPath).catch((err2) => {
        console.error('Failed to load HTML from alternative path:', err2);
      });
    });
    
    // Open devtools in packaged mode for debugging (remove in production if needed)
    // mainWindow.webContents.openDevTools();
  }

  // Log errors from renderer
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getConfigPath() {
  const userData = app.getPath('userData');
  return path.join(userData, CONFIG_FILE_NAME);
}

function readConfig() {
  try {
    const cfgPath = getConfigPath();
    if (!fs.existsSync(cfgPath)) return {};
    const raw = fs.readFileSync(cfgPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfig(config) {
  try {
    const cfgPath = getConfigPath();
    fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write config:', e);
  }
}

async function ensureYtDlp() {
  // 1. Prefer yt-dlp binary shipped with app (electron/bin/yt-dlp.exe)
  // In dev: __dirname = project/electron
  // In packaged: __dirname = resources/app/electron
  const bundledPath = path.join(__dirname, 'bin', YTDLP_FILE_NAME);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  // 2. Fallback: try from system PATH (optional, can be removed if not needed)
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    await new Promise((resolve, reject) => {
      const p = spawn(which, ['yt-dlp']);
      p.on('exit', (code) => {
        if (code === 0) resolve();
        else reject();
      });
    });
    return 'yt-dlp';
  } catch {
    throw new Error(
      `yt-dlp not found. Expected at: ${bundledPath}. Please ensure yt-dlp.exe is placed in electron/bin/ folder.`
    );
  }
}

async function ensureFfmpeg() {
  // 1. Prefer ffmpeg binary shipped with app (electron/bin/ffmpeg.exe)
  // In dev: __dirname = project/electron
  // In packaged: __dirname = resources/app/electron
  const bundledPath = path.join(__dirname, 'bin', FFMPEG_FILE_NAME);
  if (fs.existsSync(bundledPath)) {
    return { path: bundledPath, status: 'ok' };
  }

  // 2. Try ffmpeg from system PATH
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    await new Promise((resolve, reject) => {
      const p = spawn(which, ['ffmpeg']);
      p.on('exit', (code) => {
        if (code === 0) resolve();
        else reject();
      });
    });
    return { path: 'ffmpeg', status: 'system' };
  } catch {
    return { path: null, status: 'missing' };
  }
}

ipcMain.handle('downloader:ensureBinaries', async () => {
  try {
    const ytdlpPath = await ensureYtDlp();
    const ffmpegInfo = await ensureFfmpeg();
    return {
      success: true,
      ytdlpPath,
      ffmpeg: ffmpegInfo,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('downloader:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folder = result.filePaths[0];
  const cfg = readConfig();
  writeConfig({ ...cfg, outputDir: folder });
  return folder;
});

ipcMain.handle('downloader:getConfig', async () => {
  const cfg = readConfig();
  return { success: true, config: cfg };
});

ipcMain.handle('downloader:start', async (event, options) => {
  const {
    url,
    mode, // 'audio', 'video', 'both'
    quality, // 'best','high','medium','low'
    outputDir,
  } = options;

  try {
    const ytdlpPath = await ensureYtDlp();
    const ffmpegInfo = await ensureFfmpeg();

    if (!url || !outputDir) {
      throw new Error('Invalid URL or output directory');
    }

    const args = ['-o', path.join(outputDir, '%(title)s.%(ext)s')];

    // quality mapping
    let qualitySelector = 'bestvideo+bestaudio/best';
    if (quality === 'high') qualitySelector = 'bv[height<=1080]+ba/best';
    else if (quality === 'medium') qualitySelector = 'bv[height<=720]+ba/best[height<=720]';
    else if (quality === 'low') qualitySelector = 'bv[height<=480]+ba/best[height<=480]';

    if (mode === 'audio') {
      args.push('-f', 'bestaudio', '-x', '--audio-format', 'mp3');
    } else if (mode === 'video') {
      // video only, no audio
      args.push('-f', 'bestvideo');
    } else {
      // both audio+video, merged
      args.push('-f', qualitySelector);
    }

    if (ffmpegInfo.status === 'ok' || ffmpegInfo.status === 'system') {
      if (ffmpegInfo.path !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegInfo.path);
      }
    }

    args.push(url);

    const child = spawn(ytdlpPath, args, { shell: false });

    child.stdout.on('data', (data) => {
      mainWindow?.webContents.send('downloader:progress', data.toString());
    });

    child.stderr.on('data', (data) => {
      mainWindow?.webContents.send('downloader:progress', data.toString());
    });

    child.on('close', (code) => {
      mainWindow?.webContents.send('downloader:finished', {
        success: code === 0,
        code,
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


