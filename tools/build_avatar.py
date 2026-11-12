#!/usr/bin/env python3
"""Monta o avatar animado a partir do desenho original (img/iconR.png).

O desenho é separado em peças (cadeira, corpo, cabeça, traços do rosto, fone,
mãos e cada dedo, monitor, mesa; o balão </> é retirado), o que fica atrás de cada peça é
preenchido (para não abrir buraco quando ela se mexe) e cada peça é vetorizada
com o vtracer, mantendo o traço do Vitor. Saída: js/avatar-art.js
(window.AVATAR_ART), carregado como script comum — funciona no GitHub Pages e
abrindo o index.html direto.

    pip install pillow vtracer
    python tools/build_avatar.py
"""
import json
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

import vtracer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "iconR.png"
OUT_JS = ROOT / "js" / "avatar-art.js"
K = 4  # vetoriza em 4x (curvas mais suaves); o SVG aplica scale(1/4)

# Paleta do desenho (amostrada do original). Antes de vetorizar, cada pixel vai
# para a cor mais próxima: sem os tons intermediários da borda (antialias), que
# o vtracer transformava em manchas e franjas claras.
LILAC, BUBBLE, GLYPH, WHITE, FOLD = "#aa82c8", "#d0acdc", "#6c3cf4", "#fefefc", "#dedede"
INK, HAIR, SKINC, PURPLE, BROWN = "#000000", "#140404", "#fca88c", "#905afc", "#62432b"
NECK_SHADE = "#e38f74"  # sombra da mandíbula no pescoço
# Cada peça só usa as cores que existem nela: a borda entre duas cores cai
# numa delas (traço nítido), em vez de virar uma terceira cor.
PALETTES = {
    "chair": [LILAC, HAIR], "monitor": [LILAC, HAIR], "desk": [LILAC],
    "body": [INK, WHITE, FOLD, SKINC, HAIR, NECK_SHADE], "phones": [PURPLE, INK],
    "head": [HAIR, SKINC, INK, BROWN], "features": [HAIR, SKINC, BROWN, WHITE],
    "hand": [SKINC, HAIR, INK], "bubble": [BUBBLE, GLYPH, WHITE, INK],
    "shadow": ["#c9785e"],
}

W, H = 666, 374
SKIN = (254, 174, 137, 255)
SHADOW = (201, 120, 94, 255)  # dobra entre os dedos
LILAC = (170, 130, 200, 255)
BLACK = (5, 5, 5, 255)

# ------------------------------------------------------------ regiões (666x374)
BUBBLE_BOX = (165, 22, 286, 106)
MONITOR = [(126, 84), (326, 84), (334, 262), (329, 278), (147, 266), (126, 140)]
STAND = [(184, 168), (231, 168), (231, 313), (184, 313)]
DESK_TOP = [(126, 297), (540, 321), (540, 360), (126, 360)]
HEAD = [(370, 98), (460, 98), (460, 176), (440, 184), (418, 193), (398, 194), (380, 188), (370, 160)]
FEATURES_EYES = [(388, 136), (419, 136), (419, 160), (388, 160)]
FEATURES_MOUTH = [(391, 158), (421, 157), (421, 173), (391, 174)]
PHONES_L = [(370, 176), (399, 178), (401, 224), (372, 224)]
PHONES_R = [(411, 172), (454, 172), (454, 224), (409, 224)]
# lados internos da faixa do fone (traços pretos por cima do pescoço)
BAND = [[(372, 180), (388, 180), (399, 216), (386, 218)], [(403, 184), (419, 184), (426, 218), (409, 219)]]
NECK_BEHIND_HEAD = [(398, 166), (429, 164), (430, 190), (398, 190)]
# manga direita (braço em repouso), separada do corpo para o braço poder se mover
SLEEVE_R = [(450, 201), (459, 200), (471, 206), (481, 217), (488, 240), (490, 323), (440, 323), (441, 262), (447, 240), (455, 214)]
CHAIR_BEHIND = [(427, 104), (478, 99), (492, 200), (494, 330), (432, 330)]
HANDS = {  # (x0, y0, x1, y1, close_max, close_min)
    "l": (232, 268, 312, 322, 9, 7),
    "r": (362, 268, 452, 330, 15, 13),
}
FINGERS = {
    "l": [
        dict(id="l1", pivot=(291, 284), poly=[(246, 281), (249, 275), (270, 274), (293, 276), (294, 286.5), (284, 288.5), (276, 289.4), (262, 288.6), (252, 286.5)]),
        dict(id="l2", pivot=(288, 292), poly=[(241, 303), (243, 297), (252, 291), (262, 288.6), (276, 289.4), (284, 288.5), (294, 286.5), (294, 289), (289, 291.6), (282, 296.4), (274, 299.8), (266, 302.4), (259, 304.4), (253, 306.4), (246, 308)]),
        dict(id="l3", pivot=(281, 301), poly=[(246, 308), (253, 306.4), (259, 304.4), (266, 302.4), (274, 299.8), (282, 296.4), (284, 299), (280, 304), (272, 307.5), (265, 310.5), (255, 312), (245, 312)]),
    ],
    "r": [
        dict(id="r1", pivot=(416, 280), poly=[(385, 301), (385, 289), (395, 285), (400, 278), (406, 273), (413, 274), (418, 277), (419.5, 280), (415.3, 283.5), (406.1, 293.1), (402, 297), (398, 301), (392, 302.5)]),
        dict(id="r2", pivot=(423, 283), poly=[(419.5, 280), (422, 279), (426, 281), (424.8, 284.8), (402.8, 304.3), (399, 303), (398, 301), (402, 297), (406.1, 293.1), (415.3, 283.5)]),
        dict(id="r3", pivot=(427, 289), poly=[(424.8, 284.8), (427, 283.5), (430, 286.5), (431, 291.5), (422.3, 297.7), (408.2, 310.2), (404, 308.5), (402.8, 304.3)]),
        dict(id="r4", pivot=(431, 299), poly=[(422.3, 297.7), (431, 291.5), (434, 296), (435, 302), (426.5, 306), (412.3, 311.8), (409, 311.5), (408.2, 310.2)]),
    ],
}


# ----------------------------------------------------------------- utilidades
def poly_mask(polys, size=(W, H)):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon(p, fill=255)
    return m


def is_skin(c):
    r, g, b, a = c
    return a > 40 and r > 200 and 135 < g < 205 and 100 < b < 180 and r - b > 60


def is_desk(c):
    r, g, b, a = c
    return a > 200 and 150 < r < 190 and 115 < g < 150 and 160 < b < 215


def is_lilac(c):
    r, g, b, a = c
    return a > 60 and 140 < r < 200 and 105 < g < 160 and 160 < b < 225


def is_purple(c):  # fone
    r, g, b, a = c
    return a > 60 and b > 200 and r < 175 and g < 120 and b - g > 120


def is_dark(c):
    r, g, b, a = c
    return a > 60 and r + g + b < 200


def inpaint(img, mask, keep=None, max_iter=80):
    """Preenche os pixels de `mask` com a cor mais comum entre os vizinhos já
    conhecidos (bom para arte chapada). `keep` limita quais vizinhos valem."""
    px = img.load()
    mp = mask.load()
    w, h = img.size
    todo = {(x, y) for y in range(h) for x in range(w) if mp[x, y]}
    known = lambda x, y: (x, y) not in todo and px[x, y][3] > 200 and (keep is None or keep(px[x, y]))
    for _ in range(max_iter):
        if not todo:
            break
        done = []
        for (x, y) in todo:
            votes = {}
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if (dx or dy) and 0 <= xx < w and 0 <= yy < h and known(xx, yy):
                        c = px[xx, yy]
                        votes[c] = votes.get(c, 0) + 1
            if votes:
                done.append(((x, y), max(votes.items(), key=lambda kv: kv[1])[0]))
        if not done:
            break
        for (p, c) in done:
            px[p] = c
            todo.discard(p)
    return img


def cut(src, mask):
    """Copia de `src` só os pixels de `mask` (resto transparente)."""
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def harden(img):
    """Alpha duro (sem a franja semitransparente que vira contorno no traço)."""
    r, g, b, a = img.split()
    a = a.point(lambda v: 255 if v >= 110 else 0)
    return Image.merge("RGBA", (r, g, b, a))


def grow(img, n=1):
    """Expande a peça n px (repete a cor da borda): cobre emendas entre peças."""
    for _ in range(n):
        a = img.getchannel("A")
        big = a.filter(ImageFilter.MaxFilter(3))
        px = img.load()
        bp = big.load()
        ap = a.load()
        w, h = img.size
        add = []
        for y in range(h):
            for x in range(w):
                if bp[x, y] and not ap[x, y]:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and ap[xx, yy]:
                            add.append(((x, y), px[xx, yy]))
                            break
        for p, c in add:
            px[p] = c
    return img


def in_poly(x, y, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        xa, ya = poly[i]
        xb, yb = poly[(i + 1) % n]
        if (ya > y) != (yb > y) and x < (xb - xa) * (y - ya) / (yb - ya) + xa:
            inside = not inside
    return inside


# ------------------------------------------------------------------- tracing
def _hex(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def _feat(c):
    r, g, b = c[:3]
    return (0.3 * r + 0.59 * g + 0.11 * b, r - g, g - b)


def classify(img, colors):
    """Rótulo (1..n) da cor da paleta mais próxima de cada pixel opaco; 0 = vazio.
    Distância por luminância + croma: o cinza da borda de um traço nunca vira pele."""
    pal = [_feat(_hex(c)) for c in colors]
    w, h = img.size
    px = img.load()
    lab = Image.new("L", (w, h), 0)
    lp = lab.load()
    cache = {}
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] < 110:
                continue
            k = c[:3]
            if k not in cache:
                f = _feat(k)
                cache[k] = 1 + min(range(len(pal)), key=lambda i: (f[0] - pal[i][0]) ** 2 + 2 * ((f[1] - pal[i][1]) ** 2 + (f[2] - pal[i][2]) ** 2))
            lp[x, y] = cache[k]
    return lab


def smooth_render(img, colors, base=None):
    """Sobe para Kx suavizando a fronteira entre as cores sem criar cores novas:
    cada rótulo vira uma máscara borrada e cada pixel fica com o rótulo mais forte.
    `base` (índice) pinta a silhueta inteira de uma cor só (camada de baixo)."""
    lab = classify(img, colors)
    size = (W * K, H * K)
    blur = ImageFilter.GaussianBlur(K * 0.32)
    alpha = lab.point(lambda v: 255 if v else 0).resize(size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(K * 0.8)).point(lambda v: 255 if v >= 128 else 0)
    if base is not None:
        out = Image.new("RGBA", size, _hex(colors[base]) + (255,))
        out.putalpha(alpha)
        return out
    best = Image.new("L", size, 0)
    label = Image.new("L", size, 0)
    present = [i for i, n in enumerate(lab.histogram()) if i and n]
    for i in present:
        m = lab.point(lambda v, i=i: 255 if v == i else 0).resize(size, Image.BILINEAR).filter(blur)
        win = ImageChops.subtract(m, best).point(lambda v: 255 if v > 0 else 0)
        best = ImageChops.lighter(best, m)
        label.paste(i, (0, 0), win)
    rgb = Image.new("RGB", size, (0, 0, 0))
    for i in present:
        rgb.paste(_hex(colors[i - 1]), (0, 0), label.point(lambda v, i=i: 255 if v == i else 0))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def palette_for(name):
    if name.startswith("hand"):
        return PALETTES["hand"]
    if name.startswith("shadow"):
        return PALETTES["shadow"]
    if name.startswith("features"):
        return PALETTES["features"]
    if name == "sleeve-r":
        return PALETTES["body"]
    return PALETTES[name]


def _vt(img, name, tmp):
    p_in = Path(tmp) / f"{name}.png"
    p_out = Path(tmp) / f"{name}.svg"
    img.save(p_in)
    # posicional: o binding atual quebra com argumentos nomeados
    vtracer.convert_image_to_svg_py(str(p_in), str(p_out), "color", "stacked", "spline",
                                    6, 8, 4, 60, 4.0, 10, 45, 1)
    out = []
    for p in re.findall(r"<path[^>]*/>", p_out.read_text(encoding="utf-8")):
        m = re.search(r'fill="(#[0-9A-Fa-f]{6})"', p)
        if not m:
            continue
        dm = re.search(r' d="([^"]+)"', p)
        if not dm:  # o vtracer às vezes emite path vazio
            continue
        d = re.sub(r"-?\d+\.\d+", lambda mm: str(round(float(mm.group()))), dm.group(1))
        d = re.sub(r"\s+", " ", d).strip()
        t = re.search(r'transform="translate\(([-\d.]+),([-\d.]+)\)"', p)
        tr = f' transform="translate({round(float(t.group(1)))},{round(float(t.group(2)))})"' if t else ""
        out.append(f'<path d="{d}" fill="{m.group(1)}"{tr}/>')
    return out


def trace(img, name, tmp):
    """Vetoriza a peça: silhueta numa cor (sem frestas entre as cores) + detalhes."""
    img = harden(img)
    if not img.getbbox():
        return ""
    colors = palette_for(name)
    lab = classify(img, colors)
    counts = lab.histogram()[1:len(colors) + 1]
    base = max(range(len(colors)), key=lambda i: counts[i])
    under = _vt(smooth_render(img, colors, base=base), name + "-base", tmp)
    detail = _vt(smooth_render(img, colors), name, tmp)
    # o vtracer empilha as cores (a de baixo é maior e a de cima a recorta):
    # mantém o detalhe inteiro por cima da silhueta
    return "".join(under + (detail if len(colors) > 1 else []))


# ---------------------------------------------------------------------- peças
def build():
    src = Image.open(SRC).convert("RGBA")
    px = src.load()

    # balão </>
    # balão: componente conectado a partir do centro, dentro da caixa dele
    bm = Image.new("L", (W, H), 0)
    bmp = bm.load()
    bx0, by0, bx1, by1 = BUBBLE_BOX
    stack, seen = [(225, 55)], set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (bx0 <= x < bx1 and by0 <= y < by1) or px[x, y][3] == 0 or is_lilac(px[x, y]):
            continue
        seen.add((x, y))
        bmp[x, y] = 255
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    bubble = cut(src, bm)
    base = src.copy()
    base.paste((0, 0, 0, 0), (0, 0, W, H), bm)  # tira o balão do resto

    bp = base.load()
    mon_m = poly_mask([MONITOR, STAND])
    desk_m = poly_mask([DESK_TOP])
    head_m = poly_mask([HEAD])
    feat_m = poly_mask([FEATURES_EYES, FEATURES_MOUTH])
    phl = poly_mask([PHONES_L])
    phr = poly_mask([PHONES_R])

    # --- monitor (cor lilás + traços dentro do contorno); fica NA FRENTE
    monitor = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mp_ = monitor.load()
    mm = mon_m.load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            jacket_corner = x > 316 and y > 255 and c[0] + c[1] + c[2] < 300 and not in_poly(x, y, [(300, 240), (334, 262), (329, 278), (300, 262)])
            if mm[x, y] and c[3] > 0 and not jacket_corner and not (is_skin(c) or c[0] > 235 and c[1] > 235):
                mp_[x, y] = c

    # --- mesa
    desk = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dp = desk.load()
    dm = desk_m.load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            if dm[x, y] and is_desk(c) or (dm[x, y] and is_lilac(c)):
                dp[x, y] = c

    # --- mãos: máscara da pele + traços (mesma lógica do slice_art)
    hand_mask = {}
    for side, (x0, y0, x1, y1, cmax, cmin) in HANDS.items():
        w, h = x1 - x0, y1 - y0
        skin = Image.new("L", (w, h), 0)
        sp = skin.load()
        for y in range(h):
            for x in range(w):
                if is_skin(bp[x0 + x, y0 + y]):
                    sp[x, y] = 255
        m = skin.filter(ImageFilter.MaxFilter(cmax)).filter(ImageFilter.MinFilter(cmin))
        mpp = m.load()
        near = skin.filter(ImageFilter.MaxFilter(11)).load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = bp[x0 + x, y0 + y]
                if near[x, y] and a > 40 and r + g + b < 260 and b <= r + 25:
                    mpp[x, y] = 255
        outside = [[False] * w for _ in range(h)]
        stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
        while stack:
            x, y = stack.pop()
            if 0 <= x < w and 0 <= y < h and not outside[y][x] and not mpp[x, y]:
                outside[y][x] = True
                stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        full = Image.new("L", (W, H), 0)
        fp = full.load()
        for y in range(h):
            for x in range(w):
                if (not outside[y][x] or mpp[x, y]) and not is_desk(bp[x0 + x, y0 + y]) and bp[x0 + x, y0 + y][3] > 0:
                    fp[x0 + x, y0 + y] = 255
        hand_mask[side] = (full, outside, (x0, y0, w, h))

    pieces = {}
    fingers_meta = []
    for side in ("l", "r"):
        full, outside, (x0, y0, w, h) = hand_mask[side]
        # a mão inteira, como desenhada; os dedos viram recortes (clip-path) dela
        pieces["hand-" + side] = cut(base, full)
        # sombra que aparece no vão quando um dedo sobe (só por dentro da mão)
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sp_ = shadow.load()
        fm = full.load()
        for f in FINGERS[side]:
            for y in range(h):
                for x in range(w):
                    gx, gy = x0 + x, y0 + y
                    if fm[gx, gy] and in_poly(gx + .5, gy + .5, f["poly"]):
                        rim = any(0 <= x + dx < w and 0 <= y + dy < h and outside[y + dy][x + dx]
                                  for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
                        if not rim:
                            sp_[gx, gy] = SHADOW
            # polígono levemente maior (0,7px) para não abrir fresta na emenda
            cx = sum(p[0] for p in f["poly"]) / len(f["poly"])
            cy = sum(p[1] for p in f["poly"]) / len(f["poly"])
            r = sum(((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** .5 for p in f["poly"]) / len(f["poly"])
            k = 1 + 0.7 / r
            poly = [[round(cx + (p[0] - cx) * k, 2), round(cy + (p[1] - cy) * k, 2)] for p in f["poly"]]
            fingers_meta.append({"id": f["id"], "hand": side, "pivot": list(f["pivot"]), "poly": poly})
        pieces["shadow-" + side] = shadow

    # --- fone no pescoço (roxo + faixa preta junto ao roxo)
    phones = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    php = phones.load()
    purple = Image.new("L", (W, H), 0)
    pup = purple.load()
    for y in range(H):
        for x in range(W):
            if (phl.getpixel((x, y)) or phr.getpixel((x, y))) and is_purple(bp[x, y]):
                pup[x, y] = 255
    near_p = purple.filter(ImageFilter.MaxFilter(9)).load()
    band = poly_mask(BAND).load()
    phones_m = Image.new("L", (W, H), 0)
    pm = phones_m.load()
    for y in range(H):
        for x in range(W):
            inside = phl.getpixel((x, y)) or phr.getpixel((x, y))
            c = bp[x, y]
            dark_band = band[x, y] and c[3] > 60 and c[0] + c[1] + c[2] < 240 and y < 216
            ring = (near_p[x, y] and c[3] > 60 and not is_skin(c) and (c[0] + c[1] + c[2] < 300 or c[2] > c[1] + 40)
                    and not (y > 211 and not pup[x, y] and (x < 380 or x > 440)))
            if (inside and (pup[x, y] or ring)) or dark_band:
                php[x, y] = c
                pm[x, y] = 255

    # --- cabeça (cabelo, rosto, orelha, cavanhaque) sem os traços do rosto
    head = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hp = head.load()
    hm = head_m.load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            if hm[x, y] and c[3] > 0 and not pm[x, y] and not is_lilac(c):
                hp[x, y] = c
    feat_px = feat_m.load()
    # o cabelo é o maior bloco escuro ligado ao topo da cabeça
    hair = set()
    stack = [(410, 112)]
    while stack:
        x, y = stack.pop()
        if (x, y) in hair or not (0 <= x < W and 0 <= y < H):
            continue
        c = hp[x, y]
        if c[3] < 60 or is_skin(c) or c[0] + c[1] + c[2] > 330:
            continue
        hair.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    fx_mask = Image.new("L", (W, H), 0)
    fxp = fx_mask.load()
    for y in range(H):
        for x in range(W):
            if feat_px[x, y] and hp[x, y][3] and not is_skin(hp[x, y]) and (x, y) not in hair:
                fxp[x, y] = 255
    fx_grow = fx_mask.filter(ImageFilter.MaxFilter(3))
    fgp = fx_grow.load()
    for (x, y) in hair:  # a borda do cabelo nunca entra nos traços do rosto
        fgp[x, y] = 0
    # cada pixel do traço vai para um grupo; as expressões trocam só olhos e
    # boca — nariz "<", sobrancelhas e bigode são sempre os do desenho
    def fclass(x, y):
        c = hp[x, y]
        # nariz "<": começa colado no olho esquerdo (x 393-398), medido no original
        if 148 <= y <= 161 and x <= 404 and x >= (399 if y <= 154 else 398):
            return "nose"
        if y >= 159:
            if c[0] + c[1] + c[2] < 150:
                return "mouth"
            if c[0] > 70 and c[0] - c[2] > 25 and not is_skin(c):
                return "stache"
            return None
        return "brows" if y <= 143 else "eyes"
    core = {}
    for y in range(H):
        for x in range(W):
            if fxp[x, y]:
                k = fclass(x, y)
                if k:
                    core[(x, y)] = k
    groups = {k: Image.new("L", (W, H), 0) for k in ("brows", "eyes", "nose", "stache", "mouth")}
    gl = {k: m.load() for k, m in groups.items()}
    for y in range(H):
        for x in range(W):
            if not fgp[x, y]:
                continue
            best, bd = None, 99
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    k = core.get((x + dx, y + dy))
                    if k and dx * dx + dy * dy < bd:
                        best, bd = k, dx * dx + dy * dy
            # olho e nariz se encostam: sem anel de pele neles (virava contorno)
            if best and not (best in ("eyes", "nose") and is_skin(hp[x, y])):
                gl[best][x, y] = 255
    feature_parts = {"features-" + k: cut(head, m) for k, m in groups.items()}
    inpaint(head, fx_grow, keep=is_skin)

    # --- cadeira (lilás à direita), completada atrás da cabeça e do corpo
    chair = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cp = chair.load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            if (x > 420 and y < 330 and (is_lilac(c) or (is_dark(c) and x > 470 and not hm[x, y] and not in_poly(x + .5, y + .5, SLEEVE_R)))
                    and not dm[x, y]):
                cp[x, y] = c
    d = ImageDraw.Draw(chair)
    behind = poly_mask([CHAIR_BEHIND]).load()
    for y in range(H):
        for x in range(W):
            if behind[x, y] and cp[x, y][3] == 0:
                cp[x, y] = LILAC

    # --- corpo: jaqueta, camisa, pescoço (o que sobrou), completado atrás
    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bdp = body.load()
    lfull = hand_mask["l"][0].load()
    rfull = hand_mask["r"][0].load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            if (295 <= x <= 500 and 170 <= y <= 330 and c[3] > 0 and not mm[x, y] and not dm[x, y]
                    and not hm[x, y] and not lfull[x, y] and not is_lilac(c)):
                bdp[x, y] = c
    # buracos a preencher: atrás do fone, da mão direita e o pescoço sob o queixo
    hole = Image.new("L", (W, H), 0)
    hl = hole.load()
    for y in range(H):
        for x in range(W):
            if pm[x, y] or rfull[x, y]:
                hl[x, y] = 255
    for y in range(H):
        for x in range(W):
            if hl[x, y]:
                bdp[x, y] = (0, 0, 0, 0)
    neck = poly_mask([NECK_BEHIND_HEAD]).load()
    for y in range(H):
        for x in range(W):
            if neck[x, y] and bdp[x, y][3] == 0:
                bdp[x, y] = SKIN
    # só preenche o que fica dentro da silhueta do corpo
    sil = Image.new("L", (W, H), 0)
    sp = sil.load()
    for y in range(H):
        for x in range(W):
            if bdp[x, y][3] or hl[x, y]:
                sp[x, y] = 255
    sil = sil.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    holes_in = Image.new("L", (W, H), 0)
    hi = holes_in.load()
    sp2 = sil.load()
    for y in range(H):
        for x in range(W):
            if hl[x, y] and (sp2[x, y] or y > 205) and not dm[x, y]:
                hi[x, y] = 255
    # atrás do fone: regras explícitas (o preenchimento automático alternava
    # preto/branco e virava um xadrez): pescoço em pele, gola em branco,
    # ombros em preto; acima dos ombros, fora do pescoço, fica vazio.
    behind = poly_mask([PHONES_L, PHONES_R] + BAND).filter(ImageFilter.MaxFilter(3)).load()
    for y in range(H):
        for x in range(W):
            c0 = bp[x, y]
            collar = 392 <= x <= 428 and 216 <= y <= 224 and c0[3] > 60 and c0[0] + c0[1] + c0[2] < 200
            if (pm[x, y] or behind[x, y]) and not collar:
                hi[x, y] = 0
                grow = max(0, y - 205) * 0.3
                if 397 - grow <= x <= 428 + (y - 170) * 0.08 and y < 216:
                    bdp[x, y] = SKIN
                elif y >= 203 and x <= 376 + (y - 203) * 0.6:
                    bdp[x, y] = BLACK
                elif y >= 208 and x >= 434 + (219 - y) * 2.3:
                    bdp[x, y] = BLACK
                elif y >= 213 + abs(x - 405) * 0.15:  # ombros da camisa descendo para os lados
                    bdp[x, y] = (254, 254, 252, 255)
                else:
                    bdp[x, y] = (0, 0, 0, 0)
    sleeve_poly = poly_mask([SLEEVE_R]).load()
    sleeve = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    slp = sleeve.load()
    rfull0 = hand_mask["r"][0].load()
    for y in range(H):
        for x in range(W):
            c = bp[x, y]
            if sleeve_poly[x, y] and c[3] > 60 and not is_lilac(c) and not rfull0[x, y] and not dm[x, y]:
                slp[x, y] = c
                hi[x, y] = 0
                bdp[x, y] = BLACK if x <= 466 + (y - 220) * 0.08 else (0, 0, 0, 0)
    shade = tuple(int(NECK_SHADE[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    for y in range(160, 216):
        for x in range(390, 436):
            c = bdp[x, y]
            if pm[x, y] and c[3] and is_skin(c) and not hp[x, y][3] and any(hp[x, y - k][3] > 60 for k in range(1, 5)):
                bdp[x, y] = shade
    rmask = hand_mask["r"][0].load()
    for y in range(H):
        for x in range(W):
            if rmask[x, y] and not dm[x, y]:
                hi[x, y] = 0
                bdp[x, y] = BLACK if x >= 444 + (y - 300) * 0.1 else (254, 254, 252, 255)
    inpaint(body, holes_in)

    pieces.update({"chair": chair, "body": body, "phones": phones, "head": head, "sleeve-r": sleeve,
                   "monitor": monitor, "desk": desk})
    pieces.update(feature_parts)
    return pieces, fingers_meta


def main():
    pieces, fingers_meta = build()
    order = ["chair", "body", "phones", "head", "features-brows", "features-eyes", "features-nose",
             "features-stache", "features-mouth", "shadow-l", "hand-l", "sleeve-r", "shadow-r", "hand-r",
             "monitor", "desk"]
    art = {"scale": round(1 / K, 6), "parts": {}, "fingers": fingers_meta}
    with tempfile.TemporaryDirectory() as tmp:
        for name in order:
            svg = trace(pieces[name], name, tmp)
            art["parts"][name] = svg
            print(f"  {name:10s} {len(svg) // 1024:4d} KB  {svg.count('<path'):4d} paths")
            if "--debug" in sys.argv:
                dbg = Path(sys.argv[sys.argv.index("--debug") + 1])
                dbg.mkdir(parents=True, exist_ok=True)
                pieces[name].save(dbg / f"avpart-{name}.png")
    js = ("/* Gerado por tools/build_avatar.py a partir de img/iconR.png — não editar à mão. */\n"
          "window.AVATAR_ART = " + json.dumps(art, ensure_ascii=False, separators=(",", ":")) + ";\n")
    OUT_JS.write_text(js, encoding="utf-8")
    print(f"js/avatar-art.js  {len(js) // 1024} KB")


if __name__ == "__main__":
    main()
