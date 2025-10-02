export interface Translation {
  header: {
    title: string;
  };
  language: {
    portuguese: string;
    english: string;
    spanish: string;
  };
  fileSelector: {
    title: string;
    inputLabel: string;
    inputPlaceholder: string;
    outputLabel: string;
    outputPlaceholder: string;
    browse: string;
    ready: string;
  };
  gpuSettings: {
    title: string;
    gpuMemoryLabel: string;
    gpuMemoryHint: string;
    scaleLabel: string;
    scaleHint: string;
  };
  progress: {
    title: string;
    converting: string;
    doNotClose: string;
  };
  logs: {
    title: string;
    waiting: string;
  };
  buttons: {
    start: string;
    cancel: string;
    converting: string;
  };
  systemInfo: {
    title: string;
    mode: string;
    gpu: string;
    language: string;
    production: string;
    development: string;
    gpuEnabled: string;
    gpuDisabled: string;
  };
  messages: {
    simulation: string;
    error: string;
    canceled: string;
    completed: string;
    extractingFrames: string;
    framesExtracted: string;
    startingUpscale: string;
    processingFrames: string;
    creatingVideo: string;
    addingAudio: string;
  };
}