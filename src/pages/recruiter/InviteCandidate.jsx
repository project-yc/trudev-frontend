// REDESIGNED � dark theme matching user flow
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, X, Loader, AlertCircle, CheckCircle, Users, Upload,
  Copy, Download, ArrowLeft, Mail, Trash2, Check, CheckCheck,
  Zap, Clock, Send, ExternalLink, Code, Tag,
} from 'lucide-react';
import { getAssessmentById, sendCandidateInvites } from '../../api/recruiter/assessment';

// ---------------------------------------------------------
function DarkInput({ value, onChange, placeholder, type = 'text', onKeyDown }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 bg-page border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all duration-150"
    />
  );
}

export default function InviteCandidate() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({ name: '', email: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLinks, setInviteLinks] = useState([]);
  const [showInviteLinks, setShowInviteLinks] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchAssessment(); }, [assessmentId]);

  const fetchAssessment = async () => {
    setLoading(true); setError('');
    try {
      const data = await getAssessmentById(assessmentId);
      setSelectedAssessment(data.data || data);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!newCandidate.name.trim() || !newCandidate.email.trim()) {
      setError('Please fill in name and email'); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCandidate.email)) {
      setError('Please enter a valid email address'); return;
    }
    if (candidates.some((c) => c.email === newCandidate.email)) {
      setError('This candidate is already in the list'); return;
    }
    setCandidates([...candidates, { ...newCandidate, id: Date.now() }]);
    setNewCandidate({ name: '', email: '' });
    setError('');
  };

  const handleParseCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const parsedCandidates = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const name = parts[0]?.trim();
        const email = parts[1]?.trim();
        if (name && email && emailRegex.test(email)) {
          const exists = candidates.some((c) => c.email === email) || parsedCandidates.some((c) => c.email === email);
          if (!exists) parsedCandidates.push({ id: Date.now() + i, name, email });
        }
      }
      if (parsedCandidates.length === 0) {
        setError('No valid candidates found. Expected CSV format: Name, Email'); return;
      }
      setCandidates([...candidates, ...parsedCandidates]);
      setSuccess(`${parsedCandidates.length} candidate${parsedCandidates.length !== 1 ? 's' : ''} imported!`);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to parse file. Please ensure it is a valid CSV.');
    }
    e.target.value = '';
  };

  const handleSendInvites = async () => {
    if (candidates.length === 0) { setError('Please add at least one candidate'); return; }
    setInviteLoading(true); setError('');
    try {
      const data = await sendCandidateInvites(selectedAssessment.id, candidates);
      const links = (data.data?.invites || []).map((item, idx) => ({
        id: idx,
        name: candidates[idx]?.name || 'Unknown',
        email: item.email,
        inviteLink: item.invite_link,
      }));
      setInviteLinks(links);
      setShowInviteLinks(true);
      setSuccess('Invitations sent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send invitations. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (link, linkId) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const downloadInviteLinks = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Invite Link'],
      ...inviteLinks.map((l) => [`"${l.name}"`, `"${l.email}"`, `"${l.inviteLink}"`]),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invites_${selectedAssessment.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeCandidateRow = (id) => setCandidates(candidates.filter((c) => c.id !== id));
  const goBack = () => navigate('/recruiter/dashboard');

  // -- Loading --
  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  // -- Assessment not found --
  if (!selectedAssessment) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="max-w-sm w-full rounded-2xl border border-border-default bg-surface p-10 text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text-primary mb-2">Assessment Not Found</h1>
          <p className="text-sm text-text-muted mb-6">The requested assessment could not be found.</p>
          <button onClick={goBack} className="px-5 py-2.5 bg-brand text-on-brand text-sm font-semibold rounded-lg hover:bg-brand transition-colors duration-150">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const task = selectedAssessment.tasks?.[0];

  // -----------------------------------------------------
  // INVITE LINKS VIEW
  // -----------------------------------------------------
  if (showInviteLinks) {
    return (
      <div className="min-h-screen bg-page text-text-primary">
        <header className="sticky top-0 z-40 border-b border-border-default bg-surface/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-brand" strokeWidth={2.5} />
              <span className="font-wordmark text-sm font-medium tracking-[0.01em] text-text-primary">Trudev</span>
            </div>
            <button onClick={goBack} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-muted px-3 py-2 rounded-lg transition-all duration-150">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          {/* Success banner */}
          <div className="rounded-2xl border border-success-border bg-success-bg px-6 py-5 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success-bg border border-success-border flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-text-primary">Invitations Sent</h2>
              <p className="text-sm text-text-muted mt-0.5">{inviteLinks.length} unique invite link{inviteLinks.length !== 1 ? 's' : ''} generated for <span className="text-text-secondary font-medium">{selectedAssessment.name}</span></p>
            </div>
            <button onClick={downloadInviteLinks} className="flex items-center gap-2 px-4 py-2 border border-border-default text-text-secondary text-xs font-semibold rounded-lg hover:border-brand hover:text-brand transition-all duration-150 flex-shrink-0">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Links list */}
          <div className="space-y-2.5">
            {inviteLinks.map((link) => (
              <div key={link.id} className="rounded-xl border border-border-default bg-surface px-5 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand-tint border border-brand-border flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-brand">
                  {link.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{link.name}</p>
                  <p className="text-xs text-text-muted truncate">{link.email}</p>
                  <p className="text-[11px] text-text-faint font-mono truncate mt-1">{link.inviteLink}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(link.inviteLink, link.id)}
                  title="Copy invite link"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 flex-shrink-0 ${
                    copiedLink === link.id
                      ? 'bg-success-bg border-success-border text-success'
                      : 'bg-brand-tint border-brand-border text-brand hover:bg-[#0a3552] hover:border-brand'
                  }`}
                >
                  {copiedLink === link.id ? <><CheckCheck className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy Link</>}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button onClick={() => { setCandidates([]); setInviteLinks([]); setShowInviteLinks(false); }} className="flex items-center gap-2 px-4 py-2.5 border border-border-default text-text-secondary text-sm font-semibold rounded-lg hover:border-brand hover:text-brand transition-all duration-150">
              <Plus className="w-4 h-4" />
              Invite More
            </button>
            <button onClick={goBack} className="flex items-center gap-2 px-4 py-2.5 bg-brand-tint border border-brand-border text-brand text-sm font-semibold rounded-lg hover:bg-[#0a3552] hover:border-brand transition-all duration-150">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // -----------------------------------------------------
  // MAIN INVITE FLOW
  // -----------------------------------------------------
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border-default bg-surface/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={goBack} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-muted px-3 py-2 rounded-lg transition-all duration-150 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-5 bg-[#0e1f38]" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text-primary truncate">{selectedAssessment.name}</h1>
            <p className="text-[11px] text-text-muted">Invite candidates to this assessment</p>
          </div>
          <button
            onClick={handleSendInvites}
            disabled={candidates.length === 0 || inviteLoading}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-on-brand text-sm font-semibold rounded-lg hover:bg-brand transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {inviteLoading ? (
              <><Loader className="w-4 h-4 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4" />Send Invites {candidates.length > 0 && `(${candidates.length})`}</>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Toasts */}
        {success && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-success-bg border border-success-border rounded-xl animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            <p className="text-sm text-success font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-[#1b0f15] border border-[#6a2335] rounded-xl animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* -- Left: Add candidates -- */}
          <div className="lg:col-span-2 space-y-4">
            {/* Manual add form */}
            <div className="rounded-xl border border-border-default bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-semibold text-text-primary">Add Candidates</h2>
              </div>

              {/* Inline form */}
              <div className="flex gap-2.5">
                <DarkInput
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  placeholder="Full name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate(e)}
                />
                <DarkInput
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  placeholder="Email address"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate(e)}
                />
                <button
                  onClick={handleAddCandidate}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand text-on-brand text-sm font-semibold rounded-xl hover:bg-brand transition-colors duration-150 active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-default" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-surface text-[11px] font-medium text-text-faint uppercase tracking-wider">or import</span>
                </div>
              </div>

              {/* CSV Upload */}
              <label className="flex items-center justify-center gap-2.5 px-4 py-5 border border-dashed border-border-default hover:border-brand/50 rounded-xl cursor-pointer transition-all duration-150 group bg-page/40 hover:bg-brand-tint/20">
                <Upload className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                <div className="text-center">
                  <span className="text-sm font-medium text-text-secondary group-hover:text-text-secondary transition-colors block">Upload CSV file</span>
                  <span className="text-[11px] text-text-faint">Format: Name, Email (one per row)</span>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleParseCSV} className="hidden" />
              </label>
            </div>

            {/* Candidate list */}
            {candidates.length > 0 && (
              <div className="rounded-xl border border-border-default bg-surface p-5 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold tracking-[0.15em] text-text-muted uppercase">Candidates ({candidates.length})</p>
                  <button onClick={() => setCandidates([])} className="text-[11px] text-[#3a4f6a] hover:text-error transition-colors duration-150">Clear all</button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 px-4 py-3 bg-page/60 border border-border-default rounded-lg hover:border-border-default transition-colors duration-150 group">
                      <div className="w-7 h-7 rounded-lg bg-brand-tint border border-brand-border flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-brand">
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{candidate.name}</p>
                        <p className="text-xs text-text-muted truncate">{candidate.email}</p>
                      </div>
                      <button onClick={() => removeCandidateRow(candidate.id)} className="p-1.5 text-[#3a4f6a] hover:text-error hover:bg-[#1b0f15] rounded-md transition-all duration-150 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {candidates.length === 0 && (
              <div className="rounded-xl border border-dashed border-border-default p-10 text-center">
                <Users className="w-8 h-8 text-[#1a3050] mx-auto mb-3" />
                <p className="text-sm text-text-muted font-medium">No candidates added yet</p>
                <p className="text-xs text-text-faint mt-1">Add manually above or import from CSV</p>
              </div>
            )}
          </div>

          {/* -- Right: Summary -- */}
          <div className="space-y-4 lg:sticky lg:top-20 h-fit">
            {/* Assessment card */}
            <div className="rounded-xl border border-border-default bg-surface p-5">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-text-muted uppercase mb-4">Assessment</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-text-muted mb-1">Name</p>
                  <p className="text-sm font-semibold text-text-primary">{selectedAssessment.name}</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-page/60 border border-border-default px-3 py-2.5">
                    <p className="text-[11px] text-text-muted">Duration</p>
                    <p className="text-sm font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-brand" />{selectedAssessment.duration_minutes}m
                    </p>
                  </div>
                  {task && (
                    <div className="flex-1 rounded-lg bg-page/60 border border-border-default px-3 py-2.5">
                      <p className="text-[11px] text-text-muted">Task</p>
                      <p className="text-sm font-semibold text-text-primary flex items-center gap-1 mt-0.5 truncate">
                        <Code className="w-3.5 h-3.5 text-brand flex-shrink-0" />{task.title}
                      </p>
                    </div>
                  )}
                </div>
                {task?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-tint border border-brand-border text-brand">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Candidate count */}
            <div className={`rounded-xl border p-5 transition-all duration-200 ${candidates.length > 0 ? 'border-brand-border bg-brand-tint' : 'border-border-default bg-surface'}`}>
              <p className="text-[11px] font-semibold tracking-[0.15em] text-text-muted uppercase mb-2">Ready to Invite</p>
              <p className={`text-4xl font-bold tracking-tight ${candidates.length > 0 ? 'text-brand' : 'text-[#1a3050]'}`}>
                {candidates.length}
              </p>
              <p className="text-xs text-text-muted mt-1">candidate{candidates.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Send button */}
            <button
              onClick={handleSendInvites}
              disabled={candidates.length === 0 || inviteLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-on-brand text-sm font-bold rounded-xl hover:bg-brand transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inviteLoading ? (
                <><Loader className="w-4 h-4 animate-spin" />Sending Invites...</>
              ) : (
                <><Send className="w-4 h-4" />Send {candidates.length > 0 ? `${candidates.length} ` : ''}Invite{candidates.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
