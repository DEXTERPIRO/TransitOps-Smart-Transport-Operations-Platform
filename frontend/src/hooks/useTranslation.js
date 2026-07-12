import { useLanguageStore } from '../store/languageStore';

export const useTranslation = () => {
  const { language, setLanguage, t } = useLanguageStore();
  return { t, language, setLanguage };
};
