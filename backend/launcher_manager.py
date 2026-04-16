"""
Launcher Manager — CRUD de launchers + ejecucion de .exe

NOTE: This module is retained for backward compatibility with any code that
imports it directly.  The primary API path now goes through api.py, which
delegates icon extraction to icon_manager.py.  The extract_exe_icon()
function here delegates to icon_manager to avoid duplicating the Win32
handle code (and the 64-bit OverflowError fix).
"""
import json
import os
import subprocess
import sys
import uuid


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
LAUNCHERS_FILE = os.path.join(DATA_DIR, "launchers.json")


def _load():
    if not os.path.exists(LAUNCHERS_FILE):
        return []
    with open(LAUNCHERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(launchers):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(LAUNCHERS_FILE, "w", encoding="utf-8") as f:
        json.dump(launchers, f, indent=2, ensure_ascii=False)


def extract_exe_icon(exe_path):
    """Extrae el icono de un archivo .exe como base64 PNG.

    Delegates to icon_manager.IconManager.extract_from_exe() to avoid
    duplicating Win32 ctypes code and to benefit from the 64-bit handle
    fix (proper argtypes) applied there.
    """
    try:
        from icon_manager import icon_manager
        return icon_manager.extract_from_exe(exe_path) or None
    except Exception as e:
        print(f"[LauncherManager] extract_exe_icon fallback error: {e}")
        return None


def get_all():
    return _load()


def add_launcher(name, path):
    launchers = _load()
    icon_b64 = extract_exe_icon(path) or ""
    launcher = {
        "id": str(uuid.uuid4()),
        "name": name or os.path.splitext(os.path.basename(path))[0],
        "path": path,
        "icon": icon_b64,
        "created_at": __import__("time").time(),
    }
    launchers.append(launcher)
    _save(launchers)
    return launcher


def remove_launcher(launcher_id):
    launchers = _load()
    launchers = [l for l in launchers if l["id"] != launcher_id]
    _save(launchers)
    return True


def launch(launcher_id):
    launchers = _load()
    for launcher in launchers:
        if launcher["id"] == launcher_id:
            path = launcher["path"]
            try:
                if sys.platform == "win32":
                    os.startfile(path)
                elif sys.platform == "darwin":
                    subprocess.Popen(["open", path])
                else:
                    subprocess.Popen([path])
                return {"success": True, "message": f" lanzado: {launcher['name']}"}
            except Exception as e:
                return {"success": False, "message": f"Error: {str(e)}"}
    return {"success": False, "message": "Launcher no encontrado"}


def update_launcher(launcher_id, name=None, path=None):
    launchers = _load()
    for launcher in launchers:
        if launcher["id"] == launcher_id:
            if name:
                launcher["name"] = name
            if path:
                launcher["path"] = path
                launcher["icon"] = extract_exe_icon(path) or ""
            _save(launchers)
            return launcher
    return None
