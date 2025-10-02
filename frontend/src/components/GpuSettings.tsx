import React from 'react';

interface GpuSettingsProps {
  gpuMemory: number;
  scale: number;
  onGpuMemoryChange: (memory: number) => void;
  onScaleChange: (scale: number) => void;
  t: {
    title: string;
    gpuMemoryLabel: string;
    gpuMemoryHint: string;
    scaleLabel: string;
    scaleHint: string;
  };
}

export const GpuSettings: React.FC<GpuSettingsProps> = ({
  gpuMemory,
  scale,
  onGpuMemoryChange,
  onScaleChange,
  t
}) => {
  const gpuOptions = [2000, 4000, 6000, 8000, 10000, 12000, 16000, 24000];
  const scaleOptions = [2, 3, 4];

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/30 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
        <span className="text-2xl">⚙️</span>
        <span>{t.title}</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memória GPU */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-200">
            {t.gpuMemoryLabel}
          </label>
          <select
            value={gpuMemory}
            onChange={(e) => onGpuMemoryChange(Number(e.target.value))}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
          >
            {gpuOptions.map((memory) => (
              <option key={memory} value={memory}>
                {memory} MB
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-2">
            {t.gpuMemoryHint}
          </p>
        </div>

        {/* Escala */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-200">
            {t.scaleLabel}
          </label>
          <select
            value={scale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
          >
            {scaleOptions.map((scaleOption) => (
              <option key={scaleOption} value={scaleOption}>
                {scaleOption}x
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-2">
            {t.scaleHint}
          </p>
        </div>
      </div>
    </div>
  );
};