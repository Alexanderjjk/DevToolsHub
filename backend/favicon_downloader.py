"""
Favicon Downloader — Descarga favicons con 2 metodos de fallback.

Metodo 1: Google Favicon Service (rapido, funciona para la mayoria de sitios)
  URL: https://www.google.com/s2/favicons?domain={domain}&sz=64

Metodo 2: Descarga directa de /favicon.ico del sitio
  URL: https://{domain}/favicon.ico

Si ambos fallan, retorna string vacio (el frontend usara un icono local).
"""
import ssl
import urllib.request
import urllib.parse
import base64
import sys
import os

# Timeout para cada intento de descarga (segundos)
_TIMEOUT = 8

# Tamano maximo del favicon descargado (bytes)
_MAX_SIZE = 512 * 1024  # 512 KB


def _url_to_domain(url: str) -> str:
    """Extrae el dominio de una URL. Retorna '' si no se puede parsear."""
    try:
        if not url or '://' not in url:
            return ''
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc or ''
    except Exception:
        return ''


def _download_bytes(url: str) -> bytes | None:
    """Descarga bytes de una URL con SSL verificado. Retorna None en error."""
    if not url:
        return None
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT, context=ctx) as resp:
            data = resp.read()
            if len(data) > _MAX_SIZE or len(data) < 4:
                return None
            # Verificar que es una imagen (PNG, ICO, GIF, JPEG, SVG, WebP, BMP)
            # Cada formato se valida con su longitud correcta de magic bytes
            valid_prefix = (
                data[:4] == b'\x89PNG' or           # PNG
                data[:4] == b'\x00\x00\x01\x00' or  # ICO
                data[:4] == b'GIF8' or               # GIF
                data[:3] == b'\xff\xd8\xff' or       # JPEG (3 bytes)
                data[:4] == b'RIFF' or               # WebP (RIFF header)
                data[:2] == b'BM' or                 # BMP (2 bytes)
                data[:5] == b'<?xml' or              # SVG (XML prefix)
                data[:4] == b'<svg' or               # SVG (direct)
                b'<svg' in data[:200]                # SVG (with whitespace)
            )
            if not valid_prefix:
                return None
            return data
    except Exception:
        return None


def _detect_mime_type(data: bytes) -> str:
    """Detecta el tipo MIME de una imagen a partir de sus bytes."""
    if data[:4] == b'\x89PNG':
        return 'image/png'
    elif data[:4] == b'\x00\x00\x01\x00':
        return 'image/x-icon'
    elif data[:4] == b'GIF8':
        return 'image/gif'
    elif data[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    elif data[:4] == b'RIFF':
        return 'image/webp'
    elif b'<svg' in data[:200]:
        return 'image/svg+xml'
    elif data[:2] == b'BM':
        return 'image/bmp'
    return 'image/png'  # fallback


def _convert_ico_to_png(data: bytes) -> bytes | None:
    """Convierte datos ICO a PNG usando Pillow si esta disponible.
    Esto asegura compatibilidad con WebView2 que no siempre renderiza ICO data URIs."""
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(data))
        # Seleccionar el frame mas grande si es multi-page ICO
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
        img = img.convert('RGBA')
        if img.size[0] != 64 or img.size[1] != 64:
            img = img.resize((64, 64), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()
    except Exception:
        return None


def _bytes_to_b64(data: bytes) -> str:
    """Convierte bytes a base64 string."""
    return base64.b64encode(data).decode('utf-8')


def download_favicon(url: str) -> dict:
    """
    Descarga el favicon de una URL usando 2 metodos.

    Returns:
        {
            "success": True/False,
            "icon_path": "data:image/png;base64,..." or "",
            "method": "google" | "direct" | "none",
        }
    """
    domain = _url_to_domain(url)
    if not domain:
        return {"success": False, "icon_path": "", "method": "none"}

    # --- Metodo 1: Google Favicon Service ---
    google_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=64"
    data = _download_bytes(google_url)
    if data:
        b64 = _bytes_to_b64(data)
        # Google retorna PNG, pero a veces un pixel transparente de 1x1
        if len(data) > 50:  # descartar imagenes triviales (reducido de 100)
            print(f"[Favicon] Google OK para {domain} ({len(data)} bytes)")
            return {
                "success": True,
                "icon_path": f"data:image/png;base64,{b64}",
                "method": "google",
            }

    # --- Metodo 2: Direct /favicon.ico ---
    direct_url = f"https://{domain}/favicon.ico"
    data = _download_bytes(direct_url)
    if data:
        mime = _detect_mime_type(data)
        # Si es ICO, convertir a PNG para compatibilidad con WebView2
        if mime == 'image/x-icon':
            png_data = _convert_ico_to_png(data)
            if png_data:
                b64 = _bytes_to_b64(png_data)
                print(f"[Favicon] Direct OK (ICO->PNG) para {domain} ({len(png_data)} bytes)")
                return {
                    "success": True,
                    "icon_path": f"data:image/png;base64,{b64}",
                    "method": "direct",
                }
        # Para otros formatos, usar tal cual
        b64 = _bytes_to_b64(data)
        print(f"[Favicon] Direct OK para {domain} ({len(data)} bytes, {mime})")
        return {
            "success": True,
            "icon_path": f"data:{mime};base64,{b64}",
            "method": "direct",
        }

    # --- Ambos fallaron ---
    print(f"[Favicon] No se pudo obtener favicon para {domain}")
    return {"success": False, "icon_path": "", "method": "none"}


def download_favicon_base64(url: str) -> str:
    """Version simple: retorna base64 data URI o ''."""
    result = download_favicon(url)
    return result.get("icon_path", "")


def batch_download_favicons(urls: list) -> dict:
    """
    Descarga favicons para multiples URLs en paralelo (threading).

    Args:
        urls: Lista de dicts [{"url": "...", "id": "..."}, ...]

    Returns:
        Dict de {id: "data:image/...;base64,..." | ""}
    """
    import concurrent.futures

    results = {}

    def _fetch_one(item):
        uid = item.get("id", "")
        url = item.get("url", "")
        b64 = download_favicon_base64(url)
        return uid, b64

    # Limitar concurrencia a 5 para no saturar
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_fetch_one, item): item for item in urls}
        for future in concurrent.futures.as_completed(futures, timeout=30):
            try:
                uid, b64 = future.result()
                if uid:
                    results[uid] = b64
            except Exception:
                pass

    return results
