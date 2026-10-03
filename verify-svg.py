"""Validate the colour-adaptive favicon.svg and site.webmanifest."""

import base64
import json
import re
import xml.etree.ElementTree as ET

raw = open("assets/favicon.svg", encoding="utf-8").read()
root = ET.fromstring(raw)
print("favicon.svg parses as XML, root =", root.tag)

ns = {"s": "http://www.w3.org/2000/svg"}
images = root.findall(".//s:image", ns)
print("embedded rasters:", len(images))
for image in images:
    href = image.get("{http://www.w3.org/1999/xlink}href")
    data = base64.b64decode(href.split(",", 1)[1])
    ok = data[:8] == b"\x89PNG\r\n\x1a\n"
    print(f"  class={image.get('class'):<9} {len(data):>6} bytes  PNG magic ok: {ok}")
    if not ok:
        raise SystemExit("embedded raster is not a PNG")

print("prefers-color-scheme rule present:", "prefers-color-scheme" in raw)
print("opaque background rect present:", bool(re.search(r"<rect[^>]*fill=\"#", raw)))

manifest = json.load(open("site.webmanifest", encoding="utf-8"))
print("\nsite.webmanifest parses;", len(manifest["icons"]), "icons:")
import os

for entry in manifest["icons"]:
    target = entry["src"].lstrip("./")
    exists = os.path.exists(target)
    print(f"  {entry['sizes']:>9}  maskable={entry.get('purpose') == 'maskable'!s:<5} exists={exists}  {entry['src']}")
    if not exists:
        raise SystemExit(f"manifest points at a missing file: {entry['src']}")

print("\nall structural checks passed")