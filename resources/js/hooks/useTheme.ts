import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'smaf-theme';

function currentTheme(): Theme {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => currentTheme());

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggleTheme };
}
