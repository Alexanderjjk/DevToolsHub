"""
DevTools — Global Hotkeys (Windows)
Uses the 'keyboard' library to register system-wide hotkeys
that work even when the app window is not focused.

v2: Reads shortcuts from SQLite settings table instead of hardcoded values.
v3: Added foreground detection (skip when DevTools focused),
    debounce (500ms anti hardware-repeat), suppress=False (anti Ctrl blocked).
"""
import json
import threading
import time
import platform
import keyboard
import logging

logger = logging.getLogger(__name__)

# Callback registry: hotkey_string -> callback_function
_hotkey_callbacks = {}
# Reverse map: action_id -> hotkey_string (to detect changes)
_action_hotkey_map = {}
_listener_thread = None
_running = False

# Debounce state: hotkey_string -> timestamp
_last_fire = {}
_DEBOUNCE_MS = 500


def _is_devtools_focused():
    """Return True if ANY DevTools window is the foreground window.
    When the app (main or Quick Notes) is focused, skip Python callbacks
    to avoid dual-fire with JS handlers.
    """
    if platform.system() != 'Windows':
        return False
    try:
        import ctypes
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if not hwnd:
            return False
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return False
        buf = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
        title_lower = buf.value.lower()
        return 'devtools' in title_lower or 'quick notes' in title_lower
    except Exception:
        return False


def _debounce_wrapper(hotkey_str, callback):
    """Wrap callback: only fire once per 500ms window.
    Prevents the WH_KEYBOARD_LL hook from firing multiple times per press.
    Also skips if DevTools window is focused (JS handles it).
    """
    def wrapper():
        if _is_devtools_focused():
            return  # Let JS handle it
        global _last_fire
        now = time.monotonic()
        last = _last_fire.get(hotkey_str, 0)
        if now - last < _DEBOUNCE_MS / 1000.0:
            return  # Still within debounce window
        _last_fire[hotkey_str] = now
        try:
            callback()
        except Exception as e:
            logger.error(f"Hotkey callback error for '{hotkey_str}': {e}")
    return wrapper


def register_hotkey(hotkey_str, callback):
    """Register a global hotkey with a callback function.
    
    Args:
        hotkey_str: e.g. 'ctrl+shift+b'
        callback: callable to invoke when hotkey is pressed
    """
    global _hotkey_callbacks
    _hotkey_callbacks[hotkey_str] = callback
    logger.info(f"Global hotkey registered: {hotkey_str}")


def _load_shortcuts_from_db():
    """Load keyboard shortcuts from SQLite settings table.
    
    Returns:
        dict: { action_id: { ctrl, shift, alt, key }, ... }
    """
    try:
        from database import get_setting
        raw = get_setting('keyboard_shortcuts')
        if raw:
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and len(parsed) > 0:
                return parsed
    except Exception as e:
        logger.warning(f"Could not load shortcuts from DB: {e}")
    # Defaults
    return {
        'globalSearch': {'ctrl': True, 'shift': False, 'key': 'k'},
        'quickNotes': {'ctrl': True, 'shift': True, 'key': 'B'},
        'timerOverlay': {'ctrl': True, 'shift': True, 'key': 'C'},
        'themePicker': {'ctrl': True, 'shift': True, 'key': 'T'},
    }


def _keys_to_hotkey_str(keys):
    """Convert a keys dict { ctrl, shift, alt, key } to hotkey string like 'ctrl+shift+k'."""
    parts = []
    if keys.get('ctrl'):
        parts.append('ctrl')
    if keys.get('shift'):
        parts.append('shift')
    if keys.get('alt'):
        parts.append('alt')
    k = keys.get('key', '')
    if k:
        parts.append(k.lower())
    return '+'.join(parts)


def _start_listener():
    """Internal: start the keyboard listener thread."""
    global _listener_thread, _running
    if _running:
        return

    _running = True

    def _listener():
        global _running
        try:
            for hotkey_str, callback in _hotkey_callbacks.items():
                try:
                    keyboard.add_hotkey(hotkey_str, _debounce_wrapper(hotkey_str, callback), suppress=False)
                    logger.info(f"Global hotkey active: {hotkey_str}")
                except Exception as e:
                    logger.error(f"Failed to register hotkey '{hotkey_str}': {e}")

            keyboard.wait()
        except Exception as e:
            logger.error(f"Global hotkey listener error: {e}")
            _running = False

    _listener_thread = threading.Thread(target=_listener, daemon=True, name="global-hotkeys")
    _listener_thread.start()
    logger.info("Global hotkeys listener started")


def stop_global_hotkeys():
    """Unhook all global hotkeys and stop the listener."""
    global _running, _hotkey_callbacks, _action_hotkey_map
    _running = False
    try:
        keyboard.unhook_all_hotkeys()
    except Exception:
        pass
    _hotkey_callbacks = {}
    _action_hotkey_map = {}
    _last_fire.clear()
    logger.info("Global hotkeys stopped")


def start_global_hotkeys_with_callbacks(callbacks_map):
    """Start global hotkeys reading from SQLite.
    
    Args:
        callbacks_map: dict mapping action_id -> callback function.
            e.g. { 'quickNotes': lambda: api.open_quick_notes(), ... }
    """
    global _action_hotkey_map
    _action_hotkey_map = callbacks_map.copy()

    shortcuts = _load_shortcuts_from_db()
    logger.info(f"Starting global hotkeys with DB shortcuts: {shortcuts}")

    for action_id, callback in callbacks_map.items():
        keys = shortcuts.get(action_id)
        if not keys:
            continue
        hotkey_str = _keys_to_hotkey_str(keys)
        if hotkey_str:
            register_hotkey(hotkey_str, callback)

    _start_listener()


def reload_global_hotkeys():
    """Re-read shortcuts from SQLite and re-register all global hotkeys.
    
    Called when the user changes a shortcut in the UI.
    IMPORTANT: Must restart the listener thread because keyboard.wait()
    exits after unhook_all_hotkeys(), killing the old listener.
    """
    global _action_hotkey_map
    if not _action_hotkey_map:
        logger.warning("reload_global_hotkeys called but no callbacks registered")
        return

    shortcuts = _load_shortcuts_from_db()
    logger.info(f"Reloading global hotkeys from DB: {shortcuts}")

    # Stop current hotkeys and listener
    try:
        keyboard.unhook_all_hotkeys()
    except Exception:
        pass
    _hotkey_callbacks.clear()
    _last_fire.clear()
    # Mark running as False so _start_listener() can create a new thread
    global _running
    _running = False
    # Give the old listener thread time to die
    import time as _time
    _time.sleep(0.1)

    # Re-register with new shortcuts from DB
    for action_id, callback in _action_hotkey_map.items():
        keys = shortcuts.get(action_id)
        if not keys:
            continue
        hotkey_str = _keys_to_hotkey_str(keys)
        if hotkey_str:
            register_hotkey(hotkey_str, callback)

    # Restart the listener thread (required after unhook_all)
    _start_listener()

    print(f"[Hotkeys] Reloaded from SQLite: {list(_hotkey_callbacks.keys())}")
