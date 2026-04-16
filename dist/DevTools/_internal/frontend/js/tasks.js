/**
 * ============================================================
 * GAME DEV HUB — tasks.js
 * Seccion Tareas: Kanban + List dual-view, drag-and-drop,
 *   filtros, prioridades, estados, proyectos
 * ============================================================
 */

registerSection('tasks', {
    _tasks: [],
    _view: 'kanban',
    _currentStatusFilter: null,
    _currentPriorityFilter: null,
    _projects: [],
    _stats: null,
    _sortField: 'priority',
    _sortAsc: true,
    _draggedTaskId: null,

    // ── Constants ──────────────────────────────────────────
    _STATUSES: [
        { id: 'backlog',     label: 'Backlog' },
        { id: 'todo',        label: 'To Do' },
        { id: 'in_progress', label: 'En Progreso' },
        { id: 'review',      label: 'Review' },
        { id: 'done',        label: 'Done' },
    ],
    _PRI_COLORS: { critical: '#ef4444', high: '#F47B67', medium: '#eab308', low: '#22c55e' },
    _PRI_LABELS: { critical: 'Critica', high: 'Alta', medium: 'Media', low: 'Baja' },
    _PRI_ORDER:  ['critical', 'high', 'medium', 'low'],

    // ── render() ───────────────────────────────────────────
    render() {
        return `
            <div class="section tasks-compact">
                <div class="section-header">
                    <h2>Tareas</h2>
                    <div class="section-header-actions">
                        <div style="display:flex;gap:4px;margin-right:8px;">
                            <button class="btn btn-sm ${this._view === 'kanban' ? 'btn-primary' : 'btn-ghost'}" id="btn-view-kanban" title="Vista Kanban">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="12" rx="1"/></svg>
                            </button>
                            <button class="btn btn-sm ${this._view === 'list' ? 'btn-primary' : 'btn-ghost'}" id="btn-view-list" title="Vista Lista">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            </button>
                        </div>
                        <button class="btn btn-primary btn-sm" id="btn-add-task">+ Nueva tarea</button>
                    </div>
                </div>
                <div class="section-body">
                    <div id="tasks-summary" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;"></div>

                    <!-- Filters bar -->
                    <div id="tasks-filters-bar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
                        <div class="search-bar" style="max-width:220px;">
                            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="tasks-search" placeholder="Buscar tareas...">
                        </div>
                        <div id="tasks-status-chips" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
                        <div style="flex:1;"></div>
                        <div id="tasks-priority-chips" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
                    </div>

                    <!-- View container -->
                    <div id="tasks-view-container">
                        <div class="spinner-container" style="min-height:200px;"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        `;
    },

    // ── load() ─────────────────────────────────────────────
    async load() {
        await this._loadData();

        // View toggle buttons
        const kanbanBtn = document.getElementById('btn-view-kanban');
        const listBtn = document.getElementById('btn-view-list');
        if (kanbanBtn) kanbanBtn.addEventListener('click', () => this._switchView('kanban'));
        if (listBtn) listBtn.addEventListener('click', () => this._switchView('list'));

        // Add task button
        const addBtn = document.getElementById('btn-add-task');
        if (addBtn) addBtn.addEventListener('click', () => this._showAddTaskForm('todo'));

        // Search
        const searchInput = document.getElementById('tasks-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                if (this._view === 'list') this._renderList(searchInput.value);
                else this._renderKanban(searchInput.value);
            }, 300));
        }

        // Status filter chips
        this._renderFilterChips();
        this._renderCurrentView();
    },

    unload() {
        this._tasks = [];
        this._stats = null;
        this._projects = [];
        this._currentStatusFilter = null;
        this._currentPriorityFilter = null;
    },

    // ── Data loading ───────────────────────────────────────
    async _loadData() {
        const a = api();
        if (!a) { this._tasks = []; this._renderSummary(null); this._renderCurrentView(); return; }

        try {
            const [tasks, cats, pris, states, stats] = await Promise.all([
                a.get_tasks(null, null, null),
                a.get_tasks_categories(),
                a.get_tasks_priorities(),
                a.get_tasks_states(),
                a.get_tasks_stats(),
            ]);
            this._tasks = tasks || [];
            this._categories = cats || [];
            this._priorities = pris || [];
            this._states = states || [];
            this._stats = stats;
            this._renderSummary(stats);
            this._renderFilterChips();
        } catch (e) {
            console.error('Error cargando tareas:', e);
            this._tasks = [];
            this._stats = null;
        }
    },

    // ── Switch view ────────────────────────────────────────
    _switchView(view) {
        this._view = view;
        const kanbanBtn = document.getElementById('btn-view-kanban');
        const listBtn = document.getElementById('btn-view-list');
        if (kanbanBtn) kanbanBtn.className = `btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`;
        if (listBtn) listBtn.className = `btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`;
        this._renderCurrentView();
    },

    _renderCurrentView(searchQuery) {
        if (this._view === 'kanban') this._renderKanban(searchQuery);
        else this._renderList(searchQuery);
    },

    // ── Filter helpers ─────────────────────────────────────
    _getFilteredTasks(searchQuery) {
        let tasks = [...this._tasks];

        if (this._currentStatusFilter) {
            tasks = tasks.filter(t => t.status === this._currentStatusFilter);
        }
        if (this._currentPriorityFilter) {
            tasks = tasks.filter(t => t.priority === this._currentPriorityFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q)
            );
        }
        return tasks;
    },

    _renderFilterChips() {
        // Status chips
        const statusContainer = document.getElementById('tasks-status-chips');
        if (statusContainer) {
            statusContainer.innerHTML = this._STATUSES.map(s => `
                <button class="filter-chip ${this._currentStatusFilter === s.id ? 'active' : ''}" data-status="${s.id}">${s.label}</button>
            `).join('');
            statusContainer.querySelectorAll('.filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    this._currentStatusFilter = this._currentStatusFilter === chip.dataset.status ? null : chip.dataset.status;
                    this._renderFilterChips();
                    this._renderCurrentView((document.getElementById('tasks-search') || {}).value);
                });
            });
        }

        // Priority chips
        const priContainer = document.getElementById('tasks-priority-chips');
        if (priContainer) {
            priContainer.innerHTML = `
                <button class="filter-chip ${!this._currentPriorityFilter ? 'active' : ''}" data-priority="">Todas</button>
                ${this._PRI_ORDER.map(p => `
                    <button class="filter-chip ${this._currentPriorityFilter === p ? 'active' : ''}" data-priority="${p}" style="${this._currentPriorityFilter === p ? 'border-color:' + this._PRI_COLORS[p] + ';color:' + this._PRI_COLORS[p] : ''}">
                        ${this._PRI_LABELS[p]}
                    </button>
                `).join('')}
            `;
            priContainer.querySelectorAll('.filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const val = chip.dataset.priority || null;
                    this._currentPriorityFilter = this._currentPriorityFilter === val ? null : val;
                    this._renderFilterChips();
                    this._renderCurrentView((document.getElementById('tasks-search') || {}).value);
                });
            });
        }
    },

    // ── Summary chips ──────────────────────────────────────
    _renderSummary(stats) {
        const el = document.getElementById('tasks-summary');
        if (!el) return;
        if (!stats) { el.innerHTML = ''; return; }

        el.innerHTML = `
            <div class="summary-chip"><span class="summary-num">${stats.backlog || 0}</span><span class="summary-label">Backlog</span></div>
            <div class="summary-chip"><span class="summary-num">${stats.pending || 0}</span><span class="summary-label">Pendientes</span></div>
            <div class="summary-chip"><span class="summary-num">${stats.in_progress || 0}</span><span class="summary-label">En Progreso</span></div>
            <div class="summary-chip"><span class="summary-num">${stats.review || 0}</span><span class="summary-label">Review</span></div>
            <div class="summary-chip"><span class="summary-num" style="color:var(--text-positive);">${stats.done || 0}</span><span class="summary-label">Completadas</span></div>
            ${stats.overdue > 0 ? `<div class="summary-chip summary-chip-danger"><span class="summary-num">${stats.overdue}</span><span class="summary-label">Vencidas</span></div>` : ''}
        `;
    },

    // ══════════════════════════════════════════════════════
    //  KANBAN VIEW
    // ══════════════════════════════════════════════════════

    _renderKanban(searchQuery) {
        const container = document.getElementById('tasks-view-container');
        if (!container) return;

        const filtered = this._getFilteredTasks(searchQuery);

        const columns = this._STATUSES.map(status => {
            const tasks = filtered.filter(t => t.status === status.id);
            return this._renderKanbanColumn(status.id, status.label, tasks);
        }).join('');

        container.innerHTML = `<div class="kanban-board">${columns}</div>`;
        this._bindKanbanEvents();
    },

    _renderKanbanColumn(statusId, label, tasks) {
        const colClass = {
            backlog: 'col-backlog', todo: 'col-todo',
            'in_progress': 'col-progress', review: 'col-review', done: 'col-done',
        }[statusId] || '';

        const cards = tasks.map(t => this._renderKanbanCard(t)).join('');

        return `
            <div class="kanban-column ${colClass}" data-status="${statusId}">
                <div class="kanban-column-header">
                    <span class="kanban-column-title">${label}</span>
                    <span class="kanban-column-count">${tasks.length}</span>
                    <button class="btn btn-ghost btn-sm btn-icon kanban-add-btn" data-status="${statusId}" title="Agregar tarea">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <div class="kanban-column-body" data-status="${statusId}">
                    ${cards || '<div style="padding:16px;color:var(--text-muted);font-size:12px;text-align:center;">Sin tareas</div>'}
                </div>
            </div>
        `;
    },

    _renderKanbanCard(task) {
        const pri = task.priority || 'medium';
        const priColor = this._PRI_COLORS[pri] || this._PRI_COLORS.medium;
        const priLabel = this._PRI_LABELS[pri] || pri;
        const isDone = task.status === 'done';
        const isOverdue = task.due_date && task.status !== 'done' && task.due_date < _todayStr();
        const dueDateStr = task.due_date ? formatDate(task.due_date, true) : '';

        return `
            <div class="kanban-card ${isDone ? 'done' : ''}" draggable="true" data-task-id="${escapeHtml(task.id)}" data-status="${escapeHtml(task.status || '')}">
                <div style="width:100%;height:4px;background:${priColor};border-radius:6px 6px 0 0;"></div>
                <div class="kanban-card-title" style="${isDone ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="kanban-card-desc">${escapeHtml((task.description || '').substring(0, 100))}</div>` : ''}
                <div class="kanban-card-footer">
                    ${task.project ? `<span class="kanban-card-tag">${escapeHtml(task.project)}</span>` : ''}
                    <span class="kanban-card-tag priority-${pri}" style="color:${priColor};background:${priColor}18;">${priLabel}</span>
                    ${dueDateStr ? `<span class="kanban-card-date" style="${isOverdue ? 'color:#ef4444;' : ''}">${isOverdue ? '⚠ ' : ''}${dueDateStr}</span>` : ''}
                </div>
            </div>
        `;
    },

    _bindKanbanEvents() {
        // Drag events on cards
        $$('.kanban-card[draggable="true"]').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this._draggedTaskId = card.dataset.taskId;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this._draggedTaskId = null;
                // Remove all drag-over highlights
                $$('.kanban-column-body').forEach(body => body.classList.remove('drag-over'));
            });

            // Click to edit
            card.addEventListener('click', (e) => {
                if (e.target.closest('.kanban-card-footer')) return;
                const task = this._tasks.find(t => t.id === card.dataset.taskId);
                if (task) this._showEditTaskForm(task);
            });
        });

        // Drop zones (column bodies)
        $$('.kanban-column-body').forEach(body => {
            body.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                body.classList.add('drag-over');
            });

            body.addEventListener('dragleave', (e) => {
                // Only remove if we truly left the body
                if (!body.contains(e.relatedTarget)) {
                    body.classList.remove('drag-over');
                }
            });

            body.addEventListener('drop', async (e) => {
                e.preventDefault();
                body.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = body.dataset.status;
                if (!taskId || !newStatus) return;

                const task = this._tasks.find(t => t.id === taskId);
                if (!task || task.status === newStatus) return;

                // Optimistic update
                task.status = newStatus;
                const searchVal = (document.getElementById('tasks-search') || {}).value;
                this._renderKanban(searchVal);

                // Persist
                const a = api();
                if (a) {
                    try {
                        await a.update_task(taskId, null, null, newStatus, null, null, null);
                        showToast('Tarea movida a ' + (this._STATUSES.find(s => s.id === newStatus) || {}).label, 'success');
                        // Reload stats
                        const stats = await a.get_tasks_stats();
                        this._stats = stats;
                        this._renderSummary(stats);
                    } catch (err) {
                        showToast('Error al mover tarea', 'error');
                        await this._loadData();
                    }
                }
            });
        });

        // Add task buttons in column headers
        $$('.kanban-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._showAddTaskForm(btn.dataset.status);
            });
        });
    },

    // ══════════════════════════════════════════════════════
    //  LIST VIEW
    // ══════════════════════════════════════════════════════

    _renderList(searchQuery) {
        const container = document.getElementById('tasks-view-container');
        if (!container) return;

        let tasks = this._getFilteredTasks(searchQuery);

        // Sort
        tasks = this._sortTasks(tasks);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="section-empty" style="min-height:200px;">
                    <div class="section-empty-icon">✅</div>
                    <h3>${searchQuery || this._currentStatusFilter || this._currentPriorityFilter ? 'Sin resultados' : 'Sin tareas'}</h3>
                    <p>${searchQuery || this._currentStatusFilter || this._currentPriorityFilter ? 'No se encontraron tareas con los filtros seleccionados.' : 'Agrega tu primera tarea para organizar tu trabajo.'}</p>
                </div>`;
            return;
        }

        // Column headers
        const sortIcon = (field) => {
            if (this._sortField !== field) return '';
            return this._sortAsc
                ? ' <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>'
                : ' <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-5V4H9v8H4z"/></svg>';
        };

        const rows = tasks.map(t => this._renderListRow(t)).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;">
                <div class="task-list">
                    <div class="task-list-header" style="display:grid;grid-template-columns:36px 1fr 120px 90px 120px 90px 60px;gap:8px;padding:8px 12px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border-color);">
                        <span></span>
                        <span class="list-sort-header" data-sort="title" style="cursor:pointer;user-select:none;">Titulo${sortIcon('title')}</span>
                        <span class="list-sort-header" data-sort="status" style="cursor:pointer;user-select:none;">Estado${sortIcon('status')}</span>
                        <span class="list-sort-header" data-sort="priority" style="cursor:pointer;user-select:none;">Prioridad${sortIcon('priority')}</span>
                        <span>Proyecto</span>
                        <span class="list-sort-header" data-sort="due_date" style="cursor:pointer;user-select:none;">Vencimiento${sortIcon('due_date')}</span>
                        <span></span>
                    </div>
                    ${rows}
                </div>
            </div>
        `;
        this._bindListEvents();
    },

    _renderListRow(task) {
        const pri = task.priority || 'medium';
        const priColor = this._PRI_COLORS[pri] || this._PRI_COLORS.medium;
        const priLabel = this._PRI_LABELS[pri] || pri;
        const isDone = task.status === 'done';
        const isOverdue = task.due_date && !isDone && task.due_date < _todayStr();
        const statusLabel = (this._STATUSES.find(s => s.id === task.status) || {}).label || task.status || '—';
        const dueDateStr = task.due_date ? formatDate(task.due_date, true) : '';

        return `
            <div class="task-item ${isDone ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-task-id="${escapeHtml(task.id)}"
                 style="display:grid;grid-template-columns:36px 1fr 120px 90px 120px 90px 60px;gap:8px;padding:10px 12px;align-items:center;cursor:pointer;">
                <div class="task-checkbox ${isDone ? 'checked' : ''}" data-id="${escapeHtml(task.id)}"></div>
                <div class="task-content" style="min-width:0;">
                    <div class="task-title-row">
                        <span class="task-title ${isDone ? 'done' : ''}">${escapeHtml(task.title)}</span>
                    </div>
                </div>
                <span class="task-state-badge" style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--bg-secondary);white-space:nowrap;">${statusLabel}</span>
                <span class="task-priority-badge" style="background:${priColor}20;color:${priColor};border:1px solid ${priColor}40;font-size:11px;white-space:nowrap;">
                    ${priLabel}
                </span>
                <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task.project ? escapeHtml(task.project) : '—'}</span>
                <span style="font-size:12px;white-space:nowrap;${isOverdue ? 'color:#ef4444;font-weight:600;' : 'color:var(--text-muted);'}">
                    ${isOverdue ? '⚠ ' : ''}${dueDateStr || '—'}
                </span>
                <div class="task-actions" style="display:flex;gap:2px;">
                    <button class="btn btn-ghost btn-sm btn-icon task-delete-btn" data-id="${escapeHtml(task.id)}" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    },

    _sortTasks(tasks) {
        const field = this._sortField;
        const asc = this._sortAsc ? 1 : -1;

        return tasks.sort((a, b) => {
            let va, vb;
            switch (field) {
                case 'title':
                    va = (a.title || '').toLowerCase();
                    vb = (b.title || '').toLowerCase();
                    return va.localeCompare(vb) * asc;
                case 'status': {
                    const order = this._STATUSES.map(s => s.id);
                    va = order.indexOf(a.status);
                    vb = order.indexOf(b.status);
                    return (va - vb) * asc;
                }
                case 'priority': {
                    va = this._PRI_ORDER.indexOf(a.priority || 'medium');
                    vb = this._PRI_ORDER.indexOf(b.priority || 'medium');
                    return (va - vb) * asc;
                }
                case 'due_date': {
                    va = a.due_date || '9999-12-31';
                    vb = b.due_date || '9999-12-31';
                    return va.localeCompare(vb) * asc;
                }
                default:
                    return 0;
            }
        });
    },

    _bindListEvents() {
        // Checkbox toggle
        $$('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = cb.dataset.id;
                const task = this._tasks.find(t => t.id === id);
                if (!task) return;
                const newStatus = task.status === 'done' ? 'todo' : 'done';
                const a = api();
                if (a) {
                    try { await a.update_task(id, null, null, newStatus, null, null, null); } catch (err) {}
                }
                task.status = newStatus;
                showToast(newStatus === 'done' ? 'Tarea completada!' : 'Tarea reabierta', 'success');
                await this._loadData();
                this._renderCurrentView((document.getElementById('tasks-search') || {}).value);
            });
        });

        // Click row to edit
        $$('.task-item').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.task-checkbox') || e.target.closest('.task-delete-btn') || e.target.closest('.task-actions')) return;
                const task = this._tasks.find(t => t.id === row.dataset.taskId);
                if (task) this._showEditTaskForm(task);
            });
        });

        // Delete buttons
        $$('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this._deleteTask(id);
            });
        });

        // Sort headers
        $$('.list-sort-header').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                if (this._sortField === field) {
                    this._sortAsc = !this._sortAsc;
                } else {
                    this._sortField = field;
                    this._sortAsc = true;
                }
                this._renderList((document.getElementById('tasks-search') || {}).value);
            });
        });
    },

    // ══════════════════════════════════════════════════════
    //  SHARED: Add / Edit / Delete
    // ══════════════════════════════════════════════════════

    /**
     * Custom form modal that supports pre-filled default values.
     * Returns a promise that resolves with {id: value} or null on cancel.
     */
    _showTaskFormModal(title, fields, defaults = {}, submitLabel = 'Crear') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = 'z-index:10000;';

            const fieldHtml = fields.map(f => {
                const val = defaults[f.id] !== undefined ? defaults[f.id] : '';
                const req = f.required ? 'required' : '';
                if (f.type === 'textarea') {
                    return `<div style="margin-bottom:14px;">
                        <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                        <textarea id="taskform-${f.id}" placeholder="${escapeHtml(f.placeholder || '')}" class="selectable" rows="3" ${req}>${escapeHtml(String(val))}</textarea>
                    </div>`;
                }
                if (f.type === 'select') {
                    const opts = (f.options || []).map(o =>
                        `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
                    ).join('');
                    return `<div style="margin-bottom:14px;">
                        <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                        <select id="taskform-${f.id}" style="width:100%;padding:8px 12px;background:#252540;border:1px solid #2a2a45;border-radius:8px;color:#e8e8ed;font-size:14px;">${opts}</select>
                    </div>`;
                }
                // text, date, etc.
                return `<div style="margin-bottom:14px;">
                    <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                    <input type="${f.type || 'text'}" id="taskform-${f.id}" value="${escapeHtml(String(val))}" placeholder="${escapeHtml(f.placeholder || '')}" ${req}>
                </div>`;
            }).join('');

            overlay.innerHTML = `
                <div class="modal-box" style="max-width:500px;">
                    <div class="modal-header"><h3>${escapeHtml(title)}</h3></div>
                    <div class="modal-body" style="padding:20px 24px;">
                        ${fieldHtml}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="taskform-cancel" type="button">Cancelar</button>
                        <button class="btn btn-primary" id="taskform-submit" type="button">${escapeHtml(submitLabel)}</button>
                    </div>
                </div>`;

            document.body.appendChild(overlay);
            let closed = false;

            const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); cleanup(null); } };
            document.addEventListener('keydown', escHandler);

            const cleanup = (result) => {
                if (closed) return;
                closed = true;
                document.removeEventListener('keydown', escHandler);
                try { document.body.removeChild(overlay); } catch (e) {}
                resolve(result);
            };

            const modalBox = overlay.querySelector('.modal-box');
            if (modalBox) modalBox.addEventListener('click', (e) => e.stopPropagation());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });

            const cancelBtn = overlay.querySelector('#taskform-cancel');
            if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cleanup(null); });

            const submitBtn = overlay.querySelector('#taskform-submit');
            if (submitBtn) {
                submitBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const values = {};
                    let valid = true;
                    fields.forEach(f => {
                        const el = overlay.querySelector(`#taskform-${f.id}`);
                        values[f.id] = el ? el.value : '';
                        if (f.required && !values[f.id].trim()) {
                            valid = false;
                            if (el) el.style.borderColor = '#ef4444';
                        }
                    });
                    if (valid) cleanup(values);
                    else showToast('Completa los campos requeridos', 'warning');
                });
            }

            const firstInput = overlay.querySelector('input[type="text"], textarea');
            if (firstInput) setTimeout(() => { firstInput.focus(); firstInput.select(); }, 150);
        });
    },

    /** Helper: build the standard list of form fields */
    _getTaskFields() {
        const statusOptions = this._STATUSES.map(s => ({ value: s.id, label: s.label }));
        const priorityOptions = this._PRI_ORDER.map(p => ({ value: p, label: this._PRI_LABELS[p] }));
        return [
            { id: 'title',       label: 'Titulo',       type: 'text',     placeholder: 'Nombre de la tarea...', required: true },
            { id: 'description', label: 'Descripcion',  type: 'textarea', placeholder: 'Descripcion opcional...' },
            { id: 'status',      label: 'Estado',       type: 'select',   options: statusOptions },
            { id: 'priority',    label: 'Prioridad',    type: 'select',   options: priorityOptions },
            { id: 'project',     label: 'Proyecto',     type: 'text',     placeholder: 'Nombre del proyecto...' },
            { id: 'due_date',    label: 'Fecha limite', type: 'date' },
        ];
    },

    async _showAddTaskForm(defaultStatus) {
        const fields = this._getTaskFields();
        const defaults = { status: defaultStatus || 'todo', priority: 'medium' };

        const formValues = await this._showTaskFormModal('Nueva tarea', fields, defaults, 'Crear');
        if (!formValues || !formValues.title) return;

        const a = api();
        if (a) {
            try {
                await a.create_task(
                    formValues.title,
                    formValues.description || '',
                    formValues.status || defaults.status,
                    formValues.priority || defaults.priority,
                    formValues.project || '',
                    formValues.due_date || ''
                );
                showToast('Tarea creada', 'success');
                await this._loadData();
                this._renderCurrentView();
            } catch (err) {
                showToast('Error: ' + (err.message || err), 'error');
            }
        }
    },

    async _showEditTaskForm(task) {
        const fields = this._getTaskFields();

        // due_date is stored as YYYY-MM-DD string, pass directly to date input
        const dueDateValue = task.due_date || '';

        const defaults = {
            title:       task.title || '',
            description: task.description || '',
            status:      task.status || 'todo',
            priority:    task.priority || 'medium',
            project:     task.project || '',
            due_date:    dueDateValue,
        };

        const formValues = await this._showTaskFormModal('Editar tarea', fields, defaults, 'Guardar');
        if (!formValues || !formValues.title) return;

        const a = api();
        if (a) {
            try {
                await a.update_task(
                    task.id,
                    formValues.title,
                    formValues.description || '',
                    formValues.status || task.status,
                    formValues.priority || task.priority,
                    formValues.project || '',
                    formValues.due_date || ''
                );
                showToast('Tarea actualizada', 'success');
                await this._loadData();
                this._renderCurrentView();
            } catch (err) {
                showToast('Error: ' + (err.message || err), 'error');
            }
        }
    },

    async _deleteTask(id) {
        const task = this._tasks.find(t => t.id === id);
        if (!task) return;

        const confirmed = await showModal(
            'Eliminar tarea',
            '¿Eliminar "' + task.title + '"? Esta accion no se puede deshacer.',
            'Eliminar',
            'btn-danger'
        );
        if (!confirmed) return;

        const a = api();
        if (a) {
            try { await a.delete_task(id); } catch (err) {}
        }
        this._tasks = this._tasks.filter(t => t.id !== id);
        showToast('Tarea eliminada', 'success');
        await this._loadData();
        this._renderCurrentView((document.getElementById('tasks-search') || {}).value);
    },
});
