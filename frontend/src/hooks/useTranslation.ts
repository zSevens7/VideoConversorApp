import { useMemo } from 'react';
import { Translation } from '../types/translation';

// Importações das traduções
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

export type Language = 'pt-BR' | 'en' | 'es';

const translations: Record<Language, Translation> = {
  'pt-BR': ptBR as Translation,
  'en': en as Translation,
  'es': es as Translation
};

export function useTranslation(language: Language): Translation {
  const t = useMemo(() => translations[language], [language]);
  
  return t;
}