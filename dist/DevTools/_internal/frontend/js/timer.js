/**
 * ============================================================
 * DEVTOOLS — timer.js v0.9
 * Timer simplificado: circulo SVG con tiempo dentro.
 * Presets editables + cuenta atras personalizadas.
 * Tkinter popup al completar (via backend).
 * ============================================================
 */

registerSection('timer', {
    _interval: null,
    _sessions: [],
    _saveCounter: 0,
    _configOpen: false,

    // Default presets (mutable via config)
    _defaultPresets: [
        { id: 'pomodoro',    label: 'Pomodoro',  minutes: 25, mode: 'pomodoro',    builtin: true },
        { id: 'short_break', label: 'Descanso',   minutes: 5,  mode: 'short_break', builtin: true },
        { id: 'long_break',  label: 'Largo',      minutes: 15, mode: 'long_break',  builtin: true },
        { id: 'free',        label: 'Libre',      minutes: 0,  mode: 'free',        builtin: true },
    ],

    _customPresets: [],
    _presets: [],

    _s: {
        running: false,
        mode: 'pomodoro',
        presetMinutes: 25,
        presetTotalSeconds: 25 * 60,
        seconds: 25 * 60,
        totalElapsedSeconds: 0,
        pomodoroCount: 0,
        autoStartBreaks: true,
        autoStartPomodoros: true,
        soundEnabled: true,
    },

    // Track previous running state for animation triggers
    _wasRunning: false,

    _KEY_STATE: 'devtools-timer-state',
    _KEY_SESSIONS: 'devtools-timer-sessions',
    _KEY_SETTINGS: 'devtools-timer-settings',
    _KEY_CUSTOM: 'devtools-timer-custom-presets',

    // SVG circle params
    _CIRCUMFERENCE: 2 * Math.PI * 120,
    _RADIUS: 120,

    // ═══════════════════════════════════════════
    //  HELPERS: preset seconds / time labels
    // ═══════════════════════════════════════════

    _presetTotalSeconds: function(preset) {
        if (preset.totalSeconds !== undefined) return preset.totalSeconds;
        return (preset.minutes || 0) * 60 + (preset.seconds || 0);
    },

    _presetTimeLabel: function(preset) {
        if (preset.builtin) {
            // Built-in presets only have minutes
            if (preset.minutes > 0) return preset.minutes + 'm';
            return '';
        }
        var total = this._presetTotalSeconds(preset);
        var m = Math.floor(total / 60);
        var s = total % 60;
        if (m > 0 && s > 0) return m + 'm ' + s + 's';
        if (m > 0) return m + 'm';
        return s + 's';
    },

    // ═══════════════════════════════════════════
    //  INIT presets
    // ═══════════════════════════════════════════

    _rebuildPresets: function() {
        this._presets = this._defaultPresets.concat(this._customPresets);
    },

    // ═══════════════════════════════════════════
    //  API PUBLICA
    // ═══════════════════════════════════════════

    getTimeString() {
        if (this._s.mode === 'free' && (this._s.running || this._s.totalElapsedSeconds > 0)) {
            return this._fmtTime(this._s.totalElapsedSeconds, true);
        }
        return this._fmtTime(this._s.seconds, true);
    },

    // ═══════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════

    render() {
        this._rebuildPresets();
        var self = this;

        // --- Preset buttons ---
        var presetsHtml = '';
        for (var i = 0; i < this._presets.length; i++) {
            var p = this._presets[i];
            var activeClass = (this._s.mode === p.mode) ? 'active' : '';
            var timeLabel = this._presetTimeLabel(p);
            presetsHtml += '<button class="timer-preset-btn ' + activeClass + '" data-idx="' + i + '" data-mode="' + p.mode + '">' + escapeHtml(p.label) + (timeLabel ? ' <small>' + timeLabel + '</small>' : '') + '</button>';
        }

        // --- Custom preset chips ---
        var customChipsHtml = '';
        for (var j = 0; j < this._customPresets.length; j++) {
            var cp = this._customPresets[j];
            var cActive = (this._s.mode === cp.mode) ? ' active' : '';
            var cpLabel = self._presetTimeLabel(cp);
            customChipsHtml += '<span class="timer-custom-chip' + cActive + '" data-cidx="' + j + '" data-mode="' + cp.mode + '">' + escapeHtml(cp.label) + ' <small>' + cpLabel + '</small> <span class="chip-delete" data-del="' + j + '" title="Eliminar">&times;</span></span>';
        }

        // --- Timer display ---
        var timeDisplay = this._s.mode === 'free' && this._s.totalElapsedSeconds > 0
            ? this._fmtTime(this._s.totalElapsedSeconds, true)
            : this._fmtTime(this._s.seconds, false);

        var progress = this._getProgress();
        var dashOffset = this._CIRCUMFERENCE * (1 - progress);
        var circleClass = 'timer-circle-progress' + (this._s.running ? ' running' : '');

        return '<div class="section">' +
            '<div class="section-header">' +
                '<h2>Temporizador</h2>' +
                '<button class="btn btn-ghost btn-sm" id="timer-config-toggle" style="font-size:11px;" title="Configurar">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> Config</button>' +
            '</div>' +
            '<div class="section-body">' +
                '<div class="timer-layout-single">' +
                    '<div class="timer-main">' +

                        '<div class="timer-presets" id="timer-presets-container">' +
                            presetsHtml +
                            customChipsHtml +
                        '</div>' +

                        '<div class="timer-circle-wrap">' +
                            '<svg class="timer-circle-svg" viewBox="0 0 280 280">' +
                                '<circle class="timer-circle-bg" cx="140" cy="140" r="' + this._RADIUS + '" />' +
                                '<circle class="' + circleClass + '" id="timer-circle" cx="140" cy="140" r="' + this._RADIUS + '" ' +
                                    'stroke-dasharray="' + this._CIRCUMFERENCE + '" ' +
                                    'stroke-dashoffset="' + dashOffset + '" ' +
                                    'transform="rotate(-90 140 140)" />' +
                            '</svg>' +
                            '<div class="timer-circle-content">' +
                                '<span class="timer-circle-time" id="timer-time-display">' + timeDisplay + '</span>' +
                                '<span class="timer-circle-label" id="timer-mode-label">Pomodoro</span>' +
                                '<span class="timer-circle-count" id="timer-session-count"></span>' +
                            '</div>' +
                        '</div>' +

                        '<div class="timer-cycle-indicator" id="timer-cycle">' +
                            '<span class="cycle-dot"></span><span class="cycle-dot"></span>' +
                            '<span class="cycle-dot"></span><span class="cycle-dot"></span>' +
                        '</div>' +

                        '<div class="timer-controls">' +
                            '<button class="btn btn-primary" id="timer-start-btn">' +
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar' +
                            '</button>' +
                            '<button class="btn btn-secondary" id="timer-reset-btn">' +
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Reset' +
                            '</button>' +
                            '<button class="btn btn-secondary btn-sm" id="timer-skip-btn">Saltar</button>' +
                        '</div>' +

                        '<p class="text-muted text-center mt-4" style="font-size:12px;">' +
                            '<kbd class="cmd-item-kbd" style="font-size:11px;">Ctrl+Shift+C</kbd> iniciar / detener' +
                        '</p>' +

                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },

    _getProgress() {
        if (this._s.mode === 'free') {
            var total = this._s.presetTotalSeconds;
            return total > 0 ? Math.min(1, this._s.totalElapsedSeconds / total) : 0;
        }
        if (this._s.presetTotalSeconds <= 0) return 0;
        return this._s.seconds / this._s.presetTotalSeconds;
    },

    // ═══════════════════════════════════════════
    //  LOAD
    // ═══════════════════════════════════════════

    load() {
        var self = this;
        this._loadSettings();
        this._loadCustomPresets();

        var a = api();
        if (a) {
            a.timer_get_state().then(function(state) {
                if (state) {
                    self._s.running = state.running || false;
                    self._s.mode = state.mode || 'pomodoro';
                    self._s.presetMinutes = state.preset_minutes || 25;
                    self._s.presetTotalSeconds = state.preset_total_seconds || (self._s.presetMinutes * 60);
                    self._s.pomodoroCount = state.pomodoro_count || 0;
                    // FIX: Always use display_seconds (backend computes remaining/elapsed time)
                    // This prevents the timer from resetting when navigating between sections.
                    if (self._s.mode === 'free') {
                        self._s.totalElapsedSeconds = state.display_seconds || state.total_focus_seconds || 0;
                        self._s.seconds = 0;
                    } else {
                        self._s.seconds = state.display_seconds !== undefined
                            ? state.display_seconds
                            : (state.seconds !== undefined ? state.seconds : self._s.presetTotalSeconds);
                    }
                } else {
                    self._loadLocalState();
                }
                self._finishLoad();
            }).catch(function() {
                self._loadLocalState();
                self._finishLoad();
            });
        } else {
            self._loadLocalState();
            self._finishLoad();
        }

        // Preset buttons (built-in + custom)
        document.getElementById('timer-presets-container').addEventListener('click', function(e) {
            var deleteBtn = e.target.closest('.chip-delete');
            if (deleteBtn) {
                e.stopPropagation();
                var delIdx = parseInt(deleteBtn.dataset.del);
                if (!isNaN(delIdx)) self._deleteCustomPreset(delIdx);
                return;
            }

            var chip = e.target.closest('.timer-custom-chip');
            if (chip && chip.dataset.mode) {
                if (self._s.running) { showToast('Deten el timer primero', 'warning'); return; }
                self._changeMode(chip.dataset.mode);
                $$('.timer-preset-btn[data-idx]').forEach(function(b) { b.classList.remove('active'); });
                $$('.timer-custom-chip').forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');
                return;
            }

            var btn = e.target.closest('.timer-preset-btn[data-idx]');
            if (btn) {
                var idx = parseInt(btn.dataset.idx);
                var preset = self._presets[idx];
                if (!preset) return;
                if (self._s.running) { showToast('Deten el timer primero', 'warning'); return; }
                self._changeMode(preset.mode);
                $$('.timer-preset-btn[data-idx]').forEach(function(b) { b.classList.remove('active'); });
                $$('.timer-custom-chip').forEach(function(c) { c.classList.remove('active'); });
                btn.classList.add('active');
            }
        });

        var startBtn = document.getElementById('timer-start-btn');
        if (startBtn) startBtn.addEventListener('click', function() { self._toggle(); });

        var resetBtn = document.getElementById('timer-reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', function() { self._reset(); });

        var skipBtn = document.getElementById('timer-skip-btn');
        if (skipBtn) skipBtn.addEventListener('click', function() { self._skip(); });

        // Config toggle button
        var configToggle = document.getElementById('timer-config-toggle');
        if (configToggle) configToggle.addEventListener('click', function() { self._toggleConfig(); });
    },

    _finishLoad: function() {
        this._updateDisplay();
        if (this._s.running) this._startTick();
    },

    unload() {
        this._stopInterval();
        // Remove floating panel if open
        this._removeConfigPanel();
    },

    // ═══════════════════════════════════════════
    //  CONFIG PANEL (Floating)
    // ═══════════════════════════════════════════

    _removeConfigPanel: function() {
        var overlay = document.getElementById('timer-settings-overlay');
        if (overlay) overlay.remove();
        this._configOpen = false;
        var btn = document.getElementById('timer-config-toggle');
        if (btn) btn.style.color = '';
    },

    _toggleConfig: function() {
        var self = this;
        if (this._configOpen) {
            this._removeConfigPanel();
            return;
        }

        // Build custom presets list HTML
        var customListHtml = '';
        if (this._customPresets.length === 0) {
            customListHtml = '<span style="font-size:11px;color:var(--text-muted);">Sin temporizadores personalizados</span>';
        } else {
            for (var k = 0; k < this._customPresets.length; k++) {
                var cc = this._customPresets[k];
                var tl = self._presetTimeLabel(cc);
                customListHtml += '<span class="timer-custom-chip" style="cursor:default;">' + escapeHtml(cc.label) + ' <small>' + tl + '</small> <span class="chip-delete" data-delidx="' + k + '" title="Eliminar">&times;</span></span>';
            }
        }

        // Create overlay + panel
        var overlay = document.createElement('div');
        overlay.id = 'timer-settings-overlay';
        overlay.className = 'timer-settings-overlay';

        overlay.innerHTML =
            '<div class="timer-settings-panel">' +
                '<div class="timer-settings-header">' +
                    '<h3>Configuracion del Timer</h3>' +
                    '<button class="timer-settings-close" id="timer-settings-close-btn">&times;</button>' +
                '</div>' +
                '<div class="timer-settings-body">' +
                    '<div class="timer-settings-section-title">Duraciones</div>' +
                    '<div class="timer-settings-row">' +
                        '<label>Pomodoro</label>' +
                        '<div class="timer-settings-input-group">' +
                            '<input type="number" class="timer-settings-input" id="tc-pomodoro" min="1" max="180" value="' + this._defaultPresets[0].minutes + '">' +
                            '<span class="timer-settings-unit">min</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="timer-settings-row">' +
                        '<label>Descanso</label>' +
                        '<div class="timer-settings-input-group">' +
                            '<input type="number" class="timer-settings-input" id="tc-short" min="1" max="60" value="' + this._defaultPresets[1].minutes + '">' +
                            '<span class="timer-settings-unit">min</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="timer-settings-row">' +
                        '<label>Descanso largo</label>' +
                        '<div class="timer-settings-input-group">' +
                            '<input type="number" class="timer-settings-input" id="tc-long" min="1" max="120" value="' + this._defaultPresets[2].minutes + '">' +
                            '<span class="timer-settings-unit">min</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="timer-settings-section-title" style="margin-top:8px;">Mis temporizadores</div>' +
                    '<div class="timer-custom-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
                        '<span style="font-size:11px;color:var(--text-muted);"></span>' +
                        '<button class="btn btn-ghost btn-sm" id="timer-add-custom" style="font-size:11px;">+ Agregar</button>' +
                    '</div>' +
                    '<div id="timer-custom-list">' + customListHtml + '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Close on overlay click (outside panel)
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                self._removeConfigPanel();
            }
        });

        // Close button
        var closeBtn = document.getElementById('timer-settings-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', function() { self._removeConfigPanel(); });

        // Bind config inputs
        // Pomodoro minutes
        var pomInput = document.getElementById('tc-pomodoro');
        if (pomInput) pomInput.addEventListener('change', function() {
            var v = parseInt(pomInput.value);
            if (v && v >= 1 && v <= 180) {
                self._defaultPresets[0].minutes = v;
                self._rebuildPresets();
                self._saveTimerConfig();
                if (self._s.mode === 'pomodoro' && !self._s.running) {
                    self._s.presetMinutes = v;
                    self._s.presetTotalSeconds = v * 60;
                    self._s.seconds = v * 60;
                    self._updateDisplay();
                }
                showToast('Pomodoro: ' + v + ' min', 'success');
            }
        });

        // Short break
        var shortInput = document.getElementById('tc-short');
        if (shortInput) shortInput.addEventListener('change', function() {
            var v = parseInt(shortInput.value);
            if (v && v >= 1 && v <= 60) {
                self._defaultPresets[1].minutes = v;
                self._rebuildPresets();
                self._saveTimerConfig();
                if (self._s.mode === 'short_break' && !self._s.running) {
                    self._s.presetMinutes = v;
                    self._s.presetTotalSeconds = v * 60;
                    self._s.seconds = v * 60;
                    self._updateDisplay();
                }
                showToast('Descanso: ' + v + ' min', 'success');
            }
        });

        // Long break
        var longInput = document.getElementById('tc-long');
        if (longInput) longInput.addEventListener('change', function() {
            var v = parseInt(longInput.value);
            if (v && v >= 1 && v <= 120) {
                self._defaultPresets[2].minutes = v;
                self._rebuildPresets();
                self._saveTimerConfig();
                if (self._s.mode === 'long_break' && !self._s.running) {
                    self._s.presetMinutes = v;
                    self._s.presetTotalSeconds = v * 60;
                    self._s.seconds = v * 60;
                    self._updateDisplay();
                }
                showToast('Descanso largo: ' + v + ' min', 'success');
            }
        });

        // Add custom preset
        var addBtn = document.getElementById('timer-add-custom');
        if (addBtn) addBtn.addEventListener('click', function() {
            self._showAddCustomDialog();
        });

        // Delete from config panel
        var configList = document.getElementById('timer-custom-list');
        if (configList) configList.addEventListener('click', function(e) {
            var del = e.target.closest('.chip-delete[data-delidx]');
            if (del) {
                var idx = parseInt(del.dataset.delidx);
                if (!isNaN(idx)) self._deleteCustomPreset(idx);
            }
        });

        this._configOpen = true;
        var btn = document.getElementById('timer-config-toggle');
        if (btn) btn.style.color = 'var(--accent)';
    },

    _saveTimerConfig: function() {
        try {
            var cfg = {
                pomodoroMinutes: this._defaultPresets[0].minutes,
                shortBreakMinutes: this._defaultPresets[1].minutes,
                longBreakMinutes: this._defaultPresets[2].minutes,
            };
            var json = JSON.stringify(cfg);
            localStorage.setItem(this._KEY_SETTINGS + '_config', json);
            // Persist to backend
            var a = api();
            if (a) a.set_setting('timer_config', json).catch(function() {});
        } catch (e) {}
    },

    _loadTimerConfig: function() {
        var self = this;
        try {
            var raw = localStorage.getItem(this._KEY_SETTINGS + '_config');
            if (raw) {
                var cfg = JSON.parse(raw);
                if (cfg.pomodoroMinutes) this._defaultPresets[0].minutes = cfg.pomodoroMinutes;
                if (cfg.shortBreakMinutes) this._defaultPresets[1].minutes = cfg.shortBreakMinutes;
                if (cfg.longBreakMinutes) this._defaultPresets[2].minutes = cfg.longBreakMinutes;
            }
        } catch (e) {}
        // Also try loading from backend (overrides localStorage)
        var a = api();
        if (a) {
            a.get_setting('timer_config').then(function(val) {
                if (val && typeof val === 'string' && val.length > 2) {
                    try {
                        var cfg = JSON.parse(val);
                        if (cfg.pomodoroMinutes) self._defaultPresets[0].minutes = cfg.pomodoroMinutes;
                        if (cfg.shortBreakMinutes) self._defaultPresets[1].minutes = cfg.shortBreakMinutes;
                        if (cfg.longBreakMinutes) self._defaultPresets[2].minutes = cfg.longBreakMinutes;
                    } catch (e) {}
                }
            }).catch(function() {});
        }
    },

    // ═══════════════════════════════════════════
    //  CUSTOM PRESETS
    // ═══════════════════════════════════════════

    _loadCustomPresets: function() {
        this._loadTimerConfig();
        var self = this;
        // Try loading from backend (persistent) first, fall back to localStorage
        var a = api();
        if (a) {
            a.get_setting('timer_custom_presets').then(function(val) {
                if (val && typeof val === 'string' && val.length > 2) {
                    try {
                        self._customPresets = JSON.parse(val);
                        self._saveCustomToLocalStorage(); // sync to localStorage as cache
                    } catch (e) {
                        self._loadCustomFromLocalStorage();
                    }
                } else {
                    self._loadCustomFromLocalStorage();
                }
                self._rebuildPresets();
                // Re-render presets in DOM so loaded custom presets appear immediately
                self._refreshPresetsDOM();
            }).catch(function() {
                self._loadCustomFromLocalStorage();
                self._rebuildPresets();
                self._refreshPresetsDOM();
            });
        } else {
            this._loadCustomFromLocalStorage();
            this._rebuildPresets();
            this._refreshPresetsDOM();
        }
    },

    _loadCustomFromLocalStorage: function() {
        try {
            var raw = localStorage.getItem(this._KEY_CUSTOM);
            if (raw) {
                this._customPresets = JSON.parse(raw);
                // Sync to backend if not already there
                var a = api();
                if (a && this._customPresets.length > 0) {
                    a.set_setting('timer_custom_presets', JSON.stringify(this._customPresets)).catch(function() {});
                }
            }
        } catch (e) {}
    },

    _refreshPresetsDOM: function() {
        var container = document.getElementById('timer-presets-container');
        if (!container) return;
        var self = this;

        // Re-render preset buttons
        var presetsHtml = '';
        for (var i = 0; i < this._presets.length; i++) {
            var p = this._presets[i];
            var activeClass = (this._s.mode === p.mode) ? 'active' : '';
            var timeLabel = self._presetTimeLabel(p);
            presetsHtml += '<button class="timer-preset-btn ' + activeClass + '" data-idx="' + i + '" data-mode="' + p.mode + '">' + escapeHtml(p.label) + (timeLabel ? ' <small>' + timeLabel + '</small>' : '') + '</button>';
        }

        // Re-render custom chips
        var customChipsHtml = '';
        for (var j = 0; j < this._customPresets.length; j++) {
            var cp = this._customPresets[j];
            var cActive = (this._s.mode === cp.mode) ? ' active' : '';
            var cpLabel = self._presetTimeLabel(cp);
            customChipsHtml += '<span class="timer-custom-chip' + cActive + '" data-cidx="' + j + '" data-mode="' + cp.mode + '">' + escapeHtml(cp.label) + ' <small>' + cpLabel + '</small> <span class="chip-delete" data-del="' + j + '" title="Eliminar">&times;</span></span>';
        }

        container.innerHTML = presetsHtml + customChipsHtml;

        // Also update config panel custom list if visible
        this._updateConfigPanelCustomList();
    },

    _updateConfigPanelCustomList: function() {
        var configList = document.getElementById('timer-custom-list');
        if (!configList) return;
        var self = this;
        if (this._customPresets.length === 0) {
            configList.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">Sin temporizadores personalizados</span>';
        } else {
            var html = '';
            for (var k = 0; k < this._customPresets.length; k++) {
                var cc = this._customPresets[k];
                var tl = self._presetTimeLabel(cc);
                html += '<span class="timer-custom-chip" style="cursor:default;">' + escapeHtml(cc.label) + ' <small>' + tl + '</small> <span class="chip-delete" data-delidx="' + k + '" title="Eliminar">&times;</span></span>';
            }
            configList.innerHTML = html;
        }
    },

    _saveCustomPresets: function() {
        var json = JSON.stringify(this._customPresets);
        try { localStorage.setItem(this._KEY_CUSTOM, json); } catch (e) {}
        // Persist to backend
        var a = api();
        if (a) a.set_setting('timer_custom_presets', json).catch(function() {});
    },

    _saveCustomToLocalStorage: function() {
        try { localStorage.setItem(this._KEY_CUSTOM, JSON.stringify(this._customPresets)); } catch (e) {}
    },

    _showAddCustomDialog: function() {
        var self = this;
        showFormModal('Nuevo temporizador', [
            { id: 'name', label: 'Nombre', placeholder: 'Ej: Reunion, Ejercicio...', required: true },
            { id: 'minutes', label: 'Minutos', placeholder: '0', type: 'number', required: false },
            { id: 'seconds', label: 'Segundos', placeholder: '0', type: 'number', required: false },
        ]).then(function(values) {
            if (!values) return;
            var name = (values.name || '').trim();
            var mins = parseInt(values.minutes) || 0;
            var secs = parseInt(values.seconds) || 0;
            var totalSeconds = mins * 60 + secs;
            if (!name || totalSeconds <= 1) { showToast('Datos invalidos (total debe ser > 1s)', 'warning'); return; }
            var id = 'custom_' + generateId();
            var preset = { id: id, label: name, minutes: mins, seconds: secs, totalSeconds: totalSeconds, mode: id, builtin: false };
            self._customPresets.push(preset);
            self._saveCustomPresets();
            // Re-render the section to show new chip
            navigateTo('timer');
            var label = self._presetTimeLabel(preset);
            showToast('"' + name + '" creado (' + label + ')', 'success');
        });
    },

    _deleteCustomPreset: function(idx) {
        if (idx < 0 || idx >= this._customPresets.length) return;
        var name = this._customPresets[idx].label;
        var mode = this._customPresets[idx].mode;
        this._customPresets.splice(idx, 1);
        this._saveCustomPresets();
        // If the deleted preset was active, switch to pomodoro
        if (this._s.mode === mode && !this._s.running) {
            this._changeMode('pomodoro');
        }
        navigateTo('timer');
        showToast('"' + name + '" eliminado', 'info');
    },

    // ═══════════════════════════════════════════
    //  LOCAL STORAGE
    // ═══════════════════════════════════════════

    _loadLocalState: function() {
        try {
            var raw = localStorage.getItem(this._KEY_STATE);
            if (raw) {
                var saved = JSON.parse(raw);
                this._s = Object.assign({}, this._s, saved);
                this._s.running = false;
                // Ensure presetTotalSeconds is set (backward compat)
                if (!this._s.presetTotalSeconds && this._s.presetMinutes) {
                    this._s.presetTotalSeconds = this._s.presetMinutes * 60;
                }
            }
        } catch (e) {}
    },

    _saveLocalState: function(force) {
        if (!force) { this._saveCounter++; if (this._saveCounter < 10) return; }
        this._saveCounter = 0;
        try { localStorage.setItem(this._KEY_STATE, JSON.stringify(this._s)); } catch (e) {}
    },

    _loadSettings: function() {
        try {
            var raw = localStorage.getItem(this._KEY_SETTINGS);
            if (raw) {
                var s = JSON.parse(raw);
                if (s.autoStartBreaks !== undefined) this._s.autoStartBreaks = s.autoStartBreaks;
                if (s.autoStartPomodoros !== undefined) this._s.autoStartPomodoros = s.autoStartPomodoros;
                if (s.soundEnabled !== undefined) this._s.soundEnabled = s.soundEnabled;
            }
        } catch (e) {}
    },

    _saveSettings: function() {
        try {
            localStorage.setItem(this._KEY_SETTINGS, JSON.stringify({
                autoStartBreaks: this._s.autoStartBreaks,
                autoStartPomodoros: this._s.autoStartPomodoros,
                soundEnabled: this._s.soundEnabled,
            }));
        } catch (e) {}
    },

    // ═══════════════════════════════════════════
    //  TIMER CORE
    // ═══════════════════════════════════════════

    _stopInterval: function() {
        if (this._interval) { clearInterval(this._interval); this._interval = null; }
    },

    _triggerButtonFeedback: function() {
        var btn = document.getElementById('timer-start-btn');
        if (!btn) return;
        btn.classList.remove('timer-btn-pulse');
        // Force reflow to restart animation
        void btn.offsetWidth;
        btn.classList.add('timer-btn-pulse');
        var b = btn;
        setTimeout(function() { if (b) b.classList.remove('timer-btn-pulse'); }, 450);
    },

    _toggle: function() {
        // Direct visual feedback before state change
        this._triggerButtonFeedback();
        if (this._s.running) this._pause(); else this._start();
    },

    _start: function() {
        if (this._s.running) return;
        this._s.running = true;
        var a = api();
        if (a) a.timer_start(this._s.seconds, this._s.mode, this._s.presetMinutes, this._s.totalElapsedSeconds, this._s.pomodoroCount, this._s.presetTotalSeconds).catch(function() {});
        this._saveLocalState(true);
        this._startTick();
        this._updateDisplay();
    },

    _pause: function() {
        if (!this._s.running) return;
        this._s.running = false;
        this._stopInterval();
        var a = api();
        if (a) a.timer_stop().catch(function() {});
        this._saveLocalState(true);
        this._updateDisplay();
        updateTimerOverlayDisplay();
    },

    _reset: function() {
        var self = this;
        if (this._s.running && this._s.mode !== 'free') {
            var elapsed = this._s.presetTotalSeconds - this._s.seconds;
            if (elapsed > 10) this._logSession(this._s.mode, elapsed, this._s.presetMinutes);
        }
        this._s.running = false;
        this._s.seconds = this._s.mode === 'free' ? 0 : this._s.presetTotalSeconds;
        this._s.totalElapsedSeconds = 0;
        this._stopInterval();
        var a = api();
        var afterReset = function(result) {
            if (result && result.seconds !== undefined) self._s.seconds = result.seconds;
            self._saveLocalState(true);
            self._updateDisplay();
            updateTimerOverlayDisplay();
        };
        if (a) a.timer_reset().then(afterReset).catch(afterReset);
        else afterReset();
    },

    _skip: function() {
        var self = this;
        var elapsed = this._s.mode === 'free'
            ? this._s.totalElapsedSeconds
            : (this._s.presetTotalSeconds - this._s.seconds);
        if (elapsed > 10) this._logSession(this._s.mode, elapsed, this._s.presetMinutes);
        this._s.running = false;
        this._stopInterval();
        var a = api();
        if (a) a.timer_stop().catch(function() {});
        if (this._s.mode === 'pomodoro') {
            this._s.pomodoroCount++;
            this._updateCycleIndicator();
            this._changeMode(this._s.pomodoroCount % 4 === 0 ? 'long_break' : 'short_break');
        } else {
            this._changeMode('pomodoro');
        }
        this._updateDisplay();
        showToast('Sesion saltada', 'info');
    },

    _tick: function() {
        if (!this._s.running) return;
        if (this._s.mode === 'free') {
            this._s.totalElapsedSeconds++;
        } else {
            this._s.seconds--;
            if (this._s.seconds <= 0) {
                this._s.seconds = 0;
                this._s.running = false;
                this._stopInterval();
                var a = api();
                if (a) a.timer_stop().catch(function() {});
                this._saveLocalState(true);
                this._updateDisplay();
                var self = this;
                setTimeout(function() { self._onComplete(); }, 100);
                return;
            }
        }
        this._saveLocalState(false);
        this._updateDisplay();
        updateTimerOverlayDisplay();
    },

    _startTick: function() {
        var self = this;
        this._stopInterval();
        this._interval = setInterval(function() { self._tick(); }, 1000);
    },

    _onComplete: function() {
        var self = this;
        if (this._s.soundEnabled) this._playSound();

        var duration = this._s.mode === 'free' ? this._s.totalElapsedSeconds : this._s.presetTotalSeconds;
        this._logSession(this._s.mode, duration, this._s.presetMinutes);

        // Backend Tkinter popup notification with sound
        var a = api();
        if (this._s.mode === 'pomodoro') {
            this._s.pomodoroCount++;
            this._updateCycleIndicator();
            this._saveLocalState(true);
            showToast('Pomodoro #' + this._s.pomodoroCount + ' completado!', 'success', 5000);
            if (a) a.show_timer_notification('Pomodoro #' + this._s.pomodoroCount + ' completado!', 'Tomate un descanso.').catch(function() {});
            // Auto-advance: pomodoro -> break (always)
            this._changeMode(this._s.pomodoroCount % 4 === 0 ? 'long_break' : 'short_break');
            setTimeout(function() { self._start(); }, 1500);
        } else if (this._s.mode === 'short_break' || this._s.mode === 'long_break') {
            showToast('Descanso terminado!', 'success', 5000);
            if (a) a.show_timer_notification('Descanso terminado!', 'Listo para el proximo Pomodoro.').catch(function() {});
            // Auto-advance: break -> pomodoro (always)
            this._changeMode('pomodoro');
            setTimeout(function() { self._start(); }, 1500);
        } else {
            // Custom timer completed
            var preset = this._customPresets.find(function(p) { return p.mode === self._s.mode; });
            var name = preset ? preset.label : 'Temporizador';
            showToast(name + ' completado!', 'success', 5000);
            if (a) a.show_timer_notification(name + ' completado!', 'Tiempo finalizado.').catch(function() {});
        }
        this._updateDisplay();
        updateTimerOverlayDisplay();
    },

    _changeMode: function(mode) {
        var self = this;
        var preset = this._presets.find(function(p) { return p.mode === mode; });
        var totalSeconds;
        var minutes;
        if (preset) {
            minutes = preset.minutes || 0;
            totalSeconds = self._presetTotalSeconds(preset);
        } else {
            if (mode === 'short_break') { minutes = 5; totalSeconds = 300; }
            else if (mode === 'long_break') { minutes = 15; totalSeconds = 900; }
            else if (mode === 'free') { minutes = 0; totalSeconds = 0; }
            else { minutes = 25; totalSeconds = 1500; }
        }
        this._s.mode = mode;
        this._s.presetMinutes = minutes;
        this._s.presetTotalSeconds = totalSeconds;
        this._s.seconds = totalSeconds;
        this._s.totalElapsedSeconds = 0;
        this._s.running = false;
        this._saveLocalState(true);
        var a = api();
        if (a) a.timer_set_mode(mode, minutes, totalSeconds).catch(function() {});
        $$('.timer-preset-btn[data-idx]').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        $$('.timer-custom-chip[data-mode]').forEach(function(chip) {
            chip.classList.toggle('active', chip.dataset.mode === mode);
        });
        this._updateDisplay();
    },

    // ═══════════════════════════════════════════
    //  LOG SESSION
    // ═══════════════════════════════════════════

    _logSession: function(type, durationSeconds, plannedMinutes) {
        var a = api();
        if (a) a.log_session(type, Math.round(durationSeconds), plannedMinutes || 0).catch(function() {});
        this._sessions.unshift({
            id: generateId(), type: type,
            actual_seconds: Math.max(0, Math.round(durationSeconds)),
            planned_minutes: plannedMinutes || 0,
            date: new Date().toISOString(), timestamp: Date.now(),
        });
        if (this._sessions.length > 500) this._sessions = this._sessions.slice(0, 500);
        try { localStorage.setItem(this._KEY_SESSIONS, JSON.stringify(this._sessions)); } catch (e) {}
    },

    // ═══════════════════════════════════════════
    //  DISPLAY
    // ═══════════════════════════════════════════

    _updateDisplay: function() {
        var self = this;
        var display = document.getElementById('timer-time-display');
        var label = document.getElementById('timer-mode-label');
        var countEl = document.getElementById('timer-session-count');
        var circle = document.getElementById('timer-circle');

        var timeStr;
        if (this._s.mode === 'free' && (this._s.running || this._s.totalElapsedSeconds > 0)) {
            timeStr = this._fmtTime(this._s.totalElapsedSeconds, true);
        } else {
            timeStr = this._fmtTime(this._s.seconds, false);
        }

        if (display) display.textContent = timeStr;

        if (label) {
            var labels = { pomodoro: 'Pomodoro', short_break: 'Descanso', long_break: 'Descanso largo', free: 'Libre' };
            // Check custom presets for label
            if (!labels[this._s.mode]) {
                var cp = this._customPresets.find(function(p) { return p.mode === self._s.mode; });
                if (cp) labels[this._s.mode] = cp.label;
            }
            label.textContent = labels[this._s.mode] || 'Temporizador';
        }

        if (countEl) {
            countEl.textContent = this._s.pomodoroCount > 0 ? '#' + this._s.pomodoroCount : '';
        }

        // Update SVG circle progress
        if (circle) {
            var progress = this._getProgress();
            var dashOffset = this._CIRCUMFERENCE * (1 - progress);
            circle.style.strokeDashoffset = dashOffset;
            circle.classList.toggle('running', this._s.running);
        }

        this._updateStartButton();
        this._updateCycleIndicator();
    },

    _updateStartButton: function() {
        var btn = document.getElementById('timer-start-btn');
        if (!btn) return;
        var stateChanged = (this._wasRunning !== this._s.running);
        this._wasRunning = this._s.running;

        if (this._s.running) {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar';
            btn.className = 'btn btn-secondary';
        } else {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar';
            btn.className = 'btn btn-primary';
        }

        // Always play pulse animation when running state changed
        if (stateChanged) {
            btn.classList.add('timer-btn-pulse');
            var b = btn;
            setTimeout(function() {
                if (b) b.classList.remove('timer-btn-pulse');
            }, 450);
        }
    },

    _updateCycleIndicator: function() {
        var cycle = document.getElementById('timer-cycle');
        if (!cycle) return;
        var dots = cycle.querySelectorAll('.cycle-dot');
        var current = this._s.pomodoroCount % 4;
        dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i < current);
            dot.classList.toggle('current', i === current);
        });
    },

    // ═══════════════════════════════════════════
    //  FORMATTERS & SOUND
    // ═══════════════════════════════════════════

    _fmtTime: function(totalSeconds, forceFull) {
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor((totalSeconds % 3600) / 60);
        var s = totalSeconds % 60;
        var hh = String(h).padStart(2, '0');
        var mm = String(m).padStart(2, '0');
        var ss = String(s).padStart(2, '0');
        if (forceFull || h > 0) return hh + ':' + mm + ':' + ss;
        return mm + ':' + ss;
    },

    _playSound: function() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var notes = [523.25, 659.25, 783.99];
            notes.forEach(function(freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.5);
                osc.start(ctx.currentTime + i * 0.2);
                osc.stop(ctx.currentTime + i * 0.2 + 0.5);
            });
        } catch (e) {}
    },
});
