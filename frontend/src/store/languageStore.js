import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import translations from '../i18n/translations';

// Keep track of pending fetches outside persistent state to avoid serializing Sets/promises
const pendingFetches = new Set();

export const useLanguageStore = create(persist(
  (set, get) => ({
    language: 'en',
    translationsCache: {}, // { 'hi': { 'dynamic text': 'translated text' } }

    setLanguage: (lang) => set({ language: lang }),

    // Main translation function
    t: (key) => {
      if (!key) return '';
      const lang = get().language;

      // 1. Static Dictionary check
      const dict = translations[lang] || translations['en'];
      const hasStaticKey = translations['en'][key] !== undefined;

      if (hasStaticKey) {
        return dict[key] || translations['en'][key] || key;
      }

      // 2. If it's English, return the text directly (no translation needed)
      if (lang === 'en') {
        return key;
      }

      // 3. Dynamic Cache check
      const cache = get().translationsCache[lang] || {};
      if (cache[key]) {
        return cache[key];
      }

      // 4. Trigger MyMemory API Translation in the background
      const fetchKey = `${lang}:${key}`;
      if (!pendingFetches.has(fetchKey)) {
        pendingFetches.add(fetchKey);
        
        // Asynchronously fetch the translation
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(key)}&langpair=en|${lang}`;
        fetch(url)
          .then(res => res.json())
          .then(data => {
            const translatedText = data?.responseData?.translatedText;
            if (translatedText) {
              set(state => {
                const newCache = { ...state.translationsCache };
                if (!newCache[lang]) newCache[lang] = {};
                newCache[lang][key] = translatedText;
                return { translationsCache: newCache };
              });
            }
          })
          .catch(err => {
            console.error('Translation error:', err);
          })
          .finally(() => {
            pendingFetches.delete(fetchKey);
          });
      }

      // Fallback to original key/text while loading
      return key;
    },
  }),
  { 
    name: 'transitops-language',
    // Only persist language and translationsCache, not runtime functions
    partialize: (state) => ({
      language: state.language,
      translationsCache: state.translationsCache,
    }),
  }
));
