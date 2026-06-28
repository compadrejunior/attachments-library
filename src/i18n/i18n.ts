import i18next from 'i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

export async function initI18n(): Promise<void> {
  const lang = window.localStorage.getItem('language') ?? 'en';
  await i18next.init({
    lng: lang,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      'pt-BR': { translation: ptBR },
    },
    interpolation: { escapeValue: false },
  });
}

export const t = (key: string, options?: Record<string, unknown>): string =>
  i18next.t(key, options) as string;
