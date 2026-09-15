// Server snake_case -> camelCase, in one place, the way assessmentRows.js does
// it for the assessments table. Every component below this line reads the
// normalized shape, so a field rename on the backend lands here and nowhere else.

import { CONTENT_TYPE_META, CONTENT_TYPE_ORDER } from '../constants/templatesConfig';

export function normalizeTemplateRow(row = {}) {
  return {
    id: row.id,
    name: row.name || 'Untitled template',
    summary: row.summary || '',
    description: row.description || '',
    targetRole: row.target_role || '',
    seniority: row.seniority || '',
    domain: row.domain || '',
    difficulty: row.difficulty || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    durationMinutes: row.duration_minutes ?? null,
    suggestedName: row.suggested_name || '',
    configJson: row.config_json || {},
    usageCount: row.usage_count ?? 0,
    sectionCount: row.section_count ?? 0,
    itemCount: row.item_count ?? 0,
    contentTypeCounts: row.content_type_counts || {},
    isPlatform: Boolean(row.is_platform),
    isLocked: Boolean(row.is_locked),
    version: row.version ?? 1,
    preview: row.preview ? normalizePreview(row.preview) : null,
  };
}

export function normalizeTemplateRows(rows = []) {
  return rows.map(normalizeTemplateRow);
}

function normalizePreview(preview = {}) {
  return {
    sectionCount: preview.section_count ?? 0,
    itemCount: preview.item_count ?? 0,
    totalPoints: preview.total_points ?? 0,
    contentTypeCounts: preview.content_type_counts || {},
    sections: (preview.sections || []).map(section => ({
      id: section.id,
      name: section.name || 'Untitled section',
      order: section.order ?? 0,
      timerMinutes: section.timer_minutes ?? null,
      isRequired: section.is_required !== false,
      items: (section.items || []).map(item => ({
        id: item.id,
        assessmentItemId: item.assessment_item_id,
        title: item.title || 'Untitled question',
        contentType: item.content_type,
        difficulty: item.difficulty || '',
        language: item.language || '',
        points: item.points ?? 0,
        estimatedTimeMinutes: item.estimated_time_minutes ?? null,
        // Prompt/option text only — never an answer key. See
        // `preset_preview.py` on the backend for what is deliberately excluded.
        mcq: item.mcq ? { prompt: item.mcq.prompt || '', options: item.mcq.options || [] } : null,
        ranking: item.ranking ? { prompt: item.ranking.prompt || '', items: item.ranking.items || [] } : null,
        freeText: item.free_text ? { prompt: item.free_text.prompt || '' } : null,
      })),
    })),
  };
}

/**
 * The card's type strip, as an ordered array rather than the raw histogram —
 * `{ mcq: 4, technical_task: 1 }` iterates in insertion order, which is
 * whatever the database happened to return, so two identical templates could
 * render their mix in different orders.
 */
export function contentTypeChips(counts = {}) {
  return CONTENT_TYPE_ORDER
    .filter(type => counts[type])
    .map(type => ({
      type,
      count: counts[type],
      label: CONTENT_TYPE_META[type]?.label || type,
      tone: CONTENT_TYPE_META[type]?.tone || 'slate',
    }));
}
