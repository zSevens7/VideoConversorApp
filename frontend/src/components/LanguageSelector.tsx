import React from 'react';
import { Language } from '../hooks/useTranslation';

interface LanguageSelectorProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: {
    portuguese: string;
    english: string;
    spanish: string;
  };
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  onLanguageChange,
  t
}) => {
  const languages = [
    { code: 'pt-BR' as Language, name: t.portuguese },
    { code: 'en' as Language, name: t.english },
    { code: 'es' as Language, name: t.spanish }
  ];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-300">🌐</span>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};