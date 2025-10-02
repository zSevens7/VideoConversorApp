import React, { useState } from 'react';
import { VideoConverter } from './components/VideoConverter';
import { LanguageSelector } from './components/LanguageSelector';
import { useTranslation, Language } from './hooks/useTranslation';
import './App.css';

function App() {
  const [language, setLanguage] = useState<Language>('pt-BR');
  const t = useTranslation(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-lg border-b border-gray-700/50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎬</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {t.header.title}
            </h1>
          </div>
          <LanguageSelector 
            language={language} 
            onLanguageChange={setLanguage} 
            t={t.language}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <VideoConverter t={t} language={language} />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/50 border-t border-gray-700/30 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
          <p>Video Converter App - Feito Por Gabriel Teperino Percegoni Figueira - {t.header.title}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;