// Reads the personalisation parameters off the tour URL.
//
// Values are rendered as React text (never HTML), so this is not the XSS
// defence — it keeps a mangled or hostile link from producing an absurd page:
// control characters and angle brackets are dropped, whitespace collapsed, and
// the length capped so a 2,000-character "company" can't break the layout.

const MAX_LABEL = 40;
const MAX_REF = 64;

function isSafeChar(ch) {
  const code = ch.codePointAt(0);
  return code > 31 && code !== 127 && ch !== '<' && ch !== '>';
}

function cleanLabel(value) {
  if (!value) return '';
  return Array.from(value)
    .filter(isSafeChar)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL)
    .trim();
}

function cleanRef(value) {
  if (!value) return '';
  return value.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, MAX_REF);
}

export function readTourParams(search) {
  const params = new URLSearchParams(search);
  return {
    company: cleanLabel(params.get('c')),
    role: cleanLabel(params.get('r')),
    ref: cleanRef(params.get('ref')),
  };
}
