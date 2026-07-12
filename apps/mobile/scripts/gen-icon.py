"""One-off generator for the Borewell Connect app icon / adaptive icon.
Uses the borewell drilling-rig photo as the icon artwork (per request), cropped
square and centered on the truck + drill mast so it stays legible at small sizes.
Run with: python scripts/gen-icon.py
Produces assets/icon.png, assets/adaptive-icon.png, assets/favicon.png.
"""
from PIL import Image

SRC = "assets/borewell-hero.jpg"
SIZE = 1024

src = Image.open(SRC).convert("RGB")
w, h = src.size  # 1402 x 1122

# Full-icon crop: a slightly wide square centered on the rig, keeping the
# truck cab, mast, and water splash all in frame.
box_full = (150, 60, 1150, 1060)  # 1000x1000
icon = src.crop(box_full).resize((SIZE, SIZE), Image.LANCZOS)
icon.save("assets/icon.png")
print("wrote assets/icon.png")

# Adaptive icon foreground: zoom in tighter on the cab + mast so the subject
# still reads once Android's launcher mask crops the outer ~33% safe-zone margin.
box_tight = (330, 40, 1030, 740)  # 700x700, centered on cab/mast
adaptive = src.crop(box_tight).resize((SIZE, SIZE), Image.LANCZOS)
adaptive.save("assets/adaptive-icon.png")
print("wrote assets/adaptive-icon.png")

# Favicon: same framing as the full icon.
icon.save("assets/favicon.png")
print("wrote assets/favicon.png")
