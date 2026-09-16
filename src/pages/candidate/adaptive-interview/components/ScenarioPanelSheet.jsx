// ─────────────────────────────────────────────────────────────────────────────
// ScenarioPanelSheet — the scenario panel on small screens.
//
// Below `lg` there's no room for a persistent side panel, so it lives in a
// right-side sheet instead — the same edge the desktop rail occupies, so the
// panel comes from where the candidate last saw it. Mirrors QuestionMapSheet:
// it reads the theme container itself because it's rendered inside the scope
// but portals outside of it.
//
// The body is `ScenarioBody`, shared with `ScenarioPanel`, so the two views
// cannot drift.
// ─────────────────────────────────────────────────────────────────────────────

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { useCandidateThemeContainer } from '../../../../theme/CandidateThemeProvider'
import ScenarioBody from './ScenarioBody'

export default function ScenarioPanelSheet({ open, onOpenChange, scenario }) {
  const container = useCandidateThemeContainer()

  if (!scenario) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        container={container}
        className="candidate-theme w-full border-l border-border bg-chrome sm:max-w-[440px]"
      >
        <SheetHeader className="border-b-0 px-6 pb-1 pt-6">
          <SheetTitle className="text-[17px] font-semibold leading-[1.3] tracking-[-0.015em] text-text-primary">
            {scenario.title}
          </SheetTitle>
        </SheetHeader>

        <div className="cand-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <ScenarioBody scenario={scenario} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
