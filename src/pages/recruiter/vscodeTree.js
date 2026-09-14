// Non-component helpers for the VS Code-style file views: CodeMirror language
// wiring and the flat-paths-to-tree builder. Shared by the recruiter's
// TaskCodeViewPage and the public product tour's mock IDE. Kept apart from
// vscodeParts.jsx so that file exports only components (fast refresh).

import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';

export const LANGUAGE_EXTENSIONS = {
  python,
  javascript: () => javascript({ jsx: true }),
  jsx: () => javascript({ jsx: true }),
  typescript: () => javascript({ jsx: true, typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  sql,
  markdown,
  json,
  html,
  css: cssLang,
};

export const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', jsx: 'JavaScript JSX',
  typescript: 'TypeScript', tsx: 'TypeScript JSX', sql: 'SQL',
  markdown: 'Markdown', json: 'JSON', html: 'HTML', css: 'CSS', text: 'Plain Text',
};

/** Turn flat `a/b/c.py` paths into a nested, directories-first tree. */
export function buildTree(files) {
  const root = { name: '', path: '', type: 'dir', children: new Map() };

  for (const file of files) {
    const segments = file.path.split('/');
    let node = root;
    segments.forEach((segment, i) => {
      if (i === segments.length - 1) {
        node.children.set(segment, { name: segment, path: file.path, type: 'file', file });
        return;
      }
      if (!node.children.has(segment)) {
        node.children.set(segment, {
          name: segment,
          path: segments.slice(0, i + 1).join('/'),
          type: 'dir',
          children: new Map(),
        });
      }
      node = node.children.get(segment);
    });
  }

  const sort = (node) => {
    if (node.type !== 'dir') return node;
    const children = [...node.children.values()].map(sort).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ...node, children };
  };

  return sort(root).children;
}

/** Every directory path in `files`, so a tree can open fully expanded. */
export function allDirectoryPaths(files) {
  return new Set(
    (files || []).flatMap(f => {
      const parts = f.path.split('/').slice(0, -1);
      return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
    }),
  );
}
