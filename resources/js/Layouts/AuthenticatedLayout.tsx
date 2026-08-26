import ThemeToggle from '@/Components/ThemeToggle';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

function Icon({ path, large = false }: { path: string; large?: boolean }) {
    return (
        <svg className={`shrink-0 ${large ? 'h-[1.875rem] w-[1.875rem]' : 'h-6 w-6'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

const ICONS = {
    dashboard: 'M3.75 13.5l10.5-11.25L14.25 10.5H20.25L9.75 21.75L11.25 13.5H3.75Z',
    server: 'M5.25 5.25h13.5a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-3a1.5 1.5 0 011.5-1.5zM5.25 12.75h13.5a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-3a1.5 1.5 0 011.5-1.5zM7.5 8.25h.008v.008H7.5V8.25zM7.5 15.75h.008v.008H7.5v-.008z',
    phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.077-1.44l-3.796-1.13a1.5 1.5 0 00-1.567.408l-.674.674a13.5 13.5 0 01-6.516-6.516l.674-.674a1.5 1.5 0 00.408-1.567l-1.13-3.796A1.5 1.5 0 006.622 2.25H5.25A2.25 2.25 0 003 4.5v2.25z',
    globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 010 18M12 3a13.5 13.5 0 000 18',
    outbound: 'M4.5 4.5h6M4.5 4.5v6M4.5 4.5L15 15m4.5 4.5h-6m6 0v-6m0 6L9 9',
    users: 'M15 19.5a3 3 0 10-6 0M4.5 20.25a7.5 7.5 0 0115 0M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z',
    bell: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
    help: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z M12 17.25h.007v.008H12v-.008z',
    cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.752.43.992l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.752-.43-.992l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    chevron: 'M8.25 4.5l7.5 7.5-7.5 7.5',
    chevronDoubleLeft: 'M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5',
    logout: 'M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
};

interface NavItem {
    name: string;
    href: string;
    active: boolean;
    icon: keyof typeof ICONS;
}

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    const [mobileOpen, setMobileOpen] = useState<boolean>(false);
    const { collapsed, toggleCollapsed } = useSidebarCollapsed();
    const configRef = useRef<HTMLDivElement>(null);

    const canSeeConfig = (user.isSystemAdmin || user.role === 'client_admin') && !user.readOnly;
    const configActive = Boolean(
        route().current('admin.clients.*') || route().current('admin.portaone.*') || route().current('admin.telegram.*') || route().current('admin.email.*') || route().current('admin.platform-users.*') || route().current('admin.queue.*') || route().current('users.*') || route().current('process-runs.*'),
    );
    const [configOpen, setConfigOpen] = useState<boolean>(configActive);

    // En modo colapsado el submenú se muestra como un flyout flotante junto
    // al ícono en vez de una lista anidada; debe cerrarse solo al hacer clic
    // fuera de él, ya que no hay texto visible que sirva de "cerrar".
    useEffect(() => {
        if (!collapsed || !configOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (configRef.current && !configRef.current.contains(event.target as Node)) {
                setConfigOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [collapsed, configOpen]);

    const navItems: NavItem[] = [
        { name: 'Panel de Control', href: route('dashboard'), active: route().current('dashboard'), icon: 'dashboard' },
        { name: 'Llamadas', href: route('calls.index'), active: route().current('calls.*'), icon: 'phone' },
        { name: 'Prefijos', href: route('prefixes.index'), active: route().current('prefixes.*'), icon: 'globe' },
        { name: 'Destinos', href: route('destinations.index'), active: route().current('destinations.*'), icon: 'outbound' },
        { name: 'Cuentas', href: route('accounts.index'), active: route().current('accounts.*'), icon: 'users' },
        { name: 'Customers', href: route('portaone-customers.index'), active: route().current('portaone-customers.*'), icon: 'users' },
        { name: 'Alertas', href: route('alerts.index'), active: route().current('alerts.*'), icon: 'bell' },
        ...(user.isSystemAdmin
            ? [{ name: 'Salud del servidor', href: route('admin.status.index'), active: route().current('admin.status.*'), icon: 'server' as const }]
            : []),
        { name: 'Ayuda', href: route('help.index'), active: route().current('help.*'), icon: 'help' },
    ];

    const configItems = [
        user.isSystemAdmin && { name: 'Clientes', href: route('admin.clients.index'), active: route().current('admin.clients.*') },
        user.isSystemAdmin && { name: 'PortaOne', href: route('admin.portaone.edit'), active: route().current('admin.portaone.*') },
        user.isSystemAdmin && { name: 'Telegram', href: route('admin.telegram.edit'), active: route().current('admin.telegram.*') },
        user.isSystemAdmin && { name: 'Email', href: route('admin.email.edit'), active: route().current('admin.email.*') },
        user.isSystemAdmin && { name: 'Administradores', href: route('admin.platform-users.index'), active: route().current('admin.platform-users.*') },
        user.isSystemAdmin && { name: 'Cola de jobs', href: route('admin.queue.index'), active: route().current('admin.queue.*') },
        ! user.isSystemAdmin && user.role === 'client_admin' && { name: 'Usuarios', href: route('users.index'), active: route().current('users.*') },
        user.isSystemAdmin && { name: 'Ejecuciones', href: route('process-runs.index'), active: route().current('process-runs.*') },
    ].filter((item): item is Exclude<typeof item, false> => item !== false);

    function renderSidebar(isCollapsed: boolean) {
        return (
            <>
                <div className={`flex shrink-0 items-center px-4 ${isCollapsed ? 'flex-col gap-2 py-3' : 'h-16 justify-between'}`}>
                    {!isCollapsed && (
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">SMAF 2</p>
                            {user.clientName && <p className="text-xs text-gray-500 dark:text-slate-400">{user.clientName}</p>}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú a solo íconos'}
                        className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white md:inline-flex"
                    >
                        <svg className={`h-5 w-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chevronDoubleLeft} />
                        </svg>
                    </button>
                    {isCollapsed ? (
                        <>
                            <ThemeToggle />
                            <Link href={route('logout')} method="post" as="button" title="Salir" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white">
                                <Icon path={ICONS.logout} />
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <Link href={route('logout')} method="post" as="button" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                                <Icon path={ICONS.logout} />
                                Salir
                            </Link>
                        </div>
                    )}
                </div>
                <nav className="flex-1 space-y-1 px-2 pb-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${isCollapsed ? 'justify-center' : ''} ${
                                item.active
                                    ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-white'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                            }`}
                        >
                            <Icon path={ICONS[item.icon]} large={isCollapsed} />
                            {!isCollapsed && item.name}
                        </Link>
                    ))}

                    {canSeeConfig && (
                        <div ref={isCollapsed ? configRef : undefined} className="relative">
                            <button
                                type="button"
                                onClick={() => setConfigOpen((previous) => !previous)}
                                title={isCollapsed ? 'Configuraciones' : undefined}
                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${isCollapsed ? 'justify-center' : 'justify-between'} ${
                                    configActive
                                        ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Icon path={ICONS.cog} large={isCollapsed} />
                                    {!isCollapsed && 'Configuraciones'}
                                </span>
                                {!isCollapsed && (
                                    <svg className={`h-5 w-5 transition-transform ${configOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chevron} />
                                    </svg>
                                )}
                            </button>
                            {configOpen && (
                                <div
                                    className={
                                        isCollapsed
                                            ? 'absolute left-full top-0 z-30 ml-2 w-52 space-y-1 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg dark:border-slate-600 dark:bg-slate-800'
                                            : 'ms-6 mt-1 space-y-1'
                                    }
                                >
                                    {configItems.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => isCollapsed && setConfigOpen(false)}
                                            className={`block rounded-md px-3 py-2 text-sm transition ${
                                                item.active
                                                    ? 'bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-white'
                                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                                            }`}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>
                {!isCollapsed && (
                    <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                        <Link href={route('profile.edit')} className="mt-2 inline-block text-xs text-gray-500 underline hover:text-gray-900 dark:text-slate-300 dark:hover:text-white">
                            Perfil
                        </Link>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar de escritorio */}
            <div className={`hidden md:fixed md:inset-y-0 md:flex md:flex-col ${collapsed ? 'md:w-20' : 'md:w-64'}`}>
                <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">{renderSidebar(collapsed)}</div>
            </div>

            {/* Barra superior + menú deslizable en móvil */}
            <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 md:hidden">
                <p className="text-lg font-bold text-gray-900 dark:text-white">SMAF 2</p>
                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <button
                        onClick={() => setMobileOpen((previous) => !previous)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    >
                        <svg className="h-7 w-7" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                            <path
                                className={!mobileOpen ? 'inline-flex' : 'hidden'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                            <path
                                className={mobileOpen ? 'inline-flex' : 'hidden'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>
            {mobileOpen && (
                <div className="fixed inset-x-0 top-16 z-20 flex max-h-[calc(100vh-4rem)] flex-col overflow-y-auto border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:hidden">
                    {renderSidebar(false)}
                </div>
            )}

            <div className={`flex flex-1 flex-col ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                {header && (
                    <header className="bg-white shadow dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-white/10">
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                    </header>
                )}

                <main>{children}</main>
            </div>
        </div>
    );
}
