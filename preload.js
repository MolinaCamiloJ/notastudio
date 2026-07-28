// preload.js — Puente seguro entre el proceso principal y la interfaz
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notastudio', {
  login: () => ipcRenderer.invoke('auth:login'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  selectFolder: () => ipcRenderer.invoke('folder:select'),
  uploadRepo: (data) => ipcRenderer.invoke('repo:upload', data),
  onUploadProgress: (callback) => {
    ipcRenderer.removeAllListeners('repo:progress');
    ipcRenderer.on('repo:progress', (event, data) => callback(data));
  },
  quitApp: () => ipcRenderer.invoke('app:quit')
});
