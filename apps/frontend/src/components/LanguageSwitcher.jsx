import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
      <button 
        onClick={() => changeLanguage('en')} 
        style={{ background: 'none', border: 'none', color: i18n.language === 'en' ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', padding: '0' }}
      >
        EN
      </button>
      <span style={{ color: 'var(--border)' }}>|</span>
      <button 
        onClick={() => changeLanguage('si')} 
        style={{ background: 'none', border: 'none', color: i18n.language === 'si' ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', padding: '0', fontFamily: 'var(--font-heading)' }}
      >
        සිං
      </button>
      <span style={{ color: 'var(--border)' }}>|</span>
      <button 
        onClick={() => changeLanguage('ta')} 
        style={{ background: 'none', border: 'none', color: i18n.language === 'ta' ? 'var(--brand)' : 'var(--text-2)', cursor: 'pointer', padding: '0', fontFamily: 'var(--font-heading)' }}
      >
        தமிழ்
      </button>
    </div>
  );
}
