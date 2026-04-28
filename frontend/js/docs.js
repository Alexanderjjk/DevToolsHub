/**
 * ============================================================
 * GAME DEV HUB — docs.js v2
 * Seccion Documentacion: enlaces builtin + custom con CRUD
 * QoL: Auto-favicon (2 metodos), icon picker con ~50 iconos
 *      locales, categorias con iconos por defecto.
 * ============================================================
 */

registerSection('docs', {
    _docs: [],
    _categories: [],
    _localIcons: [],
    _iconCategories: [],
    _categoryIcons: {},  // cache: category_id -> default emoji

    render() {
        return `
            <div class="section">
                <div class="section-header">
                    <h2>Documentacion</h2>
                    <div class="section-header-actions">
                        <button class="btn btn-secondary btn-sm" id="btn-download-all-favicons" title="Descargar favicons para todos los enlaces que no tienen icono">
                            &#127760; Descargar favicons
                        </button>
                        <button class="btn btn-primary btn-sm" id="btn-add-doc">+ Agregar enlace</button>
                    </div>
                </div>
                <div class="section-body">
                    <!-- Filtros por categoria -->
                    <div class="docs-filter-bar">
                        <button class="filter-chip active" data-cat="all">Todas</button>
                    </div>

                    <!-- Busqueda -->
                    <div class="search-bar mb-3">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input type="text" id="docs-search" placeholder="Buscar documentacion...">
                    </div>

                    <div id="docs-list"></div>
                </div>
            </div>
        `;
    },

    async load() {
        await this._loadLocalIcons();
        await this._loadData();

        // Boton agregar enlace — se attache UNA SOLA VEZ (load se llama una vez por navegacion).
        // NO ponerlo en _bindDocEvents porque esa se llama en cada _renderDocs y acumularia listeners.
        const addBtn = document.getElementById('btn-add-doc');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                await this._showAddDocDialog();
            });
        }

        // Busqueda
        const search = document.getElementById('docs-search');
        if (search) search.addEventListener('input', debounce(() => this._renderDocs(search.value), 300));

        // Boton descargar todos los favicons
        const dlAllBtn = document.getElementById('btn-download-all-favicons');
        if (dlAllBtn) {
            dlAllBtn.addEventListener('click', async () => {
                await this._downloadAllFavicons();
            });
        }
    },

    unload() {},

    // ---------------------------------------------------------------
    //  CARGA DE DATOS
    // ---------------------------------------------------------------

    async _loadLocalIcons() {
        const a = api();
        if (!a) return;
        try {
            const [icons, catIcons] = await Promise.all([
                a.get_local_icons().catch(() => []),
                a.get_local_icon_categories().catch(() => []),
            ]);
            this._localIcons = icons || [];
            this._iconCategories = catIcons || [];
            // Build category -> icon map
            for (const ci of this._iconCategories) {
                this._categoryIcons[ci.id] = ci.icon;
            }
        } catch (e) {
            console.warn('[docs] Error cargando iconos locales:', e);
        }
    },

    async _loadData() {
        const a = api();
        if (!a) {
            this._docs = this._getDefaultDocs();
            this._categories = this._getDefaultCategories();
            this._renderDocs();
            return;
        }

        try {
            const [docs, cats] = await Promise.all([a.get_docs(), a.get_docs_categories()]);
            this._docs = docs || [];
            this._categories = cats || [];

            // Seed default docs into DB if it's empty (one-time)
            if (this._docs.length === 0) {
                const defaults = this._getDefaultDocs();
                for (const doc of defaults) {
                    try {
                        await a.add_doc(
                            doc.name, doc.url, doc.desc || '',
                            doc.category || 'custom',
                            doc.icon_name || '', ''
                        );
                    } catch (e) {
                        console.warn('[docs] Error seeding default doc:', doc.name, e);
                    }
                }
                // Reload from DB to get the actual saved docs with IDs
                const [reloadedDocs, reloadedCats] = await Promise.all([a.get_docs(), a.get_docs_categories()]);
                this._docs = reloadedDocs || [];
                this._categories = reloadedCats || [];
            }

            // Auto-download favicons for docs missing icon_path (max 5 at a time)
            this._autoDownloadFavicons();
        } catch (e) {
            console.error('[docs] Error loading data:', e);
            // Don't replace with defaults on error — that hides the real problem
            // and causes data loss (custom docs disappear)
            this._docs = this._docs.length > 0 ? this._docs : this._getDefaultDocs();
            this._categories = this._categories.length > 0 ? this._categories : this._getDefaultCategories();
        }
        this._renderCategoryChips();
        this._renderDocs();
    },

    // ---------------------------------------------------------------
    //  AUTO-DOWNLOAD FAVICONS (QoL)
    // ---------------------------------------------------------------

    async _autoDownloadFavicons() {
        const a = api();
        if (!a) return;

        // Find docs without icon_path that have a valid URL
        const missing = this._docs
            .filter(d => !d.icon_path && d.url && !d.builtin)
            .slice(0, 5);  // Max 5 concurrent

        if (missing.length === 0) return;

        try {
            const items = missing.map(d => ({ id: d.id, url: d.url }));
            const results = await a.batch_download_favicons(items);
            if (!results) return;

            let updatedCount = 0;
            for (const doc of missing) {
                const favicon = results[doc.id];
                if (favicon) {
                    await a.set_doc_icon(doc.id, '', favicon).catch(() => {});
                    doc.icon_path = favicon;
                    updatedCount++;
                }
            }
            if (updatedCount > 0) {
                console.log('[docs] Favicons descargados para', updatedCount, 'docs');
                this._renderDocs();
            }
        } catch (e) {
            console.warn('[docs] Error auto-descargando favicons:', e);
        }
    },

    // ---------------------------------------------------------------
    //  DOWNLOAD ALL FAVICONS (boton manual)
    // ---------------------------------------------------------------

    async _downloadAllFavicons() {
        const a = api();
        if (!a) {
            showToast('API no disponible', 'error');
            return;
        }

        // Buscar docs que necesitan favicon (sin icon_path)
        const missing = this._docs.filter(d => d.url && !d.icon_path);
        if (missing.length === 0) {
            showToast('Todos los enlaces ya tienen favicon', 'success');
            return;
        }

        const btn = document.getElementById('btn-download-all-favicons');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-sm"></span> Descargando...';
        }

        try {
            // Procesar en lotes de 5 para no saturar
            const batchSize = 5;
            let totalUpdated = 0;
            for (let i = 0; i < missing.length; i += batchSize) {
                const batch = missing.slice(i, i + batchSize);
                const items = batch.map(d => ({ id: d.id, url: d.url }));
                const results = await a.batch_download_favicons(items);
                if (results) {
                    for (const doc of batch) {
                        const favicon = results[doc.id];
                        if (favicon) {
                            await a.set_doc_icon(doc.id, '', favicon).catch(() => {});
                            doc.icon_path = favicon;
                            totalUpdated++;
                        }
                    }
                }
            }
            if (totalUpdated > 0) {
                showToast(`Se descargaron ${totalUpdated} favicon${totalUpdated !== 1 ? 's' : ''}`, 'success');
                this._renderDocs();
            } else {
                showToast('No se pudieron descargar favicons. Intenta con iconos locales.', 'warning');
            }
        } catch (e) {
            showToast('Error descargando favicons: ' + (e.message || e), 'error');
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    },

    // ---------------------------------------------------------------
    //  CATEGORY DEFAULTS
    // ---------------------------------------------------------------

    _getDefaultCategories() {
        return [
            { id: 'engine', name: 'Game Engines', icon: '\uD83C\uDFAE' },
            { id: 'tool', name: 'Herramientas', icon: '\uD83D\uDD27' },
            { id: 'language', name: 'Lenguajes', icon: '\uD83D\uDC0D' },
            { id: 'api', name: 'APIs', icon: '\uD83C\uDF10' },
            { id: 'reference', name: 'Referencias', icon: '\uD83D\uDCD6' },
            { id: 'personal', name: 'Personal', icon: '\u2B50' },
            { id: 'custom', name: 'Personalizado', icon: '\uD83D\uDCC1' },
        ];
    },

    _getCategoryIcon(categoryId) {
        // Check cache
        if (this._categoryIcons[categoryId]) return this._categoryIcons[categoryId];
        // Check defaults
        const cat = this._categories.find(c => c.category === categoryId || c.id === categoryId);
        if (cat && cat.icon) return cat.icon;
        // Fallback from default list
        const defaults = this._getDefaultCategories();
        const d = defaults.find(c => c.id === categoryId);
        return d ? d.icon : '\uD83D\uDCC1';
    },

    // ---------------------------------------------------------------
    //  DOC ICON RENDERING
    // ---------------------------------------------------------------

    _renderDocIcon(doc) {
        // Priority: icon_path (favicon) > icon_name (emoji) > category default
        if (doc.icon_path) {
            // Determinar si ya tiene prefijo data: o es base64 crudo
            const src = doc.icon_path.startsWith('data:') ? doc.icon_path : `data:image/png;base64,${doc.icon_path}`;
            const fallbackEmoji = this._getCategoryIcon(doc.category) || '\uD83D\uDCC4';
            return `<div class="doc-item-icon doc-item-icon-favicon"><img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='${escapeHtml(fallbackEmoji)}';"></div>`;
        }
        const emoji = doc.icon_name || doc.icon || this._getCategoryIcon(doc.category);
        return `<div class="doc-item-icon">${escapeHtml(emoji)}</div>`;
    },

    _getDefaultDocs() {
        return [
            { id: 'b-unity', name: 'Unity Docs', desc: 'Documentacion oficial de Unity', url: 'https://docs.unity3d.com/', category: 'engine', icon_name: '\uD83C\uDFAE', builtin: true },
            { id: 'b-godot', name: 'Godot Docs', desc: 'Documentacion oficial de Godot', url: 'https://docs.godotengine.org/', category: 'engine', icon_name: '\uD83D\uDE80', builtin: true },
            { id: 'b-unreal', name: 'Unreal Engine', desc: 'Documentacion de Unreal', url: 'https://docs.unrealengine.com/', category: 'engine', icon_name: '\uD83C\uDF1F', builtin: true },
            { id: 'b-blender', name: 'Blender Docs', desc: 'Manual de Blender 3D', url: 'https://docs.blender.org/', category: 'tool', icon_name: '\uD83E\uDDD9', builtin: true },
            { id: 'b-mdn', name: 'MDN Web Docs', desc: 'HTML, CSS, JavaScript', url: 'https://developer.mozilla.org/', category: 'reference', icon_name: '\uD83C\uDF10', builtin: true },
            { id: 'b-python', name: 'Python Docs', desc: 'Documentacion Python 3', url: 'https://docs.python.org/3/', category: 'language', icon_name: '\uD83D\uDC0D', builtin: true },
            { id: 'b-github', name: 'GitHub Docs', desc: 'Guia de GitHub y Git', url: 'https://docs.github.com/', category: 'tool', icon_name: '\uD83D\uDCBB', builtin: true },
            { id: 'b-opengl', name: 'OpenGL Reference', desc: 'Referencia de graficos', url: 'https://www.khronos.org/opengl/', category: 'api', icon_name: '\uD83C\uDFA8', builtin: true },
        ];
    },

    // ---------------------------------------------------------------
    //  CATEGORY CHIPS
    // ---------------------------------------------------------------

    _renderCategoryChips() {
        const bar = document.querySelector('.docs-filter-bar');
        if (!bar) return;

        const catChips = this._categories.map(c => {
            const catId = c.category || c.id;
            const catName = c.name || c.category;
            const count = this._docs.filter(d => d.category === catId).length;
            if (count === 0) return '';
            const icon = this._getCategoryIcon(catId);
            return `<button class="filter-chip" data-cat="${escapeHtml(catId)}">${escapeHtml(icon)} ${escapeHtml(catName)} (${count})</button>`;
        }).filter(Boolean).join('');

        bar.innerHTML = `<button class="filter-chip active" data-cat="all">Todas (${this._docs.length})</button>${catChips}`;

        bar.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this._renderDocs(document.getElementById('docs-search').value, chip.dataset.cat);
            });
        });
    },

    // ---------------------------------------------------------------
    //  RENDER DOCS LIST
    // ---------------------------------------------------------------

    _renderDocs(searchQuery, categoryFilter) {
        const list = document.getElementById('docs-list');
        if (!list) return;

        let docs = [...this._docs];

        // Get active category filter from chip UI
        if (!categoryFilter) {
            const activeChip = document.querySelector('.docs-filter-bar .filter-chip.active');
            if (activeChip && activeChip.dataset.cat !== 'all') {
                categoryFilter = activeChip.dataset.cat;
            }
        }

        // 'all' or falsy = no category filter
        if (categoryFilter && categoryFilter !== 'all') {
            docs = docs.filter(d => {
                const docCat = d.category || d.cat || '';
                return docCat === categoryFilter;
            });
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d => d.name.toLowerCase().includes(q) || (d.desc || '').toLowerCase().includes(q));
        }

        if (docs.length === 0) {
            list.innerHTML = `<div class="section-empty" style="min-height:200px;">
                <div class="section-empty-icon">\uD83D\uDCDA</div>
                <h3>${searchQuery ? 'Sin resultados' : 'Sin documentacion'}</h3>
                <p>${searchQuery ? 'No se encontro documentacion con esa busqueda.' : 'Agrega enlaces a tus recursos favoritos.'}</p>
            </div>`;
            return;
        }

        list.innerHTML = `<div class="docs-list">${docs.map(d => {
            const catId = d.category;
            const catIcon = this._getCategoryIcon(catId);
            const isBuiltin = !!d.builtin;
            return `
            <div class="doc-item" data-url="${escapeHtml(d.url)}" data-id="${escapeHtml(d.id)}" data-builtin="${isBuiltin}">
                ${this._renderDocIcon(d)}
                <div class="doc-item-info">
                    <h4>${escapeHtml(d.name)}</h4>
                    <p>${escapeHtml(d.desc || d.url)}</p>
                    <div class="doc-item-meta">
                        <span class="doc-item-category">${escapeHtml(catIcon)} ${escapeHtml(catId)}</span>
                        ${d.icon_path ? '<span class="doc-favicon-badge" title="Favicon descargado automaticamente">\u2713 favicon</span>' : ''}
                    </div>
                </div>
                <div class="doc-item-actions">
                    <button class="btn btn-ghost btn-icon btn-sm doc-btn-icon" data-id="${escapeHtml(d.id)}" title="Cambiar icono">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </button>
                    ${!isBuiltin ? `<button class="btn btn-ghost btn-icon btn-sm doc-btn-delete" data-id="${escapeHtml(d.id)}" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>` : ''}
                </div>
            </div>`;
        }).join('')}</div>`;

        this._bindDocEvents(list);
    },

    // ---------------------------------------------------------------
    //  BIND EVENTS
    // ---------------------------------------------------------------

    _bindDocEvents(list) {
        // Open URL
        list.querySelectorAll('.doc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.doc-btn-icon') || e.target.closest('.doc-btn-delete')) return;
                const url = item.dataset.url;
                const a = api();
                if (a) { try { a.open_url(url); } catch (e) { window.open(url, '_blank'); } }
                else { window.open(url, '_blank'); }
            });
        });

        // Delete
        list.querySelectorAll('.doc-btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ok = await showModal('Eliminar enlace', 'Eliminar este enlace de documentacion?', 'Eliminar', 'btn-danger');
                if (ok) {
                    const a = api();
                    if (a) { try { await a.delete_doc(id); } catch (e2) {} }
                    this._docs = this._docs.filter(d => d.id !== id);
                    showToast('Enlace eliminado', 'success');
                    this._renderCategoryChips();
                    this._renderDocs();
                }
            });
        });

        // Change icon button
        list.querySelectorAll('.doc-btn-icon').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this._showIconPicker(id);
            });
        });

    },
    // NOTA: El listener de #btn-add-doc se attache en load(), NO aqui.
    // _bindDocEvents se llama en cada _renderDocs y causaria acumulacion de listeners.

    // ---------------------------------------------------------------
    //  ADD DOC DIALOG (v2 with icon picker + auto-favicon)
    // ---------------------------------------------------------------

    async _showAddDocDialog() {
        const a = api();
        if (!a) return;

        const catOptions = this._getDefaultCategories();
        const localIcons = this._localIcons;

        // Build overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'z-index:10000;';

        overlay.innerHTML = `
            <div class="adddoc-modal">
                <div class="adddoc-modal-header">
                    <h3>Agregar documentacion</h3>
                    <button class="btn btn-ghost btn-icon btn-sm adddoc-close-btn" title="Cerrar">&times;</button>
                </div>

                <div class="adddoc-modal-body">
                    <!-- Nombre -->
                    <div class="adddoc-field">
                        <label>Nombre</label>
                        <input type="text" id="adddoc-name" class="selectable" placeholder="Ej: Stack Overflow">
                    </div>

                    <!-- URL -->
                    <div class="adddoc-field">
                        <label>URL</label>
                        <input type="text" id="adddoc-url" class="selectable" placeholder="https://...">
                    </div>

                    <!-- Descripcion -->
                    <div class="adddoc-field">
                        <label>Descripcion</label>
                        <input type="text" id="adddoc-desc" class="selectable" placeholder="Descripcion corta...">
                    </div>

                    <!-- Categoria (chips) -->
                    <div class="adddoc-field">
                        <label>Categoria</label>
                        <div class="adddoc-cat-row" id="adddoc-cat-row">
                            ${catOptions.map(c => `
                                <button class="adddoc-cat-chip ${c.id === 'custom' ? 'active' : ''}" data-cat="${escapeHtml(c.id)}" title="${escapeHtml(c.name)}">
                                    <span>${escapeHtml(c.icon)}</span> ${escapeHtml(c.name)}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Icono: preview + picker -->
                    <div class="adddoc-field">
                        <label>Icono</label>
                        <div class="adddoc-icon-area">
                            <div class="adddoc-icon-preview" id="adddoc-icon-preview">
                                <span class="adddoc-icon-emoji" id="adddoc-icon-display">${this._getCategoryIcon('custom')}</span>
                            </div>
                            <div class="adddoc-icon-actions">
                                <button class="btn btn-secondary btn-sm" id="adddoc-pick-emoji" title="Elegir icono local">
                                    &#127912; Icono local
                                </button>
                                <button class="btn btn-secondary btn-sm" id="adddoc-fetch-favicon" title="Descargar favicon de la URL">
                                    &#127760; Descargar favicon
                                </button>
                                <span class="adddoc-icon-method" id="adddoc-icon-method">emoji</span>
                            </div>
                        </div>
                    </div>

                    <!-- Emoji picker (hidden by default) -->
                    <div class="adddoc-emoji-picker hidden" id="adddoc-emoji-picker">
                        <div class="adddoc-emoji-search">
                            <input type="text" id="adddoc-emoji-search-input" class="selectable" placeholder="Buscar icono...">
                        </div>
                        <!-- Category tabs -->
                        <div class="adddoc-emoji-cattabs" id="adddoc-emoji-cattabs">
                            <button class="adddoc-emoji-cattab active" data-emcat="all">Todos</button>
                            ${this._iconCategories.map(c => `
                                <button class="adddoc-emoji-cattab" data-emcat="${escapeHtml(c.id)}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</button>
                            `).join('')}
                        </div>
                        <div class="adddoc-emoji-grid" id="adddoc-emoji-grid"></div>
                    </div>
                </div>

                <div class="adddoc-modal-footer">
                    <button class="btn btn-secondary" id="adddoc-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="adddoc-submit">Agregar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // ---- State ----
        let selectedCat = 'custom';
        let selectedIconType = 'emoji';  // 'emoji' | 'favicon'
        let selectedEmoji = this._getCategoryIcon('custom');
        let selectedIconPath = '';  // data URI for favicon
        let closed = false;

        // ---- Helpers ----
        const cleanup = () => { if (!closed) { closed = true; document.removeEventListener('keydown', escHandler); try { document.body.removeChild(overlay); } catch(e) {} } };
        const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } };
        document.addEventListener('keydown', escHandler);

        const nameInput = overlay.querySelector('#adddoc-name');
        const urlInput = overlay.querySelector('#adddoc-url');
        const descInput = overlay.querySelector('#adddoc-desc');
        const iconDisplay = overlay.querySelector('#adddoc-icon-display');
        const iconPreview = overlay.querySelector('#adddoc-icon-preview');
        const iconMethod = overlay.querySelector('#adddoc-icon-method');
        const submitBtn = overlay.querySelector('#adddoc-submit');

        const updateIconPreview = () => {
            if (selectedIconType === 'favicon' && selectedIconPath) {
                iconDisplay.innerHTML = `<img src="${escapeHtml(selectedIconPath)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
                iconPreview.className = 'adddoc-icon-preview adddoc-icon-preview has-favicon';
                iconMethod.textContent = 'favicon';
            } else {
                iconDisplay.textContent = selectedEmoji;
                iconPreview.className = 'adddoc-icon-preview';
                iconMethod.textContent = 'emoji';
            }
        };

        // ---- Category chips ----
        overlay.querySelectorAll('.adddoc-cat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                overlay.querySelectorAll('.adddoc-cat-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedCat = chip.dataset.cat;
                // Update icon to category default if still using emoji default
                if (selectedIconType === 'emoji' && !selectedIconPath) {
                    selectedEmoji = this._getCategoryIcon(selectedCat);
                    updateIconPreview();
                }
            });
        });

        // ---- Emoji picker ----
        const emojiPicker = overlay.querySelector('#adddoc-emoji-picker');
        const emojiGrid = overlay.querySelector('#adddoc-emoji-grid');
        const emojiSearch = overlay.querySelector('#adddoc-emoji-search-input');

        const renderEmojiGrid = (filter = '', catFilter = 'all') => {
            let icons = localIcons;
            if (catFilter !== 'all') icons = icons.filter(i => i.category === catFilter);
            if (filter) {
                const q = filter.toLowerCase();
                icons = icons.filter(i => i.name.toLowerCase().includes(q) || i.emoji.includes(q) || i.category.toLowerCase().includes(q));
            }
            emojiGrid.innerHTML = icons.map(i => `
                <button class="adddoc-emoji-item ${i.emoji === selectedEmoji ? 'active' : ''}" data-emoji="${escapeHtml(i.emoji)}" data-name="${escapeHtml(i.name)}" title="${escapeHtml(i.name)}">
                    <span>${i.emoji}</span>
                </button>
            `).join('') || '<div class="adddoc-emoji-empty">Sin iconos que coincidan</div>';

            emojiGrid.querySelectorAll('.adddoc-emoji-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    emojiGrid.querySelectorAll('.adddoc-emoji-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedEmoji = btn.dataset.emoji;
                    selectedIconType = 'emoji';
                    selectedIconPath = '';
                    updateIconPreview();
                });
            });
        };

        // Show emoji picker
        overlay.querySelector('#adddoc-pick-emoji').addEventListener('click', () => {
            emojiPicker.classList.toggle('hidden');
            if (!emojiPicker.classList.contains('hidden')) {
                renderEmojiGrid();
                emojiSearch.focus();
            }
        });

        // Emoji search
        if (emojiSearch) {
            emojiSearch.addEventListener('input', debounce(() => {
                const activeCatTab = overlay.querySelector('.adddoc-emoji-cattab.active');
                renderEmojiGrid(emojiSearch.value, activeCatTab ? activeCatTab.dataset.emcat : 'all');
            }, 200));
        }

        // Emoji category tabs
        overlay.querySelectorAll('.adddoc-emoji-cattab').forEach(tab => {
            tab.addEventListener('click', () => {
                overlay.querySelectorAll('.adddoc-emoji-cattab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderEmojiGrid(emojiSearch.value, tab.dataset.emcat);
            });
        });

        // ---- Fetch favicon ----
        overlay.querySelector('#adddoc-fetch-favicon').addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                showToast('Escribe una URL primero', 'warning');
                urlInput.focus();
                return;
            }
            const btn = overlay.querySelector('#adddoc-fetch-favicon');
            const origText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-sm"></span> Descargando...';
            btn.disabled = true;

            try {
                const result = await a.download_doc_favicon(url);
                if (result && result.success && result.icon_path) {
                    selectedIconType = 'favicon';
                    selectedIconPath = result.icon_path;
                    updateIconPreview();
                    showToast(`Favicon descargado (${result.method})`, 'success');
                } else {
                    showToast('No se pudo descargar el favicon. Usa un icono local.', 'warning');
                }
            } catch (e) {
                showToast('Error descargando favicon: ' + (e.message || e), 'error');
            }
            btn.innerHTML = origText;
            btn.disabled = false;
        });

        // ---- Auto-detect name from URL ----
        urlInput.addEventListener('change', () => {
            const url = urlInput.value.trim();
            if (url && !nameInput.value.trim()) {
                try {
                    const hostname = new URL(url).hostname.replace('www.', '');
                    const name = hostname.split('.')[0];
                    // Capitalize first letter
                    nameInput.value = name.charAt(0).toUpperCase() + name.slice(1);
                } catch (e) {}
            }
        });

        // ---- Submit ----
        submitBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            const desc = descInput.value.trim();

            if (!name || !url) {
                showToast('Nombre y URL son obligatorios', 'warning');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-sm"></span> Agregando...';

            try {
                await a.add_doc(name, url, desc, selectedCat, selectedIconType === 'favicon' ? '' : selectedEmoji, selectedIconPath);
                showToast(`"${name}" agregado correctamente`, 'success');
                cleanup();
                await this._loadData();
            } catch (err) {
                showToast('Error: ' + (err.message || err), 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Agregar';
            }
        });

        // ---- Cancel / Close ----
        overlay.querySelector('#adddoc-cancel').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });
        overlay.querySelector('.adddoc-close-btn').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });
        const modalBox = overlay.querySelector('.adddoc-modal');
        if (modalBox) modalBox.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });

        // Enter on name to submit
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
        });
    },

    // ---------------------------------------------------------------
    //  ICON PICKER (for existing docs)
    // ---------------------------------------------------------------

    async _showIconPicker(docId) {
        const a = api();
        if (!a) return;

        const doc = this._docs.find(d => d.id === docId);
        if (!doc) return;

        const localIcons = this._localIcons;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'z-index:10000;';

        const currentIcon = doc.icon_path || doc.icon_name || doc.icon || this._getCategoryIcon(doc.category);

        overlay.innerHTML = `
            <div class="adddoc-modal" style="max-width:520px;">
                <div class="adddoc-modal-header">
                    <h3>Icono: ${escapeHtml(doc.name)}</h3>
                    <button class="btn btn-ghost btn-icon btn-sm adddoc-close-btn" title="Cerrar">&times;</button>
                </div>

                <div class="adddoc-modal-body">
                    <!-- Current preview -->
                    <div class="adddoc-field">
                        <label>Icono actual</label>
                        <div class="adddoc-icon-area">
                            <div class="adddoc-icon-preview ${doc.icon_path ? 'has-favicon' : ''}" id="iconpick-preview">
                                ${doc.icon_path
                                    ? `<img src="${escapeHtml(doc.icon_path)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`
                                    : `<span class="adddoc-icon-emoji">${escapeHtml(currentIcon)}</span>`
                                }
                            </div>
                            <div class="adddoc-icon-actions">
                                <button class="btn btn-secondary btn-sm" id="iconpick-fetch" title="Re-descargar favicon">
                                    &#127760; Re-descargar favicon
                                </button>
                                <span class="adddoc-icon-method" id="iconpick-method">${doc.icon_path ? 'favicon' : 'emoji'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Emoji picker -->
                    <div class="adddoc-field">
                        <label>Elegir icono local</label>
                        <div class="adddoc-emoji-search">
                            <input type="text" id="iconpick-search" class="selectable" placeholder="Buscar icono...">
                        </div>
                        <div class="adddoc-emoji-cattabs" id="iconpick-cattabs">
                            <button class="adddoc-emoji-cattab active" data-emcat="all">Todos</button>
                            ${this._iconCategories.map(c => `
                                <button class="adddoc-emoji-cattab" data-emcat="${escapeHtml(c.id)}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</button>
                            `).join('')}
                        </div>
                        <div class="adddoc-emoji-grid" id="iconpick-grid"></div>
                    </div>
                </div>

                <div class="adddoc-modal-footer">
                    <button class="btn btn-secondary" id="iconpick-cancel">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        let closed = false;
        const escHandler = (e) => { if (e.key === 'Escape') cleanup(); };
        document.addEventListener('keydown', escHandler);
        const cleanup = () => { if (!closed) { closed = true; document.removeEventListener('keydown', escHandler); try { document.body.removeChild(overlay); } catch(e) {} } };

        const previewEl = overlay.querySelector('#iconpick-preview');
        const methodEl = overlay.querySelector('#iconpick-method');
        const gridEl = overlay.querySelector('#iconpick-grid');
        const searchEl = overlay.querySelector('#iconpick-search');

        const updatePreview = (iconPath, emoji) => {
            if (iconPath) {
                previewEl.innerHTML = `<img src="${escapeHtml(iconPath)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
                previewEl.className = 'adddoc-icon-preview has-favicon';
                methodEl.textContent = 'favicon';
            } else {
                previewEl.innerHTML = `<span class="adddoc-icon-emoji">${escapeHtml(emoji)}</span>`;
                previewEl.className = 'adddoc-icon-preview';
                methodEl.textContent = 'emoji';
            }
        };

        const renderGrid = (filter = '', catFilter = 'all') => {
            let icons = localIcons;
            if (catFilter !== 'all') icons = icons.filter(i => i.category === catFilter);
            if (filter) {
                const q = filter.toLowerCase();
                icons = icons.filter(i => i.name.toLowerCase().includes(q) || i.emoji.includes(q));
            }
            const currentEmoji = doc.icon_name || doc.icon || '';
            gridEl.innerHTML = icons.map(i => `
                <button class="adddoc-emoji-item ${i.emoji === currentEmoji ? 'active' : ''}" data-emoji="${escapeHtml(i.emoji)}" title="${escapeHtml(i.name)}">
                    <span>${i.emoji}</span>
                </button>
            `).join('') || '<div class="adddoc-emoji-empty">Sin iconos</div>';

            gridEl.querySelectorAll('.adddoc-emoji-item').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const emoji = btn.dataset.emoji;
                    try {
                        await a.set_doc_icon(docId, '', emoji);
                        doc.icon_name = emoji;
                        doc.icon_path = '';
                        doc.icon = emoji;
                        updatePreview('', emoji);
                        gridEl.querySelectorAll('.adddoc-emoji-item').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        showToast('Icono actualizado', 'success');
                        this._renderDocs();
                    } catch (e) {
                        showToast('Error: ' + (e.message || e), 'error');
                    }
                });
            });
        };

        // Initial render
        renderGrid();

        // Search
        searchEl.addEventListener('input', debounce(() => {
            const activeTab = overlay.querySelector('.adddoc-emoji-cattab.active');
            renderGrid(searchEl.value, activeTab ? activeTab.dataset.emcat : 'all');
        }, 200));

        // Category tabs
        overlay.querySelectorAll('.adddoc-emoji-cattab').forEach(tab => {
            tab.addEventListener('click', () => {
                overlay.querySelectorAll('.adddoc-emoji-cattab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGrid(searchEl.value, tab.dataset.emcat);
            });
        });

        // Re-fetch favicon
        overlay.querySelector('#iconpick-fetch').addEventListener('click', async () => {
            if (!doc.url) { showToast('Este doc no tiene URL', 'warning'); return; }
            const btn = overlay.querySelector('#iconpick-fetch');
            btn.innerHTML = '<span class="spinner-sm"></span> ...';
            btn.disabled = true;
            try {
                const result = await a.download_doc_favicon(doc.url);
                if (result && result.success && result.icon_path) {
                    await a.set_doc_icon(docId, result.icon_path, '');
                    doc.icon_path = result.icon_path;
                    doc.icon_name = '';
                    doc.icon = '';
                    updatePreview(result.icon_path, '');
                    showToast(`Favicon descargado (${result.method})`, 'success');
                    this._renderDocs();
                } else {
                    showToast('No se pudo descargar. Intenta con un icono local.', 'warning');
                }
            } catch (e) {
                showToast('Error: ' + (e.message || e), 'error');
            }
            btn.innerHTML = '&#127760; Re-descargar favicon';
            btn.disabled = false;
        });

        // Close
        overlay.querySelector('#iconpick-cancel').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });
        overlay.querySelector('.adddoc-close-btn').addEventListener('click', (e) => { e.stopPropagation(); cleanup(); });
        const modalBox = overlay.querySelector('.adddoc-modal');
        if (modalBox) modalBox.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
    },
});
