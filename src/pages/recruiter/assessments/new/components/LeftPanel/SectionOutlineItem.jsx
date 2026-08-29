import { ChevronDown, Menu, Pencil, Plus, Trash2 } from 'lucide-react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SECTION_TYPE_CONFIG } from '../../constants/sectionTypeConfig';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import mcqIcon from '../../../../../../assets/recruiter/icons/mcq.svg';
import rankingIcon from '../../../../../../assets/recruiter/icons/ranking.svg';
import freeTextIcon from '../../../../../../assets/recruiter/icons/free_text.svg';
import codingIcon from '../../../../../../assets/recruiter/icons/coding.svg';
import { QuestionOutlineItem } from './QuestionOutlineItem';

const TYPE_ICON = {
  mcq: mcqIcon,
  ranking: rankingIcon,
  free_text: freeTextIcon,
  coding: codingIcon,
};

function getPointValue(item) {
  if (Number.isFinite(Number(item.points))) return Number(item.points);
  return item.type === 'coding' ? 5 : 0;
}

function pluralize(count, singular) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function SectionOutlineItem({ section, activeQuestion }) {
  const { dispatch, ACTIONS } = useAssessmentBuilder();
  const cfg = SECTION_TYPE_CONFIG[section.type] || SECTION_TYPE_CONFIG.mcq;
  const icon = TYPE_ICON[section.type] || TYPE_ICON.mcq;
  const items = section.items || [];
  const questionCount = items.length;
  const totalPoints = items.reduce((sum, item) => sum + getPointValue(item), 0);
  const timerMinutes = section.timer_minutes ?? cfg.defaultTimerMinutes;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.56 : 1,
  };

  const handleToggle = (event) => {
    event.stopPropagation();
    dispatch({ type: ACTIONS.TOGGLE_SECTION_EXPANDED, payload: { sectionId: section.id } });
  };

  const handleSectionClick = () => {
    const firstItem = items[0];
    dispatch({
      type: ACTIONS.SET_ACTIVE,
      payload: { sectionId: section.id, questionId: firstItem?.id ?? null },
    });
  };

  const handleSectionKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleSectionClick();
  };

  const handleAddQuestion = (event) => {
    event.stopPropagation();
    dispatch({
      type: ACTIONS.OPEN_ADD_QUESTION_DRAWER,
      payload: { sectionId: section.id, sectionType: section.type },
    });
  };

  /**
   * Reopen the creation drawer on its settings step for a section that already
   * exists.
   *
   * Before this, everything asked on that step - the name, the timer, and on a
   * coding section the AI level and the four rubric weights - was answered once
   * and then frozen: the outline offered delete and reorder, and the right-hand
   * panel is a per-question editor with no section-level controls. Renaming a
   * typo'd section meant deleting it and rebuilding every question in it.
   */
  const handleEditSection = (event) => {
    event.stopPropagation();
    dispatch({
      type: ACTIONS.OPEN_EDIT_SECTION_DRAWER,
      payload: { sectionId: section.id, sectionType: section.type },
    });
  };

  const handleDeleteSection = (event) => {
    event.stopPropagation();
    if (!window.confirm(`Delete "${section.name || cfg.label}"? This removes all its questions too.`)) return;
    dispatch({ type: ACTIONS.REMOVE_SECTION, payload: { sectionId: section.id } });
  };

  const questionSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleQuestionDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    dispatch({
      type: ACTIONS.REORDER_QUESTIONS,
      payload: { sectionId: section.id, items: arrayMove(items, oldIndex, newIndex) },
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={handleSectionClick}
        onKeyDown={handleSectionKeyDown}
        className="grid w-full grid-cols-[26px_minmax(0,1fr)_92px] items-start gap-[8px] text-left"
      >
        <img src={icon} alt="" className="mt-[1px] h-[26px] w-[26px] flex-shrink-0" />

        <span className="block min-w-0 pt-[1px]">
          <span className="block truncate text-[14px] font-bold leading-[17px] text-text-primary">
            {section.name || cfg.label}
          </span>
          <span className="mt-[2px] block truncate text-[12px] font-medium leading-[15px] text-text-faint">
            {pluralize(questionCount, 'question')} | {totalPoints} points | {timerMinutes} min
          </span>
        </span>

        <span className="flex items-center justify-end gap-[8px] pt-[5px] text-[var(--color-assessment-step-active)]">
          <span
            role="button"
            tabIndex={0}
            aria-label={`Edit ${section.name || cfg.label} settings`}
            onClick={handleEditSection}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') handleEditSection(event);
            }}
            className="rounded-button text-text-faint transition-colors hover:text-text-primary"
          >
            <Pencil className="h-[14px] w-[14px]" strokeWidth={2} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Delete section"
            onClick={handleDeleteSection}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') handleDeleteSection(event);
            }}
            className="rounded-button text-text-faint transition-colors hover:text-error"
          >
            <Trash2 className="h-[15px] w-[15px]" strokeWidth={2} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={section.expanded ? 'Collapse section' : 'Expand section'}
            onClick={handleToggle}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') handleToggle(event);
            }}
            className="rounded-button transition-opacity hover:opacity-70"
          >
            <ChevronDown
              className={`h-[16px] w-[16px] transition-transform ${section.expanded ? '' : '-rotate-90'}`}
              strokeWidth={2.2}
            />
          </span>
          <span
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={0}
            aria-label="Reorder section"
            onClick={event => event.stopPropagation()}
            className="cursor-grab rounded-button transition-opacity hover:opacity-70 active:cursor-grabbing"
          >
            <Menu className="h-[16px] w-[16px]" strokeWidth={2.2} />
          </span>
        </span>
      </div>

      {section.expanded && (
        <div className="ml-[34px] mt-[10px] border-l border-border-subtle pl-[9px]">
          <DndContext sensors={questionSensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-[10px]">
                {items.map((item, index) => (
                  <QuestionOutlineItem
                    key={item.id}
                    sectionId={section.id}
                    item={item}
                    index={index}
                    isActive={activeQuestion === item.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {/* Coding sections hold one task. Adaptive sections hold one INTERVIEW:
              a second adaptive item runs for the candidate and scores into the
              section total, but the recruiter report resolves the section with
              `.order_by("section_item__order").first()` — so the second
              interview's transcript, competencies and summary are unreachable
              forever. Adding one silently doubles the candidate's work and hides
              half the evidence, so the control is not offered. */}
          {section.type !== 'coding' && section.type !== 'adaptive' && (
            <button
              type="button"
              onClick={handleAddQuestion}
              className="mt-[14px] flex h-[30px] items-center gap-[6px] rounded-button border border-brand px-[10px] text-[12px] font-medium leading-none text-brand transition-colors hover:bg-brand-tint-light"
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={2} />
              Add another question
            </button>
          )}
        </div>
      )}
    </div>
  );
}
