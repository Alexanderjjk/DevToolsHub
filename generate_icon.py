
import argparse
import os
import sys
import math

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow no esta instalado. Ejecuta: pip install Pillow")
    sys.exit(1)


BG_DARK    = (30, 30, 46)       # #1e1e2e  base
BG_MID     = (49, 50, 68)       # #313244  surface0
ACCENT     = (137, 180, 250)    # #89b4fa  blue
ACCENT2    = (203, 166, 247)    # #cba6f7  mauve
ACCENT3    = (166, 227, 161)    # #a6e3a1  green
WHITE      = (205, 214, 244)    # #cdd6f4  text
SUBTEXT    = (166, 173, 200)    # #a6adc8  subtext0
OVERLAY0   = (69, 71, 90)       # #45475a  overlay0


def _draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    r = radius
    # Four corners
    draw.ellipse([x1, y1, x1 + 2*r, y1 + 2*r], fill=fill, outline=outline, width=width)
    draw.ellipse([x2 - 2*r, y1, x2, y1 + 2*r], fill=fill, outline=outline, width=width)
    draw.ellipse([x1, y2 - 2*r, x1 + 2*r, y2], fill=fill, outline=outline, width=width)
    draw.ellipse([x2 - 2*r, y2 - 2*r, x2, y2], fill=fill, outline=outline, width=width)
    # Fill center
    if fill:
        draw.rectangle([x1 + r, y1, x2 - r, y2], fill=fill)
        draw.rectangle([x1, y1 + r, x2, y2 - r], fill=fill)


def create_devtools_icon(size=512):
    """Create the DevTools icon at the given size (square)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(size * 0.06)
    r = int(size * 0.14)

    # ── Background rounded rectangle ──
    _draw_rounded_rect(
        draw,
        (margin, margin, size - margin, size - margin),
        radius=r,
        fill=BG_DARK + (255,),
    )

    # ── Subtle inner border ──
    _draw_rounded_rect(
        draw,
        (margin + 2, margin + 2, size - margin - 2, size - margin - 2),
        radius=r,
        outline=OVERLAY0 + (180,),
        width=2,
    )

    cx, cy = size // 2, size // 2

    # ── Gear shape (left side) ──
    gear_cx = int(size * 0.35)
    gear_cy = cy
    gear_r = int(size * 0.16)
    teeth = 8
    tooth_h = int(size * 0.04)
    tooth_w = math.pi / teeth * 0.5

    gear_points = []
    for i in range(teeth * 2):
        angle = (i * math.pi) / teeth - math.pi / 2
        if i % 2 == 0:
            # tooth outer
            ri = gear_r + tooth_h
            gear_points.append((
                gear_cx + ri * math.cos(angle - tooth_w),
                gear_cy + ri * math.sin(angle - tooth_w),
            ))
            gear_points.append((
                gear_cx + ri * math.cos(angle + tooth_w),
                gear_cy + ri * math.sin(angle + tooth_w),
            ))
        else:
            # valley
            gear_points.append((
                gear_cx + gear_r * math.cos(angle - tooth_w * 1.5),
                gear_cy + gear_r * math.sin(angle - tooth_w * 1.5),
            ))
            gear_points.append((
                gear_cx + gear_r * math.cos(angle + tooth_w * 1.5),
                gear_cy + gear_r * math.sin(angle + tooth_w * 1.5),
            ))

    draw.polygon(gear_points, fill=ACCENT + (255,))

    # Gear center hole
    hole_r = int(gear_r * 0.35)
    draw.ellipse(
        [gear_cx - hole_r, gear_cy - hole_r, gear_cx + hole_r, gear_cy + hole_r],
        fill=BG_DARK + (255,),
    )

    # ── Code brackets </>  (right side) ──
    bracket_x = int(size * 0.62)
    bracket_y = cy
    bracket_h = int(size * 0.20)
    bracket_w = int(size * 0.08)
    lw = max(3, int(size * 0.025))

    # <
    draw.line(
        [(bracket_x, bracket_y - bracket_h), (bracket_x - bracket_w, bracket_y)],
        fill=ACCENT2 + (255,), width=lw,
    )
    draw.line(
        [(bracket_x, bracket_y + bracket_h), (bracket_x - bracket_w, bracket_y)],
        fill=ACCENT2 + (255,), width=lw,
    )

    # /
    slash_x = int(size * 0.50)
    draw.line(
        [(slash_x - int(size*0.04), bracket_y - int(bracket_h*0.7)),
         (slash_x + int(size*0.04), bracket_y + int(bracket_h*0.7))],
        fill=ACCENT3 + (255,), width=max(2, int(size * 0.015)),
    )

    # >
    draw.line(
        [(bracket_x + bracket_w + int(size*0.08), bracket_y - bracket_h),
         (bracket_x + int(size*0.08), bracket_y)],
        fill=ACCENT2 + (255,), width=lw,
    )
    draw.line(
        [(bracket_x + bracket_w + int(size*0.08), bracket_y + bracket_h),
         (bracket_x + int(size*0.08), bracket_y)],
        fill=ACCENT2 + (255,), width=lw,
    )

    # ── "DT" text (bottom-right corner) ──
    try:
        font_size = max(10, int(size * 0.09))
        # Try to use a system font
        font_paths = []
        if sys.platform == 'win32':
            font_paths = [
                'C:/Windows/Fonts/consola.ttf',
                'C:/Windows/Fonts/arialbd.ttf',
                'C:/Windows/Fonts/arial.ttf',
            ]
        elif sys.platform == 'darwin':
            font_paths = [
                '/System/Library/Fonts/Menlo.ttc',
                '/Library/Fonts/Arial Bold.ttf',
            ]
        else:
            font_paths = [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ]

        font = None
        for fp in font_paths:
            if os.path.exists(fp):
                font = ImageFont.truetype(fp, font_size)
                break
        if font is None:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    text = "DT"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = size - margin - int(size * 0.12) - tw // 2
    ty = size - margin - int(size * 0.12) - th // 2
    draw.text((tx, ty), text, fill=SUBTEXT + (200,), font=font)

    return img


def save_ico(img, output_path, sizes=None):
    """Save image as multi-resolution ICO file."""
    if sizes is None:
        sizes = [16, 24, 32, 48, 64, 128, 256]

    print(f"[Icon] Generando ICO con tamanos: {sizes}")
    resized = []
    for s in sizes:
        resized.append(img.resize((s, s), Image.Resampling.LANCZOS))

    resized[0].save(
        output_path,
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=resized[1:],
    )
    file_size = os.path.getsize(output_path)
    print(f"[Icon] Guardado: {output_path} ({file_size:,} bytes)")


def main():
    parser = argparse.ArgumentParser(description='Generar icono ICO para DevTools')
    parser.add_argument(
        '--output', '-o',
        default=None,
        help='Ruta de salida (default: frontend/icon.ico)',
    )
    parser.add_argument(
        '--size', '-s',
        type=int,
        default=512,
        help='Tamano base del icono (default: 512)',
    )
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    output = args.output or os.path.join(base_dir, 'frontend', 'icon.ico')

    os.makedirs(os.path.dirname(output), exist_ok=True)

    print(f"[Icon] Creando icono {args.size}x{args.size} ...")
    img = create_devtools_icon(size=args.size)

    # Also save a PNG preview
    preview_path = output.replace('.ico', '_preview.png')
    img.save(preview_path, 'PNG')
    print(f"[Icon] Preview PNG: {preview_path}")

    save_ico(img, output)
    print(f"\nListo! El icono esta en: {output}")
    print(f"Usa este archivo al compilar con PyInstaller: --icon \"{output}\"")


if __name__ == '__main__':
    main()
