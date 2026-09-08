import { Ban, Copy, Eye, Loader, Pencil } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../../components/ui/tooltip';

/**
 * View / Edit(draft-only) / Duplicate / Close(live-only) — per recruiter scope for this build.
 * Edit resumes the existing draft in the builder (`/recruiter/assessments/:id/edit`).
 * Close stops a live assessment taking invites (in-progress candidates finish).
 *
 * Rendered in neutral text colors rather than brand orange: four equally
 * orange icons read as four primary actions, which none of them are.
 */

const ICON_BUTTON =
  'flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40';

// Mirrors LIVE_STATUSES server-side (assessment_query.py).
const LIVE_STATUSES = ['published', 'active'];

export function RowActions({ row, onView, onEdit, onDuplicate, duplicating, onClose, closing }) {
  const isDraft = row.status === 'draft';
  const isLive = LIVE_STATUSES.includes(row.status);

  return (
    <div className="flex items-center gap-[2px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="View assessment"
            className={ICON_BUTTON}
            onClick={() => onView(row)}
          >
            <Eye className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </button>
        </TooltipTrigger>
        <TooltipContent>View</TooltipContent>
      </Tooltip>

      {isDraft && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Edit assessment"
              className={ICON_BUTTON}
              onClick={() => onEdit(row)}
            >
              <Pencil className="h-[16px] w-[16px]" strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Edit (draft only)</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Duplicate assessment"
            className={ICON_BUTTON}
            onClick={() => onDuplicate(row)}
            disabled={duplicating}
          >
            {duplicating ? (
              <Loader className="h-[16px] w-[16px] animate-spin" />
            ) : (
              <Copy className="h-[16px] w-[16px]" strokeWidth={1.8} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>Duplicate (assessment details only, task not copied)</TooltipContent>
      </Tooltip>

      {isLive && onClose && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Close assessment"
              className={ICON_BUTTON}
              onClick={() => onClose(row)}
              disabled={closing}
            >
              {closing ? (
                <Loader className="h-[16px] w-[16px] animate-spin" />
              ) : (
                <Ban className="h-[16px] w-[16px]" strokeWidth={1.8} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Close (stops new invites; candidates in progress can finish)</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
