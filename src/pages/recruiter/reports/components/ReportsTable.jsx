import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { REPORT_COLUMNS } from '../constants/reportsConfig';
import { formatDate, formatScore, getRowKey } from '../utils/reportRows';
import { RankPill, ScoreWithAiLevel, UnrankedGroupLabel } from './RankPill';
import { IdentityCell } from './IdentityCell';
import { ReportStatusCell } from './ReportStatusCell';
import { RowActions } from './RowActions';
import { ReportsEmptyState } from './ReportsEmptyState';
import { ReportsTableSkeleton } from './ReportsTableSkeleton';

/**
 * Reports table. Column widths come from REPORT_COLUMNS via <colgroup> so the
 * layout stays fixed as content length varies (Figma total: 1097px).
 */
export function ReportsTable({
  rows,
  loading,
  searching,
  offset,
  assessmentName,
  onViewReport,
  pageSize,
  // Global index of the first unranked row in the ordered list (-1 when every
  // row is rank-eligible) and how many rows sit in that bucket.
  unrankedStart = -1,
  unrankedCount = 0,
}) {
  const isEmpty = !loading && rows.length === 0;

  return (
    <div className="overflow-hidden">
      <Table className="min-w-[920px] table-fixed">
        <caption className="sr-only">
          Candidate assessment reports, ordered by overall signal; unranked candidates listed last
        </caption>
        <colgroup>
          {REPORT_COLUMNS.map(column => (
            <col key={column.key} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>

        <TableHeader>
          <TableRow className="bg-surface-hover hover:bg-surface-hover">
            {REPORT_COLUMNS.map(column => (
              <TableHead key={column.key} className="px-[12px]">
                {column.key === 'actions' ? (
                  <span className="pl-[12px]">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <ReportsTableSkeleton rows={Math.min(pageSize, 5)} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={REPORT_COLUMNS.length} className="h-auto p-0">
                <ReportsEmptyState searching={searching} />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              // The divider sits at the first unranked row of the whole
              // ordered list, whichever page that lands on.
              const opensUnrankedBucket = offset + index === unrankedStart;
              return [
                opensUnrankedBucket && (
                  <TableRow key={`${getRowKey(row, offset + index)}-group`} className="border-t border-border-default bg-surface-muted hover:bg-surface-muted">
                    <TableCell colSpan={REPORT_COLUMNS.length} className="h-auto p-0">
                      <UnrankedGroupLabel count={unrankedCount} />
                    </TableCell>
                  </TableRow>
                ),
              <TableRow
                key={getRowKey(row, offset + index)}
                className={row.rankEligible ? 'border-t border-border-subtle' : 'border-t border-border-subtle bg-surface-hover/60'}
              >
                {/* Client-side rank among rank-eligible candidates across the
                    whole assessment — not the position within the page. The
                    server's `rank` also numbers non-comparable rows. */}
                <TableCell className="px-[12px] font-medium">
                  <RankPill rank={row.rankPosition} rankEligible={row.rankEligible} reviewStatus={row.reviewStatus} />
                </TableCell>

                <TableCell className="px-[12px]">
                  <IdentityCell name={row.name} email={row.email} avatarUrl={row.avatarUrl} />
                </TableCell>

                <TableCell className="px-[12px]">
                  <p className="truncate font-medium text-text-primary">
                    {row.assessmentName || assessmentName}
                  </p>
                </TableCell>

                <TableCell className="px-[12px] font-medium">
                  {formatDate(row.submittedAt)}
                </TableCell>

                <TableCell className="px-[12px] font-medium">
                  <ScoreWithAiLevel
                    score={row.score}
                    aiAccessLevel={row.aiAccessLevel}
                    reviewStatus={row.reviewStatus}
                    rankEligible={row.rankEligible}
                    format={formatScore}
                  />
                </TableCell>

                <TableCell className="px-[12px]">
                  <ReportStatusCell row={row} onViewReport={() => onViewReport(row)} />
                </TableCell>

                <TableCell className="px-[12px]">
                  <RowActions />
                </TableCell>
              </TableRow>,
              ];
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
