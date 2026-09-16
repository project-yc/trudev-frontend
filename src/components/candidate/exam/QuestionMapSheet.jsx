// ─────────────────────────────────────────────────────────────────────────────
// QuestionMapSheet — the question map on small screens.
//
// Below `lg` there's no room for a persistent rail, so the same map lives in a
// bottom sheet one tap away. It reads the theme container itself because it is
// rendered inside the scope but portals outside of it.
// ─────────────────────────────────────────────────────────────────────────────

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { useCandidateThemeContainer } from '../../../theme/CandidateThemeProvider'
import QuestionMap, { QuestionMapLegend } from './QuestionMap'

export default function QuestionMapSheet({ open, onOpenChange, statuses, currentIndex, onJump }) {
  const container = useCandidateThemeContainer()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        container={container}
        className="candidate-theme max-h-[80vh] rounded-t-2xl border-t border-border"
      >
        <SheetHeader>
          <SheetTitle>Question Navigator</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          <QuestionMap
            statuses={statuses}
            currentIndex={currentIndex}
            onJump={onJump}
            columns={6}
          />
          <div className="border-t border-border-subtle pt-4">
            <QuestionMapLegend />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
