import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { CONFIG } from './config';
import { useThemeStore } from './store';

const ThemeContext = createContext({
  colors: CONFIG.COLORS,
  isDark: false,
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);

  const { colors, isDark } = useMemo(() => {
    let dark = false;
    if (preference === 'dark') dark = true;
    else if (preference === 'system') dark = systemScheme === 'dark';

    return {
      colors: dark ? CONFIG.COLORS_DARK : CONFIG.COLORS,
      isDark: dark,
    };
  }, [preference, systemScheme]);

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access current theme colors.
 * Returns { colors, isDark }.
 * `colors` follows the same shape as CONFIG.COLORS.
 */
export function useTheme() {
  return useContext(ThemeContext);
}
