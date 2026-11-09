"""Schreibt die Icon-Assets in alle Android-Dichteordner."""

import os
import shutil
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
ASSETS = os.path.join(ROOT, "assets")

RES_DIRS = [
    os.path.join(ROOT, "android", "app", "src", "main", "res"),
    r"C:\kk-build\android\app\src\main\res",
]

DENSITIES = {
    "mdpi": {"launcher": 48, "adaptive": 108, "splash": 288},
    "hdpi": {"launcher": 72, "adaptive": 162, "splash": 432},
    "xhdpi": {"launcher": 96, "adaptive": 216, "splash": 576},
    "xxhdpi": {"launcher": 144, "adaptive": 324, "splash": 864},
    "xxxhdpi": {"launcher": 192, "adaptive": 432, "splash": 1152},
}

GREEN = (47, 125, 79, 255)


def load(name):
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")


def make_round():
    """Rundes Legacy-Icon: grüner Kreis mit Emblem."""
    size = 1024
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.ellipse([0, 0, size - 1, size - 1], fill=GREEN)
    base.alpha_composite(load("android-icon-foreground.png"))
    return base


def save_webp(img, path):
    img.save(path, format="WEBP", lossless=True, quality=100, method=6)


def main():
    icon = load("icon.png")
    round_icon = make_round()
    foreground = load("android-icon-foreground.png")
    monochrome = load("android-icon-monochrome.png")
    background = load("android-icon-background.png")
    splash = load("splash-icon.png")

    for res in RES_DIRS:
        if not os.path.isdir(res):
            print(f"uebersprungen (fehlt): {res}")
            continue
        print(f"-> {res}")
        for density, sizes in DENSITIES.items():
            folder = os.path.join(res, f"mipmap-{density}")
            os.makedirs(folder, exist_ok=True)
            save_webp(
                icon.resize((sizes["launcher"], sizes["launcher"]), Image.LANCZOS),
                os.path.join(folder, "ic_launcher.webp"),
            )
            save_webp(
                round_icon.resize(
                    (sizes["launcher"], sizes["launcher"]), Image.LANCZOS
                ),
                os.path.join(folder, "ic_launcher_round.webp"),
            )
            save_webp(
                foreground.resize(
                    (sizes["adaptive"], sizes["adaptive"]), Image.LANCZOS
                ),
                os.path.join(folder, "ic_launcher_foreground.webp"),
            )
            save_webp(
                background.resize(
                    (sizes["adaptive"], sizes["adaptive"]), Image.LANCZOS
                ),
                os.path.join(folder, "ic_launcher_background.webp"),
            )
            save_webp(
                monochrome.resize(
                    (sizes["adaptive"], sizes["adaptive"]), Image.LANCZOS
                ),
                os.path.join(folder, "ic_launcher_monochrome.webp"),
            )
            drawable = os.path.join(res, f"drawable-{density}")
            os.makedirs(drawable, exist_ok=True)
            splash.resize((sizes["splash"], sizes["splash"]), Image.LANCZOS).save(
                os.path.join(drawable, "splashscreen_logo.png"), format="PNG"
            )
        print("   OK")


if __name__ == "__main__":
    main()
