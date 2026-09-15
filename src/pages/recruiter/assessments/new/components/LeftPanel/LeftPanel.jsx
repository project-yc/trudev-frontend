import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ChevronsLeft, List, Pencil, Plus } from 'lucide-react';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import { SECTION_TYPE_CONFIG } from '../../constants/sectionTypeConfig';
import { SectionOutlineItem } from './SectionOutlineItem';

const ALLOCATION_SEGMENTS = 52;

function SectionAllocation({ durationMinutes, sections }) {
  const allocatedMinutes = sections.reduce((sum, section) => (
    sum + Number(section.timer_minutes ?? SECTION_TYPE_CONFIG[section.type]?.defaultTimerMinutes ?? 0)
  ), 0);
  const totalMinutes = Math.max(Number(durationMinutes) || allocatedMinutes || 0, 0);
  const remainingMinutes = Math.max(totalMinutes - allocatedMinutes, 0);
  const availableRatio = totalMinutes > 0 ? remainingMinutes / totalMinutes : 0;
  const filledSegments = sections.length === 0
    ? ALLOCATION_SEGMENTS
    : Math.max(0, Math.min(ALLOCATION_SEGMENTS, Math.round(availableRatio * ALLOCATION_SEGMENTS)));

  return (
    <div className="mt-[14px] rounded-[8px] border border-border-default bg-surface px-[12px] pb-[10px] pt-[11px]">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[12px] font-medium leading-none text-text-muted">
          <span className="text-[20px] font-bold leading-none text-text-primary">
            {String(remainingMinutes).padStart(2, '0')}
          </span>{' '}
          min left to allocate
        </p>
        <p className="text-[12px] font-medium leading-none text-text-muted">
          Total time :{' '}
          <span className="font-bold text-text-primary">{String(allocatedMinutes).padStart(2, '0')} min</span>
        </p>
      </div>
      <div
        className="mt-[10px] grid h-[16px] gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${ALLOCATION_SEGMENTS}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: ALLOCATION_SEGMENTS }).map((_, index) => (
          <span
            key={index}
            className={index < filledSegments ? 'bg-assessment-allocation' : 'bg-surface-muted'}
          />
        ))}
      </div>
    </div>
  );
}

export function LeftPanel() {
  const { state, dispatch, ACTIONS } = useAssessmentBuilder();
  const { sections, name, activeQuestion, duration_minutes } = state;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sectionCountText = useMemo(() => {
    if (sections.length === 0) return 'No sections added yet.';
    return `${sections.length} section${sections.length !== 1 ? 's' : ''}`;
  }, [sections.length]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    dispatch({
      type: ACTIONS.REORDER_SECTIONS,
      payload: { sections: arrayMove(sections, oldIndex, newIndex) },
    });
  }

  const handleAddSection = () => {
    dispatch({ type: ACTIONS.SET_ACTIVE, payload: { sectionId: '__add_section__', questionId: null } });
  };

  return (
    <div className="hidden w-[409px] flex-shrink-0 overflow-hidden border-r border-border-subtle bg-surface lg:block">
      <div className="flex h-full min-w-0 flex-col overflow-hidden px-[18px] py-[18px]">
        <div className="flex min-w-0 items-center gap-[10px] text-[14px] font-bold leading-none">
          <span className="text-text-muted">Dashboard</span>
          <span className="text-text-muted">/</span>
          <span className="min-w-0 truncate text-text-primary">Create assessment</span>
        </div>

        <div className="mt-[22px] flex min-w-0 items-center border-b border-border-default pb-[11px]">
          <div className="flex min-w-0 flex-1 items-center gap-[10px]">
            <input
              value={name}
              onChange={e => dispatch({ type: ACTIONS.SET_DETAILS, payload: { name: e.target.value } })}
              className="min-w-0 flex-1 bg-transparent text-[14px] font-bold leading-none text-text-primary outline-none placeholder:text-text-primary"
              placeholder="Assessment name"
            />
            <Pencil className="h-[15px] w-[15px] flex-shrink-0 text-[var(--color-assessment-step-active)]" strokeWidth={2.3} />
          </div>

          <div className="ml-[14px] flex flex-shrink-0 items-center gap-[13px] text-[var(--color-assessment-step-active)]">
            <button type="button" className="transition-opacity hover:opacity-70" aria-label="List options">
              <List className="h-[16px] w-[16px]" strokeWidth={2} />
            </button>
            <button type="button" className="transition-opacity hover:opacity-70" aria-label="Collapse builder panel">
              <ChevronsLeft className="h-[16px] w-[16px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-[20px] min-h-0 flex-1 overflow-y-auto pr-[2px]">
          <p className="text-[11px] font-bold uppercase leading-none text-text-secondary">Section</p>
          <SectionAllocation durationMinutes={duration_minutes} sections={sections} />
          {sections.length === 0 ? (
            <p className="mt-[20px] text-[14px] italic leading-none text-text-faint">
              {sectionCountText}
            </p>
          ) : (
            <div className="mt-[18px]">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-[18px]">
                    {sections.map(section => (
                      <SectionOutlineItem
                        key={section.id}
                        section={section}
                        activeQuestion={activeQuestion}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 pt-[16px]">
          <button
            type="button"
            onClick={handleAddSection}
            className="flex h-[44px] w-full items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-border-strong bg-surface text-[14px] font-bold text-text-primary transition-colors hover:bg-surface-hover"
          >
            <Plus className="h-[17px] w-[17px]" strokeWidth={1.9} />
            Add new section
          </button>
        </div>
      </div>
    </div>
  );
}
