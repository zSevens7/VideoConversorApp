export interface ConversionConfig {
  inputPath: string;
  outputPath: string;
  scale: number;
  gpuMemory: number;
  useGpu: boolean;
}

export interface ProgressData {
  type: 'progress' | 'metrics' | 'error' | 'complete' | 'log';
  progress?: number;
  message?: string;
  stage?: string;
  metrics?: {
    totalFrames?: number;
    fps?: number;
    originalWidth?: number;
    originalHeight?: number;
    currentStage?: string;
  };
}

export interface ElectronAPI {
  selectInputFile: () => Promise<string | null>;
  selectOutputFolder: () => Promise<string | null>;
  startConversion: (config: ConversionConfig) => Promise<{ success: boolean; error?: string }>;
  cancelConversion: () => Promise<{ success: boolean; error?: string }>;
  onConversionProgress: (callback: (data: ProgressData) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}