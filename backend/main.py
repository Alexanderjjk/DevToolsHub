"""
DevTools — LEGACY entry point (backend)

WARNING: This file is NOT used. The actual entry point is root main.py,
which imports Api from backend/api.py and defines ApiWithQuickNotes.

This file is retained only as reference for the Api class extensions
(quick notes, window management, hotkey callbacks, system tray).

Safe to remove in a future cleanup.
"""
import json
import os
import sys
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

# Import database and init
from database import init_db
init_db()

from api import Api

# Track secondary windows
_quick_notes_window = None
_tray_icon = None
_force_exit = False


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
            global _force_exit
            _force_exit = True
            # Cleanup
            try:
                from global_hotkeys import stop_global_hotkeys
                stop_global_hotkeys()
            except Exception:
                pass
            try:
                icon.stop()
            except Exception:
                pass
            # Destroy all windows
            import webview
            try:
                for w in webview.windows[:]:
                    try:
                        w.destroy()
                    except Exception:
                        pass
            except Exception:
                pass
            # Force exit since pywebview event loop won't stop cleanly
            import os as _os
            _os._exit(0)

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

    _closing = False

    def close_window(self):
        """Close button: hide to tray if setting enabled, else exit."""
        if self._closing:
            return {"success": True}
        self._closing = True
        import webview
        try:
            from database import get_setting
            val = get_setting('minimize_to_tray')
            minimize_to_tray = val not in (False, 'false', '0', 0, None)
        except Exception:
            minimize_to_tray = True

        if minimize_to_tray:
            try:
                webview.windows[0].hide()
            except Exception:
                pass
            self._closing = False
        else:
            self.exit_app()
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
        global _quick_notes_window
        if _quick_notes_window:
            try:
                _quick_notes_window.show()
                _quick_notes_window.focus()
                return {"success": True}
            except Exception:
                pass

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
        try:
            from global_hotkeys import stop_global_hotkeys
            stop_global_hotkeys()
        except Exception:
            pass
        try:
            if _tray_icon:
                _tray_icon.stop()
        except Exception:
            pass
        import webview
        try:
            for w in webview.windows[:]:
                try:
                    w.destroy()
                except Exception:
                    pass
        except Exception:
            pass
        import os as _os
        _os._exit(0)


def on_closing(window):
    """When main window closes, check setting: hide to tray or truly close.
    Return True to cancel the close event (stay open), False to allow close.
    """
    global _force_exit
    if _force_exit:
        return False

    try:
        from database import get_setting
        val = get_setting('minimize_to_tray')
        minimize_to_tray = val not in (False, 'false', '0', 0, None)
    except Exception:
        minimize_to_tray = True

    if minimize_to_tray:
        try:
            window.hide()
        except Exception:
            pass
        return True
    else:
        # Exit immediately — skip slow WebView2/Chromium cleanup
        import os as _os
        _os._exit(0)


def main():
    import webview

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

    window_kwargs = {
        "title": "DevTools",
        "url": os.path.join(FRONTEND_DIR, "index.html"),
        "width": 1280,
        "height": 800,
        "min_size": (900, 600),
        "frameless": True,
        "easy_drag": False,
        "text_select": True,
        "js_api": api_instance,
    }

    window = webview.create_window(**window_kwargs)

    # Register the on_closing callback so Alt+F4 / native close respects minimize-to-tray setting
    try:
        window.events.closing += on_closing
    except Exception:
        pass

    print("=" * 50)
    print("  DevTools v0.9.5")
    print("  Game Dev Command Center")
    print("  Hotkeys: Ctrl+Shift+B (Notes)")
    print("           Ctrl+Shift+C (Timer)")
    print("           Ctrl+K (Search)")
    print("  Close = Minimize to tray")
    print("=" * 50)

    def on_loaded():
        """After window loads, create system tray icon."""
        # Create system tray icon in background thread
        _create_tray_icon(api_instance)

    webview.start(debug=False, func=on_loaded)


if __name__ == "__main__":
    main()
