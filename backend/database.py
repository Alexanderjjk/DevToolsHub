"""
SQLite database layer for Game Dev Hub.

Replaces the JSON-based storage with a proper SQLite database.
All functions use parameterized queries for safety.
"""

import sqlite3
import uuid
import time
import json
import os
import shutil
import gc

# ---------------------------------------------------------------------------
# Database path & connection helpers
# ---------------------------------------------------------------------------

_DB_DIR = os.path.join(os.path.dirname(__file__), 'data')
_DB_PATH = os.path.join(_DB_DIR, 'devtools.db')

_connection = None


import threading as _threading

_db_lock = _threading.Lock()


def _get_connection() -> sqlite3.Connection:
    """Return a singleton connection to the SQLite database."""
    global _connection
    if _connection is None:
        os.makedirs(_DB_DIR, exist_ok=True)
        _connection = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _connection.execute("PRAGMA foreign_keys=ON")
        # Evitar 'database is locked' cuando el poller y la API escriben a la vez
        _connection.execute("PRAGMA busy_timeout=5000")
    return _connection


def _row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain dict."""
    if row is None:
        return None
    return dict(row)


def _rows_to_dicts(rows) -> list:
    """Convert an iterable of sqlite3.Row to a list of dicts."""
    return [_row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------

_CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS doc_links (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_path TEXT,
    icon_name TEXT,
    description TEXT,
    accent_color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_shortcuts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    exe_path TEXT NOT NULL,
    icon_path TEXT,
    custom_icon_path TEXT,
    launch_args TEXT,
    minimize_on_launch INTEGER DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    project TEXT,
    is_quick_note INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    icon TEXT,
    color_id TEXT DEFAULT 'default',
    pinned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES notes(id)
);

CREATE TABLE IF NOT EXISTS flowcharts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    project TEXT,
    template TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    project TEXT,
    due_date TEXT,
    subtasks TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    planned_minutes INTEGER DEFAULT 25,
    actual_seconds INTEGER DEFAULT 0,
    completed_at TEXT NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_usage (
    id TEXT PRIMARY KEY,
    launcher_id TEXT NOT NULL,
    launcher_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER DEFAULT 0,
    date TEXT NOT NULL
);
"""


def init_db() -> None:
    """Create all tables if they don't already exist.  Safe to call repeatedly."""
    conn = _get_connection()
    conn.executescript(_CREATE_TABLES_SQL)
    conn.commit()


# ---------------------------------------------------------------------------
# Helper: JSON field handling
# ---------------------------------------------------------------------------

def _json_dumps(value) -> str:
    """Serialise *value* to a JSON string, defaulting to empty list."""
    if value is None:
        value = []
    return json.dumps(value)


def _json_loads(value: str | None):
    """Deserialise a JSON string, defaulting to empty list."""
    if not value:
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []


# ===================================================================
# DOC LINKS
# ===================================================================

def get_doc_links(category_filter=None, search_query=None) -> list:
    """Return all doc_links, optionally filtered by category or search."""
    conn = _get_connection()
    sql = "SELECT * FROM doc_links"
    params: list = []
    conditions: list = []
    if category_filter:
        conditions.append("category = ?")
        params.append(category_filter)
    if search_query:
        conditions.append("(name LIKE ? OR description LIKE ? OR category LIKE ?)")
        like = f"%{search_query}%"
        params.extend([like, like, like])
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY position ASC, created_at DESC"
    try:
        return _rows_to_dicts(conn.execute(sql, params).fetchall())
    except sqlite3.Error:
        return []


def get_doc_link(doc_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM doc_links WHERE id = ?", (doc_id,)).fetchone()
    return _row_to_dict(row)


def add_doc_link(
    name: str,
    url: str,
    category: str,
    description: str = '',
    icon_name: str = '',
    accent_color: str = '',
    icon_path: str = '',
) -> dict:
    doc_id = str(uuid.uuid4())
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    conn = _get_connection()
    # Determine next position
    max_pos = conn.execute("SELECT COALESCE(MAX(position), -1) FROM doc_links WHERE category = ?", (category,)).fetchone()[0]
    position = max_pos + 1
    conn.execute(
        """INSERT INTO doc_links (id, category, name, url, icon_path, icon_name,
           description, accent_color, position, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (doc_id, category, name, url, icon_path, icon_name, description,
         accent_color, position, now),
    )
    conn.commit()
    return get_doc_link(doc_id)


def update_doc_link(doc_id: str, **kwargs) -> dict | None:
    if not kwargs:
        return get_doc_link(doc_id)
    allowed = {
        'category', 'name', 'url', 'icon_path', 'icon_name',
        'description', 'accent_color', 'position',
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_doc_link(doc_id)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [doc_id]
    conn = _get_connection()
    conn.execute(f"UPDATE doc_links SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_doc_link(doc_id)


def delete_doc_link(doc_id: str) -> bool:
    conn = _get_connection()
    cursor = conn.execute("DELETE FROM doc_links WHERE id = ?", (doc_id,))
    conn.commit()
    return cursor.rowcount > 0


def get_doc_link_categories() -> list:
    """Return a list of dicts: [{'category': ..., 'count': ...}, ...]."""
    conn = _get_connection()
    rows = conn.execute(
        "SELECT category, COUNT(*) AS count FROM doc_links GROUP BY category ORDER BY category"
    ).fetchall()
    return _rows_to_dicts(rows)


def get_doc_link_stats() -> dict:
    conn = _get_connection()
    total = conn.execute("SELECT COUNT(*) FROM doc_links").fetchone()[0]
    categories = conn.execute("SELECT COUNT(DISTINCT category) FROM doc_links").fetchone()[0]
    return {"total": total, "categories": categories}


# ===================================================================
# APP SHORTCUTS (launchers)
# ===================================================================

def get_app_shortcuts() -> list:
    conn = _get_connection()
    return _rows_to_dicts(
        conn.execute("SELECT * FROM app_shortcuts ORDER BY position ASC").fetchall()
    )


def get_app_shortcut(shortcut_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM app_shortcuts WHERE id = ?", (shortcut_id,)).fetchone()
    return _row_to_dict(row)


def add_app_shortcut(
    name: str,
    exe_path: str,
    category: str = 'general',
    icon_path: str = '',
    launch_args: str = '',
) -> dict:
    shortcut_id = str(uuid.uuid4())
    conn = _get_connection()
    max_pos = conn.execute("SELECT COALESCE(MAX(position), -1) FROM app_shortcuts").fetchone()[0]
    position = max_pos + 1
    conn.execute(
        """INSERT INTO app_shortcuts (id, category, name, exe_path, icon_path,
           custom_icon_path, launch_args, minimize_on_launch, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (shortcut_id, category, name, exe_path, icon_path, '', launch_args, 1, position),
    )
    conn.commit()
    return get_app_shortcut(shortcut_id)


def update_app_shortcut(shortcut_id: str, **kwargs) -> dict | None:
    if not kwargs:
        return get_app_shortcut(shortcut_id)
    allowed = {
        'category', 'name', 'exe_path', 'icon_path', 'custom_icon_path',
        'launch_args', 'minimize_on_launch', 'position',
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_app_shortcut(shortcut_id)
    # Convert booleans for minimize_on_launch
    if 'minimize_on_launch' in updates and not isinstance(updates['minimize_on_launch'], int):
        updates['minimize_on_launch'] = 1 if updates['minimize_on_launch'] else 0
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [shortcut_id]
    conn = _get_connection()
    conn.execute(f"UPDATE app_shortcuts SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_app_shortcut(shortcut_id)


def delete_app_shortcut(shortcut_id: str) -> bool:
    conn = _get_connection()
    cursor = conn.execute("DELETE FROM app_shortcuts WHERE id = ?", (shortcut_id,))
    conn.commit()
    return cursor.rowcount > 0


def launch_app(shortcut_id: str) -> dict:
    """Attempt to launch an app shortcut using subprocess."""
    shortcut = get_app_shortcut(shortcut_id)
    if not shortcut:
        return {"success": False, "message": "Shortcut not found"}
    exe_path = shortcut['exe_path']
    if not exe_path or not os.path.isfile(exe_path):
        return {"success": False, "message": f"Executable not found: {exe_path}"}
    import subprocess
    import platform
    try:
        launch_args = shortcut.get('launch_args') or ''
        cmd = [exe_path]
        if launch_args:
            cmd.extend(launch_args.split())
        if platform.system() == 'Windows':
            # DETACHED_PROCESS to avoid spawning a console window
            subprocess.Popen(
                cmd,
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            )
        else:
            subprocess.Popen(cmd, start_new_session=True)
        return {"success": True, "message": f"Launched {shortcut['name']}"}
    except Exception as exc:
        return {"success": False, "message": str(exc)}


# ===================================================================
# NOTES
# ===================================================================

def get_notes(parent_id=None, project=None, tag=None) -> list:
    conn = _get_connection()
    sql = "SELECT * FROM notes WHERE 1=1"
    params: list = []
    if parent_id is not None:
        sql += " AND parent_id = ?"
        params.append(parent_id)
    if project:
        sql += " AND project = ?"
        params.append(project)
    if tag:
        sql += " AND (tags LIKE ?)"
        params.append(f"%{tag}%")
    sql += " ORDER BY pinned DESC, updated_at DESC"
    try:
        return _rows_to_dicts(conn.execute(sql, params).fetchall())
    except sqlite3.Error:
        return []


def get_note(note_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    return _row_to_dict(row)


def create_note(
    title: str,
    content: str = '',
    parent_id=None,
    project: str = '',
    tags=None,
    is_quick_note: bool = False,
    color_id: str = 'default',
    pinned: bool = False,
) -> dict:
    note_id = str(uuid.uuid4())
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    conn = _get_connection()
    conn.execute(
        """INSERT INTO notes (id, parent_id, title, content, tags, project,
           is_quick_note, is_favorite, icon, color_id, pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            note_id,
            parent_id if parent_id else None,
            title,
            content,
            _json_dumps(tags),
            project,
            1 if is_quick_note else 0,
            0,
            '',
            color_id,
            1 if pinned else 0,
            now,
            now,
        ),
    )
    conn.commit()
    return get_note(note_id)


def update_note(note_id: str, **kwargs) -> dict | None:
    if not kwargs:
        return get_note(note_id)
    allowed = {
        'parent_id', 'title', 'content', 'tags', 'project',
        'is_quick_note', 'is_favorite', 'icon', 'color_id', 'pinned',
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_note(note_id)
    # Auto-set updated_at
    updates['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    # Convert booleans
    for key in ('is_quick_note', 'is_favorite', 'pinned'):
        if key in updates and not isinstance(updates[key], int):
            updates[key] = 1 if updates[key] else 0
    # Serialise list fields
    if 'tags' in updates and isinstance(updates['tags'], (list, tuple)):
        updates['tags'] = _json_dumps(updates['tags'])
    # Normalise parent_id falsy → None (SQL NULL)
    if 'parent_id' in updates and not updates['parent_id']:
        updates['parent_id'] = None
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [note_id]
    conn = _get_connection()
    conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_note(note_id)


def delete_note(note_id: str) -> bool:
    conn = _get_connection()
    # Recursively collect ALL descendant IDs (children, grandchildren, etc.)
    ids_to_delete = {note_id}
    current_parents = [note_id]
    while current_parents:
        placeholders = ','.join('?' * len(current_parents))
        children = conn.execute(
            f"SELECT id FROM notes WHERE parent_id IN ({placeholders})",
            current_parents
        ).fetchall()
        if not children:
            break
        current_parents = [r['id'] for r in children]
        ids_to_delete.update(current_parents)
    # Delete all collected IDs in one query
    if ids_to_delete:
        placeholders = ','.join('?' * len(ids_to_delete))
        conn.execute(f"DELETE FROM notes WHERE id IN ({placeholders})", list(ids_to_delete))
    conn.commit()
    return note_id in ids_to_delete


def search_notes(query: str) -> list:
    if not query:
        return []
    conn = _get_connection()
    like = f"%{query}%"
    sql = """SELECT * FROM notes
             WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? OR project LIKE ?
             ORDER BY updated_at DESC"""
    return _rows_to_dicts(conn.execute(sql, [like, like, like, like]).fetchall())


def get_note_colors() -> list:
    """Return the built-in note colour palette."""
    return [
        {"id": "default", "name": "Default", "color": "#1e1e2e"},
        {"id": "red", "name": "Red", "color": "#f38ba8"},
        {"id": "orange", "name": "Orange", "color": "#fab387"},
        {"id": "yellow", "name": "Yellow", "color": "#f9e2af"},
        {"id": "green", "name": "Green", "color": "#a6e3a1"},
        {"id": "blue", "name": "Blue", "color": "#89b4fa"},
        {"id": "purple", "name": "Purple", "color": "#cba6f7"},
        {"id": "pink", "name": "Pink", "color": "#f5c2e7"},
        {"id": "teal", "name": "Teal", "color": "#94e2d5"},
        {"id": "mauve", "name": "Mauve", "color": "#b4befe"},
    ]


def get_note_stats() -> dict:
    conn = _get_connection()
    total = conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
    favorites = conn.execute("SELECT COUNT(*) FROM notes WHERE is_favorite = 1").fetchone()[0]
    pinned = conn.execute("SELECT COUNT(*) FROM notes WHERE pinned = 1").fetchone()[0]
    quick = conn.execute("SELECT COUNT(*) FROM notes WHERE is_quick_note = 1").fetchone()[0]
    projects = conn.execute(
        "SELECT COUNT(DISTINCT project) FROM notes WHERE project IS NOT NULL AND project != ''"
    ).fetchone()[0]
    return {
        "total": total,
        "favorites": favorites,
        "pinned": pinned,
        "quick_notes": quick,
        "projects": projects,
    }


def get_quick_notes() -> list:
    """Return notes where is_quick_note = 1."""
    conn = _get_connection()
    return _rows_to_dicts(
        conn.execute(
            "SELECT * FROM notes WHERE is_quick_note = 1 ORDER BY updated_at DESC"
        ).fetchall()
    )


def import_note_from_file(file_path: str) -> dict | None:
    """Import a note from a .md file.

    Supports YAML front matter (between ``---`` markers) and falls back to
    extracting the first ``# Title`` heading when no front matter is present.

    Returns the newly created note dict, or *None* on failure.
    """
    if not os.path.isfile(file_path):
        print(f"[import_note_from_file] File not found: {file_path}")
        return None

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw = f.read()
    except UnicodeDecodeError:
        # Try latin-1 as a fallback
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                raw = f.read()
        except Exception as exc:
            print(f"[import_note_from_file] Encoding error: {exc}")
            return None
    except Exception as exc:
        print(f"[import_note_from_file] Error reading file: {exc}")
        return None

    # Default values
    title = os.path.splitext(os.path.basename(file_path))[0]
    tags = []
    color_id = 'default'
    pinned = False
    favorite = False
    project = ''
    created_at = None
    updated_at = None
    content = raw

    # --- Try YAML front matter ---
    stripped = raw.strip()
    if stripped.startswith('---'):
        # Find the closing ---
        end = stripped.find('---', 3)
        if end != -1:
            fm_block = stripped[3:end].strip()
            body = stripped[end + 3:].strip()

            # Simple YAML parser (no PyYAML dependency required)
            # Handles: title, tags (list or comma-str), color, pinned, favorite,
            #          created, updated, project
            for line in fm_block.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if ':' not in line:
                    continue
                key, _, val = line.partition(':')
                key = key.strip().lower()
                val = val.strip().strip('"').strip("'")

                if key == 'title' and val:
                    title = val
                elif key == 'tags':
                    # Could be a YAML list "[a, b]" or comma-separated
                    if val.startswith('[') and val.endswith(']'):
                        inner = val[1:-1]
                        tags = [t.strip().strip('"').strip("'") for t in inner.split(',') if t.strip()]
                    else:
                        tags = [t.strip() for t in val.split(',') if t.strip()]
                elif key in ('color', 'color_id') and val:
                    color_id = val
                elif key == 'pinned':
                    pinned = val.lower() in ('true', '1', 'yes')
                elif key in ('favorite', 'favourite'):
                    favorite = val.lower() in ('true', '1', 'yes')
                elif key == 'project':
                    project = val
                elif key in ('created', 'created_at'):
                    created_at = val
                elif key in ('updated', 'updated_at'):
                    updated_at = val

            content = body

    # --- Fallback: extract first H1 heading ---
    if content and not stripped.startswith('---'):
        lines = content.splitlines()
        for i, line in enumerate(lines):
            stripped_line = line.strip()
            if stripped_line.startswith('# ') and len(stripped_line) > 2:
                title = stripped_line[2:].strip()
                # Remove the H1 line from content
                remaining = lines[i + 1:]
                # Also strip a leading blank line after H1
                if remaining and remaining[0].strip() == '':
                    remaining = remaining[1:]
                content = '\n'.join(remaining)
                break

    # Trim trailing whitespace from content
    content = (content or '').rstrip()

    # Create the note via the existing CRUD function
    note = create_note(
        title=title,
        content=content,
        project=project,
        tags=tags if tags else None,
        color_id=color_id,
        pinned=pinned,
    )

    if note and favorite:
        update_note(note['id'], is_favorite=True)

    return note


def get_note_word_count(note_id: str) -> dict:
    """Return word/character/line statistics for a single note.

    Returns ``{"words": int, "chars": int, "chars_no_spaces": int, "lines": int}``.
    """
    conn = _get_connection()
    row = conn.execute(
        "SELECT content FROM notes WHERE id = ?", (note_id,)
    ).fetchone()

    if row is None:
        return {"words": 0, "chars": 0, "chars_no_spaces": 0, "lines": 0}

    text = row['content'] or ''
    words = len(text.split())
    chars = len(text)
    chars_no_spaces = len(text.replace(' ', '').replace('\t', '').replace('\n', '').replace('\r', ''))
    lines = len(text.splitlines()) if text else 0

    return {
        "words": words,
        "chars": chars,
        "chars_no_spaces": chars_no_spaces,
        "lines": lines,
    }


def get_all_tags() -> list:
    """Return a sorted list of unique tags with usage counts.

    Returns ``[{"tag": "gamedev", "count": 5}, ...]`` sorted alphabetically.
    """
    conn = _get_connection()
    rows = conn.execute(
        "SELECT tags FROM notes WHERE tags IS NOT NULL AND tags != ''"
    ).fetchall()

    tag_counter: dict[str, int] = {}
    for row in rows:
        parsed = _json_loads(row['tags'])
        for t in parsed:
            if t:
                tag_counter[t] = tag_counter.get(t, 0) + 1

    # Sort alphabetically
    result = sorted(
        [{"tag": tag, "count": count} for tag, count in tag_counter.items()],
        key=lambda x: x['tag'].lower(),
    )
    return result


def duplicate_note(note_id: str) -> dict | None:
    """Duplicate a note (and its child sub-pages) under a new parent.

    The new parent note gets the title suffixed with `` (copia)``.
    Returns the new parent note dict, or *None* if the original was not found.
    """
    original = get_note(note_id)
    if original is None:
        return None

    # Create the duplicate parent
    new_parent = create_note(
        title=f"{original['title']} (copia)",
        content=original['content'] or '',
        project=original.get('project') or '',
        tags=_json_loads(original.get('tags')),
        color_id=original.get('color_id') or 'default',
        pinned=False,  # Don't pin copies
    )

    if new_parent is None:
        return None

    # Copy children recursively
    _duplicate_children(note_id, new_parent['id'])

    return new_parent


def _duplicate_children(original_parent_id: str, new_parent_id: str) -> None:
    """Recursively duplicate all children of *original_parent_id* under *new_parent_id*."""
    children = get_notes(parent_id=original_parent_id)
    for child in children:
        new_child = create_note(
            title=child['title'],
            content=child['content'] or '',
            parent_id=new_parent_id,
            project=child.get('project') or '',
            tags=_json_loads(child.get('tags')),
            color_id=child.get('color_id') or 'default',
        )
        if new_child:
            _duplicate_children(child['id'], new_child['id'])


# ===================================================================
# FLOWCHARTS
# ===================================================================

def get_flowcharts(project=None) -> list:
    conn = _get_connection()
    if project:
        return _rows_to_dicts(
            conn.execute(
                "SELECT * FROM flowcharts WHERE project = ? ORDER BY updated_at DESC",
                (project,),
            ).fetchall()
        )
    return _rows_to_dicts(
        conn.execute("SELECT * FROM flowcharts ORDER BY updated_at DESC").fetchall()
    )


def get_flowchart(flowchart_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM flowcharts WHERE id = ?", (flowchart_id,)).fetchone()
    return _row_to_dict(row)


def create_flowchart(
    name: str,
    data,
    project: str = '',
    template: str = '',
) -> dict:
    flowchart_id = str(uuid.uuid4())
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    conn = _get_connection()
    data_json = data if isinstance(data, str) else json.dumps(data)
    conn.execute(
        """INSERT INTO flowcharts (id, name, data, project, template, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (flowchart_id, name, data_json, project, template, now, now),
    )
    conn.commit()
    return get_flowchart(flowchart_id)


def update_flowchart(flowchart_id: str, **kwargs) -> dict | None:
    if not kwargs:
        return get_flowchart(flowchart_id)
    allowed = {'name', 'data', 'project', 'template'}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_flowchart(flowchart_id)
    updates['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    if 'data' in updates and not isinstance(updates['data'], str):
        updates['data'] = json.dumps(updates['data'])
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [flowchart_id]
    conn = _get_connection()
    conn.execute(f"UPDATE flowcharts SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_flowchart(flowchart_id)


def delete_flowchart(flowchart_id: str) -> bool:
    conn = _get_connection()
    cursor = conn.execute("DELETE FROM flowcharts WHERE id = ?", (flowchart_id,))
    conn.commit()
    return cursor.rowcount > 0


# ===================================================================
# TASKS
# ===================================================================

def get_tasks(
    status_filter=None,
    priority_filter=None,
    project_filter=None,
) -> list:
    conn = _get_connection()
    sql = "SELECT * FROM tasks WHERE 1=1"
    params: list = []
    if status_filter:
        sql += " AND status = ?"
        params.append(status_filter)
    if priority_filter:
        sql += " AND priority = ?"
        params.append(priority_filter)
    if project_filter:
        sql += " AND project = ?"
        params.append(project_filter)
    sql += " ORDER BY created_at DESC"
    try:
        return _rows_to_dicts(conn.execute(sql, params).fetchall())
    except sqlite3.Error:
        return []


def get_task(task_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _row_to_dict(row)


def create_task(
    title: str,
    description: str = '',
    status: str = 'backlog',
    priority: str = 'medium',
    project: str = '',
    due_date: str = '',
    subtasks=None,
) -> dict:
    task_id = str(uuid.uuid4())
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    conn = _get_connection()
    conn.execute(
        """INSERT INTO tasks (id, title, description, status, priority, project,
           due_date, subtasks, created_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (task_id, title, description, status, priority, project,
         due_date, _json_dumps(subtasks), now, None),
    )
    conn.commit()
    return get_task(task_id)


def update_task(task_id: str, **kwargs) -> dict | None:
    if not kwargs:
        return get_task(task_id)
    allowed = {
        'title', 'description', 'status', 'priority', 'project',
        'due_date', 'subtasks', 'completed_at',
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_task(task_id)
    # Auto-set completed_at when status changes to 'done'
    if updates.get('status') == 'done' and 'completed_at' not in updates:
        updates['completed_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    if updates.get('status') != 'done':
        updates['completed_at'] = None
    # Serialise subtasks
    if 'subtasks' in updates and isinstance(updates['subtasks'], (list, tuple)):
        updates['subtasks'] = _json_dumps(updates['subtasks'])
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [task_id]
    conn = _get_connection()
    conn.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
    conn.commit()
    return get_task(task_id)


def delete_task(task_id: str) -> bool:
    conn = _get_connection()
    cursor = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    return cursor.rowcount > 0


def get_task_stats() -> dict:
    conn = _get_connection()
    total = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    backlog = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'backlog'").fetchone()[0]
    in_progress = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'in_progress'").fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM tasks WHERE status = 'done'").fetchone()[0]
    high_priority = conn.execute("SELECT COUNT(*) FROM tasks WHERE priority = 'high'").fetchone()[0]
    today = time.strftime('%Y-%m-%d', time.localtime())
    overdue = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE due_date IS NOT NULL AND due_date != '' AND due_date < ? AND status != 'done'",
        (today,),
    ).fetchone()[0]
    return {
        "total": total,
        "backlog": backlog,
        "in_progress": in_progress,
        "done": done,
        "high_priority": high_priority,
        "overdue": overdue,
    }


def get_task_projects() -> list:
    """Return a list of distinct project names (strings)."""
    conn = _get_connection()
    rows = conn.execute(
        "SELECT DISTINCT project FROM tasks WHERE project IS NOT NULL AND project != '' ORDER BY project"
    ).fetchall()
    return [r['project'] for r in rows]


# ===================================================================
# SESSIONS (Pomodoro)
# ===================================================================

def get_sessions() -> list:
    conn = _get_connection()
    return _rows_to_dicts(
        conn.execute("SELECT * FROM sessions ORDER BY completed_at DESC").fetchall()
    )


def log_session(
    session_type: str,
    duration_seconds: int,
    planned_minutes: int = 25,
) -> dict:
    session_id = str(uuid.uuid4())
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    today = time.strftime('%Y-%m-%d', time.localtime())
    conn = _get_connection()
    conn.execute(
        """INSERT INTO sessions (id, type, planned_minutes, actual_seconds,
           completed_at, date)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (session_id, session_type, planned_minutes, duration_seconds, now_iso, today),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return _row_to_dict(row)


def get_session_stats() -> dict:
    conn = _get_connection()
    today = time.strftime('%Y-%m-%d', time.localtime())

    # All-time totals — count 'focus', 'pomodoro', and 'free' as focus sessions
    all_focus = conn.execute(
        "SELECT COALESCE(SUM(actual_seconds), 0) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free')"
    ).fetchone()[0]
    all_sessions = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free')"
    ).fetchone()[0]
    all_short = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE type = 'short_break'"
    ).fetchone()[0]
    all_long = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE type = 'long_break'"
    ).fetchone()[0]

    # Today totals
    today_focus = conn.execute(
        "SELECT COALESCE(SUM(actual_seconds), 0) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free') AND date = ?",
        (today,),
    ).fetchone()[0]
    today_sessions = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free') AND date = ?",
        (today,),
    ).fetchone()[0]

    # Week totals (last 7 days)
    week_ago = time.strftime('%Y-%m-%d', time.localtime(time.time() - 7 * 86400))
    week_focus = conn.execute(
        "SELECT COALESCE(SUM(actual_seconds), 0) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free') AND date >= ?",
        (week_ago,),
    ).fetchone()[0]
    week_sessions = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE type IN ('focus', 'pomodoro', 'free') AND date >= ?",
        (week_ago,),
    ).fetchone()[0]

    # Streak: consecutive days with at least one focus/pomodoro/free session
    # Si hoy aún no hay sesión pero ayer sí, contar desde ayer (no romper la racha)
    streak = 0
    try:
        activity_days = set(
            r[0] for r in conn.execute(
                "SELECT DISTINCT date FROM sessions WHERE type IN ('focus', 'pomodoro', 'free')"
            ).fetchall()
        )
        check_date = today
        # If today has no activity yet, start from yesterday so streak isn't broken mid-day
        if check_date not in activity_days:
            ts = time.mktime(time.strptime(check_date, '%Y-%m-%d'))
            check_date = time.strftime('%Y-%m-%d', time.localtime(ts - 86400))
        while check_date in activity_days:
            streak += 1
            ts = time.mktime(time.strptime(check_date, '%Y-%m-%d'))
            check_date = time.strftime('%Y-%m-%d', time.localtime(ts - 86400))
    except Exception:
        pass

    return {
        "today": {
            "focus_seconds": today_focus,
            "sessions": today_sessions,
        },
        "week": {
            "focus_seconds": week_focus,
            "sessions": week_sessions,
        },
        "all_time": {
            "focus_seconds": all_focus,
            "sessions": all_sessions,
            "short_breaks": all_short,
            "long_breaks": all_long,
        },
        "streak": streak,
    }


def get_activity_calendar(days=90) -> list:
    """Return per-day activity data for the last N days.
    Each entry: {date, focus_seconds, app_usage_seconds, sessions, has_activity}
    Used for GitHub-style contribution calendar.
    """
    conn = _get_connection()
    today = time.strftime('%Y-%m-%d', time.localtime())
    start_date = time.strftime('%Y-%m-%d', time.localtime(time.time() - (days - 1) * 86400))

    # Focus sessions per day
    focus_rows = conn.execute("""
        SELECT date, COALESCE(SUM(actual_seconds), 0) as total_sec,
               COUNT(*) as cnt
        FROM sessions
        WHERE type IN ('focus', 'pomodoro', 'free') AND date >= ?
        GROUP BY date
    """, (start_date,)).fetchall()

    focus_map = {}
    for r in focus_rows:
        focus_map[r['date']] = {
            'focus_seconds': r['total_sec'],
            'sessions': r['cnt'],
        }

    # App usage per day
    app_rows = conn.execute("""
        SELECT date, COALESCE(SUM(duration_seconds), 0) as total_sec
        FROM app_usage
        WHERE end_time IS NOT NULL AND duration_seconds > 0 AND date >= ?
        GROUP BY date
    """, (start_date,)).fetchall()

    app_map = {}
    for r in app_rows:
        app_map[r['date']] = r['total_sec']

    # Build day-by-day list
    result = []
    ts = time.mktime(time.strptime(start_date, '%Y-%m-%d'))
    for i in range(days):
        d = time.strftime('%Y-%m-%d', time.localtime(ts + i * 86400))
        f = focus_map.get(d, {'focus_seconds': 0, 'sessions': 0})
        a = app_map.get(d, 0)
        total = f['focus_seconds'] + a
        result.append({
            'date': d,
            'focus_seconds': f['focus_seconds'],
            'app_usage_seconds': a,
            'sessions': f['sessions'],
            'total_seconds': total,
            'has_activity': total > 0,
        })

    # Add notes activity per day
    notes_rows = conn.execute("""
        SELECT date(created_at) as note_date, COUNT(*) as notes_created
        FROM notes
        WHERE date(created_at) >= ?
        GROUP BY note_date
    """, (start_date,)).fetchall()
    notes_map = {}
    for r in notes_rows:
        if r['note_date']:
            notes_map[r['note_date']] = r['notes_created']
    
    # Add tasks completed per day
    tasks_rows = conn.execute("""
        SELECT date(completed_at) as task_date, COUNT(*) as tasks_completed
        FROM tasks
        WHERE completed_at IS NOT NULL AND date(completed_at) >= ?
        GROUP BY task_date
    """, (start_date,)).fetchall()
    tasks_map = {}
    for r in tasks_rows:
        if r['task_date']:
            tasks_map[r['task_date']] = r['tasks_completed']
    
    # Merge into result
    for entry in result:
        entry['notes_created'] = notes_map.get(entry['date'], 0)
        entry['tasks_completed'] = tasks_map.get(entry['date'], 0)

    return result


def clear_session_history() -> bool:
    conn = _get_connection()
    try:
        conn.execute("DELETE FROM sessions")
        conn.commit()
        return True
    except sqlite3.Error:
        return False


def delete_session(session_id: str) -> bool:
    conn = _get_connection()
    cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    return cursor.rowcount > 0


# ===================================================================
# SETTINGS
# ===================================================================

def get_setting(key: str, default=None):
    conn = _get_connection()
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    if row is None:
        return default
    value = row['value']
    # Attempt to return typed values
    if value == '':
        return default
    if value == 'true':
        return True
    if value == 'false':
        return False
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        pass
    return value


def set_setting(key: str, value) -> bool:
    conn = _get_connection()
    stored = value if isinstance(value, str) else str(value)
    # Lowercase booleans for consistency
    if isinstance(value, bool):
        stored = 'true' if value else 'false'
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, stored),
    )
    conn.commit()
    return True


def get_all_settings() -> dict:
    conn = _get_connection()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    result = {}
    for row in rows:
        result[row['key']] = row['value']
    return result


def reset_all_data() -> bool:
    """Delete ALL data from every table, restoring the app to a clean state.

    Handles corrupted databases by deleting the DB files entirely and
    recreating the schema from scratch.  This is the nuclear option but
    it guarantees a clean state even when the disk image is malformed.
    """
    global _connection
    try:
        # Step 1: Close the existing connection gracefully
        # Try to checkpoint WAL first so no data is left in the -wal file
        if _connection is not None:
            try:
                _connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            except Exception:
                pass
            try:
                _connection.close()
            except Exception:
                pass
            _connection = None

        # Force garbage collection to release any remaining file handles
        gc.collect()
        time.sleep(0.3)

        # Step 2: Delete ALL database-related files (with retry)
        db_files = [_DB_PATH]
        for suffix in ('-wal', '-shm', '-journal'):
            candidate = _DB_PATH + suffix
            db_files.append(candidate)

        deleted_any = False
        for attempt in range(3):
            for fpath in db_files:
                if os.path.exists(fpath):
                    try:
                        os.remove(fpath)
                        deleted_any = True
                        print(f"[reset_all_data] Deleted: {os.path.basename(fpath)}")
                    except OSError as e:
                        print(f"[reset_all_data] Attempt {attempt+1} failed to delete {os.path.basename(fpath)}: {e}")
            # Check if all files are gone
            remaining = [f for f in db_files if os.path.exists(f)]
            if not remaining:
                break
            print(f"[reset_all_data] {len(remaining)} file(s) still locked, retrying...")
            time.sleep(0.5)

        if not deleted_any and not os.path.exists(_DB_PATH):
            print("[reset_all_data] No DB files found (fresh install?)")

        # Step 3: Recreate the database with a fresh connection
        _connection = None  # ensure singleton is reset
        conn = _get_connection()
        conn.executescript(_CREATE_TABLES_SQL)
        conn.commit()
        print("[reset_all_data] Database recreated successfully")
        return True
    except Exception as e:
        print(f"[reset_all_data] Error: {e}")
        # Last resort: try to at least get a working connection back
        try:
            _connection = None
            gc.collect()
            time.sleep(0.5)
            # Try to delete any remaining files
            for fpath in [_DB_PATH, _DB_PATH + '-wal', _DB_PATH + '-shm', _DB_PATH + '-journal']:
                if os.path.exists(fpath):
                    try:
                        os.remove(fpath)
                    except OSError:
                        pass
            conn = _get_connection()
            conn.executescript(_CREATE_TABLES_SQL)
            conn.commit()
            print("[reset_all_data] Recovered after error")
            return True
        except Exception as e2:
            print(f"[reset_all_data] Fatal error: {e2}")
            return False


# ===================================================================
# APP USAGE TRACKING
# ===================================================================

def start_app_usage(launcher_id: str, launcher_name: str) -> dict:
    """Start a usage tracking session for a launcher app."""
    usage_id = str(uuid.uuid4())
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    today = time.strftime('%Y-%m-%d', time.localtime())
    conn = _get_connection()
    conn.execute(
        """INSERT INTO app_usage (id, launcher_id, launcher_name, start_time, date)
           VALUES (?, ?, ?, ?, ?)""",
        (usage_id, launcher_id, launcher_name, now_iso, today),
    )
    conn.commit()
    return get_app_usage(usage_id)


def end_app_usage(usage_id: str, duration_seconds: int) -> dict | None:
    """End a usage tracking session, recording the duration."""
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime())
    conn = _get_connection()
    conn.execute(
        """UPDATE app_usage SET end_time = ?, duration_seconds = ?
           WHERE id = ?""",
        (now_iso, duration_seconds, usage_id),
    )
    conn.commit()
    return get_app_usage(usage_id)


def get_app_usage(usage_id: str) -> dict | None:
    conn = _get_connection()
    row = conn.execute(
        "SELECT * FROM app_usage WHERE id = ?", (usage_id,)
    ).fetchone()
    return _row_to_dict(row)


def get_app_usage_active() -> list:
    """Return all active (running) usage sessions."""
    conn = _get_connection()
    return _rows_to_dicts(
        conn.execute(
            "SELECT * FROM app_usage WHERE end_time IS NULL ORDER BY start_time DESC"
        ).fetchall()
    )


def get_app_usage_stats() -> dict:
    """Return aggregated usage stats for all apps.

    Includes active sessions with their elapsed time calculated live.

    Returns:
        {
            "all_time": {"total_seconds": int, "apps": [...]},
            "today": {"total_seconds": int, "apps": [...]},
            "week": {"total_seconds": int, "apps": [...]},
        }
    """
    conn = _get_connection()
    today = time.strftime('%Y-%m-%d', time.localtime())
    week_ago = time.strftime('%Y-%m-%d', time.localtime(time.time() - 7 * 86400))
    now_ts = time.time()

    # Calculate live elapsed time for active sessions
    active_rows = _rows_to_dicts(
        conn.execute("SELECT launcher_id, launcher_name, start_time, date FROM app_usage WHERE end_time IS NULL").fetchall()
    )
    active_extra = {}  # launcher_id -> extra_seconds
    active_names = {}  # launcher_id -> launcher_name
    active_dates = {}  # launcher_id -> date (for date filtering)
    for row in active_rows:
        lid = row['launcher_id']
        try:
            started = time.mktime(time.strptime(row['start_time'], '%Y-%m-%dT%H:%M:%SZ'))
            elapsed = max(0, int(now_ts - started))
        except (ValueError, TypeError):
            elapsed = 0
        active_extra[lid] = active_extra.get(lid, 0) + elapsed
        active_names[lid] = row['launcher_name']
        active_dates[lid] = row.get('date', '')

    def _merge_active(rows, date_filter_val=None) -> dict:
        """Merge completed session stats with active session live times."""
        merged = {}
        for r in rows:
            key = r['launcher_id']
            merged[key] = {
                'launcher_id': r['launcher_id'],
                'launcher_name': r['launcher_name'],
                'total_seconds': r['total_seconds'],
                'launch_count': r['launch_count'],
            }
        # Add active session time — O(1) lookups via pre-built dicts
        for lid, extra_secs in active_extra.items():
            if date_filter_val:
                active_date = active_dates.get(lid, '')
                if active_date and active_date < date_filter_val:
                    continue
            if lid not in merged:
                merged[lid] = {
                    'launcher_id': lid,
                    'launcher_name': active_names.get(lid, lid),
                    'total_seconds': 0,
                    'launch_count': 0,
                }
            merged[lid]['total_seconds'] += extra_secs
            merged[lid]['launch_count'] += 1

        result_list = sorted(merged.values(), key=lambda x: x['total_seconds'], reverse=True)
        total = sum(r['total_seconds'] for r in result_list)
        return {"total_seconds": total, "apps": result_list}

    # Completed sessions - all time
    all_time_rows = _rows_to_dicts(
        conn.execute("""
            SELECT launcher_id, launcher_name,
                   COALESCE(SUM(duration_seconds), 0) AS total_seconds,
                   COUNT(*) AS launch_count
            FROM app_usage
            WHERE end_time IS NOT NULL AND duration_seconds > 0
            GROUP BY launcher_id, launcher_name
        """).fetchall()
    )
    all_time = _merge_active(all_time_rows)

    # Completed sessions - today
    rows_today = _rows_to_dicts(
        conn.execute("""
            SELECT launcher_id, launcher_name,
                   COALESCE(SUM(duration_seconds), 0) AS total_seconds,
                   COUNT(*) AS launch_count
            FROM app_usage
            WHERE end_time IS NOT NULL AND duration_seconds > 0 AND date = ?
            GROUP BY launcher_id, launcher_name
            ORDER BY total_seconds DESC
        """, (today,)).fetchall()
    )
    today_result = _merge_active(rows_today, date_filter_val=today)

    # Completed sessions - week
    rows_week = _rows_to_dicts(
        conn.execute("""
            SELECT launcher_id, launcher_name,
                   COALESCE(SUM(duration_seconds), 0) AS total_seconds,
                   COUNT(*) AS launch_count
            FROM app_usage
            WHERE end_time IS NOT NULL AND duration_seconds > 0 AND date >= ?
            GROUP BY launcher_id, launcher_name
            ORDER BY total_seconds DESC
        """, (week_ago,)).fetchall()
    )
    week_result = _merge_active(rows_week, date_filter_val=week_ago)

    return {
        "all_time": all_time,
        "today": today_result,
        "week": week_result,
    }


def get_app_usage_history(limit: int = 50, launcher_id: str = None) -> list:
    """Return recent usage history, optionally filtered by launcher."""
    conn = _get_connection()
    sql = "SELECT * FROM app_usage WHERE end_time IS NOT NULL"
    params: list = []
    if launcher_id:
        sql += " AND launcher_id = ?"
        params.append(launcher_id)
    sql += " ORDER BY end_time DESC LIMIT ?"
    params.append(limit)
    return _rows_to_dicts(conn.execute(sql, params).fetchall())


def delete_app_usage_history(launcher_id: str = None) -> bool:
    """Delete usage history. If launcher_id is given, only for that app."""
    conn = _get_connection()
    try:
        if launcher_id:
            conn.execute("DELETE FROM app_usage WHERE launcher_id = ?", (launcher_id,))
        else:
            conn.execute("DELETE FROM app_usage")
        conn.commit()
        return True
    except sqlite3.Error:
        return False
