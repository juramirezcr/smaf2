import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'smaf-sidebar-collapsed';

function initialCollapsed(): boolean {
    return localStorage.getItem(STORAGE_KEY) === '1';
}

export function useSidebarCollapsed() {
    const [collapsed, setCollapsed] = useState<boolean>(() => initialCollapsed());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    }, [collapsed]);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((previous) => !previous);
    }, []);

    return { collapsed, toggleCollapsed };
}
