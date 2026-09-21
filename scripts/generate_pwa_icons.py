from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
PUBLIC.mkdir(exist_ok=True)

BG_TOP = (105, 73, 216)
BG_BOTTOM = (33, 22, 95)
PURPLE = (73, 54, 157)
AQUA = (52, 226, 213)
AQUA_DARK = (32, 170, 221)
WHITE = (245, 242, 255)
AMBER = (255, 177, 32)
YELLOW = (255, 239, 67)
BLUE = (54, 79, 181)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_bg(size):
    img = Image.new('RGB', (size, size), BG_BOTTOM)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * max(1, size - 1))
            px[x, y] = lerp(BG_TOP, BG_BOTTOM, t)
    return img.convert('RGBA')


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_icon(size=512, maskable=False):
    scale = size / 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = gradient_bg(size)
    mask = rounded_mask(size, round(104 * scale if not maskable else 88 * scale))
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)

    # Safe-zone transform for maskable icons.
    inset = 34 * scale if maskable else 0
    sx = (size - inset * 2) / size
    def P(x, y):
        return (inset + x * scale * sx, inset + y * scale * sx)
    def S(v):
        return max(1, round(v * scale * sx))

    # Gauge arc.
    box = [*P(92, 92), *P(420, 420)]
    d.arc(box, start=205, end=350, fill=WHITE, width=S(28))
    d.arc(box, start=205, end=255, fill=AQUA, width=S(28))

    # Tick marks.
    ticks = [
        ((158, 170), (143, 157)),
        ((209, 132), (201, 114)),
        ((273, 119), (273, 99)),
        ((336, 136), (346, 118)),
        ((382, 177), (399, 166)),
    ]
    for a, b in ticks:
        d.line([P(*a), P(*b)], fill=WHITE if a != (273, 119) else AMBER, width=S(12))

    # Lightning bolt.
    bolt = [P(286,143), P(195,259), P(262,259), P(237,353), P(328,234), P(262,234)]
    d.polygon(bolt, fill=YELLOW)
    # Orange lower accent.
    d.polygon([P(262,259), P(237,353), P(328,234), P(277,234)], fill=AMBER)

    # Bars.
    bars = [(138,352,184,415), (207,329,253,415), (276,305,322,415), (345,274,391,415)]
    for i, boxv in enumerate(bars):
        x1,y1,x2,y2 = boxv
        color = lerp(BLUE, AQUA, i/3)
        d.rounded_rectangle([P(x1,y1), P(x2,y2)], radius=S(12), fill=(*color, 215))

    # Trend line.
    pts = [P(128,357), P(197,331), P(232,333), P(274,319), P(321,310), P(347,270), P(395,241)]
    d.line(pts, fill=AQUA, width=S(13), joint='curve')
    for x,y in [(197,331), (274,319), (347,270)]:
        cx, cy = P(x,y)
        r = S(13)
        d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=WHITE, outline=AQUA, width=S(8))

    # Brand text.
    font_path = Path(r'C:\Windows\Fonts\segoeuib.ttf')
    font_size = S(46)
    try:
        font = ImageFont.truetype(str(font_path), font_size)
    except Exception:
        font = ImageFont.load_default()
    text = 'Ceo Elec'
    bbox = d.textbbox((0,0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = size/2 - tw/2
    ty = P(0, 432)[1]
    d.text((tx, ty), text, font=font, fill=WHITE)

    return img


def save_icon(filename, size, maskable=False):
    img = draw_icon(size, maskable=maskable)
    img.save(PUBLIC / filename, format='PNG', optimize=True)


save_icon('icon-192.png', 192)
save_icon('icon-512.png', 512)
save_icon('icon-maskable-512.png', 512, maskable=True)
save_icon('apple-touch-icon.png', 180)
save_icon('favicon-32.png', 32)
print('Generated PWA icons in', PUBLIC)
