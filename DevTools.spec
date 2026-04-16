# -*- mode: python ; coding: utf-8 -*-
"""
DevTools — PyInstaller spec file
Genera un .exe standalone con todo embebido.

Modos de compilacion:
  onefile   = Todo empaquetado en un solo .exe (lento al abrir, facil de distribuir)
  onedir    = Carpeta con .exe + archivos (rapido al abrir, mas ligero)

Uso:
  pyinstaller DevTools.spec              # default: onedir
  pyinstaller DevTools.spec --onefile    # un solo .exe
"""

import os
import sys
import glob

BASE_DIR = os.path.dirname(os.path.abspath(SPEC))

# ── Rutas de origen ──────────────────────────────────────────────────
MAIN_SCRIPT = os.path.join(BASE_DIR, 'main.py')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
ICON_PATH = os.path.join(FRONTEND_DIR, 'icon.ico')
VERSION_PATH = os.path.join(BASE_DIR, 'version_info.txt')

# Si no existe el icono, no fallar
if not os.path.exists(ICON_PATH):
    print("[WARN] No se encontro icon.ico — el EXE tendra icono por defecto.")
    ICON_PATH = None

if not os.path.exists(VERSION_PATH):
    print("[WARN] No se encontro version_info.txt — el EXE no tendra metadata de version.")
    VERSION_PATH = None

# ── Collect: frontend (HTML/CSS/JS) ─────────────────────────────────
frontend_datas = []
for root, dirs, files in os.walk(FRONTEND_DIR):
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, BASE_DIR)
        frontend_datas.append((full, os.path.dirname(rel)))

# ── Collect: backend Python modules ──────────────────────────────────
# PyInstaller suele encontrarlos por imports, pero por seguridad
# los incluimos explicitamente como hiddenimports
backend_modules = [
    'backend.database',
    'backend.api',
    'backend.global_hotkeys',
    'backend.icon_manager',
    'backend.icon_library',
    'backend.launcher_manager',
    'backend.docs_manager',
    'backend.sessions_manager',
    'backend.notes_manager',
    'backend.tasks_manager',
    'backend.favicon_downloader',
    'backend.favicon_manager',
    'backend.app_usage_tracker',
]

# ── Dependencias que PyInstaller no detecta automaticamente ──────────
hidden_imports = backend_modules + [
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',
    'PIL.ImageFont',
    'sqlite3',
    'json',
    'uuid',
    'ssl',
    'ctypes',
    'ctypes.wintypes',
    'keyboard',
    'webview',
    'concurrent.futures',
]

# ── Analisis ─────────────────────────────────────────────────────────
a = Analysis(
    [MAIN_SCRIPT],
    pathex=[BASE_DIR, BACKEND_DIR],
    binaries=[],
    datas=frontend_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'scipy',
        'pandas',
        'IPython',
        'jupyter',
        'pytest',
        'setuptools',
    ],
    noarchive=False,
    optimize=0,
)

# ── PYZ (bytecode comprimido) ────────────────────────────────────────
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# ── EXE ──────────────────────────────────────────────────────────────
exe_kwargs = {
    'name': 'DevTools',
    'console': False,          # Sin ventana de consola
    'icon': ICON_PATH if ICON_PATH else None,
    'uac_admin': False,
    'uac_uiaccess': False,
    'debug': False,
    'strip': False,
    'upx': False,              # Desactivado: UPX causa falsos positivos en antivirus
    'upx_exclude': [],
    'runtime_tmpdir': None,
    'argv_emulation': False,
    'target_arch': None,
    'codesign_identity': None,
    'entitlements_file': None,
    'version': VERSION_PATH,
}

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,    # onedir mode (cambiar a False para onefile)
    **exe_kwargs,
)

# ── COLLECT (modo onedir) ───────────────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='DevTools',
)
