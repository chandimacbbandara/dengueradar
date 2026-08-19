import { useEffect } from 'react';
import { useThemeStore } from '../context/ThemeContext.jsx';

export default function ThemeInit() {
  const { isDark } = useThemeStore();
  
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  return null;
}
