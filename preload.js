const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 文件选择
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 获取应用路径
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  
  // 显示消息框
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // 平台信息
  platform: process.platform,
  
  // 检查是否是Electron环境
  isElectron: true
});

// 暴露一些实用工具
contextBridge.exposeInMainWorld('utils', {
  // 路径操作
  path: {
    join: (...args) => require('path').join(...args),
    basename: (path) => require('path').basename(path),
    dirname: (path) => require('path').dirname(path),
    extname: (path) => require('path').extname(path)
  }
}); 