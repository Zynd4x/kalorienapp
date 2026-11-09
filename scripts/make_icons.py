"""Erzeugt das KalorienKompass-App-Icon und alle Android-Varianten."""

import math
import os
from PIL import Image, ImageDraw

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
S = 4  # Supersampling
SIZE = 1024
BG = (47, 125, 79, 255)        # #2F7D4F
BG_DARK = (39, 104, 66, 255)   # #276842
WHITE = (245, 247, 242, 255)   # #F5F7F2
AMBER = (240, 164, 58, 255)    # #F0A43A

# Basis-Maße im 1024er-Raster
RING_R = 330
RING_W = 36
TICK_OUT = 372
TICK_W = 26
LEAF_H = 500
LEAF_W = 244
HUB_R = 46


def leaf_half_points(cx, cy, half_width, height, left):
    """Randkurve einer Blatt-/Nadelhälfte von unten nach oben."""
    pts = []
    steps = 240
    for i in range(steps + 1):
        u = i / steps
        y = cy + height / 2 - u * height
        width = half_width * (math.sin(math.pi * u) ** 0.78)
        x = cx - width if left else cx + width
        pts.append((x, y))
    return pts


def draw_emblem(size=1024, scale=1.0, mono=False):
    """Zeichnet das Emblem transparent auf size x size."""
    canvas = size * S
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    cx = cy = canvas / 2
    k = (canvas / 1024) * scale

    ring_r = RING_R * k
    ring_w = RING_W * k
    tick_out = TICK_OUT * k
    tick_w = TICK_W * k
    leaf_h = LEAF_H * k
    leaf_w = LEAF_W * k
    hub_r = HUB_R * k

    ring_color = (255, 255, 255, 255) if mono else WHITE
    left_color = (255, 255, 255, 255) if mono else AMBER
    right_color = (255, 255, 255, 255) if mono else WHITE
    seam_color = (0, 0, 0, 0) if mono else BG

    # Kompassring
    d.ellipse(
        [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
        outline=ring_color,
        width=int(round(ring_w)),
    )

    # vier Tickmarken
    for angle in (0, 90, 180, 270):
        a = math.radians(angle)
        x1 = cx + math.sin(a) * (ring_r + ring_w * 0.15)
        y1 = cy - math.cos(a) * (ring_r + ring_w * 0.15)
        x2 = cx + math.sin(a) * tick_out
        y2 = cy - math.cos(a) * tick_out
        d.line([(x1, y1), (x2, y2)], fill=ring_color, width=int(round(tick_w)))
        r = tick_w / 2
        d.ellipse([x2 - r, y2 - r, x2 + r, y2 + r], fill=ring_color)

    # Blattnadel: linke und rechte Hälfte
    left = leaf_half_points(cx, cy, leaf_w / 2, leaf_h, True)
    right = leaf_half_points(cx, cy, leaf_w / 2, leaf_h, False)

    d.polygon(left + [(cx, cy + leaf_h / 2)], fill=left_color)
    d.polygon(right + [(cx, cy + leaf_h / 2)], fill=right_color)

    # Mittelnaht
    if not mono:
        d.line(
            [(cx, cy - leaf_h / 2 + 8 * k), (cx, cy + leaf_h / 2 - 8 * k)],
            fill=seam_color,
            width=max(2, int(round(10 * k))),
        )

    # Nabe
    d.ellipse(
        [cx - hub_r, cy - hub_r, cx + hub_r, cy + hub_r],
        fill=seam_color if not mono else (0, 0, 0, 0),
        outline=ring_color,
        width=max(2, int(round(10 * k))),
    )

    return img.resize((size, size), Image.LANCZOS)


def save(img, name, fmt=None, **kwargs):
    path = os.path.join(ASSETS, name)
    img.save(path, format=fmt, **kwargs)
    print(f"{name}: {img.size[0]}x{img.size[1]} -> {os.path.getsize(path)} Bytes")


def main():
    os.makedirs(ASSETS, exist_ok=True)

    # Vollflächiges Icon
    icon = Image.new("RGBA", (SIZE, SIZE), BG)
    icon.alpha_composite(draw_emblem(SIZE, 1.0))
    save(icon, "icon.png")

    # Adaptives Icon: Hintergrund + Vordergrund (Safe Zone ~61 %)
    save(Image.new("RGBA", (SIZE, SIZE), BG), "android-icon-background.png")
    save(draw_emblem(SIZE, 0.80), "android-icon-foreground.png")
    save(draw_emblem(SIZE, 0.80, mono=True), "android-icon-monochrome.png")

    # Splash-Logo (transparent, etwas größer)
    save(draw_emblem(SIZE, 0.92), "splash-icon.png")

    # Favicon
    fav = Image.new("RGBA", (196, 196), BG)
    fav.alpha_composite(draw_emblem(196, 1.0))
    save(fav, "favicon.png")

    # Vorschau mit abgerundeter Maske zur Kontrolle
    preview = icon.copy()
    mask = Image.new("L", (SIZE * S, SIZE * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, SIZE * S - 1, SIZE * S - 1], radius=int(SIZE * S * 0.22), fill=255
    )
    preview.putalpha(mask.resize((SIZE, SIZE), Image.LANCZOS))
    save(preview, "icon-preview.png")


if __name__ == "__main__":
    main()
