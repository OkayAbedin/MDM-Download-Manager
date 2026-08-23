import os
from PIL import Image, ImageDraw

def create_sidebar_bmp():
    width, height = 164, 314
    # Clean, elegant dark gradient background
    img = Image.new("RGB", (width, height), (17, 19, 24))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        factor = y / height
        r = int(14 + factor * 8)
        g = int(16 + factor * 9)
        b = int(20 + factor * 11)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Load and place MDM icon centered (both horizontally and vertically)
    icon_path = os.path.join("build", "icon-256.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join("build", "icon.png")

    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA")
        icon_size = 96
        icon_resized = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        icon_x = (width - icon_size) // 2
        icon_y = (height - icon_size) // 2
        
        img.paste(icon_resized, (icon_x, icon_y), icon_resized)

    out_path = os.path.join("build", "installerSidebar.bmp")
    img.save(out_path, format="BMP")
    print(f"Generated {out_path} ({width}x{height}) with clean centered icon.")


def create_header_bmp():
    width, height = 150, 57
    img = Image.new("RGB", (width, height), (22, 24, 30))
    draw = ImageDraw.Draw(img)

    for x in range(width):
        factor = x / width
        r = int(18 + factor * 6)
        g = int(20 + factor * 7)
        b = int(25 + factor * 9)
        draw.line([(x, 0), (x, height)], fill=(r, g, b))

    icon_path = os.path.join("build", "icon-256.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join("build", "icon.png")

    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert("RGBA")
        icon_size = 38
        icon_resized = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        img.paste(icon_resized, (width - 48, (height - icon_size) // 2), icon_resized)

    out_path = os.path.join("build", "installerHeader.bmp")
    img.save(out_path, format="BMP")
    print(f"Generated {out_path} ({width}x{height})")


if __name__ == "__main__":
    os.makedirs("build", exist_ok=True)
    create_sidebar_bmp()
    create_header_bmp()
