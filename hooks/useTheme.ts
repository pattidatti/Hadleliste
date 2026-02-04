import { useState, useEffect, useCallback } from 'react';
import { useUserSettings } from './useUserSettings';
import { haptics } from '../services/haptics';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
    const { settings, updateTheme: updateThemeInCloud } = useUserSettings();
    const [theme, setTheme] = useState<Theme>(() => {
        // Init from localStorage or system preference
        const saved = localStorage.getItem('theme') as Theme;
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Sync cloud theme to local
    useEffect(() => {
        if (settings?.theme && settings.theme !== theme) {
            setTheme(settings.theme);
        }
    }, [settings?.theme]);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        updateThemeInCloud(newTheme);
        haptics.impact();
    }, [theme, updateThemeInCloud]);

    return { theme, toggleTheme };
};
