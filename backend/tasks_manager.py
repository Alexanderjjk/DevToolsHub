"""
DEPRECATED — Tasks Manager (legacy JSON-based storage)

This module is DEPRECATED and retained ONLY for backward compatibility.
All task operations are now handled by database.py (SQLite).

If you are importing this module, please migrate to:
    from database import get_tasks, get_task, create_task,
                        update_task, delete_task, get_task_stats

No code in the current application imports this module directly.
Safe to remove in a future release.
"""
import warnings

warnings.warn(
    "tasks_manager.py is deprecated. Use database.py instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export from database for backward compatibility
from database import (
    get_tasks as get_all,
    get_task,
    create_task,
    update_task,
    delete_task,
    get_task_stats as get_stats,
)

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


def get_categories():
    return TASKS_CATEGORIES


def get_priorities():
    return [{"id": p, "name": p.capitalize()} for p in TASKS_PRIORITIES]


def get_states():
    return [{"id": s, "name": s.replace("_", " ").capitalize()} for s in TASKS_STATES]
