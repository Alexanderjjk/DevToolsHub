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
            # Verificar que es una imagen (PNG, ICO, GIF, JPEG magic bytes)
            if data[:4] not in (
                b'\x89PNG',       # PNG
                b'\x00\x00\x01\x00',  # ICO
                b'GIF8',          # GIF
                b'\xff\xd8\xff',  # JPEG
            ):
                return None
            return data
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
        if len(data) > 100:  # descartar imagenes triviales
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
        b64 = _bytes_to_b64(data)
        print(f"[Favicon] Direct OK para {domain} ({len(data)} bytes)")
        return {
            "success": True,
            "icon_path": f"data:image/x-icon;base64,{b64}",
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
