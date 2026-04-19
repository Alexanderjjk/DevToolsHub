"""
DevTools — Punto de entrada principal
Aplicacion de escritorio con pywebview: Python backend + HTML/CSS/JS frontend
Incluye: Quick Notes overlay window, Global Hotkeys, System Tray
"""
import json
import os
import sys
import threading
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Window state file (saved/restored between sessions)
_WINDOW_STATE_FILE = os.path.join(BASE_DIR, "backend", "data", "window_state.json")

def _load_window_state():
    """Load saved window size and position from JSON file."""
    try:
        if os.path.exists(_WINDOW_STATE_FILE):
            with open(_WINDOW_STATE_FILE, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_window_state(window):
    """Save current window size and position to JSON file."""
    try:
        import webview
        # Get current window dimensions
        width = window.width
        height = window.height
        x = window.x
        y = window.y
        state = {"width": width, "height": height, "x": x, "y": y}
        os.makedirs(os.path.dirname(_WINDOW_STATE_FILE), exist_ok=True)
        with open(_WINDOW_STATE_FILE, 'w') as f:
            json.dump(state, f)
    except Exception:
        pass  # Silently fail — non-critical feature

sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

# Import database and init
from database import init_db
init_db()

from api import Api

# Track secondary windows
_quick_notes_window = None
_tray_icon = None
_force_exit = False
_minimize_to_tray_cache = None  # Cache setting to avoid DB query on every close
_last_close_attempt = 0.0  # Track last close time for double-close-to-exit

# Re-entry guard for open_quick_notes: prevent multiple instances from rapid calls
_qn_last_open_time = 0
_QN_DEBOUNCE_SEC = 0.5


def _flush_db():
    """Flush SQLite WAL to disk before process exit.
    
    _os._exit(0) kills the process instantly without running Python cleanup,
    which means SQLite WAL data may not be checkpointed to the main DB file.
    This function runs a TRUNCATE checkpoint + fsync to ensure all data is persisted.
    Also closes the connection to force any pending writes.
    """
    try:
        import os as _os
        from database import _get_connection, _connection
        conn = _get_connection()
        # Force commit any pending transactions
        conn.commit()
        # Checkpoint WAL into main DB file
        try:
            result = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
            conn.commit()
            print(f"[flush] WAL checkpoint done: busy={result[0]}, log={result[1]}, chkpt={result[2]}")
        except Exception as ckpt_err:
            print(f"[flush] WAL checkpoint error: {ckpt_err}")
        # Force OS to flush file buffers to physical disk
        try:
            db_path = _os.path.join(_os.path.dirname(__file__), 'data', 'devtools.db')
            if _os.path.exists(db_path):
                fd = _os.open(db_path, _os.O_RDONLY)
                _os.fsync(fd)
                _os.close(fd)
        except Exception:
            pass
        # Also flush the WAL file if it exists
        try:
            wal_path = _os.path.join(_os.path.dirname(__file__), 'data', 'devtools.db-wal')
            if _os.path.exists(wal_path):
                fd = _os.open(wal_path, _os.O_RDONLY)
                _os.fsync(fd)
                _os.close(fd)
        except Exception:
            pass
        # Close connection to force flush any remaining buffers
        try:
            conn.close()
        except Exception:
            pass
    except Exception as e:
        print(f"[flush] Error: {e}")


def _safe_exit():
    """Flush database and exit cleanly but fast.
    
    Strategy:
    1. Stop global hotkeys first (keyboard library cleanup)
    2. Flush SQLite WAL to disk with fsync (ensures all settings/shortcuts persist)
    3. Small delay to ensure OS buffers flush
    4. Use os._exit(0) to skip slow Chromium/WebView2 cleanup
    """
    # Stop global hotkeys first to avoid keyboard library cleanup errors
    try:
        from global_hotkeys import stop_global_hotkeys
        stop_global_hotkeys()
    except Exception:
        pass
    _flush_db()
    # Small delay to ensure OS finishes flushing file buffers
    import time as _time
    _time.sleep(0.15)
    import os as _os
    _os._exit(0)


def _create_tray_icon(api_instance):
    """Create a system tray icon using pystray (Windows)."""
    global _tray_icon
    try:
        import pystray
        from PIL import Image, ImageDraw

        # Create a simple 64x64 icon with "D" letter
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        # Background circle
        draw.ellipse([4, 4, 59, 59], fill=(114, 84, 204, 255))
        # Letter D
        draw.text((16, 10), "D", fill=(255, 255, 255, 255))

        def on_show(icon, item):
            import webview
            try:
                win = webview.windows[0]
                win.show()
                if hasattr(win, 'restore'):
                    try:
                        win.restore()
                    except Exception:
                        pass
                win.focus()
            except Exception:
                pass

        def on_exit(icon, item):
            # Flush DB then force exit
            _safe_exit()

        menu = pystray.Menu(
            pystray.MenuItem("Mostrar DevTools", on_show, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Salir", on_exit),
        )

        _tray_icon = pystray.Icon("DevTools", img, "DevTools", menu)
        tray_thread = threading.Thread(target=_tray_icon.run, daemon=True)
        tray_thread.start()
        print("[Tray] System tray icon created")
        return True
    except ImportError:
        print("[Tray] WARNING: pystray not installed. System tray disabled.")
        print("[Tray] Install with: pip install pystray Pillow")
        return False
    except Exception as e:
        print(f"[Tray] WARNING: Could not create tray icon: {e}")
        return False


class ApiWithQuickNotes(Api):
    """Extends base Api with Quick Notes overlay window support and global hotkeys."""

    def _restore_main_window(self):
        """Restore the main window if it is minimized, then bring it to front."""
        import webview
        try:
            win = webview.windows[0]
            if hasattr(win, 'restore'):
                try:
                    win.restore()
                except Exception:
                    pass
            win.show()
            win.focus()
        except (IndexError, Exception):
            pass

    def minimize_window(self):
        import webview
        try:
            webview.windows[0].minimize()
        except Exception:
            pass
        return {"success": True}

    def maximize_window(self):
        import webview
        try:
            webview.windows[0].toggle_fullscreen()
        except Exception:
            pass
        return {"success": True}

    def resize_window(self, width, height):
        """Resize the main window to the given dimensions."""
        import webview
        try:
            webview.windows[0].resize(int(width), int(height))
        except Exception:
            pass
        return {"success": True}

    def resize_and_move_window(self, width, height, x, y):
        """Resize and reposition the window atomically.
        Needed for west/north resizes where the opposite edge must stay anchored."""
        import webview
        try:
            win = webview.windows[0]
            win.resize(int(width), int(height))
            win.move(int(x), int(y))
        except Exception:
            pass
        return {"success": True}

    def get_window_position(self):
        """Return current window position {x, y} for resize calculations."""
        import webview
        try:
            win = webview.windows[0]
            return {"x": win.x, "y": win.y}
        except Exception:
            return {"x": 0, "y": 0}

    _closing = False

    def close_window(self):
        """Close button: hide to tray if setting enabled, else minimize+exit in background."""
        if self._closing:
            return {"success": True}
        self._closing = True
        import webview
        try:
            mt = _get_minimize_to_tray()
        except Exception:
            mt = False

        if mt:
            try:
                webview.windows[0].hide()
            except Exception:
                pass
            self._closing = False
        else:
            # Minimize first for visual feedback, then exit in background
            try:
                webview.windows[0].minimize()
            except Exception:
                pass
            # Exit in a background thread after a tiny delay
            # This gives the minimize animation time to render before the process dies
            threading.Thread(target=_safe_exit, daemon=True).start()
        return {"success": True}

    def move_window(self, dx, dy):
        """Mueve la ventana un delta (dx, dy) en pixeles. Para drag personalizado."""
        import webview
        try:
            win = webview.windows[0]
            x, y = win.x, win.y
            win.move(x + dx, y + dy)
        except Exception:
            pass
        return {"success": True}

    def open_quick_notes(self):
        global _quick_notes_window, _qn_last_open_time

        # Debounce: ignore calls within 500ms of the last one
        now = time.monotonic()
        if now - _qn_last_open_time < _QN_DEBOUNCE_SEC:
            return {"success": True}
        _qn_last_open_time = now

        # If a QuickNotes window already exists, just bring it to front
        if _quick_notes_window:
            try:
                _quick_notes_window.show()
                _quick_notes_window.focus()
            except Exception:
                pass
            return {"success": True}

        import webview

        # Load last position from settings
        from database import get_setting
        pos = get_setting("quick_notes_position")
        x, y = None, None
        if pos:
            try:
                data = json.loads(pos)
                x, y = data.get("x"), data.get("y")
            except Exception:
                pass

        quick_html = os.path.join(FRONTEND_DIR, "quick-notes.html")

        _quick_notes_window = webview.create_window(
            'Quick Notes',
            quick_html,
            width=420,
            height=320,
            min_size=(300, 200),
            x=x, y=y,
            frameless=True,
            on_top=True,
            easy_drag=True,
            text_select=True,
            js_api=self,
        )
        return {"success": True}

    def close_quick_notes(self):
        global _quick_notes_window
        if _quick_notes_window:
            try:
                _quick_notes_window.destroy()
                _quick_notes_window = None
            except Exception:
                pass
        return {"success": True}

    def get_quick_notes(self):
        """Return notes flagged as quick notes."""
        from database import get_quick_notes
        return get_quick_notes()

    def show_timer_overlay(self):
        """Called from global hotkey to show the timer overlay."""
        import webview
        try:
            self._restore_main_window()
            win = webview.windows[0]
            win.evaluate_js('if(typeof toggleTimerOverlay==="function")toggleTimerOverlay(true);')
        except Exception:
            pass

    def open_global_search(self):
        """Called from global hotkey to open the global search."""
        import webview
        try:
            self._restore_main_window()
            win = webview.windows[0]
            win.evaluate_js('if(typeof openGlobalSearch==="function")openGlobalSearch();')
        except Exception:
            pass

    def navigate_to_section(self, section):
        """Called from global hotkey to navigate to a specific section."""
        import webview
        try:
            self._restore_main_window()
            win = webview.windows[0]
            win.evaluate_js(f'if(typeof navigateTo==="function")navigateTo("{section}");')
        except Exception:
            pass

    def exit_app(self):
        """Called from JS to truly exit the app (from tray menu or force quit)."""
        global _force_exit
        _force_exit = True
        # Flush DB then force exit immediately
        _safe_exit()

    def invalidate_tray_cache(self):
        """Invalidate the minimize-to-tray cache.
        Called from frontend after the user toggles the close-to-tray setting,
        so that the next close_window / on_closing call reads the fresh value."""
        global _minimize_to_tray_cache
        _minimize_to_tray_cache = None
        return {"success": True}


def _get_minimize_to_tray():
    """Get minimize_to_tray setting with caching."""
    global _minimize_to_tray_cache
    if _minimize_to_tray_cache is not None:
        return _minimize_to_tray_cache
    try:
        from database import get_setting
        val = get_setting('minimize_to_tray')
        _minimize_to_tray_cache = val in (True, 'true', 1, '1')
    except Exception:
        _minimize_to_tray_cache = False
    return _minimize_to_tray_cache


def on_closing(window):
    """When main window closes (OS-initiated: Alt+F4, taskbar close).
    - If minimize_to_tray: hide on first close, force-exit on second close within 3s
    - If not minimize_to_tray: minimize first then exit in background
    Returns True to cancel close, False to allow.
    """
    global _force_exit, _last_close_attempt
    if _force_exit:
        return False

    now = time.monotonic()

    # Double-close detection: if user closes again within 3 seconds, force exit
    if now - _last_close_attempt < 3.0:
        _safe_exit()

    _last_close_attempt = now

    if _get_minimize_to_tray():
        try:
            window.hide()
        except Exception:
            pass
        return True  # Cancel the close — window stays hidden
    else:
        # Minimize first for visual feedback (fast perceived close)
        try:
            window.minimize()
        except Exception:
            pass
        # Exit in background thread after minimize animation
        # This prevents Chrome_WidgetWin_0 Error 1411 from being visible
        threading.Thread(target=_safe_exit, daemon=True).start()
        return True  # Cancel the OS close — we handle it ourselves


def main():
    import webview

    # Suppress Chromium Error 1411 (Failed to unregister class Chrome_WidgetWin_0)
    # This is a harmless WebView2 cleanup warning that appears on Windows
    import logging
    logging.getLogger("pywebview").setLevel(logging.ERROR)
    # Also suppress Chromium's own stderr output for Error 1411
    import os as _os
    if _os.name == 'nt':  # Windows
        try:
            _os.environ['WEBKIT_DISABLE_DMABUF_RENDERER'] = '1'
        except Exception:
            pass

    api_instance = ApiWithQuickNotes()

    # Setup global hotkeys — read from SQLite, not hardcoded
    try:
        from global_hotkeys import start_global_hotkeys_with_callbacks

        hotkeys_callbacks = {
            'quickNotes': lambda: api_instance.open_quick_notes(),
            'timerOverlay': lambda: api_instance.timer_toggle_global(),
            'globalSearch': lambda: api_instance.open_global_search(),
        }
        start_global_hotkeys_with_callbacks(hotkeys_callbacks)
        print("[Hotkeys] Global keyboard shortcuts loaded from SQLite")
    except ImportError:
        print("[Hotkeys] WARNING: 'keyboard' library not installed. Global hotkeys disabled.")
        print("[Hotkeys] Install with: pip install keyboard")
    except Exception as e:
        print(f"[Hotkeys] WARNING: Could not register global hotkeys: {e}")

    # Restore saved window size/position, or use defaults
    _ws = _load_window_state()
    window_kwargs = {
        "title": "DevTools",
        "url": os.path.join(FRONTEND_DIR, "index.html"),
        "width": _ws.get("width", 1280),
        "height": _ws.get("height", 800),
        "x": _ws.get("x"),
        "y": _ws.get("y"),
        "min_size": (800, 500),
        "frameless": True,
        "easy_drag": False,
        "text_select": True,
        "resizable": True,
        "js_api": api_instance,
    }

    window = webview.create_window(**window_kwargs)

    print("=" * 50)
    print("  DevTools v0.9.6")
    print("  Game Dev Command Center")
    print("  Hotkeys: loaded from SQLite")
    print("  Close = Minimize to tray")
    print("=" * 50)

    def on_loaded():
        """After window loads, create system tray icon."""
        _create_tray_icon(api_instance)

    def on_closing_save_state():
        """Save window state before closing, then proceed with tray logic."""
        _save_window_state(window)
        return on_closing()

    try:
        window.events.closing += on_closing_save_state
    except Exception:
        pass

    webview.start(debug=False, func=on_loaded)


if __name__ == "__main__":
    main()
