import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileSelector } from './FileSelector';
import { GpuSettings } from './GpuSettings';
import { ProgressBar } from './ProgressBar';
import { Logs } from './Logs';
import { ConversionConfig, ProgressData } from '../types';
import { Language } from '../hooks/useTranslation';
import { Translation } from '../types/translation';

interface VideoConverterProps {
  t: Translation;
  language: Language;
}

interface Metrics {
  fps?: number;
  currentFps?: number;
  elapsed: number;
  eta: number;
  framesProcessed: number;
  totalFrames: number;
  currentStage: string;
}

export const VideoConverter: React.FC<VideoConverterProps> = ({ t, language }) => {
  const [config, setConfig] = useState<Partial<ConversionConfig>>({
    gpuMemory: 6000,
    scale: 2,
    useGpu: true
  });
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(true); // Logs abertos por padrão no desktop
  
  // Referências para tracking de tempo
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const handleConfigUpdate = useCallback((updates: Partial<ConversionConfig>) => {
    setConfig((prev: Partial<ConversionConfig>) => ({ ...prev, ...updates }));
  }, []);

  // Função auxiliar para adicionar logs de forma segura
  const addLog = useCallback((message: string) => {
    setLogs((prev: string[]) => [...prev, message]);
  }, []);

  // Iniciar timer quando começar conversão
  const startConversionTimer = () => {
    startTimeRef.current = Date.now();
    setMetrics({
      fps: 0,
      currentFps: 0,
      elapsed: 0,
      eta: 0,
      framesProcessed: 0,
      totalFrames: 0,
      currentStage: 'starting'
    });

    // Atualizar tempo decorrido a cada segundo
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setMetrics((prev: Metrics | null) => { 
        if (!prev) return null;
        return {
          ...prev, 
          elapsed,
          eta: progress > 0 && progress < 100 ? Math.floor((elapsed / progress) * (100 - progress)) : 0
        };
      });
    }, 1000);
  };

  // Parar timer quando terminar
  const stopConversionTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  const handleStartConversion = async () => {
    if (!config.inputPath || !config.outputPath) {
      addLog(t.messages.error);
      return;
    }

    setIsConverting(true);
    setProgress(0);
    setLogs([]);
    setMetrics({
      fps: 0,
      currentFps: 0,
      elapsed: 0,
      eta: 0,
      framesProcessed: 0,
      totalFrames: 0,
      currentStage: 'starting'
    });
    
    // Iniciar timer
    startConversionTimer();
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.startConversion(config as ConversionConfig);
      } else {
        addLog(t.messages.simulation);
        simulateConversion();
      }
    } catch (error) {
      addLog(`${t.messages.error}: ${error}`);
      setIsConverting(false);
      stopConversionTimer();
    }
  };

  // Simulação para desenvolvimento
  const simulateConversion = () => {
    let simulatedProgress = 0;
    const totalFrames = 250;
    let frameCount = 0;
    
    const interval = setInterval(() => {
      simulatedProgress += 2;
      frameCount += 5;
      
      setProgress(simulatedProgress);

      if (simulatedProgress === 10) addLog(t.messages.extractingFrames);
      if (simulatedProgress === 25) addLog(t.messages.framesExtracted);
      if (simulatedProgress === 30) addLog(t.messages.startingUpscale);
      if (simulatedProgress === 50) addLog(t.messages.processingFrames);
      if (simulatedProgress === 75) addLog(t.messages.creatingVideo);
      if (simulatedProgress === 90) addLog(t.messages.addingAudio);

      setMetrics((prev: Metrics | null) => {
        if (!prev) return null;
        return {
          ...prev,
          fps: Math.random() * 30 + 10,
          framesProcessed: frameCount,
          totalFrames: totalFrames,
          currentStage: 
            simulatedProgress < 30 ? 'extracting_frames' :
            simulatedProgress < 80 ? 'upscaling' :
            'video_assembly'
        };
      });

      if (simulatedProgress >= 100) {
        clearInterval(interval);
        setIsConverting(false);
        addLog(t.messages.completed);
        stopConversionTimer();
      }
    }, 200);
  };

  const handleCancelConversion = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelConversion();
    }
    setIsConverting(false);
    stopConversionTimer();
    addLog(t.messages.canceled);
  };

  // Escutar progresso do Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (data: ProgressData) => {
      if (data.type === 'progress' && data.progress !== undefined) {
        const newProgress = Math.min(data.progress, 100);
        setProgress(newProgress);
      }
      
      if (data.type === 'metrics' && data.metrics) {
        setMetrics((prev: Metrics | null) => {
          if (!prev) return { ...data.metrics } as Metrics;
          return {
            ...prev,
            ...data.metrics,
            elapsed: prev.elapsed || 0,
            eta: prev.eta || 0
          };
        });
      }
      
      if (data.message && typeof data.message === 'string') {
        addLog(data.message);
        
        const frameMatch = data.message.match(/Processados\s+(\d+)\/(\d+)\s+frames/);
        if (frameMatch) {
          const [, processed, total] = frameMatch;
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return {
              ...prev,
              framesProcessed: parseInt(processed),
              totalFrames: parseInt(total)
            };
          });
        }
        
        const extractedMatch = data.message.match(/Extraídos\s+(\d+)\s+frames/);
        if (extractedMatch) {
          const [, extracted] = extractedMatch;
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return {
              ...prev,
              framesProcessed: parseInt(extracted),
              currentStage: 'extracting_frames'
            };
          });
        }
        
        if (data.message.includes('Extraindo frames')) {
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return { ...prev, currentStage: 'extracting_frames' };
          });
        } else if (data.message.includes('Iniciando upscale')) {
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return { ...prev, currentStage: 'upscaling' };
          });
        } else if (data.message.includes('Montando vídeo')) {
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return { ...prev, currentStage: 'video_assembly' };
          });
        } else if (data.message.includes('Adicionando áudio')) {
          setMetrics((prev: Metrics | null) => {
            if (!prev) return null;
            return { ...prev, currentStage: 'adding_audio' };
          });
        }
      }
      
      if (data.type === 'complete') {
        setIsConverting(false);
        setProgress(100);
        setMetrics((prev: Metrics | null) => {
          if (!prev) return null;
          return { ...prev, currentStage: 'complete' };
        });
        stopConversionTimer();
        addLog(t.messages.completed);
      }
      
      if (data.type === 'error' && data.message) {
        setIsConverting(false);
        stopConversionTimer();
        addLog(`${t.messages.error}: ${data.message}`);
      }
    };

    window.electronAPI.onConversionProgress(handleProgress);
    
    return () => {
      window.electronAPI?.removeAllListeners('conversion-progress');
      stopConversionTimer();
    };
  }, [addLog, t]);

  // Calcular FPS em tempo real
  useEffect(() => {
    if (metrics?.framesProcessed && metrics.framesProcessed > 0 && metrics?.elapsed && metrics.elapsed > 0) {
      const currentFps = metrics.framesProcessed / metrics.elapsed;
      setMetrics((prev: Metrics | null) => {
        if (!prev) return null;
        return { 
          ...prev, 
          currentFps: Math.round(currentFps * 10) / 10
        };
      });
    }
  }, [metrics?.framesProcessed, metrics?.elapsed]);

  const isReady = Boolean(
    config.inputPath && 
    config.outputPath && 
    config.gpuMemory && 
    config.scale
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Status Banner */}
      {isConverting && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span className="font-semibold">{t.progress.converting}</span>
          </div>
          <span className="text-sm text-blue-300 hidden sm:block">
            {t.progress.doNotClose}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          <FileSelector
            inputPath={config.inputPath || ''}
            outputPath={config.outputPath || ''}
            onInputPathChange={(path: string) => handleConfigUpdate({ inputPath: path })}
            onOutputPathChange={(path: string) => handleConfigUpdate({ outputPath: path })}
            t={t.fileSelector}
          />

          <GpuSettings
            gpuMemory={config.gpuMemory || 6000}
            scale={config.scale || 2}
            onGpuMemoryChange={(memory: number) => handleConfigUpdate({ gpuMemory: memory })}
            onScaleChange={(scale: number) => handleConfigUpdate({ scale })}
            t={t.gpuSettings}
          />
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <ProgressBar 
            progress={progress} 
            metrics={metrics}
            isConverting={isConverting}
            t={t.progress}
          />

          {/* Logs Expansível - Mobile Friendly */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 overflow-hidden">
            <button
              onClick={() => setIsLogsOpen(!isLogsOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">📋</span>
                <h3 className="text-lg font-semibold text-left">{t.logs.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full hidden sm:block">
                  {isLogsOpen ? 'Recolher' : 'Expandir'}
                </span>
                <div className={`transform transition-transform duration-300 ${
                  isLogsOpen ? 'rotate-180' : 'rotate-0'
                }`}>
                  <span className="text-gray-400">▼</span>
                </div>
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isLogsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-4 border-t border-gray-700/30">
                <Logs logs={logs} t={t.logs} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-4 border-t border-gray-700/50">
        <button
          onClick={handleStartConversion}
          disabled={!isReady || isConverting}
          className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isConverting ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{t.buttons.converting}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <span>🚀</span>
              <span>{t.buttons.start}</span>
            </div>
          )}
        </button>
        
        {isConverting && (
          <button
            onClick={handleCancelConversion}
            className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold text-lg hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <div className="flex items-center justify-center space-x-3">
              <span>⏹️</span>
              <span>{t.buttons.cancel}</span>
            </div>
          </button>
        )}
      </div>

      {/* Informações do Sistema - Aba Expansível */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 overflow-hidden">
        <button
          onClick={() => setIsSystemInfoOpen(!isSystemInfoOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">ℹ️</span>
            <h3 className="text-lg font-semibold text-left">{t.systemInfo.title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full hidden sm:block">
              {isSystemInfoOpen ? 'Recolher' : 'Expandir'}
            </span>
            <div className={`transform transition-transform duration-300 ${
              isSystemInfoOpen ? 'rotate-180' : 'rotate-0'
            }`}>
              <span className="text-gray-400">▼</span>
            </div>
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSystemInfoOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-4 pt-2 border-t border-gray-700/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs">{t.systemInfo.mode}</span>
                <span className="font-medium">
                  {window.electronAPI ? t.systemInfo.production : t.systemInfo.development}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs">{t.systemInfo.gpu}</span>
                <span className="font-medium">
                  {config.useGpu ? t.systemInfo.gpuEnabled : t.systemInfo.gpuDisabled}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs">{t.systemInfo.language}</span>
                <span className="font-medium">
                  {language === 'pt-BR' ? t.language.portuguese : 
                   language === 'en' ? t.language.english : t.language.spanish}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};