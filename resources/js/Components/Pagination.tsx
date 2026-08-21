import { Link } from '@inertiajs/react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export default function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav className="flex flex-wrap items-center gap-1 px-6 py-4">
            {links.map((link, index) => (
                <Link
                    key={index}
                    href={link.url ?? '#'}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={`rounded px-3 py-1 text-sm ${
                        link.active
                            ? 'bg-indigo-600 text-white'
                            : link.url
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'cursor-not-allowed text-gray-400'
                    }`}
                />
            ))}
        </nav>
    );
}
