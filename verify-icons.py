"""Verify the generated icon set: dimensions, canvas fill, and 16px legibility.

Nothing here eyeballs the artwork. Legibility is measured: the mark is
composited onto the two browser chrome backgrounds and we report how much of the
16px box carries ink, how much contrast that ink has against the background, and
how many distinct tone steps survive downscaling. A mark that blurs into a
uniform blob shows up as very few steps.
"""

import os

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "assets")

DARK = (0x20, 0x21, 0x24)
LIGHT = (0xFF, 0xFF, 0xFF)


def luminance(rgb):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


print("generated files")
expected = {
    "favicon-16.png": (16, 16),
    "favicon-32.png": (32, 32),
    "favicon-48.png": (48, 48),
    "favicon-64.png": (64, 64),
    "apple-touch-icon.png": (180, 180),
    "icon-192.png": (192, 192),
    "icon-512.png": (512, 512),
    "maskable-icon-192.png": (192, 192),
    "maskable-icon-512.png": (512, 512),
}
failures = []
for name, size in expected.items():
    path = os.path.join(ASSETS, name)
    if not os.path.exists(path):
        failures.append(f"{name} missing")
        continue
    with Image.open(path) as img:
        actual = img.size
        mode = img.mode
    ok = actual == size
    if not ok:
        failures.append(f"{name} is {actual}, expected {size}")
    print(f"  {'ok ' if ok else 'FAIL'} {name:<26} {actual[0]}x{actual[1]} {mode}")

print("\ntransparent tab icons keep a transparent corner")
for name in ("favicon-16.png", "favicon-32.png", "favicon-48.png"):
    with Image.open(os.path.join(ASSETS, name)) as img:
        rgba = img.convert("RGBA")
        corners = [rgba.getpixel(p)[3] for p in ((0, 0), (rgba.width - 1, 0), (0, rgba.height - 1), (rgba.width - 1, rgba.height - 1))]
    ok = all(c == 0 for c in corners)
    if not ok:
        failures.append(f"{name} corner alpha {corners}")
    print(f"  {'ok ' if ok else 'FAIL'} {name:<26} corner alpha {corners}")

print("\nsolid tiles are opaque navy, mark inside the safe area")
for name in ("apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-icon-192.png", "maskable-icon-512.png"):
    with Image.open(os.path.join(ASSETS, name)) as img:
        rgba = img.convert("RGBA")
    bg = rgba.getpixel((0, 0))[:3]
    bg_ok = bg == (0x08, 0x12, 0x23)
    ink = Image.new("RGB", rgba.size, bg)
    ink.paste(rgba, (0, 0), rgba.getchannel("A"))
    px = ink.load()
    cols = [x for x in range(rgba.width) if any(abs(px[x, y][0] - 0x08) > 12 or abs(px[x, y][1] - 0x12) > 12 or abs(px[x, y][2] - 0x23) > 12 for y in range(rgba.height))]
    rows = [y for y in range(rgba.height) if any(abs(px[x, y][0] - 0x08) > 12 or abs(px[x, y][1] - 0x12) > 12 or abs(px[x, y][2] - 0x23) > 12 for x in range(rgba.width))]
    span_x = 100 * (cols[-1] - cols[0] + 1) / rgba.width if cols else 0
    span_y = 100 * (rows[-1] - rows[0] + 1) / rgba.height if rows else 0
    if not bg_ok:
        failures.append(f"{name} background is {bg}, expected #081223")
    print(f"  {'ok ' if bg_ok else 'FAIL'} {name:<26} bg {bg} mark spans {span_x:.0f}% x {span_y:.0f}% of tile")

print("\n16px tab icon on real browser chrome")
with Image.open(os.path.join(ASSETS, "favicon-16.png")) as img:
    tab16 = img.convert("RGBA")

for label, background in (("dark  #202124", DARK), ("light #ffffff", LIGHT)):
    flat = Image.new("RGB", tab16.size, background)
    flat.paste(tab16, (0, 0), tab16.getchannel("A"))
    px = flat.load()
    bg_l = luminance(background)
    ink_pixels, best, tones = 0, 0.0, set()
    for y in range(flat.height):
        for x in range(flat.width):
            rgb = px[x, y]
            if rgb != background:
                ink_pixels += 1
                tones.add(rgb)
                best = max(best, contrast(rgb, background))
    coverage = 100 * ink_pixels / (flat.width * flat.height)
    print(
        f"  {label}: ink covers {coverage:.0f}% of the 16px box, "
        f"peak contrast {best:.1f}:1, {len(tones)} distinct tones"
    )

print("\nverdict")
if failures:
    for f in failures:
        print("  FAIL", f)
    raise SystemExit(1)
print("  all checks passed")