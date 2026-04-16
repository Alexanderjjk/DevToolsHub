"""
DEPRECATED — Docs Manager (legacy JSON-based storage)

This module is DEPRECATED and retained ONLY for backward compatibility.
All doc link operations are now handled by database.py (SQLite).

If you are importing this module, please migrate to:
    from database import get_doc_links, get_doc_link, add_doc_link,
                        update_doc_link, delete_doc_link

No code in the current application imports this module directly.
Safe to remove in a future release.
"""
import warnings

warnings.warn(
    "docs_manager.py is deprecated. Use database.py instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export from database for backward compatibility
from database import (
    get_doc_links as get_all,
    get_doc_link as get_doc,
    add_doc_link as add_doc,
    update_doc_link as update_doc,
    delete_doc_link as delete_doc,
)

DOC_CATEGORIES = [
    {"id": "engine", "name": "Game Engines"},
    {"id": "tool", "name": "Herramientas"},
    {"id": "language", "name": "Lenguajes"},
    {"id": "api", "name": "APIs"},
    {"id": "reference", "name": "Referencias"},
    {"id": "custom", "name": "Personal"},
]


def get_categories():
    return DOC_CATEGORIES


def get_stats():
    from database import get_doc_link_stats
    return get_doc_link_stats()
