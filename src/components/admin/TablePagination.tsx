import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';

export function TablePagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <>
      <span>
        {from}–{to} / {total}
      </span>
      <span className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('paginationPrev')}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[5rem] text-center tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('paginationNext')}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </span>
    </>
  );
}
