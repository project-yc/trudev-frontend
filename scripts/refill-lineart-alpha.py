"""
Repair a line-art cutout whose background remover keyed out *white* instead of
the subject, leaving the character's own white fills transparent.

The character's interior is white enclosed by black ink, so the rule is purely
topological: a transparent pixel that cannot be reached from the image border
without crossing ink is *inside* the character and must be opaque white.
Everything reachable from the border stays transparent.

    python refill.py input.png [output.png] [--seal N]

--seal N thickens the ink by N pixels *for the flood only* (the output keeps the
original line weight). Use it when the outline has a gap the flood leaks through
— an open jacket hem, a sleeve that runs off the canvas. Costs a faint N-pixel
white rim hugging the outside of the lines, so start at 0 and raise only if the
run reports a leak.
"""

import sys
from collections import deque
from PIL import Image

# A pixel counts as "background-ish" below this alpha. Anti-aliased ink edges
# sit above it, which is what stops the flood leaking through the outline.
ALPHA_OPEN = 128


def _dilate(mask, w, h, r):
    """Separable max-filter — thickens the True region by r pixels."""
    for _ in range(r):
        # horizontal
        out = bytearray(mask)
        for y in range(h):
            row = y * w
            for x in range(w):
                if mask[row + x]:
                    if x > 0:     out[row + x - 1] = 1
                    if x < w - 1: out[row + x + 1] = 1
        mask = out
        # vertical
        out = bytearray(mask)
        for y in range(h):
            row = y * w
            for x in range(w):
                if mask[row + x]:
                    if y > 0:     out[row - w + x] = 1
                    if y < h - 1: out[row + w + x] = 1
        mask = out
    return mask


def refill(src_path, dst_path, seal=0, walls=(), closes=()):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = bytearray(img.tobytes())          # RGBA, 4 bytes per pixel
    n = w * h

    # Ink = anything solid enough to act as a wall.
    blocked = bytearray(1 if px[i * 4 + 3] >= ALPHA_OPEN else 0 for i in range(n))
    ink_count = sum(blocked)

    # Virtual ink. Some drawings are deliberately open — a torso that trails off
    # with no hem, a limb that trails off the canvas — and no rule can infer
    # where the silhouette was meant to close. These segments act as ink for the
    # flood only; they are never drawn into the output.
    if closes:
        from PIL import ImageDraw
        wall = Image.new("L", (w, h), 0)
        wd = ImageDraw.Draw(wall)
        for x1, y1, x2, y2 in closes:
            wd.line([x1, y1, x2, y2], fill=255, width=3)
        wb = wall.tobytes()
        for i in range(n):
            if wb[i]:
                blocked[i] = 1

    if seal:
        blocked = _dilate(blocked, w, h, seal)

    # ── 1. Flood the open region inwards from every border pixel ────────────
    exterior = bytearray(n)
    q = deque()

    def push(i):
        if not exterior[i] and not blocked[i]:
            exterior[i] = 1
            q.append(i)

    # A border named in `walls` is treated as sealed, so the flood never starts
    # there. This is the fix for a figure whose outline is deliberately open at
    # one side — a jacket with no hem line, an arm running off the canvas — where
    # the opening is far too wide for --seal to bridge.
    if "top" not in walls:
        for x in range(w):
            push(x)
    if "bottom" not in walls:
        for x in range(w):
            push((h - 1) * w + x)
    if "left" not in walls:
        for y in range(h):
            push(y * w)
    if "right" not in walls:
        for y in range(h):
            push(y * w + w - 1)

    while q:
        i = q.popleft()
        x = i % w
        if x > 0:      push(i - 1)
        if x < w - 1:  push(i + 1)
        if i >= w:     push(i - w)
        if i < n - w:  push(i + w)

    # ── 2. Everything the flood never reached is the character — put it on white ──
    filled = 0
    for i in range(n):
        if exterior[i]:
            continue
        o = i * 4
        a = px[o + 3]
        if a == 255:
            continue                       # solid ink, already correct
        inv = 255 - a
        px[o]     = (px[o]     * a + 255 * inv) // 255
        px[o + 1] = (px[o + 1] * a + 255 * inv) // 255
        px[o + 2] = (px[o + 2] * a + 255 * inv) // 255
        px[o + 3] = 255
        filled += 1

    Image.frombytes("RGBA", (w, h), bytes(px)).save(dst_path)

    # Leak check. Counting refilled pixels is not enough: --seal adds an opaque
    # rim hugging the OUTSIDE of the lines, which inflates the count even when
    # the flood poured straight through a gap. Measure coverage inside the ink's
    # bounding box instead — a closed drawing fills most of its own box, a leaked
    # one fills only the lines themselves.
    xs = [i % w for i in range(n) if blocked[i]]
    ys = [i // w for i in range(n) if blocked[i]]
    # Coverage alone still gets fooled by a wide --seal, so the decisive test is
    # whether the centre of the drawing ended up sealed in. On a figure that is
    # the chest or the face — if the flood reached THAT, it reached everything.
    coverage, centre_sealed = 0.0, False
    if xs:
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        box = (x1 - x0 + 1) * (y1 - y0 + 1)
        inside = sum(1 for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)
                     if not exterior[y * w + x])
        coverage = inside / box
        centre_sealed = not exterior[((y0 + y1) // 2) * w + (x0 + x1) // 2]

    return {
        "size": (w, h),
        "ink_pixels": ink_count,
        "pixels_refilled": filled,
        "seal": seal,
        "bbox_coverage": round(coverage, 3),
        "centre_sealed": centre_sealed,
        "likely_leak": not centre_sealed,
    }


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    seal, walls = 0, ()
    if "--seal" in args:
        k = args.index("--seal")
        seal = int(args[k + 1])
        del args[k:k + 2]
    if "--wall" in args:
        k = args.index("--wall")
        walls = tuple(s.strip() for s in args[k + 1].split(","))
        del args[k:k + 2]
    closes = []
    while "--close" in args:
        k = args.index("--close")
        closes.append(tuple(int(v) for v in args[k + 1].split(",")))
        del args[k:k + 2]
    if not args:
        sys.exit("usage: python refill.py input.png [output.png] [--seal N] "
                 "[--wall top,bottom,left,right] [--close x1,y1,x2,y2 ...]")
    src = args[0]
    dst = args[1] if len(args) > 1 else src.rsplit(".", 1)[0] + "-filled.png"

    result = refill(src, dst, seal, walls, closes)
    print(result)
    print("wrote", dst)
    if result["likely_leak"]:
        print("\n!! The flood reached the centre of the drawing, so the outline")
        print("   has a gap somewhere. Seal a wider one and retry:")
        print("   python refill.py \"%s\" \"%s\" --seal %d" % (src, dst, max(seal * 2, 4)))
        print("   (--seal N bridges gaps up to about 2N pixels wide.)")
