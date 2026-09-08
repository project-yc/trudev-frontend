import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { ASSESSMENT_COLUMNS } from '../constants/assessmentsConfig';
import {
  formatCompletionRate,
  formatDate,
  formatDuration,
  formatRelativeDeadline,
  getRowKey,
  isEndingSoon,
} from '../utils/assessmentRows';
import { StatusBadge } from './StatusBadge';
import { RowActions } from './RowActions';
import { AssessmentsEmptyState } from './AssessmentsEmptyState';
import { AssessmentsTableSkeleton } from './AssessmentsTableSkeleton';

/** Header cell — a sort button when the column carries a `sortKey`. */
function SortableHead({ column, sort, order, onSort }) {
  const isActive = column.sortKey && column.sortKey === sort;
  const ariaSort = isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
  const alignRight = column.align === 'right';

  if (!column.sortKey) {
    return (
      <TableHead className={cn('px-[12px]', alignRight && 'text-right')}>
        {column.label}
      </TableHead>
    );
  }

  const Indicator = !isActive ? ChevronsUpDown : order === 'asc' ? ChevronUp : ChevronDown;

  return (
    <TableHead className={cn('px-[12px]', alignRight && 'text-right')} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column.sortKey)}
        className={cn(
          'group -mx-[6px] inline-flex items-center gap-[5px] rounded-[6px] px-[6px] py-[3px] transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          isActive ? 'text-text-primary' : 'text-text-secondary',
        )}
      >
        {column.label}
        <Indicator
          aria-hidden="true"
          className={cn(
            'h-[13px] w-[13px] transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
          )}
          strokeWidth={2.2}
        />
      </button>
    </TableHead>
  );
}

/** Slim completion bar. `—` when nobody has been invited yet. */
function CompletionCell({ rate }) {
  if (!Number.isFinite(rate)) {
    return <span className="text-text-muted">—</span>;
  }
  const percent = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-[10px]">
      <div
        className="h-[5px] flex-1 overflow-hidden rounded-full bg-surface-muted"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="w-[36px] shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary">
        {formatCompletionRate(rate)}
      </span>
    </div>
  );
}

/**
 * End date plus a relative hint. Urgency is a small dot rather than coloring
 * the whole text amber — the date itself stays legible at normal contrast,
 * and the accent is the same brand color used for the completion bar rather
 * than a separate warning hue.
 */
function EndDateCell({ row }) {
  const relative = formatRelativeDeadline(row);
  const urgent = isEndingSoon(row);

  return (
    <div className="flex min-w-0 items-start gap-[7px]">
      {urgent && <span className="mt-[6px] h-[6px] w-[6px] flex-shrink-0 rounded-full bg-brand" />}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text-primary">{formatDate(row.endDate)}</p>
        {relative && (
          <p className="text-[12px] leading-[15px] text-text-muted">{relative}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Assessments table. Column widths come from ASSESSMENT_COLUMNS via
 * <colgroup> so the layout stays fixed as content length varies. Sorting and
 * paging are server-side — the header buttons only report intent upward.
 */
export function AssessmentsTable({
  rows,
  loading,
  filtersActive,
  onClearFilters,
  offset,
  pageSize,
  sort,
  order,
  onSort,
  onView,
  onEdit,
  onDuplicate,
  duplicatingId,
  onClose,
  closingId,
}) {
  const isEmpty = !loading && rows.length === 0;

  // The `Table` primitive already wraps itself in an overflow-auto box, so the
  // min-width scrolls inside the panel rather than pushing the page sideways.
  return (
    <>
      <Table className="min-w-[1050px] table-fixed">
        <caption className="sr-only">Assessments</caption>
        <colgroup>
          {ASSESSMENT_COLUMNS.map(column => (
            <col key={column.key} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>

        <TableHeader>
          <TableRow className="bg-surface-hover hover:bg-surface-hover">
            {ASSESSMENT_COLUMNS.map(column => (
              <SortableHead
                key={column.key}
                column={column}
                sort={sort}
                order={order}
                onSort={onSort}
              />
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <AssessmentsTableSkeleton rows={Math.min(pageSize, 6)} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={ASSESSMENT_COLUMNS.length} className="h-auto p-0">
                <AssessmentsEmptyState
                  filtersActive={filtersActive}
                  onClearFilters={onClearFilters}
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const duration = formatDuration(row.durationMinutes);

              return (
                <TableRow
                  key={getRowKey(row, offset + index)}
                  className="cursor-pointer border-t border-border-subtle"
                  onClick={() => onView(row)}
                >
                  <TableCell className="px-[12px]">
                    <p className="truncate text-[14px] font-bold leading-[18px] text-text-primary">
                      {row.name}
                    </p>
                    <p className="mt-[2px] truncate text-[12px] leading-[16px] text-text-muted">
                      {[duration, row.description].filter(Boolean).join(' · ') || 'No description'}
                    </p>
                  </TableCell>

                  <TableCell className="px-[12px]">
                    <StatusBadge status={row.status} />
                  </TableCell>

                  <TableCell className="px-[12px]">
                    <span className="block truncate text-[13px] text-text-primary">
                      {row.createdBy || <span className="text-text-muted">—</span>}
                    </span>
                  </TableCell>

                  <TableCell className="px-[12px]">
                    {row.invitedCount > 0 ? (
                      <span className="text-[13px] tabular-nums text-text-primary">
                        <span className="font-semibold">{row.submittedCount}</span>
                        <span className="text-text-muted"> / {row.invitedCount} invited</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-muted">Not invited yet</span>
                    )}
                  </TableCell>

                  <TableCell className="px-[12px]">
                    <CompletionCell rate={row.completionRate} />
                  </TableCell>

                  <TableCell className="px-[12px]">
                    <EndDateCell row={row} />
                  </TableCell>

                  {/* Row click opens the assessment; the icons are their own
                      targets and must not double-fire it. justify-end matches
                      the right-aligned "Action" header above. */}
                  <TableCell
                    className="px-[12px]"
                    onClick={event => event.stopPropagation()}
                  >
                    <div className="flex justify-end">
                      <RowActions
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        duplicating={duplicatingId === row.id}
                        onClose={onClose}
                        closing={closingId === row.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}
