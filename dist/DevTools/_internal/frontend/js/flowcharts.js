/**
 * ============================================================
 * GAME DEV HUB — flowcharts.js
 * Canvas-based Flowchart / Diagram Editor
 * Node types: Action, Decision, Event, Custom
 * Pan, zoom, drag, connect, snap-to-grid, templates, export
 * ============================================================
 */

const NODE_TYPES = {
    action: {
        label: 'Action',
        accent: '#22c55e',
        accentBg: '#16291c',
        fields: ['label', 'description'],
        defaultData: { label: 'New Action', description: '' },
        shape: 'rect',
        ports: { in: [{ side: 'top', label: '' }], out: [{ side: 'bottom', label: '' }] }
    },
    decision: {
        label: 'Decision',
        accent: '#eab308',
        accentBg: '#2a2610',
        fields: ['label', 'true_label', 'false_label'],
        defaultData: { label: 'Condition?', true_label: 'True', false_label: 'False' },
        shape: 'diamond',
        ports: { in: [{ side: 'top', label: '' }], out: [{ side: 'left', label: 'false' }, { side: 'right', label: 'true' }] }
    },
    event: {
        label: 'Event',
        accent: '#3b82f6',
        accentBg: '#151e2e',
        fields: ['label', 'event_type'],
        defaultData: { label: 'On Event', event_type: 'collision' },
        shape: 'rounded',
        ports: { in: [{ side: 'top', label: '' }], out: [{ side: 'bottom', label: '' }] }
    },
    custom: {
        label: 'Custom',
        accent: '#a855f7',
        accentBg: '#231530',
        fields: ['label', 'fields'],
        defaultData: { label: 'Custom Node', fields: [] },
        shape: 'hexagon',
        ports: { in: [{ side: 'top', label: '' }], out: [{ side: 'bottom', label: '' }] }
    }
};

const TEMPLATES = {
    'game-loop': {
        name: 'Game Loop',
        description: 'Start → Process Input → Update → Render → Wait → Loop',
        build() {
            const nodes = [
                { id: 'gl_start', type: 'event', x: 400, y: 40, label: 'Start', data: { label: 'Start', event_type: 'game_start' } },
                { id: 'gl_input', type: 'action', x: 400, y: 140, label: 'Process Input', data: { label: 'Process Input', description: 'Read keyboard, mouse, gamepad' } },
                { id: 'gl_update', type: 'action', x: 400, y: 260, label: 'Update', data: { label: 'Update', description: 'Game logic, physics, AI' } },
                { id: 'gl_render', type: 'action', x: 400, y: 380, label: 'Render', data: { label: 'Render', description: 'Draw frame' } },
                { id: 'gl_wait', type: 'action', x: 400, y: 500, label: 'Wait', data: { label: 'Wait', description: 'Frame timing / VSync' } },
            ];
            const edges = [
                { id: 'ge1', from_node: 'gl_start', from_port: 0, to_node: 'gl_input', to_port: 0, label: '' },
                { id: 'ge2', from_node: 'gl_input', from_port: 0, to_node: 'gl_update', to_port: 0, label: '' },
                { id: 'ge3', from_node: 'gl_update', from_port: 0, to_node: 'gl_render', to_port: 0, label: '' },
                { id: 'ge4', from_node: 'gl_render', from_port: 0, to_node: 'gl_wait', to_port: 0, label: '' },
            ];
            return { nodes, edges };
        }
    },
    'state-machine': {
        name: 'State Machine',
        description: 'Idle → Running ↔ Paused → Idle',
        build() {
            const nodes = [
                { id: 'sm_idle', type: 'event', x: 300, y: 80, label: 'Idle', data: { label: 'Idle', event_type: 'idle' } },
                { id: 'sm_running', type: 'action', x: 600, y: 80, label: 'Running', data: { label: 'Running', description: 'Game is active' } },
                { id: 'sm_paused', type: 'action', x: 600, y: 260, label: 'Paused', data: { label: 'Paused', description: 'Game paused' } },
                { id: 'sm_decision', type: 'decision', x: 300, y: 260, label: 'Quit?', data: { label: 'Quit?', true_label: 'Exit', false_label: 'Back to Idle' } },
            ];
            const edges = [
                { id: 'se1', from_node: 'sm_idle', from_port: 0, to_node: 'sm_running', to_port: 0, label: 'Start' },
                { id: 'se2', from_node: 'sm_running', from_port: 0, to_node: 'sm_paused', to_port: 0, label: 'Pause' },
                { id: 'se3', from_node: 'sm_paused', from_port: 0, to_node: 'sm_running', to_port: 0, label: 'Resume' },
                { id: 'se4', from_node: 'sm_paused', from_port: 0, to_node: 'sm_decision', to_port: 0, label: 'Quit' },
            ];
            return { nodes, edges };
        }
    },
    'quest-flow': {
        name: 'Quest Flow',
        description: 'Quest Start → Objectives → Decision → Complete/Failed',
        build() {
            const nodes = [
                { id: 'qf_start', type: 'event', x: 400, y: 40, label: 'Quest Start', data: { label: 'Quest Start', event_type: 'quest_accepted' } },
                { id: 'qf_obj1', type: 'action', x: 400, y: 160, label: 'Objective 1', data: { label: 'Objective 1', description: 'Collect items' } },
                { id: 'qf_obj2', type: 'action', x: 400, y: 280, label: 'Objective 2', data: { label: 'Objective 2', description: 'Defeat boss' } },
                { id: 'qf_check', type: 'decision', x: 400, y: 410, label: 'Success?', data: { label: 'Success?', true_label: 'Yes', false_label: 'No' } },
                { id: 'qf_complete', type: 'action', x: 600, y: 540, label: 'Quest Complete', data: { label: 'Quest Complete', description: 'Reward player' } },
                { id: 'qf_fail', type: 'action', x: 200, y: 540, label: 'Quest Failed', data: { label: 'Quest Failed', description: 'Reset or retry' } },
            ];
            const edges = [
                { id: 'qe1', from_node: 'qf_start', from_port: 0, to_node: 'qf_obj1', to_port: 0, label: '' },
                { id: 'qe2', from_node: 'qf_obj1', from_port: 0, to_node: 'qf_obj2', to_port: 0, label: '' },
                { id: 'qe3', from_node: 'qf_obj2', from_port: 0, to_node: 'qf_check', to_port: 0, label: '' },
                { id: 'qe4', from_node: 'qf_check', from_port: 1, to_node: 'qf_complete', to_port: 0, label: 'Yes' },
                { id: 'qe5', from_node: 'qf_check', from_port: 0, to_node: 'qf_fail', to_port: 0, label: 'No' },
            ];
            return { nodes, edges };
        }
    },
    'behaviour-tree': {
        name: 'Behaviour Tree',
        description: 'Selector → Sequence → Actions (AI pattern)',
        build() {
            const nodes = [
                { id: 'bt_root', type: 'custom', x: 400, y: 40, label: 'Selector', data: { label: 'Selector', fields: ['Patrol', 'Chase', 'Flee'] } },
                { id: 'bt_seq', type: 'custom', x: 400, y: 160, label: 'Sequence: Patrol', data: { label: 'Sequence: Patrol', fields: ['Find waypoint', 'Move to waypoint'] } },
                { id: 'bt_find', type: 'action', x: 300, y: 280, label: 'Find Waypoint', data: { label: 'Find Waypoint', description: 'Select next patrol point' } },
                { id: 'bt_move', type: 'action', x: 500, y: 280, label: 'Move To', data: { label: 'Move To', description: 'Navigate to waypoint' } },
                { id: 'bt_seq2', type: 'custom', x: 400, y: 400, label: 'Sequence: Chase', data: { label: 'Sequence: Chase', fields: ['Detect player', 'Pursue'] } },
                { id: 'bt_detect', type: 'action', x: 300, y: 520, label: 'Detect Player', data: { label: 'Detect Player', description: 'Line of sight check' } },
                { id: 'bt_pursue', type: 'action', x: 500, y: 520, label: 'Pursue', data: { label: 'Pursue', description: 'Move towards player' } },
            ];
            const edges = [
                { id: 'be1', from_node: 'bt_root', from_port: 0, to_node: 'bt_seq', to_port: 0, label: '' },
                { id: 'be2', from_node: 'bt_seq', from_port: 0, to_node: 'bt_find', to_port: 0, label: '' },
                { id: 'be3', from_node: 'bt_seq', from_port: 0, to_node: 'bt_move', to_port: 0, label: '' },
                { id: 'be4', from_node: 'bt_root', from_port: 0, to_node: 'bt_seq2', to_port: 0, label: '' },
                { id: 'be5', from_node: 'bt_seq2', from_port: 0, to_node: 'bt_detect', to_port: 0, label: '' },
                { id: 'be6', from_node: 'bt_seq2', from_port: 0, to_node: 'bt_pursue', to_port: 0, label: '' },
            ];
            return { nodes, edges };
        }
    }
};

registerSection('flowcharts', {
    _flowcharts: [],
    _currentChart: null,
    _nodes: [],
    _edges: [],
    _selectedNode: null,
    _selectedEdge: null,
    _canvas: null,
    _ctx: null,
    _zoom: 1,
    _panX: 0,
    _panY: 0,
    _dragging: null,
    _connecting: null,
    _isPanning: false,
    _panStartX: 0,
    _panStartY: 0,
    _panStartPanX: 0,
    _panStartPanY: 0,
    _gridSize: 20,
    _snapToGrid: true,
    _autoSaveTimer: null,
    _resizeObserver: null,
    _animFrame: null,

    _hoveredNode: null,
    _hoveredPort: null,

    getTimeString() { return '00:00:00'; },

    // ================================================================
    // RENDER — Return full HTML layout
    // ================================================================
    render() {
        return `
            <div class="flowchart-layout" style="display:flex;gap:0;height:calc(100vh - 120px);overflow:hidden;">
                <div class="flowchart-main" style="flex:1;display:flex;flex-direction:column;min-width:0;">
                    <div class="flowchart-toolbar" id="fc-toolbar" style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-normal);border-radius:var(--border-radius) 0 0 0;flex-wrap:wrap;">
                        <button class="btn btn-ghost btn-sm" id="fc-zoom-in" title="Zoom In (+)">+</button>
                        <span id="fc-zoom-label" style="font-size:12px;color:var(--text-muted);min-width:42px;text-align:center;">100%</span>
                        <button class="btn btn-ghost btn-sm" id="fc-zoom-out" title="Zoom Out (-)">-</button>
                        <button class="btn btn-ghost btn-sm" id="fc-zoom-reset" title="Reset View">Reset</button>
                        <span style="width:1px;height:20px;background:var(--border-normal);margin:0 4px;"></span>
                        <div style="position:relative;" id="fc-add-dropdown-wrap">
                            <button class="btn btn-secondary btn-sm" id="fc-add-node-btn">+ Add Node</button>
                            <div class="hidden" id="fc-add-dropdown" style="position:absolute;top:100%;left:0;margin-top:4px;background:var(--bg-secondary);border:1px solid var(--border-normal);border-radius:8px;padding:4px;z-index:50;min-width:160px;box-shadow:var(--elevation-lg);">
                                <button class="btn btn-ghost btn-sm fc-add-type" data-type="action" style="display:flex;align-items:center;gap:8px;width:100%;justify-content:flex-start;">
                                    <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;"></span> Action
                                </button>
                                <button class="btn btn-ghost btn-sm fc-add-type" data-type="decision" style="display:flex;align-items:center;gap:8px;width:100%;justify-content:flex-start;">
                                    <span style="width:10px;height:10px;border-radius:50%;background:#eab308;"></span> Decision
                                </button>
                                <button class="btn btn-ghost btn-sm fc-add-type" data-type="event" style="display:flex;align-items:center;gap:8px;width:100%;justify-content:flex-start;">
                                    <span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;"></span> Event
                                </button>
                                <button class="btn btn-ghost btn-sm fc-add-type" data-type="custom" style="display:flex;align-items:center;gap:8px;width:100%;justify-content:flex-start;">
                                    <span style="width:10px;height:10px;border-radius:50%;background:#a855f7;"></span> Custom
                                </button>
                            </div>
                        </div>
                        <div style="position:relative;" id="fc-template-dropdown-wrap">
                            <button class="btn btn-ghost btn-sm" id="fc-template-btn">Templates</button>
                            <div class="hidden" id="fc-template-dropdown" style="position:absolute;top:100%;left:0;margin-top:4px;background:var(--bg-secondary);border:1px solid var(--border-normal);border-radius:8px;padding:4px;z-index:50;min-width:200px;box-shadow:var(--elevation-lg);">
                                ${Object.entries(TEMPLATES).map(([key, tpl]) => `
                                    <button class="btn btn-ghost btn-sm fc-tpl-btn" data-tpl="${key}" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;">
                                        <span style="font-weight:600;">${escapeHtml(tpl.name)}</span>
                                        <span style="font-size:11px;color:var(--text-muted);">${escapeHtml(tpl.description)}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <span style="width:1px;height:20px;background:var(--border-normal);margin:0 4px;"></span>
                        <button class="btn btn-ghost btn-sm" id="fc-snap-btn" title="Toggle Snap to Grid">Snap</button>
                        <button class="btn btn-ghost btn-sm" id="fc-delete-btn" title="Delete Selected (Del)">Delete</button>
                        <span style="flex:1;"></span>
                        <button class="btn btn-ghost btn-sm" id="fc-export-png" title="Export as PNG">PNG</button>
                        <button class="btn btn-ghost btn-sm" id="fc-export-json" title="Export as JSON">JSON</button>
                        <button class="btn btn-primary btn-sm" id="fc-save-btn" title="Save (Ctrl+S)">Save</button>
                    </div>
                    <div class="flowchart-canvas-wrap" id="fc-canvas-wrap" style="flex:1;position:relative;overflow:hidden;background:var(--bg-primary);border:1px solid var(--border-normal);border-top:none;">
                        <canvas id="fc-canvas" class="flowchart-canvas" style="display:block;width:100%;height:100%;cursor:default;"></canvas>
                    </div>
                </div>
                <div class="flowchart-sidebar" id="fc-sidebar" style="width:260px;background:var(--bg-secondary);border:1px solid var(--border-normal);border-left:none;border-radius:0 var(--border-radius) var(--border-radius) 0;overflow-y:auto;display:flex;flex-direction:column;">
                    <div class="flowchart-sidebar-section" style="padding:12px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <h3 style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Diagrams</h3>
                            <button class="btn btn-primary btn-sm" id="fc-new-btn" title="New Diagram">+ New</button>
                        </div>
                        <div id="fc-chart-list" style="display:flex;flex-direction:column;gap:4px;">
                            <div class="spinner-container" style="min-height:60px;"><div class="spinner"></div></div>
                        </div>
                    </div>
                    <div style="height:1px;background:var(--border-normal);margin:0 12px;"></div>
                    <div class="flowchart-sidebar-section flowchart-props-panel" id="fc-props-panel" style="padding:12px;flex:1;">
                        <h3 style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px;">Properties</h3>
                        <div id="fc-props-content" style="color:var(--text-muted);font-size:13px;">
                            <p>Select a node to view properties.</p>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // ================================================================
    // LOAD — Initialize canvas, events, load chart list
    // ================================================================
    async load() {
        this._canvas = document.getElementById('fc-canvas');
        if (!this._canvas) return;
        this._ctx = this._canvas.getContext('2d');
        this._initCanvas();
        this._bindToolbar();
        this._bindSidebar();
        this._bindKeyboard();
        await this._loadCharts();
        // Create default chart if none exist
        if (this._flowcharts.length === 0) {
            await this._createChart('Untitled Flowchart', null);
        } else {
            await this._openChart(this._flowcharts[0].id);
        }
    },

    unload() {
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
        if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
        this._clearAutoSave();
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        if (this._toolbarClickHandler) { document.removeEventListener('click', this._toolbarClickHandler); this._toolbarClickHandler = null; }
        this._nodes = [];
        this._edges = [];
        this._selectedNode = null;
        this._selectedEdge = null;
        this._currentChart = null;
        this._flowcharts = [];
        this._canvas = null;
        this._ctx = null;
    },

    // ================================================================
    // CANVAS INIT
    // ================================================================
    _initCanvas() {
        const wrap = document.getElementById('fc-canvas-wrap');
        if (!wrap || !this._canvas) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = wrap.getBoundingClientRect();
            this._canvas.width = rect.width * dpr;
            this._canvas.height = rect.height * dpr;
            this._canvas.style.width = rect.width + 'px';
            this._canvas.style.height = rect.height + 'px';
            this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this._render();
        };
        resize();
        this._resizeObserver = new ResizeObserver(resize);
        this._resizeObserver.observe(wrap);

        // Mouse events
        this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this._canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this._canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('mouseleave', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        this._canvas.addEventListener('dblclick', (e) => this._onDblClick(e));
        this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    // ================================================================
    // COORDINATE TRANSFORMS
    // ================================================================
    _screenToCanvas(sx, sy) {
        const rect = this._canvas.getBoundingClientRect();
        const x = (sx - rect.left - this._panX) / this._zoom;
        const y = (sy - rect.top - this._panY) / this._zoom;
        return { x, y };
    },

    _canvasToScreen(cx, cy) {
        const rect = this._canvas.getBoundingClientRect();
        return {
            x: cx * this._zoom + this._panX + rect.left,
            y: cy * this._zoom + this._panY + rect.top
        };
    },

    // ================================================================
    // RENDER — Main draw loop
    // ================================================================
    _render() {
        if (!this._ctx) return;
        const ctx = this._ctx;
        const w = this._canvas.width / (window.devicePixelRatio || 1);
        const h = this._canvas.height / (window.devicePixelRatio || 1);

        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#0e0e1a';
        ctx.fillRect(0, 0, w, h);

        // Apply pan and zoom
        ctx.save();
        ctx.translate(this._panX, this._panY);
        ctx.scale(this._zoom, this._zoom);

        this._drawGrid(ctx, w, h);
        this._edges.forEach(edge => this._drawEdge(ctx, edge));
        this._drawConnectingLine(ctx);
        this._nodes.forEach(node => this._drawNode(ctx, node));

        ctx.restore();
        ctx.restore();
    },

    // ================================================================
    // DRAW GRID
    // ================================================================
    _drawGrid(ctx, w, h) {
        const gs = this._gridSize;
        const startX = Math.floor(-this._panX / this._zoom / gs) * gs - gs;
        const startY = Math.floor(-this._panY / this._zoom / gs) * gs - gs;
        const endX = startX + w / this._zoom + gs * 2;
        const endY = startY + h / this._zoom + gs * 2;

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1 / this._zoom;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gs) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gs) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
    },

    // ================================================================
    // DRAW NODE
    // ================================================================
    _drawNode(ctx, node) {
        const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;
        const isSelected = this._selectedNode && this._selectedNode.id === node.id;
        const nw = node.width || 180;
        const nh = node.height || 70;
        const x = node.x;
        const y = node.y;
        const accent = typeDef.accent;

        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Shape path
        this._traceNodeShape(ctx, node, x, y, nw, nh);

        // Fill
        ctx.fillStyle = typeDef.accentBg || '#1a1a2e';
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Border
        ctx.strokeStyle = isSelected ? accent : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = isSelected ? 2.5 / this._zoom : 1 / this._zoom;
        ctx.stroke();

        // Selection glow
        if (isSelected) {
            ctx.shadowColor = accent;
            ctx.shadowBlur = 15;
            this._traceNodeShape(ctx, node, x, y, nw, nh);
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.5 / this._zoom;
            ctx.stroke();
            ctx.shadowColor = 'transparent';
        }

        // Top accent bar
        ctx.save();
        ctx.beginPath();
        if (typeDef.shape === 'diamond') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + nw, y);
            ctx.lineTo(x + nw / 2, y + nh / 2);
            ctx.lineTo(x, y);
            ctx.closePath();
        } else {
            const r = typeDef.shape === 'rounded' ? 10 : (typeDef.shape === 'hexagon' ? 4 : 6);
            this._roundRectTop(ctx, x, y, nw, 4, r);
        }
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.restore();

        // Label
        ctx.fillStyle = '#e8e8ed';
        ctx.font = `600 ${13}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = typeDef.shape === 'diamond' ? x + nw / 2 : x + nw / 2;
        const textY = typeDef.shape === 'diamond' ? y + nh / 2 - 4 : y + nh / 2 - 8;
        const maxW = typeDef.shape === 'diamond' ? nw * 0.45 : nw - 24;
        this._drawTruncatedText(ctx, node.label || 'Node', textX, textY, maxW);

        // Sub text for decision type
        if (node.type === 'decision' && node.data) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = `400 ${10}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            ctx.fillText('T: ' + (node.data.true_label || 'True'), textX + nw * 0.22, textY + 16);
            ctx.fillText('F: ' + (node.data.false_label || 'False'), textX - nw * 0.22, textY + 16);
        } else if (node.data && node.data.description) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = `400 ${10}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            const subY = typeDef.shape === 'diamond' ? textY + 16 : textY + 16;
            this._drawTruncatedText(ctx, node.data.description, textX, subY, maxW);
        } else if (node.type === 'custom' && node.data && node.data.fields && node.data.fields.length) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = `400 ${10}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            this._drawTruncatedText(ctx, node.data.fields.join(', '), textX, textY + 16, maxW);
        } else if (node.type === 'event' && node.data && node.data.event_type) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = `400 ${10}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            this._drawTruncatedText(ctx, node.data.event_type, textX, textY + 16, maxW);
        }

        ctx.restore();

        // Update ports positions
        this._updatePorts(node);
        this._drawPorts(ctx, node, isSelected);
    },

    _traceNodeShape(ctx, node, x, y, w, h) {
        const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;
        ctx.beginPath();
        switch (typeDef.shape) {
            case 'diamond':
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w / 2, y + h);
                ctx.lineTo(x, y + h / 2);
                ctx.closePath();
                break;
            case 'hexagon':
                ctx.moveTo(x + 12, y);
                ctx.lineTo(x + w - 12, y);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w - 12, y + h);
                ctx.lineTo(x + 12, y + h);
                ctx.lineTo(x, y + h / 2);
                ctx.closePath();
                break;
            case 'rounded':
                this._roundRect(ctx, x, y, w, h, 14);
                break;
            default:
                this._roundRect(ctx, x, y, w, h, 6);
        }
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _roundRectTop(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + Math.min(r, h));
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + Math.min(r, h));
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _drawTruncatedText(ctx, text, x, y, maxW) {
        if (!text) return;
        let t = String(text);
        if (ctx.measureText(t).width > maxW) {
            while (t.length > 1 && ctx.measureText(t + '...').width > maxW) {
                t = t.slice(0, -1);
            }
            t += '...';
        }
        ctx.fillText(t, x, y);
    },

    // ================================================================
    // PORTS
    // ================================================================
    _updatePorts(node) {
        const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;
        const nw = node.width || 180;
        const nh = node.height || 70;
        if (!node.ports) node.ports = { in: [], out: [] };
        const spec = typeDef.ports;

        // In ports
        spec.in.forEach((p, i) => {
            if (!node.ports.in[i]) node.ports.in[i] = { x: 0, y: 0 };
            switch (p.side) {
                case 'top': node.ports.in[i].x = node.x + nw / 2; node.ports.in[i].y = node.y; break;
                case 'left': node.ports.in[i].x = node.x; node.ports.in[i].y = node.y + nh / 2; break;
            }
        });
        // Out ports
        spec.out.forEach((p, i) => {
            if (!node.ports.out[i]) node.ports.out[i] = { x: 0, y: 0 };
            switch (p.side) {
                case 'bottom': node.ports.out[i].x = node.x + nw / 2; node.ports.out[i].y = node.y + nh; break;
                case 'right': node.ports.out[i].x = node.x + nw; node.ports.out[i].y = node.y + nh / 2; break;
                case 'left': node.ports.out[i].x = node.x; node.ports.out[i].y = node.y + nh / 2; break;
                case 'top': node.ports.out[i].x = node.x + nw / 2; node.ports.out[i].y = node.y; break;
            }
        });
        // Trim
        node.ports.in.length = spec.in.length;
        node.ports.out.length = spec.out.length;
    },

    _drawPorts(ctx, node, isSelected) {
        const isHoveredNode = this._hoveredNode && this._hoveredNode.id === node.id;
        const basePortR = isHoveredNode ? 9 : 7;
        const drawPort = (px, py, isHovered, isTarget) => {
            const portR = isHovered ? basePortR + 3 : basePortR;
            // Glow when hovering or targeting during connect
            if (isHovered || isTarget) {
                ctx.beginPath();
                ctx.arc(px, py, portR + 4, 0, Math.PI * 2);
                ctx.fillStyle = isTarget ? 'rgba(114,84,204,0.25)' : 'rgba(114,84,204,0.15)';
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(px, py, portR, 0, Math.PI * 2);
            ctx.fillStyle = isHovered || isTarget ? '#7254cc' : (isHoveredNode ? '#3a3a5c' : '#2a2a45');
            ctx.fill();
            ctx.strokeStyle = isHovered || isTarget ? '#a78bfa' : (isHoveredNode ? '#777' : '#555');
            ctx.lineWidth = 2 / this._zoom;
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(px, py, 2 / this._zoom, 0, Math.PI * 2);
            ctx.fillStyle = isHovered || isTarget ? '#fff' : 'transparent';
            ctx.fill();
        };

        if (node.ports) {
            (node.ports.in || []).forEach(p => {
                const hovered = this._connecting && this._hitTestPortAt(p.x, p.y);
                const isTargetPort = this._connecting && this._hitTestPortAt(p.x, p.y);
                drawPort(p.x, p.y, hovered, isTargetPort);
            });
            (node.ports.out || []).forEach(p => {
                const hovered = this._hoveredPort && this._hoveredPort.type === 'out' && this._hoveredPort.port.x === p.x && this._hoveredPort.port.y === p.y;
                drawPort(p.x, p.y, hovered, false);
            });
        }
    },

    // ================================================================
    // DRAW EDGE
    // ================================================================
    _drawEdge(ctx, edge) {
        const fromNode = this._nodes.find(n => n.id === edge.from_node);
        const toNode = this._nodes.find(n => n.id === edge.to_node);
        if (!fromNode || !toNode) return;

        const fp = (fromNode.ports && fromNode.ports.out && fromNode.ports.out[edge.from_port]) || { x: fromNode.x + 90, y: fromNode.y + 70 };
        const tp = (toNode.ports && toNode.ports.in && toNode.ports.in[edge.to_port]) || { x: toNode.x + 90, y: toNode.y };

        const isSelected = this._selectedEdge && this._selectedEdge.id === edge.id;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#a78bfa' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = (isSelected ? 2.5 : 1.8) / this._zoom;
        ctx.beginPath();

        // Bezier curve
        const dx = tp.x - fp.x;
        const dy = tp.y - fp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.min(Math.max(dist * 0.4, 40), 150);

        let cp1x = fp.x, cp1y = fp.y + offset;
        let cp2x = tp.x, cp2y = tp.y - offset;

        // Adjust for horizontal connections (left/right ports)
        if (Math.abs(dx) > Math.abs(dy)) {
            cp1x = fp.x + offset * Math.sign(dx);
            cp1y = fp.y;
            cp2x = tp.x - offset * Math.sign(dx);
            cp2y = tp.y;
        }

        ctx.moveTo(fp.x, fp.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tp.x, tp.y);
        ctx.stroke();

        // Arrow head
        const arrowSize = 8 / this._zoom;
        const angle = Math.atan2(tp.y - cp2y, tp.x - cp2x);
        ctx.beginPath();
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x - arrowSize * Math.cos(angle - 0.4), tp.y - arrowSize * Math.sin(angle - 0.4));
        ctx.lineTo(tp.x - arrowSize * Math.cos(angle + 0.4), tp.y - arrowSize * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#a78bfa' : 'rgba(255,255,255,0.3)';
        ctx.fill();

        // Edge label
        if (edge.label) {
            const midX = (fp.x + tp.x) / 2;
            const midY = (fp.y + tp.y) / 2;
            ctx.font = `500 ${10}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tm = ctx.measureText(edge.label);
            ctx.fillStyle = 'rgba(14,14,26,0.85)';
            ctx.fillRect(midX - tm.width / 2 - 4, midY - 7, tm.width + 8, 14);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(edge.label, midX, midY);
        }

        ctx.restore();
    },

    _drawConnectingLine(ctx) {
        if (!this._connecting) return;
        const { fromX, fromY, toX, toY } = this._connecting;

        ctx.save();
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2 / this._zoom;
        ctx.setLineDash([6 / this._zoom, 4 / this._zoom]);
        ctx.beginPath();
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.min(Math.max(dist * 0.3, 30), 120);
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(fromX, fromY + offset, toX, toY - offset, toX, toY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    // ================================================================
    // HIT TESTING
    // ================================================================
    _hitTestNode(cx, cy) {
        // Check in reverse order (top nodes first)
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const node = this._nodes[i];
            const nw = node.width || 180;
            const nh = node.height || 70;
            const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;

            if (typeDef.shape === 'diamond') {
                // Point in diamond test
                const dx = cx - (node.x + nw / 2);
                const dy = cy - (node.y + nh / 2);
                if (Math.abs(dx) / (nw / 2) + Math.abs(dy) / (nh / 2) <= 1) return node;
            } else {
                if (cx >= node.x && cx <= node.x + nw && cy >= node.y && cy <= node.y + nh) return node;
            }
        }
        return null;
    },

    _hitTestPort(node, cx, cy) {
        if (!node.ports) return null;
        const threshold = 20;
        // Check output ports first (for starting connections)
        for (let i = 0; i < (node.ports.out || []).length; i++) {
            const p = node.ports.out[i];
            var dx = cx - p.x, dy = cy - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
                return { type: 'out', index: i, port: p };
            }
        }
        for (let i = 0; i < (node.ports.in || []).length; i++) {
            const p = node.ports.in[i];
            var dx = cx - p.x, dy = cy - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
                return { type: 'in', index: i, port: p };
            }
        }
        return null;
    },

    _hitTestPortAt(px, py) {
        if (!this._connecting) return false;
        const dx = this._connecting.toX - px;
        const dy = this._connecting.toY - py;
        return Math.sqrt(dx * dx + dy * dy) < 22;
    },

    _findClosestPort(cx, cy, excludeNodeId) {
        let closest = null;
        let minDist = 30; // max snap distance
        for (const node of this._nodes) {
            if (node.id === excludeNodeId) continue;
            this._updatePorts(node);
            for (const p of (node.ports.in || [])) {
                const d = Math.sqrt((cx - p.x) ** 2 + (cy - p.y) ** 2);
                if (d < minDist) { minDist = d; closest = { node, port: p, index: node.ports.in.indexOf(p) }; }
            }
        }
        return closest;
    },

    _hitTestEdge(cx, cy) {
        for (let i = this._edges.length - 1; i >= 0; i--) {
            const edge = this._edges[i];
            const fromNode = this._nodes.find(n => n.id === edge.from_node);
            const toNode = this._nodes.find(n => n.id === edge.to_node);
            if (!fromNode || !toNode) continue;
            const fp = (fromNode.ports && fromNode.ports.out && fromNode.ports.out[edge.from_port]) || { x: fromNode.x + 90, y: fromNode.y + 70 };
            const tp = (toNode.ports && toNode.ports.in && toNode.ports.in[edge.to_port]) || { x: toNode.x + 90, y: toNode.y };
            // Simple distance check to line midpoint
            const mx = (fp.x + tp.x) / 2;
            const my = (fp.y + tp.y) / 2;
            const dist = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
            if (dist < 30) return edge;
        }
        return null;
    },

    // ================================================================
    // MOUSE EVENTS
    // ================================================================
    _onMouseDown(e) {
        if (!this._canvas) return;
        const pos = this._screenToCanvas(e.clientX, e.clientY);

        // Pan: middle-click or right-click
        if (e.button === 1 || e.button === 2) {
            this._isPanning = true;
            this._panStartX = e.clientX;
            this._panStartY = e.clientY;
            this._panStartPanX = this._panX;
            this._panStartPanY = this._panY;
            this._canvas.style.cursor = 'grabbing';
            return;
        }

        // Left click
        if (e.button === 0) {
            const hitNode = this._hitTestNode(pos.x, pos.y);

            if (hitNode) {
                // Check if clicking a port
                this._updatePorts(hitNode);
                const port = this._hitTestPort(hitNode, pos.x, pos.y);
                if (port && port.type === 'out') {
                    // Start connecting
                    this._connecting = {
                        fromNode: hitNode,
                        fromPortIndex: port.index,
                        fromX: port.port.x,
                        fromY: port.port.y,
                        toX: pos.x,
                        toY: pos.y
                    };
                    return;
                }
                if (port && port.type === 'in') {
                    // Clicking an in port does nothing (prevents accidental drag)
                    return;
                }
                // Select node
                this._selectedNode = hitNode;
                this._selectedEdge = null;
                // Start dragging
                this._dragging = {
                    node: hitNode,
                    offsetX: pos.x - hitNode.x,
                    offsetY: pos.y - hitNode.y,
                    startX: hitNode.x,
                    startY: hitNode.y,
                    moved: false
                };
                this._canvas.style.cursor = 'move';
            } else {
                // Check edge hit
                const hitEdge = this._hitTestEdge(pos.x, pos.y);
                if (hitEdge) {
                    this._selectedEdge = hitEdge;
                    this._selectedNode = null;
                } else {
                    this._selectedNode = null;
                    this._selectedEdge = null;
                    // Start panning with left click on empty area
                    this._isPanning = true;
                    this._panStartX = e.clientX;
                    this._panStartY = e.clientY;
                    this._panStartPanX = this._panX;
                    this._panStartPanY = this._panY;
                    this._canvas.style.cursor = 'grabbing';
                }
            }
            this._renderProperties();
            this._render();
        }
    },

    _onMouseMove(e) {
        if (!this._canvas) return;
        const pos = this._screenToCanvas(e.clientX, e.clientY);

        // Panning
        if (this._isPanning) {
            this._panX = this._panStartPanX + (e.clientX - this._panStartX);
            this._panY = this._panStartPanY + (e.clientY - this._panStartY);
            this._render();
            return;
        }

        // Connecting
        if (this._connecting) {
            this._connecting.toX = pos.x;
            this._connecting.toY = pos.y;
            this._render();
            return;
        }

        // Dragging node
        if (this._dragging) {
            let nx = pos.x - this._dragging.offsetX;
            let ny = pos.y - this._dragging.offsetY;
            if (this._snapToGrid) {
                nx = Math.round(nx / this._gridSize) * this._gridSize;
                ny = Math.round(ny / this._gridSize) * this._gridSize;
            }
            this._dragging.node.x = nx;
            this._dragging.node.y = ny;
            this._dragging.moved = true;
            this._render();
            return;
        }

        // Hover cursor
        const hitNode = this._hitTestNode(pos.x, pos.y);
        const prevHoveredNode = this._hoveredNode;
        const prevHoveredPort = this._hoveredPort;
        if (hitNode) {
            this._updatePorts(hitNode);
            const port = this._hitTestPort(hitNode, pos.x, pos.y);
            this._hoveredNode = hitNode;
            this._hoveredPort = port;
            if (port && port.type === 'out') {
                this._canvas.style.cursor = 'crosshair';
            } else {
                this._canvas.style.cursor = 'move';
            }
        } else {
            this._hoveredNode = null;
            this._hoveredPort = null;
            this._canvas.style.cursor = 'default';
        }
        // Only re-render for port visuals if hover state changed or while connecting
        if (this._hoveredNode !== prevHoveredNode || this._hoveredPort !== prevHoveredPort || this._connecting) {
            this._render();
        }
    },

    _onMouseUp(e) {
        if (!this._canvas) return;
        const pos = this._screenToCanvas(e.clientX, e.clientY);

        // End connecting
        if (this._connecting) {
            // Find target node/port — snap to closest port within range
            const closest = this._findClosestPort(pos.x, pos.y, this._connecting.fromNode.id);
            if (closest) {
                const edgeId = generateId();
                const typeDef = NODE_TYPES[this._connecting.fromNode.type] || NODE_TYPES.action;
                const portLabel = (typeDef.ports.out[this._connecting.fromPortIndex] || {}).label || '';
                this._edges.push({
                    id: edgeId,
                    from_node: this._connecting.fromNode.id,
                    from_port: this._connecting.fromPortIndex,
                    to_node: closest.node.id,
                    to_port: closest.index,
                    label: portLabel
                });
                this._triggerAutoSave();
            }
            this._connecting = null;
            this._render();
        }

        // End dragging
        if (this._dragging) {
            if (this._dragging.moved) {
                this._triggerAutoSave();
            }
            this._dragging = null;
            this._canvas.style.cursor = 'default';
        }

        // End panning
        if (this._isPanning) {
            this._isPanning = false;
            this._canvas.style.cursor = 'default';
        }
    },

    _onWheel(e) {
        if (!this._canvas) return;
        e.preventDefault();

        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const oldZoom = this._zoom;
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        this._zoom = Math.max(0.3, Math.min(3, this._zoom + delta));

        // Zoom towards mouse position
        this._panX = mx - (mx - this._panX) * (this._zoom / oldZoom);
        this._panY = my - (my - this._panY) * (this._zoom / oldZoom);

        this._updateZoomLabel();
        this._render();
    },

    _onDblClick(e) {
        if (!this._canvas) return;
        const pos = this._screenToCanvas(e.clientX, e.clientY);

        const hitNode = this._hitTestNode(pos.x, pos.y);
        if (hitNode) {
            // Edit node label inline
            this._editNodeLabel(hitNode);
        } else {
            // Add new node — show type picker
            this._showNodePicker(pos.x, pos.y);
        }
    },

    // ================================================================
    // NODE OPERATIONS
    // ================================================================
    _addNode(type, x, y) {
        const typeDef = NODE_TYPES[type] || NODE_TYPES.action;
        if (this._snapToGrid) {
            x = Math.round(x / this._gridSize) * this._gridSize;
            y = Math.round(y / this._gridSize) * this._gridSize;
        }
        const nw = type === 'decision' ? 160 : 180;
        const nh = type === 'decision' ? 100 : 70;
        const node = {
            id: generateId(),
            type: type,
            x: x - nw / 2,
            y: y - nh / 2,
            width: nw,
            height: nh,
            label: typeDef.defaultData.label,
            data: JSON.parse(JSON.stringify(typeDef.defaultData)),
            ports: { in: [], out: [] }
        };
        this._nodes.push(node);
        this._selectedNode = node;
        this._selectedEdge = null;
        this._updatePorts(node);
        this._triggerAutoSave();
        this._renderProperties();
        this._render();
        return node;
    },

    _deleteSelected() {
        if (this._selectedNode) {
            const nodeId = this._selectedNode.id;
            this._nodes = this._nodes.filter(n => n.id !== nodeId);
            this._edges = this._edges.filter(e => e.from_node !== nodeId && e.to_node !== nodeId);
            this._selectedNode = null;
            this._triggerAutoSave();
            this._renderProperties();
            this._render();
            showToast('Node deleted', 'info');
        } else if (this._selectedEdge) {
            this._edges = this._edges.filter(e => e.id !== this._selectedEdge.id);
            this._selectedEdge = null;
            this._triggerAutoSave();
            this._renderProperties();
            this._render();
            showToast('Edge deleted', 'info');
        }
    },

    _updateNodePosition(id, x, y) {
        const node = this._nodes.find(n => n.id === id);
        if (node) {
            node.x = x;
            node.y = y;
            this._updatePorts(node);
        }
    },

    async _editNodeLabel(node) {
        const fields = [
            { id: 'label', label: 'Label', type: 'text', placeholder: 'Node label', required: true, value: node.label }
        ];
        const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;
        if (typeDef.fields.includes('description')) {
            fields.push({ id: 'description', label: 'Description', type: 'textarea', placeholder: 'Description...', value: node.data.description || '' });
        }
        if (typeDef.fields.includes('event_type')) {
            fields.push({ id: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g. collision, timer', value: node.data.event_type || '' });
        }
        if (typeDef.fields.includes('true_label')) {
            fields.push({ id: 'true_label', label: 'True Label', type: 'text', placeholder: 'True branch label', value: node.data.true_label || '' });
        }
        if (typeDef.fields.includes('false_label')) {
            fields.push({ id: 'false_label', label: 'False Label', type: 'text', placeholder: 'False branch label', value: node.data.false_label || '' });
        }
        if (typeDef.fields.includes('fields')) {
            fields.push({ id: 'fields', label: 'Fields (comma-separated)', type: 'text', placeholder: 'field1, field2, ...', value: (node.data.fields || []).join(', ') });
        }

        const result = await showFormModal(`Edit ${typeDef.label} Node`, fields);
        if (result) {
            node.label = result.label;
            node.data = { ...node.data };
            for (const key of Object.keys(result)) {
                if (key === 'fields') {
                    node.data.fields = result.fields.split(',').map(s => s.trim()).filter(Boolean);
                } else {
                    node.data[key] = result[key];
                }
            }
            this._triggerAutoSave();
            this._renderProperties();
            this._render();
        }
    },

    // ================================================================
    // NODE PICKER (on double-click canvas)
    // ================================================================
    _showNodePicker(x, y) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'z-index:10000;';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:300px;">
                <div class="modal-header"><h3>Add Node</h3></div>
                <div class="modal-body" style="padding:12px 16px;display:flex;flex-direction:column;gap:6px;">
                    ${Object.entries(NODE_TYPES).map(([key, def]) => `
                        <button class="btn btn-ghost fc-picker-type" data-type="${key}" style="display:flex;align-items:center;gap:10px;justify-content:flex-start;width:100%;padding:10px 12px;">
                            <span style="width:14px;height:14px;border-radius:50%;background:${def.accent};flex-shrink:0;"></span>
                            <div style="text-align:left;">
                                <div style="font-weight:600;font-size:13px;">${escapeHtml(def.label)}</div>
                                <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(def.defaultData.label)}</div>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>`;

        document.body.appendChild(overlay);
        const cleanup = () => { try { document.body.removeChild(overlay); } catch (e) {} };
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { cleanup(); return; }
            const btn = e.target.closest('.fc-picker-type');
            if (btn) {
                this._addNode(btn.dataset.type, x, y);
                cleanup();
            }
        });
    },

    // ================================================================
    // TOOLBAR
    // ================================================================
    _bindToolbar() {
        const zoomIn = document.getElementById('fc-zoom-in');
        const zoomOut = document.getElementById('fc-zoom-out');
        const zoomReset = document.getElementById('fc-zoom-reset');
        const addBtn = document.getElementById('fc-add-node-btn');
        const addDropdown = document.getElementById('fc-add-dropdown');
        const templateBtn = document.getElementById('fc-template-btn');
        const templateDropdown = document.getElementById('fc-template-dropdown');
        const snapBtn = document.getElementById('fc-snap-btn');
        const deleteBtn = document.getElementById('fc-delete-btn');
        const exportPng = document.getElementById('fc-export-png');
        const exportJson = document.getElementById('fc-export-json');
        const saveBtn = document.getElementById('fc-save-btn');

        if (zoomIn) zoomIn.addEventListener('click', () => this._setZoom(this._zoom + 0.15));
        if (zoomOut) zoomOut.addEventListener('click', () => this._setZoom(this._zoom - 0.15));
        if (zoomReset) zoomReset.addEventListener('click', () => { this._zoom = 1; this._panX = 0; this._panY = 0; this._updateZoomLabel(); this._render(); });

        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addDropdown.classList.toggle('hidden');
                templateDropdown.classList.add('hidden');
            });
        }
        if (templateBtn) {
            templateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                templateDropdown.classList.toggle('hidden');
                addDropdown.classList.add('hidden');
            });
        }

        this._toolbarClickHandler = (e) => {
            if (!e.target.closest('#fc-add-dropdown-wrap')) addDropdown && addDropdown.classList.add('hidden');
            if (!e.target.closest('#fc-template-dropdown-wrap')) templateDropdown && templateDropdown.classList.add('hidden');
        };
        document.addEventListener('click', this._toolbarClickHandler);

        // Add node from toolbar dropdown (place at center of viewport)
        $$('.fc-add-type').forEach(btn => {
            btn.addEventListener('click', () => {
                addDropdown.classList.add('hidden');
                const rect = this._canvas.getBoundingClientRect();
                const cx = (rect.width / 2 - this._panX) / this._zoom;
                const cy = (rect.height / 2 - this._panY) / this._zoom;
                this._addNode(btn.dataset.type, cx, cy);
            });
        });

        // Template buttons
        $$('.fc-tpl-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                templateDropdown.classList.add('hidden');
                this._loadTemplate(btn.dataset.tpl);
            });
        });

        if (snapBtn) {
            snapBtn.addEventListener('click', () => {
                this._snapToGrid = !this._snapToGrid;
                snapBtn.classList.toggle('btn-primary', this._snapToGrid);
                snapBtn.classList.toggle('btn-ghost', !this._snapToGrid);
                showToast(this._snapToGrid ? 'Snap to grid: ON' : 'Snap to grid: OFF', 'info');
            });
            // Set initial style
            snapBtn.classList.toggle('btn-primary', this._snapToGrid);
            snapBtn.classList.toggle('btn-ghost', !this._snapToGrid);
        }

        if (deleteBtn) deleteBtn.addEventListener('click', () => this._deleteSelected());
        if (exportPng) exportPng.addEventListener('click', () => this._exportPNG());
        if (exportJson) exportJson.addEventListener('click', () => this._exportJSON());
        if (saveBtn) saveBtn.addEventListener('click', () => this._saveCurrentChart());
    },

    _bindKeyboard() {
        this._keyHandler = (e) => {
            if (App.currentSection !== 'flowcharts') return;
            // Don't intercept if focus is in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this._deleteSelected();
            }
            if (e.key === 'Escape') {
                this._selectedNode = null;
                this._selectedEdge = null;
                this._connecting = null;
                this._dragging = null;
                this._isPanning = false;
                this._hoveredNode = null;
                this._hoveredPort = null;
                this._renderProperties();
                this._render();
            }
            if (e.key === '+' || e.key === '=') { this._setZoom(this._zoom + 0.15); }
            if (e.key === '-') { this._setZoom(this._zoom - 0.15); }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this._saveCurrentChart();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _setZoom(z) {
        const rect = this._canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const oldZoom = this._zoom;
        this._zoom = Math.max(0.3, Math.min(3, z));
        this._panX = cx - (cx - this._panX) * (this._zoom / oldZoom);
        this._panY = cy - (cy - this._panY) * (this._zoom / oldZoom);
        this._updateZoomLabel();
        this._render();
    },

    _updateZoomLabel() {
        const label = document.getElementById('fc-zoom-label');
        if (label) label.textContent = Math.round(this._zoom * 100) + '%';
    },

    // ================================================================
    // SIDEBAR
    // ================================================================
    _bindSidebar() {
        const newBtn = document.getElementById('fc-new-btn');
        if (newBtn) newBtn.addEventListener('click', () => this._showNewChartDialog());
    },

    _renderChartList() {
        const list = document.getElementById('fc-chart-list');
        if (!list) return;

        if (this._flowcharts.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No diagrams yet.</p>';
            return;
        }

        list.innerHTML = this._flowcharts.map(chart => {
            const isActive = this._currentChart && this._currentChart.id === chart.id;
            const nodeCount = (chart.data ? JSON.parse(chart.data || '{"nodes":[]}').nodes || [] : []).length;
            return `
                <div class="flowchart-node-list-item" data-chart-id="${escapeHtml(chart.id)}"
                     style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;border:1px solid ${isActive ? 'var(--accent)' : 'transparent'};background:${isActive ? 'rgba(114,84,204,0.1)' : 'transparent'};"
                     onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${isActive ? 'rgba(114,84,204,0.1)' : 'transparent'}'">
                    <div style="flex:1;min-width:0;" data-action="open">
                        <div style="font-size:13px;font-weight:600;color:var(--text-normal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(chart.name || 'Untitled')}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${nodeCount} nodes &middot; ${formatDate(chart.updated_at || chart.created_at)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm fc-delete-chart" data-chart-id="${escapeHtml(chart.id)}" data-action="delete"
                            style="color:var(--text-muted);padding:2px 6px;flex-shrink:0;opacity:0.5;" title="Delete"
                            onmouseenter="this.style.opacity='1';this.style.color='#ef4444'" onmouseleave="this.style.opacity='0.5';this.style.color='var(--text-muted)'">
                        &times;
                    </button>
                </div>`;
        }).join('');

        list.querySelectorAll('.flowchart-node-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="delete"]')) {
                    e.stopPropagation();
                    this._confirmDeleteChart(item.dataset.chartId);
                    return;
                }
                this._openChart(item.dataset.chartId);
            });
        });
    },

    _renderProperties() {
        const content = document.getElementById('fc-props-content');
        if (!content) return;

        if (this._selectedNode) {
            const node = this._selectedNode;
            const typeDef = NODE_TYPES[node.type] || NODE_TYPES.action;
            const incomingEdges = this._edges.filter(e => e.to_node === node.id);
            const outgoingEdges = this._edges.filter(e => e.from_node === node.id);

            content.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <span style="width:12px;height:12px;border-radius:50%;background:${typeDef.accent};"></span>
                    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">${escapeHtml(typeDef.label)}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">ID</label>
                        <span style="font-size:12px;color:var(--text-muted);font-family:monospace;word-break:break-all;">${escapeHtml(node.id)}</span>
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Label</label>
                        <span style="font-size:13px;color:var(--text-normal);">${escapeHtml(node.label)}</span>
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Position</label>
                        <span style="font-size:12px;color:var(--text-muted);">x: ${Math.round(node.x)}, y: ${Math.round(node.y)}</span>
                    </div>
                    ${node.data && node.data.description ? `
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Description</label>
                        <span style="font-size:12px;color:var(--text-muted);">${escapeHtml(node.data.description)}</span>
                    </div>` : ''}
                    ${node.data && node.data.event_type ? `
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Event Type</label>
                        <span style="font-size:12px;color:var(--text-muted);">${escapeHtml(node.data.event_type)}</span>
                    </div>` : ''}
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Connections</label>
                        <span style="font-size:12px;color:var(--text-muted);">${incomingEdges.length} in, ${outgoingEdges.length} out</span>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="fc-edit-node-btn" style="margin-top:4px;">Edit Node</button>
                    <button class="btn btn-danger btn-sm" id="fc-delete-node-btn">Delete Node</button>
                </div>`;

            const editBtn = document.getElementById('fc-edit-node-btn');
            if (editBtn) editBtn.addEventListener('click', () => this._editNodeLabel(node));
            const deleteNodeBtn = document.getElementById('fc-delete-node-btn');
            if (deleteNodeBtn) deleteNodeBtn.addEventListener('click', () => this._deleteSelected());

        } else if (this._selectedEdge) {
            const edge = this._selectedEdge;
            const fromNode = this._nodes.find(n => n.id === edge.from_node);
            const toNode = this._nodes.find(n => n.id === edge.to_node);
            content.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Edge</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">From</label>
                        <span style="font-size:13px;color:var(--text-normal);">${escapeHtml(fromNode ? fromNode.label : 'Unknown')}</span>
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">To</label>
                        <span style="font-size:13px;color:var(--text-normal);">${escapeHtml(toNode ? toNode.label : 'Unknown')}</span>
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px;">Label</label>
                        <span style="font-size:12px;color:var(--text-muted);">${escapeHtml(edge.label || '(none)')}</span>
                    </div>
                    <button class="btn btn-danger btn-sm" id="fc-delete-edge-btn">Delete Edge</button>
                </div>`;
            const deleteEdgeBtn = document.getElementById('fc-delete-edge-btn');
            if (deleteEdgeBtn) deleteEdgeBtn.addEventListener('click', () => this._deleteSelected());

        } else if (!this._currentChart) {
            content.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Create or open a diagram to start editing.</p>';
        } else {
            content.innerHTML = `
                <div style="color:var(--text-muted);font-size:13px;display:flex;flex-direction:column;gap:8px;">
                    <p>Click a node to select it.</p>
                    <p style="font-size:11px;opacity:0.7;">Double-click canvas to add a node.</p>
                    <p style="font-size:11px;opacity:0.7;">Double-click a node to edit.</p>
                    <p style="font-size:11px;opacity:0.7;">Drag from port to connect.</p>
                    <p style="font-size:11px;opacity:0.7;">Scroll to zoom. Drag empty area to pan.</p>
                    <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-normal);">
                        <span style="font-size:11px;opacity:0.5;">Nodes: ${this._nodes.length} &middot; Edges: ${this._edges.length}</span>
                    </div>
                </div>`;
        }
    },

    // ================================================================
    // DATA — Load/Save/Create/Delete charts
    // ================================================================
    async _loadCharts() {
        const a = api();
        if (!a) return;
        try {
            this._flowcharts = await a.get_flowcharts(null);
        } catch (e) {
            this._flowcharts = [];
        }
        this._renderChartList();
    },

    async _openChart(chartId) {
        const a = api();
        if (!a) return;
        try {
            const chart = await a.get_flowchart(chartId);
            this._currentChart = chart;
            const data = JSON.parse(chart.data || '{"nodes":[],"edges":[]}');
            this._nodes = data.nodes || [];
            this._edges = data.edges || [];
            // Ensure all nodes have ports and dimensions
            this._nodes.forEach(n => {
                if (!n.width) n.width = n.type === 'decision' ? 160 : 180;
                if (!n.height) n.height = n.type === 'decision' ? 100 : 70;
                if (!n.ports) n.ports = { in: [], out: [] };
                if (!n.data) n.data = {};
                this._updatePorts(n);
            });
            this._selectedNode = null;
            this._selectedEdge = null;
            this._renderChartList();
            this._renderProperties();
            this._render();
        } catch (e) {
            showToast('Error loading chart', 'error');
        }
    },

    async _saveCurrentChart() {
        if (!this._currentChart) return;
        const a = api();
        if (!a) { showToast('API not available', 'warning'); return; }

        const data = JSON.stringify({ nodes: this._nodes, edges: this._edges });
        try {
            const updated = await a.update_flowchart(this._currentChart.id, this._currentChart.name, data, null);
            this._currentChart = updated;
            showToast('Diagram saved', 'success');
            await this._loadCharts();
        } catch (e) {
            showToast('Error saving: ' + e.message, 'error');
        }
    },

    _triggerAutoSave() {
        this._clearAutoSave();
        this._autoSaveTimer = setTimeout(() => {
            if (this._currentChart) this._saveCurrentChart();
        }, 1500);
    },

    _clearAutoSave() {
        if (this._autoSaveTimer) { clearTimeout(this._autoSaveTimer); this._autoSaveTimer = null; }
    },

    async _showNewChartDialog() {
        const fields = [
            { id: 'name', label: 'Diagram Name', type: 'text', placeholder: 'My Flowchart', required: true },
            {
                id: 'template', label: 'Template (optional)', type: 'select',
                options: [
                    { value: '', label: 'Blank' },
                    ...Object.entries(TEMPLATES).map(([k, v]) => ({ value: k, label: v.name }))
                ]
            }
        ];
        const result = await showFormModal('New Diagram', fields);
        if (result) {
            const tpl = result.template || null;
            await this._createChart(result.name, tpl);
        }
    },

    async _createChart(name, template) {
        const a = api();
        if (!a) { showToast('API not available', 'warning'); return; }

        const tplData = template ? this._loadTemplateData(template) : { nodes: [], edges: [] };
        const data = JSON.stringify(tplData);

        try {
            const chart = await a.create_flowchart(name, data, null, template);
            this._flowcharts.unshift(chart);
            this._renderChartList();
            await this._openChart(chart.id);
            showToast('Diagram created', 'success');
        } catch (e) {
            showToast('Error creating chart: ' + e.message, 'error');
        }
    },

    async _confirmDeleteChart(chartId) {
        const chart = this._flowcharts.find(c => c.id === chartId);
        if (!chart) return;

        const confirmed = await showModal(
            'Delete Diagram',
            `Delete "${chart.name}"? This cannot be undone.`,
            'Delete',
            'btn-danger'
        );
        if (confirmed) {
            await this._deleteChart(chartId);
        }
    },

    async _deleteChart(id) {
        const a = api();
        if (a) {
            try { await a.delete_flowchart(id); } catch (e) { showToast('Error deleting', 'error'); return; }
        }
        this._flowcharts = this._flowcharts.filter(c => c.id !== id);
        if (this._currentChart && this._currentChart.id === id) {
            this._currentChart = null;
            this._nodes = [];
            this._edges = [];
            this._selectedNode = null;
            if (this._flowcharts.length > 0) {
                await this._openChart(this._flowcharts[0].id);
            } else {
                this._renderProperties();
                this._render();
            }
        }
        this._renderChartList();
        showToast('Diagram deleted', 'info');
    },

    _loadTemplateData(templateName) {
        const tpl = TEMPLATES[templateName];
        if (!tpl) return { nodes: [], edges: [] };
        return tpl.build();
    },

    _loadTemplate(templateName) {
        const data = this._loadTemplateData(templateName);
        this._nodes = data.nodes || [];
        this._edges = data.edges || [];
        this._nodes.forEach(n => {
            if (!n.width) n.width = n.type === 'decision' ? 160 : 180;
            if (!n.height) n.height = n.type === 'decision' ? 100 : 70;
            if (!n.ports) n.ports = { in: [], out: [] };
            if (!n.data) n.data = {};
            this._updatePorts(n);
        });
        this._selectedNode = null;
        this._selectedEdge = null;
        // Center the view
        this._zoom = 1;
        this._panX = 0;
        this._panY = 0;
        this._updateZoomLabel();
        this._triggerAutoSave();
        this._renderProperties();
        this._render();
        const tplName = (TEMPLATES[templateName] || {}).name || templateName;
        showToast(`Loaded template: ${tplName}`, 'success');
    },

    // ================================================================
    // EXPORT
    // ================================================================
    async _exportPNG() {
        if (!this._canvas) return;

        const a = api();
        if (!a) {
            // Fallback: auto-download if no API available
            this._exportPNGFallback();
            return;
        }

        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this._nodes.forEach(n => {
            minX = Math.min(minX, n.x - 40);
            minY = Math.min(minY, n.y - 40);
            maxX = Math.max(maxX, n.x + (n.width || 180) + 40);
            maxY = Math.max(maxY, n.y + (n.height || 70) + 40);
        });
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

        const padding = 60;
        const w = maxX - minX + padding * 2;
        const h = maxY - minY + padding * 2;

        // Create a temporary canvas with dark background for export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = w * 2;
        exportCanvas.height = h * 2;
        exportCtx.scale(2, 2);

        exportCtx.fillStyle = '#0e0e1a';
        exportCtx.fillRect(0, 0, w, h);
        exportCtx.save();
        exportCtx.translate(-minX + padding, -minY + padding);
        this._edges.forEach(edge => this._drawEdge(exportCtx, edge));
        this._nodes.forEach(node => this._drawNode(exportCtx, node));
        exportCtx.restore();

        // Get the data URL
        const dataUrl = exportCanvas.toDataURL('image/png');
        // Extract base64 data
        const base64Data = dataUrl.split(',')[1];

        // Ask user where to save
        const defaultName = (this._currentChart ? this._currentChart.name : 'flowchart') + '.png';
        try {
            const result = await a.save_file_dialog('Guardar diagrama como PNG', defaultName, 'PNG');
            if (result && result.success && result.path) {
                const saveResult = await a.save_base64_to_file(result.path, base64Data);
                if (saveResult && saveResult.success) {
                    showToast('Diagrama guardado en: ' + result.path, 'success');
                } else {
                    showToast('Error al guardar: ' + ((saveResult && saveResult.message) || 'desconocido'), 'error');
                }
            } else if (!result || result.cancelled) {
                showToast('Exportacion cancelada', 'info');
            }
        } catch (e) {
            console.error('[Flowchart] Error saving PNG:', e);
            // Fallback to auto-download
            this._exportPNGFallback();
        }
    },

    _exportPNGFallback() {
        // Original auto-download fallback
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this._nodes.forEach(n => {
            minX = Math.min(minX, n.x - 40);
            minY = Math.min(minY, n.y - 40);
            maxX = Math.max(maxX, n.x + (n.width || 180) + 40);
            maxY = Math.max(maxY, n.y + (n.height || 70) + 40);
        });
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

        const padding = 60;
        const w = maxX - minX + padding * 2;
        const h = maxY - minY + padding * 2;

        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = w * 2;
        exportCanvas.height = h * 2;
        exportCtx.scale(2, 2);
        exportCtx.fillStyle = '#0e0e1a';
        exportCtx.fillRect(0, 0, w, h);
        exportCtx.save();
        exportCtx.translate(-minX + padding, -minY + padding);
        this._edges.forEach(edge => this._drawEdge(exportCtx, edge));
        this._nodes.forEach(node => this._drawNode(exportCtx, node));
        exportCtx.restore();

        const link = document.createElement('a');
        link.download = (this._currentChart ? this._currentChart.name : 'flowchart') + '.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
        showToast('Exported as PNG (auto-download)', 'success');
    },

    async _exportJSON() {
        const data = {
            nodes: this._nodes,
            edges: this._edges,
            meta: {
                name: this._currentChart ? this._currentChart.name : 'flowchart',
                exported: new Date().toISOString()
            }
        };
        const jsonStr = JSON.stringify(data, null, 2);

        // Try to use save file dialog
        const a = api();
        const defaultName = (this._currentChart ? this._currentChart.name : 'flowchart') + '.json';

        if (a) {
            try {
                const result = await a.save_file_dialog('Guardar diagrama como JSON', defaultName, 'JSON');
                if (result && result.success && result.path) {
                    // Encode to base64 for transport
                    const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
                    const saveResult = await a.save_base64_to_file(result.path, base64Data);
                    if (saveResult && saveResult.success) {
                        showToast('Diagrama guardado en: ' + result.path, 'success');
                        return;
                    } else {
                        showToast('Error al guardar: ' + ((saveResult && saveResult.message) || 'desconocido'), 'error');
                    }
                } else if (!result || result.cancelled) {
                    showToast('Exportacion cancelada', 'info');
                    return;
                }
            } catch (e) {
                console.error('[Flowchart] Error saving JSON:', e);
            }
        }

        // Fallback: auto-download
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = defaultName;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Exported as JSON (auto-download)', 'success');
    }
});
