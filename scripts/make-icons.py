# Nila Gym: Nila's wordmark plus a green GYM tag.
# Regenerates the app icons and the in-app wordmark from logo/logo.png:
#   python3 scripts/make-icons.py logo/logo.png public/icons public
# Needs Pillow (pip install pillow).
import sys
from PIL import Image

src, out_icons, out_public = sys.argv[1:4]
CREAM = (251, 250, 237)
INK = (10, 10, 8)

im = Image.open(src).convert("L")  # luminance
# Alpha from darkness: paper (~240+) → 0, ink (~5) → 255, smooth edges kept.
paper, ink = 232.0, 20.0
alpha = im.point(lambda v: 0 if v >= paper else 255 if v <= ink else int(round((paper - v) / (paper - ink) * 255)))
box = alpha.getbbox()
pad = 6
box = (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad)
mark = alpha.crop(box)  # the wordmark as an alpha mask
print("wordmark crop", mark.size)

def wordmark(color, height=None):
    m = mark if height is None else mark.resize((round(mark.width * height / mark.height), height), Image.LANCZOS)
    img = Image.new("RGBA", m.size, color + (0,))
    img.putalpha(m)
    return img

# In-app logo: black on transparent (CSS inverts it for dark mode), 2x/3x crisp.
wordmark(INK, 192).save(f"{out_public}/logo.png", optimize=True)

GREEN = (22, 163, 74)
FONT = "/usr/share/fonts/truetype/ubuntu/UbuntuSans[wdth,wght].ttf"

def gym_pill(height):
    """A green rounded tag with "GYM" in white, drawn 4x and scaled down for smooth edges."""
    from PIL import ImageDraw, ImageFont
    h = height * 4
    font = ImageFont.truetype(FONT, round(h * 0.62))
    font.set_variation_by_name("Bold")
    left, top, right, bottom = font.getbbox("GYM")
    w = (right - left) + round(h * 0.9)
    pill = Image.new("RGBA", (w, h), GREEN + (0,))
    d = ImageDraw.Draw(pill)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=GREEN + (255,))
    d.text(((w - (right - left)) / 2 - left, (h - (bottom - top)) / 2 - top), "GYM", font=font, fill=(255, 255, 255, 255))
    return pill.resize((round(w / 4), height), Image.LANCZOS)

def icon(size, width_ratio, rounded=False):
    canvas = Image.new("RGBA", (size, size), CREAM + (255,))
    target_w = round(size * width_ratio)
    target_h = round(mark.height * target_w / mark.width)
    m = mark.resize((target_w, target_h), Image.LANCZOS)
    ink = Image.new("RGBA", m.size, INK + (255,))
    if size < 64:
        # Favicon: too small for the tag; the wordmark alone, as in Nila, on green.
        canvas = Image.new("RGBA", (size, size), GREEN + (255,))
        ink = Image.new("RGBA", m.size, (255, 255, 255, 255))
        canvas.paste(ink, ((size - target_w) // 2, (size - target_h) // 2), m)
    else:
        # Wordmark above, green "GYM" tag below, centred together.
        pill = gym_pill(round(size * width_ratio * 0.24))
        gap = round(size * 0.03)
        total = target_h + gap + pill.height
        top = (size - total) // 2
        canvas.paste(ink, ((size - target_w) // 2, top), m)
        canvas.alpha_composite(pill, ((size - pill.width) // 2, top + target_h + gap))
    if rounded:
        from PIL import ImageDraw
        r = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(r).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 * 0.22, fill=255)
        canvas.putalpha(r.resize((size, size), Image.LANCZOS))
    return canvas

icon(192, 0.72).save(f"{out_icons}/icon-192.png", optimize=True)
icon(512, 0.72).save(f"{out_icons}/icon-512.png", optimize=True)
icon(512, 0.58).save(f"{out_icons}/icon-maskable-512.png", optimize=True)  # Android may crop to a circle
icon(180, 0.72).convert("RGB").save(f"{out_icons}/apple-touch-icon.png", optimize=True)  # iOS: no transparency
icon(32, 0.9, rounded=True).save(f"{out_icons}/favicon-32.png", optimize=True)
