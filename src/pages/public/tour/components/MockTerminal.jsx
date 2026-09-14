import { useEffect, useRef } from 'react';
import { VSC, MONO_STACK } from '../../../recruiter/vscodeTheme.js';

const LINE_COLORS = {
  out: '#CCCCCC',
  ok: '#89D185',
  err: VSC.red,
  dim: VSC.fgFaint,
};

/** The IDE's integrated terminal, playing a scripted session. */
export default function MockTerminal({ lines }) {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col" style={{ background: VSC.editorBg }}>
      <div
        className="flex h-[30px] shrink-0 items-center gap-4 border-b px-4 text-[11px] uppercase tracking-[0.5px]"
        style={{ borderColor: VSC.panelBorder, color: '#969696' }}
      >
        <span className="text-[#E7E7E7]" style={{ borderBottom: '1px solid #E7E7E7', paddingBottom: 6, marginTop: 7 }}>
          Terminal
        </span>
        <span>Problems</span>
        <span>Output</span>
        <span className="ml-auto normal-case tracking-normal" style={{ color: VSC.fgFaint }}>bash</span>
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-[12.5px] leading-[1.55]"
        style={{ fontFamily: MONO_STACK }}
      >
        {lines.map((line, i) => (
          line.kind === 'cmd' ? (
            <div key={i} className="whitespace-pre-wrap break-all">
              <span style={{ color: '#89D185' }}>candidate@tickr</span>
              <span style={{ color: '#CCCCCC' }}>:</span>
              <span style={{ color: '#3794FF' }}>~/tickr-alert-engine</span>
              <span style={{ color: '#CCCCCC' }}>$ </span>
              <span style={{ color: VSC.fgBright }}>{line.text}</span>
            </div>
          ) : (
            <div
              key={i}
              className="whitespace-pre-wrap break-all"
              style={{ color: LINE_COLORS[line.kind] || LINE_COLORS.out, fontWeight: line.kind === 'ok' ? 600 : 400 }}
            >
              {line.text}
            </div>
          )
        ))}
        <div>
          <span style={{ color: '#89D185' }}>candidate@tickr</span>
          <span style={{ color: '#CCCCCC' }}>:</span>
          <span style={{ color: '#3794FF' }}>~/tickr-alert-engine</span>
          <span style={{ color: '#CCCCCC' }}>$ </span>
          <span className="lp-caret inline-block h-[14px] w-[7px] translate-y-[2px]" style={{ background: '#CCCCCC' }} />
        </div>
      </div>
    </div>
  );
}
