import React from 'react';

interface FileSelectorProps {
  inputPath: string;
  outputPath: string;
  onInputPathChange: (path: string) => void;
  onOutputPathChange: (path: string) => void;
  t: {
    title: string;
    inputLabel: string;
    inputPlaceholder: string;
    outputLabel: string;
    outputPlaceholder: string;
    browse: string;
    ready: string;
  };
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  inputPath,
  outputPath,
  onInputPathChange,
  onOutputPathChange,
  t
}) => {
  const handleSelectInput = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectInputFile();
      if (path) onInputPathChange(path);
    } else {
      // Simulação no desenvolvimento
      onInputPathChange("C:/exemplo/video_entrada.mp4");
    }
  };

  const handleSelectOutput = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectOutputFolder();
      if (path) onOutputPathChange(path);
    } else {
      // Simulação no desenvolvimento
      onOutputPathChange("C:/exemplo/pasta_saida/");
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/30 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
        <span className="text-2xl">📁</span>
        <span>{t.title}</span>
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-200">
            {t.inputLabel}
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputPath}
              readOnly
              className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              placeholder={t.inputPlaceholder}
            />
            <button
              onClick={handleSelectInput}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {t.browse}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-gray-200">
            {t.outputLabel}
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={outputPath}
              readOnly
              className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              placeholder={t.outputPlaceholder}
            />
            <button
              onClick={handleSelectOutput}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {t.browse}
            </button>
          </div>
        </div>
      </div>

      {inputPath && outputPath && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm">{t.ready}</p>
        </div>
      )}
    </div>
  );
};