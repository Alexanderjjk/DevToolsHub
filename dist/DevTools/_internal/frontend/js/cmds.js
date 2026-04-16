/**
 * ============================================================
 * GAME DEV HUB — cmds.js
 * Seccion Comandos: Command palette + atajos + referencia
 * v0.9 — 150 comandos populares: bash, git, docker, node, python, etc.
 * ============================================================
 */

const CMDS_REFERENCE = [
    // =========== BASH / SHELL (20) ===========
    { cmd: 'ls -la', desc: 'Listar archivos con detalles y ocultos', cat: 'Bash' },
    { cmd: 'cd ..', desc: 'Subir un directorio', cat: 'Bash' },
    { cmd: 'pwd', desc: 'Mostrar directorio actual', cat: 'Bash' },
    { cmd: 'mkdir -p path/to/dir', desc: 'Crear directorio y padres', cat: 'Bash' },
    { cmd: 'rm -rf dir/', desc: 'Eliminar directorio recursivamente', cat: 'Bash' },
    { cmd: 'cp -r src/ dest/', desc: 'Copiar directorio recursivamente', cat: 'Bash' },
    { cmd: 'mv old new', desc: 'Mover o renombrar archivo', cat: 'Bash' },
    { cmd: 'chmod +x file', desc: 'Dar permisos de ejecucion', cat: 'Bash' },
    { cmd: 'chown user:group file', desc: 'Cambiar propietario', cat: 'Bash' },
    { cmd: 'ln -s target link', desc: 'Crear enlace simbolico', cat: 'Bash' },
    { cmd: 'find . -name "*.js"', desc: 'Buscar archivos por nombre', cat: 'Bash' },
    { cmd: 'grep -rn "pattern" .', desc: 'Buscar texto en archivos recursivo', cat: 'Bash' },
    { cmd: 'cat file.txt', desc: 'Mostrar contenido de archivo', cat: 'Bash' },
    { cmd: 'head -n 20 file', desc: 'Primeras 20 lineas', cat: 'Bash' },
    { cmd: 'tail -f file.log', desc: 'Seguir archivo en tiempo real', cat: 'Bash' },
    { cmd: 'wc -l file', desc: 'Contar lineas', cat: 'Bash' },
    { cmd: 'sort file | uniq', desc: 'Ordenar y eliminar duplicados', cat: 'Bash' },
    { cmd: 'export VAR=value', desc: 'Definir variable de entorno', cat: 'Bash' },
    { cmd: 'alias ll="ls -la"', desc: 'Crear alias', cat: 'Bash' },
    { cmd: 'history | grep "cmd"', desc: 'Buscar en historial', cat: 'Bash' },

    // =========== GIT (25) ===========
    { cmd: 'git init', desc: 'Inicializar repositorio', cat: 'Git' },
    { cmd: 'git clone url', desc: 'Clonar repositorio', cat: 'Git' },
    { cmd: 'git add .', desc: 'Agregar todo al staging', cat: 'Git' },
    { cmd: 'git add -p', desc: 'Agregar parche interactivo', cat: 'Git' },
    { cmd: 'git commit -m "msg"', desc: 'Commitear cambios', cat: 'Git' },
    { cmd: 'git commit --amend', desc: 'Corregir ultimo commit', cat: 'Git' },
    { cmd: 'git status', desc: 'Estado del working tree', cat: 'Git' },
    { cmd: 'git diff', desc: 'Ver cambios sin commitear', cat: 'Git' },
    { cmd: 'git diff --staged', desc: 'Ver cambios en staging', cat: 'Git' },
    { cmd: 'git log --oneline -20', desc: 'Historial compacto', cat: 'Git' },
    { cmd: 'git log --graph --oneline', desc: 'Historial con grafico', cat: 'Git' },
    { cmd: 'git branch', desc: 'Listar ramas', cat: 'Git' },
    { cmd: 'git branch new-branch', desc: 'Crear rama', cat: 'Git' },
    { cmd: 'git checkout -b feat', desc: 'Crear y cambiar rama', cat: 'Git' },
    { cmd: 'git switch main', desc: 'Cambiar de rama', cat: 'Git' },
    { cmd: 'git merge feature', desc: 'Fusionar rama', cat: 'Git' },
    { cmd: 'git rebase main', desc: 'Rebase sobre main', cat: 'Git' },
    { cmd: 'git cherry-pick abc123', desc: 'Aplicar commit especifico', cat: 'Git' },
    { cmd: 'git stash', desc: 'Guardar cambios temporalmente', cat: 'Git' },
    { cmd: 'git stash pop', desc: 'Restaurar stash', cat: 'Git' },
    { cmd: 'git remote -v', desc: 'Listar remotos', cat: 'Git' },
    { cmd: 'git push origin main', desc: 'Subir al remoto', cat: 'Git' },
    { cmd: 'git pull --rebase', desc: 'Bajar con rebase', cat: 'Git' },
    { cmd: 'git fetch --all', desc: 'Actualizar remotos', cat: 'Git' },
    { cmd: 'git reset --hard HEAD~1', desc: 'Deshacer ultimo commit', cat: 'Git' },

    // =========== DOCKER (20) ===========
    { cmd: 'docker ps', desc: 'Contenedores activos', cat: 'Docker' },
    { cmd: 'docker ps -a', desc: 'Todos los contenedores', cat: 'Docker' },
    { cmd: 'docker images', desc: 'Listar imagenes', cat: 'Docker' },
    { cmd: 'docker build -t name .', desc: 'Construir imagen', cat: 'Docker' },
    { cmd: 'docker run -d -p 8080:80 img', desc: 'Ejecutar contenedor', cat: 'Docker' },
    { cmd: 'docker run -it ubuntu bash', desc: 'Shell interactivo', cat: 'Docker' },
    { cmd: 'docker stop container', desc: 'Detener contenedor', cat: 'Docker' },
    { cmd: 'docker start container', desc: 'Iniciar contenedor', cat: 'Docker' },
    { cmd: 'docker restart container', desc: 'Reiniciar contenedor', cat: 'Docker' },
    { cmd: 'docker rm container', desc: 'Eliminar contenedor', cat: 'Docker' },
    { cmd: 'docker rmi image', desc: 'Eliminar imagen', cat: 'Docker' },
    { cmd: 'docker logs -f container', desc: 'Logs en tiempo real', cat: 'Docker' },
    { cmd: 'docker exec -it cont bash', desc: 'Entrar a contenedor', cat: 'Docker' },
    { cmd: 'docker cp src cont:dest', desc: 'Copiar archivos al contenedor', cat: 'Docker' },
    { cmd: 'docker-compose up -d', desc: 'Levantar compose en background', cat: 'Docker' },
    { cmd: 'docker-compose down', desc: 'Detener compose', cat: 'Docker' },
    { cmd: 'docker-compose logs -f', desc: 'Logs de compose', cat: 'Docker' },
    { cmd: 'docker system prune -a', desc: 'Limpiar todo Docker', cat: 'Docker' },
    { cmd: 'docker volume ls', desc: 'Listar volumenes', cat: 'Docker' },
    { cmd: 'docker network ls', desc: 'Listar redes', cat: 'Docker' },

    // =========== NODE / NPM / NVM (20) ===========
    { cmd: 'node -v', desc: 'Version de Node', cat: 'Node' },
    { cmd: 'npm init -y', desc: 'Init package.json', cat: 'Node' },
    { cmd: 'npm install pkg', desc: 'Instalar paquete', cat: 'Node' },
    { cmd: 'npm install -D pkg', desc: 'Instalar como devDep', cat: 'Node' },
    { cmd: 'npm install -g pkg', desc: 'Instalar globalmente', cat: 'Node' },
    { cmd: 'npm run dev', desc: 'Script dev', cat: 'Node' },
    { cmd: 'npm run build', desc: 'Script build', cat: 'Node' },
    { cmd: 'npm run start', desc: 'Script start', cat: 'Node' },
    { cmd: 'npm update', desc: 'Actualizar dependencias', cat: 'Node' },
    { cmd: 'npm audit', desc: 'Auditoria de seguridad', cat: 'Node' },
    { cmd: 'npm ls --depth=0', desc: 'Dependencias instaladas', cat: 'Node' },
    { cmd: 'npx create-next-app', desc: 'Crear proyecto Next.js', cat: 'Node' },
    { cmd: 'npx vite create', desc: 'Crear proyecto Vite', cat: 'Node' },
    { cmd: 'npx tsx file.ts', desc: 'Ejecutar TypeScript', cat: 'Node' },
    { cmd: 'nvm use 20', desc: 'Cambiar version Node', cat: 'Node' },
    { cmd: 'nvm install 22', desc: 'Instalar version Node', cat: 'Node' },
    { cmd: 'npx prisma migrate dev', desc: 'Migrar base de datos', cat: 'Node' },
    { cmd: 'npx prisma studio', desc: 'DB browser de Prisma', cat: 'Node' },
    { cmd: 'npm cache clean --force', desc: 'Limpiar cache npm', cat: 'Node' },
    { cmd: 'node --inspect script.js', desc: 'Debug mode Node', cat: 'Node' },

    // =========== PYTHON / PIP (15) ===========
    { cmd: 'python3 -m venv .venv', desc: 'Crear entorno virtual', cat: 'Python' },
    { cmd: 'source .venv/bin/activate', desc: 'Activar venv (Linux/Mac)', cat: 'Python' },
    { cmd: '.venv\\Scripts\\activate', desc: 'Activar venv (Windows)', cat: 'Python' },
    { cmd: 'pip install -r requirements.txt', desc: 'Instalar dependencias', cat: 'Python' },
    { cmd: 'pip install pkg', desc: 'Instalar paquete', cat: 'Python' },
    { cmd: 'pip install --upgrade pip', desc: 'Actualizar pip', cat: 'Python' },
    { cmd: 'pip freeze > requirements.txt', desc: 'Exportar dependencias', cat: 'Python' },
    { cmd: 'pip list', desc: 'Paquetes instalados', cat: 'Python' },
    { cmd: 'python app.py', desc: 'Ejecutar script', cat: 'Python' },
    { cmd: 'python -m http.server 8000', desc: 'Servidor HTTP simple', cat: 'Python' },
    { cmd: 'python -m pytest', desc: 'Ejecutar tests', cat: 'Python' },
    { cmd: 'python -m black .', desc: 'Formatear codigo', cat: 'Python' },
    { cmd: 'python -m flask run', desc: 'Levantar servidor Flask', cat: 'Python' },
    { cmd: 'uvicorn main:app --reload', desc: 'FastAPI con reload', cat: 'Python' },
    { cmd: 'pip show pkg', desc: 'Info de un paquete', cat: 'Python' },

    // =========== NETWORK / CURL (15) ===========
    { cmd: 'curl url', desc: 'Peticion GET', cat: 'Network' },
    { cmd: 'curl -X POST -H "Content-Type: application/json" -d \'{}\' url', desc: 'POST JSON', cat: 'Network' },
    { cmd: 'curl -I url', desc: 'Solo headers', cat: 'Network' },
    { cmd: 'curl -o file.zip url', desc: 'Descargar archivo', cat: 'Network' },
    { cmd: 'curl -s url | jq', desc: 'Formatear JSON', cat: 'Network' },
    { cmd: 'ping host', desc: 'Ping a host', cat: 'Network' },
    { cmd: 'ip addr show', desc: 'Direcciones IP', cat: 'Network' },
    { cmd: 'ifconfig', desc: 'Interfaces de red', cat: 'Network' },
    { cmd: 'netstat -tlnp', desc: 'Puertos en escucha', cat: 'Network' },
    { cmd: 'ss -tlnp', desc: 'Puertos abiertos (alternativa)', cat: 'Network' },
    { cmd: 'lsof -i :3000', desc: 'Proceso en puerto 3000', cat: 'Network' },
    { cmd: 'ssh user@host', desc: 'Conexion SSH', cat: 'Network' },
    { cmd: 'scp file user@host:path', desc: 'Copiar via SSH', cat: 'Network' },
    { cmd: 'wget url', desc: 'Descargar con wget', cat: 'Network' },
    { cmd: 'nslookup domain', desc: 'DNS lookup', cat: 'Network' },

    // =========== PROCESSES / SYSTEM (15) ===========
    { cmd: 'ps aux', desc: 'Procesos del sistema', cat: 'System' },
    { cmd: 'ps aux | grep node', desc: 'Buscar proceso', cat: 'System' },
    { cmd: 'top / htop', desc: 'Monitor de procesos', cat: 'System' },
    { cmd: 'kill -9 PID', desc: 'Matar proceso forzado', cat: 'System' },
    { cmd: 'killall node', desc: 'Matar todos los procesos node', cat: 'System' },
    { cmd: 'df -h', desc: 'Espacio en disco', cat: 'System' },
    { cmd: 'du -sh dir/', desc: 'Tamano de directorio', cat: 'System' },
    { cmd: 'du -sh * | sort -rh | head', desc: 'Directorios mas grandes', cat: 'System' },
    { cmd: 'free -h', desc: 'Memoria RAM', cat: 'System' },
    { cmd: 'uptime', desc: 'Tiempo de actividad', cat: 'System' },
    { cmd: 'whoami', desc: 'Usuario actual', cat: 'System' },
    { cmd: 'uname -a', desc: 'Info del sistema', cat: 'System' },
    { cmd: 'crontab -e', desc: 'Editar crontab', cat: 'System' },
    { cmd: 'nohup command &', desc: 'Ejecutar en background', cat: 'System' },
    { cmd: 'watch -n 1 "cmd"', desc: 'Ejecutar periodicamente', cat: 'System' },

    // =========== ARCHIVOS / TEXTO (15) ===========
    { cmd: 'tar -czf file.tar.gz dir/', desc: 'Comprimir en tar.gz', cat: 'Files' },
    { cmd: 'tar -xzf file.tar.gz', desc: 'Descomprimir tar.gz', cat: 'Files' },
    { cmd: 'zip -r out.zip dir/', desc: 'Comprimir en zip', cat: 'Files' },
    { cmd: 'unzip file.zip', desc: 'Descomprimir zip', cat: 'Files' },
    { cmd: 'sed -i "s/old/new/g" file', desc: 'Reemplazar texto en archivo', cat: 'Files' },
    { cmd: 'awk "{print $1}" file', desc: 'Extraer columna', cat: 'Files' },
    { cmd: 'cut -d"," -f1 file.csv', desc: 'Extraer campo CSV', cat: 'Files' },
    { cmd: 'tr "a-z" "A-Z" < file', desc: 'Convertir a mayusculas', cat: 'Files' },
    { cmd: 'split -l 1000 file', desc: 'Dividir archivo en partes', cat: 'Files' },
    { cmd: 'md5sum file', desc: 'Hash MD5', cat: 'Files' },
    { cmd: 'sha256sum file', desc: 'Hash SHA256', cat: 'Files' },
    { cmd: 'file filename', desc: 'Tipo de archivo', cat: 'Files' },
    { cmd: 'stat file', desc: 'Metadatos del archivo', cat: 'Files' },
    { cmd: 'basename /path/to/file', desc: 'Nombre del archivo', cat: 'Files' },
    { cmd: 'dirname /path/to/file', desc: 'Directorio del archivo', cat: 'Files' },

    // =========== GAME DEV / ASSETS (15) ===========
    { cmd: 'ffmpeg -i in.mp4 out.gif', desc: 'Convertir video a GIF', cat: 'GameDev' },
    { cmd: 'ffmpeg -i in.png -q:v 1 out.jpg', desc: 'Convertir imagen PNG a JPG', cat: 'GameDev' },
    { cmd: 'ffmpeg -i in.wav -b:a 192k out.mp3', desc: 'Convertir audio WAV a MP3', cat: 'GameDev' },
    { cmd: 'ffmpeg -ss 0 -t 30 -i in.mp4 out.mp4', desc: 'Recortar video 30 seg', cat: 'GameDev' },
    { cmd: 'convert in.png -resize 50% out.png', desc: 'Redimensionar imagen (ImageMagick)', cat: 'GameDev' },
    { cmd: 'identify -verbose img.png', desc: 'Info detallada de imagen', cat: 'GameDev' },
    { cmd: 'tilemaker in.png out_sprites.png', desc: 'Generar sprite sheet', cat: 'GameDev' },
    { cmd: 'magick mogrify -format webp *.png', desc: 'Batch PNG a WebP', cat: 'GameDev' },
    { cmd: 'aseprite -b sprite.ase -o sprite.png', desc: 'Exportar Aseprite CLI', cat: 'GameDev' },
    { cmd: 'godot --headless --script game.gd', desc: 'Godot headless CLI', cat: 'GameDev' },
    { cmd: 'unity -batchmode -quit', desc: 'Unity batch mode', cat: 'GameDev' },
    { cmd: 'glslangValidator shader.glsl', desc: 'Validar shader GLSL', cat: 'GameDev' },
    { cmd: 'sox in.wav out.mp3', desc: 'Convertir audio con Sox', cat: 'GameDev' },
    { cmd: 'exiftool img.png', desc: 'Metadata de imagen/audio', cat: 'GameDev' },
    { cmd: 'optipng -o7 file.png', desc: 'Optimizar PNG', cat: 'GameDev' },
];

registerSection('cmds', {
    _commands: [],
    _activeCat: 'all',
    _searchQuery: '',

    render() {
        const categories = [...new Set(CMDS_REFERENCE.map(c => c.cat))];

        return `
            <div class="section">
                <div class="section-header">
                    <h2>Comandos</h2>
                    <div class="section-header-actions">
                        <span class="cmds-count-badge">${CMDS_REFERENCE.length} comandos</span>
                        <button class="btn btn-secondary btn-sm" id="btn-open-palette">
                            &#8984; Palette
                        </button>
                    </div>
                </div>
                <div class="section-body">
                    <!-- Command palette -->
                    <div class="cmd-palette-demo">
                        <div class="search-bar mb-3">
                            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input type="text" id="cmd-search" placeholder="Buscar comando... (${shortcutToKbd('globalSearch')} para palette global)">
                        </div>
                        <div id="cmd-results"></div>
                    </div>

                    <!-- Category chips -->
                    <div class="cmds-categories" id="cmds-categories">
                        <button class="cmds-cat-chip active" data-cat="all">Todos (${CMDS_REFERENCE.length})</button>
                        ${categories.map(cat => {
                            const count = CMDS_REFERENCE.filter(c => c.cat === cat).length;
                            return `<button class="cmds-cat-chip" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)} (${count})</button>`;
                        }).join('')}
                    </div>

                    <!-- Reference grid -->
                    <div id="cmds-ref-grid" class="cmds-ref-grid"></div>

                    <h3 style="font-size:14px;font-weight:600;margin:24px 0 12px;">Atajos globales</h3>
                    <div class="cmds-list">
                        <div class="cmd-item"><kbd class="cmd-item-kbd">${shortcutToKbd('quickNotes')}</kbd><span class="cmd-item-desc">Abrir panel rapido de notas</span></div>
                        <div class="cmd-item"><kbd class="cmd-item-kbd">${shortcutToKbd('themePicker')}</kbd><span class="cmd-item-desc">Abrir selector de color de acento</span></div>
                        <div class="cmd-item"><kbd class="cmd-item-kbd">${shortcutToKbd('timerOverlay')}</kbd><span class="cmd-item-desc">Mostrar temporizador en pantalla</span></div>
                        <div class="cmd-item"><kbd class="cmd-item-kbd">${shortcutToKbd('globalSearch')}</kbd><span class="cmd-item-desc">Abrir command palette</span></div>
                        <div class="cmd-item"><kbd class="cmd-item-kbd">Escape</kbd><span class="cmd-item-desc">Cerrar modales y overlays</span></div>
                    </div>

                    <h3 style="font-size:14px;font-weight:600;margin:24px 0 12px;">Acciones rapidas</h3>
                    <div class="cmds-list">
                        <div class="cmd-item cmd-clickable" data-action="new-note"><kbd class="cmd-item-kbd">nota:nueva</kbd><span class="cmd-item-desc">Crear una nueva nota</span></div>
                        <div class="cmd-item cmd-clickable" data-action="new-task"><kbd class="cmd-item-kbd">tarea:nueva</kbd><span class="cmd-item-desc">Crear una nueva tarea</span></div>
                        <div class="cmd-item cmd-clickable" data-action="timer-start"><kbd class="cmd-item-kbd">timer:iniciar</kbd><span class="cmd-item-desc">Iniciar temporizador Pomodoro</span></div>
                        <div class="cmd-item cmd-clickable" data-action="go-home"><kbd class="cmd-item-kbd">ir:inicio</kbd><span class="cmd-item-desc">Ir a la seccion de inicio</span></div>
                        <div class="cmd-item cmd-clickable" data-action="go-tools"><kbd class="cmd-item-kbd">ir:herramientas</kbd><span class="cmd-item-desc">Ir a la seccion de herramientas</span></div>
                        <div class="cmd-item cmd-clickable" data-action="go-notes"><kbd class="cmd-item-kbd">ir:notas</kbd><span class="cmd-item-desc">Ir a la seccion de notas</span></div>
                        <div class="cmd-item cmd-clickable" data-action="go-timer"><kbd class="cmd-item-kbd">ir:timer</kbd><span class="cmd-item-desc">Ir al temporizador</span></div>
                        <div class="cmd-item cmd-clickable" data-action="go-tasks"><kbd class="cmd-item-kbd">ir:tareas</kbd><span class="cmd-item-desc">Ir a la seccion de tareas</span></div>
                    </div>
                </div>
            </div>
        `;
    },

    async load() {
        this._buildCommands();
        this._renderRefGrid();

        // Category chips
        const chipsContainer = document.getElementById('cmds-categories');
        if (chipsContainer) {
            chipsContainer.querySelectorAll('.cmds-cat-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chipsContainer.querySelectorAll('.cmds-cat-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    this._activeCat = chip.dataset.cat;
                    this._renderRefGrid();
                });
            });
        }

        // Search
        const search = document.getElementById('cmd-search');
        if (search) {
            search.addEventListener('input', debounce(() => {
                this._searchQuery = search.value;
                this._renderRefGrid();
                this._filterCommands(search.value);
            }, 150));
            search.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._executeFirstResult();
                if (e.key === 'Escape') { search.value = ''; this._filterCommands(''); this._searchQuery = ''; this._renderRefGrid(); }
            });
            search.focus();
        }

        // Quick actions
        $$('.cmd-clickable').forEach(item => {
            item.addEventListener('click', () => this._executeAction(item.dataset.action));
        });

        // Palette button
        const paletteBtn = document.getElementById('btn-open-palette');
        if (paletteBtn) {
            paletteBtn.addEventListener('click', () => {
                const search = document.getElementById('cmd-search');
                if (search) { search.value = ''; search.focus(); this._filterCommands(''); }
            });
        }
    },

    unload() {},

    _buildCommands() {
        this._commands = [
            { cmd: 'nota:nueva', label: 'Crear nueva nota', action: 'new-note', category: 'Notas' },
            { cmd: 'nota:buscar', label: 'Buscar en notas', action: 'go-notes', category: 'Notas' },
            { cmd: 'tarea:nueva', label: 'Crear nueva tarea', action: 'new-task', category: 'Tareas' },
            { cmd: 'tarea:ver', label: 'Ver tareas', action: 'go-tasks', category: 'Tareas' },
            { cmd: 'timer:iniciar', label: 'Iniciar Pomodoro', action: 'timer-start', category: 'Timer' },
            { cmd: 'timer:ver', label: 'Ir a temporizador', action: 'go-timer', category: 'Timer' },
            { cmd: 'ir:inicio', label: 'Ir a inicio', action: 'go-home', category: 'Navegacion' },
            { cmd: 'ir:herramientas', label: 'Ir a herramientas', action: 'go-tools', category: 'Navegacion' },
            { cmd: 'ir:notas', label: 'Ir a notas', action: 'go-notes', category: 'Navegacion' },
            { cmd: 'ir:timer', label: 'Ir a timer', action: 'go-timer', category: 'Navegacion' },
            { cmd: 'ir:tareas', label: 'Ir a tareas', action: 'go-tasks', category: 'Navegacion' },
            { cmd: 'ir:docs', label: 'Ir a documentacion', action: 'go-docs', category: 'Navegacion' },
            { cmd: 'ir:stats', label: 'Ir a estadisticas', action: 'go-stats', category: 'Navegacion' },
            { cmd: 'ir:config', label: 'Ir a configuracion', action: 'go-settings', category: 'Navegacion' },
            { cmd: 'tema:cambiar', label: 'Cambiar color de acento', action: 'change-theme', category: 'Apariencia' },
            { cmd: 'tema:blurple', label: 'Tema Blurple', action: 'theme-blurple', category: 'Apariencia' },
            { cmd: 'tema:green', label: 'Tema Green', action: 'theme-green', category: 'Apariencia' },
            { cmd: 'tema:yellow', label: 'Tema Yellow', action: 'theme-yellow', category: 'Apariencia' },
            { cmd: 'tema:red', label: 'Tema Red', action: 'theme-red', category: 'Apariencia' },
        ];
    },

    _renderRefGrid() {
        const grid = document.getElementById('cmds-ref-grid');
        if (!grid) return;

        let filtered = CMDS_REFERENCE;

        // Filter by category
        if (this._activeCat !== 'all') {
            filtered = filtered.filter(c => c.cat === this._activeCat);
        }

        // Filter by search
        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.cmd.toLowerCase().includes(q) ||
                c.desc.toLowerCase().includes(q) ||
                c.cat.toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<p style="padding:16px;color:var(--text-muted);grid-column:1/-1;">Sin resultados</p>';
            return;
        }

        grid.innerHTML = filtered.map(c => `
            <div class="cmds-ref-item" data-cmd="${escapeHtml(c.cmd)}" title="${escapeHtml(c.desc)}">
                <span class="cmds-ref-cmd">${escapeHtml(c.cmd)}</span>
                <span class="cmds-ref-desc">${escapeHtml(c.desc)}</span>
                <button class="cmds-ref-copy" title="Copiar" data-copy="${escapeHtml(c.cmd)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Copy buttons
        grid.querySelectorAll('.cmds-ref-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cmd = btn.dataset.copy;
                navigator.clipboard.writeText(cmd).then(() => {
                    btn.classList.add('copied');
                    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                    }, 1500);
                });
            });
        });

        // Click on item to copy
        grid.querySelectorAll('.cmds-ref-item').forEach(item => {
            item.addEventListener('click', () => {
                const cmd = item.dataset.cmd;
                navigator.clipboard.writeText(cmd).then(() => {
                    showToast(`Copiado: ${cmd}`, 'success', 2000);
                });
            });
        });
    },

    _filterCommands(query) {
        const results = document.getElementById('cmd-results');
        if (!results) return;

        if (!query) { results.innerHTML = ''; return; }

        const q = query.toLowerCase();
        const filtered = this._commands.filter(c =>
            c.cmd.includes(q) || c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
        );

        if (filtered.length === 0) {
            results.innerHTML = '<p class="text-muted" style="padding:12px;font-size:13px;">Sin resultados</p>';
            return;
        }

        const groups = {};
        filtered.forEach(c => {
            if (!groups[c.category]) groups[c.category] = [];
            groups[c.category].push(c);
        });

        let html = '';
        for (const [cat, cmds] of Object.entries(groups)) {
            html += `<div class="cmd-group"><div class="cmd-group-label">${escapeHtml(cat)}</div>`;
            cmds.forEach(c => {
                html += `<div class="cmd-result-item" data-action="${escapeHtml(c.action)}">
                    <kbd class="cmd-item-kbd">${escapeHtml(c.cmd)}</kbd>
                    <span class="cmd-result-label">${escapeHtml(c.label)}</span>
                </div>`;
            });
            html += '</div>';
        }

        results.innerHTML = html;

        results.querySelectorAll('.cmd-result-item').forEach(item => {
            item.addEventListener('click', () => this._executeAction(item.dataset.action));
        });
    },

    _executeFirstResult() {
        const first = document.querySelector('.cmd-result-item');
        if (first) this._executeAction(first.dataset.action);
    },

    _executeAction(action) {
        const actions = {
            'new-note': async () => {
                await navigateTo('notes');
                document.dispatchEvent(new CustomEvent('create-new-note'));
            },
            'new-task': async () => { await navigateTo('tasks'); },
            'timer-start': async () => { await navigateTo('timer'); },
            'go-home': () => navigateTo('home'),
            'go-tools': () => navigateTo('tools'),
            'go-notes': () => navigateTo('notes'),
            'go-timer': () => navigateTo('timer'),
            'go-tasks': () => navigateTo('tasks'),
            'go-docs': () => navigateTo('docs'),
            'go-stats': () => navigateTo('stats'),
            'go-settings': () => navigateTo('settings'),
            'change-theme': () => toggleThemePicker(true),
            'theme-blurple': () => setAccentColor('#5865F2', 'blurple'),
            'theme-green': () => setAccentColor('#57F287', 'green'),
            'theme-yellow': () => setAccentColor('#FEE75C', 'yellow'),
            'theme-red': () => setAccentColor('#ED4245', 'red'),
        };

        if (actions[action]) {
            actions[action]();
            const search = document.getElementById('cmd-search');
            if (search) search.value = '';
            const results = document.getElementById('cmd-results');
            if (results) results.innerHTML = '';
        }
    }
});
