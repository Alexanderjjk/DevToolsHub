@echo off
REM ═══════════════════════════════════════════════════════════════
REM  DevTools — Compilador rapido a EXE
REM
REM  Uso:
REM    build.bat              Compilar en modo onedir (recomendado)
REM    build.bat onefile      Compilar como .exe unico
REM    build.bat icon         Solo generar el icono
REM    build.bat clean        Limpiar temporales
REM ═══════════════════════════════════════════════════════════════

title DevTools Build
cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║   DevTools — Build System            ║
echo   ║   Game Dev Command Center            ║
echo   ╚══════════════════════════════════════╝
echo.

REM ── Verificar Python ──────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python no encontrado. Instala Python 3.10+
    echo  https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do (
    echo  Python: %%v
)

REM ── Procesar argumento ────────────────────────────────────────────
set MODE=%1
if "%MODE%"=="" set MODE=onedir

if /i "%MODE%"=="icon" goto :icon_only
if /i "%MODE%"=="onefile" goto :do_onefile
if /i "%MODE%"=="onedir" goto :do_onedir
if /i "%MODE%"=="clean" goto :do_clean

echo  [ERROR] Modo desconocido: %MODE%
echo  Usos validos: onedir, onefile, icon, clean
pause
exit /b 1

REM ── Solo icono ───────────────────────────────────────────────────
:icon_only
echo  [1/1] Generando icono...
python generate_icon.py
echo.
echo  Icono generado. Buscalo en: frontend\icon.ico
pause
exit /b 0

REM ── Limpiar ──────────────────────────────────────────────────────
:do_clean
echo  Limpiando temporales de compilacion...
if exist "build" rmdir /s /q "build"
if exist "__pycache__" rmdir /s /q "__pycache__"
for /d %%d in (backend\__pycache__) do if exist "%%d" rmdir /s /q "%%d"
del /q *.spec.bak 2>nul
echo  Listo!
pause
exit /b 0

REM ── Modo OneDir (recomendado) ────────────────────────────────────
:do_onedir
echo  [1/4] Instalando dependencias...
pip install pyinstaller Pillow --quiet 2>nul

echo  [2/4] Generando icono...
if not exist "frontend\icon.ico" python generate_icon.py

echo  [3/4] Compilando (onedir)...
pyinstaller DevTools.spec --clean
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] La compilacion fallo.
    pause
    exit /b 1
)

echo  [4/4] Limpiando temporales...
if exist "build" rmdir /s /q "build"

goto :show_result

REM ── Modo OneFile (exe unico) ────────────────────────────────────
:do_onefile
echo  [1/4] Instalando dependencias...
pip install pyinstaller Pillow --quiet 2>nul

echo  [2/4] Generando icono...
if not exist "frontend\icon.ico" python generate_icon.py

echo  [3/4] Compilando (onefile)...
pyinstaller --onefile --name=DevTools --windowed --clean ^
    --add-data="frontend;frontend" ^
    --hidden-import=backend.database ^
    --hidden-import=backend.api ^
    --hidden-import=backend.global_hotkeys ^
    --hidden-import=backend.icon_manager ^
    --hidden-import=backend.icon_library ^
    --hidden-import=backend.launcher_manager ^
    --hidden-import=backend.docs_manager ^
    --hidden-import=backend.sessions_manager ^
    --hidden-import=backend.notes_manager ^
    --hidden-import=backend.tasks_manager ^
    --hidden-import=backend.favicon_downloader ^
    --hidden-import=backend.favicon_manager ^
    --hidden-import=PIL.Image ^
    --hidden-import=PIL.ImageDraw ^
    --hidden-import=ctypes.wintypes ^
    --hidden-import=keyboard ^
    --hidden-import=webview ^
    --exclude-module=matplotlib ^
    main.py

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] La compilacion fallo.
    pause
    exit /b 1
)

echo  [4/4] Limpiando temporales...
if exist "build" rmdir /s /q "build"

goto :show_result

REM ── Mostrar resultado ────────────────────────────────────────────
:show_result
echo.
echo  ═══════════════════════════════════════════════
echo   COMPILACION EXITOSA!
echo  ═══════════════════════════════════════════════
echo.
echo   Output: dist\DevTools\
echo.
echo   Para ejecutar:
echo     dist\DevTools\DevTools.exe
echo.
echo   Para distribuir:
echo     Comprime dist\DevTools\ en un .zip
echo.
pause
