"""
DEPRECATED — Notes Manager (legacy JSON-based storage)

This module is DEPRECATED and retained ONLY for backward compatibility.
All note operations are now handled by database.py (SQLite).

If you are importing this module, please migrate to:
    from database import get_notes, get_note, create_note,
                        update_note, delete_note, search_notes,
                        get_note_colors, get_note_stats

No code in the current application imports this module directly.
Safe to remove in a future release.
"""
import warnings

warnings.warn(
    "notes_manager.py is deprecated. Use database.py instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export from database for backward compatibility
from database import (
    get_notes as get_all,
    get_note,
    create_note,
    update_note,
    delete_note,
    search_notes,
    get_note_colors as get_colors,
    get_note_stats as get_stats,
)
