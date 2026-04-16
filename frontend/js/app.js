/**
 * ============================================================
 * DEVTOOLS — app.js
 * Core: sidebar colapsable, navegacion, tema violeta,
 *        global search, utils, toasts, secciones
 * v0.9
 * ============================================================
 */

const App = {
    currentSection: null,
    loadedScripts: {},
    sectionHandlers: {},
    sidebarCollapsed: false,
    themePickerOpen: false,
    timerOverlayOpen: false,
    globalSearchOpen: false,
};

document.addEventListener('DOMContentLoaded', async () => {
    initHeader();
    initSidebar();
    initTheme();
    initThemePicker();
    await initKeyboardShortcuts(); // Load shortcuts from SQLite before anything else
    initModal();
    initGlobalSearch();
    await _initCloseButtonTitle(); // Set correct close button title from DB

    // Sidebar starts collapsed by default
    toggleSidebar(true);

    waitForApi().then(() => {
        navigateTo('home');
        // Show welcome message on first launch
        _checkWelcomeMessage();
    }).catch(() => navigateTo('home'));
});

/** Load minimize_to_tray from DB and set the close button title accordingly */
async function _initCloseButtonTitle() {
    var a = api();
    if (!a) return;
    try {
        var val = await a.get_setting('minimize_to_tray');
        var en = val !== false && val !== 'false' && val !== null;
        _updateCloseButtonTitle(en);
    } catch(e) {
        // Default: enabled
        _updateCloseButtonTitle(true);
    }
}

function waitForApi(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (window.pywebview && window.pywebview.api) resolve();
            else if (Date.now() - start > timeout) reject(new Error('API no disponible'));
            else requestAnimationFrame(check);
        };
        check();
    });
}

function api() {
    return (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
}

function $(selector, parent = document) { return parent.querySelector(selector); }
function $$(selector, parent = document) { return parent.querySelectorAll(selector); }

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

function formatDate(timestamp, isDueDate) {
    let d;
    if (typeof timestamp === 'string') {
        if (timestamp.includes('T') || timestamp.includes('-')) {
            d = new Date(timestamp);
        } else {
            d = new Date(parseFloat(timestamp) * 1000);
        }
    } else if (typeof timestamp === 'number') {
        d = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
    } else {
        return '';
    }
    if (isNaN(d.getTime())) return '';
    // For due dates, show the actual date instead of relative time
    if (isDueDate) {
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** Returns today's date as YYYY-MM-DD string */
function _todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function generateId() { return Math.random().toString(36).substring(2, 11); }

// ============================================================
// HEADER (macOS-style buttons) + Custom window drag
// ============================================================
function initHeader() {
    const btnMin = $('#btn-minimize');
    const btnMax = $('#btn-maximize');
    const btnClose = $('#btn-close');
    if (btnMin) btnMin.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const a = api();
        if (a) { a.minimize_window(); }
    });
    if (btnMax) btnMax.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const a = api();
        if (a) { a.maximize_window(); }
    });
    if (btnClose) btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const a = api();
        if (a) { a.close_window(); }
    });

    // Custom window drag on header (fallback for backends without -webkit-app-region support)
    initWindowDrag();
}

// ============================================================
// WINDOW DRAG — Only from the header drag area
// ============================================================
function initWindowDrag() {
    const header = document.getElementById('app-header');
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;

    header.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on buttons, search, or interactive elements
        if (e.target.closest('.header-controls') ||
            e.target.closest('.header-center') ||
            e.target.closest('.global-search-trigger') ||
            e.target.closest('button')) {
            return;
        }
        isDragging = true;
        startX = e.screenX;
        startY = e.screenY;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.screenX - startX;
        const dy = e.screenY - startY;
        startX = e.screenX;
        startY = e.screenY;
        const a = api();
        if (a && a.move_window) {
            try { a.move_window(dx, dy); } catch(ex) {}
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// ============================================================
// SIDEBAR (Colapsable 240px / 60px)
// ============================================================
function initSidebar() {
    $$('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.section) navigateTo(item.dataset.section);
        });
    });
    const collapseBtn = $('#btn-collapse-sidebar');
    if (collapseBtn) collapseBtn.addEventListener('click', () => toggleSidebar());
    // Settings button opens floating panel instead of navigating
    const settingsBtn = $('#btn-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => toggleSettingsPanel());
}

function toggleSidebar(force) {
    App.sidebarCollapsed = force !== undefined ? force : !App.sidebarCollapsed;
    const sidebar = $('#sidebar');
    sidebar.classList.toggle('collapsed', App.sidebarCollapsed);
    localStorage.setItem('devtools-sidebar-collapsed', App.sidebarCollapsed);
}

function setActiveNav(section) {
    $$('.nav-item[data-section]').forEach(item => item.classList.toggle('active', item.dataset.section === section));
}

function registerSection(id, handler) { App.sectionHandlers[id] = handler; }

async function navigateTo(sectionId) {
    if (App.currentSection && App.sectionHandlers[App.currentSection]) {
        const prev = App.sectionHandlers[App.currentSection];
        if (prev.unload) prev.unload();
    }
    setActiveNav(sectionId);
    App.currentSection = sectionId;
    const container = $('#section-container');
    container.innerHTML = '<div class="spinner-container"><div class="spinner"></div><p>Cargando...</p></div>';
    await loadSectionScript(sectionId);
    const handler = App.sectionHandlers[sectionId];
    if (handler && handler.render) {
        container.innerHTML = handler.render();
        requestAnimationFrame(() => { if (handler.load) handler.load(); });
    } else {
        container.innerHTML = '<div class="section-empty"><div class="section-empty-icon">&#128679;</div><h3>En desarrollo</h3><p>Esta seccion estara disponible pronto.</p></div>';
    }
}

async function loadSectionScript(sectionId) {
    const skipScripts = ['home', 'settings'];
    if (skipScripts.includes(sectionId) || App.loadedScripts[sectionId]) return;
    const scriptMap = {
        tools: 'tools.js', notes: 'notes.js', timer: 'timer.js',
        tasks: 'tasks.js', docs: 'docs.js', stats: 'stats.js',
        flowcharts: 'flowcharts.js', about: 'about.js',
        cmds: 'cmds.js'
    };
    const scriptFile = scriptMap[sectionId];
    if (!scriptFile) return;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = `js/${scriptFile}`;
        script.onload = () => { App.loadedScripts[sectionId] = true; resolve(); };
        script.onerror = () => { console.warn(`No se pudo cargar js/${scriptFile}`); resolve(); };
        document.body.appendChild(script);
    });
}

// ============================================================
// TOASTS
// ============================================================
function showToast(message, type = 'info', duration = 3000) {
    const container = $('#toast-container');
    if (!container) return;
    const icons = { success: '\u2705', error: '\u274C', warning: '\u26A0\uFE0F', info: '\u2139\uFE0F' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300); }, duration);
}

// ============================================================
// MODAL
// ============================================================
let modalResolve = null;

function initModal() {
    const overlay = $('#modal-overlay');
    if ($('#modal-cancel')) $('#modal-cancel').addEventListener('click', () => closeModal(false));
    if ($('#modal-confirm')) $('#modal-confirm').addEventListener('click', () => closeModal(true));
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(false); });
}

function showModal(title, message, confirmText = 'Confirmar', confirmClass = 'btn-danger') {
    return new Promise((resolve) => {
        modalResolve = resolve;
        const overlay = $('#modal-overlay');
        if ($('#modal-title')) $('#modal-title').textContent = title;
        if ($('#modal-message')) $('#modal-message').textContent = message;
        const confirmBtn = $('#modal-confirm');
        if (confirmBtn) { confirmBtn.textContent = confirmText; confirmBtn.className = `btn ${confirmClass}`; }
        overlay.classList.remove('hidden');
    });
}

function closeModal(result) {
    $('#modal-overlay').classList.add('hidden');
    if (modalResolve) { modalResolve(result); modalResolve = null; }
}

// ============================================================
// FORM MODAL
// ============================================================
function showFormModal(title, fields) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'z-index:10000;';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:500px;">
                <div class="modal-header"><h3>${escapeHtml(title)}</h3></div>
                <div class="modal-body" style="padding:20px 24px;">
                    ${fields.map(f => {
                        const required = f.required ? 'required' : '';
                        if (f.type === 'textarea') {
                            return `<div style="margin-bottom:14px;">
                                <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                                <textarea id="form-${f.id}" placeholder="${escapeHtml(f.placeholder || '')}" class="selectable" rows="3" ${required}></textarea>
                            </div>`;
                        }
                        if (f.type === 'select') {
                            const opts = (f.options || []).map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('');
                            return `<div style="margin-bottom:14px;">
                                <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                                <select id="form-${f.id}" style="width:100%;padding:8px 12px;background:#252540;border:1px solid #2a2a45;border-radius:8px;color:#e8e8ed;font-size:14px;">${opts}</select>
                            </div>`;
                        }
                        return `<div style="margin-bottom:14px;">
                            <label style="display:block;font-size:12px;font-weight:600;color:#8888a0;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(f.label)}</label>
                            <input type="${f.type || 'text'}" id="form-${f.id}" placeholder="${escapeHtml(f.placeholder || '')}" ${required}>
                        </div>`;
                    }).join('')}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="form-cancel" type="button">Cancelar</button>
                    <button class="btn btn-primary" id="form-submit" type="button">Crear</button>
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
            try { document.body.removeChild(overlay); } catch(e) {}
            resolve(result);
        };
        const modalBox = overlay.querySelector('.modal-box');
        if (modalBox) modalBox.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
        const cancelBtn = overlay.querySelector('#form-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cleanup(null); });
        const submitBtn = overlay.querySelector('#form-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => { e.stopPropagation();
                const values = {};
                let valid = true;
                fields.forEach(f => {
                    const el = overlay.querySelector(`#form-${f.id}`);
                    values[f.id] = el ? el.value : '';
                    if (f.required && !values[f.id].trim()) { valid = false; if (el) el.style.borderColor = '#ef4444'; }
                });
                if (valid) cleanup(values);
                else showToast('Completa los campos requeridos', 'warning');
            });
        }
        const firstInput = overlay.querySelector('input[type="text"], textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 150);
    });
}

// ============================================================
// TEMA (Violet accent por defecto)
// ============================================================
function initTheme() {
    const savedAccent = localStorage.getItem('devtools-accent');
    const savedAccentName = localStorage.getItem('devtools-accent-name') || 'violet';
    if (savedAccent) {
        document.documentElement.style.setProperty('--accent', savedAccent);
        document.documentElement.style.setProperty('--accent-hover', shadeColor(savedAccent, -15));
        document.documentElement.style.setProperty('--accent-active', shadeColor(savedAccent, -25));
    }
    setTimeout(() => { $$('.theme-color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === savedAccentName)); }, 100);
}

function setAccentColor(color, name) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', shadeColor(color, -15));
    document.documentElement.style.setProperty('--accent-active', shadeColor(color, -25));
    localStorage.setItem('devtools-accent', color);
    localStorage.setItem('devtools-accent-name', name);
    $$('.theme-color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === name));
    showToast(`Color: ${name}`, 'success');
}

function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16), G = parseInt(color.substring(3, 5), 16), B = parseInt(color.substring(5, 7), 16);
    R = Math.max(0, Math.min(255, R + Math.round(R * percent / 100)));
    G = Math.max(0, Math.min(255, G + Math.round(G * percent / 100)));
    B = Math.max(0, Math.min(255, B + Math.round(B * percent / 100)));
    return `#${(R << 16 | G << 8 | B).toString(16).padStart(6, '0')}`;
}

// ============================================================
// THEME PICKER
// ============================================================
function initThemePicker() {
    const picker = $('#theme-picker');
    if (!picker) return;
    $$('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); setAccentColor(btn.dataset.accent, btn.dataset.color); });
    });
    document.addEventListener('click', (e) => { if (App.themePickerOpen && picker && !picker.contains(e.target)) toggleThemePicker(false); });
}

function toggleThemePicker(force) {
    const picker = $('#theme-picker');
    if (!picker) return;
    App.themePickerOpen = force !== undefined ? force : !App.themePickerOpen;
    picker.classList.toggle('hidden', !App.themePickerOpen);
}

// ============================================================
// GLOBAL SEARCH (Ctrl+K) — v2 Enhanced command palette
// ============================================================

// Quick actions / navigation commands shown when search is empty or as prefix matches
const SEARCH_COMMANDS = [
    { id: 'nav-home', icon: '&#127968;', label: 'Ir a Inicio', action: 'navigate', section: 'home', keywords: 'home inicio dashboard panel principal' },
    { id: 'nav-tools', icon: '&#128295;', label: 'Ir a Launcher', action: 'navigate', section: 'tools', keywords: 'launcher herramientas tools apps aplicaciones' },
    { id: 'nav-timer', icon: '&#9201;', label: 'Ir a Temporizador', action: 'navigate', section: 'timer', keywords: 'timer temporizador pomodoro cronometro reloj focus' },
    { id: 'nav-notes', icon: '&#128221;', label: 'Ir a Notas', action: 'navigate', section: 'notes', keywords: 'notas notes apuntes' },
    { id: 'nav-tasks', icon: '&#9989;', label: 'Ir a Tareas', action: 'navigate', section: 'tasks', keywords: 'tareas tasks pendientes todo' },
    { id: 'nav-docs', icon: '&#128214;', label: 'Ir a Documentacion', action: 'navigate', section: 'docs', keywords: 'docs documentacion links recursos enlaces' },
    { id: 'nav-stats', icon: '&#128202;', label: 'Ir a Estadisticas', action: 'navigate', section: 'stats', keywords: 'stats estadisticas datos metricas' },
    { id: 'nav-flowcharts', icon: '&#128203;', label: 'Ir a Diagramas', action: 'navigate', section: 'flowcharts', keywords: 'diagramas flowcharts flujo flow chart' },
    { id: 'act-quicknotes', icon: '&#128221;', label: 'Abrir Quick Notes', action: 'quicknotes', keywords: 'quick notes rapida notas flotante' },
    { id: 'act-theme', icon: '&#127912;', label: 'Cambiar color de acento', action: 'theme', keywords: 'tema color acento theme picker' },
];

function initGlobalSearch() {
    const overlay = $('#global-search-overlay');
    const input = $('#global-search-input');
    const trigger = $('#global-search-trigger');
    const resultsEl = $('#global-search-results');
    if (!overlay || !input) return;
    if (trigger) trigger.addEventListener('click', () => openGlobalSearch());
    input.addEventListener('input', debounce(() => executeGlobalSearch(input.value), 150));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeGlobalSearch(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = resultsEl.querySelectorAll('.global-search-result-item');
            if (items.length === 0) return;
            const current = resultsEl.querySelector('.global-search-result-item.active');
            let idx = current ? Array.from(items).indexOf(current) : -1;
            if (current) current.classList.remove('active');
            if (e.key === 'ArrowDown') idx = (idx + 1) % items.length;
            else idx = idx <= 0 ? items.length - 1 : idx - 1;
            items[idx].classList.add('active');
            items[idx].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const active = resultsEl.querySelector('.global-search-result-item.active');
            if (active) { active.click(); return; }
            const first = resultsEl.querySelector('.global-search-result-item');
            if (first) first.click();
        }
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGlobalSearch(); });
}

function openGlobalSearch() {
    const overlay = $('#global-search-overlay');
    const input = $('#global-search-input');
    if (!overlay || !input) return;
    overlay.classList.remove('hidden');
    input.value = '';
    App.globalSearchOpen = true;
    setTimeout(() => {
        input.focus();
        // Show commands/autocomplete immediately
        _renderSearchDefault();
    }, 50);
}

function closeGlobalSearch() {
    const overlay = $('#global-search-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    App.globalSearchOpen = false;
}

function _renderSearchDefault() {
    const resultsEl = $('#global-search-results');
    if (!resultsEl) return;
    const recentSection = App.currentSection || 'home';
    let html = '<div class="global-search-category"><span class="global-search-cat-icon">&#9889;</span> Acciones rapidas</div>';
    html += SEARCH_COMMANDS.map(cmd => {
        const isCurrent = cmd.section === recentSection;
        return `<div class="global-search-result-item${isCurrent ? ' active' : ''}" data-action="${cmd.action}" data-section="${cmd.section || ''}" data-id="${cmd.id}">
            <span class="gsr-icon">${cmd.icon}</span>
            <div class="global-search-result-text"><strong>${escapeHtml(cmd.label)}</strong><small>${isCurrent ? '(actual)' : cmd.keywords.split(' ').slice(0, 3).join(', ')}</small></div>
        </div>`;
    }).join('');
    html += '<div class="global-search-footer"><span><kbd>&uarr;&darr;</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div>';
    resultsEl.innerHTML = html;
    _bindSearchResultClicks(resultsEl);
}

function _bindSearchResultClicks(resultsEl) {
    resultsEl.querySelectorAll('.global-search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (action === 'navigate') {
                closeGlobalSearch();
                navigateTo(item.dataset.section);
            } else if (action === 'quicknotes') {
                closeGlobalSearch();
                const a = api(); if (a) try { a.open_quick_notes(); } catch(ex) {}
            } else if (action === 'theme') {
                closeGlobalSearch();
                toggleThemePicker();
            } else if (action === 'open-url') {
                const a2 = api(); if (a2) a2.open_url(item.dataset.url);
                closeGlobalSearch();
            } else if (action === 'open-note') {
                closeGlobalSearch();
                navigateTo('notes');
                setTimeout(() => document.dispatchEvent(new CustomEvent('open-note', { detail: { noteId: item.dataset.id } })), 100);
            } else if (action === 'open-task') {
                closeGlobalSearch();
                navigateTo('tasks');
            } else if (action === 'launch') {
                const a2 = api();
                if (a2) {
                    a2.launch(item.dataset.id).then(r => {
                        showToast(r.message || 'Lanzado', r.success !== false ? 'success' : 'error');
                    }).catch(() => showToast('Error al lanzar', 'error'));
                }
                closeGlobalSearch();
            }
        });
    });
}

async function executeGlobalSearch(query) {
    const resultsEl = $('#global-search-results');
    if (!resultsEl) return;

    const trimmed = (query || '').trim();

    // Show default commands if empty or too short
    if (!trimmed || trimmed.length < 1) {
        _renderSearchDefault();
        return;
    }

    // Show loading state
    resultsEl.innerHTML = '<div class="global-search-hint"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin-bottom:8px;"></div><p>Buscando...</p></div>';

    const a = api();
    if (!a) { resultsEl.innerHTML = '<div class="global-search-hint"><p>API no disponible</p></div>'; return; }

    const q = trimmed.toLowerCase();
    let html = '';
    let totalResults = 0;

    // 1. Match quick commands / navigation
    const matchedCommands = SEARCH_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(q) || cmd.keywords.toLowerCase().includes(q)
    );
    if (matchedCommands.length > 0) {
        html += '<div class="global-search-category"><span class="global-search-cat-icon">&#9889;</span> Acciones</div>';
        html += matchedCommands.slice(0, 5).map(cmd => {
            return `<div class="global-search-result-item" data-action="${cmd.action}" data-section="${cmd.section || ''}" data-id="${cmd.id}">
                <span class="gsr-icon">${cmd.icon}</span>
                <div class="global-search-result-text"><strong>${_highlightMatch(cmd.label, q)}</strong><small>${cmd.keywords.split(' ').slice(0, 3).join(', ')}</small></div>
            </div>`;
        }).join('');
        totalResults += matchedCommands.length;
    }

    try {
        // 2. Search launchers
        const launchers = await a.get_launchers().catch(() => []);
        const filteredLaunchers = launchers.filter(l =>
            l.name.toLowerCase().includes(q) || (l.exe_path || '').toLowerCase().includes(q)
        );
        if (filteredLaunchers.length > 0) {
            html += '<div class="global-search-category"><span class="global-search-cat-icon">&#128295;</span> Launcher</div>';
            html += filteredLaunchers.slice(0, 5).map(l => {
                const iconHtml = l.icon_path
                    ? `<img src="data:image/png;base64,${l.icon_path}" style="width:16px;height:16px;border-radius:3px;">`
                    : '';
                return `<div class="global-search-result-item" data-action="launch" data-id="${escapeHtml(l.id)}">
                    <span class="gsr-icon">${iconHtml || '&#128295;'}</span>
                    <div class="global-search-result-text"><strong>${_highlightMatch(l.name, q)}</strong><small>${escapeHtml(l.exe_path || l.path || '')}</small></div>
                </div>`;
            }).join('');
            totalResults += filteredLaunchers.length;
        }

        // 3. Search docs — use keyword args to avoid null confusion
        const docs = await a.get_docs(undefined, trimmed).catch(() => []);
        if (docs && docs.length > 0) {
            html += '<div class="global-search-category"><span class="global-search-cat-icon">&#128214;</span> Docs</div>';
            html += docs.slice(0, 5).map(d => {
                const iconHtml = d.icon_path
                    ? `<img src="data:image/png;base64,${d.icon_path}" style="width:16px;height:16px;border-radius:3px;">`
                    : '';
                return `<div class="global-search-result-item" data-action="open-url" data-url="${escapeHtml(d.url)}">
                    <span class="gsr-icon">${iconHtml || '&#128214;'}</span>
                    <div class="global-search-result-text"><strong>${_highlightMatch(d.name, q)}</strong><small>${escapeHtml(d.desc || d.category || d.url)}</small></div>
                </div>`;
            }).join('');
            totalResults += docs.length;
        }

        // 4. Search notes
        const notes = await a.search_notes(trimmed).catch(() => []);
        if (notes && notes.length > 0) {
            html += '<div class="global-search-category"><span class="global-search-cat-icon">&#128221;</span> Notas</div>';
            html += notes.slice(0, 5).map(n => {
                return `<div class="global-search-result-item" data-action="open-note" data-id="${escapeHtml(n.id)}">
                    <span class="gsr-icon">&#128221;</span>
                    <div class="global-search-result-text"><strong>${_highlightMatch(n.title, q)}</strong><small>${escapeHtml((n.content || '').substring(0, 80))}</small></div>
                </div>`;
            }).join('');
            totalResults += notes.length;
        }

        // 5. Search tasks
        const allTasks = await a.get_tasks().catch(() => []);
        const filteredTasks = allTasks.filter(t =>
            t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
        );
        if (filteredTasks.length > 0) {
            html += '<div class="global-search-category"><span class="global-search-cat-icon">&#9989;</span> Tareas</div>';
            html += filteredTasks.slice(0, 5).map(t => {
                return `<div class="global-search-result-item" data-action="open-task" data-id="${escapeHtml(t.id)}">
                    <span class="gsr-icon">&#9989;</span>
                    <div class="global-search-result-text"><strong>${_highlightMatch(t.title, q)}</strong><small>${escapeHtml((t.status || '') + ' \u00b7 ' + (t.priority || ''))}</small></div>
                </div>`;
            }).join('');
            totalResults += filteredTasks.length;
        }
    } catch (e) {
        console.error('Search error:', e);
    }

    if (totalResults === 0) {
        html = '<div class="global-search-hint"><p>Sin resultados para "' + escapeHtml(trimmed) + '"</p><div class="global-search-shortcuts"><span>Prueba con otra busqueda</span></div></div>';
    } else {
        html += '<div class="global-search-footer"><span>' + totalResults + ' resultado' + (totalResults !== 1 ? 's' : '') + '</span><span><kbd>&uarr;&darr;</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span></div>';
    }

    resultsEl.innerHTML = html;
    _bindSearchResultClicks(resultsEl);
}

/** Highlight matching text in search results */
function _highlightMatch(text, query) {
    if (!query || !text) return escapeHtml(text);
    const safe = escapeHtml(text);
    const safeQ = escapeHtml(query);
    const regex = new RegExp('(' + safeQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(regex, '<mark style="background:rgba(114,84,204,0.3);color:inherit;border-radius:2px;padding:0 1px;">$1</mark>');
}

// ============================================================
// KEYBOARD SHORTCUTS v3 — SQLite backed, zero localStorage
// ============================================================
// Fuente de verdad: SQLite (settings table, key='keyboard_shortcuts')
// Un solo listener keydown, un solo mapa plano _keyMap.
// No localStorage, no version tags, no migration.
// ============================================================

const DEFAULT_SHORTCUTS = {
    globalSearch: { label: 'Busqueda global', desc: 'Buscar en todo', keys: { ctrl: true, shift: false, key: 'k' } },
    quickNotes:   { label: 'Quick Notes',     desc: 'Overlay flotante', keys: { ctrl: true, shift: true, key: 'B' } },
    timerOverlay: { label: 'Timer toggle',    desc: 'Iniciar/detener timer', keys: { ctrl: true, shift: true, key: 'C' } },
    themePicker:  { label: 'Selector de color',desc: 'Cambia el acento',  keys: { ctrl: true, shift: true, key: 'T' } },
};

var activeShortcuts = _getDefaultShortcuts();
var _keyMap = {};
var _isRecordingShortcut = false;

/** Normalize KeyboardEvent to string like "ctrl+shift+k" */
function _keyStr(e) {
    var parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
}

/** Normalize keys object { ctrl, shift, alt, key } to string */
function _keyStrFromObj(k) {
    var parts = [];
    if (k.ctrl) parts.push('ctrl');
    if (k.shift) parts.push('shift');
    if (k.alt) parts.push('alt');
    parts.push(k.key.toLowerCase());
    return parts.join('+');
}

/** Rebuild the flat lookup map: "ctrl+k" -> "globalSearch" */
function _buildKeyMap() {
    _keyMap = {};
    var ids = Object.keys(activeShortcuts);
    for (var i = 0; i < ids.length; i++) {
        _keyMap[_keyStrFromObj(activeShortcuts[ids[i]])] = ids[i];
    }
    console.log('[shortcuts] Map rebuilt:', JSON.stringify(_keyMap));
}

/** Return a plain copy of the default shortcut keys */
function _getDefaultShortcuts() {
    var out = {};
    var ids = Object.keys(DEFAULT_SHORTCUTS);
    for (var i = 0; i < ids.length; i++) {
        out[ids[i]] = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS[ids[i]].keys));
    }
    return out;
}

/** Load shortcuts from SQLite (async). Falls back to defaults.
 *  v3.1: Uses dedicated get_keyboard_shortcuts() to bypass get_setting type coercion.
 */
async function loadShortcuts() {
    // FIX: Wait for pywebview API to be ready before loading shortcuts.
    // Without this, loadShortcuts() runs on DOMContentLoaded before the API
    // is exposed, always falling back to defaults and losing user customizations.
    try { await waitForApi(10000); } catch(e) {
        console.warn('[shortcuts] API not available after timeout, using defaults');
        activeShortcuts = _getDefaultShortcuts();
        _buildKeyMap();
        return;
    }
    var a = api();
    if (a && a.get_keyboard_shortcuts) {
        try {
            var raw = await a.get_keyboard_shortcuts();
            if (raw && typeof raw === 'string' && raw.length > 2) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    var ids = Object.keys(DEFAULT_SHORTCUTS);
                    var valid = true;
                    for (var i = 0; i < ids.length; i++) {
                        if (!parsed[ids[i]] || !parsed[ids[i]].key) { valid = false; break; }
                    }
                    if (valid) {
                        activeShortcuts = parsed;
                        console.log('[shortcuts] Loaded from SQLite:', JSON.stringify(activeShortcuts));
                    } else {
                        console.warn('[shortcuts] Saved data invalid, using defaults');
                        activeShortcuts = _getDefaultShortcuts();
                    }
                } else {
                    activeShortcuts = _getDefaultShortcuts();
                }
            } else {
                activeShortcuts = _getDefaultShortcuts();
            }
        } catch(e) {
            console.warn('[shortcuts] Error loading from SQLite, using defaults:', e);
            activeShortcuts = _getDefaultShortcuts();
        }
    } else {
        activeShortcuts = _getDefaultShortcuts();
    }
    // Clean up old localStorage data if it exists
    try { localStorage.removeItem('devtools-shortcuts'); } catch(e) {}
    _buildKeyMap();
}

/** Persist shortcuts to SQLite (async) and rebuild map + reload global hotkeys.
 *  v3.1: Uses dedicated set_keyboard_shortcuts() with verification.
 */
async function saveShortcuts() {
    _buildKeyMap();
    var a = api();
    if (a && a.set_keyboard_shortcuts) {
        try {
            var jsonStr = JSON.stringify(activeShortcuts);
            var result = await a.set_keyboard_shortcuts(jsonStr);
            if (result && result.success) {
                console.log('[shortcuts] Saved to SQLite' + (result.verified ? ' (verified)' : ' (not verified!)'));
            } else {
                console.error('[shortcuts] Save returned failure:', result);
            }
            // Tell Python to re-register global hotkeys with new config
            try { await a.reload_hotkeys(); } catch(e2) {}
        } catch(e) {
            console.error('[shortcuts] Error saving to SQLite:', e);
        }
    }
    // Update all shortcut hint displays in the UI
    updateShortcutHints();
}

/** Reset all shortcuts to defaults, persist to SQLite, rebuild map */
async function resetShortcuts() {
    activeShortcuts = _getDefaultShortcuts();
    await saveShortcuts();
}

/** Get the key-object for a shortcut id (or null) */
function getShortcut(id) {
    return activeShortcuts[id] || null;
}

/** Human-readable shortcut string, e.g. "Ctrl+Shift+K" */
function shortcutToKbd(id) {
    var s = activeShortcuts[id];
    if (!s) return '';
    var parts = [];
    if (s.ctrl) parts.push('Ctrl');
    if (s.shift) parts.push('Shift');
    if (s.alt) parts.push('Alt');
    parts.push(s.key.toUpperCase());
    return parts.join('+');
}

/** Update all UI elements that display shortcut hints (header, cmds, etc.) */
function updateShortcutHints() {
    // Header search trigger
    var hint = document.getElementById('search-shortcut-hint');
    var trigger = document.getElementById('global-search-trigger');
    var searchKbd = shortcutToKbd('globalSearch');
    if (hint) hint.textContent = searchKbd;
    if (trigger) trigger.title = searchKbd;
}

/** Wire up the single global keydown listener (call once on app start) */
async function initKeyboardShortcuts() {
    // Load from SQLite (async)
    await loadShortcuts();

    // Update all shortcut hint displays in the UI
    updateShortcutHints();

    // Numeric keyboard navigation: Alt+1..9 for quick section access
    var NUMERIC_SECTIONS = ['home', 'tools', 'docs', 'notes', 'flowcharts', 'cmds', 'tasks', 'timer', 'stats'];

    // Single listener — the ONLY place that executes shortcut actions
    document.addEventListener('keydown', function(e) {
        if (_isRecordingShortcut) return;
        var tag = (e.target.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        // Alt + number key = quick section navigation
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            var num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                e.preventDefault();
                e.stopPropagation();
                var section = NUMERIC_SECTIONS[num - 1];
                if (section) navigateTo(section);
                return;
            }
            // Alt+0 = About section
            if (e.key === '0') {
                e.preventDefault();
                e.stopPropagation();
                navigateTo('about');
                return;
            }
        }

        var pressed = _keyStr(e);
        var action = _keyMap[pressed];
        if (!action) return;

        e.preventDefault();
        e.stopPropagation();

        if (action === 'globalSearch') {
            App.globalSearchOpen ? closeGlobalSearch() : openGlobalSearch();
        } else if (action === 'quickNotes') {
            var a = api();
            if (a) { try { a.open_quick_notes(); } catch(ex) {} }
        } else if (action === 'timerOverlay') {
            // Ctrl+Shift+C: toggle start/stop timer
            var th = App.sectionHandlers.timer;
            if (th && th._s) {
                if (th._s.running) {
                    th._pause();
                } else {
                    th._start();
                }
            }
        } else if (action === 'themePicker') {
            toggleThemePicker();
        }
    });

    // Escape handler (separate, always active)
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (App.themePickerOpen) toggleThemePicker(false);
        if (_settingsOpen) toggleSettingsPanel(true);
        if (App.timerOverlayOpen) toggleTimerOverlay(false);
        if (App.globalSearchOpen) closeGlobalSearch();
        var overlay = $('#modal-overlay');
        if (overlay && !overlay.classList.contains('hidden')) closeModal(false);
    });
}

// ============================================================
// TIMER OVERLAY
// ============================================================
function toggleTimerOverlay(force) {
    const overlay = $('#timer-overlay');
    if (!overlay) return;
    App.timerOverlayOpen = force !== undefined ? force : !App.timerOverlayOpen;
    overlay.classList.toggle('hidden', !App.timerOverlayOpen);
    if (App.timerOverlayOpen && App.sectionHandlers.timer && App.sectionHandlers.timer.getTimeString) {
        updateTimerOverlayDisplay();
    }
}

function updateTimerOverlayDisplay() {
    const d = $('#timer-big-display');
    if (!d) return;
    if (App.sectionHandlers.timer && App.sectionHandlers.timer.getTimeString) {
        d.textContent = App.sectionHandlers.timer.getTimeString();
    }
}

document.addEventListener('click', (e) => { if (App.timerOverlayOpen && e.target.id === 'timer-overlay') toggleTimerOverlay(false); });

// ============================================================
// SECCION: HOME (Dashboard)
// ============================================================
registerSection('home', {
    _homeInterval: null,

    render() {
        return `
            <div class="dashboard">
                <div class="dashboard-welcome">
                    <h1>Bienvenido a <span style="color:var(--accent);">DevTools</span></h1>
                    <p>Naci&oacute; como herramienta interna de Ariesta Studios y ahora la compartimos con la comunidad de desarrolladores.</p>
                </div>

                <!-- Apps activas ahora -->
                <div id="dash-active-bar" style="display:none;margin-bottom:20px;"></div>

                <!-- Resumen general -->
                <div class="dashboard-grid" id="dash-stats">
                    <div class="dash-card dash-card-purple">
                        <div class="dash-card-icon">&#128295;</div>
                        <div class="dash-card-value" id="dash-launchers-count">0</div>
                        <div class="dash-card-label">Launcher</div>
                    </div>
                    <div class="dash-card dash-card-blue">
                        <div class="dash-card-icon">&#128221;</div>
                        <div class="dash-card-value" id="dash-notes-count">0</div>
                        <div class="dash-card-label">Notas</div>
                    </div>
                    <div class="dash-card dash-card-orange">
                        <div class="dash-card-icon">&#9989;</div>
                        <div class="dash-card-value" id="dash-tasks-count">0</div>
                        <div class="dash-card-label">Tareas activas</div>
                    </div>
                    <div class="dash-card dash-card-green">
                        <div class="dash-card-icon">&#127919;</div>
                        <div class="dash-card-value" id="dash-focus-count">0m</div>
                        <div class="dash-card-label">Focus hoy</div>
                    </div>
                    <div class="dash-card dash-card-red">
                        <div class="dash-card-icon">&#128293;</div>
                        <div class="dash-card-value" id="dash-streak-count">0d</div>
                        <div class="dash-card-label">Racha</div>
                    </div>

                </div>

                <!-- Uso de apps hoy -->
                <div class="dash-section" style="margin-top:24px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <h2 style="font-size:15px;font-weight:600;">Uso de aplicaciones hoy</h2>
                        <button class="btn btn-ghost btn-sm" onclick="navigateTo('stats')" style="font-size:11px;color:var(--text-muted);">Ver todas las stats &#8594;</button>
                    </div>
                    <div id="dash-usage-summary" class="dash-usage-row">
                        <div class="dash-usage-card"><div class="dash-usage-value" id="dash-usage-today">0m</div><div class="dash-usage-label">Tiempo hoy</div></div>
                        <div class="dash-usage-card"><div class="dash-usage-value" id="dash-usage-launches">0</div><div class="dash-usage-label">Lanzamientos</div></div>
                        <div class="dash-usage-card"><div class="dash-usage-value" id="dash-usage-top">-</div><div class="dash-usage-label">Mas usada</div></div>
                    </div>
                    <div id="dash-top-apps" style="margin-top:12px;"></div>
                </div>

                <!-- Notas recientes -->
                <div class="dash-section" style="margin-top:24px;" id="dash-notes-section">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <h2 style="font-size:15px;font-weight:600;">Notas recientes</h2>
                        <button class="btn btn-ghost btn-sm" onclick="navigateTo('notes')" style="font-size:11px;color:var(--text-muted);">Ver todas las notas &#8594;</button>
                    </div>
                    <div id="dash-recent-notes" class="notes-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;"></div>
                </div>

                <!-- Acceso rapido -->
                <div class="dash-section" style="margin-top:24px;">
                    <h2 style="font-size:15px;font-weight:600;margin-bottom:12px;">Acceso rapido</h2>
                    <div class="launcher-grid" id="dash-launchers-grid"></div>
                </div>
            </div>`;
    },

    async load() {
        const a = api();
        if (!a) return;

        try {
            const [launchers, notesStats, tasksStats, sessionsStats, appUsageStats, appUsageActive, recentNotes] = await Promise.all([
                a.get_launchers(), a.get_notes_stats(), a.get_tasks_stats(), a.get_sessions_stats(),
                a.get_app_usage_stats().catch(() => ({})),
                a.get_app_usage_active().catch(() => []),
                a.get_notes().catch(() => []),
            ]);

            const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
            el('dash-launchers-count', launchers.length);
            el('dash-notes-count', notesStats.total || 0);
            el('dash-tasks-count', (tasksStats.total || 0) - (tasksStats.done || 0));
            el('dash-focus-count', Math.round(((sessionsStats.today || {}).focus_seconds || 0) / 60) + 'm');
            el('dash-streak-count', (sessionsStats.streak || 0) + 'd');

            // App usage summary
            const todaySec = (appUsageStats.today || {}).total_seconds || 0;
            const todayApps = (appUsageStats.today || {}).apps || [];
            const allApps = (appUsageStats.all_time || {}).apps || [];
            const totalLaunches = allApps.reduce((s, a) => s + (a.launch_count || 0), 0);

            const fmtDur = (sec) => {
                if (!sec || sec <= 0) return '0m';
                if (sec < 60) return sec + 's';
                if (sec < 3600) return Math.round(sec / 60) + 'm';
                const h = Math.floor(sec / 3600);
                const m = Math.round((sec % 3600) / 60);
                return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
            };

            el('dash-usage-today', fmtDur(todaySec));
            el('dash-usage-launches', totalLaunches);
            el('dash-usage-top', allApps.length > 0 ? allApps[0].launcher_name : '-');

            // Top 3 apps bar
            const topAppsEl = document.getElementById('dash-top-apps');
            if (topAppsEl && allApps.length > 0) {
                const maxSec = allApps[0].total_seconds || 1;
                const colors = ['#7254cc', '#3498db', '#e67e22'];
                topAppsEl.innerHTML = allApps.slice(0, 3).map((app, i) => {
                    const pct = Math.round((app.total_seconds / maxSec) * 100);
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <span style="font-size:11px;color:var(--text-muted);width:20px;text-align:center;">#${i + 1}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                                <span style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(app.launcher_name)}</span>
                                <span style="font-size:11px;color:var(--text-muted);flex-shrink:0;margin-left:8px;">${fmtDur(app.total_seconds)}</span>
                            </div>
                            <div style="height:5px;background:var(--bg-accent);border-radius:3px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:${colors[i]};border-radius:3px;transition:width 0.5s;"></div>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            }

            // Active apps bar
            this._renderActiveBar(appUsageActive, launchers);

            // Auto-refresh active apps every 2s (sincronizado con backend poller)
            this._homeInterval = setInterval(async () => {
                try {
                    const active = await a.get_app_usage_active().catch(() => []);
                    this._renderActiveBar(active, launchers);
                } catch(e) {}
            }, 2000);

            // Recent notes
            const recentNotesEl = document.getElementById('dash-recent-notes');
            const notesSection = document.getElementById('dash-notes-section');
            if (recentNotesEl && recentNotes && recentNotes.length > 0) {
                const topNotes = recentNotes
                    .filter(n => !n.is_quick_note)
                    .sort((a, b) => {
                        if (a.pinned && !b.pinned) return -1;
                        if (!a.pinned && b.pinned) return 1;
                        return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
                    })
                    .slice(0, 6);
                
                if (topNotes.length > 0) {
                    if (notesSection) notesSection.style.display = 'block';
                    recentNotesEl.innerHTML = topNotes.map(n => {
                        const colorObj = notesStats && notesStats._colors ? notesStats._colors.find(c => c.id === (n.color_id || 'default')) : null;
                        const borderColor = colorObj ? colorObj.color : 'var(--border-light)';
                        const preview = (n.content || '').substring(0, 80).replace(/[#*\`\[\]_~]/g, '').trim();
                        return `<div style="padding:12px;background:var(--bg-secondary);border:1px solid var(--border-light);border-left:3px solid ${borderColor};border-radius:8px;cursor:pointer;" onclick="navigateTo('notes');setTimeout(function(){document.dispatchEvent(new CustomEvent('open-note',{detail:{noteId:'${n.id}'}}))},100)">
                            <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n.title || 'Sin titulo')}</div>
                            ${preview ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(preview)}</div>` : ''}
                            <div style="font-size:10px;color:var(--text-muted);margin-top:6px;">${formatDate(n.updated_at || n.created_at)}${n.pinned ? ' &#128204;' : ''}${n.is_favorite ? ' &#11088;' : ''}</div>
                        </div>`;
                    }).join('');
                } else {
                    if (notesSection) notesSection.style.display = 'none';
                }
            } else {
                if (notesSection) notesSection.style.display = 'none';
            }

            // Launcher grid
            const grid = $('#dash-launchers-grid');
            if (launchers.length === 0) {
                grid.innerHTML = '<p style="padding:16px;color:var(--text-muted);">Sin launchers. Agrega uno desde Launcher.</p>';
            } else {
                grid.innerHTML = launchers.slice(0, 8).map(l => `
                    <div class="launcher-tile" data-launcher-id="${escapeHtml(l.id)}" title="Click para ejecutar">
                        <div class="launcher-tile-icon">${l.icon_path ? `<img src="data:image/png;base64,${l.icon_path}" alt="">` : '<span class="fallback-icon">&#128295;</span>'}</div>
                        <div class="launcher-tile-info"><h4>${escapeHtml(l.name)}</h4><p>${escapeHtml(l.exe_path || l.path || '')}</p></div>
                    </div>`).join('');
                grid.querySelectorAll('.launcher-tile').forEach(tile => {
                    tile.addEventListener('click', async () => {
                        try { const r = await a.launch(tile.dataset.launcherId); showToast(r.message || 'Lanzado', r.success !== false ? 'success' : 'error'); } catch(e) { showToast('Error', 'error'); }
                    });
                });
            }
        } catch (e) { console.error('Dashboard error:', e); }


    },

    _renderActiveBar(active, launchers) {
        const bar = document.getElementById('dash-active-bar');
        if (!bar) return;
        if (!active || active.length === 0) { bar.style.display = 'none'; return; }
        bar.style.display = 'block';
        bar.innerHTML = active.map(app => {
            const l = launchers.find(x => x.id === app.launcher_id);
            const icon = l && l.icon_path ? `<img src="data:image/png;base64,${l.icon_path}" style="width:18px;height:18px;border-radius:3px;">` : '<span style="font-size:16px;">&#128295;</span>';
            return `<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;margin-right:8px;">
                <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite;"></span>
                ${icon}
                <span style="font-size:12px;font-weight:500;">${escapeHtml(app.launcher_name)}</span>
            </div>`;
        }).join('');
    },

    unload() {
        if (this._homeInterval) { clearInterval(this._homeInterval); this._homeInterval = null; }
    }
});

// ============================================================
// SETTINGS — Floating panel (not a section)
// ============================================================

var _settingsOpen = false;
var _settingsKeyHandler = null;

/** Update the close button title to reflect minimize-to-tray state */
function _updateCloseButtonTitle(trayEnabled) {
    var btnClose = document.getElementById('btn-close');
    if (btnClose) {
        btnClose.title = trayEnabled ? 'Minimizar a bandeja' : 'Cerrar aplicacion';
    }
}

function toggleSettingsPanel(forceClose) {
    var panel = document.getElementById('settings-panel');
    var overlay = document.getElementById('settings-panel-overlay');
    if (!panel || !overlay) return;

    if (forceClose === true || _settingsOpen) {
        _closeSettingsPanel();
        return;
    }
    _openSettingsPanel();
}

function _openSettingsPanel() {
    var panel = document.getElementById('settings-panel');
    var overlay = document.getElementById('settings-panel-overlay');
    var body = document.getElementById('settings-panel-body');
    if (!panel || !overlay || !body) return;

    // Render content
    body.innerHTML = _renderSettingsContent();

    // Bind events
    _bindSettingsEvents(body);

    // Show
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    _settingsOpen = true;

    // Close on overlay click
    overlay.onclick = function() { _closeSettingsPanel(); };

    // Close button
    var closeBtn = document.getElementById('settings-panel-close-btn');
    if (closeBtn) closeBtn.onclick = function(e) { e.stopPropagation(); _closeSettingsPanel(); };

    // Escape key
    _settingsKeyHandler = function(e) {
        if (e.key === 'Escape' && _settingsOpen) { _closeSettingsPanel(); }
        // Shortcut recording
        if (_settingsRecording) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.key === 'Escape') {
                _settingsRecording = null;
                _isRecordingShortcut = false;
                var el = body.querySelector('.shortcut-kbd.recording');
                if (el) { el.classList.remove('recording'); el.textContent = shortcutToKbd(el.dataset.scId); el.style.background = ''; }
                return;
            }
            if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) >= 0) return;
            _saveNewShortcut(e, body);
        }
    };
    document.addEventListener('keydown', _settingsKeyHandler, true);
}

function _closeSettingsPanel() {
    var panel = document.getElementById('settings-panel');
    var overlay = document.getElementById('settings-panel-overlay');
    if (panel) panel.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    _settingsOpen = false;
    _settingsRecording = null;
    _isRecordingShortcut = false;
    if (_settingsKeyHandler) { document.removeEventListener('keydown', _settingsKeyHandler, true); _settingsKeyHandler = null; }
}

function _renderSettingsContent() {
    var shortcutItems = Object.keys(DEFAULT_SHORTCUTS).map(function(id) {
        var def = DEFAULT_SHORTCUTS[id];
        var kbd = shortcutToKbd(id);
        var current = activeShortcuts[id];
        var defKeys = DEFAULT_SHORTCUTS[id].keys;
        var isModified = current && _keyStrFromObj(current) !== _keyStrFromObj(defKeys);
        return '<div class="sp-shortcut-row" data-shortcut-id="' + id + '">' +
            '<span class="sp-label">' + escapeHtml(def.label) + '</span>' +
            '<span style="display:flex;align-items:center;gap:4px;">' +
            '<kbd class="cmd-item-kbd shortcut-kbd" data-sc-id="' + id + '" title="Clic para cambiar" style="cursor:pointer;min-width:100px;text-align:center;font-size:11px;">' + escapeHtml(kbd) + '</kbd>' +
            (isModified ? '<button class="btn btn-ghost btn-sm shortcut-reset-btn" data-sc-reset="' + id + '" title="Restaurar" style="font-size:10px;padding:2px 6px;color:var(--text-muted);">x</button>' : '') +
            '</span></div>';
    }).join('');

    return '' +
        // --- Apariencia ---
        '<div class="sp-section">' +
            '<div class="sp-section-title">Apariencia</div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Color de acento</span></div>' +
            '<button class="btn btn-sm btn-secondary" id="sp-theme-btn" style="font-size:11px;padding:4px 12px;">Cambiar</button></div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Sidebar colapsada</span></div>' +
            '<label class="settings-toggle" id="sp-sidebar-toggle"><input type="checkbox" id="sp-sidebar-checkbox"><span class="settings-toggle-track"><span class="settings-toggle-thumb"></span></span></label></div>' +
        '</div>' +
        '<div class="sp-divider"></div>' +
        // --- Ventana ---
        '<div class="sp-section">' +
            '<div class="sp-section-title">Ventana</div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Cerrar a bandeja</span><span class="sp-desc">Minimizar en vez de cerrar</span></div>' +
            '<label class="settings-toggle" id="sp-tray-toggle"><input type="checkbox" id="sp-tray-checkbox"><span class="settings-toggle-track"><span class="settings-toggle-thumb"></span></span></label></div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Iniciar con Windows</span></div>' +
            '<label class="settings-toggle" id="sp-autostart-toggle"><input type="checkbox" id="sp-autostart-checkbox"><span class="settings-toggle-track"><span class="settings-toggle-thumb"></span></span></label></div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Quick Notes</span></div>' +
            '<button class="btn btn-sm btn-secondary" id="sp-qn-btn" style="font-size:11px;padding:4px 12px;">Abrir</button></div>' +
        '</div>' +
        '<div class="sp-divider"></div>' +
        // --- Atajos ---
        '<div class="sp-section">' +
            '<div class="sp-section-title">Atajos de teclado</div>' +
            '<p style="font-size:10px;color:var(--text-muted);margin:0 0 6px;opacity:0.7;">Clic para reasignar. Esc cancela.</p>' +
            shortcutItems +
            '<div style="margin-top:6px;"><button class="btn btn-ghost btn-sm" id="sp-reset-shortcuts" style="font-size:10px;color:var(--text-muted);padding:2px 8px;">Restaurar por defecto</button></div>' +
        '</div>' +
        '<div class="sp-divider"></div>' +
        // --- Datos ---
        '<div class="sp-section">' +
            '<div class="sp-section-title">Datos</div>' +
            '<div class="sp-row"><div class="sp-row-info"><span class="sp-label">Reiniciar datos</span><span class="sp-desc">Borra notas, sesiones, tareas, docs</span></div>' +
            '<button class="btn btn-danger btn-sm" id="sp-reset-data" style="font-size:11px;padding:4px 12px;">Reiniciar</button></div>' +
        '</div>' +
        // --- About ---
        '<div class="sp-about">' +
            '<span class="sp-about-name">DevTools</span>' +
            '<div class="sp-about-ver">v0.9.6 — Game Dev Command Center</div>' +
            '<div class="sp-about-tech">Python + pywebview + SQLite</div>' +
        '</div>';
}

var _settingsRecording = null;

function _saveNewShortcut(e, body) {
    var newKeys = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, key: e.key };
    var allIds = Object.keys(DEFAULT_SHORTCUTS);
    for (var i = 0; i < allIds.length; i++) {
        var otherId = allIds[i];
        if (otherId === _settingsRecording) continue;
        var otherKeys = activeShortcuts[otherId];
        if (otherKeys && _keyStrFromObj(newKeys) === _keyStrFromObj(otherKeys)) {
            activeShortcuts[otherId] = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS[otherId].keys));
            var otherKbd = body.querySelector('.shortcut-kbd[data-sc-id="' + otherId + '"]');
            if (otherKbd) otherKbd.textContent = shortcutToKbd(otherId);
            var otherReset = body.querySelector('.shortcut-reset-btn[data-sc-reset="' + otherId + '"]');
            if (otherReset) otherReset.remove();
        }
    }
    activeShortcuts[_settingsRecording] = newKeys;
    _buildKeyMap();
    saveShortcuts();
    var el = body.querySelector('.shortcut-kbd.recording');
    if (el) { el.classList.remove('recording'); el.textContent = shortcutToKbd(_settingsRecording); el.style.background = ''; }
    // Show reset btn if modified
    var row = body.querySelector('[data-shortcut-id="' + _settingsRecording + '"]');
    if (row) {
        var defKeys = DEFAULT_SHORTCUTS[_settingsRecording].keys;
        var isMod = _keyStrFromObj(newKeys) !== _keyStrFromObj(defKeys);
        var wrap = row.querySelector('.shortcut-kbd').parentElement;
        var existReset = row.querySelector('.shortcut-reset-btn');
        if (isMod && !existReset) {
            var btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm shortcut-reset-btn';
            btn.dataset.scReset = _settingsRecording;
            btn.title = 'Restaurar';
            btn.textContent = 'x';
            btn.style.cssText = 'font-size:10px;padding:2px 6px;color:var(--text-muted);';
            btn.onclick = function() {
                activeShortcuts[btn.dataset.scReset] = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS[btn.dataset.scReset].keys));
                _buildKeyMap(); saveShortcuts();
                var k = body.querySelector('.shortcut-kbd[data-sc-id="' + btn.dataset.scReset + '"]');
                if (k) k.textContent = shortcutToKbd(btn.dataset.scReset);
                btn.remove(); showToast('Atajo restaurado', 'info');
            };
            wrap.appendChild(btn);
        } else if (!isMod && existReset) { existReset.remove(); }
    }
    showToast('Atajo: ' + shortcutToKbd(_settingsRecording), 'success');
    _settingsRecording = null;
    _isRecordingShortcut = false;
}

function _bindSettingsEvents(body) {
    // Theme
    var themeBtn = body.querySelector('#sp-theme-btn');
    if (themeBtn) themeBtn.onclick = function(e) { e.stopPropagation(); toggleThemePicker(true); };

    // Sidebar toggle
    var sidebarToggle = body.querySelector('#sp-sidebar-toggle');
    var sidebarCb = body.querySelector('#sp-sidebar-checkbox');
    if (sidebarToggle && sidebarCb) {
        sidebarCb.checked = document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('collapsed');
        sidebarToggle.classList.toggle('active', sidebarCb.checked);
        sidebarCb.onchange = function() { toggleSidebar(); sidebarToggle.classList.toggle('active', document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('collapsed')); };
    }

    // Quick Notes
    var qnBtn = body.querySelector('#sp-qn-btn');
    if (qnBtn) qnBtn.onclick = function() { var a = api(); if (a) try { a.open_quick_notes(); } catch(ex) {} };

    // Tray toggle
    var trayCb = body.querySelector('#sp-tray-checkbox');
    var trayTgl = body.querySelector('#sp-tray-toggle');
    if (trayCb && trayTgl) {
        var a3 = api();
        if (a3) { a3.get_setting('minimize_to_tray').then(function(val) {
            var en = val !== false && val !== 'false';
            trayCb.checked = en; trayTgl.classList.toggle('active', en);
            _updateCloseButtonTitle(en);
        }).catch(function() {}); }
        trayCb.onchange = async function() {
            var a3 = api(); if (!a3) return;
            var en = trayCb.checked;
            try {
                await a3.set_setting('minimize_to_tray', en);
                // Invalidate Python-side cache so close_window/on_closing picks up the new value
                try { await a3.invalidate_tray_cache(); } catch(e2) {}
                trayTgl.classList.toggle('active', en);
                _updateCloseButtonTitle(en);
                showToast(en ? 'Bandeja activado' : 'Bandeja desactivado', 'success');
            }
            catch (e) { trayCb.checked = !en; showToast('Error', 'error'); }
        };
    }

    // Autostart toggle
    var autoCb = body.querySelector('#sp-autostart-checkbox');
    var autoTgl = body.querySelector('#sp-autostart-toggle');
    if (autoCb && autoTgl) {
        var a2 = api();
        if (a2) { a2.get_autostart().then(function(s) { autoCb.checked = !!s.enabled; autoTgl.classList.toggle('active', !!s.enabled); }).catch(function() {}); }
        autoCb.onchange = async function() {
            var a2 = api(); if (!a2) return;
            var en = autoCb.checked;
            try { var r = await a2.set_autostart(en); if (r && r.success) { autoTgl.classList.toggle('active', en); showToast(en ? 'Auto-inicio activado' : 'Auto-inicio desactivado', 'success'); } else { autoCb.checked = !en; } }
            catch (e) { autoCb.checked = !en; }
        };
    }

    // Shortcut recording
    _settingsRecording = null;
    body.querySelectorAll('.shortcut-kbd').forEach(function(kbd) {
        kbd.onclick = function() {
            if (_settingsRecording) {
                var prev = body.querySelector('.shortcut-kbd.recording');
                if (prev) { prev.classList.remove('recording'); prev.textContent = shortcutToKbd(prev.dataset.scId); prev.style.background = ''; }
            }
            _settingsRecording = kbd.dataset.scId;
            _isRecordingShortcut = true;
            kbd.classList.add('recording');
            kbd.textContent = 'Presiona...';
            kbd.style.background = 'rgba(114,84,204,0.3)';
        };
    });

    // Shortcut reset buttons
    body.querySelectorAll('.shortcut-reset-btn').forEach(function(btn) {
        btn.onclick = function() {
            activeShortcuts[btn.dataset.scReset] = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS[btn.dataset.scReset].keys));
            _buildKeyMap(); saveShortcuts();
            var k = body.querySelector('.shortcut-kbd[data-sc-id="' + btn.dataset.scReset + '"]');
            if (k) k.textContent = shortcutToKbd(btn.dataset.scReset);
            btn.remove(); showToast('Atajo restaurado', 'info');
        };
    });

    // Reset all shortcuts
    var resetScBtn = body.querySelector('#sp-reset-shortcuts');
    if (resetScBtn) resetScBtn.onclick = function() {
        activeShortcuts = _getDefaultShortcuts();
        _buildKeyMap(); resetShortcuts();
        body.querySelectorAll('.shortcut-kbd').forEach(function(k) { k.textContent = shortcutToKbd(k.dataset.scId); });
        body.querySelectorAll('.shortcut-reset-btn').forEach(function(b) { b.remove(); });
        showToast('Atajos restaurados', 'success');
    };

    // Reset data
    var resetDataBtn = body.querySelector('#sp-reset-data');
    if (resetDataBtn) resetDataBtn.onclick = async function() {
        // Close settings panel first so the confirm modal is not behind it
        _closeSettingsPanel();
        try { var ok = await showModal('Reiniciar datos', 'Esta accion eliminara PERMANENTEMENTE todos los datos (notas, tareas, sesiones, launchers, docs, configuracion).', 'Si, reiniciar todo', 'btn-danger'); } catch (err) { return; }
        if (!ok) return;
        var a = api(); if (!a) { showToast('API no disponible', 'error'); return; }
        try {
            var r = await a.reset_all_data();
            if (r && r.success) {
                // Reset all in-memory state to defaults
                activeShortcuts = _getDefaultShortcuts();
                _buildKeyMap();
                // Clear all localStorage
                localStorage.clear();
                showToast('Datos reiniciados correctamente', 'success');
                // Full reload after a short delay so the user sees the toast
                setTimeout(function() { window.location.reload(); }, 1200);
            } else {
                showToast('Error al reiniciar: ' + (r && r.error ? r.error : 'respuesta vacia'), 'error');
            }
        } catch (e) {
            showToast('Error al reiniciar: ' + e.message, 'error');
        }
    };
}

// ============================================================
// WELCOME MESSAGE (first launch only)
// ============================================================

async function _checkWelcomeMessage() {
    var a = api();
    if (!a) return;
    try {
        var shown = await a.get_setting('welcome_shown');
        if (shown === true || shown === 'true') return;
    } catch (e) {
        return;
    }
    // Show welcome modal after a short delay so the app finishes loading
    setTimeout(_showWelcomeMessage, 600);
}

function _showWelcomeMessage() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index:10000;';

    overlay.innerHTML = `
        <div class="modal-box" style="max-width:520px;padding:0;overflow:hidden;">
            <div style="background:linear-gradient(135deg, var(--accent), #5e44a8);padding:28px 30px 20px;text-align:center;">
                <div style="font-size:40px;margin-bottom:8px;">&#128640;</div>
                <h2 style="color:white;margin:0 0 4px;font-size:20px;font-weight:700;">Bienvenido a DevTools</h2>
                <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;">Un proyecto de Ariesta Studios</p>
            </div>
            <div style="padding:24px 30px 28px;">
                <p style="font-size:14px;color:var(--text-normal);line-height:1.6;margin:0 0 16px;">
                    DevTools naci&oacute; como herramienta privada interna del equipo de Ariesta Studios. Despu&eacute;s de meses us&aacute;ndola a diario, hemos decidido hacerla p&uacute;blica esperando que a desarrolladores como ustedes pueda serles &uacute;til.
                </p>
                <p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin:0 0 16px;">Aqu&iacute; tienes un resumen r&aacute;pido de lo que puedes hacer:</p>
                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="font-size:18px;flex-shrink:0;">&#128295;</span>
                        <div><strong style="color:var(--text-normal);font-size:13px;">Launcher</strong><p style="color:var(--text-muted);font-size:12px;margin:2px 0 0;">Organiza y lanza tus herramientas de desarrollo favoritas</p></div>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="font-size:18px;flex-shrink:0;">&#128221;</span>
                        <div><strong style="color:var(--text-normal);font-size:13px;">Notas</strong><p style="color:var(--text-muted);font-size:12px;margin:2px 0 0;">Notas con soporte Markdown, sub-paginas y etiquetas</p></div>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="font-size:18px;flex-shrink:0;">&#9201;</span>
                        <div><strong style="color:var(--text-normal);font-size:13px;">Timer Pomodoro</strong><p style="color:var(--text-muted);font-size:12px;margin:2px 0 0;">Gestiona sesiones de enfoque con temporizadores</p></div>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="font-size:18px;flex-shrink:0;">&#9889;</span>
                        <div><strong style="color:var(--text-normal);font-size:13px;">Atajos globales</strong><p style="color:var(--text-muted);font-size:12px;margin:2px 0 0;">Ctrl+Shift+B notas, Ctrl+Shift+C timer, Ctrl+K busqueda</p></div>
                    </div>
                </div>
                <p style="font-size:12px;color:var(--text-muted);text-align:center;margin:0 0 18px;">
                    Puedes personalizar todo desde Configuracion (icono de engranaje en la barra lateral)
                </p>
                <div style="text-align:center;">
                    <button class="btn btn-primary" id="welcome-dismiss" style="padding:10px 40px;font-size:14px;font-weight:600;">Empezar a usar DevTools</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    var closed = false;
    var cleanup = function() {
        if (closed) return;
        closed = true;
        try { document.body.removeChild(overlay); } catch(e) {}
        // Mark as shown in database
        var a = api();
        if (a) {
            a.set_setting('welcome_shown', true).catch(function() {});
        }
    };

    overlay.querySelector('#welcome-dismiss').addEventListener('click', function(e) {
        e.stopPropagation();
        cleanup();
    });
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cleanup();
    });
}
