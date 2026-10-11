from PIL import Image, ImageDraw

# Color palette:
# Units: Blue (#4749EB)
# Tens: Red (#E5395E)
# Hundreds: Green (#179858)
# Thousands: Orange (#E89E45 / #D97706)

BLUE_FILL = (71, 73, 235, 255)
BLUE_BORDER = (35, 38, 175, 255)
BLUE_INNER = (110, 112, 250, 255)

RED_FILL = (229, 57, 94, 255)
RED_BORDER = (175, 25, 60, 255)
RED_LINE = (185, 35, 70, 255)
RED_HIGHLIGHT = (248, 105, 135, 220)

GREEN_FILL = (23, 152, 88, 255)
GREEN_BORDER = (14, 105, 58, 255)
GREEN_LINE = (18, 122, 70, 255)

ORANGE_TOP = (250, 185, 105, 255)
ORANGE_LEFT = (232, 140, 45, 255)
ORANGE_RIGHT = (205, 110, 25, 255)
ORANGE_BORDER = (165, 80, 15, 255)
ORANGE_LINE = (180, 90, 20, 255)


def trim_with_pad(img, pad=2):
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    new_w = cropped.width + pad * 2
    new_h = cropped.height + pad * 2
    res = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
    res.paste(cropped, (pad, pad))
    return res


def generate_unit(scale=4):
    """Simple blue square with clean outline."""
    size = 48 * scale
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    pad = 3 * scale
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=4 * scale,
        fill=BLUE_FILL,
        outline=BLUE_BORDER,
        width=2 * scale
    )
    # Subtle inner highlight
    draw.line(
        [pad + 3 * scale, pad + 3 * scale, size - pad - 3 * scale, pad + 3 * scale],
        fill=BLUE_INNER,
        width=1 * scale
    )
    
    downscaled = img.resize((48, 48), Image.Resampling.LANCZOS)
    return trim_with_pad(downscaled, pad=2)


def generate_ten(scale=4):
    """Vertical bar made of 10 stacked unit squares."""
    unit_w = 48
    unit_h = 48
    w = unit_w * scale
    h = unit_h * 10 * scale
    
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = 3 * scale
    
    # Outer rectangle
    draw.rounded_rectangle(
        [pad, pad, w - pad, h - pad],
        radius=4 * scale,
        fill=RED_FILL,
        outline=RED_BORDER,
        width=2 * scale
    )
    
    # Grid lines separating the 10 units
    for i in range(1, 10):
        y = pad + i * (h - 2 * pad) / 10.0
        draw.line([pad, y, w - pad, y], fill=RED_LINE, width=2 * scale)
        draw.line([pad + 2 * scale, y + 1 * scale, w - pad - 2 * scale, y + 1 * scale], fill=RED_HIGHLIGHT, width=1 * scale)

    downscaled = img.resize((48, 480), Image.Resampling.LANCZOS)
    return trim_with_pad(downscaled, pad=2)


def generate_hundred(scale=4):
    """Square plate of 10x10 units (10 vertical bars of 10 units)."""
    size = 240 * scale
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = 4 * scale
    
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=6 * scale,
        fill=GREEN_FILL,
        outline=GREEN_BORDER,
        width=3 * scale
    )
    
    step = (size - 2 * pad) / 10.0
    for i in range(1, 10):
        x = pad + i * step
        draw.line([x, pad, x, size - pad], fill=GREEN_LINE, width=2 * scale)
    for i in range(1, 10):
        y = pad + i * step
        draw.line([pad, y, size - pad, y], fill=GREEN_LINE, width=2 * scale)

    downscaled = img.resize((240, 240), Image.Resampling.LANCZOS)
    return trim_with_pad(downscaled, pad=2)


def generate_thousand_cube(scale=4):
    """
    3D Cube view of 10 stacked hundred plates.
    """
    width = 320 * scale
    height = 320 * scale
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Let's position the cube compactly
    fw = 160 * scale
    fh = 160 * scale
    dx = 9 * scale
    dy = 6 * scale
    total_depth_x = 10 * dx
    total_depth_y = 10 * dy
    
    ox = 20 * scale
    oy = 20 * scale + total_depth_y
    
    # 1. Top Face
    top_poly = [
        (ox, oy),
        (ox + fw, oy),
        (ox + fw + total_depth_x, oy - total_depth_y),
        (ox + total_depth_x, oy - total_depth_y)
    ]
    draw.polygon(top_poly, fill=ORANGE_TOP)
    
    for i in range(1, 10):
        ratio = i / 10.0
        p1 = (ox + fw * ratio, oy)
        p2 = (ox + fw * ratio + total_depth_x, oy - total_depth_y)
        draw.line([p1, p2], fill=ORANGE_LINE, width=1 * scale)
    
    for i in range(1, 10):
        ratio = i / 10.0
        sx = total_depth_x * ratio
        sy = total_depth_y * ratio
        p1 = (ox + sx, oy - sy)
        p2 = (ox + fw + sx, oy - sy)
        draw.line([p1, p2], fill=ORANGE_BORDER, width=2 * scale)
        
    # 2. Right Face
    right_poly = [
        (ox + fw, oy),
        (ox + fw + total_depth_x, oy - total_depth_y),
        (ox + fw + total_depth_x, oy + fh - total_depth_y),
        (ox + fw, oy + fh)
    ]
    draw.polygon(right_poly, fill=ORANGE_RIGHT)
    
    for i in range(1, 10):
        ratio = i / 10.0
        p1 = (ox + fw, oy + fh * ratio)
        p2 = (ox + fw + total_depth_x, oy + fh * ratio - total_depth_y)
        draw.line([p1, p2], fill=ORANGE_LINE, width=1 * scale)
        
    for i in range(1, 10):
        ratio = i / 10.0
        sx = total_depth_x * ratio
        sy = total_depth_y * ratio
        p1 = (ox + fw + sx, oy - sy)
        p2 = (ox + fw + sx, oy + fh - sy)
        draw.line([p1, p2], fill=ORANGE_BORDER, width=2 * scale)

    # 3. Front Face
    front_poly = [
        (ox, oy),
        (ox + fw, oy),
        (ox + fw, oy + fh),
        (ox, oy + fh)
    ]
    draw.polygon(front_poly, fill=ORANGE_LEFT)
    
    for i in range(1, 10):
        ratio = i / 10.0
        draw.line([(ox + fw * ratio, oy), (ox + fw * ratio, oy + fh)], fill=ORANGE_LINE, width=1 * scale)
        draw.line([(ox, oy + fh * ratio), (ox + fw, oy + fh * ratio)], fill=ORANGE_LINE, width=1 * scale)

    # Contours
    draw.line([(ox, oy), (ox + fw, oy)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw, oy), (ox + fw, oy + fh)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw, oy + fh), (ox, oy + fh)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox, oy + fh), (ox, oy)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw, oy), (ox + fw + total_depth_x, oy - total_depth_y)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw + total_depth_x, oy - total_depth_y), (ox + total_depth_x, oy - total_depth_y)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + total_depth_x, oy - total_depth_y), (ox, oy)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw + total_depth_x, oy - total_depth_y), (ox + fw + total_depth_x, oy + fh - total_depth_y)], fill=ORANGE_BORDER, width=3 * scale)
    draw.line([(ox + fw + total_depth_x, oy + fh - total_depth_y), (ox + fw, oy + fh)], fill=ORANGE_BORDER, width=3 * scale)

    downscaled = img.resize((320, 320), Image.Resampling.LANCZOS)
    return trim_with_pad(downscaled, pad=2)


if __name__ == "__main__":
    u = generate_unit()
    u.save("h:/ProjetsCODE/ActivitesClasse/frontend/public/images/base10_unite.png")
    print(f"Generated base10_unite.png: {u.size}")
    
    t = generate_ten()
    t.save("h:/ProjetsCODE/ActivitesClasse/frontend/public/images/base10_dizaine.png")
    print(f"Generated base10_dizaine.png: {t.size}")
    
    h = generate_hundred()
    h.save("h:/ProjetsCODE/ActivitesClasse/frontend/public/images/base10_centaine.png")
    print(f"Generated base10_centaine.png: {h.size}")
    
    m = generate_thousand_cube()
    m.save("h:/ProjetsCODE/ActivitesClasse/frontend/public/images/base10_millier.png")
    print(f"Generated base10_millier.png: {m.size}")
