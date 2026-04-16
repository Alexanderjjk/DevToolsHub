"""
App Usage Tracker — Monitorea procesos lanzados desde el Launcher
y registra el tiempo de uso en la base de datos.

Se ejecuta en un hilo daemon por cada app lanzada:
  1. Al lanzar una app, se crea un Popen + registro start_app_usage()
  2. El hilo espera a que el proceso termine (process.wait())
  3. Al terminar, se registra end_app_usage() con la duracion

Uso:
    from app_usage_tracker import launch_and_track
    launch_and_track(launcher_id, launcher_name, exe_path, launch_args)
"""
import subprocess
import threading
import time
import os
import sys
import platform

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(__file__))

from database import start_app_usage, end_app_usage

# Tipos de proceso conocidos que no deben bloquear el tracking
_CONSOLE_EXTENSIONS = ('.bat', '.cmd', '.ps1', '.sh')

# Tiempo maximo para esperar un proceso (24 horas) antes de forzar cierre de tracking
_MAX_TRACK_SECONDS = 24 * 3600


def _launch_process(exe_path: str, launch_args: str = '') -> subprocess.Popen:
    """Lanza el proceso y retorna el handle Popen."""
    cmd = [exe_path]
    if launch_args:
        cmd.extend(launch_args.split())

    if platform.system() == 'Windows':
        # DETACHED_PROCESS evita que se abra una consola adicional
        # CREATE_NEW_PROCESS GROUP permite que el proceso viva independientemente
        proc = subprocess.Popen(
            cmd,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
        )
    else:
        proc = subprocess.Popen(
            cmd,
            start_new_session=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
        )
    return proc


def _monitor_process(usage_id: str, process: subprocess.Popen):
    """Hilo daemon que espera a que el proceso termine y registra la duracion."""
    start = time.monotonic()
    try:
        # Esperar a que termine (con timeout de seguridad)
        try:
            process.wait(timeout=_MAX_TRACK_SECONDS)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    except Exception:
        pass
    finally:
        duration = int(time.monotonic() - start)
        # Solo registrar si la app estuvo abierta al menos 1 segundo
        # (evitar falsos positivos de apps que fallan al abrir)
        if duration >= 1:
            try:
                end_app_usage(usage_id, duration)
                print(f"[UsageTracker] App cerrada despues de {duration}s (id={usage_id})")
            except Exception as e:
                print(f"[UsageTracker] Error guardando duracion: {e}")
        else:
            # Eliminar registro si fue menor a 1 segundo
            try:
                from database import _get_connection
                _get_connection().execute(
                    "DELETE FROM app_usage WHERE id = ?", (usage_id,)
                )
                _get_connection().commit()
            except Exception:
                pass


def launch_and_track(
    launcher_id: str,
    launcher_name: str,
    exe_path: str,
    launch_args: str = '',
) -> dict:
    """
    Lanza una app y empieza a trackear su tiempo de uso.

    Args:
        launcher_id: ID del launcher en la base de datos.
        launcher_name: Nombre visible del launcher.
        exe_path: Ruta al ejecutable.
        launch_args: Argumentos de linea de comandos.

    Returns:
        {"success": True, "message": "...", "usage_id": "..."} o error.
    """
    if not exe_path or not os.path.isfile(exe_path):
        return {"success": False, "message": f"Executable not found: {exe_path}"}

    # 1. Iniciar registro de uso en la base de datos
    try:
        usage = start_app_usage(launcher_id, launcher_name)
        usage_id = usage['id']
    except Exception as e:
        print(f"[UsageTracker] Error iniciando tracking: {e}")
        usage_id = None

    # 2. Lanzar el proceso
    try:
        proc = _launch_process(exe_path, launch_args)
    except Exception as e:
        # Si falla el lanzamiento, limpiar el registro de uso
        if usage_id:
            try:
                from database import _get_connection
                _get_connection().execute(
                    "DELETE FROM app_usage WHERE id = ?", (usage_id,)
                )
                _get_connection().commit()
            except Exception:
                pass
        return {"success": False, "message": str(e)}

    # 3. Si no se pudo crear el registro, no trackear
    if not usage_id:
        print(f"[UsageTracker] Sin usage_id, lanzando sin tracking: {launcher_name}")
        return {
            "success": True,
            "message": f"Launched {launcher_name}",
            "tracked": False,
        }

    # 4. Iniciar hilo de monitoreo (daemon para que no bloquee el cierre de la app)
    ext = os.path.splitext(exe_path)[1].lower()
    # Los scripts .bat/.cmd se ejecutan y terminan inmediatamente
    # No tiene sentido trackearlos como "tiempo de uso"
    is_script = ext in _CONSOLE_EXTENSIONS

    if is_script:
        # Para scripts, registrar duracion 0 y no monitorear
        end_app_usage(usage_id, 0)
        print(f"[UsageTracker] Script detectado ({ext}), sin tracking continuo")
        return {
            "success": True,
            "message": f"Launched {launcher_name}",
            "tracked": False,
        }

    thread = threading.Thread(
        target=_monitor_process,
        args=(usage_id, proc),
        daemon=True,
        name=f"usage-track-{launcher_name[:16]}",
    )
    thread.start()
    print(f"[UsageTracker] Tracking iniciado para '{launcher_name}' (usage_id={usage_id})")

    return {
        "success": True,
        "message": f"Launched {launcher_name}",
        "tracked": True,
        "usage_id": usage_id,
    }


def cleanup_stale_sessions():
    """Check all active sessions and close ones whose processes are no longer running.
    
    Called on app startup to clean up stale entries from previous sessions.
    When DevTools closes, daemon threads die and leave app_usage records
    with end_time=NULL. This function detects if those processes are still
    running and closes the records if not.
    """
    try:
        from database import get_app_usage_active, end_app_usage, get_app_shortcuts, _get_connection
    except Exception as e:
        print(f"[CleanupStale] Error importing: {e}")
        return
    
    active = get_app_usage_active()
    if not active:
        return
    
    shortcuts = {}
    try:
        for s in get_app_shortcuts():
            shortcuts[s['id']] = s
    except Exception:
        pass
    
    # Obtener todos los procesos corriendo de una sola vez (optimizacion)
    running = _get_running_process_names()
    closed_count = 0
    kept_count = 0
    
    for session in active:
        try:
            launcher_id = session['launcher_id']
            shortcut = shortcuts.get(launcher_id)
            exe_path = (shortcut or {}).get('exe_path', '')
            exe_name = os.path.basename(exe_path).lower() if exe_path else ''
            
            if exe_name and exe_name not in running:
                # Calculate duration from start_time to now
                try:
                    start = time.mktime(time.strptime(session['start_time'], '%Y-%m-%dT%H:%M:%SZ'))
                    duration = max(0, int(time.time() - start))
                except (ValueError, TypeError, OverflowError):
                    duration = 0
                
                if duration >= 1:
                    end_app_usage(session['id'], duration)
                else:
                    conn = _get_connection()
                    conn.execute("DELETE FROM app_usage WHERE id = ?", (session['id'],))
                    conn.commit()
                
                closed_count += 1
            else:
                kept_count += 1
        except Exception as e:
            print(f"[CleanupStale] Error checking session {session.get('id', '?')}: {e}")
    
    if closed_count > 0 or kept_count > 0:
        print(f"[CleanupStale] Cleanup done: {closed_count} closed, {kept_count} still running")


def get_active_sessions_count() -> int:
    """Retorna la cantidad de apps actualmente en uso (corriendo)."""
    try:
        from database import get_app_usage_active
        return len(get_app_usage_active())
    except Exception:
        return 0


# ═══════════════════════════════════════════════════════════════
#  AUTO-DETECTION: Detectar apps del launcher abiertas fuera
# ═══════════════════════════════════════════════════════════════

_poller_running = False
_poller_thread = None


# Cache para la lista de procesos (evita llamar subprocess cada 2s si no cambio)
_process_cache = {}
_process_cache_time = 0
_PROCESS_CACHE_TTL = 1.5  # Cache valido por 1.5s (menor que el intervalo de 2s)


def _get_running_process_names():
    """Retorna un set con los nombres de procesos corriendo en el sistema.
    
    Optimizado:
    - Usa wmic (mas rapido que tasklist) con fallback a tasklist
    - Cachea el resultado para evitar llamadas subprocess repetidas
    - Timeout reducido a 3s (antes 10s)
    - CREATE_NO_WINDOW para evitar ventana flash en Windows
    """
    global _process_cache, _process_cache_time
    
    now = time.monotonic()
    if _process_cache and (now - _process_cache_time) < _PROCESS_CACHE_TTL:
        return _process_cache
    
    names = set()
    no_window = subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
    if platform.system() == 'Windows':
        # Metodo 1: wmic (mas rapido que tasklist)
        try:
            result = subprocess.run(
                ['wmic', 'process', 'get', 'name', '/FORMAT:CSV'],
                capture_output=True, text=True, timeout=3,
                creationflags=no_window
            )
            for line in result.stdout.strip().split('\n'):
                line = line.strip()
                if line and not line.startswith('Node,Name') and not line.startswith('Name'):
                    parts = line.rsplit(',', 1)
                    if len(parts) == 2:
                        name = parts[1].strip().lower()
                        if name:
                            names.add(name)
        except Exception:
            pass
        
        # Metodo 2: tasklist como fallback
        if not names:
            try:
                result = subprocess.run(
                    ['tasklist', '/FO', 'CSV', '/NH'],
                    capture_output=True, text=True, timeout=3,
                    creationflags=no_window
                )
                for line in result.stdout.strip().split('\n'):
                    if line and line.startswith('"'):
                        name = line.split('"')[1].strip().lower()
                        if name:
                            names.add(name)
            except Exception:
                pass
    
    _process_cache = names
    _process_cache_time = now
    return names


# Intervalo de verificacion en segundos (antes 30s, ahora 2s)
_POLL_INTERVAL = 2

# Cache de shortcuts para evitar DB queries cada ciclo
_shortcuts_cache = []
_shortcuts_cache_time = 0
_SHORTCUTS_CACHE_TTL = 10.0  # Refrescar shortcuts cada 10s


def _get_shortcuts_cached():
    """Retorna los shortcuts cacheados para evitar DB queries cada 2s."""
    global _shortcuts_cache, _shortcuts_cache_time
    now = time.monotonic()
    if _shortcuts_cache and (now - _shortcuts_cache_time) < _SHORTCUTS_CACHE_TTL:
        return _shortcuts_cache
    try:
        from database import get_app_shortcuts
        _shortcuts_cache = get_app_shortcuts()
        _shortcuts_cache_time = now
    except Exception:
        pass
    return _shortcuts_cache


def _poll_launcher_apps():
    """Bucle principal del poller. Se ejecuta en un hilo daemon.
    
    Optimizado para ejecutarse cada 2 segundos:
    - Usa cache de procesos (TTL 1.5s)
    - Usa cache de shortcuts (TTL 10s)
    - Solo consulta DB para sesiones activas (query ligera)
    - Usa wmic en vez de tasklist (mas rapido)
    """
    import time as _time
    from database import get_app_usage_active, start_app_usage, end_app_usage, _get_connection

    while _poller_running:
        cycle_start = _time.monotonic()
        try:
            shortcuts = _get_shortcuts_cached()
            active = get_app_usage_active()
            running = _get_running_process_names()

            # Mapear: exe_name (lowercase) -> shortcut info
            exe_map = {}
            for s in shortcuts:
                exe = os.path.basename(s.get('exe_path', '')).lower()
                if exe:
                    exe_map[exe] = s

            # Mapear: launcher_id -> active session
            active_by_launcher = {}
            for session in active:
                lid = session['launcher_id']
                if lid not in active_by_launcher:
                    active_by_launcher[lid] = session

            # Solo ejecutar logica si hay shortcuts o sesiones activas
            if exe_map or active_by_launcher:
                # 1. Detectar apps corriendo que NO estan trackeadas
                for exe_name, shortcut in exe_map.items():
                    if exe_name in running:
                        lid = shortcut['id']
                        if lid not in active_by_launcher:
                            try:
                                start_app_usage(lid, shortcut['name'])
                                print(f"[AutoDetect] Detectada '{shortcut['name']}' corriendo fuera del launcher")
                            except Exception as e:
                                print(f"[AutoDetect] Error registrando '{shortcut['name']}': {e}")

                # 2. Detectar apps trackeadas que ya NO estan corriendo
                # Pre-construir reverse map: launcher_id -> exe_name
                lid_to_exe = {sc['id']: ename for ename, sc in exe_map.items()}
                for lid, session in active_by_launcher.items():
                    exe_name = lid_to_exe.get(lid)
                    if not exe_name:
                        continue

                    if exe_name not in running:
                        try:
                            start = time.mktime(time.strptime(session['start_time'], '%Y-%m-%dT%H:%M:%SZ'))
                            duration = max(0, int(time.time() - start))
                            if duration >= 1:
                                end_app_usage(session['id'], duration)
                            else:
                                conn = _get_connection()
                                conn.execute("DELETE FROM app_usage WHERE id = ?", (session['id'],))
                                conn.commit()
                            print(f"[AutoDetect] Cerrada sesion de '{session.get('launcher_name', lid)}' (ya no corre)")
                        except Exception as e:
                            print(f"[AutoDetect] Error cerrando sesion: {e}")

        except Exception as e:
            print(f"[AutoDetect] Error en poll: {e}")

        # Esperar para completar el intervalo de _POLL_INTERVAL segundos
        elapsed = _time.monotonic() - cycle_start
        remaining = _POLL_INTERVAL - elapsed
        if remaining > 0:
            # Dormir en incrementos de 0.5s para responder rapido al stop
            steps = int(remaining / 0.5)
            for _ in range(steps):
                if not _poller_running:
                    break
                _time.sleep(0.5)


def start_process_poller():
    """Inicia el poller de deteccion automatica de procesos."""
    global _poller_running, _poller_thread
    if _poller_running:
        return
    _poller_running = True
    _poller_thread = threading.Thread(
        target=_poll_launcher_apps,
        daemon=True,
        name="process-poller"
    )
    _poller_thread.start()
    print(f"[AutoDetect] Poller de deteccion de procesos iniciado (cada {_POLL_INTERVAL}s)")


def stop_process_poller():
    """Detiene el poller de deteccion automatica."""
    global _poller_running, _poller_thread
    _poller_running = False
    if _poller_thread:
        _poller_thread.join(timeout=5)
        _poller_thread = None
    print("[AutoDetect] Poller detenido")
