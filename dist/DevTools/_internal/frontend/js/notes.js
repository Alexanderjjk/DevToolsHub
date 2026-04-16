/**
 * ============================================================
 * GAME DEV HUB — notes.js  v0.9
 * Notion-inspired notes: card grid + full editor,
 *   sub-pages, markdown preview, colors, tags, auto-save
 * ============================================================
 */

registerSection('notes', {
    _notes: [],
    _colors: [],
    _editingNote: null,
    _autoSaveTimer: null,
    _editingTags: [],
    _isPreviewMode: false,
    _searchQuery: '',
    _noteOpenListener: null,
    _activePageId: null,

    getTimeString() { return '00:00:00'; },

    // ================================================================
    //  RENDER — grid principal
    // ================================================================
    render() {
        return `
        <div class="section">
            <div class="section-header">
                <h2>Notas</h2>
                <div class="section-header-actions">
                    <div class="search-bar" style="max-width:240px;">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input type="text" id="notes-search" placeholder="Buscar notas...">
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-new-note">+ Nueva nota</button>
                </div>
            </div>
            <div class="section-body">
                <div id="notes-container">
                    <div class="spinner-container" style="min-height:200px;"><div class="spinner"></div></div>
                </div>
            </div>
        </div>`;
    },

    // ================================================================
    //  LIFECYCLE
    // ================================================================
    async load() {
        const newBtn = document.getElementById('btn-new-note');
        if (newBtn) newBtn.addEventListener('click', () => this._createNote());

        const searchInput = document.getElementById('notes-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                this._searchQuery = searchInput.value;
                this._renderGrid();
            }, 250));
        }

        this._noteOpenListener = (e) => {
            if (e.detail && e.detail.noteId) this._openEditor(e.detail.noteId);
        };
        document.addEventListener('open-note', this._noteOpenListener);

        await this._loadNotes();
    },

    unload() {
        this._clearAutoSave();
        this._notes = [];
        this._editingNote = null;
        this._editingTags = [];
        this._isPreviewMode = false;
        this._activePageId = null;
        if (this._noteOpenListener) {
            document.removeEventListener('open-note', this._noteOpenListener);
            this._noteOpenListener = null;
        }
    },

    // ================================================================
    //  DATA
    // ================================================================
    async _loadNotes() {
        const a = api();
        if (!a) { this._notes = []; this._renderGrid(); return; }
        try {
            const [notes, colors] = await Promise.all([a.get_notes(), a.get_note_colors()]);
            // Parse tags from JSON strings if needed
            this._notes = (notes || []).map(n => {
                if (typeof n.tags === 'string') {
                    try { n.tags = JSON.parse(n.tags); } catch(e) { n.tags = []; }
                }
                return n;
            });
            this._colors = colors && colors.length > 0 ? colors : this._getDefaultColors();
        } catch (e) {
            this._notes = [];
            this._colors = this._getDefaultColors();
        }
        this._renderGrid();
    },

    _getDefaultColors() {
        return [
            { id: 'default', name: 'Predeterminado', color: '#2f3136' },
            { id: 'red',     name: 'Rojo',          color: '#e74c3c' },
            { id: 'orange',  name: 'Naranja',       color: '#e67e22' },
            { id: 'yellow',  name: 'Amarillo',      color: '#f1c40f' },
            { id: 'green',   name: 'Verde',         color: '#2ecc71' },
            { id: 'teal',    name: 'Teal',          color: '#1abc9c' },
            { id: 'blue',    name: 'Azul',          color: '#3498db' },
            { id: 'purple',  name: 'Purpura',       color: '#9b59b6' },
        ];
    },

    // ---- Helpers ----
    _getChildNotes(parentId) {
        return this._notes.filter(n => n.parent_id === parentId && !n.is_quick_note);
    },

    _getTopLevelNotes() {
        return this._notes.filter(n => !n.parent_id && !n.is_quick_note);
    },

    _getQuickNotes() {
        return this._notes.filter(n => n.is_quick_note);
    },

    // ================================================================
    //  GRID VIEW — Notion-style card grid
    // ================================================================
    _renderGrid() {
        const container = document.getElementById('notes-container');
        if (!container) return;

        let notes = this._getTopLevelNotes();

        // Filter by search
        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            notes = notes.filter(n =>
                (n.title || '').toLowerCase().includes(q) ||
                (n.content || '').toLowerCase().includes(q) ||
                (n.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort: pinned first, then favorites, then by date
        notes.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0);
        });

        // Also get quick notes for the section
        let quickNotes = this._getQuickNotes();
        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            quickNotes = quickNotes.filter(n =>
                (n.title || '').toLowerCase().includes(q) ||
                (n.content || '').toLowerCase().includes(q) ||
                (n.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }
        quickNotes.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));

        const hasAnyContent = notes.length > 0 || quickNotes.length > 0;

        if (!hasAnyContent) {
            container.innerHTML = `
                <div class="section-empty" style="min-height:250px;">
                    <div class="section-empty-icon">&#128221;</div>
                    <h3>${this._searchQuery ? 'Sin resultados' : 'Sin notas'}</h3>
                    <p>${this._searchQuery ? 'No se encontraron notas con esa busqueda.' : 'Crea tu primera nota para empezar a organizar tus ideas.'}</p>
                    ${!this._searchQuery ? '<button class="btn btn-primary" id="btn-new-note-empty">+ Crear nota</button>' : ''}
                </div>`;
            const emptyBtn = document.getElementById('btn-new-note-empty');
            if (emptyBtn) emptyBtn.addEventListener('click', () => this._createNote());
            return;
        }

        const pinned = notes.filter(n => n.pinned);
        const rest = notes.filter(n => !n.pinned);

        let html = '';

        if (pinned.length > 0) {
            html += `<div class="notes-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4.5l-4 4L7 10l-1.5 1.5 7 7L14 17l1.5-4 4-4"/><line x1="9" y1="15" x2="4.35" y2="19.65"/></svg>
                Fijadas <span class="notes-count">${pinned.length}</span>
            </div>`;
            html += `<div class="notes-grid">${pinned.map(n => this._renderCard(n)).join('')}</div>`;
        }

        if (rest.length > 0) {
            html += `<div class="notes-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Todas las notas <span class="notes-count">${rest.length}</span>
            </div>`;
            html += `<div class="notes-grid">${rest.map(n => this._renderCard(n)).join('')}</div>`;
        }

        // Quick Notes section
        if (quickNotes.length > 0) {
            html += `<div class="notes-section-label" style="margin-top:20px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                Quick Notes <span class="notes-count">${quickNotes.length}</span>
                <span style="font-size:10px;color:var(--text-muted);margin-left:4px;font-weight:normal;">(ventana flotante)</span>
            </div>`;
            html += `<div class="notes-grid">${quickNotes.map(n => this._renderQuickNoteCard(n)).join('')}</div>`;
        }

        container.innerHTML = html;
        this._bindGridEvents(container);
    },

    _renderCard(note) {
        const colorObj = this._colors.find(c => c.id === (note.color_id || 'default')) || this._colors[0];
        const isColored = note.color_id && note.color_id !== 'default';
        const colorBg = isColored ? colorObj.color + '12' : 'transparent';
        const borderColor = isColored ? colorObj.color : 'var(--border-normal)';
        const preview = (note.content || '').substring(0, 120).replace(/[#*\`\[\]_~]/g, '').trim();
        const tags = (note.tags || []).slice(0, 3).map(t =>
            `<span class="note-card-tag">${escapeHtml(t)}</span>`
        ).join('');
        const childCount = this._getChildNotes(note.id).length;

        return `
            <div class="note-card" data-note-id="${escapeHtml(note.id)}"
                 style="border-left:3px solid ${borderColor};${isColored ? 'background:' + colorBg + ';' : ''}">
                <div class="note-card-header">
                    <span class="note-card-title">${escapeHtml(note.title || 'Sin titulo')}</span>
                    <div class="note-card-badges">
                        ${note.pinned ? '<span class="note-card-badge pin">&#128204;</span>' : ''}
                        ${note.is_favorite ? '<span class="note-card-badge fav">&#11088;</span>' : ''}
                    </div>
                </div>
                ${preview ? `<p class="note-card-preview">${escapeHtml(preview)}</p>` : ''}
                <div class="note-card-footer">
                    <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow:hidden;">
                        ${tags}
                        ${childCount > 0 ? `<span class="note-card-pages-count" title="${childCount} paginas">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            ${childCount}
                        </span>` : ''}
                    </div>
                    <button class="note-card-quick-delete" data-note-id="${escapeHtml(note.id)}" title="Eliminar nota">&#10005;</button>
                    <span class="note-card-date">${formatDate(note.updated_at || note.created_at)}</span>
                </div>
            </div>`;
    },

    _renderQuickNoteCard(note) {
        const preview = (note.content || '').substring(0, 120).replace(/[#*\`\[\]_~]/g, '').trim();
        return `
            <div class="note-card" data-note-id="${escapeHtml(note.id)}"
                 style="border-left:3px solid #eab308;background:rgba(234,179,8,0.06);">
                <div class="note-card-header">
                    <span class="note-card-title">${escapeHtml(note.title || 'Sin titulo')}</span>
                    <div class="note-card-badges">
                        <span class="note-card-badge" style="font-size:10px;background:rgba(234,179,8,0.15);color:#eab308;padding:1px 6px;border-radius:4px;">QN</span>
                    </div>
                </div>
                ${preview ? `<p class="note-card-preview">${escapeHtml(preview)}</p>` : ''}
                <div class="note-card-footer">
                    <div style="flex:1;"></div>
                    <button class="note-card-quick-delete" data-note-id="${escapeHtml(note.id)}" title="Eliminar nota">&#10005;</button>
                    <span class="note-card-date">${formatDate(note.updated_at || note.created_at)}</span>
                </div>
            </div>`;
    },

    _bindGridEvents(container) {
        container.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open editor if clicking the quick delete button
                if (e.target.closest('.note-card-quick-delete')) return;
                this._openEditor(card.dataset.noteId);
            });
        });
        // Quick delete buttons on cards
        container.querySelectorAll('.note-card-quick-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const noteId = btn.dataset.noteId;
                const note = this._notes.find(n => n.id === noteId);
                const noteName = note ? (note.title || 'Sin titulo') : 'esta nota';
                const confirmed = await showModal('Eliminar nota', 'Eliminar "' + noteName + '"? Esta accion no se puede deshacer.', 'Eliminar', 'btn-danger');
                if (confirmed) await this._deleteNote(noteId);
            });
        });
    },

    // ================================================================
    //  EDITOR — Full-featured note editor with pages sidebar
    // ================================================================
    _openEditor(noteId) {
        let note = this._notes.find(n => n.id === noteId);
        if (!note) return;

        this._editingNote = { ...note };
        this._editingTags = [...(note.tags || [])];
        this._isPreviewMode = false;
        this._activePageId = null;

        const container = document.getElementById('notes-container');
        if (!container) return;

        // Track the original parent note for back navigation
        this._originalParentNote = note.parent_id ? this._notes.find(n => n.id === note.parent_id) : null;

        container.innerHTML = this._renderEditorHTML(note);
        this._bindEditorEvents(note);
    },

    _renderEditorHTML(note) {
        const colorPicker = this._colors.map(c => `
            <button class="note-color-dot ${c.id === note.color_id ? 'active' : ''}"
                    data-color-id="${c.id}" style="background:${c.color};"
                    title="${escapeHtml(c.name)}"></button>
        `).join('');

        const tagChips = this._editingTags.map((t, i) =>
            `<span class="filter-chip note-tag-chip" data-tag-index="${i}">
                ${escapeHtml(t)} <span class="tag-remove" data-tag-index="${i}">&times;</span>
            </span>`
        ).join('');

        // Sub-pages sidebar — only for non-quick-notes that aren't themselves sub-pages
        const isSubPage = !!note.parent_id;
        const isQuickNote = !!note.is_quick_note;
        const showPagesSidebar = !isQuickNote && !isSubPage;
        const childNotes = showPagesSidebar ? this._getChildNotes(note.id) : [];
        const pagesList = childNotes.map(cn => `
            <div class="note-page-item ${this._activePageId === cn.id ? 'active' : ''}"
                 data-page-id="${escapeHtml(cn.id)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="note-page-item-title">${escapeHtml(cn.title || 'Sin titulo')}</span>
                <span class="note-page-item-delete" data-page-id="${escapeHtml(cn.id)}" title="Eliminar pagina">&times;</span>
            </div>
        `).join('');

        // Quick note badge in header
        const qnBadge = isQuickNote ? '<span class="note-editor-qn-badge">Quick Note</span>' : '';

        return `
        <div class="note-editor-layout${showPagesSidebar ? '' : ' no-sidebar'}">
            <!-- Pages sidebar (hidden for quick notes and sub-pages) -->
            ${showPagesSidebar ? `
            <div class="note-editor-sidebar">
                <div class="note-editor-sidebar-header">
                    <span class="note-editor-sidebar-title">Paginas</span>
                    <button class="btn btn-ghost btn-sm btn-icon" id="btn-add-page" title="Nueva pagina">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div class="note-editor-sidebar-list" id="note-pages-list">
                    <div class="note-page-item ${!this._activePageId ? 'active' : ''}" data-page-id="">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                        <span class="note-page-item-title">${escapeHtml(note.title || 'Principal')}</span>
                    </div>
                    ${pagesList}
                </div>
            </div>` : ''}

            <!-- Main editor -->
            <div class="note-editor-wrapper">
                <!-- Editor header bar -->
                <div class="note-editor-bar">
                    <button class="btn btn-ghost btn-sm" id="note-back-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                        Volver
                    </button>
                    <div class="note-editor-bar-center">
                        <span class="note-editor-page-label" id="note-editor-page-label">Nota principal</span>
                        ${qnBadge}
                    </div>
                    <div class="note-editor-bar-actions">
                        <div style="position:relative;display:inline-flex;" id="export-dropdown-wrap">
                            <button class="btn btn-ghost btn-sm" id="note-export-btn" title="Exportar nota (Ctrl+Shift+E)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Exportar
                            </button>
                            <div class="export-dropdown hidden" id="export-dropdown">
                                <button class="export-dropdown-item" id="export-md-btn">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    Exportar .md
                                </button>
                                <div style="height:1px;background:var(--border);margin:4px 0;"></div>
                                <button class="export-dropdown-item" id="export-clipboard-btn">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                    Copiar al portapapeles
                                </button>
                            </div>
                        </div>
                        <button class="btn btn-ghost btn-sm" id="note-preview-btn" title="Markdown preview">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" id="note-duplicate-btn" title="Duplicar nota">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            Duplicar
                        </button>
                        <button class="btn btn-ghost btn-sm ${note.pinned ? 'active' : ''}" id="note-pin-btn" title="Fijar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M15 4.5l-4 4L7 10l-1.5 1.5 7 7L14 17l1.5-4 4-4"/>
                                <line x1="9" y1="15" x2="4.35" y2="19.65"/>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm ${note.is_favorite ? 'active' : ''}" id="note-fav-btn" title="Favorito">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="${note.is_favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger btn-sm" id="note-delete-btn" title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Editor content -->
                <div class="note-editor-content" id="note-editor-content">
                    <!-- Title -->
                    <input type="text" id="note-title-input" class="note-title-input"
                           value="${escapeHtml(note.title)}" placeholder="Titulo de la nota..." />

                    <!-- Tags row -->
                    <div class="note-tags-row" id="note-tags-area">
                        ${tagChips}
                        <input type="text" id="note-tag-input" class="note-tag-input"
                               placeholder="+ etiqueta (Enter)...">
                    </div>

                    <!-- Color picker -->
                    <div class="note-color-row">
                        <span class="note-color-label">Color:</span>
                        ${colorPicker}
                    </div>

                    <!-- Format toolbar -->
                    <div class="format-toolbar" id="format-toolbar">
                        <button class="fmt-btn" data-fmt="bold" title="Negrita (Ctrl+B)"><strong>B</strong></button>
                        <button class="fmt-btn" data-fmt="italic" title="Italica (Ctrl+I)"><em>I</em></button>
                        <span class="fmt-sep"></span>
                        <button class="fmt-btn" data-fmt="heading" title="Titulo">H</button>
                        <button class="fmt-btn" data-fmt="list" title="Lista">&#8226;</button>
                        <button class="fmt-btn" data-fmt="checkbox" title="Checkbox">&#9745;</button>
                        <span class="fmt-sep"></span>
                        <button class="fmt-btn" data-fmt="code" title="Codigo">&lt;/&gt;</button>
                        <button class="fmt-btn" data-fmt="link" title="Link">&#128279;</button>
                        <button class="fmt-btn" data-fmt="divider" title="Linea">&#8212;</button>
                    </div>

                    <!-- Textarea -->
                    <textarea id="note-content-input" class="note-content-textarea selectable"
                              placeholder="Escribe aqui... soporta Markdown."></textarea>

                    <!-- Preview -->
                    <div id="note-preview-area" class="note-preview hidden selectable"></div>
                </div>

                <!-- Status bar -->
                <div class="note-editor-statusbar" id="note-statusbar">
                    <span id="note-word-count">0 palabras</span>
                    <span id="note-char-count">0 caracteres</span>
                    <span id="note-line-count">0 lineas</span>
                    <span style="flex:1;"></span>
                    <span id="note-save-status" style="color:var(--text-muted);font-size:11px;"></span>
                </div>
            </div>
        </div>`;
    },

    // ================================================================
    //  EDITOR EVENTS
    // ================================================================
    _bindEditorEvents(note) {
        // Back
        const backBtn = document.getElementById('note-back-btn');
        if (backBtn) backBtn.addEventListener('click', () => {
            this._clearAutoSave();
            this._saveCurrentNote();
            this._editingNote = null;
            this._editingTags = [];
            this._isPreviewMode = false;
            this._activePageId = null;
            this._originalParentNote = null;
            this._renderGrid();
        });

        // Pages sidebar — only bind if the sidebar exists
        const pagesListEl = document.getElementById('note-pages-list');
        if (pagesListEl) {
            this._bindPagesEvents(note);
        }

        // Pin
        const pinBtn = document.getElementById('note-pin-btn');
        if (pinBtn) pinBtn.addEventListener('click', async () => {
            this._editingNote.pinned = !this._editingNote.pinned;
            const localNote = this._notes.find(n => n.id === this._editingNote.id);
            if (localNote) localNote.pinned = this._editingNote.pinned;
            pinBtn.classList.toggle('active', this._editingNote.pinned);
            pinBtn.querySelector('svg').setAttribute('fill', this._editingNote.pinned ? 'currentColor' : 'none');
            const a = api();
            if (a) { try { await a.update_note(this._editingNote.id, null, null, null, this._editingNote.pinned); } catch (e) {} }
            showToast(this._editingNote.pinned ? 'Nota fijada' : 'Nota desfijada', 'success');
        });

        // Favorite
        const favBtn = document.getElementById('note-fav-btn');
        if (favBtn) favBtn.addEventListener('click', async () => {
            this._editingNote.is_favorite = !this._editingNote.is_favorite;
            const localNote = this._notes.find(n => n.id === this._editingNote.id);
            if (localNote) localNote.is_favorite = this._editingNote.is_favorite;
            favBtn.classList.toggle('active', this._editingNote.is_favorite);
            favBtn.querySelector('svg').setAttribute('fill', this._editingNote.is_favorite ? 'currentColor' : 'none');
            const a = api();
            if (a) { try { await a.update_note(this._editingNote.id, null, null, null, null, null, null, this._editingNote.is_favorite); } catch (e) {} }
            showToast(this._editingNote.is_favorite ? 'Favorito' : 'Quitado de favoritos', 'success');
        });

        // Export dropdown
        const exportBtn = document.getElementById('note-export-btn');
        const exportDropdown = document.getElementById('export-dropdown');
        if (exportBtn && exportDropdown) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exportDropdown.classList.toggle('hidden');
            });
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                exportDropdown.classList.add('hidden');
            });
            exportDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            // Export MD
            const exportMdBtn = document.getElementById('export-md-btn');
            if (exportMdBtn) exportMdBtn.addEventListener('click', async () => {
                exportDropdown.classList.add('hidden');
                await this._exportNote('file');
            });
            // Copy to clipboard
            const exportClipBtn = document.getElementById('export-clipboard-btn');
            if (exportClipBtn) exportClipBtn.addEventListener('click', async () => {
                exportDropdown.classList.add('hidden');
                await this._exportNote('clipboard');
            });
        }

        // Duplicate note
        const duplicateBtn = document.getElementById('note-duplicate-btn');
        if (duplicateBtn) duplicateBtn.addEventListener('click', async () => {
            const a = api();
            if (!a) return;
            try {
                const newNote = await a.duplicate_note(note.id);
                if (newNote) {
                    if (typeof newNote.tags === 'string') {
                        try { newNote.tags = JSON.parse(newNote.tags); } catch(e) { newNote.tags = []; }
                    }
                    this._notes.unshift(newNote);
                    showToast('Nota duplicada', 'success');
                    this._renderGrid();
                } else {
                    showToast('Error al duplicar', 'error');
                }
            } catch (e) {
                showToast('Error al duplicar: ' + e.message, 'error');
            }
        });

        // Delete
        const deleteBtn = document.getElementById('note-delete-btn');
        if (deleteBtn) deleteBtn.addEventListener('click', async () => {
            const confirmed = await showModal('Eliminar nota', 'Eliminar "' + note.title + '"? Esta accion no se puede deshacer.', 'Eliminar', 'btn-danger');
            if (confirmed) await this._deleteNote(note.id);
        });

        // Color picker
        $$('.note-color-dot').forEach(btn => {
            btn.addEventListener('click', async () => {
                const colorId = btn.dataset.colorId;
                this._editingNote.color_id = colorId;
                const localNote = this._notes.find(n => n.id === this._editingNote.id);
                if (localNote) localNote.color_id = colorId;
                $$('.note-color-dot').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const a = api();
                if (a) { try { await a.update_note(this._editingNote.id, null, null, colorId); } catch (e) {} }
            });
        });

        // Format toolbar
        $$('.fmt-btn').forEach(btn => {
            btn.addEventListener('click', () => this._applyFormat(btn.dataset.fmt));
        });

        // Preview toggle
        const previewBtn = document.getElementById('note-preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this._isPreviewMode = !this._isPreviewMode;
                const textarea = document.getElementById('note-content-input');
                const previewArea = document.getElementById('note-preview-area');
                const toolbar = document.getElementById('format-toolbar');
                if (this._isPreviewMode) {
                    previewArea.innerHTML = this._renderMarkdown(textarea.value);
                    previewArea.classList.remove('hidden');
                    textarea.classList.add('hidden');
                    toolbar.classList.add('hidden');
                    previewBtn.classList.add('active');
                } else {
                    previewArea.classList.add('hidden');
                    textarea.classList.remove('hidden');
                    toolbar.classList.remove('hidden');
                    previewBtn.classList.remove('active');
                }
            });
        }

        // Tags
        const tagInput = document.getElementById('note-tag-input');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = tagInput.value.replace(/,/g, '').trim().toLowerCase();
                    if (val && !this._editingTags.includes(val)) {
                        this._editingTags.push(val);
                        this._refreshTagChips();
                        this._scheduleAutoSave();
                    }
                    tagInput.value = '';
                }
                if (e.key === 'Backspace' && !tagInput.value && this._editingTags.length > 0) {
                    this._editingTags.pop();
                    this._refreshTagChips();
                    this._scheduleAutoSave();
                }
            });
        }

        // Auto-save on input
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        if (titleInput) titleInput.addEventListener('input', () => { this._scheduleAutoSave(); this._updateWordCount(); });
        if (contentInput) contentInput.addEventListener('input', () => { this._scheduleAutoSave(); this._updateWordCount(); });

        // Keyboard shortcuts
        const editorContent = document.getElementById('note-editor-content');
        if (editorContent) {
            editorContent.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'b') { e.preventDefault(); this._applyFormat('bold'); }
                if (e.ctrlKey && e.key === 'i') { e.preventDefault(); this._applyFormat('italic'); }
                if (e.ctrlKey && e.key === 's') { e.preventDefault(); this._saveCurrentNote(); this._showSaveStatus('Guardado'); showToast('Guardado', 'success'); }
                if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); this._exportNote('file'); }
                if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); this._exportNote('clipboard'); }
            });
        }

        // Set content after DOM is ready
        if (contentInput) contentInput.value = note.content || '';

        // Focus title
        if (titleInput) setTimeout(() => titleInput.focus(), 50);

        // Initial word count
        setTimeout(() => this._updateWordCount(), 100);
    },

    // ---- Pages sidebar events ----
    _bindPagesEvents(parentNote) {
        // Add page button
        const addPageBtn = document.getElementById('btn-add-page');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', async () => {
                await this._createSubPage(parentNote.id);
            });
        }

        // Page item clicks
        const pagesList = document.getElementById('note-pages-list');
        if (pagesList) {
            pagesList.querySelectorAll('.note-page-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.note-page-item-delete')) return;
                    const pageId = item.dataset.pageId;
                    this._switchToPage(pageId, parentNote);
                });
            });

            // Delete page buttons
            pagesList.querySelectorAll('.note-page-item-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const pageId = btn.dataset.pageId;
                    const pageNote = this._notes.find(n => n.id === pageId);
                    const pageName = pageNote ? pageNote.title : 'esta pagina';
                    try {
                        const confirmed = await showModal('Eliminar pagina', 'Eliminar "' + pageName + '"?', 'Eliminar', 'btn-danger');
                        if (confirmed) {
                            const a = api();
                            if (a) { try { await a.delete_note(pageId); } catch (delErr) { console.error('Delete page error:', delErr); } }
                            this._notes = this._notes.filter(n => n.id !== pageId);
                            if (this._activePageId === pageId) {
                                this._activePageId = null;
                            }
                            showToast('Pagina eliminada', 'success');
                            this._refreshPagesSidebar(parentNote);
                        }
                    } catch (err) {
                        console.error('Page delete flow error:', err);
                    }
                });
            });
        }
    },

    async _switchToPage(pageId, parentNote) {
        // Save current page before switching
        this._clearAutoSave();
        if (this._activePageId) {
            await this._saveCurrentPage();
        } else {
            this._saveCurrentNote();
        }

        this._activePageId = pageId || null;

        // Update active states
        const pagesList = document.getElementById('note-pages-list');
        if (pagesList) {
            pagesList.querySelectorAll('.note-page-item').forEach(item => {
                item.classList.toggle('active', item.dataset.pageId === (pageId || ''));
            });
        }

        // Update page label
        const label = document.getElementById('note-editor-page-label');
        if (label) {
            if (!pageId) {
                label.textContent = 'Nota principal';
            } else {
                const pageNote = this._notes.find(n => n.id === pageId);
                label.textContent = pageNote ? (pageNote.title || 'Sin titulo') : 'Pagina';
            }
        }

        // Load page content
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        const tagsArea = document.getElementById('note-tags-area');

        if (pageId) {
            const pageNote = this._notes.find(n => n.id === pageId);
            if (pageNote) {
                this._editingNote = { ...pageNote };
                this._editingTags = [...(pageNote.tags || [])];
                if (titleInput) titleInput.value = pageNote.title || '';
                if (contentInput) contentInput.value = pageNote.content || '';
                this._refreshTagChips();
                // Update color dots
                $$('.note-color-dot').forEach(dot => {
                    dot.classList.toggle('active', dot.dataset.colorId === pageNote.color_id);
                });
            }
        } else {
            this._editingNote = { ...parentNote };
            this._editingTags = [...(parentNote.tags || [])];
            if (titleInput) titleInput.value = parentNote.title || '';
            if (contentInput) contentInput.value = parentNote.content || '';
            this._refreshTagChips();
            $$('.note-color-dot').forEach(dot => {
                dot.classList.toggle('active', dot.dataset.colorId === parentNote.color_id);
            });
        }

        // Reset preview mode
        this._isPreviewMode = false;
        const previewArea = document.getElementById('note-preview-area');
        const toolbar = document.getElementById('format-toolbar');
        const previewBtn = document.getElementById('note-preview-btn');
        if (previewArea) previewArea.classList.add('hidden');
        if (contentInput) contentInput.classList.remove('hidden');
        if (toolbar) toolbar.classList.remove('hidden');
        if (previewBtn) previewBtn.classList.remove('active');

        if (titleInput) titleInput.focus();
    },

    _refreshPagesSidebar(parentNote) {
        const pagesList = document.getElementById('note-pages-list');
        if (!pagesList) return;

        const childNotes = this._getChildNotes(parentNote.id);
        const pagesHtml = childNotes.map(cn => `
            <div class="note-page-item ${this._activePageId === cn.id ? 'active' : ''}"
                 data-page-id="${escapeHtml(cn.id)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="note-page-item-title">${escapeHtml(cn.title || 'Sin titulo')}</span>
                <span class="note-page-item-delete" data-page-id="${escapeHtml(cn.id)}" title="Eliminar pagina">&times;</span>
            </div>
        `).join('');

        pagesList.innerHTML = `
            <div class="note-page-item ${!this._activePageId ? 'active' : ''}" data-page-id="">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                <span class="note-page-item-title">${escapeHtml(parentNote.title || 'Principal')}</span>
            </div>
            ${pagesHtml}
        `;

        // Rebind events
        pagesList.querySelectorAll('.note-page-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.note-page-item-delete')) return;
                this._switchToPage(item.dataset.pageId, parentNote);
            });
        });
        pagesList.querySelectorAll('.note-page-item-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const pageId = btn.dataset.pageId;
                const pageNote = this._notes.find(n => n.id === pageId);
                const pageName = pageNote ? pageNote.title : 'esta pagina';
                try {
                    const confirmed = await showModal('Eliminar pagina', 'Eliminar "' + pageName + '"?', 'Eliminar', 'btn-danger');
                    if (confirmed) {
                        const a = api();
                        if (a) { try { await a.delete_note(pageId); } catch (delErr) { console.error('Delete page error:', delErr); } }
                        this._notes = this._notes.filter(n => n.id !== pageId);
                        if (this._activePageId === pageId) this._activePageId = null;
                        showToast('Pagina eliminada', 'success');
                        this._refreshPagesSidebar(parentNote);
                    }
                } catch (err) {
                    console.error('Page delete flow error:', err);
                }
            });
        });
    },

    async _createSubPage(parentId) {
        const a = api();
        const pageName = 'Pagina ' + (this._getChildNotes(parentId).length + 1);
        let newPage;
        try {
            newPage = await a.create_note(pageName, '', 'default', parentId, '', [], false);
            if (newPage && typeof newPage.tags === 'string') {
                try { newPage.tags = JSON.parse(newPage.tags); } catch(e) { newPage.tags = []; }
            }
        } catch (err) {
            newPage = {
                id: generateId(), title: pageName, content: '',
                color_id: 'default', pinned: false, is_quick_note: false, is_favorite: false,
                parent_id: parentId, tags: [],
                created_at: Date.now() / 1000, updated_at: Date.now() / 1000,
            };
        }
        if (!newPage) {
            showToast('Error al crear pagina', 'error');
            return;
        }
        this._notes.push(newPage);
        showToast('Pagina creada', 'success');
        this._refreshPagesSidebar(this._notes.find(n => n.id === parentId) || this._editingNote);
        this._switchToPage(newPage.id, this._notes.find(n => n.id === parentId) || this._editingNote);
    },

    // ---- Tag chip refresh ----
    _refreshTagChips() {
        const area = document.getElementById('note-tags-area');
        if (!area) return;
        const tagInput = document.getElementById('note-tag-input');
        area.querySelectorAll('.note-tag-chip').forEach(c => c.remove());
        const fragment = document.createDocumentFragment();
        this._editingTags.forEach((t, i) => {
            const chip = document.createElement('span');
            chip.className = 'filter-chip note-tag-chip';
            chip.dataset.tagIndex = i;
            chip.innerHTML = `${escapeHtml(t)}<span class="tag-remove" data-tag-index="${i}">&times;</span>`;
            fragment.appendChild(chip);
        });
        area.insertBefore(fragment, tagInput);
        area.querySelectorAll('.tag-remove').forEach(rem => {
            rem.addEventListener('click', (e) => {
                e.stopPropagation();
                this._editingTags.splice(parseInt(rem.dataset.tagIndex, 10), 1);
                this._refreshTagChips();
                this._scheduleAutoSave();
            });
        });
    },

    // ================================================================
    //  CRUD
    // ================================================================
    async _createNote() {
        const a = api();
        let note;
        try {
            note = await a.create_note('Nueva nota', '', 'default', null, '', [], false);
            if (note && typeof note.tags === 'string') {
                try { note.tags = JSON.parse(note.tags); } catch(e) { note.tags = []; }
            }
        } catch (err) {
            note = {
                id: generateId(), title: 'Nueva nota', content: '',
                color_id: 'default', pinned: false, is_quick_note: false, is_favorite: false,
                parent_id: null, tags: [], created_at: Date.now() / 1000, updated_at: Date.now() / 1000,
            };
        }
        if (!note) {
            showToast('Error al crear nota', 'error');
            return;
        }
        this._notes.unshift(note);
        showToast('Nota creada', 'success');
        this._openEditor(note.id);
        setTimeout(() => {
            const titleInput = document.getElementById('note-title-input');
            if (titleInput) { titleInput.select(); titleInput.focus(); }
        }, 100);
    },

    async _deleteNote(id) {
        const a = api();
        if (!a) { showToast('API no disponible', 'error'); return; }

        try {
            // The DB delete_note already cascades (deletes children first),
            // so a single call is enough — no need to delete descendants one by one
            const result = await a.delete_note(id);
            if (!result) {
                showToast('Nota no encontrada', 'warning');
                return;
            }

            // Remove the note AND all its descendants from local cache
            const idsToRemove = new Set([id]);
            const collectDescendants = (parentId) => {
                const children = this._notes.filter(n => n.parent_id === parentId);
                for (const child of children) {
                    idsToRemove.add(child.id);
                    collectDescendants(child.id);
                }
            };
            collectDescendants(id);

            this._notes = this._notes.filter(n => !idsToRemove.has(n.id));
            this._clearAutoSave();
            this._editingNote = null;
            this._editingTags = [];
            this._isPreviewMode = false;
            this._activePageId = null;
            showToast('Nota eliminada', 'success');
            this._renderGrid();
        } catch (e) {
            console.error('Delete note error:', e);
            showToast('Error al eliminar: ' + (e.message || e), 'error');
        }
    },

    // ================================================================
    //  EXPORT — Markdown (.md) with YAML front matter, TXT, clipboard
    // ================================================================
    async _exportNote(mode) {
        if (!this._editingNote) return;

        // Save current note first to ensure we export the latest content
        this._clearAutoSave();
        await this._saveCurrentNote();

        const a = api();
        if (!a) { showToast('API no disponible', 'error'); return; }

        // Get the title from the current title input (might have been updated)
        const titleInput = document.getElementById('note-title-input');
        const noteTitle = titleInput ? titleInput.value.trim() : (this._editingNote.title || 'Sin titulo');

        // Determine if we're exporting a top-level note with children or a sub-page/quick note
        const parentNote = this._notes.find(n => n.id === this._editingNote.id);
        const childNotes = parentNote ? this._getChildNotes(parentNote.id) : [];
        const hasChildren = childNotes.length > 0;
        const isQuickNote = !!this._editingNote.is_quick_note;

        // Build Markdown content with YAML front matter
        const buildMarkdown = () => {
            let md = '';
            const note = this._editingNote;
            const tags = this._editingTags || [];
            const createdAt = note.created_at || '';
            const updatedAt = note.updated_at || '';
            const colorId = note.color_id || 'default';

            // --- YAML front matter ---
            md += '---\n';
            md += 'title: "' + noteTitle.replace(/"/g, '\\"') + '"\n';
            if (tags.length > 0) {
                md += 'tags:\n';
                tags.forEach(t => { md += '  - ' + t + '\n'; });
            }
            if (colorId && colorId !== 'default') {
                md += 'color: ' + colorId + '\n';
            }
            if (note.pinned) md += 'pinned: true\n';
            if (note.is_favorite) md += 'favorite: true\n';
            if (isQuickNote) md += 'type: quick-note\n';
            if (createdAt) md += 'created: ' + createdAt + '\n';
            if (updatedAt) md += 'updated: ' + updatedAt + '\n';
            if (hasChildren) md += 'pages: ' + childNotes.length + '\n';
            md += '---\n\n';

            // --- Title heading ---
            md += '# ' + noteTitle + '\n\n';

            // --- Tags inline (below title for visibility) ---
            if (tags.length > 0) {
                md += '> ' + tags.map(t => '`' + t + '`').join(' ') + '\n\n';
            }

            // --- Main content ---
            md += (note.content || '') + '\n';

            // --- Table of contents for sub-pages ---
            if (hasChildren) {
                md += '\n---\n\n';
                md += '## Paginas\n\n';
                childNotes.forEach((child, idx) => {
                    const slug = this._anchorSlug(child.title || ('Pagina ' + (idx + 1)));
                    md += '- [' + (child.title || 'Sin titulo') + '](#' + slug + ')\n';
                });
                md += '\n';
            }

            // --- Sub-pages content ---
            if (hasChildren) {
                childNotes.forEach((child, idx) => {
                    const childTitle = child.title || ('Pagina ' + (idx + 1));
                    const childContent = child.content || '';
                    md += '\n---\n\n';
                    md += '## ' + childTitle + '\n\n';
                    if (childContent.trim()) {
                        md += childContent + '\n';
                    } else {
                        md += '_Pagina vacia_\n\n';
                    }
                });
            }

            return md;
        };

        try {
            // --- Clipboard mode ---
            if (mode === 'clipboard') {
                const mdContent = buildMarkdown();
                try {
                    await navigator.clipboard.writeText(mdContent);
                    showToast('Nota copiada al portapapeles (Markdown)', 'success');
                } catch (clipErr) {
                    // Fallback for pywebview environments without clipboard API
                    const contentInput = document.getElementById('note-content-input');
                    if (contentInput) {
                        const ta = document.createElement('textarea');
                        ta.value = mdContent;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        showToast('Nota copiada al portapapeles (Markdown)', 'success');
                    } else {
                        showToast('No se pudo copiar al portapapeles', 'error');
                    }
                }
                return;
            }

            // --- File export mode ---
            const safeName = this._safeFileName(noteTitle) + '.md';
            const result = await a.save_file_dialog(
                'Exportar nota',
                safeName,
                [
                    ['Markdown', ['*.md']],
                ]
            );

            if (!result || !result.success || !result.path) return;

            const filePath = result.path;
            const fullContent = buildMarkdown();

            const exportResult = await a.export_note_to_file(filePath, noteTitle, fullContent, 'md');
            if (exportResult && exportResult.success) {
                showToast('Nota exportada: ' + filePath, 'success');
            } else {
                showToast('Error al exportar: ' + (exportResult ? exportResult.message : 'desconocido'), 'error');
            }
        } catch (e) {
            showToast('Error al exportar: ' + e.message, 'error');
        }
    },

    // --- Export helpers ---
    _safeFileName(name) {
        return (name || 'nota')
            .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 60) || 'nota';
    },

    _anchorSlug(text) {
        return (text || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60) || 'pagina';
    },

    _formatTimestamp(ts) {
        if (!ts) return '';
        try {
            let date;
            if (typeof ts === 'number') {
                date = new Date(ts * 1000);
            } else if (typeof ts === 'string') {
                date = new Date(ts);
            } else {
                return String(ts);
            }
            if (isNaN(date.getTime())) return String(ts);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return String(ts);
        }
    },

    async _saveCurrentNote() {
        if (!this._editingNote) return;
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        if (!titleInput && !contentInput) return;

        const newTitle = (titleInput ? titleInput.value.trim() : this._editingNote.title) || 'Sin titulo';
        const newContent = contentInput ? contentInput.value : (this._editingNote.content || '');

        this._editingNote.title = newTitle;
        this._editingNote.content = newContent;
        this._editingNote.tags = [...this._editingTags];
        this._editingNote.updated_at = Date.now() / 1000;

        const local = this._notes.find(n => n.id === this._editingNote.id);
        if (local) {
            local.title = newTitle;
            local.content = newContent;
            local.tags = [...this._editingTags];
            local.color_id = this._editingNote.color_id;
            local.pinned = this._editingNote.pinned;
            local.is_favorite = this._editingNote.is_favorite;
            local.updated_at = this._editingNote.updated_at;
        }

        const a = api();
        if (a) {
            try {
                await a.update_note(
                    this._editingNote.id,
                    newTitle,
                    newContent,
                    this._editingNote.color_id,
                    this._editingNote.pinned,
                    null,
                    null,
                    this._editingTags,
                    this._editingNote.is_favorite
                );
            } catch (err) {
                console.error('Auto-save error:', err);
            }
        }
    },

    async _saveCurrentPage() {
        if (!this._activePageId || !this._editingNote) return;
        // Same as _saveCurrentNote but for a sub-page
        await this._saveCurrentNote();

        // Update page sidebar label
        const pageItem = document.querySelector(`.note-page-item[data-page-id="${this._activePageId}"] .note-page-item-title`);
        if (pageItem) pageItem.textContent = this._editingNote.title || 'Sin titulo';
    },

    // ================================================================
    //  AUTO-SAVE  (3-second debounce)
    // ================================================================
    _scheduleAutoSave() {
        this._clearAutoSave();
        this._autoSaveTimer = setTimeout(() => {
            if (this._activePageId) {
                this._saveCurrentPage();
            } else {
                this._saveCurrentNote();
            }
        }, 3000);
    },

    _clearAutoSave() {
        if (this._autoSaveTimer) { clearTimeout(this._autoSaveTimer); this._autoSaveTimer = null; }
    },

    // ================================================================
    //  STATUS BAR — word/char/line count
    // ================================================================
    _updateWordCount() {
        const contentInput = document.getElementById('note-content-input');
        if (!contentInput) return;
        const text = contentInput.value || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const lines = text ? text.split('\n').length : 0;

        const wordEl = document.getElementById('note-word-count');
        const charEl = document.getElementById('note-char-count');
        const lineEl = document.getElementById('note-line-count');
        if (wordEl) wordEl.textContent = words + (words === 1 ? ' palabra' : ' palabras');
        if (charEl) charEl.textContent = chars + (chars === 1 ? ' caracter' : ' caracteres');
        if (lineEl) lineEl.textContent = lines + (lines === 1 ? ' linea' : ' lineas');
    },

    _showSaveStatus(msg) {
        const el = document.getElementById('note-save-status');
        if (!el) return;
        el.textContent = msg;
        setTimeout(() => { if (el) el.textContent = ''; }, 2000);
    },

    // ================================================================
    //  FORMAT TOOLBAR
    // ================================================================
    _applyFormat(fmt) {
        const textarea = document.getElementById('note-content-input');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sel = textarea.value.substring(start, end);
        let before = '', after = '', insert = '';

        switch (fmt) {
            case 'bold':     before = '**'; after = '**'; insert = sel || 'negrita'; break;
            case 'italic':   before = '*';  after = '*';  insert = sel || 'italica'; break;
            case 'heading':  before = '## '; after = ''; insert = sel || 'Titulo'; break;
            case 'list':     before = '- '; after = ''; insert = sel || 'Item'; break;
            case 'code':     before = '```\n'; after = '\n```'; insert = sel || 'codigo'; break;
            case 'link':     before = '['; after = '](url)'; insert = sel || 'texto'; break;
            case 'checkbox': before = '- [ ] '; after = ''; insert = sel || 'Tarea'; break;
            case 'divider':  before = '\n---\n'; after = ''; insert = ''; break;
        }

        const newText = textarea.value.substring(0, start) + before + insert + after + textarea.value.substring(end);
        textarea.value = newText;
        textarea.focus();
        if (insert) {
            textarea.setSelectionRange(start + before.length, start + before.length + insert.length);
        } else {
            textarea.setSelectionRange(start + before.length + after.length, start + before.length + after.length);
        }
        this._scheduleAutoSave();
    },

    // ================================================================
    //  MARKDOWN → HTML
    // ================================================================
    _renderMarkdown(text) {
        if (!text) return '<p style="color:var(--text-muted);">Nota vacia...</p>';
        let html = escapeHtml(text);

        html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="code-block"><code>${code.trim()}</code></pre>`);
        html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
        html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/^- \[x\] (.+)$/gm, '<div class="md-checkbox checked"><span>&#10003;</span> $1</div>');
        html = html.replace(/^- \[ \] (.+)$/gm, '<div class="md-checkbox"><span></span> $1</div>');
        html = html.replace(/^- (.+)$/gm, '<div class="md-list-item">$1</div>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#" class="md-link" onclick="return false">$1</a>');
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        return `<div class="md-content"><p>${html}</p></div>`;
    },
});
