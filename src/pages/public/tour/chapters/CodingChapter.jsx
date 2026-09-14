// Chapter 1 — the candidate's coding workspace, replayed.
//
// A mock of the real Theia workspace built from the recruiter code view's
// parts (explorer, tabs, Dark+ editor), plus the pieces only the candidate
// sees: the AI assistant, the terminal, the clock and Submit. Everything on
// screen is derived from `view` (see tourScript.js); nothing here keeps its
// own copy of the story.

import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react';
import { BookText, CheckCircle2, ChevronDown, ChevronRight, Clock, Files, GitBranch, Search, X } from 'lucide-react';

import { VSC, vscodeDark } from '../../../recruiter/vscodeTheme.js';
import { LANGUAGE_EXTENSIONS, allDirectoryPaths, buildTree } from '../../../recruiter/vscodeTree.js';
import { ActivityButton, FileIcon, SidebarSectionHeader, VscMarkdown } from '../../../recruiter/vscodeParts.jsx';
import { formatTime } from '../../../../components/candidate/exam/ExamTimer';
import { TASK_FILES, TASK_META } from '../fixtures/codingTask';
import { useCountdown } from '../tourHooks';
import MockAiChat from '../components/MockAiChat';
import MockTerminal from '../components/MockTerminal';

const LANGUAGE_BY_PATH = Object.fromEntries(TASK_FILES.map(f => [f.path, f.language]));
const TREE = buildTree(TASK_FILES);
const EXPANDED = allDirectoryPaths(TASK_FILES);
const noop = () => {};

function ExplorerNode({ node, depth, activePath, modified }) {
  const isDir = node.type === 'dir';
  const isActive = !isDir && node.path === activePath;
  const isModified = !isDir && modified.includes(node.path);

  return (
    <li>
      <div
        className="flex h-[22px] items-center gap-1 pr-2 text-[13px]"
        style={{
          paddingLeft: `${depth * 10 + 8}px`,
          background: isActive ? VSC.listSelected : 'transparent',
          color: isModified ? '#E2C08D' : isActive ? VSC.fgBright : '#CCCCCC',
        }}
      >
        {isDir
          ? (EXPANDED.has(node.path)
            ? <ChevronDown className="h-4 w-4 shrink-0" style={{ color: VSC.fgMuted }} />
            : <ChevronRight className="h-4 w-4 shrink-0" style={{ color: VSC.fgMuted }} />)
          : <span className="w-4 shrink-0" />}
        {!isDir && <FileIcon path={node.path} className="h-[15px] w-[15px] shrink-0" />}
        <span className="truncate">{node.name}</span>
        {isModified && <span className="ml-auto text-[11px] font-semibold">M</span>}
      </div>
      {isDir && EXPANDED.has(node.path) && (
        <ul>
          {node.children.map(child => (
            <ExplorerNode key={child.path} node={child} depth={depth + 1} activePath={activePath} modified={modified} />
          ))}
        </ul>
      )}
    </li>
  );
}

function EditorPane({ path, content }) {
  const language = LANGUAGE_BY_PATH[path];
  const extensions = useMemo(() => {
    const build = LANGUAGE_EXTENSIONS[language];
    return [...vscodeDark, EditorView.lineWrapping, ...(build ? [build()] : [])];
  }, [language]);

  // Markdown opens as a rendered preview, the way candidates read the ticket.
  if (language === 'markdown') {
    return (
      <div className="h-full overflow-y-auto px-8 py-6" style={{ background: VSC.editorBg }}>
        <div className="max-w-[760px]">
          <VscMarkdown>{content}</VscMarkdown>
        </div>
      </div>
    );
  }

  return (
    <CodeMirror
      key={`${path}:${content.length}`}
      value={content}
      className="h-full"
      height="100%"
      theme="none"
      extensions={extensions}
      editable={false}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        highlightSelectionMatches: false,
      }}
    />
  );
}

function GradeOverlay({ grade }) {
  const reduce = useReducedMotion();
  return (
    <Motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex items-center justify-center p-6"
      style={{ background: 'rgba(15,15,15,0.72)', backdropFilter: 'blur(3px)' }}
    >
      <Motion.div
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] rounded-xl border p-6"
        style={{ background: VSC.sidebarBg, borderColor: VSC.contrastBorder }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: VSC.fgMuted }}>
          Submitted · graded in an isolated container
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {[
            ['Visible tests', grade.visible],
            ['Hidden tests', grade.hidden],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-2.5 rounded-md px-3 py-2.5" style={{ background: VSC.editorBg }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#89D185' }} />
              <span className="text-[13px]" style={{ color: VSC.fg }}>{label}</span>
              <span className="ml-auto text-[14px] font-semibold" style={{ color: VSC.fgBright }}>{value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12.5px] leading-[1.55]" style={{ color: VSC.fgMuted }}>
          The rubric review and the follow-up interview start from this submission.
        </p>
      </Motion.div>
    </Motion.div>
  );
}

export default function CodingChapter({ view, company, role }) {
  const remaining = useCountdown(74 * 60 + 12, !view.submitted);
  const content = view.files[view.active] ?? '';
  const pathSegments = view.active.split('/');

  return (
    <div className="flex h-full flex-col" style={{ background: VSC.editorBg, color: VSC.fg }}>
      {/* Title bar: whose assessment, which ticket, the clock and Submit. */}
      <header
        className="flex h-[38px] shrink-0 items-center gap-3 border-b px-3"
        style={{ background: VSC.titleBarBg, borderColor: '#2B2B2B' }}
      >
        <span className="truncate text-[12px]" style={{ color: '#CCCCCC' }}>
          <span className="font-semibold" style={{ color: VSC.fgBright }}>{company}</span>
          <span style={{ color: VSC.fgFaint }}> · {role} assessment · </span>
          {TASK_META.id} {TASK_META.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded px-2 py-1 text-[11.5px] md:flex" style={{ background: '#4D4D4D', color: '#CCCCCC' }}>
            AI: {TASK_META.aiLevel}
          </span>
          <span className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] tabular-nums" style={{ background: '#4D4D4D', color: '#E7E7E7' }}>
            <Clock className="h-3.5 w-3.5" />
            {view.submitted ? 'Finished in 53:44' : `${formatTime(remaining)} left`}
          </span>
          <span
            data-tour="submit"
            className="rounded px-3 py-1 text-[12px] font-semibold"
            style={{ background: view.submitted ? '#2D7D46' : VSC.accent, color: '#fff' }}
          >
            {view.submitted ? 'Submitted' : 'Submit'}
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav className="flex w-12 shrink-0 flex-col items-center" style={{ background: VSC.activityBg }} aria-hidden="true">
          <ActivityButton active label="Explorer" icon={<Files className="h-6 w-6" strokeWidth={1.5} />} onClick={noop} />
          <ActivityButton active={false} label="Search" icon={<Search className="h-6 w-6" strokeWidth={1.5} />} onClick={noop} />
          <ActivityButton active={false} label="Source control" icon={<GitBranch className="h-6 w-6" strokeWidth={1.5} />} onClick={noop} />
          <ActivityButton active={false} label="Task brief" icon={<BookText className="h-6 w-6" strokeWidth={1.5} />} onClick={noop} />
        </nav>

        {/* Explorer */}
        <aside
          data-tour="explorer"
          className="hidden w-[210px] shrink-0 flex-col border-r xl:flex"
          style={{ background: VSC.sidebarBg, borderColor: VSC.panelBorder }}
        >
          <SidebarSectionHeader>Explorer</SidebarSectionHeader>
          <div
            className="flex h-[22px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: '#CCCCCC', background: '#37373D' }}
          >
            <ChevronDown className="h-4 w-4" style={{ color: VSC.fgMuted }} />
            <span className="truncate">{TASK_META.repo}</span>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {TREE.map(node => (
              <ExplorerNode key={node.path} node={node} depth={0} activePath={view.active} modified={view.modified} />
            ))}
          </ul>
        </aside>

        {/* Editor group + terminal */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div data-tour="editor" className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-stretch overflow-x-auto" style={{ background: VSC.sidebarBg }}>
              {view.openTabs.map(path => {
                const active = path === view.active;
                const modified = view.modified.includes(path);
                return (
                  <div
                    key={path}
                    className="relative flex h-[35px] items-center gap-1.5 whitespace-nowrap border-r pl-3 pr-2 text-[13px]"
                    style={{
                      background: active ? VSC.tabActiveBg : VSC.tabInactiveBg,
                      color: modified ? '#E2C08D' : active ? VSC.fgBright : '#8F8F8F',
                      borderColor: '#252526',
                    }}
                  >
                    {active && <span className="absolute left-0 right-0 top-0 h-px" style={{ background: VSC.accent }} />}
                    <FileIcon path={path} className="h-[15px] w-[15px] shrink-0" />
                    <span>{LANGUAGE_BY_PATH[path] === 'markdown' ? `Preview ${path.split('/').pop()}` : path.split('/').pop()}</span>
                    {modified
                      ? <span className="ml-1 h-2 w-2 rounded-full" style={{ background: '#E2C08D' }} />
                      : <X className="ml-1 h-3.5 w-3.5 opacity-60" />}
                  </div>
                );
              })}
            </div>
            <div className="flex h-[22px] shrink-0 items-center gap-1 px-4 text-[12px]" style={{ color: VSC.fgMuted }}>
              {pathSegments.map((segment, i) => (
                <span key={`${segment}-${i}`} className="flex items-center gap-1 whitespace-nowrap">
                  {i > 0 && <ChevronRight className="h-3 w-3" style={{ color: VSC.fgFaint }} />}
                  <span style={i === pathSegments.length - 1 ? { color: '#CCCCCC' } : undefined}>{segment}</span>
                </span>
              ))}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <EditorPane path={view.active} content={content} />
              <AnimatePresence>{view.grade && <GradeOverlay grade={view.grade} />}</AnimatePresence>
            </div>
          </div>

          <div data-tour="terminal" className="h-[36%] min-h-[150px] shrink-0 border-t" style={{ borderColor: VSC.panelBorder }}>
            <MockTerminal lines={view.terminal} />
          </div>
        </main>

        {/* AI assistant */}
        <aside
          data-tour="ai-chat"
          className="w-[290px] shrink-0 border-l xl:w-[320px]"
          style={{ borderColor: VSC.panelBorder }}
        >
          <MockAiChat messages={view.chat} thinking={view.aiThinking} />
        </aside>
      </div>

      <footer className="flex h-[22px] shrink-0 items-center gap-4 px-3 text-[12px]" style={{ background: VSC.statusBg, color: '#fff' }}>
        <span className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> main{view.modified.length ? '*' : ''}</span>
        <span className="ml-auto">{TASK_META.language}</span>
        <span>Session recorded by TruDev</span>
      </footer>
    </div>
  );
}
