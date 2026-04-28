"""
Favicon Manager — Extraccion automatica de favicons para docs.

Estrategia:
  1. Busca en cache (backend/data/favicons/{domain}.png)
  2. Intenta descargar /favicon.ico del sitio
  3. Parsea HTML buscando <link rel="icon" ...> para encontrar el mejor favicon
  4. Guarda PNG redimensionado en cache
  5. Retorna base64 para el frontend
  6. Si todo falla, retorna '' (el frontend usa emoji fallback)
"""
import os
import sys
import base64
import hashlib
import io
import re
import urllib.request
import urllib.error
import ssl
from urllib.parse import urlparse, urljoin

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False
    print("[FaviconManager] WARNING: Pillow no esta instalado.")

# Directorio donde se guardan los favicons
FAVICONS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'data', 'favicons'
)

ICON_SIZE = 48

# Timeout para requests (segundos)
REQUEST_TIMEOUT = 8

# SSL context que acepta certificados auto-firmados (comun en dev)
_ssl_ctx = None


def _get_ssl_context():
    global _ssl_ctx
    if _ssl_ctx is None:
        _ssl_ctx = ssl.create_default_context()
        # Nota: Se mantiene check_hostname=False y CERT_NONE porque muchos
        # sitios de desarrollo y documentacion usan certificados auto-firmados.
        # En un entorno de produccion, esto deberia ser mas restrictivo.
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = ssl.CERT_NONE
    return _ssl_ctx


class FaviconManager:
    """Gestiona la extraccion y cacheo de favicons para docs."""

    def __init__(self):
        os.makedirs(FAVICONS_DIR, exist_ok=True)
        print(f"[FaviconManager] Cache: {FAVICONS_DIR}")

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    def get_favicon(self, url: str) -> str:
        """
        Extrae el favicon de una URL y lo retorna como base64 PNG.
        
        Args:
            url: URL completa del sitio (ej: 'https://docs.unity3d.com/')
        
        Returns:
            base64 PNG string o '' si falla
        """
        if not url:
            return ''

        if not HAS_PILLOW:
            return ''

        parsed = urlparse(url)
        if not parsed.hostname:
            return ''

        domain = parsed.hostname
        scheme = parsed.scheme or 'https'
        base_url = f"{scheme}://{domain}"

        # 1. Buscar en cache
        cache_key = self._cache_key(domain)
        cached_file = os.path.join(FAVICONS_DIR, f"{cache_key}.png")
        if os.path.isfile(cached_file):
            try:
                return self._file_to_b64(cached_file)
            except Exception:
                pass

        # 2. Intentar obtener favicon
        img = None
        favicon_url = None

        # Intento 1: /favicon.ico directo
        try:
            favicon_url = f"{base_url}/favicon.ico"
            img = self._download_image(favicon_url)
            if img:
                print(f"[FaviconManager] Favicon.ico descargado: {domain}")
        except Exception:
            pass

        # Intento 2: Parsear HTML para encontrar <link rel="icon">
        if not img:
            try:
                favicon_url = self._find_favicon_from_html(base_url, url)
                if favicon_url:
                    img = self._download_image(favicon_url)
                    if img:
                        print(f"[FaviconManager] Favicon HTML descargado: {domain} -> {favicon_url}")
            except Exception:
                pass

        # Intento 3: Google Favicon API como ultimo recurso (offline fallback en img tag)
        if not img:
            # No pudimos descargar, no guardamos cache
            print(f"[FaviconManager] No se pudo extraer favicon de: {domain}")
            return ''

        # Redimensionar y guardar en cache
        if img:
            try:
                img = img.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).convert('RGBA')
                img.save(cached_file, 'PNG')
                print(f"[FaviconManager] Favicon cacheado: {cached_file}")
                return self._img_to_b64(img)
            except Exception as e:
                print(f"[FaviconManager] Error guardando cache: {e}")
                return self._img_to_b64(img)

        return ''

    def get_favicon_url(self, url: str) -> str:
        """
        Retorna la URL del favicon (para img src) o '' si no se puede.
        Primero intenta la cache local como data URI, sino retorna
        el favicon.ico directo del sitio.
        """
        b64 = self.get_favicon(url)
        if b64:
            return f"data:image/png;base64,{b64}"
        # Fallback a favicon.ico directo del sitio
        parsed = urlparse(url)
        if parsed.hostname:
            scheme = parsed.scheme or 'https'
            return f"{scheme}://{parsed.hostname}/favicon.ico"
        return ''

    # ------------------------------------------------------------------
    # Descarga de imagen
    # ------------------------------------------------------------------

    def _download_image(self, image_url: str):
        """Descarga una imagen desde una URL y retorna PIL Image."""
        if not image_url:
            return None

        ctx = _get_ssl_context()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }

        req = urllib.request.Request(image_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=ctx) as response:
                data = response.read()
                if not data or len(data) < 16:
                    return None

                # Intentar abrir con PIL
                buf = io.BytesIO(data)
                img = Image.open(buf)

                # Si es multipage (ICO con multiples tamanios), seleccionar la mas grande
                if hasattr(img, 'n_frames') and img.n_frames > 1:
                    best = 0
                    best_size = 0
                    for i in range(img.n_frames):
                        try:
                            img.seek(i)
                            s = img.size[0] * img.size[1]
                            if s > best_size:
                                best_size = s
                                best = i
                        except Exception:
                            continue
                    img.seek(best)

                return img.convert('RGBA')

        except Exception as e:
            print(f"[FaviconManager] Error descargando {image_url}: {e}")
            return None

    # ------------------------------------------------------------------
    # Parser HTML para encontrar favicon
    # ------------------------------------------------------------------

    def _find_favicon_from_html(self, base_url: str, page_url: str) -> str:
        """
        Descarga el HTML de la pagina y busca <link rel="icon" ...>
        Retorna la URL del mejor favicon encontrado o ''.
        """
        ctx = _get_ssl_context()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }

        req = urllib.request.Request(page_url or base_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=ctx) as response:
                html = response.read().decode('utf-8', errors='ignore')
        except Exception:
            return ''

        if not html:
            return ''

        # Buscar <link rel="icon" ...> o variantes
        # Patrones: rel="icon", rel="shortcut icon", rel="apple-touch-icon"
        patterns = [
            r'<link[^>]+rel=["\'](?:shortcut\s+)?icon["\'][^>]*href=["\']([^"\']+)["\']',
            r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\'](?:shortcut\s+)?icon["\']',
            r'<link[^>]+rel=["\']apple-touch-icon["\'][^>]*href=["\']([^"\']+)["\']',
        ]

        best_url = ''
        best_size = 0

        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for href in matches:
                # Convertir URL relativa a absoluta
                full_url = urljoin(base_url, href)

                # Extraer tamano si esta en la URL (ej: "icon-32x32.png")
                size_match = re.search(r'(\d+)[xX](\d+)', href)
                size = 0
                if size_match:
                    size = int(size_match.group(1))

                # Preferir tamano mas grande
                if size >= best_size:
                    best_size = size
                    best_url = full_url

        return best_url

    # ------------------------------------------------------------------
    # Cache y utilidades
    # ------------------------------------------------------------------

    def _cache_key(self, domain: str) -> str:
        """Genera nombre de archivo cache a partir del dominio."""
        # Limpiar dominio para usar como filename seguro
        safe = re.sub(r'[^a-zA-Z0-9.-]', '_', domain)
        return safe

    def _file_to_b64(self, filepath: str) -> str:
        """Lee un PNG del disco y retorna base64."""
        with open(filepath, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def _img_to_b64(self, img) -> str:
        """Convierte PIL Image a base64 PNG string."""
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    def clear_cache(self):
        """Elimina todos los favicons en cache."""
        import shutil
        if os.path.isdir(FAVICONS_DIR):
            shutil.rmtree(FAVICONS_DIR)
            os.makedirs(FAVICONS_DIR, exist_ok=True)
            print(f"[FaviconManager] Cache limpiado: {FAVICONS_DIR}")

    def get_local_favicons(self) -> list:
        """
        Retorna lista de favicons cacheados localmente.
        Cada item: {'name': str, 'path': str, 'b64': str}
        """
        favicons = []
        if not os.path.isdir(FAVICONS_DIR):
            return favicons
        for fname in os.listdir(FAVICONS_DIR):
            if fname.endswith('.png'):
                fpath = os.path.join(FAVICONS_DIR, fname)
                try:
                    b64 = self._file_to_b64(fpath)
                    favicons.append({
                        'name': fname.replace('.png', ''),
                        'path': fpath,
                        'b64': b64,
                    })
                except Exception:
                    pass
        return favicons


# Instancia global
favicon_manager = FaviconManager()
