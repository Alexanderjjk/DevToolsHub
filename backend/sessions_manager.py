"""
DEPRECATED — Sessions Manager (legacy JSON-based storage)

This module is DEPRECATED and retained ONLY for backward compatibility.
All session operations are now handled by database.py (SQLite).

If you are importing this module, please migrate to:
    from database import get_sessions, log_session, get_session_stats,
                        clear_session_history, delete_session

No code in the current application imports this module directly.
Safe to remove in a future release.
"""
import warnings

warnings.warn(
    "sessions_manager.py is deprecated. Use database.py instead.",
    DeprecationWarning,
    stacklevel=2,
)

# Re-export from database for backward compatibility
from database import (
    get_sessions as get_all,
    log_session,
    get_session_stats as get_stats,
    clear_session_history as clear_history,
    delete_session,
    _get_connection,
)
import time


def get_today():
    """Deprecated. Use get_sessions() and filter by date."""
    sessions = get_all()
    today = time.strftime('%Y-%m-%d', time.gmtime())
    return [s for s in sessions if s.get('date') == today]


def get_week():
    """Deprecated. Use get_sessions() and filter by date."""
    sessions = get_all()
    week_ago = time.strftime('%Y-%m-%d', time.gmtime(time.time() - 7 * 86400))
    return [s for s in sessions if s.get('date', '') >= week_ago]
