import { useEffect, useRef } from 'react';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import { VSC, MONO_STACK } from '../../../recruiter/vscodeTheme.js';

/**
 * The AI assistant panel inside the candidate's IDE, playing a scripted
 * exchange. Mirrors what the candidate gets in the real workspace: a chat with
 * the coding agent, whose code blocks can be applied to a file.
 */
export default function MockAiChat({ messages, thinking }) {
  const reduce = useReducedMotion();
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages.length, thinking, reduce]);

  return (
    <div className="flex h-full flex-col" style={{ background: VSC.sidebarBg }}>
      <div className="flex h-[35px] shrink-0 items-center justify-between px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: '#BBBBBB' }}>
          AI Assistant
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10.5px]"
          style={{ background: '#2D2D2D', color: VSC.fgMuted }}
        >
          @Coder · full access
        </span>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-3" style={{ borderColor: VSC.panelBorder }}>
        {messages.length === 0 && !thinking && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Sparkles className="h-6 w-6" style={{ color: VSC.fgFaint }} />
            <p className="text-[12px] leading-[1.5]" style={{ color: VSC.fgMuted }}>
              Ask the assistant about this codebase. It can read files and propose changes.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message, i) => (
            <Motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {message.role === 'user' ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold" style={{ color: VSC.fgMuted }}>You</p>
                  <div className="rounded-md px-3 py-2 text-[12.5px] leading-[1.55]" style={{ background: '#2D2D2D', color: VSC.fg }}>
                    {message.text}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: VSC.fgMuted }}>
                    <Sparkles className="h-3 w-3" style={{ color: '#C586C0' }} />
                    Coder
                  </p>
                  <p className="text-[12.5px] leading-[1.55]" style={{ color: VSC.fg }}>{message.text}</p>
                  {message.code && (
                    <div className="mt-2 overflow-hidden rounded-md border" style={{ borderColor: VSC.contrastBorder }}>
                      <div
                        className="flex items-center justify-between px-2.5 py-1 text-[11px]"
                        style={{ background: '#2D2D2D', color: VSC.fgMuted }}
                      >
                        <span style={{ fontFamily: MONO_STACK }}>app/engine.py</span>
                        {message.applied ? (
                          <span className="flex items-center gap-1" style={{ color: '#89D185' }}>
                            <Check className="h-3 w-3" /> Applied
                          </span>
                        ) : (
                          <span className="rounded px-1.5 py-px" style={{ background: VSC.accent, color: '#fff' }}>Apply</span>
                        )}
                      </div>
                      <pre
                        className="max-h-[210px] overflow-auto px-2.5 py-2 text-[11.5px] leading-[1.5]"
                        style={{ background: '#1A1A1A', color: '#D4D4D4', fontFamily: MONO_STACK }}
                      >
                        {message.code}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Motion.div>
          ))}

          {thinking && (
            <div className="flex items-center gap-1.5 px-1 py-1" aria-label="Assistant is thinking">
              {[0, 1, 2].map(i => (
                <Motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: VSC.fgMuted }}
                  animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t p-2.5" style={{ borderColor: VSC.panelBorder }}>
        <div
          className="rounded-md px-3 py-2 text-[12px]"
          style={{ background: VSC.editorBg, border: `1px solid ${VSC.contrastBorder}`, color: VSC.fgFaint }}
        >
          Ask the assistant…
        </div>
      </div>
    </div>
  );
}
