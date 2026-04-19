"""
API — Puente entre Python y JavaScript via pywebview.api
Expone todos los metodos que el frontend necesita.

Now backed by SQLite via the database module.
"""
import os
import sys
import json
import subprocess
import webbrowser
import time

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(__file__))

# Clean up stale active sessions from previous sessions
# Note: init_db() is called once in root main.py before this module is imported
try:
    from app_usage_tracker import cleanup_stale_sessions, start_process_poller
    cleanup_stale_sessions()
    start_process_poller()
except Exception as e:
    print(f"[Startup] Cleanup stale sessions error: {e}")

from database import (
    # App shortcuts (launchers)
    get_app_shortcuts,
    add_app_shortcut,
    delete_app_shortcut,
    update_app_shortcut,
    # App usage tracking
    get_app_usage_stats as db_get_app_usage_stats,
    get_app_usage_history,
    get_app_usage_active,
    delete_app_usage_history,
    # Notes
    get_notes as db_get_notes,
    get_note,
    create_note as db_create_note,
    update_note,
    delete_note,
    search_notes,
    get_note_colors,
    get_note_stats,
    get_quick_notes,
    import_note_from_file as db_import_note_from_file,
    get_note_word_count as db_get_note_word_count,
    get_all_tags as db_get_all_tags,
    duplicate_note as db_duplicate_note,
    # Sessions
    get_sessions as db_get_sessions,
    log_session,
    get_session_stats,
    get_activity_calendar,
    clear_session_history,
    delete_session,
    # Tasks
    get_tasks as db_get_tasks,
    get_task,
    create_task,
    update_task,
    delete_task,
    get_task_stats,
    # Docs
    get_doc_links,
    get_doc_link,
    add_doc_link,
    update_doc_link,
    delete_doc_link,
    get_doc_link_categories,
    get_doc_link_stats,
    # Settings
    get_setting,
    set_setting,
    # Data reset
    reset_all_data,
)

# Use IconManager for robust icon extraction
from icon_manager import icon_manager


# ---------------------------------------------------------------------------
# Fixed reference lists for tasks
# ---------------------------------------------------------------------------

TASKS_CATEGORIES = [
    {"id": "general", "name": "General", "icon": "\U0001F4DD"},
    {"id": "art", "name": "Arte", "icon": "\U0001F3A8"},
    {"id": "code", "name": "Codigo", "icon": "\U0001F4BB"},
    {"id": "design", "name": "Diseno", "icon": "\U0001F3D7\uFE0F"},
    {"id": "audio", "name": "Audio", "icon": "\U0001F3B5"},
    {"id": "testing", "name": "Testing", "icon": "\U0001F50D"},
    {"id": "bug", "name": "Bug", "icon": "\U0001F41B"},
    {"id": "feature", "name": "Feature", "icon": "\u2B50"},
]

TASKS_PRIORITIES = ["low", "medium", "high", "urgent"]

TASKS_STATES = ["pending", "in_progress", "done", "archived"]


# ---------------------------------------------------------------------------
# Fixed reference lists for launchers
# ---------------------------------------------------------------------------

LAUNCHER_CATEGORIES = [
    {"id": "editores_codigo", "name": "Editores de Codigo", "icon": "\U0001F4BB"},
    {"id": "motores_3d", "name": "Motores 3D", "icon": "\U0001F3AE"},
    {"id": "arte_diseno", "name": "Arte y Diseno", "icon": "\U0001F3A8"},
    {"id": "audio", "name": "Audio", "icon": "\U0001F3B5"},
    {"id": "utilidades", "name": "Utilidades", "icon": "\U0001F527"},
    {"id": "general", "name": "General", "icon": "\U0001F4E6"},
]

LAUNCHER_ICON_COLORS = [
    "#7254cc", "#e74c3c", "#e67e22", "#f1c40f",
    "#2ecc71", "#3498db", "#9b59b6", "#1abc9c",
]


class Api:
    # ============================================
    # LAUNCHERS
    # ============================================

    def get_launchers(self):
        return get_app_shortcuts()

    def get_launcher_categories(self):
        """Retorna las categorias fijas de launchers."""
        return LAUNCHER_CATEGORIES

    def get_launcher_icon_colors(self):
        """Retorna los colores disponibles para iconos de texto."""
        return LAUNCHER_ICON_COLORS

    def add_launcher(self, name, path, category='general', icon_mode='auto', icon_color='#7254cc', icon_value=''):
        """
        Agrega un nuevo launcher.
        
        Args:
            name: Nombre visible del launcher
            path: Ruta al ejecutable
            category: ID de categoria
            icon_mode: 'auto' (extraer de exe), 'text' (letra+color), 'custom' (imagen personalizada)
            icon_color: Color para modo 'text' (hex)
            icon_value: Para 'text' es la letra, para 'custom' es la ruta a la imagen
        """
        icon_b64 = ''

        if icon_mode == 'auto':
            icon_b64 = icon_manager.extract_from_exe(path)
        elif icon_mode == 'text':
            letter = (icon_value or name or '?')[0].upper()
            icon_b64 = icon_manager.generate_text_icon(letter, icon_color)
        elif icon_mode == 'custom':
            if icon_value and os.path.isfile(icon_value):
                icon_b64 = icon_manager.extract_from_image_file(icon_value)

        # Fallback: si la extraccion fallo, generar icono de texto
        if not icon_b64:
            letter = (name or path or '?')[0].upper()
            icon_b64 = icon_manager.generate_text_icon(letter, icon_color)
            print(f"[add_launcher] Fallback a icono de texto '{letter}' para: {name}")

        return add_app_shortcut(name, path, category=category, icon_path=icon_b64)

    def remove_launcher(self, launcher_id):
        return delete_app_shortcut(launcher_id)

    def launch(self, launcher_id):
        """Launch an app and start tracking its usage time."""
        # Get shortcut info for tracking
        shortcut = None
        for s in get_app_shortcuts():
            if s['id'] == launcher_id:
                shortcut = s
                break
        if not shortcut:
            return {"success": False, "message": "Launcher not found"}

        # Use the tracker which launches + monitors + records usage
        from app_usage_tracker import launch_and_track
        result = launch_and_track(
            launcher_id=launcher_id,
            launcher_name=shortcut['name'],
            exe_path=shortcut['exe_path'],
            launch_args=shortcut.get('launch_args') or '',
        )
        return result

    def update_launcher(self, launcher_id, name=None, path=None, category=None):
        kwargs = {}
        if name is not None:
            kwargs['name'] = name
        if path is not None:
            kwargs['exe_path'] = path
        if category is not None:
            kwargs['category'] = category
        return update_app_shortcut(launcher_id, **kwargs)

    def extract_icon(self, exe_path):
        """Extrae icono de un .exe como base64 PNG."""
        return icon_manager.extract_from_exe(exe_path)

    def select_icon_file(self):
        """Abre dialogo para seleccionar una imagen de icono personalizada."""
        return self.open_file_dialog(
            'Seleccionar icono',
            ('Imagenes', ('*.png', '*.jpg', '*.jpeg', '*.bmp', '*.ico', '*.gif'))
        )

    # ============================================
    # NOTAS
    # ============================================

    def get_notes(self):
        return db_get_notes()

    def get_note(self, note_id):
        return get_note(note_id)

    def create_note(self, title="", content="", color_id="default", parent_id=None, project="", tags=None, is_quick_note=False):
        return db_create_note(title, content, parent_id=parent_id, project=project, tags=tags, is_quick_note=is_quick_note, color_id=color_id)

    def update_note(self, note_id, title=None, content=None, color_id=None, pinned=None, parent_id=None, project=None, tags=None, is_favorite=None):
        kwargs = {}
        if title is not None:
            kwargs['title'] = title
        if content is not None:
            kwargs['content'] = content
        if color_id is not None:
            kwargs['color_id'] = color_id
        if pinned is not None:
            kwargs['pinned'] = pinned
        if parent_id is not None:
            kwargs['parent_id'] = parent_id
        if project is not None:
            kwargs['project'] = project
        if tags is not None:
            kwargs['tags'] = tags
        if is_favorite is not None:
            kwargs['is_favorite'] = is_favorite
        return update_note(note_id, **kwargs)

    def delete_note(self, note_id):
        return delete_note(note_id)

    def search_notes(self, query):
        return search_notes(query)

    def get_note_colors(self):
        return get_note_colors()

    def get_notes_stats(self):
        return get_note_stats()

    def import_note_from_file(self, file_path):
        """Import a single .md file as a new note."""
        return db_import_note_from_file(file_path)

    def import_notes_from_files(self, file_paths):
        """Import multiple .md files at once. Returns list of results."""
        results = []
        for p in file_paths:
            try:
                note = db_import_note_from_file(p)
                results.append({"path": p, "success": note is not None, "note": note})
            except Exception as e:
                results.append({"path": p, "success": False, "error": str(e)})
        return results

    def import_md_files(self):
        """Open file dialog to select .md files and import them."""
        result = self.open_files_dialog(
            'Importar notas Markdown',
            ('Markdown', '*.md')
        )
        if not result or not result.get('success') or not result.get('paths'):
            return {"success": False, "imported": 0}
        paths = result['paths']
        imported = 0
        errors = 0
        for p in paths:
            try:
                note = db_import_note_from_file(p)
                if note:
                    imported += 1
                else:
                    errors += 1
            except Exception:
                errors += 1
        return {"success": True, "imported": imported, "errors": errors, "total": len(paths)}

    def get_note_word_count(self, note_id):
        """Return word/character/line stats for a note."""
        return db_get_note_word_count(note_id)

    def get_all_tags(self):
        """Return all unique tags across notes with counts."""
        return db_get_all_tags()

    def duplicate_note(self, note_id):
        """Duplicate a note and its children. Returns the new parent note."""
        return db_duplicate_note(note_id)

    # ============================================
    # SESSIONS (Pomodoro)
    # ============================================

    def log_session(self, session_type, duration_seconds, planned_minutes=25):
        return log_session(session_type, duration_seconds, planned_minutes)

    def get_sessions(self):
        return db_get_sessions()

    def get_today_sessions(self):
        from database import _get_connection, _rows_to_dicts
        today = time.strftime('%Y-%m-%d', time.localtime())
        try:
            conn = _get_connection()
            rows = conn.execute(
                "SELECT * FROM sessions WHERE date = ? ORDER BY created_at DESC", (today,)
            ).fetchall()
            return _rows_to_dicts(rows)
        except Exception:
            return []

    def get_week_sessions(self):
        from database import _get_connection, _rows_to_dicts
        week_ago = time.strftime('%Y-%m-%d', time.localtime(time.time() - 7 * 86400))
        try:
            conn = _get_connection()
            rows = conn.execute(
                "SELECT * FROM sessions WHERE date >= ? ORDER BY created_at DESC", (week_ago,)
            ).fetchall()
            return _rows_to_dicts(rows)
        except Exception:
            return []

    def get_sessions_stats(self):
        return get_session_stats()

    def get_activity_calendar(self, days=90):
        return get_activity_calendar(days)

    def clear_sessions_history(self):
        return clear_session_history()

    def delete_session(self, session_id):
        return delete_session(session_id)

    # ============================================
    # TASKS
    # ============================================

    def get_tasks(self, state_filter=None, category_filter=None, priority_filter=None):
        return db_get_tasks(
            status_filter=state_filter,
            project_filter=category_filter,
            priority_filter=priority_filter,
        )

    def get_task(self, task_id):
        return get_task(task_id)

    def create_task(self, title="", description="", status="todo", priority="medium", category_id="general", due_date=None):
        return create_task(
            title,
            description,
            status=status,
            priority=priority,
            project=category_id,
            due_date=due_date or '',
        )

    def update_task(self, task_id, title=None, description=None, state=None, priority=None, category_id=None, due_date=None):
        kwargs = {}
        if title is not None:
            kwargs['title'] = title
        if description is not None:
            kwargs['description'] = description
        if state is not None:
            kwargs['status'] = state
        if priority is not None:
            kwargs['priority'] = priority
        if category_id is not None:
            kwargs['project'] = category_id
        if due_date is not None:
            kwargs['due_date'] = due_date
        return update_task(task_id, **kwargs)

    def delete_task(self, task_id):
        return delete_task(task_id)

    def get_tasks_stats(self):
        return get_task_stats()

    def get_tasks_categories(self):
        return TASKS_CATEGORIES

    def get_tasks_priorities(self):
        return [{"id": p, "name": p.capitalize()} for p in TASKS_PRIORITIES]

    def get_tasks_states(self):
        return [{"id": s, "name": s.replace("_", " ").capitalize()} for s in TASKS_STATES]

    # ============================================
    # DOCS
    # ============================================

    def get_docs(self, category_filter=None, search_query=None):
        return get_doc_links(category_filter, search_query)

    def get_doc(self, doc_id):
        return get_doc_link(doc_id)

    def add_doc(self, name, url, desc="", category="custom", icon="", icon_path=""):
        """Agregar un doc link.

        Args:
            name: Nombre visible.
            url: URL del recurso.
            desc: Descripcion corta.
            category: Categoria.
            icon: Emoji/icon name.
            icon_path: Favicon como data URI (data:image/png;base64,...).
        """
        return add_doc_link(name, url, category, desc, icon_name=icon, icon_path=icon_path)

    def update_doc(self, doc_id, name=None, url=None, desc=None, category=None, icon=None, icon_path=None):
        """Update a doc link. All parameters are optional.

        Args:
            doc_id: The doc link ID.
            name: Display name.
            url: Target URL.
            desc: Short description.
            category: Category string.
            icon: Icon name/emoji.
            icon_path: Base64 PNG data for favicon (maps to DB icon_path column).
        """
        kwargs = {}
        if name is not None:
            kwargs['name'] = name
        if url is not None:
            kwargs['url'] = url
        if desc is not None:
            kwargs['description'] = desc
        if category is not None:
            kwargs['category'] = category
        if icon is not None:
            kwargs['icon_name'] = icon
        if icon_path is not None:
            kwargs['icon_path'] = icon_path
        return update_doc_link(doc_id, **kwargs)

    def delete_doc(self, doc_id):
        return delete_doc_link(doc_id)

    def get_docs_categories(self):
        return get_doc_link_categories()

    def get_docs_stats(self):
        return get_doc_link_stats()

    # --- Docs QoL: Favicon + Iconos locales ---

    def download_doc_favicon(self, url):
        """Descarga el favicon de una URL usando 2 metodos.

        Metodo 1: Google Favicon Service.
        Metodo 2: Direct download de /favicon.ico.

        Returns:
            {"success": bool, "icon_path": str, "method": str}
        """
        from favicon_downloader import download_favicon
        return download_favicon(url)

    def batch_download_favicons(self, doc_ids_and_urls):
        """Descarga favicons para multiples docs en paralelo.

        Args:
            doc_ids_and_urls: Lista de [{"id": ..., "url": ...}, ...]

        Returns:
            Dict de {id: "data:image/...;base64,..." | ""}
        """
        from favicon_downloader import batch_download_favicons
        return batch_download_favicons(doc_ids_and_urls)

    def get_local_icons(self):
        """Retorna ~50 iconos locales organizados por categoria.

        Returns:
            Lista de dicts: [{"id", "emoji", "name", "category"}, ...]
        """
        from icon_library import get_all_icons
        return get_all_icons()

    def get_local_icon_categories(self):
        """Retorna las categorias de iconos locales.

        Returns:
            Lista de dicts: [{"id", "name", "icon"}, ...]
        """
        from icon_library import get_categories
        return get_categories()

    def get_category_default_icon(self, category):
        """Retorna el icono por defecto para una categoria de doc.

        Returns:
            Emoji string.
        """
        from icon_library import get_default_icon_for_category
        return get_default_icon_for_category(category)

    def set_doc_icon(self, doc_id, icon_path="", icon_name=""):
        """Establece el icono de un doc (favicon o emoji).

        Args:
            doc_id: ID del doc.
            icon_path: Favicon como data URI (base64).
            icon_name: Emoji string.
        """
        kwargs = {}
        if icon_path is not None:
            kwargs['icon_path'] = icon_path
        if icon_name is not None:
            kwargs['icon_name'] = icon_name
        return update_doc_link(doc_id, **kwargs)

    # ============================================
    # APP USAGE STATS
    # ============================================

    def get_app_usage_stats(self):
        """Return aggregated app usage stats (today, week, all-time)."""
        return db_get_app_usage_stats()

    def get_app_usage_history(self, limit=50, launcher_id=None):
        """Return recent usage history entries."""
        return get_app_usage_history(limit, launcher_id)

    def get_app_usage_active(self):
        """Return list of currently running (tracked) apps."""
        return get_app_usage_active()

    def clear_app_usage_history(self, launcher_id=None):
        """Delete usage history. Optionally for a specific launcher."""
        return delete_app_usage_history(launcher_id)

    # ============================================
    # RECENT NOTES
    # ============================================

    def get_recent_notes(self):
        """Return the 10 most recently updated notes."""
        conn = None
        try:
            from database import _get_connection, _rows_to_dicts
            conn = _get_connection()
            rows = conn.execute(
                """SELECT id, title, color_id, updated_at, is_favorite, pinned
                   FROM notes
                   ORDER BY updated_at DESC
                   LIMIT 10"""
            ).fetchall()
            return _rows_to_dicts(rows)
        except Exception:
            return []

    # ============================================
    # FOREGROUND WINDOW DETECTION (Windows)
    # ============================================

    def get_foreground_window_info(self):
        """Return info about the currently focused window (Windows only).
        
        Uses pure Win32 ctypes API — NO subprocess calls.
        This avoids CMD window flashing when compiled to EXE with PyInstaller.
        """
        import platform
        if platform.system() != 'Windows':
            return {"app_name": "N/A", "window_title": "N/A", "platform": platform.system()}
        try:
            import ctypes
            import ctypes.wintypes as wintypes

            # Get foreground window handle
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if not hwnd:
                return {"app_name": "Unknown", "window_title": "Unknown"}

            # Get window title
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                window_title = buf.value
            else:
                window_title = ""

            # Get process ID from window
            pid = ctypes.wintypes.DWORD()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

            # Get process name using pure ctypes (NO subprocess/tasklist)
            # This avoids CMD window flashing in compiled EXE
            app_name = "Unknown"
            try:
                PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
                handle = ctypes.windll.kernel32.OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value
                )
                if handle:
                    try:
                        # Try QueryFullProcessImageNameW first (most reliable)
                        buf_size = ctypes.wintypes.DWORD(1024)
                        exe_buf = ctypes.create_unicode_buffer(1024)
                        success = ctypes.windll.kernel32.QueryFullProcessImageNameW(
                            handle, 0, exe_buf, ctypes.byref(buf_size)
                        )
                        if success and exe_buf.value:
                            app_name = os.path.basename(exe_buf.value)
                        else:
                            # Fallback: GetModuleFileNameExW
                            try:
                                exe_buf2 = ctypes.create_unicode_buffer(1024)
                                ctypes.windll.psapi.GetModuleFileNameExW(
                                    handle, None, exe_buf2, 1024
                                )
                                if exe_buf2.value:
                                    app_name = os.path.basename(exe_buf2.value)
                            except Exception:
                                pass
                    except Exception:
                        pass
                    finally:
                        ctypes.windll.kernel32.CloseHandle(handle)
            except Exception:
                pass

            return {
                "app_name": app_name,
                "window_title": window_title,
                "pid": pid.value
            }
        except Exception as e:
            return {"app_name": "Error", "window_title": str(e), "error": True}

    # ============================================
    # QUICK NOTES
    # ============================================

    def get_quick_notes(self):
        return get_quick_notes()

    # ============================================
    # FLOWCHARTS
    # ============================================

    def get_flowcharts(self, project=None):
        from database import get_flowcharts
        return get_flowcharts(project)

    def get_flowchart(self, flowchart_id):
        from database import get_flowchart
        return get_flowchart(flowchart_id)

    def create_flowchart(self, name, data, project='', template=''):
        from database import create_flowchart
        return create_flowchart(name, data, project, template)

    def update_flowchart(self, flowchart_id, name=None, data=None, project=None, template=None):
        from database import update_flowchart
        kwargs = {}
        if name is not None:
            kwargs['name'] = name
        if data is not None:
            kwargs['data'] = data
        if project is not None:
            kwargs['project'] = project
        if template is not None:
            kwargs['template'] = template
        return update_flowchart(flowchart_id, **kwargs)

    def delete_flowchart(self, flowchart_id):
        from database import delete_flowchart
        return delete_flowchart(flowchart_id)

    # ============================================
    # SETTINGS
    # ============================================

    def get_setting(self, key, default=None):
        return get_setting(key, default)

    def set_setting(self, key, value):
        return set_setting(key, value)

    def reload_hotkeys(self):
        """Re-read shortcuts from SQLite and re-register global hotkeys.
        Called from frontend after the user changes a shortcut."""
        try:
            from global_hotkeys import reload_global_hotkeys
            reload_global_hotkeys()
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ============================================
    # KEYBOARD SHORTCUTS (dedicated, bypasses get_setting type coercion)
    # ============================================

    def get_keyboard_shortcuts(self):
        """Return keyboard shortcuts as a raw JSON string.
        Bypasses get_setting's int/float/bool type coercion
        to ensure JSON strings are returned as-is."""
        try:
            from database import _get_connection, set_setting, get_setting
            conn = _get_connection()
            row = conn.execute(
                "SELECT value FROM settings WHERE key = ?",
                ('keyboard_shortcuts',)
            ).fetchone()
            if row and row['value']:
                val = str(row['value'])
                if len(val) > 2:
                    print(f"[shortcuts] Loaded from SQLite ({len(val)} chars)")
                    return val
        except Exception as e:
            print(f"[shortcuts] Error loading: {e}")
        print("[shortcuts] No saved shortcuts found, will use defaults")
        return ""

    def set_keyboard_shortcuts(self, json_string):
        """Save keyboard shortcuts as a raw JSON string directly to SQLite.
        Uses both direct SQL and set_setting as fallback to ensure persistence.
        Also WAL-checkpoints to guarantee data reaches the main DB file."""
        try:
            # Ensure we have a proper string
            json_string = str(json_string)
            from database import _get_connection
            conn = _get_connection()
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                ('keyboard_shortcuts', json_string),
            )
            conn.commit()
            # Force WAL checkpoint so data reaches main DB file before any _os._exit
            try:
                conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            except Exception:
                pass
            # Verify the save immediately
            verify = conn.execute(
                "SELECT value FROM settings WHERE key = ?",
                ('keyboard_shortcuts',)
            ).fetchone()
            if verify and verify['value'] == json_string:
                print(f"[shortcuts] Saved and verified ({len(json_string)} chars)")
                return {"success": True, "verified": True}
            else:
                print(f"[shortcuts] Saved but verification mismatch")
                return {"success": True, "verified": False}
        except Exception as e:
            print(f"[shortcuts] Save error: {e}")
            return {"success": False, "message": str(e)}

    # ============================================
    # UTILIDADES
    # ============================================

    def open_file_dialog(self, title="Seleccionar archivo", file_types=None):
        """
        Abre un explorador de archivos nativo (single selection).
        Metodo 1: Win32 API (ctypes) en Windows — mas robusto en EXE compilados
        Metodo 2: tkinter como fallback

        Retorna {"success": True, "path": ruta} o {"success": False, ...}
        """
        # Parsear file_types a lista de filtros
        def _parse_filters(ft):
            """Retorna lista de (descripcion, filtro) tuples."""
            if ft is None:
                return [("Ejecutables", "*.exe *.bat *.cmd *.msi"), ("Todos", "*.*")]
            elif isinstance(ft, str):
                return [("Archivos", ft), ("Todos", "*.*")]
            elif isinstance(ft, (list, tuple)):
                if len(ft) == 2 and isinstance(ft[0], str) and isinstance(ft[1], (list, tuple)):
                    return [(str(ft[0]), " ".join(str(e) for e in ft[1])), ("Todos", "*.*")]
                elif all(isinstance(e, str) for e in ft):
                    return [("Archivos", " ".join(ft)), ("Todos", "*.*")]
            return [("Todos", "*.*")]

        filters = _parse_filters(file_types)

        # --- Metodo 1: Win32 API (Windows) ---
        import platform
        if platform.system() == 'Windows':
            try:
                result = self._win32_open_file_dialog(title, filters)
                if result is not None:
                    return result
            except Exception as e:
                print(f"[open_file_dialog] Win32 fallback failed: {e}")

        # --- Metodo 2: tkinter ---
        try:
            import tkinter as tk
            from tkinter import filedialog

            tk_filetypes = [(desc, filt) for desc, filt in filters]

            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

            try:
                file_path = filedialog.askopenfilename(
                    title=title,
                    filetypes=tk_filetypes
                )
            finally:
                root.destroy()

            if file_path:
                return {"success": True, "path": file_path}
            return {"success": False, "path": None, "cancelled": True}

        except Exception as e:
            print(f"[open_file_dialog] Error: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def _win32_open_file_dialog(title, filters):
        """Win32 GetOpenFileName API via ctypes. Retorna dict o None."""
        import ctypes
        import ctypes.wintypes as wintypes

        # CoInitialize for COM
        try:
            ctypes.oledll.ole32.CoInitialize(None)
        except Exception:
            pass

        OPENFILENAME = ctypes.Structure if not hasattr(ctypes, 'Structure') else ctypes.Structure

        class OPENFILENAMEW(ctypes.Structure):
            _fields_ = [
                ('lStructSize', wintypes.DWORD),
                ('hwndOwner', wintypes.HWND),
                ('hInstance', wintypes.HINSTANCE),
                ('lpstrFilter', wintypes.LPCWSTR),
                ('lpstrCustomFilter', wintypes.LPWSTR),
                ('nMaxCustFilter', wintypes.DWORD),
                ('nFilterIndex', wintypes.DWORD),
                ('lpstrFile', wintypes.LPWSTR),
                ('nMaxFile', wintypes.DWORD),
                ('lpstrFileTitle', wintypes.LPWSTR),
                ('nMaxFileTitle', wintypes.DWORD),
                ('lpstrInitialDir', wintypes.LPCWSTR),
                ('lpstrTitle', wintypes.LPCWSTR),
                ('Flags', wintypes.DWORD),
                ('nFileOffset', wintypes.WORD),
                ('nFileExtension', wintypes.WORD),
                ('lpstrDefExt', wintypes.LPCWSTR),
                ('lCustData', wintypes.LPARAM),
                ('lpfnHook', ctypes.c_void_p),
                ('lpTemplateName', wintypes.LPCWSTR),
                ('pvReserved', ctypes.c_void_p),
                ('dwReserved', wintypes.DWORD),
                ('FlagsEx', wintypes.DWORD),
            ]

        ofn = OPENFILENAMEW()
        ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
        ofn.nMaxFile = 4096
        ofn.lpstrFile = ctypes.create_unicode_buffer(4096)
        ofn.Flags = 0x00001000  # OFN_EXPLORER
        ofn.lpstrTitle = title

        # Build filter string: "Desc\0*.ext\0Desc2\0*.ext2\0\0"
        filter_parts = []
        for desc, filt in filters:
            # Convert "Archivos", "*.exe *.bat" → "Archivos (*.exe;*.bat)"
            exts = filt.replace(" ", ";")
            filter_parts.append(f"{desc} ({exts})")
            filter_parts.append(exts)
        filter_str = "\0".join(filter_parts) + "\0\0"
        ofn.lpstrFilter = filter_str

        try:
            GetOpenFileName = ctypes.windll.comdlg32.GetOpenFileNameW
            GetOpenFileName.argtypes = [ctypes.POINTER(OPENFILENAMEW)]
            GetOpenFileName.restype = wintypes.BOOL

            if GetOpenFileName(ctypes.byref(ofn)):
                return {"success": True, "path": ofn.lpstrFile.value}
            else:
                return {"success": False, "path": None, "cancelled": True}
        except Exception as e:
            return None

    def open_files_dialog(self, title="Seleccionar archivos", file_types=None):
        """
        Open a native file dialog that allows selecting MULTIPLE files.
        Win32: uses OFN_ALLOWMULTISELECT flag.
        tkinter: uses filedialog.askopenfilenames (plural).

        Returns {"success": True, "paths": [path1, path2, ...]} or {"success": False, ...}
        """
        def _parse_filters(ft):
            if ft is None:
                return [("Todos", "*.*")]
            elif isinstance(ft, str):
                return [("Archivos", ft), ("Todos", "*.*")]
            elif isinstance(ft, (list, tuple)):
                if len(ft) == 2 and isinstance(ft[0], str) and isinstance(ft[1], (list, tuple)):
                    return [(str(ft[0]), " ".join(str(e) for e in ft[1])), ("Todos", "*.*")]
                elif all(isinstance(e, str) for e in ft):
                    return [("Archivos", " ".join(ft)), ("Todos", "*.*")]
            return [("Todos", "*.*")]

        filters = _parse_filters(file_types)

        # --- Win32 API (Windows) ---
        import platform
        if platform.system() == 'Windows':
            try:
                result = self._win32_open_files_dialog(title, filters)
                if result is not None:
                    return result
            except Exception as e:
                print(f"[open_files_dialog] Win32 failed: {e}")

        # --- tkinter fallback ---
        try:
            import tkinter as tk
            from tkinter import filedialog

            tk_filetypes = [(desc, filt) for desc, filt in filters]

            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

            try:
                file_paths = filedialog.askopenfilenames(
                    title=title,
                    filetypes=tk_filetypes
                )
            finally:
                root.destroy()

            if file_paths:
                return {"success": True, "paths": list(file_paths)}
            return {"success": False, "paths": [], "cancelled": True}
        except Exception as e:
            print(f"[open_files_dialog] Error: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def _win32_open_files_dialog(title, filters):
        """Win32 GetOpenFileName with OFN_ALLOWMULTISELECT. Returns dict or None."""
        import ctypes
        import ctypes.wintypes as wintypes

        try:
            ctypes.oledll.ole32.CoInitialize(None)
        except Exception:
            pass

        class OPENFILENAMEW(ctypes.Structure):
            _fields_ = [
                ('lStructSize', wintypes.DWORD),
                ('hwndOwner', wintypes.HWND),
                ('hInstance', wintypes.HINSTANCE),
                ('lpstrFilter', wintypes.LPCWSTR),
                ('lpstrCustomFilter', wintypes.LPWSTR),
                ('nMaxCustFilter', wintypes.DWORD),
                ('nFilterIndex', wintypes.DWORD),
                ('lpstrFile', wintypes.LPWSTR),
                ('nMaxFile', wintypes.DWORD),
                ('lpstrFileTitle', wintypes.LPWSTR),
                ('nMaxFileTitle', wintypes.DWORD),
                ('lpstrInitialDir', wintypes.LPCWSTR),
                ('lpstrTitle', wintypes.LPCWSTR),
                ('Flags', wintypes.DWORD),
                ('nFileOffset', wintypes.WORD),
                ('nFileExtension', wintypes.WORD),
                ('lpstrDefExt', wintypes.LPCWSTR),
                ('lCustData', wintypes.LPARAM),
                ('lpfnHook', ctypes.c_void_p),
                ('lpTemplateName', wintypes.LPCWSTR),
                ('pvReserved', ctypes.c_void_p),
                ('dwReserved', wintypes.DWORD),
                ('FlagsEx', wintypes.DWORD),
            ]

        OFN_EXPLORER = 0x00001000
        OFN_ALLOWMULTISELECT = 0x00000200

        ofn = OPENFILENAMEW()
        ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
        ofn.nMaxFile = 32768  # Larger buffer for multiple files
        ofn.lpstrFile = ctypes.create_unicode_buffer(32768)
        ofn.Flags = OFN_EXPLORER | OFN_ALLOWMULTISELECT
        ofn.lpstrTitle = title

        # Build filter string
        filter_parts = []
        for desc, filt in filters:
            exts = filt.replace(" ", ";")
            filter_parts.append(f"{desc} ({exts})")
            filter_parts.append(exts)
        filter_str = "\0".join(filter_parts) + "\0\0"
        ofn.lpstrFilter = filter_str

        try:
            GetOpenFileName = ctypes.windll.comdlg32.GetOpenFileNameW
            GetOpenFileName.argtypes = [ctypes.POINTER(OPENFILENAMEW)]
            GetOpenFileName.restype = wintypes.BOOL

            if GetOpenFileName(ctypes.byref(ofn)):
                raw = ofn.lpstrFile.value
                # When multiple files are selected, the buffer contains:
                #   "dir_path\0file1\0file2\0\0"
                # When a single file is selected:
                #   "full_path\0\0"
                null_pos = raw.find('\0')
                if null_pos == -1 or null_pos == len(raw) - 1:
                    # Single file
                    return {"success": True, "paths": [raw.rstrip('\0')]}
                else:
                    # Multiple files: first part is the directory
                    dir_path = raw[:null_pos]
                    rest = raw[null_pos + 1:]
                    if not rest:
                        # Only one file was selected (directory ending with null)
                        return {"success": True, "paths": [dir_path]}
                    paths = []
                    for part in rest.split('\0'):
                        if part:
                            paths.append(os.path.join(dir_path, part))
                    if not paths:
                        return {"success": False, "paths": [], "cancelled": True}
                    return {"success": True, "paths": paths}
            else:
                return {"success": False, "paths": [], "cancelled": True}
        except Exception as e:
            return None

    def open_url(self, url):
        """Abrir URL en el navegador por defecto del sistema."""
        try:
            webbrowser.open(url)
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ============================================
    # AUTOSTART (Iniciar con Windows)
    # ============================================

    def _get_real_exe_path(self):
        """Get the real executable path, whether running from source or from PyInstaller bundle.

        When compiled with PyInstaller (onedir mode), sys.argv[0] points to a temp _MEI path
        that no longer exists after extraction. sys.executable always points to the real .exe.
        When running from source (.py), sys.executable points to python.exe, so we fall back
        to sys.argv[0].
        """
        frozen = getattr(sys, 'frozen', False)
        if frozen:
            return sys.executable
        # Running from source: use the script path
        exe_path = os.path.abspath(sys.argv[0])
        if exe_path.endswith('.py') or exe_path.endswith('.pyw'):
            exe_path = os.path.join(os.path.dirname(exe_path), 'DevTools.exe')
        return exe_path

    def get_autostart(self):
        """Check if the app is set to start with Windows."""
        import platform
        if platform.system() != 'Windows':
            return {"enabled": False, "platform": platform.system()}
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_READ)
            value, _ = winreg.QueryValueEx(key, "GameDevHub")
            winreg.CloseKey(key)
            enabled = bool(value and value.strip())
            # Also validate the path exists
            if enabled:
                reg_path = value.strip().strip('"').strip()
                if not os.path.exists(reg_path):
                    # Path is invalid — clean up the stale registry entry
                    try:
                        key2 = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
                        winreg.DeleteValue(key2, "GameDevHub")
                        winreg.CloseKey(key2)
                    except Exception:
                        pass
                    enabled = False
            return {"enabled": enabled}
        except (FileNotFoundError, OSError):
            return {"enabled": False}

    def set_autostart(self, enable=True):
        """Enable or disable start with Windows via registry."""
        import platform
        if platform.system() != 'Windows':
            return {"success": False, "message": "Solo disponible en Windows"}
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
            if enable:
                exe_path = self._get_real_exe_path()
                if not os.path.exists(exe_path):
                    return {"success": False, "message": f"No se encontro el ejecutable: {exe_path}"}
                # Use short path (8.3) to avoid issues with spaces in registry
                winreg.SetValueEx(key, "GameDevHub", 0, winreg.REG_SZ, f'"{exe_path}"')
            else:
                try:
                    winreg.DeleteValue(key, "GameDevHub")
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
            return {"success": True, "enabled": enable, "path": exe_path if enable else None}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_version(self):
        return {"version": "0.9.6", "phase": "1"}

    # ============================================
    # RESET ALL DATA
    # ============================================

    def reset_all_data(self):
        """Delete ALL data from the database (notes, sessions, tasks, docs, etc)."""
        ok = reset_all_data()
        # After reset, reload global hotkeys so Python picks up the empty DB
        # (user shortcuts are gone; defaults will be used on next load)
        try:
            from global_hotkeys import stop_global_hotkeys, reload_global_hotkeys
            stop_global_hotkeys()
            time.sleep(0.2)
            reload_global_hotkeys()
        except Exception as e:
            print(f"[reset_all_data] Failed to reload hotkeys: {e}")
        return {"success": ok}

    # ============================================
    # SAVE FILE DIALOG (for exports)
    # ============================================

    def save_file_dialog(self, title="Guardar como", default_name="export.png", file_types=None):
        """Open a native Save As file dialog.
        Returns {"success": True, "path": ruta} or {"success": False, ...}
        """
        def _parse_save_filters(ft):
            if ft is None:
                return [("PNG Image", "*.png"), ("Todos", "*.*")]
            elif isinstance(ft, str):
                return [("Archivo", ft), ("Todos", "*.*")]
            elif isinstance(ft, (list, tuple)):
                if len(ft) == 2 and isinstance(ft[0], str) and isinstance(ft[1], (list, tuple)):
                    return [(str(ft[0]), " ".join(str(e) for e in ft[1])), ("Todos", "*.*")]
            return [("Todos", "*.*")]

        filters = _parse_save_filters(file_types)

        import platform
        if platform.system() == 'Windows':
            try:
                result = self._win32_save_file_dialog(title, default_name, filters)
                if result is not None:
                    return result
            except Exception as e:
                print(f"[save_file_dialog] Win32 failed: {e}")

        # Fallback: tkinter
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)

            tk_filetypes = [(desc, filt) for desc, filt in filters]

            try:
                # Determine initial dir from default_name
                initialdir = None
                initialfile = default_name

                # Extract clean default extension (e.g. ".md")
                default_ext = ".*"
                if filters:
                    raw = filters[0][1].split()[-1]  # e.g. "*.md"
                    default_ext = "." + raw.replace("*", "").lstrip(".")

                file_path = filedialog.asksaveasfilename(
                    title=title,
                    initialfile=initialfile,
                    initialdir=initialdir,
                    filetypes=tk_filetypes,
                    defaultextension=default_ext
                )
            finally:
                root.destroy()

            if file_path:
                return {"success": True, "path": file_path}
            return {"success": False, "path": None, "cancelled": True}
        except Exception as e:
            print(f"[save_file_dialog] Error: {e}")
            return {"success": False, "message": str(e)}

    @staticmethod
    def _win32_save_file_dialog(title, default_name, filters):
        """Win32 GetSaveFileName API via ctypes."""
        import ctypes
        import ctypes.wintypes as wintypes

        try:
            ctypes.oledll.ole32.CoInitialize(None)
        except Exception:
            pass

        class OPENFILENAMEW(ctypes.Structure):
            _fields_ = [
                ('lStructSize', wintypes.DWORD),
                ('hwndOwner', wintypes.HWND),
                ('hInstance', wintypes.HINSTANCE),
                ('lpstrFilter', wintypes.LPCWSTR),
                ('lpstrCustomFilter', wintypes.LPWSTR),
                ('nMaxCustFilter', wintypes.DWORD),
                ('nFilterIndex', wintypes.DWORD),
                ('lpstrFile', wintypes.LPWSTR),
                ('nMaxFile', wintypes.DWORD),
                ('lpstrFileTitle', wintypes.LPWSTR),
                ('nMaxFileTitle', wintypes.DWORD),
                ('lpstrInitialDir', wintypes.LPCWSTR),
                ('lpstrTitle', wintypes.LPCWSTR),
                ('Flags', wintypes.DWORD),
                ('nFileOffset', wintypes.WORD),
                ('nFileExtension', wintypes.WORD),
                ('lpstrDefExt', wintypes.LPCWSTR),
                ('lCustData', wintypes.LPARAM),
                ('lpfnHook', ctypes.c_void_p),
                ('lpTemplateName', wintypes.LPCWSTR),
                ('pvReserved', ctypes.c_void_p),
                ('dwReserved', wintypes.DWORD),
                ('FlagsEx', wintypes.DWORD),
            ]

        ofn = OPENFILENAMEW()
        ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
        ofn.nMaxFile = 4096

        # Properly set initial filename using buf.value (null-terminated)
        buf = ctypes.create_unicode_buffer(4096)
        buf.value = default_name
        ofn.lpstrFile = buf

        ofn.Flags = 0x00001000  # OFN_EXPLORER
        ofn.lpstrTitle = title

        # Build filter string
        filter_parts = []
        for desc, filt in filters:
            exts = filt.replace(" ", ";")
            filter_parts.append(f"{desc} ({exts})")
            filter_parts.append(exts)
        filter_str = "\0".join(filter_parts) + "\0\0"
        ofn.lpstrFilter = filter_str

        # Default extension (Win32 expects WITHOUT leading dot, e.g. "md" not ".md")
        if filters:
            ext = filters[0][1].split()[-1].replace("*", "").lstrip(".")
            ofn.lpstrDefExt = ext

        try:
            GetSaveFileName = ctypes.windll.comdlg32.GetSaveFileNameW
            GetSaveFileName.argtypes = [ctypes.POINTER(OPENFILENAMEW)]
            GetSaveFileName.restype = wintypes.BOOL

            if GetSaveFileName(ctypes.byref(ofn)):
                return {"success": True, "path": ofn.lpstrFile.value}
            else:
                return {"success": False, "path": None, "cancelled": True}
        except Exception as e:
            return None

    def export_note_to_file(self, file_path, title, content, file_format='md'):
        """Export a note to a file.

        The frontend builds complete content (YAML front matter for .md, or
        metadata header for .txt). This method simply writes *content* as-is
        and ensures a trailing newline.

        Returns {"success": True} or {"success": False, "message": ...}
        """
        try:
            text = (content or '').rstrip('\n') + '\n'
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(text)
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # ============================================
    # BACKEND TIMER STATE (persists across sections)
    # ============================================

    # Timer state stored in backend so it survives section navigation
    _timer_state = {
        'running': False,
        'seconds': 25 * 60,
        'mode': 'pomodoro',
        'preset_minutes': 25,
        'preset_total_seconds': 25 * 60,
        'total_focus_seconds': 0,
        'pomodoro_count': 0,
        'start_time': None,  # ISO string of when timer was started
    }

    def timer_get_state(self):
        """Get the current timer state from the backend."""
        state = dict(self._timer_state)
        # If running, compute elapsed time
        if state['running'] and state['start_time']:
            try:
                import datetime as dt
                # Limpiar sufijo 'Z' si existe — timer_start() guarda hora local
                # sin timezone, asi que debemos parsear como hora local tambien.
                raw = state['start_time'].replace('Z', '').replace('+00:00', '')
                if '+' in raw and raw.index('+') > 10:
                    raw = raw[:raw.index('+')]
                start = dt.datetime.fromisoformat(raw)
                now = dt.datetime.now()  # Hora local (sin timezone)
                elapsed = int((now - start).total_seconds())
                if state['mode'] == 'free':
                    computed = elapsed
                else:
                    computed = max(0, state['seconds'] - elapsed)
                state['display_seconds'] = computed
            except Exception:
                state['display_seconds'] = state['seconds']
        else:
            state['display_seconds'] = state['seconds']
        return state

    def timer_start(self, seconds, mode, preset_minutes, total_focus_seconds, pomodoro_count, preset_total_seconds=None):
        """Start the timer in the backend."""
        import datetime
        self._timer_state['running'] = True
        self._timer_state['seconds'] = seconds
        self._timer_state['mode'] = mode
        self._timer_state['preset_minutes'] = preset_minutes
        self._timer_state['total_focus_seconds'] = total_focus_seconds
        self._timer_state['pomodoro_count'] = pomodoro_count
        self._timer_state['start_time'] = datetime.datetime.now().isoformat()
        if preset_total_seconds is not None:
            self._timer_state['preset_total_seconds'] = preset_total_seconds
        return {"success": True}

    def timer_stop(self):
        """Stop/pause the timer, returning the current state."""
        import datetime
        state = self.timer_get_state()
        if state['running']:
            try:
                # Limpiar sufijo Z si existe para parsear como hora local
                raw = self._timer_state['start_time'].replace('Z', '').replace('+00:00', '')
                if '+' in raw and raw.index('+') > 10:
                    raw = raw[:raw.index('+')]
                start = datetime.datetime.fromisoformat(raw)
                elapsed = int((datetime.datetime.now() - start).total_seconds())
                if self._timer_state['mode'] == 'free':
                    self._timer_state['total_focus_seconds'] += elapsed
                self._timer_state['seconds'] = state['display_seconds']
            except Exception:
                pass
        self._timer_state['running'] = False
        self._timer_state['start_time'] = None
        return {"success": True, "seconds": self._timer_state['seconds'],
                "total_focus_seconds": self._timer_state['total_focus_seconds']}

    def timer_reset(self):
        """Reset the timer state."""
        self._timer_state['running'] = False
        pts = self._timer_state.get('preset_total_seconds', self._timer_state['preset_minutes'] * 60)
        self._timer_state['seconds'] = pts if self._timer_state['mode'] != 'free' else 0
        self._timer_state['total_focus_seconds'] = 0
        self._timer_state['start_time'] = None
        return {"success": True, "seconds": self._timer_state['seconds']}

    def timer_set_mode(self, mode, preset_minutes, preset_total_seconds=None):
        """Change timer mode (only when not running)."""
        if self._timer_state['running']:
            return {"success": False, "message": "Cannot change mode while running"}
        self._timer_state['mode'] = mode
        self._timer_state['preset_minutes'] = preset_minutes
        self._timer_state['total_focus_seconds'] = 0
        if preset_total_seconds is not None:
            self._timer_state['preset_total_seconds'] = preset_total_seconds
            self._timer_state['seconds'] = 0 if mode == 'free' else preset_total_seconds
        else:
            self._timer_state['preset_total_seconds'] = 0 if mode == 'free' else preset_minutes * 60
            self._timer_state['seconds'] = self._timer_state['preset_total_seconds']
        return {"success": True, "seconds": self._timer_state['seconds']}

    def show_timer_notification(self, title, message):
        """Show a Tkinter popup notification when timer completes.
        Style: dark glassmorphism similar to QuickNotes.
        Auto-dismisses after 3 seconds or on click.
        Runs in a background thread to avoid blocking.
        """
        import threading
        thread = threading.Thread(
            target=self._timer_popup_thread,
            args=(title, message),
            daemon=True,
        )
        thread.start()
        return {"success": True}

    @staticmethod
    def _play_notification_sound():
        """Play a system-level notification sound. Works even if app is not focused.
        Uses winsound on Windows (non-blocking, proper WAV), falls back to terminal bell."""
        try:
            import platform
            if platform.system() == 'Windows':
                try:
                    import winsound
                    import struct
                    import wave
                    import tempfile
                    import os

                    # Generate a WAV file in memory with a pleasant alarm sequence
                    sr = 22050  # sample rate
                    notes_sequence = [
                        (523.25, 0.15), (0, 0.05),     # C5
                        (659.25, 0.15), (0, 0.05),     # E5
                        (783.99, 0.15), (0, 0.05),     # G5
                        (783.99, 0.15), (0, 0.10),     # G5 (hold)
                        (1046.50, 0.30),               # C6 (high accent)
                        (0, 0.20),
                        (523.25, 0.15), (0, 0.05),     # C5 repeat
                        (783.99, 0.25),               # G5
                    ]

                    samples = []
                    for freq, dur in notes_sequence:
                        n_samples = int(sr * dur)
                        if freq == 0:
                            samples.extend([0] * n_samples)
                        else:
                            for i in range(n_samples):
                                t = i / sr
                                # Sine wave with envelope (attack/release)
                                env = 1.0
                                attack = 0.01
                                release = min(0.05, dur * 0.3)
                                if t < attack:
                                    env = t / attack
                                elif t > dur - release:
                                    env = (dur - t) / release
                                val = int(16000 * env * (0.6 * __import__('math').sin(2 * __import__('math').pi * freq * t) + 0.4 * __import__('math').sin(2 * __import__('math').pi * freq * 2 * t)))
                                samples.append(max(-32768, min(32767, val)))

                    # Write WAV to temp file
                    tmp_path = os.path.join(tempfile.gettempdir(), 'devtools_alarm.wav')
                    with wave.open(tmp_path, 'w') as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(sr)
                        wf.writeframes(struct.pack(f'<{len(samples)}h', *samples))

                    # Play asynchronously so it doesn't block the popup
                    winsound.PlaySound(tmp_path, winsound.SND_FILENAME | winsound.SND_ASYNC)
                except Exception:
                    pass
            else:
                # Fallback: terminal bell (3 beeps)
                print('\a', end='', flush=True)
        except Exception:
            pass

    @staticmethod
    def _timer_popup_thread(title, message):
        """Tkinter popup: dark theme, topmost, 3s auto-dismiss, click-to-dismiss.
        Plays a system notification sound before showing the popup."""
        try:
            # Play system-level sound notification FIRST
            Api._play_notification_sound()

            import tkinter as tk

            popup = tk.Tk()
            popup.overrideredirect(True)
            popup.attributes('-topmost', True)
            popup.attributes('-alpha', 0.95)

            # Window size
            w, h = 340, 110
            sw = popup.winfo_screenwidth()
            sh = popup.winfo_screenheight()
            x = sw - w - 20
            y = sh - h - 60
            popup.geometry(f'{w}x{h}+{x}+{y}')

            # Colors (dark theme matching DevTools)
            bg = '#1a1a2e'
            fg = '#e8e8ed'
            accent = '#7254cc'
            border = '#7254cc'

            # Main frame with border
            frame = tk.Frame(popup, bg=bg, highlightbackground=border,
                             highlightthickness=2, padx=16, pady=14)
            frame.pack(fill='both', expand=True)

            # Bell icon + Title row
            title_frame = tk.Frame(frame, bg=bg)
            title_frame.pack(fill='x')
            tk.Label(title_frame, text=chr(0x23F0) + ' ', bg=bg, fg=accent,
                     font=('Segoe UI', 14)).pack(side='left')
            tk.Label(title_frame, text=title, bg=bg, fg=accent,
                     font=('Segoe UI', 13, 'bold'), anchor='w').pack(side='left')

            # Message
            tk.Label(frame, text=message, bg=bg, fg=fg,
                     font=('Segoe UI', 10), anchor='w').pack(fill='x', pady=(6, 0))

            # Click to dismiss
            popup.bind('<Button-1>', lambda e: popup.destroy())

            # Auto-dismiss after 3 seconds
            popup.after(3000, popup.destroy)

            popup.mainloop()
        except Exception as e:
            print(f"[TimerPopup] Error: {e}")

    def timer_toggle(self):
        """Toggle the timer start/stop from the backend (for global hotkey).
        Returns the current state after toggling."""
        state = self._timer_state
        if state['running']:
            # Stop the timer
            result = self.timer_stop()
            return {"action": "stopped", "success": True, **result}
        else:
            # Start the timer
            import datetime
            state['running'] = True
            if state['start_time'] is None:
                state['start_time'] = datetime.datetime.now().isoformat()
            return {"action": "started", "success": True, "mode": state['mode'],
                    "seconds": state['seconds'], "preset_minutes": state['preset_minutes'],
                    "pomodoro_count": state['pomodoro_count']}

    def timer_toggle_global(self):
        """Called from global hotkey Ctrl+Shift+C to toggle timer start/stop.
        Also shows the timer overlay if the timer is running."""
        result = self.timer_toggle()
        import webview
        try:
            self._restore_main_window()
            win = webview.windows[0]
            # Evaluate JS to sync the frontend timer and show overlay
            if result.get('action') == 'started':
                win.evaluate_js(
                    'if(typeof toggleTimerOverlay==="function")toggleTimerOverlay(true);'
                    'if(App.sectionHandlers.timer&&App.sectionHandlers.timer._start){'
                    '  if(!App.sectionHandlers.timer._s.running)App.sectionHandlers.timer._start();'
                    '  App.sectionHandlers.timer._updateDisplay();'
                    '}'
                )
            else:
                win.evaluate_js(
                    'if(App.sectionHandlers.timer&&App.sectionHandlers.timer._pause){'
                    '  if(App.sectionHandlers.timer._s.running)App.sectionHandlers.timer._pause();'
                    '  App.sectionHandlers.timer._updateDisplay();'
                    '}'
                )
        except Exception:
            pass
        return result

    def save_base64_to_file(self, file_path, base64_data):
        """Save base64-encoded data to a file. Used for exports (PNG, JSON, etc)."""
        import base64 as b64mod
        try:
            # Ensure directory exists
            file_dir = os.path.dirname(os.path.abspath(file_path))
            os.makedirs(file_dir, exist_ok=True)
            with open(file_path, 'wb') as f:
                f.write(b64mod.b64decode(base64_data))
            return {"success": True, "path": file_path}
        except Exception as e:
            return {"success": False, "message": str(e)}
