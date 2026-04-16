"""
Icon Manager v2 — Extraccion y gestion de iconos para launchers.

Estrategia:
  1. Busca icono en cache (backend/data/icons/{hash}.png)
  2. Extrae del .exe usando ExtractIconExW (Win32 API)
  3. Guarda el PNG en disco
  4. Retorna base64 para el frontend
  5. Si todo falla, genera icono de texto con la primera letra

Los iconos se guardan como archivos PNG en backend/data/icons/
para que puedas inspeccionarlos y reutilizarlos.
"""
import os
import sys
import base64
import hashlib
import io

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False
    print("[IconManager] WARNING: Pillow no esta instalado.")
    print("[IconManager] Instala con: pip install Pillow")

# Directorio donde se guardan los iconos extraidos
ICONS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'data', 'icons'
)

# Colores por defecto para iconos de texto
DEFAULT_ICON_COLORS = [
    '#7254cc', '#e74c3c', '#e67e22', '#f1c40f',
    '#2ecc71', '#3498db', '#9b59b6', '#1abc9c',
]

ICON_SIZE = 64


class IconManager:
    """Gestiona la extraccion y creacion de iconos para los launchers."""

    def __init__(self):
        os.makedirs(ICONS_DIR, exist_ok=True)
        print(f"[IconManager] Iconos cache: {ICONS_DIR}")

    # ------------------------------------------------------------------
    # API publica: extraer icono de un .exe
    # ------------------------------------------------------------------

    def extract_from_exe(self, exe_path: str) -> str:
        """
        Extrae el icono de un .exe y lo retorna como base64 PNG.
        
        Flujo:
          1. Verifica cache en disco
          2. Extrae con Win32 API (ExtractIconExW)
          3. Guarda PNG en backend/data/icons/
          4. Lee del archivo y retorna base64
          5. Si falla todo, genera icono de texto
        """
        if not os.path.isfile(exe_path):
            print(f"[IconManager] Archivo no encontrado: {exe_path}")
            return ''

        if not HAS_PILLOW:
            print(f"[IconManager] Pillow no disponible")
            return ''

        # 1. Buscar en cache
        icon_hash = self._hash_path(exe_path)
        cached_file = os.path.join(ICONS_DIR, f"{icon_hash}.png")

        if os.path.isfile(cached_file):
            try:
                b64 = self._file_to_b64(cached_file)
                if b64:
                    return b64
            except Exception:
                pass

        # 2. Extraer con Win32 API
        if sys.platform == 'win32':
            img = self._extract_win32(exe_path)
            if img:
                # Guardar en cache
                try:
                    img.save(cached_file, 'PNG')
                    print(f"[IconManager] Icono extraido y guardado: {cached_file}")
                except Exception as e:
                    print(f"[IconManager] Error guardando cache: {e}")
                # Retornar base64
                return self._img_to_b64(img)

        # 3. Si Win32 fallo, no hay mas que hacer para .exe
        print(f"[IconManager] No se pudo extraer icono de: {exe_path}")
        return ''

    def extract_from_image_file(self, image_path: str) -> str:
        """Extrae un icono desde un archivo de imagen (.png, .jpg, .ico, etc)."""
        if not HAS_PILLOW or not os.path.isfile(image_path):
            return ''
        try:
            img = Image.open(image_path)
            if hasattr(img, 'n_frames') and img.n_frames > 1:
                best = 0
                best_size = 0
                for i in range(img.n_frames):
                    img.seek(i)
                    s = img.size[0] * img.size[1]
                    if s > best_size:
                        best_size = s
                        best = i
                img.seek(best)
            img = img.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).convert('RGBA')
            return self._img_to_b64(img)
        except Exception as e:
            print(f"[IconManager] Error abriendo imagen: {e}")
            return ''

    # ------------------------------------------------------------------
    # Cache en disco
    # ------------------------------------------------------------------

    def _hash_path(self, path: str) -> str:
        """Hash MD5 de la ruta para nombrar el archivo cache."""
        return hashlib.md5(path.encode('utf-8')).hexdigest()

    def _file_to_b64(self, filepath: str) -> str:
        """Lee un PNG del disco y retorna base64."""
        with open(filepath, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def _img_to_b64(self, img) -> str:
        """Convierte PIL Image a base64 PNG string."""
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    def _save_icon(self, img, exe_path: str) -> str:
        """Guarda PIL Image como PNG en cache y retorna base64."""
        icon_hash = self._hash_path(exe_path)
        filepath = os.path.join(ICONS_DIR, f"{icon_hash}.png")
        img.save(filepath, 'PNG')
        return self._img_to_b64(img)

    # ------------------------------------------------------------------
    # Extraccion via Win32 API (ctypes)
    # ------------------------------------------------------------------

    def _extract_win32(self, exe_path: str):
        """
        Extrae icono de un .exe usando ExtractIconExW + GDI.
        
        ExtractIconExW es la API correcta para extraer iconos de archivos PE.
        Es mas simple y confiable que SHGetFileInfoW.
        
        Retorna: PIL Image (64x64 RGBA) o None
        """
        import ctypes
        from ctypes import (
            wintypes, Structure, byref, sizeof,
            c_int, c_uint, c_uint32, c_int32, c_uint16, c_void_p,
        )

        # --- Estructuras Win32 ---

        class ICONINFO(Structure):
            _fields_ = [
                ("fIcon", wintypes.BOOL),
                ("xHotspot", wintypes.DWORD),
                ("yHotspot", wintypes.DWORD),
                ("hbmMask", wintypes.HBITMAP),
                ("hbmColor", wintypes.HBITMAP),
            ]

        class BITMAP(Structure):
            _fields_ = [
                ("bmType", c_int),
                ("bmWidth", c_int),
                ("bmHeight", c_int),
                ("bmWidthBytes", c_int),
                ("bmPlanes", c_uint16),
                ("bmBitsPixel", c_uint16),
                ("bmBits", c_void_p),
            ]

        class BITMAPINFOHEADER(Structure):
            _fields_ = [
                ("biSize", c_uint32),
                ("biWidth", c_int32),
                ("biHeight", c_int32),
                ("biPlanes", c_uint16),
                ("biBitCount", c_uint16),
                ("biCompression", c_uint32),
                ("biSizeImage", c_uint32),
                ("biXPelsPerMeter", c_int32),
                ("biYPelsPerMeter", c_int32),
                ("biClrUsed", c_uint32),
                ("biClrImportant", c_uint32),
            ]

        try:
            # --- Fix: Set argtypes for 64-bit handle compatibility ---
            # Without argtypes, ctypes defaults to c_int (32-bit), causing
            # OverflowError when handles exceed 2^31 on 64-bit Windows.
            ctypes.windll.gdi32.GetObjectW.argtypes = [wintypes.HGDIOBJ, ctypes.c_int, ctypes.c_void_p]
            ctypes.windll.gdi32.GetObjectW.restype = ctypes.c_int
            ctypes.windll.gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
            ctypes.windll.gdi32.DeleteObject.restype = wintypes.BOOL
            ctypes.windll.user32.DestroyIcon.argtypes = [wintypes.HICON]
            ctypes.windll.user32.DestroyIcon.restype = wintypes.BOOL
            ctypes.windll.user32.GetIconInfo.argtypes = [wintypes.HICON, ctypes.POINTER(ICONINFO)]
            ctypes.windll.user32.GetIconInfo.restype = wintypes.BOOL
            ctypes.windll.gdi32.GetDIBits.argtypes = [
                wintypes.HDC, wintypes.HBITMAP, ctypes.c_uint, ctypes.c_uint,
                ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint,
            ]
            ctypes.windll.gdi32.GetDIBits.restype = ctypes.c_int

            # Paso 1: Extraer el primer icono grande del .exe
            # ExtractIconExW(lpszFile, nIconIndex, phiconLarge, phiconSmall, nIcons)
            hicons = (wintypes.HICON * 1)()
            n_extracted = ctypes.windll.shell32.ExtractIconExW(
                exe_path, 0, hicons, None, 1
            )

            if n_extracted == 0 or not hicons[0]:
                print(f"[IconManager] ExtractIconExW: No se encontraron iconos en {exe_path}")
                return None

            hicon = hicons[0]

            try:
                # Paso 2: Obtener handles de bitmaps (color + mascara)
                ii = ICONINFO()
                if not ctypes.windll.user32.GetIconInfo(hicon, byref(ii)):
                    print(f"[IconManager] GetIconInfo fallo para {exe_path}")
                    return None

                if not ii.hbmColor:
                    print(f"[IconManager] El icono no tiene bitmap de color")
                    if ii.hbmMask:
                        ctypes.windll.gdi32.DeleteObject(ii.hbmMask)
                    return None

                try:
                    # Paso 3: Obtener dimensiones del bitmap
                    bmp = BITMAP()
                    ctypes.windll.gdi32.GetObjectW(
                        ii.hbmColor, sizeof(bmp), byref(bmp)
                    )

                    width = bmp.bmWidth
                    height = bmp.bmHeight

                    if width == 0 or height == 0:
                        print(f"[IconManager] Dimensiones invalidas: {width}x{height}")
                        return None

                    print(f"[IconManager] Bitmap de icono: {width}x{height}, {bmp.bmBitsPixel}bpp")

                    # Paso 4: Copiar pixeles del bitmap a un buffer
                    # BITMAPINFOHEADER con biHeight negativo = top-down (correcto para PIL)
                    bi = BITMAPINFOHEADER()
                    bi.biSize = sizeof(BITMAPINFOHEADER)
                    bi.biWidth = width
                    bi.biHeight = -height   # Negativo = top-down
                    bi.biPlanes = 1
                    bi.biBitCount = 32
                    bi.biCompression = 0    # BI_RGB

                    buf_size = width * height * 4
                    buf = (ctypes.c_char * buf_size)()

                    hdc = ctypes.windll.user32.GetDC(None)
                    lines_read = ctypes.windll.gdi32.GetDIBits(
                        hdc, ii.hbmColor, 0, height, buf, byref(bi), 0
                    )
                    ctypes.windll.user32.ReleaseDC(None, hdc)

                    if lines_read == 0:
                        print(f"[IconManager] GetDIBits fallo - no se pudieron leer los pixeles")
                        return None

                    # Paso 5: Convertir buffer BGRA a PIL Image RGBA
                    img = Image.frombuffer(
                        "RGBA", (width, height),
                        bytes(buf), "raw", "BGRA", 0, 1
                    )

                    # Redimensionar a 64x64
                    if width != ICON_SIZE or height != ICON_SIZE:
                        img = img.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)

                    return img

                finally:
                    # Limpiar bitmaps de GDI
                    if ii.hbmColor:
                        try:
                            ctypes.windll.gdi32.DeleteObject(ii.hbmColor)
                        except Exception:
                            pass
                    if ii.hbmMask:
                        try:
                            ctypes.windll.gdi32.DeleteObject(ii.hbmMask)
                        except Exception:
                            pass

            finally:
                # Destruir el icono
                try:
                    ctypes.windll.user32.DestroyIcon(hicon)
                except Exception:
                    pass

        except Exception as e:
            print(f"[IconManager] Error en extraccion Win32: {e}")
            import traceback
            traceback.print_exc()
            return None

    # ------------------------------------------------------------------
    # Icono de texto (fallback con letra + color)
    # ------------------------------------------------------------------

    def generate_text_icon(self, letter: str, color: str = '#7254cc') -> str:
        """Genera un icono con una letra centrada sobre fondo de color."""
        if not HAS_PILLOW:
            return ''

        try:
            color = color.lstrip('#')
            if len(color) != 6:
                color = '7254cc'

            r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)

            img = Image.new('RGBA', (ICON_SIZE, ICON_SIZE), (r, g, b, 255))
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(img)

            font = None
            font_paths = [
                'C:/Windows/Fonts/arialbd.ttf',
                'C:/Windows/Fonts/arial.ttf',
                'C:/Windows/Fonts/segoeui.ttf',
                'C:/Windows/Fonts/segoeuib.ttf',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
            ]
            for fp in font_paths:
                if os.path.exists(fp):
                    try:
                        font = ImageFont.truetype(fp, 36)
                        break
                    except Exception:
                        continue

            if not font:
                try:
                    font = ImageFont.load_default()
                except Exception:
                    font = None

            letter = (letter or '?')[0].upper()

            if font:
                bbox = draw.textbbox((0, 0), letter, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                x = (ICON_SIZE - tw) / 2
                y = (ICON_SIZE - th) / 2 - 2
                draw.text((x, y), letter, fill=(255, 255, 255, 255), font=font)
            else:
                draw.text((20, 14), letter, fill=(255, 255, 255, 255))

            return self._img_to_b64(img)

        except Exception as e:
            print(f"[IconManager] Error generando icono de texto: {e}")
            return ''

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    def get_cached_icon_path(self, exe_path: str) -> str:
        """Retorna la ruta al archivo PNG cacheado, o '' si no existe."""
        icon_hash = self._hash_path(exe_path)
        filepath = os.path.join(ICONS_DIR, f"{icon_hash}.png")
        if os.path.isfile(filepath):
            return filepath
        return ''

    def clear_cache(self):
        """Elimina todos los iconos en cache."""
        import shutil
        if os.path.isdir(ICONS_DIR):
            shutil.rmtree(ICONS_DIR)
            os.makedirs(ICONS_DIR, exist_ok=True)
            print(f"[IconManager] Cache limpiado: {ICONS_DIR}")


# Instancia global
icon_manager = IconManager()
