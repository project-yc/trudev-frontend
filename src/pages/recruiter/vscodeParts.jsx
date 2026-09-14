// Presentational pieces of the VS Code-style file views — file icons, the
// explorer tree row, activity-bar buttons, side-bar headers and the markdown
// renderer for task briefs. Shared by the recruiter's TaskCodeViewPage and the
// public product tour's mock IDE so the two can't drift apart visually.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronRight, ChevronDown, Lock, FileCode2, FileJson, FileText, Database, File,
} from 'lucide-react';

import { VSC, MONO_STACK } from './vscodeTheme.js';

// File-type icon + VS Code-ish icon tint, matched on extension.
const FILE_ICONS = [
  [/\.(py)$/i, FileCode2, '#519ABA'],
  [/\.(js|jsx|mjs|cjs)$/i, FileCode2, '#CBCB41'],
  [/\.(ts|tsx)$/i, FileCode2, '#519ABA'],
  [/\.(json|jsonl)$/i, FileJson, '#CBCB41'],
  [/\.(sql|csv)$/i, Database, '#F55385'],
  [/\.(md|txt|rst)$/i, FileText, '#519ABA'],
  [/\.(css|scss)$/i, FileCode2, '#563D7C'],
  [/\.(html|xml)$/i, FileCode2, '#E37933'],
  [/\.(sh|bash|yaml|yml|toml|ini|cfg)$/i, FileCode2, '#8DC149'],
];

export function FileIcon({ path, className }) {
  const match = FILE_ICONS.find(([pattern]) => pattern.test(path));
  const Icon = match ? match[1] : File;
  return <Icon className={className} style={{ color: match ? match[2] : VSC.fgMuted }} />;
}

export function TreeRow({ node, depth, activePath, expanded, onToggle, onSelect }) {
  const isDir = node.type === 'dir';
  const isOpen = isDir && expanded.has(node.path);
  const isActive = !isDir && node.path === activePath;
  const isReadable = isDir || node.file.content !== null;

  const row = (
    <button
      type="button"
      onClick={() => (isDir ? onToggle(node.path) : onSelect(node.path))}
      aria-expanded={isDir ? isOpen : undefined}
      aria-current={isActive ? 'true' : undefined}
      title={node.path}
      style={{
        paddingLeft: `${depth * 10 + 8}px`,
        background: isActive ? VSC.listSelected : 'transparent',
        color: isActive ? VSC.fgBright : isReadable ? '#CCCCCC' : VSC.fgFaint,
        fontFamily: 'inherit',
      }}
      className="group w-full flex items-center gap-1 h-[22px] pr-2 text-[13px] text-left transition-colors duration-75 hover:bg-[#2A2D2E] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007FD4] focus-visible:ring-inset"
    >
      {isDir ? (
        isOpen
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: VSC.fgMuted }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: VSC.fgMuted }} />
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}
      {isDir
        ? <span className="truncate">{node.name}</span>
        : (
          <>
            <FileIcon path={node.path} className="w-[15px] h-[15px] flex-shrink-0" />
            <span className="truncate">{node.name}</span>
            {!isReadable && <Lock className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />}
          </>
        )}
    </button>
  );

  return (
    <li>
      {row}
      {isDir && isOpen && (
        <ul>
          {node.children.map(child => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// react-markdown escapes HTML by default — task bundles are user-supplied, so
// this stays as-is rather than moving to an innerHTML-based renderer.
const markdownComponents = {
  h1: p => <h1 className="text-[15px] font-semibold mt-5 mb-2 first:mt-0" style={{ color: VSC.fgBright }} {...p} />,
  h2: p => <h2 className="text-[14px] font-semibold mt-5 mb-2 pb-1 border-b" style={{ color: VSC.fgBright, borderColor: VSC.panelBorder }} {...p} />,
  h3: p => <h3 className="text-[13px] font-semibold mt-4 mb-1.5" style={{ color: '#CCCCCC' }} {...p} />,
  p: p => <p className="text-[13px] leading-relaxed my-2" style={{ color: '#CCCCCC' }} {...p} />,
  ul: p => <ul className="list-disc pl-5 my-2 space-y-1 text-[13px]" style={{ color: '#CCCCCC' }} {...p} />,
  ol: p => <ol className="list-decimal pl-5 my-2 space-y-1 text-[13px]" style={{ color: '#CCCCCC' }} {...p} />,
  li: p => <li className="leading-relaxed" {...p} />,
  strong: p => <strong className="font-semibold" style={{ color: VSC.fgBright }} {...p} />,
  em: p => <em className="italic" {...p} />,
  a: p => <a className="hover:underline" style={{ color: '#3794FF' }} target="_blank" rel="noopener noreferrer" {...p} />,
  blockquote: p => (
    <blockquote
      className="pl-3 my-3 text-[13px] italic border-l-[3px]"
      style={{ color: VSC.fgMuted, borderColor: '#454545' }}
      {...p}
    />
  ),
  code: ({ inline, ...p }) => inline
    ? <code className="px-1 py-0.5 rounded text-[12px]" style={{ background: '#2D2D2D', color: VSC.orange, fontFamily: MONO_STACK }} {...p} />
    : <code className="block p-3 rounded text-[12px] overflow-x-auto" style={{ background: '#1E1E1E', color: VSC.fg, fontFamily: MONO_STACK }} {...p} />,
  pre: p => <pre className="my-3 overflow-x-auto rounded" style={{ background: '#1E1E1E' }} {...p} />,
  table: p => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full text-[12px] border-collapse" {...p} />
    </div>
  ),
  th: p => <th className="border px-2 py-1.5 text-left font-semibold" style={{ borderColor: VSC.panelBorder, background: '#2D2D2D', color: VSC.fgBright }} {...p} />,
  td: p => <td className="border px-2 py-1.5 align-top" style={{ borderColor: VSC.panelBorder, color: '#CCCCCC' }} {...p} />,
  hr: p => <hr className="my-4" style={{ borderColor: VSC.panelBorder }} {...p} />,
};

/** A task brief rendered in the Dark+ palette. */
export function VscMarkdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {children}
    </ReactMarkdown>
  );
}

export function ActivityButton({ active, label, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="relative w-12 h-12 flex items-center justify-center transition-colors duration-100"
      style={{ color: active ? VSC.fgBright : '#858585' }}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: VSC.fgBright }} />}
      {icon}
    </button>
  );
}

export function SidebarSectionHeader({ children, action }) {
  return (
    <div className="flex items-center justify-between h-[35px] px-5 flex-shrink-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: '#BBBBBB' }}>
        {children}
      </span>
      {action}
    </div>
  );
}
