"""Generate placeholder art for the bear chapter (levels 19-21).

Outputs, matching the atlas layouts the other chapters use:
  client/public/assets/characters/bear/bear-v1.png + .json   (3x3: idle blink happy / eat left down / right celebrate sad)
  client/public/assets/objects/wolves/wolf-items-v1.png + .json (burrow ready item; sent reuses burrow)
  client/public/assets/backgrounds/ridge-v1.png               (sunrise grade of pine-v1)

The bear (a grizzly cub) is drawn with shapes and stroked fur. Wolf items reuse the existing den and wolf artwork.
Replace these files with final art at the same paths and frame names; no code changes needed.

Run from the repo root:  python3 scripts/make-bear-placeholders.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'client', 'public', 'assets')
CELL = 420
SS = 3  # supersample factor for smooth edges
S = CELL * SS

FUR = (112, 74, 46, 255)          # grizzly brown
FUR_DARK = (70, 45, 28, 255)
FUR_TIP = (168, 124, 82, 255)      # grizzled highlights on head and hump
SNOUT = (176, 136, 96, 255)
SNOUT_DARK = (138, 100, 66, 255)
NOSE = (30, 22, 20, 255)
EYE = (34, 22, 16, 255)
IRIS = (120, 72, 30, 255)
CLAW = (226, 214, 190, 255)
MOUTH = (96, 40, 40, 255)
TONGUE = (196, 96, 100, 255)
WHITE = (255, 255, 255, 255)


def p(v):
    return int(v * SS)


def ell(d, cx, cy, rx, ry, fill, outline=None, width=0):
    d.ellipse([p(cx - rx), p(cy - ry), p(cx + rx), p(cy + ry)], fill=fill, outline=outline, width=p(width))


def arc(d, cx, cy, rx, ry, start, end, fill, width):
    d.arc([p(cx - rx), p(cy - ry), p(cx + rx), p(cy + ry)], start, end, fill=fill, width=p(width))


def poly(d, pts, fill):
    d.polygon([(p(x), p(y)) for x, y in pts], fill=fill)


def fur_texture(img, seed):
    """Short directional strokes so the coat reads as fur rather than felt."""
    import random
    rnd = random.Random(seed)
    alpha = img.split()[3]
    tex = Image.new('RGBA', img.size, (0, 0, 0, 0))
    td = ImageDraw.Draw(tex)
    for _ in range(2600):
        x, y = rnd.uniform(40, 380), rnd.uniform(40, 410)
        if alpha.getpixel((p(x), p(y))) < 250:
            continue
        light = y < 200 and rnd.random() < .55
        col = (FUR_TIP[:3] + (120,)) if light else (FUR_DARK[:3] + (90,))
        dx = (x - 210) / 30 + rnd.uniform(-2, 2)
        td.line([p(x), p(y), p(x + dx), p(y + rnd.uniform(6, 12))], fill=col, width=p(1.6))
    tex.putalpha(Image.composite(tex.split()[3], Image.new('L', img.size, 0), alpha))
    img.alpha_composite(tex)


def shade(img):
    """Darken the lower body and edges for volume."""
    alpha = img.split()[3]
    g = Image.new('L', img.size, 0)
    gd = ImageDraw.Draw(g)
    for i in range(60):
        y = 250 + i * 2.6
        gd.rectangle([0, p(y), S, p(y + 3)], fill=int(i * 1.6))
    dark = Image.new('RGBA', img.size, (40, 24, 14, 255))
    dark.putalpha(Image.composite(g, Image.new('L', img.size, 0), alpha))
    img.alpha_composite(dark)


def draw_bear(pose):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = 210
    stand = pose == 'celebrate'  # rears up on hind legs, forepaws raised

    # Haunches: big hind legs splayed on the ground either side.
    for side in (-1, 1):
        ell(d, cx + side * 92, 352, 62, 50, FUR_DARK)
        ell(d, cx + side * 90, 350, 58, 46, FUR)
        ell(d, cx + side * 120, 392, 34, 16, FUR_DARK)  # hind foot

    # Barrel body with a shoulder hump.
    poly(d, [(cx - 108, 380), (cx - 118, 280), (cx - 92, 200), (cx - 40, 168), (cx, 160),
             (cx + 40, 168), (cx + 92, 200), (cx + 118, 280), (cx + 108, 380)], FUR)
    ell(d, cx, 196, 98, 52, FUR)               # hump across the shoulders
    ell(d, cx, 300, 112, 92, FUR)

    if stand:
        # Forelegs lifted, paws out with claws.
        for side in (-1, 1):
            d.line([p(cx + side * 70), p(225), p(cx + side * 138), p(140)], fill=FUR_DARK, width=p(50))
            d.line([p(cx + side * 70), p(225), p(cx + side * 136), p(142)], fill=FUR, width=p(44))
            ell(d, cx + side * 140, 132, 27, 22, FUR_DARK)
            for t in (-14, -5, 5, 14):
                d.line([p(cx + side * 140 + t), p(112), p(cx + side * 140 + t * 1.2), p(100)], fill=CLAW, width=p(3.4))
    else:
        # Thick straight forelegs planted between the haunches, big paws with claws.
        for side in (-1, 1):
            x = cx + side * 42
            d.rounded_rectangle([p(x - 30), p(250), p(x + 30), p(392)], radius=p(26), fill=FUR)
            d.line([p(x + side * 30), p(270), p(x + side * 30), p(380)], fill=FUR_DARK, width=p(3))
            ell(d, x, 392, 36, 16, FUR_DARK)
            for t in (-20, -7, 7, 20):
                d.line([p(x + t), p(396), p(x + t * 1.1), p(406)], fill=CLAW, width=p(3.4))
        d.line([p(cx), p(262), p(cx), p(392)], fill=FUR_DARK, width=p(3))

    # Head: broad, flat-topped skull with small rounded ears set wide.
    hy = 140
    ell(d, cx, hy + 64, 78, 26, FUR_DARK)  # chin shadow separates head from chest
    for side in (-1, 1):
        ell(d, cx + side * 74, hy - 66, 24, 22, FUR_DARK)
        ell(d, cx + side * 74, hy - 64, 18, 16, FUR)
        ell(d, cx + side * 74, hy - 62, 10, 9, FUR_DARK)
    poly(d, [(cx - 92, hy + 10), (cx - 86, hy - 46), (cx - 50, hy - 76), (cx, hy - 82),
             (cx + 50, hy - 76), (cx + 86, hy - 46), (cx + 92, hy + 10), (cx + 66, hy + 54), (cx - 66, hy + 54)], FUR)
    ell(d, cx, hy - 20, 88, 64, FUR)
    for side in (-1, 1):                     # cheek ruff
        poly(d, [(cx + side * 86, hy - 4), (cx + side * 104, hy + 26), (cx + side * 80, hy + 40), (cx + side * 62, hy + 60)], FUR)

    # Long tapered snout.
    poly(d, [(cx - 34, hy - 6), (cx + 34, hy - 6), (cx + 42, hy + 46), (cx + 30, hy + 72),
             (cx - 30, hy + 72), (cx - 42, hy + 46)], SNOUT)
    ell(d, cx, hy + 54, 42, 28, SNOUT)
    poly(d, [(cx - 30, hy - 8), (cx + 30, hy - 8), (cx + 16, hy - 34), (cx - 16, hy - 34)], SNOUT_DARK)

    # Brow ridge and small, deep-set eyes.
    ex, ey = 38, hy - 22
    shift = {'left': (-4, 0), 'right': (4, 0), 'down': (0, 4), 'sad': (0, 3)}.get(pose, (0, 0))
    for side in (-1, 1):
        x = cx + side * ex
        if pose == 'sad':
            d.line([p(x - side * 14), p(ey - 14), p(x + side * 12), p(ey - 22)], fill=FUR_DARK, width=p(5))
        else:
            arc(d, x, ey - 2, 16, 12, 200, 340, FUR_DARK, 4)
        if pose == 'blink':
            arc(d, x, ey - 2, 10, 6, 20, 160, EYE, 3.5)
        elif pose in ('eat', 'celebrate'):
            arc(d, x, ey + 6, 10, 9, 200, 340, EYE, 4)
        else:
            ell(d, x, ey, 12, 12, EYE)
            ell(d, x + shift[0], ey + shift[1], 8.5, 8.5, IRIS)
            ell(d, x + shift[0], ey + shift[1], 5, 5, EYE)
            ell(d, x + shift[0] - 3, ey + shift[1] - 3, 2.5, 2.5, WHITE)

    # Big broad nose at the tip of the snout.
    poly(d, [(cx - 22, hy + 36), (cx + 22, hy + 36), (cx + 16, hy + 54), (cx, hy + 60), (cx - 16, hy + 54)], NOSE)
    ell(d, cx - 8, hy + 41, 5, 3, (90, 80, 78, 255))

    # Mouth.
    my = hy + 66
    if pose in ('happy', 'celebrate'):
        d.chord([p(cx - 22), p(my - 10), p(cx + 22), p(my + 24)], 0, 180, fill=MOUTH)
        ell(d, cx, my + 14, 11, 6, TONGUE)
    elif pose == 'eat':
        ell(d, cx, my + 6, 12, 9, MOUTH)
        for side in (-1, 1):
            ell(d, cx + side * 40, hy + 52, 12, 10, SNOUT)
    elif pose == 'sad':
        arc(d, cx, my + 12, 14, 8, 200, 340, NOSE, 3)
    else:
        d.line([p(cx), p(hy + 58), p(cx), p(my)], fill=NOSE, width=p(3))
        arc(d, cx - 9, my - 4, 9, 7, 20, 160, NOSE, 3)
        arc(d, cx + 9, my - 4, 9, 7, 20, 160, NOSE, 3)

    shade(img)
    fur_texture(img, sum(map(ord, pose)))
    return img.resize((CELL, CELL), Image.LANCZOS)


def atlas_json(image, names, w, h, cols):
    frames = {}
    for i, name in enumerate(names):
        x, y = (i % cols) * w, (i // cols) * h
        frames[name] = {
            'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h}, 'sourceSize': {'w': w, 'h': h},
        }
    return frames


def write_atlas(path, frames, image_name, size):
    with open(path, 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': image_name, 'size': {'w': size[0], 'h': size[1]}, 'scale': '1'}}, f, indent=2)
        f.write('\n')


def make_bear():
    names = ['idle', 'blink', 'happy', 'eat', 'left', 'down', 'right', 'celebrate', 'sad']
    sheet = Image.new('RGBA', (CELL * 3, CELL * 3), (0, 0, 0, 0))
    for i, name in enumerate(names):
        sheet.alpha_composite(draw_bear(name), ((i % 3) * CELL, (i // 3) * CELL))
    out = os.path.join(ASSETS, 'characters', 'bear')
    os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'bear-v1.png'), optimize=True)
    write_atlas(os.path.join(out, 'bear-v1.json'), atlas_json(sheet, names, CELL, CELL, 3), 'bear-v1.png', sheet.size)


def make_wolf_items():
    items = Image.open(os.path.join(ASSETS, 'objects', 'bobcats', 'bobcat-items-v1.png')).convert('RGBA')
    cell = 724
    den = items.crop((0, 0, cell, cell))
    wolves = Image.open(os.path.join(ASSETS, 'characters', 'wolf', 'wolf-v1.png')).convert('RGBA')
    wolf_happy = wolves.crop((831, 0, 1246, 421))  # 'happy' frame
    wolf_idle = wolves.crop((0, 0, 415, 421))

    # ready: a wolf pup peeking out of the den, front rim of the den drawn over it.
    ready = den.copy()
    pup = wolf_happy.resize((300, 304), Image.LANCZOS)
    head = pup.crop((0, 0, 300, 190))
    ready.alpha_composite(head, (212, 330))
    rim = den.crop((0, 505, cell, cell))
    ready.alpha_composite(rim, (0, 505))

    # item: a whole wolf pup, centred like the bobcat item.
    item = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
    whole = wolf_idle.resize((560, 568), Image.LANCZOS)
    item.alpha_composite(whole, ((cell - 560) // 2, cell - 568 - 40))

    sheet = Image.new('RGBA', (cell * 3, cell), (0, 0, 0, 0))
    for i, frame in enumerate((den, ready, item)):
        sheet.alpha_composite(frame, (i * cell, 0))
    out = os.path.join(ASSETS, 'objects', 'wolves')
    os.makedirs(out, exist_ok=True)
    sheet.save(os.path.join(out, 'wolf-items-v1.png'), optimize=True)
    frames = atlas_json(sheet, ['burrow', 'ready', 'item'], cell, cell, 3)
    frames['sent'] = dict(frames['burrow'])
    write_atlas(os.path.join(out, 'wolf-items-v1.json'), frames, 'wolf-items-v1.png', sheet.size)


def make_ridge():
    pine = Image.open(os.path.join(ASSETS, 'backgrounds', 'pine-v1.png')).convert('RGB')
    bright = ImageEnhance.Brightness(pine).enhance(1.12)
    warm = Image.new('RGB', pine.size, (255, 176, 110))
    graded = Image.blend(bright, warm, 0.22)
    graded = ImageEnhance.Color(graded).enhance(1.1)
    graded.save(os.path.join(ASSETS, 'backgrounds', 'ridge-v1.png'), optimize=True)


if __name__ == '__main__':
    make_bear()
    make_wolf_items()
    make_ridge()
    print('bear placeholder art written')
