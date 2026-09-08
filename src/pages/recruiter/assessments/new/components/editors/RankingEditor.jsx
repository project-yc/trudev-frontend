import { IconSortAscending, IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import { useSectionItemEditor } from '../../context/useSectionItemEditor';
import { QuestionFooter } from '../QuestionFooter';
import { SectionConfigCard } from '../SectionConfigCard';

function SortableRankItem({ rankItem, onTextChange, onDelete }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: rankItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 group">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-1 rounded"
      >
        <IconGripVertical size={13} />
      </button>
      <input
        value={rankItem.text}
        onChange={e => onTextChange(rankItem.id, e.target.value)}
        placeholder="Item text…"
        className="flex-1 px-2.5 py-1.5 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
      />
      <button
        onClick={() => onDelete(rankItem.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-error hover:bg-error-bg rounded transition-all"
      >
        <IconTrash size={11} />
      </button>
    </div>
  );
}

export function RankingEditor({ sectionId, item, allItems, itemIndex }) {
  const { dispatch, ACTIONS, state } = useAssessmentBuilder();
  const { updateItem } = useSectionItemEditor(sectionId, item.id);
  const section = state.sections.find(s => s.id === sectionId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleRankItemText = (rankItemId, text) => {
    const updated = item.items.map(ri => ri.id === rankItemId ? { ...ri, text } : ri);
    updateItem({ items: updated });
  };

  const handleDeleteRankItem = (rankItemId) => {
    updateItem({ items: item.items.filter(ri => ri.id !== rankItemId) });
  };

  const handleAddRankItem = () => {
    updateItem({ items: [...item.items, { id: crypto.randomUUID(), text: '' }] });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = item.items.findIndex(ri => ri.id === active.id);
    const newIdx = item.items.findIndex(ri => ri.id === over.id);
    updateItem({ items: arrayMove(item.items, oldIdx, newIdx) });
  };

  return (
    <div className="max-w-[540px] mx-auto px-5 py-5 space-y-3">
      {/* Section config */}
      <SectionConfigCard timerMinutes={section?.timer_minutes} />

      {/* Card */}
      <div className="bg-surface border border-border-default rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-border-default">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <IconSortAscending size={12} /> Ranking · Q{itemIndex + 1} of {allItems.length}
          </span>
        </div>

        {/* Body */}
        <div className="px-3.5 pt-2.5 space-y-2.5">
          <textarea
            value={item.prompt}
            onChange={e => updateItem({ prompt: e.target.value })}
            placeholder="Type your ranking prompt here…"
            rows={3}
            className="w-full px-3 py-2 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
          />

          {/* Draggable rank items */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={item.items.map(ri => ri.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {item.items.map(rankItem => (
                  <SortableRankItem
                    key={rankItem.id}
                    rankItem={rankItem}
                    onTextChange={handleRankItemText}
                    onDelete={handleDeleteRankItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={handleAddRankItem}
            className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-brand transition-colors"
          >
            <IconPlus size={12} /> Add item
          </button>
        </div>

        {/* Footer */}
        <QuestionFooter
          points={item.points}
          onPointsChange={v => updateItem({ points: v })}
          onDuplicate={() => {/* TODO */}}
          onDelete={() => dispatch({ type: ACTIONS.REMOVE_QUESTION, payload: { sectionId, questionId: item.id } })}
        >
          <span className="text-[12px] text-text-muted">Partial credit on</span>
        </QuestionFooter>
      </div>
    </div>
  );
}
