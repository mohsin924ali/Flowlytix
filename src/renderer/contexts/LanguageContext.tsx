import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isRTL: boolean;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const availableLanguages = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
  },
];

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>(i18n.language);
  const [isRTL, setIsRTL] = useState<boolean>(false);

  // RTL languages list
  const rtlLanguages = ['ur', 'ar', 'he', 'fa'];

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const updateRTL = (currentLang: string) => {
      const isRTLLang = rtlLanguages.includes(currentLang);
      setIsRTL(isRTLLang);

      // Update document direction
      document.dir = isRTLLang ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', isRTLLang ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', currentLang);
    };

    // Initial setup
    updateRTL(language);

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setLanguageState(lng);
      updateRTL(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [language, i18n]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    isRTL,
    availableLanguages,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
