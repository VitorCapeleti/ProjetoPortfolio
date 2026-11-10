#!/usr/bin/env python3
"""Slice the portfolio art into layers and build optimized WebP copies.

Run from the repo root (any cwd works):  python tools/slice_art.py
Pure Pillow, no numpy. Idempotent: always rebuilds img/layers and img/opt
from the untouched originals in img/.

Outputs
  img/layers/  moon, saturn, planet, galaxy, rocket (+ .webp), bg-base (.png/.webp),
               stars (.png/.webp), bg-gradient.webp, avatar, bubble (+ .webp),
               manifest.json
  img/opt/     <basename>.webp for every top-level PNG in img/
"""
import json
import sys
import warnings
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "img"
LAYERS = IMG / "layers"
OPT = IMG / "opt"

# ---------------------------------------------------------------- elements --
# rect = search region (x0,y0,x1,y1) in source px; solid = diff (sum |dRGB|)
# above which a pixel is treated as fully opaque art; fill = fill interior holes.
ELEMENTS = {
    "moon":   dict(rect=(190, 240, 290, 345), solid=55, fill=True),
    "saturn": dict(rect=(855, 210, 1045, 325), solid=45, fill=False),
    "planet": dict(rect=(95, 635, 305, 768), solid=55, fill=True),
    "galaxy": dict(rect=(985, 435, 1366, 768), solid=30, fill=False),
    "rocket": dict(rect=(295, 725, 340, 768), solid=40, fill=False),
}
BASE_W, BASE_H = 1366, 768   # layout the rects above were measured on
T_MASK = 8                   # diff threshold to count a pixel as "not background"
PAD = 3
NB8 = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def save_pair(img, path_png, webp_q=None, lossless=True):
    img.save(path_png, optimize=True)
    w = path_png.with_suffix(".webp")
    if lossless and webp_q is None:
        img.save(w, lossless=True, quality=100, method=6)
    else:
        img.save(w, quality=webp_q or 90, method=6)


# ------------------------------------------------------- gradient estimation --
def _feats(u, v):
    return [u ** i * v ** j for i in range(4) for j in range(4 - i)]


def _solve(A, b):
    n = len(A)
    M = [r[:] + [b[i]] for i, r in enumerate(A)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]
                for c in range(i, n + 1):
                    M[r][c] -= f * M[i][c]
    return [M[i][n] / M[i][i] for i in range(n)]


def fit_gradient(bands, W, H, rects):
    """Cubic-polynomial fit per channel with outlier rejection (stars/art)."""
    def inr(x, y):
        return any(a <= x < c and b <= y < d for a, b, c, d in rects)
    pts = [(x, y) for y in range(0, H, 6) for x in range(0, W, 6) if not inr(x, y)]
    F_all = [_feats(x / W, y / H) for x, y in pts]
    n = len(F_all[0])
    coefs = []
    for ch in range(3):
        Y_all = [bands[ch][y * W + x] for x, y in pts]
        idx = list(range(len(pts)))
        for _ in range(5):
            A = [[0.0] * n for _ in range(n)]
            b = [0.0] * n
            for k in idx:
                f = F_all[k]
                y = Y_all[k]
                for i in range(n):
                    fi = f[i]
                    b[i] += fi * y
                    Ai = A[i]
                    for j in range(i, n):
                        Ai[j] += fi * f[j]
            for i in range(n):
                for j in range(i):
                    A[i][j] = A[j][i]
            c = _solve(A, b)
            idx = [k for k in range(len(pts))
                   if abs(sum(ci * fi for ci, fi in zip(c, F_all[k])) - Y_all[k]) < 2.5]
        coefs.append(c)
    return coefs


def render_gradient(coefs, W, H):
    """Per-channel float lists of the fitted gradient."""
    out = []
    for c in coefs:
        # c indexed as feats: i in 0..3, j in 0..3-i  -> u^i v^j
        idx = [(i, j) for i in range(4) for j in range(4 - i)]
        vals = [0.0] * (W * H)
        us = [x / W for x in range(W)]
        for y in range(H):
            v = y / H
            a = [0.0] * 4
            for (i, j), ci in zip(idx, c):
                a[i] += ci * v ** j
            base = y * W
            for x in range(W):
                u = us[x]
                vals[base + x] = a[0] + u * (a[1] + u * (a[2] + u * a[3]))
        out.append(vals)
    return out


# ------------------------------------------------------------------ helpers --
def components(mask, W, rect):
    x0, y0, x1, y1 = rect
    seen = set()
    comps = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            i = y * W + x
            if mask[i] and i not in seen:
                st = [i]
                seen.add(i)
                comp = []
                while st:
                    k = st.pop()
                    comp.append(k)
                    kx, ky = k % W, k // W
                    for dx, dy in NB8:
                        nx, ny = kx + dx, ky + dy
                        if x0 <= nx < x1 and y0 <= ny < y1:
                            j = ny * W + nx
                            if mask[j] and j not in seen:
                                seen.add(j)
                                st.append(j)
                comps.append(comp)
    return comps


def is_star(comp, d, W):
    peak = max(d[k] for k in comp)
    xs = [k % W for k in comp]
    ys = [k // W for k in comp]
    bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    return peak < 50 and len(comp) >= 40 and bw <= 26 and bh <= 26


def fill_holes(idxs, W, rect):
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    m = Image.new("L", (w + 2, h + 2), 0)
    px = m.load()
    for k in idxs:
        px[k % W - x0 + 1, k // W - y0 + 1] = 255
    ImageDraw.floodfill(m, (0, 0), 128)
    px = m.load()
    holes = []
    for y in range(1, h + 1):
        for x in range(1, w + 1):
            if px[x, y] == 0:
                holes.append((y - 1 + y0) * W + (x - 1 + x0))
    return holes


def cut_element(name, cfg, rgb, g, d, W, H, sx, sy):
    rect = tuple(int(round(v)) for v in (cfg["rect"][0] * sx, cfg["rect"][1] * sy,
                                         cfg["rect"][2] * sx, cfg["rect"][3] * sy))
    rect = (max(0, rect[0]), max(0, rect[1]), min(W, rect[2]), min(H, rect[3]))
    cand = bytearray(W * H)
    x0, y0, x1, y1 = rect
    for y in range(y0, y1):
        for x in range(x0, x1):
            if d[y * W + x] > T_MASK:
                cand[y * W + x] = 1
    keep = []
    for comp in components(cand, W, rect):
        if not is_star(comp, d, W):
            keep.extend(comp)
    M = set(keep)
    if cfg["fill"]:
        M.update(fill_holes(M, W, rect))
        filled = True
    else:
        filled = False
    solid_thr = cfg["solid"]
    F = {}
    for k in M:
        if d[k] >= solid_thr:
            F[k] = (rgb[0][k], rgb[1][k], rgb[2][k])
    if filled:  # holes become solid art regardless of diff
        for k in M:
            if k not in F and d[k] < T_MASK:
                F[k] = (rgb[0][k], rgb[1][k], rgb[2][k])
    solid = set(F)
    for _ in range(4):  # propagate nearest solid colour into soft edge pixels
        new = {}
        for k in M:
            if k in F:
                continue
            kx, ky = k % W, k // W
            acc = [0, 0, 0]
            n = 0
            for dx, dy in NB8:
                nx, ny = kx + dx, ky + dy
                if 0 <= nx < W and 0 <= ny < H:
                    f = F.get(ny * W + nx)
                    if f:
                        acc[0] += f[0]; acc[1] += f[1]; acc[2] += f[2]
                        n += 1
            if n:
                new[k] = (acc[0] / n, acc[1] / n, acc[2] / n)
        if not new:
            break
        F.update(new)
    out = {}
    for k in M:
        p = (rgb[0][k], rgb[1][k], rgb[2][k])
        gk = (g[0][k], g[1][k], g[2][k])
        if k in solid:
            out[k] = (p[0], p[1], p[2], 255)
            continue
        f = F.get(k)
        if f is not None:
            dv = [f[c] - gk[c] for c in range(3)]
            den = sum(v * v for v in dv)
            if den > 1:
                a = sum((p[c] - gk[c]) * dv[c] for c in range(3)) / den
                a = max(0.0, min(1.0, a))
                out[k] = (f[0], f[1], f[2], int(round(a * 255)))
                continue
        a = max(0.0, min(1.0, d[k] / solid_thr))
        if a <= 0:
            continue
        c = [max(0, min(255, (p[ch] - gk[ch] * (1 - a)) / a)) for ch in range(3)]
        out[k] = (c[0], c[1], c[2], int(round(a * 255)))
    out = {k: v for k, v in out.items() if v[3] >= 10}
    xs = [k % W for k in out]
    ys = [k // W for k in out]
    bx0, by0 = max(0, min(xs) - PAD), max(0, min(ys) - PAD)
    bx1, by1 = min(W, max(xs) + 1 + PAD), min(H, max(ys) + 1 + PAD)
    w, h = bx1 - bx0, by1 - by0
    buf = bytearray(w * h * 4)
    for k, v in out.items():
        o = ((k // W - by0) * w + (k % W - bx0)) * 4
        buf[o] = int(round(v[0])); buf[o + 1] = int(round(v[1]))
        buf[o + 2] = int(round(v[2])); buf[o + 3] = v[3]
    img = Image.frombytes("RGBA", (w, h), bytes(buf))
    return img, (bx0, by0, w, h), set(out)


def pct_entry(x, y, w, h, W, H):
    return {"x": x, "y": y, "w": w, "h": h,
            "xPct": round(x / W * 100, 4), "yPct": round(y / H * 100, 4),
            "wPct": round(w / W * 100, 4), "hPct": round(h / H * 100, 4)}


# -------------------------------------------------------------- scene layers --
def slice_scene(manifest):
    src = Image.open(IMG / "background.png").convert("RGB")
    W, H = src.size
    sx, sy = W / BASE_W, H / BASE_H
    print(f"[scene] background.png {W}x{H}")
    rgb = [list(b.tobytes()) for b in src.split()]
    rects = [(int(c["rect"][0] * sx), int(c["rect"][1] * sy),
              int(c["rect"][2] * sx), int(c["rect"][3] * sy)) for c in ELEMENTS.values()]
    coefs = fit_gradient(rgb, W, H, rects)
    g = render_gradient(coefs, W, H)
    n = W * H
    d = [abs(rgb[0][i] - g[0][i]) + abs(rgb[1][i] - g[1][i]) + abs(rgb[2][i] - g[2][i])
         for i in range(n)]

    manifest["source"] = {"w": W, "h": H}
    manifest["layers"] = {}
    removed = bytearray(n)
    for name, cfg in ELEMENTS.items():
        img, (x, y, w, h), idxs = cut_element(name, cfg, rgb, g, d, W, H, sx, sy)
        save_pair(img, LAYERS / f"{name}.png")
        manifest["layers"][name] = pct_entry(x, y, w, h, W, H)
        for k in idxs:
            removed[k] = 1
        print(f"  {name}: {w}x{h} at ({x},{y})")

    # bg-base: removed elements (mask dilated by 3px) replaced by the gradient
    m = Image.frombytes("L", (W, H), bytes(b * 255 for b in removed))
    m = m.filter(ImageFilter.MaxFilter(7))
    md = m.tobytes()
    base = [bytearray(n), bytearray(n), bytearray(n)]
    for ch in range(3):
        gc, rc, bc = g[ch], rgb[ch], base[ch]
        for i in range(n):
            bc[i] = int(round(gc[i])) if md[i] else rc[i]
    base_img = Image.merge("RGB", [Image.frombytes("L", (W, H), bytes(b)) for b in base])
    base_img.save(LAYERS / "bg-base.png", optimize=True)
    base_img.save(LAYERS / "bg-base.webp", quality=85, method=6)

    # bg-gradient (no stars, no elements) and stars (transparent star dots)
    grad = [bytearray(int(round(v)) for v in g[ch]) for ch in range(3)]
    grad_img = Image.merge("RGB", [Image.frombytes("L", (W, H), bytes(b)) for b in grad])
    grad_img.save(LAYERS / "bg-gradient.webp", lossless=True, quality=100, method=6)

    db = [abs(base[0][i] - grad[0][i]) + abs(base[1][i] - grad[1][i]) + abs(base[2][i] - grad[2][i])
          for i in range(n)]
    smask = bytearray(1 if v > 5 else 0 for v in db)
    out = bytearray(n * 4)
    nstars = 0
    for comp in components(smask, W, (0, 0, W, H)):
        peak = max(db[k] for k in comp)
        if peak < 12 or len(comp) < 4:
            continue
        nstars += 1
        core = [k for k in comp if db[k] >= 0.8 * peak]
        F = [sum(base[c][k] for k in core) / len(core) for c in range(3)]
        for k in comp:
            dv = [F[c] - grad[c][k] for c in range(3)]
            den = sum(v * v for v in dv)
            a = sum((base[c][k] - grad[c][k]) * dv[c] for c in range(3)) / den if den > 1 else 0
            a = max(0.0, min(1.0, a))
            if a < 0.04:
                continue
            o = k * 4
            out[o] = int(round(F[0])); out[o + 1] = int(round(F[1]))
            out[o + 2] = int(round(F[2])); out[o + 3] = int(round(a * 255))
    stars = Image.frombytes("RGBA", (W, H), bytes(out))
    save_pair(stars, LAYERS / "stars.png")
    print(f"  stars: {nstars} dots; bg-base/bg-gradient written")


# -------------------------------------------------------------------- avatar --
def slice_avatar(manifest):
    src = Image.open(IMG / "iconR.png").convert("RGBA")
    W, H = src.size
    print(f"[avatar] iconR.png {W}x{H}")
    a = list(src.getchannel("A").tobytes())
    px = src.tobytes()
    region = (int(150 * W / 652), int(15 * W / 652), int(300 * W / 652), int(115 * W / 652))
    mask = bytearray(W * H)
    for y in range(region[1], region[3]):
        for x in range(region[0], region[2]):
            if a[y * W + x] > 0:
                mask[y * W + x] = 1
    seed = (int(225 * W / 652), int(55 * W / 652))
    bubble = None
    for comp in components(mask, W, region):
        if seed[1] * W + seed[0] in set(comp):
            bubble = comp
    assert bubble, "bubble component not found"
    xs = [k % W for k in bubble]
    ys = [k // W for k in bubble]
    bx0, by0, bx1, by1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    bw, bh = bx1 - bx0, by1 - by0
    bbuf = bytearray(bw * bh * 4)
    abuf = bytearray(px)
    for k in bubble:
        o = ((k // W - by0) * bw + (k % W - bx0)) * 4
        bbuf[o:o + 4] = px[k * 4:k * 4 + 4]
        abuf[k * 4 + 3] = 0
    bub = Image.frombytes("RGBA", (bw, bh), bytes(bbuf))
    av = Image.frombytes("RGBA", (W, H), bytes(abuf))
    save_pair(bub, LAYERS / "bubble.png")
    save_pair(av, LAYERS / "avatar.png")
    manifest["avatar"] = pct_entry(0, 0, W, H, W, H)
    manifest["bubble"] = pct_entry(bx0, by0, bw, bh, W, H)
    manifest["avatarSource"] = {"w": W, "h": H}
    print(f"  bubble: {bw}x{bh} at ({bx0},{by0})")


# ----------------------------------------------------------------------- opt --
def optimize_all():
    OPT.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in sorted(IMG.glob("*.png")):
        im = Image.open(p)
        im.load()
        has_a = im.mode in ("RGBA", "LA") or "transparency" in im.info
        im = im.convert("RGBA" if has_a else "RGB")
        name = p.stem
        maxw = 1600
        if name == "perfilM":
            maxw = 800
        elif name in ("github", "instagram", "linkedin", "whatsapp"):
            maxw = 128
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        out = OPT / f"{name}.webp"
        q = 80
        im.save(out, quality=q, method=6)
        if name == "perfilM":
            while out.stat().st_size > 200 * 1024 and q > 30:
                q -= 5
                im.save(out, quality=q, method=6)
        rows.append((p.name, p.stat().st_size, out.name, out.stat().st_size, im.size))
    print("\n%-20s %10s  %-20s %9s  %s" % ("source", "before", "optimized", "after", "size"))
    tb = ta = 0
    for s, b, o, a, sz in rows:
        tb += b; ta += a
        print("%-20s %9.1fK  %-20s %8.1fK  %dx%d" % (s, b / 1024, o, a / 1024, *sz))
    print("%-20s %9.1fK  %-20s %8.1fK" % ("TOTAL", tb / 1024, "", ta / 1024))


def main():
    LAYERS.mkdir(parents=True, exist_ok=True)
    manifest = {}
    slice_scene(manifest)
    slice_avatar(manifest)
    (LAYERS / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    optimize_all()
    print("done")


if __name__ == "__main__":
    sys.exit(main())
