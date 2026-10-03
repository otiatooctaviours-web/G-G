"""Generate the favicon / Apple / PWA icon set from the G&G Tech logo.

The source logo is 500x500 but its ink only occupies a 218x299 box (5.5%
coverage) because of the transparent padding baked into the export. Every page
was pointing a browser straight at that file, so the tab icon rendered at
roughly a fifth of the available size. Everything here works from the alpha
bounding box instead, so the mark actually fills the canvas.

Run:  python gen-icons.py
"""

import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "assets")
SRC = os.path.join(ASSETS, "g_g_tech.dev-removebg.png")

NAVY = (8, 18, 35, 255)  # --color-navy, tile background
GOLD = (241, 207, 141, 255)  # --color-gold-strong, light-UI mark
LIGHT_NAVY = (18, 38, 64, 255)  # --color-navy-2, mark on a light browser UI

# Transparent tab icons: the mark's longest side spans this much of the canvas.
TAB_FILL = 0.95
# Solid navy tiles (Apple / PWA): smaller, so the tile reads as a tile.
TILE_FILL = 0.80
# Maskable: content must survive a circular crop, so it is fitted on its
# half-diagonal rather than its longest side.
MASKABLE_HALF_DIAGONAL = 0.42


def load_mark():
    img = Image.open(SRC).convert("RGBA")
    bbox = img.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit("logo has no opaque pixels")
    return img.crop(bbox)


MARK = load_mark()
ASPECT = MARK.size[0] / MARK.size[1]


def scaled(fraction, canvas):
    """Resize the mark so its longest side is `fraction` of `canvas`."""
    size = (canvas * fraction) / max(MARK.size)
    w, h = max(1, round(MARK.size[0] * size)), max(1, round(MARK.size[1] * size))
    return MARK.resize((w, h), Image.LANCZOS)


def maskable_sized(canvas):
    """Resize so the mark's half-diagonal stays inside the 80% safe circle."""
    height = (2 * MASKABLE_HALF_DIAGONAL * canvas) / ((1 + ASPECT**2) ** 0.5)
    w, h = round(ASPECT * height), round(height)
    return MARK.resize((w, h), Image.LANCZOS)


def centered(mark, canvas, background=None):
    layer = Image.new("RGBA", (canvas, canvas), background or (0, 0, 0, 0))
    layer.alpha_composite(mark, ((canvas - mark.size[0]) // 2, (canvas - mark.size[1]) // 2))
    return layer


def silhouette(colour, canvas):
    """Flatten the mark's alpha into a single colour, for the light-UI variant."""
    mask = MARK.getchannel("A").resize(MARK.size, Image.LANCZOS)
    flat = Image.new("RGBA", MARK.size, colour)
    flat.putalpha(mask)
    return flat


def write(img, name):
    path = os.path.join(ASSETS, name)
    img.save(path, "PNG", optimize=True)
    print(f"  {name:<28} {img.size[0]}x{img.size[1]}  {os.path.getsize(path):>6} B")
    return img


print(f"logo ink box {MARK.size}, aspect {ASPECT:.3f}")

print("transparent tab icons")
tab = {}
for size in (16, 32, 48, 64):
    tab[size] = write(centered(scaled(TAB_FILL, size), size), f"favicon-{size}.png")

print("solid navy tiles")
for size in (192, 512):
    write(centered(scaled(TILE_FILL, size), size, NAVY), f"icon-{size}.png")
write(centered(scaled(TILE_FILL, 180), 180, NAVY), "apple-touch-icon.png")

print("maskable tiles")
for size in (192, 512):
    write(centered(maskable_sized(size), size, NAVY), f"maskable-icon-{size}.png")

print("multi-resolution .ico")
ico_base = centered(scaled(TAB_FILL, 64), 64)
ico_base.save(os.path.join(ASSETS, "favicon.ico"), "ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print(f"  favicon.ico                16/32/48   {os.path.getsize(os.path.join(ASSETS, 'favicon.ico')):>6} B")

print("colour-adaptive favicon.svg")
# Two rasters in one SVG: gold by default (dark tab bars), navy under a light
# browser UI. Both sit on a transparent background. 128px is the largest size any
# browser rasterises a favicon at, and embedding two full-size PNGs instead
# pushed this file past 100 kB.
SVG_RASTER = 128
svg_gold = centered(scaled(TAB_FILL, SVG_RASTER), SVG_RASTER)
svg_light = centered(
    silhouette(LIGHT_NAVY, MARK.size[0]).resize(
        scaled(TAB_FILL, SVG_RASTER).size, Image.LANCZOS
    ),
    SVG_RASTER,
)


def data_uri(img):
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


svg = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="gg-favicon-title">
  <title id="gg-favicon-title">G&amp;G Tech</title>

  <!--
    Tab icon built from assets/g_g_tech.dev-removebg.png.

    The source export is 500x500 with the mark occupying only a 218x299 box, so
    linking it straight from a page rendered it at about a fifth of the space a
    favicon gets. Both rasters below are re-centred and scaled so the mark spans
    95% of the canvas, and the background is transparent rather than a navy tile,
    which used to vanish into a dark tab bar.

    Two rasters instead of one because PNG cannot respond to the browser UI:
    the default is gold for dark tab bars, and prefers-color-scheme: light
    swaps in the navy mark. Both are silhouette-flattened from the same alpha, so
    the two shapes are identical.
  -->
  <style>
    .gg-light {{ display: none; }}
    @media (prefers-color-scheme: light) {{
      .gg-dark {{ display: none; }}
      .gg-light {{ display: inline; }}
    }}
  </style>

  <image class="gg-dark" x="0" y="0" width="256" height="256" xlink:href="{data_uri(svg_gold)}" />
  <image class="gg-light" x="0" y="0" width="256" height="256" xlink:href="{data_uri(svg_light)}" />
</svg>
"""
with open(os.path.join(ASSETS, "favicon.svg"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write(svg)
print(f"  favicon.svg                          {os.path.getsize(os.path.join(ASSETS, 'favicon.svg')):>6} B")

manifest = {
    "name": "G&G Tech",
    "short_name": "G&G",
    "description": "G&G Tech - web, apps and automation for Kenyan businesses.",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "background_color": "#081223",
    "theme_color": "#081223",
    "icons": [
        {"src": "./assets/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "./assets/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {
            "src": "./assets/maskable-icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable",
        },
        {
            "src": "./assets/maskable-icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable",
        },
    ],
}
with open(os.path.join(ROOT, "site.webmanifest"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write(__import__("json").dumps(manifest, indent=2) + "\n")
print(f"  site.webmanifest                     {os.path.getsize(os.path.join(ROOT, 'site.webmanifest')):>6} B")

print("\ndone")