import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import { getPointValue } from '../../constants/sectionTypeConfig';

function getQuestionLabel(item, index) {
  if (item.type === 'coding') {
    return item.task_data?.name || item.task_data?.title || 'Untitled coding task';
  }
  const prompt = item.prompt?.trim();
  return prompt || `Question ${index + 1}`;
}

export function QuestionOutlineItem({ sectionId, item, index, isActive }) {
  const { dispatch, ACTIONS } = useAssessmentBuilder();
  const points = getPointValue(item);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.56 : 1,
  };

  const handleClick = () => {
    dispatch({ type: ACTIONS.SET_ACTIVE, payload: { sectionId, questionId: item.id } });
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`grid w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-[6px] rounded-button py-[1px] pl-[4px] pr-[8px] text-left transition-colors ${
        isActive
          ? 'bg-brand-tint-light text-text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label="Reorder question"
        onClick={event => event.stopPropagation()}
        className="flex h-[18px] w-[16px] flex-shrink-0 cursor-grab items-center justify-center rounded-button text-text-faint transition-colors hover:text-text-secondary active:cursor-grabbing"
      >
        <GripVertical className="h-[12px] w-[12px]" strokeWidth={2} />
      </span>

      <span className="min-w-0 truncate text-[12px] font-medium leading-[18px]">
        {getQuestionLabel(item, index)}
      </span>

      {points > 0 && (
        <span className="rounded-full bg-warning-bg px-[7px] py-[2px] text-[9px] font-bold leading-none text-warning">
          {points} pts
        </span>
      )}
    </div>
  );
}
