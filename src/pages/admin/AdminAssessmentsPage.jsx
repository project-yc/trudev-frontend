// AdminAssessmentsPage — Manage assessments and their tasks
import { useState, useEffect, useRef } from 'react';
import {
  Layers, Plus, Search, RefreshCw, Loader, AlertCircle,
  CheckCircle, ChevronDown, ChevronRight, Clock, Tag,
  Pencil, Trash2, X, GitBranch, MessageSquare, Zap, ZapOff, Sparkles, LayoutTemplate,
} from 'lucide-react';
import {
  getAllAssessments,
  createAssessment,
  createTask,
  getTaskById,
  updateTask,
  verifyGitSource,
} from '../../api/recruiter/assessment';
import { createPresetFromAssessment } from '../../api/admin/presets';
import { AI_LEVEL_OPTIONS } from '../../constants/aiLevels';

const GITHUB_REPO_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

// ── small helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls = 'w-full px-3 py-2.5 bg-page border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all duration-150';
const textareaCls = inputCls + ' resize-none';

// ── Create Assessment modal ───────────────────────────────────────────────────
function CreateAssessmentModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', description: '', duration_minutes: '', ai_level: 'full' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Labels come from the shared option list; only the admin-facing description
  // and icon are local.
  const AI_OPTION_META = {
    full:               { desc: 'Orchestrator + chat + completions',            Icon: Sparkles      },
    chat_only:          { desc: 'Chat (manual context) + completions',          Icon: MessageSquare },
    chat_guided:        { desc: 'Chat explains and hints only — no solutions',  Icon: MessageSquare },
    inline_completions: { desc: 'Code suggestions only',                        Icon: Zap           },
    none:               { desc: 'All AI features disabled',                     Icon: ZapOff        },
  };
  const AI_OPTIONS = AI_LEVEL_OPTIONS.map(option => ({ ...option, ...AI_OPTION_META[option.value] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.duration_minutes) {
      setError('All fields are required.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await createAssessment(form.name, form.description, parseInt(form.duration_minutes), { ai_level: form.ai_level });
      onCreated(res.data || res);
    } catch (err) { setError(err.message || 'Failed to create.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border-default shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface px-6 py-4 border-b border-border-default flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-tint border border-brand-border/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-brand" />
            </div>
            <h2 className="text-[15px] font-bold text-text-primary">Create Assessment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-lg text-text-muted hover:text-text-primary transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <Field label="Assessment Name">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Senior Backend Engineer" className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe the purpose and goals..." className={textareaCls} />
            </Field>
            <Field label="Duration (minutes)">
              <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="e.g., 90" className={inputCls} />
            </Field>
            <Field label="AI Assistance Level">
              <div className="grid grid-cols-2 gap-2">
                {AI_OPTIONS.map(({ value, label, desc, Icon }) => (
                  <button
                    key={value} type="button"
                    onClick={() => setForm(f => ({ ...f, ai_level: value }))}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-150 ${form.ai_level === value ? 'border-brand bg-brand-tint' : 'border-border-default bg-page hover:border-border-strong'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${form.ai_level === value ? 'text-brand' : 'text-text-muted'}`} />
                      <span className={`text-[12px] font-bold ${form.ai_level === value ? 'text-brand' : 'text-text-primary'}`}>{label}</span>
                    </div>
                    <span className="text-[11px] text-text-muted leading-relaxed">{desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-error-bg border border-error-border rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                <p className="text-[12px] text-error">{error}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border-default bg-surface-muted/30">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-text-secondary hover:bg-surface-muted rounded-lg transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-all disabled:opacity-60">
              {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create / Edit Task modal ──────────────────────────────────────────────────
function TaskModal({ mode, assessments, initialData, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => isEdit
    ? { ...initialData, tags: (initialData.tags || []).join(', ') }
    : { assessment_id: '', title: '', incident_brief: '', reproduction: '', difficulty: 'mid',
        estimated_time_minutes: '', tags: '', source_type: 'local', git_repo_url: '', git_branch: '' }
  );
  const [services, setServices]   = useState(isEdit ? (initialData.additional_info?.environment_services || [{ id: 1, name: '', status: 'healthy' }]) : [{ id: 1, name: '', status: 'healthy' }]);
  const [verification, setVerify] = useState({ verified: isEdit && form.source_type !== 'git', message: '', error: '' });
  const [loading, setLoading]     = useState(false);
  const [vLoading, setVLoading]   = useState(false);
  const [error, setError]         = useState('');

  const set = (key, val) => {
    setForm(f => {
      const n = { ...f, [key]: val };
      if (key === 'source_type' && val === 'local') { n.git_repo_url = ''; n.git_branch = ''; }
      return n;
    });
    if (['git_repo_url','git_branch','source_type'].includes(key))
      setVerify({ verified: false, message: '', error: '' });
  };

  const verifyGit = async () => {
    if (!form.git_repo_url?.trim() || !GITHUB_REPO_RE.test(form.git_repo_url)) {
      setVerify({ verified: false, message: '', error: 'Valid GitHub URL required.' }); return;
    }
    if (!form.git_branch?.trim()) {
      setVerify({ verified: false, message: '', error: 'Branch name required.' }); return;
    }
    setVLoading(true); setVerify({ verified: false, message: '', error: '' });
    try {
      const r = await verifyGitSource({ taskId: isEdit ? form.id : null, gitRepoUrl: form.git_repo_url.trim(), gitBranch: form.git_branch.trim() });
      if (r.reachable && r.branch_exists) setVerify({ verified: true, message: 'Branch verified', error: '' });
      else setVerify({ verified: false, message: '', error: r.error || 'Branch not found.' });
    } catch (err) { setVerify({ verified: false, message: '', error: err.message }); }
    finally { setVLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.source_type === 'git' && !verification.verified) {
      setError('Verify branch before saving.'); return;
    }
    setLoading(true); setError('');
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const additionalInfo = {
        reproduction: form.reproduction,
        difficulty: form.difficulty,
        estimated_time_minutes: form.estimated_time_minutes ? parseInt(form.estimated_time_minutes) : null,
        environment_services: services.filter(s => s.name),
      };
      let saved;
      if (isEdit) {
        const res = await updateTask(form.id, {
          title: form.title,
          description: form.incident_brief,
          source_type: form.source_type,
          git_repo_url: form.source_type === 'git' ? form.git_repo_url.trim() : null,
          git_branch:   form.source_type === 'git' ? form.git_branch.trim()   : null,
        });
        saved = res.data || res;
      } else {
        const res = await createTask(
          form.assessment_id, form.title, form.incident_brief, tags, [], additionalInfo,
          form.source_type,
          form.source_type === 'git' ? form.git_repo_url.trim() : null,
          form.source_type === 'git' ? form.git_branch.trim()   : null,
        );
        saved = res.data || res;
      }
      onSaved(saved, form.assessment_id || initialData?.assessment_id);
    } catch (err) { setError(err.message || 'Failed to save task.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-default shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between flex-shrink-0 bg-surface">
          <h2 className="text-[15px] font-bold text-text-primary">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-lg text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form id="task-form" onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {!isEdit && (
                <Field label="Assessment">
                  <select value={form.assessment_id} onChange={e => set('assessment_id', e.target.value)} className={inputCls}>
                    <option value="">Select an assessment…</option>
                    {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Task Title">
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Fix authentication bug" className={inputCls} />
              </Field>
              <Field label="Incident Brief">
                <textarea value={form.incident_brief} onChange={e => set('incident_brief', e.target.value)} rows={4} placeholder="Describe the incident shown to candidates…" className={textareaCls} />
              </Field>
              <Field label="Codebase Source">
                <div className="grid grid-cols-2 gap-2">
                  {['local','git'].map(v => (
                    <button key={v} type="button" onClick={() => set('source_type', v)}
                      className={`px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all duration-150 ${form.source_type === v ? 'border-brand bg-brand-tint text-brand' : 'border-border-default bg-page text-text-secondary hover:border-border-strong'}`}
                    >{v === 'local' ? 'Local Upload' : 'Git Repository'}</button>
                  ))}
                </div>
              </Field>
              {form.source_type === 'git' && (
                <>
                  <Field label="Repository URL">
                    <input value={form.git_repo_url} onChange={e => set('git_repo_url', e.target.value)} placeholder="https://github.com/org/repo" className={inputCls} />
                    {form.git_repo_url && !GITHUB_REPO_RE.test(form.git_repo_url) && (
                      <p className="mt-1 text-[11px] text-error">Must match https://github.com/[owner]/[repo]</p>
                    )}
                  </Field>
                  <Field label="Branch">
                    <div className="flex gap-2">
                      <input value={form.git_branch} onChange={e => set('git_branch', e.target.value)} placeholder="main" className={inputCls} />
                      <button type="button" onClick={verifyGit} disabled={vLoading}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold rounded-lg border transition-all disabled:opacity-60 ${verification.verified ? 'border-success-border bg-success-bg text-success' : 'border-border-strong bg-page text-text-secondary hover:text-text-primary'}`}
                      >
                        {vLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                        {verification.verified ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                    {verification.error && <p className="mt-1 text-[11px] text-error">{verification.error}</p>}
                    {verification.message && !verification.error && <p className="mt-1 text-[11px] text-success">{verification.message}</p>}
                  </Field>
                </>
              )}
              {!isEdit && (
                <>
                  <Field label="Tags (comma-separated)">
                    <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="python, backend, rest-api" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Difficulty">
                      <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={inputCls}>
                        {['easy','mid','hard'].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}
                      </select>
                    </Field>
                    <Field label="Est. Time (min)">
                      <input type="number" min="1" value={form.estimated_time_minutes} onChange={e => set('estimated_time_minutes', e.target.value)} placeholder="60" className={inputCls} />
                    </Field>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-semibold text-text-secondary">Environment Services</label>
                      <button type="button" onClick={() => setServices(s => [...s, { id: Date.now(), name: '', status: 'healthy' }])}
                        className="text-[11px] text-brand hover:underline font-semibold">+ Add service</button>
                    </div>
                    <div className="space-y-2">
                      {services.map((svc, i) => (
                        <div key={svc.id} className="flex gap-2">
                          <input value={svc.name} onChange={e => setServices(s => s.map(x => x.id === svc.id ? { ...x, name: e.target.value } : x))} placeholder="Service name" className={inputCls} />
                          <select value={svc.status} onChange={e => setServices(s => s.map(x => x.id === svc.id ? { ...x, status: e.target.value } : x))} className="w-32 px-2 py-2.5 bg-page border border-border-default rounded-lg text-[12px] text-text-primary focus:outline-none focus:border-brand">
                            {['healthy','degraded','down'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {services.length > 1 && (
                            <button type="button" onClick={() => setServices(s => s.filter(x => x.id !== svc.id))} className="p-2 text-text-muted hover:text-error transition-colors"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-error-bg border border-error-border rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                  <p className="text-[12px] text-error">{error}</p>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border-default bg-surface-muted/30 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-text-secondary hover:bg-surface-muted rounded-lg transition-all">Cancel</button>
          <button type="submit" form="task-form" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-[13px] font-semibold rounded-lg hover:bg-brand-hover transition-all disabled:opacity-60">
            {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assessment row ────────────────────────────────────────────────────────────
// Promoting an assessment is how a template gets its questions: the admin builds
// the assessment in the recruiter builder they already have, then lifts it onto
// the shelf. The duration, config and section tree all come across from the
// assessment — this form only collects the catalogue metadata an assessment has
// no field for.
function PromoteToTemplateModal({ assessment, onClose, onPromoted }) {
  const [form, setForm] = useState({
    name: assessment.name || '',
    target_role: '',
    summary: '',
    difficulty: 'medium',
    seniority: assessment.config_json?.seniority || 'mid',
    skills: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const splitList = v => v.split(',').map(x => x.trim()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('A template name is required.'); return; }
    setSaving(true); setError('');
    try {
      const preset = await createPresetFromAssessment({
        assessment_id: assessment.id,
        name: form.name.trim(),
        target_role: form.target_role.trim(),
        summary: form.summary.trim(),
        difficulty: form.difficulty,
        seniority: form.seniority,
        skills: splitList(form.skills),
        tags: splitList(form.tags),
      });
      onPromoted(preset);
    } catch (err) {
      setError(err.message || 'Could not promote this assessment.');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 bg-page border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-surface border border-border-default rounded-2xl p-6">
        <h2 className="text-[16px] font-bold text-text-primary font-display">Promote to template</h2>
        <p className="text-[12px] text-text-secondary mt-1">
          Copies this assessment onto the platform shelf. It is created as a draft —
          publish it from the Templates page when it is ready.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Template name">
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
          </div>
          <Field label="Target role">
            <input className={inputCls} value={form.target_role} onChange={e => set('target_role', e.target.value)} placeholder="Backend Engineer" />
          </Field>
          <Field label="Difficulty">
            <select className={inputCls} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Summary">
              <input className={inputCls} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="One line, shown on the gallery card." />
            </Field>
          </div>
          <Field label="Skills covered">
            <input className={inputCls} value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="REST APIs, Postgres" />
          </Field>
          <Field label="Tags">
            <input className={inputCls} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="python, api" />
          </Field>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 px-4 py-3 bg-error-bg border border-error-border rounded-xl text-[13px] text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-text-secondary border border-border-default rounded-xl hover:bg-surface-muted transition-all">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-brand text-on-brand text-[13px] font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-all">
            {saving ? 'Promoting...' : 'Promote'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssessmentRow({ assessment, onAddTask, onEditTask, onPromote }) {
  const [open, setOpen] = useState(false);
  const tasks = assessment.tasks || [];

  return (
    <div className="bg-surface border border-border-default rounded-xl overflow-hidden transition-all duration-200 hover:border-border-strong">
      <button
        type="button"
        className="w-full text-left px-5 py-4 flex items-center gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${open ? 'bg-brand-tint' : 'bg-surface-muted'}`}>
          {open ? <ChevronDown className="w-3 h-3 text-brand" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-text-primary">{assessment.name}</p>
          <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-1">{assessment.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted bg-surface-muted border border-border-default px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />{assessment.duration_minutes}m
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand-tint border border-brand-border/30 px-2 py-1 rounded-lg">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border-default">
          {tasks.length > 0 && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] bg-surface-muted/50 px-5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-default">
                <span>Task</span>
                <span className="pr-4">Source</span>
                <span>Actions</span>
              </div>
              {tasks.map(task => (
                <div key={task.id} className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{task.title}</p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">{task.description}</p>
                  </div>
                  <div className="pr-4">
                    {task.source_type === 'git' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <GitBranch className="w-3 h-3" />Git
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] font-semibold px-2 py-1 rounded-lg bg-surface-muted border border-border-default text-text-muted">Local</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditTask(task, assessment.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-text-secondary border border-border-default rounded-lg hover:bg-surface-muted hover:text-text-primary transition-all"
                  >
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddTask(assessment.id)}
              className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-brand border border-brand-border/40 bg-brand-tint rounded-lg hover:bg-brand-tint/80 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />Add Task
            </button>
            <button
              type="button"
              onClick={() => onPromote(assessment)}
              className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-text-secondary border border-border-default rounded-lg hover:bg-surface-muted hover:text-text-primary transition-all"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />Promote to template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [taskModal, setTaskModal]     = useState(null); // { mode: 'create'|'edit', assessmentId?, data? }
  const [promoting, setPromoting]     = useState(null); // the assessment being promoted to a template

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAllAssessments();
        setAssessments(res.data ?? res ?? []);
      } catch (err) {
        setError(err.message || 'Failed to load assessments.');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const toast = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const filtered = assessments.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openEditTask = async (task, assessmentId) => {
    try {
      const res = await getTaskById(task.id);
      const full = res.data || res;
      setTaskModal({ mode: 'edit', data: { ...full, incident_brief: full.description, assessment_id: assessmentId } });
    } catch (err) { setError(err.message); }
  };

  const handleTaskSaved = (saved, assessmentId) => {
    setAssessments(prev => prev.map(a => {
      if (a.id !== assessmentId) return a;
      const tasks = a.tasks || [];
      const idx = tasks.findIndex(t => t.id === saved.id);
      return { ...a, tasks: idx >= 0 ? tasks.map(t => t.id === saved.id ? saved : t) : [...tasks, saved] };
    }));
    toast(taskModal?.mode === 'edit' ? 'Task updated.' : 'Task created.');
    setTaskModal(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-page">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-border-default bg-surface">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-tint border border-brand-border/40 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-brand" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-text-primary font-display leading-none">Assessments</h1>
              <p className="text-[12px] text-text-secondary mt-0.5">Manage assessment templates and their tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assessments…"
                className="pl-8 pr-3 py-2 w-52 bg-page border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
              />
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-[13px] font-semibold rounded-xl hover:bg-brand-hover transition-all">
              <Plus className="w-3.5 h-3.5" />New Assessment
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 max-w-5xl">
        {success && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-success-bg border border-success-border rounded-xl">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            <p className="text-[13px] text-success font-semibold">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-error-bg border border-error-border rounded-xl">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            <p className="text-[13px] text-error">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-text-muted">
            <Loader className="w-5 h-5 animate-spin" /><span className="text-[13px]">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-text-muted">
            <Layers className="w-10 h-10 opacity-25" />
            <p className="text-[14px] font-semibold text-text-secondary">{search ? 'No matches found' : 'No assessments yet'}</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-brand text-on-brand text-[13px] font-semibold rounded-xl hover:bg-brand-hover transition-all">
                Create First Assessment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-text-muted mb-1">{filtered.length} assessment{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(a => (
              <AssessmentRow
                key={a.id}
                assessment={a}
                onAddTask={(aid) => setTaskModal({ mode: 'create', data: { assessment_id: aid } })}
                onEditTask={openEditTask}
                onPromote={setPromoting}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAssessmentModal
          onClose={() => setShowCreate(false)}
          onCreated={(a) => { setAssessments(p => [a, ...p]); setShowCreate(false); toast('Assessment created.'); }}
        />
      )}

      {promoting && (
        <PromoteToTemplateModal
          assessment={promoting}
          onClose={() => setPromoting(null)}
          onPromoted={() => { setPromoting(null); toast('Template created as a draft - publish it from Templates.'); }}
        />
      )}

      {taskModal && (
        <TaskModal
          mode={taskModal.mode}
          assessments={assessments}
          initialData={taskModal.data}
          onClose={() => setTaskModal(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
