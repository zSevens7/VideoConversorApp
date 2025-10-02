import React from 'react';

interface ProgressBarProps {
  progress: number;
  metrics: any;
  isConverting: boolean;
  t: {
    title: string;
    converting: string;
    doNotClose: string;
  };
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  metrics,
  isConverting,
  t
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🔥 CORREÇÃO: Garantir que o progresso nunca passe de 100%
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/30 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 flex items-center space-x-3">
        <span className="text-2xl">📊</span>
        <span>{t.title}</span>
      </h2>
      
      {/* Barra de Progresso */}
      <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      
      {/* Informações */}
      <div className="text-center mb-4">
        <span className="text-2xl font-bold">{Math.round(safeProgress)}%</span>
        {isConverting && (
          <span className="text-gray-400 ml-2">- {t.converting}</span>
        )}
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-400">FPS</div>
            <div className="font-semibold">
              {metrics.currentFps?.toFixed(1) || metrics.fps?.toFixed(1) || '0'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Tempo Decorrido</div>
            <div className="font-semibold">{formatTime(metrics.elapsed)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Tempo Restante</div>
            <div className="font-semibold">{formatTime(metrics.eta)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Frames</div>
            <div className="font-semibold">
              {metrics.framesProcessed || 0}/{metrics.totalFrames || 0}
            </div>
          </div>
        </div>
      )}

      {/* Estágio Atual */}
      {metrics?.currentStage && (
        <div className="mt-3 text-center">
          <div className="text-gray-400 text-sm">Estágio</div>
          <div className="font-semibold text-blue-400 capitalize">
            {metrics.currentStage.replace(/_/g, ' ')}
          </div>
        </div>
      )}

      {isConverting && (
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-sm text-center">{t.doNotClose}</p>
        </div>
      )}
    </div>
  );
};