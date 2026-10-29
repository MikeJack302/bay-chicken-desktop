const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bay', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSettings: value => ipcRenderer.invoke('settings:save', value),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  chat: text => ipcRenderer.invoke('chat:send', text),
  cancelChat: () => ipcRenderer.send('chat:cancel'),
  action: name => ipcRenderer.send('pet:action', name),
  reportPet: value => ipcRenderer.send('pet:status', value),
  openPanel: tab => ipcRenderer.send('panel:open', tab),
  togglePanel: () => ipcRenderer.send('panel:toggle'),
  resizePanel: tab => ipcRenderer.send('panel:resize', tab),
  closePanel: () => ipcRenderer.send('panel:close'),
  ignoreMouse: value => ipcRenderer.send('pet:ignore', !!value),
  dragStart: () => ipcRenderer.send('pet:drag-start'),
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  quit: () => ipcRenderer.send('app:quit'),
  on: (channel, listener) => {
    if (!['state', 'action', 'chat:delta', 'chat:status', 'panel:tab', 'bubble', 'cursor', 'pet:status'].includes(channel)) return () => {};
    const handler = (_event, data) => listener(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
