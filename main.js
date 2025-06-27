const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// 修复macOS的PATH问题
require('fix-path')();

let mainWindow;
let backendProcess;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Python后端进程管理
function startBackend() {
  return new Promise((resolve, reject) => {
    let pythonPath;
    let scriptPath;
    
    if (isDev) {
      // 开发模式：使用源码
      pythonPath = 'python';
      scriptPath = path.join(__dirname, 'backend', 'src', 'main.py');
    } else {
      // 生产模式：使用打包的可执行文件
      const platform = process.platform;
      const executableName = platform === 'win32' ? 'para-backend.exe' : 'para-backend';
      scriptPath = path.join(process.resourcesPath, 'backend', executableName);
      pythonPath = scriptPath;
    }

    console.log(`启动后端: ${pythonPath} ${isDev ? scriptPath : ''}`);
    
    // 设置环境变量
    const env = {
      ...process.env,
      PORT: '5002',
      FLASK_DEBUG: 'False',
      DB_PATH: path.join(app.getPath('userData'), 'app.db')
    };

    if (isDev) {
      backendProcess = spawn(pythonPath, [scriptPath], { env });
    } else {
      backendProcess = spawn(pythonPath, [], { env });
    }

    backendProcess.stdout.on('data', (data) => {
      console.log(`后端输出: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`后端错误: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`后端进程退出，退出码: ${code}`);
    });

    backendProcess.on('error', (error) => {
      console.error('启动后端失败:', error);
      reject(error);
    });

    // 等待后端启动
    setTimeout(() => {
      resolve();
    }, 3000);
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'resources', 'icon.png'),
    title: 'PARA文件分类工具',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // 先不显示，等加载完成后再显示
  });

  // 开发模式加载开发服务器，生产模式加载本地文件
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 拦截新窗口打开，使用系统默认浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC处理程序
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择文件夹'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '所有文件', extensions: ['*'] },
      { name: '文档', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
    ],
    title: '选择文件'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// 应用事件
app.whenReady().then(async () => {
  try {
    console.log('启动PARA文件分类工具...');
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('启动应用失败:', error);
    dialog.showErrorBox('启动失败', `无法启动应用后端服务: ${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
} 