import { useEffect, useMemo, useRef, useState } from 'react';

interface CheckboxMultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
}

export default function CheckboxMultiSelect({ label, options, selected, onChange }: CheckboxMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (search.trim() === '') {
            return options;
        }

        const needle = search.trim().toLowerCase();

        return options.filter((option) => option.toLowerCase().includes(needle));
    }, [options, search]);

    const toggle = (value: string) => {
        onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
                {label}{selected.length > 0 ? ` (${selected.length})` : ''}
            </button>
            {open && (
                <div className="absolute z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={`Buscar ${label.toLowerCase()}...`}
                            className="w-full rounded border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        {selected.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    <div className="mt-2 max-h-64 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <p className="px-1 py-1 text-sm text-gray-500 dark:text-gray-400">Sin resultados.</p>
                        ) : filteredOptions.map((option) => (
                            <label key={option} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => toggle(option)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
