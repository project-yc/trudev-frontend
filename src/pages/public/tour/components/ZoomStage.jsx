import { useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

// Never enlarge past this: the panes are drawn at laptop type sizes, and past
// ~1.1x they stop reading as a real IDE and start reading as a zoomed image.
const MAX_SCALE = 1.1;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * A laptop-sized stage seen through a phone-sized window.
 *
 * `children` are laid out on a fixed `width` x `height` canvas, so they render
 * exactly as they do on a laptop (Tailwind's breakpoints follow the real
 * viewport, which is why the desktop workspace can't simply be "shrunk" with
 * CSS). A transform then acts as the camera: with no `target` the whole canvas
 * is fitted into the frame; with one, the camera moves so that `data-tour`
 * element fills the frame's width. Everything inside stays live — it scrolls,
 * it takes taps — because it is the real DOM, not a picture of it.
 */
export default function ZoomStage({ width, height, target, background, children }) {
  const reduce = useReducedMotion();
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return undefined;

    const aim = () => {
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      if (!fw || !fh) return;

      const el = target ? canvas.querySelector(`[data-tour="${target}"]`) : null;
      let s;
      let x;
      let y;
      if (!el) {
        s = Math.min(fw / width, fh / height);
        x = (fw - width * s) / 2;
        y = (fh - height * s) / 2;
      } else {
        // Rects are read through whatever transform is applied right now (even
        // mid-transition) and divided back out, so this never has to reset the
        // camera to measure.
        const c = canvas.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const current = c.width / width;
        const tx = (r.left - c.left) / current;
        const ty = (r.top - c.top) / current;
        const tw = r.width / current;
        const th = r.height / current;

        s = Math.min(fw / tw, MAX_SCALE);
        x = (fw - tw * s) / 2 - tx * s;
        // A pane shorter than the frame sits in the middle with its neighbours
        // in view around it; a taller one starts at its top.
        y = th * s <= fh ? (fh - th * s) / 2 - ty * s : -ty * s;
        // Keep the frame full of IDE rather than panning past its edges.
        if (width * s >= fw) x = clamp(x, fw - width * s, 0);
        if (height * s >= fh) y = clamp(y, fh - height * s, 0);
      }

      setCamera(prev => (
        prev && Math.abs(prev.s - s) < 0.001 && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5
          ? prev
          : { s, x, y }
      ));
    };

    aim();
    const observer = new ResizeObserver(aim);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [target, width, height]);

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden" style={{ background }}>
      <div
        ref={canvasRef}
        style={{
          width,
          height,
          transformOrigin: '0 0',
          transform: camera ? `translate(${camera.x}px, ${camera.y}px) scale(${camera.s})` : undefined,
          transition: reduce ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          visibility: camera ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
