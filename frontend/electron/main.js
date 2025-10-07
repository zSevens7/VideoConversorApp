const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let pythonProcess = null;

// DEBUG: Log inicial
console.log('🚀 Electron iniciando...');
console.log('📁 Diretório atual:', process.cwd());
console.log('📁 __dirname:', __dirname);
console.log('📦 App is packaged?', app.isPackaged);

// 🔥 OTIMIZAÇÕES DE GPU PARA ELECTRON
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('--enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('--enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('--enable-accelerated-video');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');
app.commandLine.appendSwitch('--disable-gpu-sandbox');

// Função CORRIGIDA para obter caminhos
function getBackendPath() {
  if (!app.isPackaged) {
    const projectRoot = process.cwd();
    const backendPath = path.join(projectRoot, '../backend/scripts/upscale.py');
    
    console.log('🔧 Modo DEV - Project root:', projectRoot);
    console.log('🔧 Modo DEV - Backend path:', backendPath);
    console.log('🔧 Backend existe:', fs.existsSync(backendPath));
    
    return backendPath;
  } else {
    const prodPath = path.join(process.resourcesPath, 'backend/scripts/upscale.py');
    console.log('📦 Modo PROD - Backend path:', prodPath);
    console.log('📦 Backend existe:', fs.existsSync(prodPath));
    return prodPath;
  }
}

// Função para encontrar Python
function getPythonPath() {
  console.log('🐍 Procurando Python...');
  
  if (process.platform === 'win32') {
    const possibleCommands = ['python', 'python3', 'py'];
    
    for (const cmd of possibleCommands) {
      try {
        console.log(`🔍 Tentando comando: ${cmd}`);
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        console.log(`✅ Python encontrado: ${cmd}`);
        return cmd;
      } catch (error) {
        console.log(`❌ ${cmd} não disponível: ${error.message}`);
      }
    }
    
    console.log('🔍 Procurando em caminhos comuns do Windows...');
    const commonPaths = [
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python313\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python312\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python311\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python310\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python39\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python38\\python.exe',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'C:\\Python38\\python.exe'
    ];
    
    for (const pythonPath of commonPaths) {
      console.log(`🔍 Verificando: ${pythonPath}`);
      if (fs.existsSync(pythonPath)) {
        console.log(`✅ Python encontrado em: ${pythonPath}`);
        return pythonPath;
      }
    }
    
    console.log('❌ Python não encontrado em nenhum caminho comum');
    return 'python';
  } else {
    return 'python3';
  }
}

// Função para verificar instalação do Python
function checkPythonInstallation() {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    console.log(`🔍 Verificando instalação do Python: ${pythonPath}`);
    
    const testProcess = spawn(pythonPath, ['--version']);
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python está disponível e funcionando');
        resolve(true);
      } else {
        console.log(`❌ Python retornou código: ${code}`);
        reject(new Error(`Python não está disponível (código: ${code})`));
      }
    });
    
    testProcess.on('error', (error) => {
      console.log('❌ Erro ao verificar Python:', error.message);
      reject(error);
    });
  });
}

function createWindow() {
  console.log('🪟 Criando janela principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true, // Mantém segurança
      allowRunningInsecureContent: false // Segurança
    },
    show: false,
    titleBarStyle: 'default',
    backgroundColor: '#1a1a1a' // Cor de fundo durante carregamento
  });

  // Verificar preload
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('📁 Caminho do preload:', preloadPath);
  console.log('📁 Preload existe:', fs.existsSync(preloadPath));

  // Verificar HTML
  const htmlPath = path.join(__dirname, '../dist/index.html');
  console.log('📁 Caminho do HTML:', htmlPath);
  console.log('📁 HTML existe:', fs.existsSync(htmlPath));

  // SEMPRE carregar o build de produção
  console.log('📦 Carregando build de produção...');
  
  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath);
  } else {
    console.log('❌ HTML não encontrado, tentando caminhos alternativos...');
    const alternativePaths = [
      path.join(process.cwd(), 'dist/index.html'),
      path.join(__dirname, '../../dist/index.html')
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log('✅ Encontrado em:', altPath);
        mainWindow.loadFile(altPath);
        break;
      }
    }
  }


  // Event listeners melhorados
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Página carregada com sucesso!');
    // Adicionar CSP para segurança
    mainWindow.webContents.executeJavaScript(`
      const meta = document.createElement('meta');
      meta.httpEquiv = "Content-Security-Policy";
      meta.content = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
      document.head.appendChild(meta);
    `).catch(console.error);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('❌ Falha no carregamento:', errorCode, errorDescription);
  });

  // Prevenir navegação externa
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🔒 Tentativa de abrir URL externa:', url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    console.log('👁️ Janela pronta para mostrar');
    mainWindow.show();
    
    // Focar na janela
    if (process.platform === 'win32') {
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    console.log('❌ Janela fechada');
    mainWindow = null;
  });

  // Salvar e restaurar tamanho da janela
  try {
    const windowState = JSON.parse(fs.readFileSync(path.join(__dirname, 'window-state.json'), 'utf8'));
    if (windowState.width && windowState.height) {
      mainWindow.setSize(windowState.width, windowState.height);
    }
    if (windowState.x && windowState.y) {
      mainWindow.setPosition(windowState.x, windowState.y);
    }
  } catch (e) {
    // Ignora erro se o arquivo não existir
  }
}

// Salvar estado da janela
function saveWindowState() {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    const windowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    };
    try {
      fs.writeFileSync(path.join(__dirname, 'window-state.json'), JSON.stringify(windowState));
    } catch (e) {
      console.log('❌ Erro ao salvar estado da janela:', e.message);
    }
  }
}

// Inicialização
app.whenReady().then(async () => {
  console.log('⚡ App pronto, verificando Python e Backend...');
  
  try {
    await checkPythonInstallation();
    
    // Verificar backend também
    const backendPath = getBackendPath();
    console.log('🔍 Verificando backend em:', backendPath);
    
    if (!fs.existsSync(backendPath)) {
      throw new Error(`Backend não encontrado: ${backendPath}`);
    } else {
      console.log('✅ Backend encontrado!');
    }
    
    console.log('✅ Todas as verificações passaram, criando janela...');
    createWindow();
  } catch (error) {
    console.error('❌ Falha na inicialização:', error.message);
    
    dialog.showErrorBox(
      'Erro de Inicialização',
      `Erro: ${error.message}\n\n` +
      'Verifique se:\n' +
      '1. Python está instalado e no PATH\n' +
      '2. O backend está na pasta correta\n' +
      '3. Todos os arquivos necessários existem'
    );
    
    setTimeout(() => {
      app.quit();
    }, 5000);
  }
});

app.on('window-all-closed', () => {
  console.log('🔄 Todas as janelas fechadas');
  saveWindowState();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔘 App ativada');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('👋 App fechando...');
  saveWindowState();
});

app.on('will-quit', () => {
  console.log('🔚 Finalizando processos...');
  if (pythonProcess) {
    console.log('🛑 Finalizando processo Python...');
    pythonProcess.kill();
    pythonProcess = null;
  }
});

// IPC Handlers - COM MELHORIAS DE PERFORMANCE
ipcMain.handle('select-input-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ]
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('start-conversion', async (event, config) => {
  console.log('🎬 Iniciando conversão com config:', config);
  
  // Validação mais robusta
  if (!config.inputPath || !config.outputPath) {
    const errorMsg = 'Selecione os arquivos de entrada e saída!';
    console.log('❌', errorMsg);
    throw new Error(errorMsg);
  }

  // 🔥 ADICIONE ESTA LINHA - Garante que a memória GPU seja enviada
  config.gpuMemory = config.gpuMemory || 8000; // Default 8000MB se não especificado
  
  console.log('🎮 Memória GPU configurada:', config.gpuMemory, 'MB');

  // Verificar se o arquivo de entrada existe
  if (!fs.existsSync(config.inputPath)) {
    const errorMsg = `Arquivo de entrada não encontrado: ${config.inputPath}`;
    console.log('❌', errorMsg);
    throw new Error(errorMsg);
  }

  return new Promise((resolve, reject) => {
    try {
      const backendPath = getBackendPath();
      const pythonPath = getPythonPath();

      console.log(`🚀 Executando: ${pythonPath} ${backendPath}`);
      console.log(`📁 Backend path: ${backendPath}`);
      console.log(`📁 Backend existe: ${fs.existsSync(backendPath)}`);
      console.log(`📁 Input: ${config.inputPath}`);
      console.log(`📁 Output: ${config.outputPath}`);
      console.log(`🎮 GPU Memory Limit: ${config.gpuMemory || 'Auto'}`);
      console.log(`⚡ Scale: ${config.scale || 2}`);

      // Verificar se o backend existe
      if (!fs.existsSync(backendPath)) {
        const errorMsg = `Arquivo Python não encontrado: ${backendPath}`;
        console.log('❌', errorMsg);
        throw new Error(errorMsg);
      }

      // Configurações otimizadas para o processo Python
      const processEnv = {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        CUDA_VISIBLE_DEVICES: '0' // Forçar GPU 0
      };

      pythonProcess = spawn(pythonPath, [backendPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(backendPath),
        env: processEnv,
        windowsHide: false // Manter visível no Windows
      });

      console.log('✅ Processo Python iniciado com PID:', pythonProcess.pid);

      // Enviar configuração para o Python
      pythonProcess.stdin.write(JSON.stringify(config));
      pythonProcess.stdin.end();

      let stdoutBuffer = '';
      let stderrBuffer = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;
        
        // Processar linhas completas
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || ''; // Mantém linha incompleta
        
        lines.forEach(line => {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              mainWindow.webContents.send('conversion-progress', message);
            } catch (e) {
              if (line.trim().length > 0) {
                mainWindow.webContents.send('conversion-progress', {
                  type: 'log',
                  message: line.trim()
                });
              }
            }
          }
        });
      });

      pythonProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        stderrBuffer += errorOutput;
        console.log('❌ Python stderr:', errorOutput);
        
        // Enviar erros críticos imediatamente
        if (errorOutput.includes('out of memory') || errorOutput.includes('CUDA error')) {
          mainWindow.webContents.send('conversion-progress', {
            type: 'error',
            message: `Erro GPU: ${errorOutput}`
          });
        }
      });

      pythonProcess.on('close', (code) => {
        console.log(`🔚 Processo Python finalizado com código: ${code}`);
        
        // Processar qualquer buffer restante
        if (stdoutBuffer.trim()) {
          try {
            const message = JSON.parse(stdoutBuffer);
            mainWindow.webContents.send('conversion-progress', message);
          } catch (e) {
            // Ignora erro de parse
          }
        }
        
        if (code === 0) {
          mainWindow.webContents.send('conversion-progress', {
            type: 'complete',
            message: 'Conversão concluída com sucesso!'
          });
          resolve({ success: true });
        } else {
          const errorMsg = `Processo finalizado com código ${code}`;
          mainWindow.webContents.send('conversion-progress', {
            type: 'error',
            message: errorMsg
          });
          
          // Incluir stderr no erro se disponível
          const fullError = stderrBuffer ? `${errorMsg}\n\nDetalhes:\n${stderrBuffer}` : errorMsg;
          reject(new Error(fullError));
        }
        pythonProcess = null;
      });

      pythonProcess.on('error', (error) => {
        console.log('💥 Erro no processo Python:', error);
        const errorMsg = `Erro ao executar Python: ${error.message}. Verifique a instalação do Python.`;
        
        mainWindow.webContents.send('conversion-progress', {
          type: 'error',
          message: errorMsg
        });
        reject(error);
        pythonProcess = null;
      });

    } catch (error) {
      console.log('💥 Erro no start-conversion:', error);
      reject(error);
    }
  });
});

ipcMain.handle('cancel-conversion', async () => {
  console.log('⏹️ Cancelando conversão...');
  if (pythonProcess) {
    // Tentar finalizar graciosamente primeiro
    pythonProcess.kill('SIGTERM');
    
    // Forçar kill após 3 segundos se necessário
    setTimeout(() => {
      if (pythonProcess) {
        pythonProcess.kill('SIGKILL');
        pythonProcess = null;
      }
    }, 3000);
    
    console.log('✅ Comando de cancelamento enviado');
    return { success: true };
  }
  console.log('ℹ️ Nenhuma conversão em andamento');
  return { success: false, error: 'Nenhuma conversão em andamento' };
});

ipcMain.handle('check-python', async () => {
  try {
    await checkPythonInstallation();
    return { success: true, message: 'Python está disponível' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Novo handler para verificar GPU
ipcMain.handle('check-gpu', async () => {
  try {
    if (process.platform === 'win32') {
      const result = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', { 
        encoding: 'utf8',
        timeout: 10000 
      });
      
      const gpuInfo = result.trim().split('\n')[0].split(', ');
      return {
        success: true,
        gpuName: gpuInfo[0],
        memoryTotal: parseInt(gpuInfo[1]),
        message: `GPU detectada: ${gpuInfo[0]} com ${gpuInfo[1]} MB`
      };
    }
    return { success: false, error: 'Verificação de GPU disponível apenas no Windows' };
  } catch (error) {
    return { 
      success: false, 
      error: `Não foi possível detectar GPU: ${error.message}` 
    };
  }
});