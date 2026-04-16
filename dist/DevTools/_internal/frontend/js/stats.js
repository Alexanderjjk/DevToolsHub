/**
 * ============================================================
 * GAME DEV HUB — stats.js v0.9
 * Seccion Estadisticas: Dashboard completo de toda la app
 * v0.9: Cada funcion con try/catch independiente, logging robusto,
 *     fallback por seccion, navigateTo nota funcional
 * ============================================================
 */

registerSection('stats', {
    _appUsageStats: null,
    _launchers: null,
    _activeRefresh: null,
    _liveTimerRefresh: null,
    _calendarData: null,
    _fgWindowRefresh: null,
    _apiRef: null,

    render() {
        return `
            <div class="section">
                <div class="section-header">
                    <h2>Estadisticas</h2>
                </div>
                <div class="section-body">
                    <!-- Resumen General -->
                    <div class="stats-section-title">Resumen general</div>
                    <div class="stats-grid" id="stats-grid">
                        <div class="stat-card stat-card-tools">
                            <div class="stat-icon">&#128295;</div>
                            <div class="stat-info"><div class="stat-value" id="stat-launchers">-</div><div class="stat-name">Herramientas</div></div>
                        </div>
                        <div class="stat-card stat-card-notes">
                            <div class="stat-icon">&#128221;</div>
                            <div class="stat-info"><div class="stat-value" id="stat-notes">-</div><div class="stat-name">Notas</div></div>
                        </div>
                        <div class="stat-card stat-card-tasks">
                            <div class="stat-icon">&#9989;</div>
                            <div class="stat-info"><div class="stat-value" id="stat-tasks">-</div><div class="stat-name">Tareas activas</div></div>
                        </div>
                        <div class="stat-card stat-card-docs">
                            <div class="stat-icon">&#128214;</div>
                            <div class="stat-info"><div class="stat-value" id="stat-docs">-</div><div class="stat-name">Docs guardados</div></div>
                        </div>
                        <div class="stat-card stat-card-active">
                            <div class="stat-icon">&#128187;</div>
                            <div class="stat-info"><div class="stat-value" id="stat-active-apps">0</div><div class="stat-name">Apps activas</div></div>
                        </div>
                    </div>

                    <!-- ═══ Focus & Racha ═══ -->
                    <div class="stats-section-title" style="margin-top:28px;">Focus & Racha</div>
                    <div class="stats-grid" id="focus-streak-grid">
                        <div class="stat-card" style="border-left:3px solid #7254cc;text-align:center;">
                            <div class="stat-value" id="ps-today-sessions">0</div>
                            <div class="stat-name">Sesiones hoy</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #22c55e;text-align:center;">
                            <div class="stat-value" id="ps-today-focus">0m</div>
                            <div class="stat-name">Focus hoy</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #eab308;text-align:center;">
                            <div class="stat-value" id="ps-streak" style="font-size:28px;color:#eab308;">0</div>
                            <div class="stat-name">Racha de dias</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #3498db;text-align:center;">
                            <div class="stat-value" id="ps-week-sessions">0</div>
                            <div class="stat-name">Sesiones esta semana</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #9b59b6;text-align:center;">
                            <div class="stat-value" id="ps-week-focus">0m</div>
                            <div class="stat-name">Focus esta semana</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #e67e22;text-align:center;">
                            <div class="stat-value" id="ps-total-hours">0h</div>
                            <div class="stat-name">Focus total</div>
                        </div>
                    </div>

                    <!-- ═══ Calendario de Actividad (GitHub-style) ═══ -->
                    <div class="stats-section-title" style="margin-top:28px;">Calendario de actividad</div>
                    <div id="activity-calendar-container" style="padding:20px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);overflow-x:auto;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Actividad diaria</span>
                                <span id="calendar-total-days" style="font-size:11px;color:var(--text-muted);opacity:0.7;"></span>
                            </div>
                            <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);">
                                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#161b22;border:1px solid #30363d;margin-right:4px;vertical-align:middle;"></span>Sin actividad</span>
                                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#0e4429;margin-right:4px;vertical-align:middle;"></span>Bajo</span>
                                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#006d32;margin-right:4px;vertical-align:middle;"></span>Medio</span>
                                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#26a641;margin-right:4px;vertical-align:middle;"></span>Alto</span>
                                <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#39d353;margin-right:4px;vertical-align:middle;"></span>Muy alto</span>
                            </div>
                        </div>
                        <div id="activity-calendar-grid" style="display:flex;gap:3px;"></div>
                        <div id="calendar-tooltip" style="display:none;position:fixed;z-index:9999;padding:8px 12px;background:#1c1c2e;border:1px solid #30363d;border-radius:6px;font-size:12px;color:#e8e8ed;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;"></div>
                    </div>

                    <!-- ═══ Tiempo de uso de aplicaciones ═══ -->
                    <div class="stats-section-title" style="margin-top:28px;">Tiempo de uso de aplicaciones</div>

                    <!-- Resumen rapido: hoy / esta semana / total -->
                    <div class="stats-grid" id="app-usage-summary">
                        <div class="stat-card" style="border-left:3px solid #7254cc;">
                            <div class="stat-value" id="au-today">0m</div>
                            <div class="stat-name">Uso hoy</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #3498db;">
                            <div class="stat-value" id="au-week">0h</div>
                            <div class="stat-name">Esta semana</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #e67e22;">
                            <div class="stat-value" id="au-total">0h</div>
                            <div class="stat-name">Tiempo total</div>
                        </div>
                        <div class="stat-card" style="border-left:3px solid #22c55e;">
                            <div class="stat-value" id="au-launches">0</div>
                            <div class="stat-name">Lanzamientos</div>
                        </div>
                    </div>

                    <!-- Chart semanal (barras CSS) -->
                    <div id="au-weekly-chart-container" style="margin-top:16px;padding:20px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                            <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Actividad semanal</span>
                            <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted);">
                                <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#7254cc;margin-right:4px;"></span>Apps</span>
                                <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#22c55e;margin-right:4px;"></span>Focus</span>
                            </div>
                        </div>
                        <div id="au-weekly-chart" style="display:flex;align-items:flex-end;gap:8px;height:120px;"></div>
                    </div>

                    <!-- App activa ahora (foreground window) -->
                    <div id="fg-window-container" style="margin-top:16px;padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                            <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite;"></span>
                            <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">App activa ahora</span>
                            <span style="font-size:10px;color:var(--text-muted);opacity:0.6;">(en vivo)</span>
                        </div>
                        <div id="fg-window-info">
                            <p style="font-size:13px;color:var(--text-muted);">Detectando...</p>
                        </div>
                    </div>

                    <!-- Apps corriendo ahora (LIVE - 1s refresh) -->
                    <div id="au-active-container" style="margin-top:16px;display:none;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                            <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite;"></span>
                            <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Apps ejecutandose ahora</span>
                            <span style="font-size:10px;color:var(--text-muted);opacity:0.6;">(actualizacion en vivo)</span>
                        </div>
                        <div id="au-active-list"></div>
                    </div>

                    <!-- Ranking de apps por tiempo de uso -->
                    <div id="au-ranking-container" style="margin-top:16px;padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                            <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Ranking por tiempo de uso</span>
                            <div style="display:flex;gap:6px;">
                                <button class="au-period-btn active" data-period="all-time" style="padding:3px 10px;font-size:11px;border:1px solid var(--border-light);border-radius:6px;background:var(--accent);color:#fff;cursor:pointer;">Total</button>
                                <button class="au-period-btn" data-period="week" style="padding:3px 10px;font-size:11px;border:1px solid var(--border-light);border-radius:6px;background:transparent;color:var(--text-muted);cursor:pointer;">Semana</button>
                                <button class="au-period-btn" data-period="today" style="padding:3px 10px;font-size:11px;border:1px solid var(--border-light);border-radius:6px;background:transparent;color:var(--text-muted);cursor:pointer;">Hoy</button>
                            </div>
                        </div>
                        <div id="au-ranking-list">
                            <p style="font-size:13px;color:var(--text-muted);">Sin datos de uso aun. Lanza apps desde el Launcher para ver estadisticas.</p>
                        </div>
                    </div>

                    <!-- Historial reciente de uso -->
                    <div style="margin-top:16px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <span style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Historial reciente</span>
                            <button id="au-clear-history" class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--text-muted);display:none;">Limpiar</button>
                        </div>
                        <div id="au-history-list" style="max-height:300px;overflow-y:auto;padding:12px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);">
                            <p style="font-size:13px;color:var(--text-muted);">Sin historial.</p>
                        </div>
                    </div>

                    <!-- Productividad -->
                    <div class="stats-section-title" style="margin-top:28px;">Productividad</div>
                    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="stat-card" style="text-align:center;padding:20px;">
                            <div class="stat-value" id="prod-score" style="font-size:28px;color:#7254cc;">0%</div>
                            <div class="stat-name">Score general</div>
                        </div>
                        <div class="stat-card" style="text-align:center;padding:20px;">
                            <div class="stat-value" id="prod-tasks-done" style="font-size:28px;color:#22c55e;">0</div>
                            <div class="stat-name">Tareas completadas</div>
                        </div>
                        <div class="stat-card" style="text-align:center;padding:20px;">
                            <div class="stat-value" id="prod-efficiency" style="font-size:28px;color:#e67e22;">0%</div>
                            <div class="stat-name">Eficiencia tareas</div>
                        </div>
                    </div>

                    <!-- Notas recientes -->
                    <div class="stats-section-title" style="margin-top:28px;">Notas recientes</div>
                    <div id="recent-notes-list" style="padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);"></div>

                    <!-- Notas: distribucion de colores -->
                    <div class="stats-section-title" style="margin-top:28px;">Notas por color</div>
                    <div id="color-distribution" style="padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);"></div>

                    <!-- Tareas: distribucion por prioridad -->
                    <div class="stats-section-title" style="margin-top:28px;">Tareas por prioridad</div>
                    <div id="priority-distribution" style="padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);"></div>

                    <!-- Tareas: estados -->
                    <div class="stats-section-title" style="margin-top:28px;">Tareas por estado</div>
                    <div id="state-distribution" style="padding:16px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:var(--border-radius);"></div>
                </div>
            </div>
        `;
    },

    async load() {
        const a = api();
        if (!a) {
            console.warn('[Stats] API no disponible - usando fallback');
            this._renderFallback();
            return;
        }
        this._apiRef = a;

        console.log('[Stats] Cargando datos de estadisticas...');

        // Cargar cada dato de forma independiente para que un fallo no rompa todo
        let launchers = [];
        let notesStats = { total: 0, favorites: 0, pinned: 0, quick_notes: 0, projects: 0 };
        let tasksStats = { total: 0, backlog: 0, in_progress: 0, done: 0, high_priority: 0, overdue: 0 };
        let sessionsStats = { today: { focus_seconds: 0, sessions: 0 }, week: { focus_seconds: 0, sessions: 0 }, all_time: { focus_seconds: 0, sessions: 0, short_breaks: 0, long_breaks: 0 }, streak: 0 };
        let docsStats = { total: 0, categories: 0 };
        let appUsageStats = { today: { total_seconds: 0, apps: [] }, week: { total_seconds: 0, apps: [] }, all_time: { total_seconds: 0, apps: [] } };
        let appUsageActive = [];
        let appUsageHistory = [];
        let calendarData = [];

        // Cargar datos con manejo de errores independiente
        try { launchers = await a.get_launchers(); } catch (e) { console.error('[Stats] Error cargando launchers:', e); }
        try { notesStats = await a.get_notes_stats(); } catch (e) { console.error('[Stats] Error cargando notesStats:', e); }
        try { tasksStats = await a.get_tasks_stats(); } catch (e) { console.error('[Stats] Error cargando tasksStats:', e); }
        try { sessionsStats = await a.get_sessions_stats(); } catch (e) { console.error('[Stats] Error cargando sessionsStats:', e); }
        try { docsStats = await a.get_docs_stats(); } catch (e) { console.error('[Stats] Error cargando docsStats:', e); }
        try { appUsageStats = await a.get_app_usage_stats(); } catch (e) { console.error('[Stats] Error cargando appUsageStats:', e); }
        try { appUsageActive = await a.get_app_usage_active(); } catch (e) { console.error('[Stats] Error cargando appUsageActive:', e); appUsageActive = []; }
        try { appUsageHistory = await a.get_app_usage_history(30); } catch (e) { console.error('[Stats] Error cargando appUsageHistory:', e); appUsageHistory = []; }
        try { calendarData = await a.get_activity_calendar(90); } catch (e) { console.error('[Stats] Error cargando calendarData:', e); calendarData = []; }

        console.log('[Stats] Datos recibidos. Renderizando...');

        // Verificar que estamos en la seccion correcta (no se navego mientras cargaba)
        if (typeof App !== 'undefined' && App.currentSection !== 'stats') {
            console.log('[Stats] Navegacion cambio mientras se cargaban datos - abortando render');
            return;
        }

        // ═══ Resumen General ═══
        try {
            this._renderGeneralSummary(launchers, notesStats, tasksStats, sessionsStats, docsStats, appUsageActive);
        } catch (e) { console.error('[Stats] Error en resumen general:', e); }

        // ═══ Productividad ═══
        try {
            this._renderProductivity(tasksStats, sessionsStats);
        } catch (e) { console.error('[Stats] Error en productividad:', e); }

        // ═══ Pomodoro / Focus / Streak Stats ═══
        try {
            this._renderPomodoroStats(sessionsStats);
        } catch (e) { console.error('[Stats] Error en pomodoro stats:', e); }

        // ═══ Activity Calendar (GitHub-style) ═══
        try {
            this._calendarData = calendarData;
            this._renderActivityCalendar(calendarData);
        } catch (e) { console.error('[Stats] Error en calendario:', e); }

        // ═══ App Usage Stats ═══
        this._appUsageStats = appUsageStats;
        this._launchers = launchers;

        try { this._renderAppUsageSummary(appUsageStats); } catch (e) { console.error('[Stats] Error en resumen uso:', e); }
        try { this._renderWeeklyChart(calendarData, sessionsStats); } catch (e) { console.error('[Stats] Error en chart semanal:', e); }
        try { this._renderAppUsageActive(appUsageActive); } catch (e) { console.error('[Stats] Error en apps activas:', e); }
        try { this._renderAppUsageRanking(appUsageStats.all_time, launchers); } catch (e) { console.error('[Stats] Error en ranking:', e); }
        try { this._renderAppUsageHistory(appUsageHistory, launchers); } catch (e) { console.error('[Stats] Error en historial:', e); }
        try { this._bindAppUsageEvents(); } catch (e) { console.error('[Stats] Error en eventos:', e); }

        // ═══ Auto-refresh active apps every 2s ═══
        this._startAutoRefresh(a);

        // ═══ Live timer refresh every 1 second ═══
        this._liveTimerRefresh = setInterval(() => {
            try { this._tickLiveTimers(); } catch (e) {}
        }, 1000);

        // ═══ Recent Notes ═══
        try {
            const recentNotes = await a.get_recent_notes().catch(() => []);
            this._renderRecentNotes(recentNotes);
        } catch (e) { console.error('[Stats] Error en notas recientes:', e); }

        // ═══ Foreground Window ═══
        try {
            this._startForegroundWindowPoll(a);
        } catch (e) { console.error('[Stats] Error en foreground window:', e); }

        // ═══ Note Distribution ═══
        try {
            this._renderDistribution('color-distribution',
                { total: notesStats.total || 0, pinned: notesStats.pinned || 0, favorites: notesStats.favorites || 0, quick: notesStats.quick_notes || 0 },
                { total: 'Total', pinned: 'Fijadas', favorites: 'Favoritas', quick: 'Quick Notes' },
                { total: '#7254cc', pinned: '#eab308', favorites: '#ef4444', quick: '#22c55e' }
            );
        } catch (e) { console.error('[Stats] Error en distribucion notas:', e); }

        // ═══ Priority Distribution ═══
        try {
            const priData = (tasksStats.high_priority || tasksStats.total > 0)
                ? { high: tasksStats.high_priority || 0, other: Math.max(0, (tasksStats.total || 0) - (tasksStats.high_priority || 0)) }
                : { high: 0, other: 0 };
            this._renderDistribution('priority-distribution', priData,
                { high: 'Alta', other: 'Otras' },
                { high: '#ef4444', other: '#8888a0' }
            );
        } catch (e) { console.error('[Stats] Error en distribucion prioridad:', e); }

        // ═══ State Distribution ═══
        try {
            this._renderDistribution('state-distribution',
                { backlog: tasksStats.backlog || 0, in_progress: tasksStats.in_progress || 0, done: tasksStats.done || 0, overdue: tasksStats.overdue || 0 },
                { backlog: 'Backlog', in_progress: 'En progreso', done: 'Completadas', overdue: 'Vencidas' },
                { backlog: '#8888a0', in_progress: '#7254cc', done: '#22c55e', overdue: '#ef4444' }
            );
        } catch (e) { console.error('[Stats] Error en distribucion estados:', e); }

        console.log('[Stats] Renderizado completo.');
    },

    unload() {
        if (this._activeRefresh) { clearInterval(this._activeRefresh); this._activeRefresh = null; }
        if (this._liveTimerRefresh) { clearInterval(this._liveTimerRefresh); this._liveTimerRefresh = null; }
        if (this._fgWindowRefresh) { clearInterval(this._fgWindowRefresh); this._fgWindowRefresh = null; }
        this._apiRef = null;
    },

    // ═══════════════════════════════════════════
    //  FORMAT HELPERS
    // ═══════════════════════════════════════════

    _fmtShort(seconds) {
        if (!seconds || seconds <= 0) return '0m';
        if (seconds < 60) return Math.round(seconds) + 's';
        if (seconds < 3600) return Math.round(seconds / 60) + 'm';
        const h = Math.floor(seconds / 3600);
        const m = Math.round((seconds % 3600) / 60);
        return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
    },

    _formatDuration(seconds) {
        return this._fmtShort(seconds);
    },

    _formatDurationLive(seconds) {
        if (!seconds || seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const mm = String(m).padStart(2, '0');
        const ss = String(s).padStart(2, '0');
        if (h > 0) return String(h).padStart(2, '0') + ':' + mm + ':' + ss;
        return mm + ':' + ss;
    },

    _getLauncherIcon(launcherId) {
        if (!this._launchers) return null;
        const l = this._launchers.find(function(x) { return x.id === launcherId; });
        return l ? (l.icon_path || null) : null;
    },

    // ═══════════════════════════════════════════
    //  GENERAL SUMMARY
    // ═══════════════════════════════════════════

    _renderGeneralSummary(launchers, notesStats, tasksStats, sessionsStats, docsStats, appUsageActive) {
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el('stat-launchers', (launchers || []).length);
        el('stat-notes', (notesStats || {}).total || 0);
        var totalTasks = (tasksStats || {}).total || 0;
        var doneTasks = (tasksStats || {}).done || 0;
        el('stat-tasks', totalTasks - doneTasks);
        el('stat-docs', (docsStats || {}).total || 0);
        el('stat-active-apps', (appUsageActive || []).length);
    },

    // ═══════════════════════════════════════════
    //  PRODUCTIVITY
    // ═══════════════════════════════════════════

    _renderProductivity(tasksStats, sessionsStats) {
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        var totalTasks = (tasksStats || {}).total || 0;
        var doneTasks = (tasksStats || {}).done || 0;
        var efficiency = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        var prodScore = Math.min(100, Math.round(efficiency));
        el('prod-score', prodScore + '%');
        el('prod-tasks-done', doneTasks);
        el('prod-efficiency', efficiency + '%');
    },

    // ═══════════════════════════════════════════
    //  POMODORO STATS
    // ═══════════════════════════════════════════

    _renderPomodoroStats(sessionsStats) {
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        var today = (sessionsStats || {}).today || {};
        var week = (sessionsStats || {}).week || {};
        var all = (sessionsStats || {}).all_time || {};
        var streak = (sessionsStats || {}).streak || 0;
        el('ps-today-sessions', today.sessions || 0);
        el('ps-today-focus', this._fmtShort(today.focus_seconds || 0));
        el('ps-streak', streak + (streak === 1 ? ' dia' : ' dias'));
        el('ps-week-sessions', week.sessions || 0);
        el('ps-week-focus', this._fmtShort(week.focus_seconds || 0));
        el('ps-total-hours', Math.round((all.focus_seconds || 0) / 3600) + 'h');
    },

    // ═══════════════════════════════════════════
    //  GITHUB-STYLE ACTIVITY CALENDAR
    // ═══════════════════════════════════════════

    _renderActivityCalendar(data) {
        var grid = document.getElementById('activity-calendar-grid');
        var totalDaysEl = document.getElementById('calendar-total-days');
        if (!grid) return;
        if (!data || data.length === 0) {
            grid.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Sin datos de actividad.</p>';
            return;
        }

        var activeDays = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i].has_activity) activeDays++;
        }
        if (totalDaysEl) totalDaysEl.textContent = activeDays + ' dias activos en los ultimos ' + data.length + ' dias';

        // Find max total_seconds to determine color levels
        var maxSeconds = 1;
        for (var i = 0; i < data.length; i++) {
            if (data[i].total_seconds > maxSeconds) maxSeconds = data[i].total_seconds;
        }

        // Color levels (GitHub-style green)
        var getColor = function(seconds) {
            if (seconds <= 0) return '#161b22';
            var ratio = seconds / maxSeconds;
            if (ratio <= 0.1) return '#0e4429';
            if (ratio <= 0.3) return '#006d32';
            if (ratio <= 0.6) return '#26a641';
            return '#39d353';
        };

        // Organize into weeks (columns). Each column = 7 days (Mon-Sun).
        var startDate = new Date(data[0].date + 'T00:00:00');
        var startDow = startDate.getDay(); // 0=Sun
        var startOffset = (startDow + 6) % 7; // Monday=0

        // Build columns (weeks)
        var weeks = [];
        var currentWeek = [];
        for (var i = 0; i < startOffset; i++) currentWeek.push(null);

        for (var i = 0; i < data.length; i++) {
            currentWeek.push(data[i]);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);

        // Month labels
        var monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        var lastMonth = -1;

        // Day labels (row headers)
        var dayLabels = ['', 'Lun', '', 'Mie', '', 'Vie', ''];

        // Render
        var html = '<div style="display:flex;flex-direction:column;gap:2px;">';

        // Day labels column
        html += '<div style="display:flex;flex-direction:column;gap:2px;margin-right:4px;">';
        for (var d = 0; d < dayLabels.length; d++) {
            html += '<div style="width:24px;height:11px;font-size:9px;color:var(--text-muted);line-height:11px;text-align:right;padding-right:4px;">' + dayLabels[d] + '</div>';
        }
        html += '</div>';

        // Month labels row
        html += '<div style="display:flex;gap:3px;margin-bottom:2px;margin-left:' + (startOffset * 14) + 'px;">';
        for (var w = 0; w < weeks.length; w++) {
            var firstDay = null;
            for (var d = 0; d < weeks[w].length; d++) {
                if (weeks[w][d] !== null) { firstDay = weeks[w][d]; break; }
            }
            if (firstDay) {
                var monthIdx = new Date(firstDay.date + 'T00:00:00').getMonth();
                if (monthIdx !== lastMonth) {
                    lastMonth = monthIdx;
                    html += '<div style="font-size:9px;color:var(--text-muted);min-width:28px;">' + monthNames[monthIdx] + '</div>';
                } else {
                    html += '<div style="min-width:28px;"></div>';
                }
            }
        }
        html += '</div>';

        // Calendar grid
        html += '<div style="display:flex;gap:3px;">';
        for (var w = 0; w < weeks.length; w++) {
            html += '<div style="display:flex;flex-direction:column;gap:2px;">';
            for (var d = 0; d < 7; d++) {
                var day = weeks[w][d];
                if (day === null) {
                    html += '<div style="width:11px;height:11px;border-radius:2px;"></div>';
                } else {
                    var color = getColor(day.total_seconds || 0);
                    var focusMin = Math.round((day.focus_seconds || 0) / 60);
                    var appMin = Math.round((day.app_usage_seconds || 0) / 60);
                    var sessions = day.sessions || 0;
                    var dateObj = new Date(day.date + 'T00:00:00');
                    var dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    var tooltipParts = [];
                    if (sessions > 0) tooltipParts.push(sessions + ' sesion' + (sessions > 1 ? 'es' : '') + ' de focus');
                    if (focusMin > 0) tooltipParts.push(focusMin + 'm focus');
                    if (appMin > 0) tooltipParts.push(appMin + 'm en apps');
                    if (day.notes_created > 0) tooltipParts.push(day.notes_created + ' nota' + (day.notes_created > 1 ? 's' : '') + ' creada' + (day.notes_created > 1 ? 's' : ''));
                    if (day.tasks_completed > 0) tooltipParts.push(day.tasks_completed + ' tarea' + (day.tasks_completed > 1 ? 's' : '') + ' completada' + (day.tasks_completed > 1 ? 's' : ''));
                    var tooltipText = tooltipParts.length > 0
                        ? '<strong>' + dateStr + '</strong><br>' + tooltipParts.join(' · ')
                        : '<strong>' + dateStr + '</strong><br>Sin actividad';

                    var _todayStr2 = (function() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
                    var isToday = day.date === _todayStr2;
                    var border = isToday ? 'border:1px solid rgba(255,255,255,0.5);' : '';
                    var escapedTooltip = tooltipText.replace(/<[^>]*>/g, '|');
                    html += '<div class="calendar-cell" data-tooltip="' + escapeHtml(escapedTooltip) + '" data-date="' + day.date + '" style="width:11px;height:11px;border-radius:2px;background:' + color + ';' + border + 'cursor:default;"></div>';
                }
            }
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        grid.innerHTML = html;

        // Tooltip hover
        var tooltip = document.getElementById('calendar-tooltip');
        if (tooltip) {
            grid.addEventListener('mouseover', function(e) {
                var cell = e.target.closest('.calendar-cell');
                if (!cell) return;
                var raw = cell.dataset.tooltip;
                if (!raw) return;
                var parts = raw.split('|');
                var html2 = '';
                for (var i = 0; i < parts.length; i++) {
                    if (i === 0) html2 += '<strong>' + escapeHtml(parts[i]) + '</strong>';
                    else html2 += '<span>' + escapeHtml(parts[i]) + '</span>';
                    if (i < parts.length - 1) html2 += '<br>';
                }
                tooltip.innerHTML = html2;
                tooltip.style.display = 'block';
            });
            grid.addEventListener('mousemove', function(e) {
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY - 40) + 'px';
            });
            grid.addEventListener('mouseout', function(e) {
                if (!e.target.closest('.calendar-cell')) tooltip.style.display = 'none';
            });
        }
    },

    // ═══════════════════════════════════════════
    //  LIVE TIMER: tick every second
    // ═══════════════════════════════════════════

    _tickLiveTimers() {
        var self = this;
        document.querySelectorAll('[data-active-timer]').forEach(function(el) {
            var startTime = el.dataset.activeTimer;
            if (!startTime) return;
            try {
                // El backend guarda hora LOCAL con sufijo 'Z' (falso UTC).
                // Hay que quitar la 'Z' para que new Date() lo parsee como hora local,
                // de lo contrario Date.now() - start.getTime() daria un offset incorrecto
                // igual al timezone del usuario (ej: 4h en UTC-4).
                var cleanTime = startTime.replace(/Z$/, '');
                var start = new Date(cleanTime);
                var elapsed = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
                el.textContent = self._formatDurationLive(elapsed);
            } catch (e) {}
        });
    },

    // ═══════════════════════════════════════════
    //  APP USAGE: Resumen
    // ═══════════════════════════════════════════

    _renderAppUsageSummary(stats) {
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el('au-today', this._formatDuration(((stats || {}).today || {}).total_seconds || 0));
        el('au-week', this._formatDuration(((stats || {}).week || {}).total_seconds || 0));
        el('au-total', this._formatDuration(((stats || {}).all_time || {}).total_seconds || 0));
        var totalLaunches = ((stats || {}).all_time || {}).apps || [];
        var sum = 0;
        for (var i = 0; i < totalLaunches.length; i++) sum += (totalLaunches[i].launch_count || 0);
        el('au-launches', sum);
    },

    // ═══════════════════════════════════════════
    //  WEEKLY CHART (barras CSS) — uses real calendar data
    // ═══════════════════════════════════════════

    _renderWeeklyChart(calendarData, sessionsStats) {
        var chart = document.getElementById('au-weekly-chart');
        if (!chart) return;
        if (!calendarData || calendarData.length === 0) {
            chart.innerHTML = '<p style="font-size:12px;color:var(--text-muted);margin:auto;">Sin datos</p>';
            return;
        }

        var dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        var todayStr = (function() {
            var d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })();

        // Use last 7 days from calendar data
        var last7 = calendarData.slice(-7);
        var days = [];
        for (var i = 0; i < 7; i++) {
            var d = last7[i];
            if (!d) { days.push({ date: '', dayName: '', apps: 0, focus: 0 }); continue; }
            var dateObj = new Date(d.date + 'T00:00:00');
            days.push({
                date: d.date,
                dayName: dayNames[dateObj.getDay()],
                apps: d.app_usage_seconds || 0,
                focus: d.focus_seconds || 0,
            });
        }

        var maxVal = 1;
        for (var i = 0; i < days.length; i++) {
            if (days[i].apps > maxVal) maxVal = days[i].apps;
            if (days[i].focus > maxVal) maxVal = days[i].focus;
        }

        var chartHtml = '';
        for (var i = 0; i < days.length; i++) {
            var d = days[i];
            var appH = Math.max(2, (d.apps / maxVal) * 100);
            var focusH = Math.max(2, (d.focus / maxVal) * 100);
            var isToday = d.date === todayStr;
            var opacity = isToday ? '1' : '0.7';
            var colorStyle = isToday ? 'var(--accent)' : 'var(--text-muted)';
            var fontWeight = isToday ? '600' : '400';
            chartHtml += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">'
                + '<div style="display:flex;gap:3px;align-items:flex-end;height:90px;width:100%;justify-content:center;">'
                + '<div class="weekly-bar" style="width:40%;height:' + appH + '%;background:linear-gradient(to top, #7254cc, #8b6fdb);border-radius:3px 3px 0 0;transition:height 0.5s;opacity:' + opacity + ';"></div>'
                + '<div class="weekly-bar" style="width:40%;height:' + focusH + '%;background:linear-gradient(to top, #22c55e, #4ade80);border-radius:3px 3px 0 0;transition:height 0.5s;opacity:' + opacity + ';"></div>'
                + '</div>'
                + '<span style="font-size:10px;color:' + colorStyle + ';font-weight:' + fontWeight + ';">' + d.dayName + '</span>'
                + '</div>';
        }
        chart.innerHTML = chartHtml;
    },

    // ═══════════════════════════════════════════
    //  APP USAGE: Apps activas
    // ═══════════════════════════════════════════

    _renderAppUsageActive(active) {
        var container = document.getElementById('au-active-container');
        var list = document.getElementById('au-active-list');
        if (!container || !list) return;
        if (!active || active.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'block';

        var listHtml = '';
        for (var i = 0; i < active.length; i++) {
            var app = active[i];
            var iconData = this._getLauncherIcon(app.launcher_id);
            var iconHtml = iconData
                ? '<img src="data:image/png;base64,' + iconData + '" style="width:20px;height:20px;border-radius:4px;">'
                : '<span style="font-size:18px;">&#128295;</span>';
            listHtml += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;margin-bottom:6px;">'
                + iconHtml
                + '<span style="flex:1;font-size:13px;font-weight:500;">' + escapeHtml(app.launcher_name || 'Desconocida') + '</span>'
                + '<span style="font-size:14px;color:#22c55e;font-weight:700;font-family:var(--font-mono);" data-active-timer="' + (app.start_time || '') + '">'
                + this._formatDurationLive(0)
                + '</span>'
                + '</div>';
        }
        list.innerHTML = listHtml;
        this._tickLiveTimers();
    },

    // ═══════════════════════════════════════════
    //  APP USAGE: Ranking
    // ═══════════════════════════════════════════

    _renderAppUsageRanking(periodData, launchers) {
        var list = document.getElementById('au-ranking-list');
        if (!list) return;
        var apps = (periodData || {}).apps || [];
        if (apps.length === 0) {
            list.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Sin datos de uso aun. Lanza apps desde el Launcher para ver estadisticas.</p>';
            return;
        }
        var maxSeconds = apps[0].total_seconds || 1;
        var colors = ['#7254cc', '#3498db', '#e67e22', '#22c55e', '#e74c3c', '#9b59b6', '#1abc9c', '#f39c12'];
        var medals = ['&#129351;', '&#129352;', '&#129353;'];

        var listHtml = '';
        for (var i = 0; i < apps.length; i++) {
            var app = apps[i];
            var pct = maxSeconds > 0 ? Math.round((app.total_seconds / maxSeconds) * 100) : 0;
            var color = colors[i % colors.length];
            var iconData = this._getLauncherIcon(app.launcher_id);
            var iconHtml = iconData
                ? '<img src="data:image/png;base64,' + iconData + '" style="width:18px;height:18px;border-radius:3px;flex-shrink:0;">'
                : '<span style="font-size:16px;flex-shrink:0;">&#128295;</span>';
            var rankHtml = i < 3
                ? '<span style="font-size:14px;width:20px;text-align:center;">' + medals[i] + '</span>'
                : '<span style="font-size:11px;color:var(--text-muted);width:20px;text-align:center;">#' + (i + 1) + '</span>';
            listHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
                + rankHtml
                + iconHtml
                + '<div style="flex:1;min-width:0;">'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">'
                + '<span style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(app.launcher_name || 'Desconocida') + '</span>'
                + '<span style="font-size:12px;color:var(--text-muted);flex-shrink:0;margin-left:8px;">' + this._formatDuration(app.total_seconds) + ' <span style="opacity:0.6;">(' + (app.launch_count || 0) + 'x)</span></span>'
                + '</div>'
                + '<div style="height:6px;background:var(--bg-accent);border-radius:3px;overflow:hidden;">'
                + '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg, ' + color + ', ' + color + 'cc);border-radius:3px;transition:width 0.5s;"></div>'
                + '</div>'
                + '</div>'
                + '</div>';
        }
        list.innerHTML = listHtml;
    },

    // ═══════════════════════════════════════════
    //  APP USAGE: Historial
    // ═══════════════════════════════════════════

    _renderAppUsageHistory(history, launchers) {
        var list = document.getElementById('au-history-list');
        var clearBtn = document.getElementById('au-clear-history');
        if (!list) return;
        if (!history || history.length === 0) {
            list.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Sin historial.</p>';
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }
        if (clearBtn) clearBtn.style.display = 'inline-block';

        var listHtml = '';
        for (var i = 0; i < history.length; i++) {
            var entry = history[i];
            var iconData = this._getLauncherIcon(entry.launcher_id);
            var iconHtml = iconData
                ? '<img src="data:image/png;base64,' + iconData + '" style="width:16px;height:16px;border-radius:3px;flex-shrink:0;">'
                : '<span style="font-size:14px;flex-shrink:0;">&#128295;</span>';
            var endTime = entry.end_time ? new Date(entry.end_time + 'Z') : null;
            var timeStr = endTime ? endTime.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}) : '';
            var dateStr = entry.date || '';
            listHtml += '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:6px;margin-bottom:2px;" onmouseenter="this.style.background=\'var(--bg-accent)\'" onmouseleave="this.style.background=\'transparent\'">'
                + iconHtml
                + '<span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(entry.launcher_name || 'Desconocida') + '</span>'
                + '<span style="font-size:11px;color:var(--text-muted);flex-shrink:0;font-family:var(--font-mono);">' + this._formatDurationLive(entry.duration_seconds || 0) + '</span>'
                + '<span style="font-size:10px;color:var(--text-muted);flex-shrink:0;opacity:0.7;">' + dateStr + ' ' + timeStr + '</span>'
                + '</div>';
        }
        list.innerHTML = listHtml;
    },

    // ═══════════════════════════════════════════
    //  APP USAGE: Bind events
    // ═══════════════════════════════════════════

    _bindAppUsageEvents() {
        var self = this;
        document.querySelectorAll('.au-period-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.au-period-btn').forEach(function(b) {
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-muted)';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--accent)';
                btn.style.color = '#fff';
                btn.classList.add('active');
                var period = btn.dataset.period;
                var statsKey = period === 'all-time' ? 'all_time' : period;
                var periodData = (self._appUsageStats || {})[statsKey] || {total_seconds: 0, apps: []};
                self._renderAppUsageRanking(periodData, self._launchers);
            });
        });

        var clearBtn = document.getElementById('au-clear-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', async function() {
                var confirmed = await showModal(
                    'Limpiar historial de uso',
                    'Se eliminaran todos los registros de tiempo de uso de aplicaciones. Esta accion no se puede deshacer.',
                    'Limpiar todo',
                    'btn-danger'
                );
                if (confirmed) {
                    var a = api();
                    if (a) {
                        try {
                            await a.clear_app_usage_history();
                            showToast('Historial de uso eliminado', 'success');
                            var stats = await a.get_app_usage_stats().catch(function() { return {}; });
                            self._appUsageStats = stats;
                            self._renderAppUsageSummary(stats);
                            self._renderAppUsageRanking((stats.all_time || {}), self._launchers);
                            document.getElementById('au-history-list').innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Sin historial.</p>';
                            clearBtn.style.display = 'none';
                        } catch (err) {
                            showToast('Error al limpiar: ' + (err.message || err), 'error');
                        }
                    }
                }
            });
        }
    },

    // ═══════════════════════════════════════════
    //  AUTO REFRESH (cada 2s)
    // ═══════════════════════════════════════════

    _startAutoRefresh(a) {
        var self = this;
        this._activeRefresh = setInterval(async function() {
            try {
                if (typeof App !== 'undefined' && App.currentSection !== 'stats') return;

                var results = await Promise.all([
                    a.get_app_usage_active().catch(function() { return []; }),
                    a.get_app_usage_stats().catch(function() { return null; }),
                ]);
                var active = results[0];
                var stats = results[1];

                self._renderAppUsageActive(active);
                if (stats) {
                    self._appUsageStats = stats;
                    self._renderAppUsageSummary(stats);
                    var activeBtn = document.querySelector('.au-period-btn.active');
                    if (activeBtn) {
                        var period = activeBtn.dataset.period;
                        var statsKey = period === 'all-time' ? 'all_time' : period;
                        self._renderAppUsageRanking(stats[statsKey] || {total_seconds: 0, apps: []}, self._launchers);
                    }
                }
            } catch(e) {}
        }, 2000);
    },

    // ═══════════════════════════════════════════
    //  DISTRIBUTION BARS
    // ═══════════════════════════════════════════

    _renderDistribution(containerId, data, names, colors) {
        var el = document.getElementById(containerId);
        if (!el) return;
        if (!data) { el.innerHTML = '<p class="text-muted" style="font-size:13px;">Sin datos.</p>'; return; }

        var total = 0;
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) total += (data[keys[i]] || 0);
        if (total === 0) { el.innerHTML = '<p class="text-muted" style="font-size:13px;">Sin datos.</p>'; return; }

        var html = '';
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var count = data[key] || 0;
            var pct = Math.round((count / total) * 100);
            var name = (names && names[key]) || key;
            var color = (colors && colors[key]) || 'var(--accent)';
            html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
                + '<span style="width:12px;height:12px;border-radius:50%;background:' + color + ';flex-shrink:0;border:1px solid rgba(255,255,255,0.1);"></span>'
                + '<span style="width:100px;font-size:12px;color:var(--text-muted);">' + name + '</span>'
                + '<div style="flex:1;height:8px;background:var(--bg-accent);border-radius:4px;overflow:hidden;">'
                + '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg, ' + color + ', ' + color + 'cc);border-radius:4px;transition:width 0.5s;"></div>'
                + '</div>'
                + '<span style="font-size:12px;color:var(--text-muted);min-width:48px;text-align:right;">' + count + ' (' + pct + '%)</span>'
                + '</div>';
        }
        el.innerHTML = html;
    },

    // ═══════════════════════════════════════════
    //  FOREGROUND WINDOW POLLING
    // ═══════════════════════════════════════════

    _startForegroundWindowPoll(apiRef) {
        var self = this;
        var poll = async function() {
            try {
                if (typeof App !== 'undefined' && App.currentSection !== 'stats') return;
                var info = await apiRef.get_foreground_window_info().catch(function() { return null; });
                var container = document.getElementById('fg-window-info');
                if (!container) return;
                if (!info || info.error) {
                    container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">No disponible en esta plataforma</p>';
                    return;
                }
                var appName = info.app_name || 'N/A';
                var winTitle = info.window_title || '';
                var titlePreview = winTitle.length > 80 ? winTitle.substring(0, 80) + '...' : winTitle;
                container.innerHTML = '<div style="display:flex;align-items:center;gap:12px;">'
                    + '<span style="font-size:22px;">&#128187;</span>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">' + escapeHtml(appName) + '</div>'
                    + (titlePreview ? '<div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px;">' + escapeHtml(titlePreview) + '</div>' : '')
                    + '</div>'
                    + '</div>';
            } catch(e) {}
        };
        poll();
        this._fgWindowRefresh = setInterval(poll, 3000);
    },

    // ═══════════════════════════════════════════
    //  RECENT NOTES
    // ═══════════════════════════════════════════

    _renderRecentNotes(notes) {
        var container = document.getElementById('recent-notes-list');
        if (!container) return;
        if (!notes || notes.length === 0) {
            container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Sin notas recientes.</p>';
            return;
        }
        var colorMap = {
            'default': '#1e1e2e', 'red': '#f38ba8', 'orange': '#fab387',
            'yellow': '#f9e2af', 'green': '#a6e3a1', 'blue': '#89b4fa',
            'purple': '#cba6f7', 'pink': '#f5c2e7', 'teal': '#94e2d5', 'mauve': '#cba6f7'
        };

        var html = '';
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            var borderColor = colorMap[note.color_id] || '#7254cc';
            var favIcon = note.is_favorite ? ' <span style="color:#ef4444;font-size:11px;">&#9733;</span>' : '';
            var pinIcon = note.pinned ? ' <span style="color:#eab308;font-size:11px;">&#128204;</span>' : '';
            var noteId = note.id || '';
            var title = note.title || 'Sin titulo';
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:4px;border-left:3px solid ' + borderColor + ';cursor:pointer;" onmouseenter="this.style.background=\'var(--bg-accent)\'" onmouseleave="this.style.background=\'transparent\'" onclick="navigateTo(\'notes\');setTimeout(function(){document.dispatchEvent(new CustomEvent(\'open-note\',{detail:{noteId:\'' + noteId + '\'}}))},150)">'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(title) + favIcon + pinIcon + '</div>'
                + '</div>'
                + '</div>';
        }
        container.innerHTML = html;
    },

    _renderFallback() {
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el('stat-launchers', '0');
        el('stat-notes', '0');
        el('stat-tasks', '0');
        el('stat-focus', '0m');
        el('stat-streak', '0d');
        el('stat-docs', '0');
        el('stat-active-apps', '0');
        el('prod-score', '0%');
        el('prod-tasks-done', '0');
        el('prod-efficiency', '0%');
        el('ps-today-sessions', '0');
        el('ps-today-focus', '0m');
        el('ps-week-sessions', '0');
        el('ps-week-focus', '0m');
        el('ps-total-sessions', '0');
        el('ps-total-hours', '0h');
    }
});
