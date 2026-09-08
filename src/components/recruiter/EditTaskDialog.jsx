// EditTaskDialog — edit a library item's metadata and type-specific content.
//
// The dialog is presentational: it collects a patch payload and hands it to
// `onSave`. The caller decides where that payload lands — editing a Trudev
// (shared) item clones it into My Library first, since the shared original is
// not writable by a recruiter.
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Loader, Lock, GitBranch, Package } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { Badge } from '../ui/badge.jsx';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../ui/select.jsx';
import { TASK_LANGUAGE_OPTIONS as LANGUAGES } from '../../constants/taskLanguages';

// ─── helpers ──────────────────────────────────────────────────────────────────

function emptyOption() {
  return { text: '', is_correct: false, points: 0 };
}

function toFormState(item) {
  const td = item?.type_data || {};
  return {
    title: item?.title || '',
    difficulty: item?.difficulty || 'medium',
    seniority: item?.seniority || 'mid',
    domain: item?.domain || '',
    language: item?.language || '',
    tags: (item?.tags || []).join(', '),
    estimated_time_minutes: item?.estimated_time_minutes ?? '',
    prompt: td.prompt || '',
    explanation: td.explanation || '',
    selection_mode: td.selection_mode || 'single',
    options: (td.options || []).map(o => ({
      text: o.text || '',
      is_correct: !!o.is_correct,
      points: Number(o.points) || 0,
    })),
    word_limit: td.word_limit ?? '',
    grading_hints: td.grading_hints || '',
    sample_answer: td.sample_answer || '',
    scoring_mode: td.scoring_mode || 'weighted_partial',
    items: (td.items || []).map(i => ({ text: i.text || '' })),
  };
}

/** Build the PATCH/clone payload, omitting untouched type_data. */
function toPayload(form, contentType) {
  const payload = {
    title: form.title.trim(),
    difficulty: form.difficulty,
    seniority: form.seniority,
    domain: form.domain,
    language: form.language,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
  };

  const minutes = Number(form.estimated_time_minutes);
  if (Number.isFinite(minutes) && minutes > 0) payload.estimated_time_minutes = minutes;

  if (contentType === 'mcq') {
    payload.mcq = {
      prompt: form.prompt,
      selection_mode: form.selection_mode,
      explanation: form.explanation,
      options: form.options
        .filter(o => o.text.trim())
        .map(o => ({ text: o.text.trim(), is_correct: o.is_correct, points: Number(o.points) || 0 })),
    };
  } else if (contentType === 'free_text') {
    payload.free_text = { prompt: form.prompt };
    const limit = Number(form.word_limit);
    if (Number.isFinite(limit) && limit > 0) payload.free_text.word_limit = limit;
    if (form.grading_hints.trim()) payload.free_text.grading_hints = form.grading_hints.trim();
    // The model answer. Absent here, this dialog could show and rewrite a
    // free-text question without ever surfacing the field the AI grader reads.
    if (form.sample_answer.trim()) payload.free_text.sample_answer = form.sample_answer.trim();
  } else if (contentType === 'ranking') {
    payload.ranking = {
      prompt: form.prompt,
      scoring_mode: form.scoring_mode,
      items: form.items.filter(i => i.text.trim()).map(i => ({ text: i.text.trim() })),
    };
  }
  // technical_task: metadata only — the starter/grader bundles are not editable here.

  return payload;
}

function validate(form, contentType) {
  if (!form.title.trim()) return 'Title is required.';
  if (contentType === 'mcq') {
    if (!form.prompt.trim()) return 'Question prompt is required.';
    const filled = form.options.filter(o => o.text.trim());
    if (filled.length < 2) return 'Add at least two answer options.';
    if (!filled.some(o => o.is_correct)) return 'Mark at least one option as correct.';
  }
  if (contentType === 'free_text' && !form.prompt.trim()) return 'Question prompt is required.';
  if (contentType === 'ranking') {
    if (!form.prompt.trim()) return 'Question prompt is required.';
    if (form.items.filter(i => i.text.trim()).length < 2) return 'Add at least two items to rank.';
  }
  return null;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-text-primary">{label}</Label>
      {children}
      {hint && <p className="text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

function McqFields({ form, set }) {
  const setOption = (index, patch) =>
    set('options', form.options.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  return (
    <>
      <Field label="Question prompt" htmlFor="prompt">
        <Textarea
          id="prompt"
          value={form.prompt}
          onChange={e => set('prompt', e.target.value)}
          placeholder="What does [x*2 for x in range(5)] return?"
          rows={3}
        />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] font-semibold text-text-primary">Answer options</Label>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={() => set('options', [...form.options, emptyOption()])}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add option
          </Button>
        </div>

        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setOption(i, { is_correct: !opt.is_correct, points: !opt.is_correct ? 1 : 0 })}
                aria-pressed={opt.is_correct}
                aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`}
                className={`mt-1 w-6 h-6 flex-shrink-0 rounded-md border text-[11px] font-bold transition-colors duration-150 ${
                  opt.is_correct
                    ? 'bg-success text-white border-success'
                    : 'border-border-default text-text-muted hover:border-brand hover:text-brand'
                }`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <Input
                value={opt.text}
                onChange={e => setOption(i, { text: e.target.value })}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 h-9 text-[13px]"
              />
              <Input
                type="number" min="0" step="0.5"
                value={opt.points}
                onChange={e => setOption(i, { points: e.target.value })}
                aria-label="Points"
                className="w-20 h-9 text-[13px]"
              />
              <button
                type="button"
                onClick={() => set('options', form.options.filter((_, idx) => idx !== i))}
                aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
                className="mt-1 text-text-muted hover:text-error transition-colors duration-150"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {form.options.length === 0 && (
            <p className="text-[12px] text-text-muted py-2">No options yet — add at least two.</p>
          )}
        </div>
        <p className="text-[12px] text-text-muted">Click the letter to toggle the correct answer.</p>
      </div>

      <Field label="Explanation" htmlFor="explanation" hint="Optional — shown after the candidate answers.">
        <Textarea
          id="explanation"
          value={form.explanation}
          onChange={e => set('explanation', e.target.value)}
          rows={2}
        />
      </Field>
    </>
  );
}

function FreeTextFields({ form, set }) {
  return (
    <>
      <Field label="Question prompt" htmlFor="prompt">
        <Textarea id="prompt" value={form.prompt} onChange={e => set('prompt', e.target.value)} rows={3} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Word limit" htmlFor="word_limit" hint="Optional.">
          <Input
            id="word_limit" type="number" min="1"
            value={form.word_limit}
            onChange={e => set('word_limit', e.target.value)}
            className="h-9 text-[13px]"
          />
        </Field>
      </div>
      <Field label="Model answer" htmlFor="sample_answer" hint="Internal — the answer the grader compares against. Never shown to candidates.">
        <Textarea
          id="sample_answer"
          value={form.sample_answer}
          onChange={e => set('sample_answer', e.target.value)}
          rows={3}
        />
      </Field>
      <Field label="Grading hints" htmlFor="grading_hints" hint="Internal — guides the grader, never shown to candidates.">
        <Textarea
          id="grading_hints"
          value={form.grading_hints}
          onChange={e => set('grading_hints', e.target.value)}
          rows={2}
        />
      </Field>
    </>
  );
}

function RankingFields({ form, set }) {
  return (
    <>
      <Field label="Question prompt" htmlFor="prompt">
        <Textarea id="prompt" value={form.prompt} onChange={e => set('prompt', e.target.value)} rows={3} />
      </Field>

      <Field label="Scoring mode" htmlFor="scoring_mode">
        <Select value={form.scoring_mode} onValueChange={v => set('scoring_mode', v)}>
          <SelectTrigger id="scoring_mode" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="exact_match">Exact match</SelectItem>
            <SelectItem value="weighted_partial">Weighted partial</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] font-semibold text-text-primary">Items — in correct order</Label>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={() => set('items', [...form.items, { text: '' }])}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add item
          </Button>
        </div>
        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 flex-shrink-0 rounded-md bg-surface-muted text-text-secondary text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <Input
                value={item.text}
                onChange={e => set('items', form.items.map((it, idx) => (idx === i ? { text: e.target.value } : it)))}
                placeholder={`Rank ${i + 1}`}
                className="flex-1 h-9 text-[13px]"
              />
              <button
                type="button"
                onClick={() => set('items', form.items.filter((_, idx) => idx !== i))}
                aria-label={`Remove item ${i + 1}`}
                className="text-text-muted hover:text-error transition-colors duration-150"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {form.items.length === 0 && (
            <p className="text-[12px] text-text-muted py-2">No items yet — add at least two.</p>
          )}
        </div>
      </div>
    </>
  );
}

function TechnicalTaskFields({ item }) {
  const td = item?.type_data || {};
  const isGit = td.source_type === 'git';
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-muted/40 p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
        {isGit ? <GitBranch className="w-4 h-4 text-text-muted" /> : <Package className="w-4 h-4 text-text-muted" />}
        Task bundle
        <Badge className="bg-surface text-text-secondary border-border-subtle text-[11px] font-medium">
          {isGit ? 'Git' : 'Uploaded zip'}
        </Badge>
      </div>
      {isGit ? (
        <p className="text-[12px] text-text-secondary break-all">
          {td.git_repo_url}{td.git_branch ? ` · ${td.git_branch}` : ''}
        </p>
      ) : (
        <p className="text-[12px] text-text-secondary break-all">
          {td.starter_bundle_s3_key || td.task_zip_s3_key || 'No bundle attached.'}
        </p>
      )}
      <p className="flex items-start gap-1.5 text-[12px] text-text-muted">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Starter files and hidden tests can&apos;t be changed here — only the details above.
        Use the code view to inspect the repo.
      </p>
    </div>
  );
}

// ─── dialog ───────────────────────────────────────────────────────────────────

export default function EditTaskDialog({
  open,
  onOpenChange,
  item,
  /** True when editing a shared Trudev item — saving forks a copy into My Library. */
  forksOnSave = false,
  domainOptions = [],
  difficultyOptions = [],
  seniorityOptions = [],
  onSave,
}) {
  const [form, setForm] = useState(() => toFormState(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const contentType = item?.content_type || 'mcq';

  // Reset whenever a different item is opened.
  useEffect(() => {
    if (open) {
      setForm(toFormState(item));
      setError('');
    }
  }, [open, item]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const selectOptions = useMemo(() => ({
    difficulty: difficultyOptions.filter(o => o.value),
    seniority: seniorityOptions.filter(o => o.value),
    domain: domainOptions.filter(o => o.value),
  }), [difficultyOptions, seniorityOptions, domainOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate(form, contentType);
    if (problem) { setError(problem); return; }

    setSaving(true);
    setError('');
    try {
      await onSave(toPayload(form, contentType));
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not save this task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-[18px] font-bold">Edit task</DialogTitle>
          <DialogDescription className="text-[13px]">
            {forksOnSave
              ? 'This is a shared Trudev task, so saving stores an editable copy in My Library. The original is left untouched.'
              : 'Changes are saved to this task in My Library.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
            <Field label="Title" htmlFor="title">
              <Input
                id="title"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="h-9 text-[13px]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Difficulty" htmlFor="difficulty">
                <Select value={form.difficulty} onValueChange={v => set('difficulty', v)}>
                  <SelectTrigger id="difficulty" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectOptions.difficulty.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Seniority" htmlFor="seniority">
                <Select value={form.seniority} onValueChange={v => set('seniority', v)}>
                  <SelectTrigger id="seniority" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectOptions.seniority.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Domain" htmlFor="domain">
                <Select value={form.domain} onValueChange={v => set('domain', v)}>
                  <SelectTrigger id="domain" className="h-9 text-[13px]">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptions.domain.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Language" htmlFor="language">
                <Select value={form.language} onValueChange={v => set('language', v)}>
                  <SelectTrigger id="language" className="h-9 text-[13px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Estimated time" htmlFor="estimated_time_minutes" hint="Minutes.">
                <Input
                  id="estimated_time_minutes" type="number" min="1"
                  value={form.estimated_time_minutes}
                  onChange={e => set('estimated_time_minutes', e.target.value)}
                  className="h-9 text-[13px]"
                />
              </Field>
              <Field label="Tags" htmlFor="tags" hint="Comma separated.">
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="simulation, pagination"
                  className="h-9 text-[13px]"
                />
              </Field>
            </div>

            <div className="border-t border-border-subtle pt-5 space-y-5">
              {contentType === 'mcq' && <McqFields form={form} set={set} />}
              {contentType === 'free_text' && <FreeTextFields form={form} set={set} />}
              {contentType === 'ranking' && <RankingFields form={form} set={set} />}
              {contentType === 'technical_task' && <TechnicalTaskFields item={item} />}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 px-4 py-3 bg-error-bg border border-error-border rounded-lg animate-in fade-in-0 slide-in-from-top-1 duration-200"
              >
                <p className="text-[13px] text-error">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border-subtle flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="cta" disabled={saving}>
              {saving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {forksOnSave ? 'Save to My Library' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
