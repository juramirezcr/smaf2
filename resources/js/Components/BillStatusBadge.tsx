import { billStatusBadgeClass, billStatusLabel } from '@/utils/billStatus';

export default function BillStatusBadge({ status }: { status: string | null }) {
    if (!status) {
        return <span className="text-gray-400 dark:text-gray-500">—</span>;
    }

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${billStatusBadgeClass(status)}`}>
            {billStatusLabel(status)}
        </span>
    );
}
