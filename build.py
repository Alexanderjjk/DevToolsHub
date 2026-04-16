"""
DevTools — Script de compilacion a EXE.

Automatiza todo el proceso:
  1. Genera el icono .ico (si no existe)
  2. Instala/verifica PyInstaller
  3. Compila con PyInstaller (onedir o onefile)
  4. Limpia archivos temporales
  5. Muestra instrucciones para distribucion

Uso:
  python build.py                 # Compilar en modo onedir (recomendado)
  python build.py --onefile       # Compilar como .exe unico
  python build.py --no-icon       # Saltar generacion de icono
  python build.py --clean-only    # Solo limpiar temporales
"""
import os
import sys
import subprocess
import shutil
import argparse


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
ICON_PATH = os.path.join(FRONTEND_DIR, 'icon.ico')
SPEC_PATH = os.path.join(BASE_DIR, 'DevTools.spec')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
BUILD_DIR = os.path.join(BASE_DIR, 'build')


def run_cmd(cmd, description=""):
    """Ejecutar un comando y mostrar salida en tiempo real."""
    if description:
        print(f"\n{'='*60}")
        print(f"  {description}")
        print(f"{'='*60}")
    print(f"  > {' '.join(cmd)}\n")
    result = subprocess.run(cmd, cwd=BASE_DIR)
    if result.returncode != 0:
        print(f"\n[ERROR] Comando fallo con codigo {result.returncode}")
        sys.exit(1)
    return result


def check_pip_dependencies():
    """Verificar que Pillow y PyInstaller estan instalados."""
    print("[1/5] Verificando dependencias...")

    required = ['Pillow', 'pyinstaller']
    for pkg in required:
        try:
            __import__(pkg.lower().replace('-', '_'))
            print(f"  OK  {pkg}")
        except ImportError:
            print(f"  INSTALANDO  {pkg}...")
            run_cmd(
                [sys.executable, '-m', 'pip', 'install', pkg],
                f"Instalando {pkg}"
            )


def generate_icon():
    """Generar el icono .ico si no existe."""
    if os.path.exists(ICON_PATH):
        print(f"[2/5] Icono ya existe: {ICON_PATH}")
        return True

    print(f"[2/5] Generando icono...")
    gen_script = os.path.join(BASE_DIR, 'generate_icon.py')
    if not os.path.exists(gen_script):
        print(f"[WARN] No se encontro generate_icon.py — saltando generacion de icono.")
        return False

    result = run_cmd(
        [sys.executable, gen_script],
        "Generando icono ICO con Pillow"
    )
    return os.path.exists(ICON_PATH)


def compile_exe(onefile=False):
    """Compilar el proyecto con PyInstaller."""
    mode = "onefile (exe unico)" if onefile else "onedir (carpeta)"
    print(f"[3/5] Compilando a EXE — modo: {mode}")

    cmd = [sys.executable, '-m', 'PyInstaller']

    if onefile:
        cmd.extend([
            '--onefile',
            '--name=DevTools',
            '--windowed',
            '--clean',
        ])
        if os.path.exists(ICON_PATH):
            cmd.append(f'--icon={ICON_PATH}')
        version_path = os.path.join(BASE_DIR, 'version_info.txt')
        if os.path.exists(version_path):
            cmd.append(f'--version-file={version_path}')

        # Hidden imports
        hidden = [
            'backend.database', 'backend.api', 'backend.global_hotkeys',
            'backend.icon_manager', 'backend.icon_library',
            'backend.launcher_manager', 'backend.docs_manager',
            'backend.sessions_manager', 'backend.notes_manager',
            'backend.tasks_manager', 'backend.favicon_downloader',
            'backend.favicon_manager',
            'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageFont',
            'ctypes.wintypes', 'keyboard', 'webview', 'sqlite3',
        ]
        for h in hidden:
            cmd.append(f'--hidden-import={h}')

        # Excludes
        excludes = ['tkinter', 'matplotlib', 'numpy', 'scipy', 'pandas',
                    'IPython', 'jupyter', 'pytest', 'setuptools']
        for e in excludes:
            cmd.append(f'--exclude-module={e}')

        # Add frontend as data
        for root, dirs, files in os.walk(FRONTEND_DIR):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.dirname(os.path.relpath(full, BASE_DIR))
                cmd.append(f'--add-data={full};{rel}')

        cmd.append(os.path.join(BASE_DIR, 'main.py'))
    else:
        # Use spec file for onedir
        cmd.append(SPEC_PATH)
        cmd.append('--clean')

    run_cmd(cmd, f"Compilando DevTools ({mode})")
    print(f"\n  EXITO! Compilacion completada.")


def clean_build_artifacts():
    """Limpiar archivos temporales de compilacion."""
    print("[4/5] Limpiando temporales...")
    for d in [BUILD_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
            print(f"  Eliminado: {d}")

    # Clean .spec backups
    for f in glob.glob(os.path.join(BASE_DIR, '*.spec.bak')):
        os.remove(f)
        print(f"  Eliminado: {f}")


def show_results():
    """Mostrar informacion del resultado."""
    print(f"\n[5/5] Resultado de la compilacion:")
    print(f"{'='*60}")

    if os.path.exists(DIST_DIR):
        items = os.listdir(DIST_DIR)
        for item in items:
            item_path = os.path.join(DIST_DIR, item)
            if os.path.isdir(item_path):
                # Count files
                count = sum(len(files) for _, _, files in os.walk(item_path))
                total_size = sum(
                    os.path.getsize(os.path.join(dp, f))
                    for dp, _, fns in os.walk(item_path)
                    for f in fns
                )
                size_mb = total_size / (1024 * 1024)
                print(f"  Carpeta:  dist/{item}/")
                print(f"  Archivos: {count}")
                print(f"  Tamano:   {size_mb:.1f} MB")
            elif os.path.isfile(item_path):
                size_mb = os.path.getsize(item_path) / (1024 * 1024)
                print(f"  Archivo:  dist/{item}")
                print(f"  Tamano:   {size_mb:.1f} MB")

    print(f"\n  Para ejecutar:")
    if os.path.exists(os.path.join(DIST_DIR, 'DevTools')):
        print(f"    dist/DevTools/DevTools.exe")
    elif os.path.exists(os.path.join(DIST_DIR, 'DevTools.exe')):
        print(f"    dist/DevTools.exe")

    print(f"\n  Para distribuir:")
    print(f"    Comprime la carpeta dist/DevTools/ en un .zip")
    print(f"    El usuario solo necesita descomprimir y ejecutar DevTools.exe")


def main():
    parser = argparse.ArgumentParser(
        description='Compilar DevTools a EXE',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python build.py                # Compilar en modo onedir
  python build.py --onefile      # Compilar como .exe unico
  python build.py --no-icon      # Sin generar icono
  python build.py --clean-only   # Solo limpiar temporales
        """
    )
    parser.add_argument(
        '--onefile', '-1',
        action='store_true',
        help='Generar un .exe unico (en vez de carpeta)',
    )
    parser.add_argument(
        '--no-icon', '-n',
        action='store_true',
        help='No generar el icono (usar existente o ninguno)',
    )
    parser.add_argument(
        '--clean-only',
        action='store_true',
        help='Solo limpiar archivos temporales de compilacion',
    )
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════╗")
    print("  ║   DevTools — Build System            ║")
    print("  ║   Game Dev Command Center            ║")
    print("  ╚══════════════════════════════════════╝")

    if args.clean_only:
        clean_build_artifacts()
        return

    # 1. Check deps
    check_pip_dependencies()

    # 2. Generate icon
    if not args.no_icon:
        generate_icon()
    else:
        print("[2/5] Generacion de icono omitida (--no-icon)")

    # 3. Compile
    compile_exe(onefile=args.onefile)

    # 4. Clean
    clean_build_artifacts()

    # 5. Show results
    show_results()

    print(f"\n  Compilacion finalizada!")
    print()


if __name__ == '__main__':
    # Need glob import for show_results
    import glob
    main()
