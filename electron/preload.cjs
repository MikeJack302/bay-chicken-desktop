const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bay', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSettings: value => ipcRenderer.invoke('settings:save', value),
  previewReminder:value=>ipcRenderer.invoke('reminders:preview',value),
  snoozeReminder:ids=>ipcRenderer.invoke('reminders:snooze',ids),
  dismissReminder:()=>ipcRenderer.send('reminders:dismiss'),
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
  dragStart: point => ipcRenderer.send('pet:drag-start', point),
  dragEnd: options => ipcRenderer.send('pet:drag-end', options),
  movePet: (x,y) => ipcRenderer.send('pet:move', {x,y}),
  dockEdge: side => ipcRenderer.send('edge:dock',side),
  leaveEdge: () => ipcRenderer.send('edge:leave'),
  reportGeometry: g => ipcRenderer.send('pet:geometry',g),
  home: () => ipcRenderer.send('pet:home'),
  openHelp: () => ipcRenderer.send('help:open'),
  reloadPet: () => ipcRenderer.send('pet:reload'),
  openReleases: () => ipcRenderer.send('releases:open'),
  quit: () => ipcRenderer.send('app:quit'),
  on: (channel, listener) => {
    if (!['state', 'action', 'chat:delta', 'chat:status', 'panel:tab', 'bubble', 'cursor', 'pet:status','drag:ended','help:open','edge:changed','reminder','reminder:status'].includes(channel)) return () => {};
    const handler = (_event, data) => listener(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
