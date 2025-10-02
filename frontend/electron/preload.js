const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File selection
  selectInputFile: () => ipcRenderer.invoke('select-input-file'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  
  // Conversion control
  startConversion: (config) => ipcRenderer.invoke('start-conversion', config),
  cancelConversion: () => ipcRenderer.invoke('cancel-conversion'),
  
  // Progress listening
  onConversionProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});