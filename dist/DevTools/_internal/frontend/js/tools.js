/**
 * ============================================================
 * GAME DEV HUB — tools.js
 * Seccion Herramientas: CRUD de launchers con categorias,
 * modos de icono, busqueda y ejecucion.
 * v0.9 — QoL mejorado: explorador integrado, sugeridos, filtro visual
 * ============================================================
 */

registerSection('tools', {
    _launchers: [],
    _categories: [],
    _iconColors: [],
    _activeCategory: 'all',
    _searchQuery: '',
    _recentPaths: [],

    // ---- Render principal ----
    render() {
        return `
            <div class="section">
                <div class="section-header">
                    <h2>Herramientas</h2>
                    <div class="section-header-actions">
                        <button class="btn btn-primary btn-sm" id="btn-add-launcher">
                            + Agregar herramienta
                        </button>
                    </div>
                </div>
                <div class="section-body">
                    <!-- Toolbar: busqueda + categorias -->
                    <div class="tools-toolbar">
                        <div class="tools-search-bar search-bar">
                            <input type="text" id="tools-search" placeholder="Buscar herramienta..." class="search-input">
                        </div>
                        <div class="tools-category-tabs" id="tools-category-tabs">
                            <button class="cat-tab active" data-cat="all">Todos</button>
                        </div>
                    </div>

                    <!-- Contenedor de launchers -->
                    <div id="launchers-container">
                        <div class="spinner-container" style="min-height:200px;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ---- Inicializacion ----
    async load() {
        const addBtn = document.getElementById('btn-add-launcher');
        if (addBtn) {
            addBtn.addEventListener('click', () => this._showAddDialog());
        }

        const searchInput = document.getElementById('tools-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this._searchQuery = e.target.value;
                this._renderLaunchers();
            }, 200));
        }

        // Cargar rutas recientes
        try {
            const saved = localStorage.getItem('devtools-recent-paths');
            if (saved) this._recentPaths = JSON.parse(saved);
        } catch(e) { this._recentPaths = []; }

        await this._loadData();
    },

    unload() {
        this._launchers = [];
        this._categories = [];
        this._activeCategory = 'all';
        this._searchQuery = '';
    },

    // ---- Cargar datos desde la API ----
    async _loadData() {
        const a = api();
        if (!a) {
            document.getElementById('launchers-container').innerHTML =
                this._renderEmpty('pywebview no disponible. Reinicia la app.');
            return;
        }

        try {
            const [launchers, categories, colors] = await Promise.all([
                a.get_launchers().catch(() => []),
                a.get_launcher_categories().catch(() => []),
                a.get_launcher_icon_colors().catch(() => [])
            ]);

            this._launchers = launchers || [];
            this._categories = categories || [];
            this._iconColors = colors || [];

            this._renderCategoryTabs();
            this._renderLaunchers();
        } catch (e) {
            console.error('Error cargando herramientas:', e);
            document.getElementById('launchers-container').innerHTML =
                this._renderEmpty('Error al cargar: ' + e.message);
        }
    },

    // ---- Tabs de categorias ----
    _renderCategoryTabs() {
        const tabsContainer = document.getElementById('tools-category-tabs');
        if (!tabsContainer) return;

        let html = `<button class="cat-tab ${this._activeCategory === 'all' ? 'active' : ''}" data-cat="all">Todos</button>`;
        this._categories.forEach(cat => {
            const count = this._launchers.filter(l => l.category === cat.id).length;
            html += `<button class="cat-tab ${this._activeCategory === cat.id ? 'active' : ''}" data-cat="${escapeHtml(cat.id)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}${count > 0 ? ' (' + count + ')' : ''}</button>`;
        });
        tabsContainer.innerHTML = html;

        tabsContainer.querySelectorAll('.cat-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._activeCategory = tab.dataset.cat;
                this._renderCategoryTabs();
                this._renderLaunchers();
            });
        });
    },

    // ---- Filtrar launchers ----
    _getFilteredLaunchers() {
        let filtered = this._launchers;
        if (this._activeCategory !== 'all') {
            filtered = filtered.filter(l => l.category === this._activeCategory);
        }
        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                (l.name || '').toLowerCase().includes(q) ||
                (l.exe_path || '').toLowerCase().includes(q) ||
                (l.category || '').toLowerCase().includes(q)
            );
        }
        return filtered;
    },

    // ---- Renderizar lista de launchers ----
    _renderLaunchers() {
        const container = document.getElementById('launchers-container');
        if (!container) return;

        const filtered = this._getFilteredLaunchers();

        if (filtered.length === 0) {
            if (this._launchers.length === 0) {
                container.innerHTML = this._renderEmpty();
                const emptyBtn = document.getElementById('btn-add-launcher-empty');
                if (emptyBtn) emptyBtn.addEventListener('click', () => this._showAddDialog());
            } else {
                container.innerHTML = `
                    <div class="section-empty" style="min-height:200px;">
                        <div class="section-empty-icon">&#128269;</div>
                        <h3>Sin resultados</h3>
                        <p>No se encontraron herramientas con ese filtro.</p>
                    </div>
                `;
            }
            return;
        }

        container.innerHTML = `<div class="launchers-list">${filtered.map(l => this._renderCard(l)).join('')}</div>`;
        this._bindCardEvents(container);
    },

    // ---- Renderizar card individual ----
    _renderCard(launcher) {
        const name = escapeHtml(launcher.name || 'Sin nombre');
        const path = escapeHtml(launcher.exe_path || launcher.path || '');
        const id = escapeHtml(launcher.id);
        const category = launcher.category || 'general';

        const catInfo = this._categories.find(c => c.id === category);
        const catName = catInfo ? catInfo.name : category;
        const catIcon = catInfo ? catInfo.icon : '';

        const iconData = launcher.icon_path || launcher.icon;
        let iconHtml;
        if (iconData) {
            iconHtml = `<img src="data:image/png;base64,${iconData}" alt="${name}" loading="lazy">`;
        } else {
            iconHtml = `<span class="fallback-icon">${catIcon || '&#128295;'}</span>`;
        }

        const fileName = path.split(/[\\/]/).pop();

        return `
            <div class="launcher-card" data-launcher-id="${id}">
                <div class="launcher-card-icon">${iconHtml}</div>
                <div class="launcher-card-info">
                    <h4>${name}</h4>
                    <p>${fileName}</p>
                    <span class="launcher-card-category">${catIcon} ${escapeHtml(catName)}</span>
                </div>
                <div class="launcher-card-actions">
                    <button class="btn btn-primary btn-sm btn-launch" data-id="${id}" title="Ejecutar">
                        &#9654;
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm btn-edit-launcher" data-id="${id}" title="Editar categoria">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm btn-delete-launcher" data-id="${id}" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    // ---- Bind eventos de las cards ----
    _bindCardEvents(container) {
        container.querySelectorAll('.btn-launch').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const a = api();
                if (!a) return;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-sm"></span>';
                try {
                    const result = await a.launch(id);
                    if (result.success !== false) {
                        const trackMsg = result.tracked ? ' (tracking activo)' : '';
                        showToast(result.message || 'Lanzado' + trackMsg, 'success');
                    } else {
                        showToast(result.message || 'Error', 'error');
                    }
                } catch (err) {
                    showToast('Error al ejecutar: ' + err.message, 'error');
                }
                btn.disabled = false;
                btn.innerHTML = '&#9654;';
            });
        });

        container.querySelectorAll('.btn-edit-launcher').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const launcher = this._launchers.find(l => l.id === id);
                if (!launcher) return;
                await this._showEditCategoryDialog(launcher);
            });
        });

        container.querySelectorAll('.btn-delete-launcher').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const launcher = this._launchers.find(l => l.id === id);
                const name = launcher ? launcher.name : 'esta herramienta';
                const confirmed = await showModal(
                    'Eliminar herramienta',
                    `Estas seguro de que queres eliminar "${name}"? Esta accion no se puede deshacer.`,
                    'Eliminar',
                    'btn-danger'
                );
                if (confirmed) {
                    const a = api();
                    if (a) {
                        try {
                            await a.remove_launcher(id);
                            this._launchers = this._launchers.filter(l => l.id !== id);
                            showToast('Herramienta eliminada', 'success');
                            this._renderCategoryTabs();
                            this._renderLaunchers();
                        } catch (err) {
                            showToast('Error al eliminar: ' + err.message, 'error');
                        }
                    }
                }
            });
        });

        container.querySelectorAll('.launcher-card').forEach(card => {
            card.addEventListener('click', async () => {
                const id = card.dataset.launcherId;
                const a = api();
                if (!a) return;
                try {
                    const result = await a.launch(id);
                    if (result.success !== false) {
                        showToast(result.message || 'Lanzado', 'success');
                    } else {
                        showToast(result.message || 'Error', 'error');
                    }
                } catch (err) {
                    showToast('Error al ejecutar: ' + err.message, 'error');
                }
            });
        });
    },

    // ---- Estado vacio ----
    _renderEmpty(msg) {
        const message = msg || 'No hay herramientas configuradas. Agrega tu primera herramienta para comenzar.';
        return `
            <div class="section-empty">
                <div class="section-empty-icon">&#128295;</div>
                <h3>Sin herramientas</h3>
                <p>${escapeHtml(message)}</p>
                <button class="btn btn-primary" id="btn-add-launcher-empty">
                    + Agregar herramienta
                </button>
            </div>
        `;
    },

    // ================================================================
    //  GUARDAR RUTAS RECIENTES
    // ================================================================
    _saveRecentPath(filePath) {
        if (!filePath) return;
        // Evitar duplicados y mantener solo las ultimas 8
        this._recentPaths = this._recentPaths.filter(p => p !== filePath);
        this._recentPaths.unshift(filePath);
        this._recentPaths = this._recentPaths.slice(0, 8);
        try {
            localStorage.setItem('devtools-recent-paths', JSON.stringify(this._recentPaths));
        } catch(e) {}
    },

    _getExistingPaths() {
        // Rutas de launchers ya agregados
        return this._launchers.map(l => (l.exe_path || l.path || '')).filter(p => p);
    },

    // ================================================================
    //  DIALOGO: AGREGAR HERRAMIENTA (v2 — QoL mejorado)
    // ================================================================
    async _showAddDialog() {
        const a = api();
        if (!a) {
            showToast('pywebview no disponible. Reinicia la app.', 'error');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'z-index:10000;';

        const existingPaths = this._getExistingPaths();
        const recentPaths = this._recentPaths.filter(p => !existingPaths.includes(p));
        const allSuggested = [...recentPaths, ...existingPaths].slice(0, 6);
        const hasSuggestions = allSuggested.length > 0;

        // Build category chips HTML
        const catChipsHtml = this._categories.map(c => `
            <button class="addtool-cat-chip" data-cat="${escapeHtml(c.id)}" title="${escapeHtml(c.name)}">
                <span>${escapeHtml(c.icon)}</span>
            </button>
        `).join('');

        // Build icon mode options HTML
        const iconModeHtml = [
            { id: 'auto', label: 'Auto', icon: '&#127912;' },
            { id: 'text', label: 'Texto', icon: '&#128293;' },
            { id: 'custom', label: 'Imagen', icon: '&#128247;' },
        ].map(m => `
            <button class="addtool-iconmode-chip ${m.id === 'auto' ? 'active' : ''}" data-mode="${m.id}" title="${escapeHtml(m.label)}">
                ${m.icon}
                <span>${escapeHtml(m.label)}</span>
            </button>
        `).join('');

        // Build icon color dots
        const colorDotsHtml = this._iconColors.map(c => `
            <button class="addtool-color-dot ${c === '#7254cc' ? 'active' : ''}" data-color="${escapeHtml(c)}" style="background:${c};" title="${escapeHtml(c)}"></button>
        `).join('');

        // Build suggested paths HTML
        let suggestedHtml = '';
        if (hasSuggestions) {
            suggestedHtml = `
                <div class="addtool-suggestions">
                    <div class="addtool-suggestions-header">
                        <span class="addtool-suggestions-title">Recientes</span>
                        <span class="addtool-suggestions-hint">Click para seleccionar</span>
                    </div>
                    <div class="addtool-suggestions-list">
                        ${allSuggested.map(p => {
                            const fname = p.split(/[\\/]/).pop();
                            const dir = p.substring(0, Math.max(0, p.length - fname.length - 1));
                            const shortDir = dir.length > 40 ? '...' + dir.substring(dir.length - 37) : dir;
                            return `
                                <button class="addtool-suggestion-item" data-path="${escapeHtml(p)}" title="${escapeHtml(p)}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.5;">
                                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                                        <polyline points="13 2 13 9 20 9"/>
                                    </svg>
                                    <div class="addtool-suggestion-info">
                                        <span class="addtool-suggestion-name">${escapeHtml(fname)}</span>
                                        <span class="addtool-suggestion-dir">${escapeHtml(shortDir)}</span>
                                    </div>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        overlay.innerHTML = `
            <div class="addtool-modal">
                <div class="addtool-modal-header">
                    <h3>Nueva Herramienta</h3>
                    <button class="btn btn-ghost btn-icon btn-sm addtool-close-btn" title="Cerrar">&times;</button>
                </div>

                <div class="addtool-modal-body">
                    <!-- Zona: Seleccionar archivo (explorador) -->
                    <div class="addtool-file-zone" id="addtool-file-zone">
                        <div class="addtool-file-zone-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                                <line x1="12" y1="11" x2="12" y2="17"/>
                                <line x1="9" y1="14" x2="15" y2="14"/>
                            </svg>
                        </div>
                        <div class="addtool-file-zone-text">
                            <span class="addtool-file-zone-title" id="addtool-file-label">Seleccionar ejecutable</span>
                            <span class="addtool-file-zone-sub">Click aqui para abrir el explorador de archivos</span>
                        </div>
                    </div>

                    <!-- Ruta seleccionada / manual -->
                    <div class="addtool-path-row" id="addtool-path-row">
                        <input type="text" id="addtool-path-input" class="selectable" placeholder="Ruta al ejecutable o pega aqui...">
                        <button class="btn btn-secondary btn-sm addtool-change-btn" id="addtool-change-path" title="Cambiar archivo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm addtool-clear-btn" id="addtool-clear-path" title="Quitar">&times;</button>
                    </div>

                    <!-- Sugerencias recientes -->
                    ${suggestedHtml}

                    <!-- Nombre -->
                    <div class="addtool-field">
                        <label class="addtool-label">Nombre</label>
                        <input type="text" id="addtool-name" class="selectable" placeholder="Se autocompleta al seleccionar archivo...">
                    </div>

                    <!-- Categoria (chips visuales) -->
                    <div class="addtool-field">
                        <label class="addtool-label">Categoria</label>
                        <div class="addtool-cat-row">
                            ${catChipsHtml}
                        </div>
                    </div>

                    <!-- Modo de icono (chips) -->
                    <div class="addtool-field">
                        <label class="addtool-label">Icono</label>
                        <div class="addtool-iconmode-row">
                            ${iconModeHtml}
                        </div>
                        <!-- Opciones de texto -->
                        <div class="addtool-icon-text-options hidden" id="addtool-text-options">
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="text" id="addtool-icon-letter" class="selectable" placeholder="Letra" style="width:60px;text-align:center;text-transform:uppercase;font-weight:700;font-size:16px;">
                                <div class="addtool-color-dots-row">${colorDotsHtml}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="addtool-modal-footer">
                    <button class="btn btn-secondary" id="addtool-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="addtool-submit" disabled>Agregar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // ---- State ----
        let selectedPath = '';
        let selectedCat = 'general';
        let iconMode = 'auto';
        let iconColor = '#7254cc';
        let closed = false;

        // ---- Helpers ----
        const cleanup = () => {
            if (closed) return;
            closed = true;
            document.removeEventListener('keydown', escHandler);
            try { document.body.removeChild(overlay); } catch(e) {}
        };
        const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } };
        document.addEventListener('keydown', escHandler);

        const submitBtn = overlay.querySelector('#addtool-submit');
        const pathRow = overlay.querySelector('#addtool-path-row');
        const pathInput = overlay.querySelector('#addtool-path-input');
        const fileZone = overlay.querySelector('#addtool-file-zone');
        const fileLabel = overlay.querySelector('#addtool-file-label');
        const nameInput = overlay.querySelector('#addtool-name');
        const textOptions = overlay.querySelector('#addtool-text-options');

        const updateSubmitState = () => {
            submitBtn.disabled = !selectedPath || !(nameInput.value.trim());
        };

        // ---- Browse file dialog ----
        const browseFile = async () => {
            try {
                // Mostrar indicador de carga
                fileLabel.textContent = 'Abriendo explorador...';

                // Wrap with a timeout to prevent indefinite blocking if pywebview hangs
                const FILE_DIALOG_TIMEOUT_MS = 30000; // 30 seconds
                let result;
                try {
                    result = await Promise.race([
                        a.open_file_dialog('Seleccionar ejecutable'),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), FILE_DIALOG_TIMEOUT_MS)
                        ),
                    ]);
                } catch (timeoutErr) {
                    if (timeoutErr && timeoutErr.message === 'timeout') {
                        console.warn('[tools] File dialog timed out after', FILE_DIALOG_TIMEOUT_MS, 'ms');
                        fileLabel.textContent = 'Seleccionar ejecutable';
                        showToast('El explorador tardo demasiado. Intenta de nuevo o escribe la ruta manualmente.', 'warning');
                        // Show manual path input as fallback
                        fileZone.classList.add('hidden');
                        pathRow.classList.remove('hidden');
                        pathInput.value = '';
                        pathInput.placeholder = 'Pega la ruta manualmente aqui...';
                        pathInput.classList.add('selectable');
                        pathInput.focus();
                        return;
                    }
                    throw timeoutErr;
                }

                if (result && result.success && result.path) {
                    selectedPath = result.path;
                    const fileName = selectedPath.split(/[\\/]/).pop();
                    const autoName = fileName.replace(/\.[^/.]+$/, '');

                    // Update UI: ocultar zona de archivo, mostrar ruta
                    fileZone.classList.add('hidden');
                    pathRow.classList.remove('hidden');
                    pathInput.value = selectedPath;
                    pathInput.classList.add('selectable');
                    fileLabel.textContent = fileName;
                    nameInput.value = autoName;

                    // Marcar como sugerido si no esta
                    if (!allSuggested.includes(selectedPath)) {
                        const list = overlay.querySelector('.addtool-suggestions-list');
                        if (list) {
                            const dir = selectedPath.substring(0, Math.max(0, selectedPath.length - fileName.length - 1));
                            const shortDir = dir.length > 40 ? '...' + dir.substring(dir.length - 37) : dir;
                            const btn = document.createElement('button');
                            btn.className = 'addtool-suggestion-item';
                            btn.dataset.path = selectedPath;
                            btn.title = selectedPath;
                            btn.innerHTML = `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.5;">
                                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                                    <polyline points="13 2 13 9 20 9"/>
                                </svg>
                                <div class="addtool-suggestion-info">
                                    <span class="addtool-suggestion-name">${escapeHtml(fileName)}</span>
                                    <span class="addtool-suggestion-dir">${escapeHtml(shortDir)}</span>
                                </div>
                            `;
                            btn.addEventListener('click', () => pickPath(selectedPath));
                            list.prepend(btn);
                        }
                    }

                    // Guardar en recientes
                    this._saveRecentPath(selectedPath);
                    updateSubmitState();
                    nameInput.focus();
                } else {
                    // El usuario cancelo el dialogo
                    fileLabel.textContent = 'Seleccionar ejecutable';
                    console.log('File dialog cancelled');
                }
            } catch (err) {
                fileLabel.textContent = 'Seleccionar ejecutable';
                console.error('Error opening file dialog:', err);
                showToast('No se pudo abrir el explorador. Escribe la ruta manualmente.', 'warning');
                // Mostrar el campo de ruta manual como fallback
                fileZone.classList.add('hidden');
                pathRow.classList.remove('hidden');
                pathInput.value = '';
                pathInput.placeholder = 'Pega la ruta manualmente aqui...';
                pathInput.classList.add('selectable');
                pathInput.focus();
            }
        };

        // ---- Pick from suggestion ----
        const pickPath = (path) => {
            selectedPath = path;
            const fileName = path.split(/[\\/]/).pop();
            const autoName = fileName.replace(/\.[^/.]+$/, '');

            fileZone.classList.add('hidden');
            pathRow.classList.remove('hidden');
            pathInput.value = path;
            nameInput.value = autoName;
            updateSubmitState();
            nameInput.focus();
        };

        // ---- Manual path input handler ----
        pathInput.addEventListener('input', () => {
            selectedPath = pathInput.value.trim();
            // Auto-fill name if empty
            if (selectedPath && !nameInput.value.trim()) {
                const fileName = selectedPath.split(/[\\/]/).pop();
                nameInput.value = fileName.replace(/\.[^/.]+$/, '');
            }
            updateSubmitState();
        });

        // Enter on path input
        pathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.focus();
        });

        // ---- Events ----
        // Mostrar la zona de archivo por defecto (el usuario hace click para abrir explorador)
        fileZone.classList.remove('hidden');
        pathRow.classList.add('hidden');

        // Click on file zone to open explorer
        fileZone.addEventListener('click', browseFile);

        // Change path button
        overlay.querySelector('#addtool-change-path').addEventListener('click', browseFile);

        // Clear path
        overlay.querySelector('#addtool-clear-path').addEventListener('click', () => {
            selectedPath = '';
            pathInput.value = '';
            nameInput.value = '';
            updateSubmitState();
            pathInput.focus();
        });

        // Suggestion items
        overlay.querySelectorAll('.addtool-suggestion-item').forEach(item => {
            item.addEventListener('click', () => pickPath(item.dataset.path));
        });

        // Name input
        nameInput.addEventListener('input', updateSubmitState);

        // Category chips
        overlay.querySelectorAll('.addtool-cat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                overlay.querySelectorAll('.addtool-cat-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedCat = chip.dataset.cat;
            });
        });
        // Set default active
        const defaultCatChip = overlay.querySelector('.addtool-cat-chip[data-cat="general"]');
        if (defaultCatChip) defaultCatChip.classList.add('active');

        // Icon mode chips
        overlay.querySelectorAll('.addtool-iconmode-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                overlay.querySelectorAll('.addtool-iconmode-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                iconMode = chip.dataset.mode;
                // Show/hide text options
                textOptions.classList.toggle('hidden', iconMode !== 'text');
            });
        });

        // Color dots
        overlay.querySelectorAll('.addtool-color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                overlay.querySelectorAll('.addtool-color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                iconColor = dot.dataset.color;
            });
        });

        // Cancel
        overlay.querySelector('#addtool-cancel').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });
        overlay.querySelector('.addtool-close-btn').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });

        // Click outside
        const modalBox = overlay.querySelector('.addtool-modal');
        if (modalBox) modalBox.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

        // Submit
        submitBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            // Re-read path from input (user may have edited it manually)
            const manualPath = pathInput.value.trim();
            if (manualPath) selectedPath = manualPath;

            const name = nameInput.value.trim();
            if (!selectedPath || !name) {
                showToast('Selecciona un archivo y escribe un nombre', 'warning');
                return;
            }

            const iconLetter = (overlay.querySelector('#addtool-icon-letter').value || name[0] || 'A').trim().toUpperCase();

            let iconValue = '';
            if (iconMode === 'custom') {
                try {
                    const iconResult = await a.select_icon_file();
                    if (iconResult && iconResult.success && iconResult.path) {
                        iconValue = iconResult.path;
                    } else {
                        iconMode = 'auto';
                    }
                } catch (err) {
                    iconMode = 'auto';
                }
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-sm"></span> Agregando...';

            try {
                const launcher = await a.add_launcher(
                    name,
                    selectedPath,
                    selectedCat,
                    iconMode,
                    iconColor,
                    iconValue || iconLetter
                );
                if (launcher) {
                    showToast(`"${name}" agregada correctamente`, 'success');
                    this._saveRecentPath(selectedPath);
                    cleanup();
                    await this._loadData();
                } else {
                    showToast('No se pudo crear la herramienta', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Agregar';
                }
            } catch (err) {
                console.error('Error add_launcher:', err);
                showToast('Error al agregar: ' + (err.message || err), 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Agregar';
            }
        });

        // Enter to submit
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
        });
    },

    // ================================================================
    // DIALOGO: EDITAR CATEGORIA
    // ================================================================
    async _showEditCategoryDialog(launcher) {
        const catOptions = this._categories.map(c => ({
            value: c.id,
            label: `${c.icon} ${c.name}`
        }));

        const fields = [
            { id: 'category', label: 'Categoria', type: 'select', options: catOptions }
        ];

        const values = await showFormModal(`Editar: ${launcher.name}`, fields);
        if (!values) return;

        const a = api();
        if (!a) return;

        try {
            await a.update_launcher(launcher.id, category=values.category);
            launcher.category = values.category;
            showToast('Categoria actualizada', 'success');
            this._renderCategoryTabs();
            this._renderLaunchers();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }
});
