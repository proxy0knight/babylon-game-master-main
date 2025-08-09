import { Router } from '@/utils/Router';
import { ApiClient } from '@/utils/ApiClient';

type LinkMode = 'replace' | 'overlay';

interface SceneNode {
  id: number;
  name: string;
  x: number;
  y: number;
  triggers?: string[]; // Dynamic trigger IDs found in scene code
}

interface SceneEdge {
  id: number;
  fromNodeId: number;
  fromPort: 'top' | 'right' | 'bottom' | 'left' | string; // Allow trigger IDs as ports
  toNodeId: number;
  toPort: 'top' | 'right' | 'bottom' | 'left' | string; // Allow trigger IDs as ports
  mode: LinkMode;
}

export class SceneFlow {
  private container: HTMLElement;
  private router: Router;
  private api: ApiClient;

  private scenes: Array<{ name: string }> = [];
  private nodes: SceneNode[] = [];
  private edges: SceneEdge[] = [];
  private nextNodeId = 1;
  private nextEdgeId = 1;
  private currentFlowName: string | null = null;

  private svg: SVGSVGElement | null = null;
  private selectedPort: { nodeId: number; port: string } | null = null;
  private selectedNodeId: number | null = null;
  private selectedEdgeId: number | null = null;
  private selectedNodeIds: Set<number> = new Set();
  private selectedEdgeIds: Set<number> = new Set();
  private draggingNodeId: number | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private scale: number = 1;
  private translate: { x: number; y: number } = { x: 0, y: 0 };
  private isPanning: boolean = false;
  private lastPan: { x: number; y: number } = { x: 0, y: 0 };
  private linkingFrom: { nodeId: number; port: string } | null = null;
  private tempLine: SVGLineElement | null = null;
  private pendingConnection: { fromNodeId: number; fromPort: string; toNodeId: number; toPort: string } | null = null;

  constructor(container: HTMLElement, router: Router) {
    this.container = container;
    this.router = router;
    this.api = new ApiClient();
  }

  async initialize(): Promise<void> {
    this.render();
    this.attachHandlers();
    await this.loadScenes();
    this.renderSceneList();
    this.renderGraph();
    this.centerOnStartNode();
    try {
      const active = localStorage.getItem('activeFlowName');
      if (active) {
        await this.loadFlowByName(active);
        this.currentFlowName = active;
      }
    } catch {}
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="flow">
        <div class="flow-header">
          <div class="left">
            <button id="flow-back" class="btn">← رجوع</button>
            <h2>مخطط المشاهد</h2>
          </div>
          <div class="right">
            <button id="flow-clear" class="btn">🧹 مسح المخطط</button>
          </div>
        </div>
        <div class="flow-toolbar">
          <button id="flow-save" class="btn">💾 حفظ</button>
          <button id="flow-saveas" class="btn">📄 حفظ باسم</button>
          <button id="flow-load" class="btn">📂 تحميل</button>
          <button id="flow-start" class="btn primary">🎮 بدء اللعبة</button>
          <button id="flow-set-active" class="btn">⭐ تعيين كالنشط</button>
          <button id="flow-refresh-triggers" class="btn">🔄 تحديث المحفزات</button>
          <button id="flow-add-start" class="btn">🚀 إضافة عقدة البداية</button>
           <button id="flow-delete-node" class="btn">🗑 حذف العقدة المحددة</button>
            <button id="flow-delete-link" class="btn">✖️ حذف الرابط المحدد</button>
            <span style="flex:1"></span>
          <button id="flow-zoom-out" class="btn">−</button>
          <button id="flow-zoom-reset" class="btn">⟳</button>
          <button id="flow-zoom-in" class="btn">＋</button>
          <button id="flow-export" class="btn">⬇️ تصدير</button>
          <label class="btn" style="margin:0;">
            ⬆️ استيراد
            <input id="flow-import-input" type="file" accept="application/json" style="display:none" />
          </label>
        </div>
        <div class="flow-body">
          <div class="flow-left">
            <div class="panel">
              <div class="panel-header">المشاهد المحفوظة</div>
              <div class="panel-content">
                <ul id="scene-list" class="scene-list"></ul>
              </div>
            </div>
          </div>
          <div class="flow-right">
            <div id="graph-host" class="graph-host"></div>
          </div>
        </div>
      </div>
      <div id="flow-load-overlay" class="overlay hidden">
        <div class="overlay-content">
          <div class="overlay-header">
            <h3>تحميل مخطط</h3>
            <div class="row"><button id="flow-load-close" class="btn">✕ إغلاق</button></div>
          </div>
          <div id="flow-list" class="asset-list"></div>
        </div>
      </div>

      <!-- Link Type Selection Modal -->
      <div id="link-type-modal" class="overlay hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3>نوع الربط</h3>
          </div>
          <div class="modal-body">
            <p>اختر نوع الربط بين العقدتين:</p>
            <div class="link-options">
              <button id="link-replace" class="btn link-option">
                <div class="option-title">Replace (استبدال)</div>
                <div class="option-desc">ينتقل إلى المشهد الجديد ويستبدل المشهد الحالي</div>
              </button>
              <button id="link-overlay" class="btn link-option">
                <div class="option-title">Overlay (تراكب)</div>
                <div class="option-desc">يضع المشهد الجديد فوق المشهد الحالي</div>
              </button>
            </div>
            <div class="modal-actions">
              <button id="link-cancel" class="btn">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
      <style>
        .flow { display:flex; flex-direction:column; height:100vh; width:100%; background:#1e1e1e; color:#d4d4d4; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .flow-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; background:#2d2d30; border-bottom:1px solid #3e3e42; }
        .flow-body { flex:1; min-height:0; display:flex; width:100%; }
        .flow-toolbar { display:flex; gap:.5rem; padding:.5rem; background:#252526; border-bottom:1px solid #3e3e42; }
        .flow-left { flex:0 0 30%; max-width:520px; min-width:240px; border-inline-end:1px solid #3e3e42; overflow:auto; }
        .flow-right { flex:1 1 70%; min-width:0; position:relative; overflow:hidden; }
        .panel { margin:0.75rem; background:#252526; border:1px solid #3e3e42; border-radius:6px; overflow:hidden; }
        .panel-header { padding:0.5rem 0.75rem; border-bottom:1px solid #3e3e42; font-weight:600; }
        .panel-content { padding:0.5rem; }
        .scene-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.25rem; }
        .scene-item { padding:0.4rem 0.6rem; border:1px solid #3e3e42; border-radius:4px; background:#2b2b2f; cursor:grab; }
        .scene-item:active { cursor:grabbing; }
        .graph-host { position:absolute; inset:0; background:#111; user-select:none; -webkit-user-select:none; -moz-user-select:none; -ms-user-select:none; }
        @media (max-width: 900px) {
          .flow-body { flex-direction:column; }
          .flow-left { flex:0 0 auto; max-height:40vh; }
          .flow-right { flex:1 1 auto; }
        }
        .btn { background:transparent; color:#d4d4d4; border:1px solid #3e3e42; border-radius:4px; padding:0.35rem 0.65rem; cursor:pointer; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:50; }
        .overlay.hidden { display:none; }
        .overlay-content { width:min(800px, 90vw); height:min(520px, 80vh); background:#1f1f1f; border:1px solid #3e3e42; border-radius:8px; display:flex; flex-direction:column; }
        .overlay-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; border-bottom:1px solid #3e3e42; }
        .asset-list { padding:0.75rem; overflow:auto; display:flex; flex-direction:column; gap:0.5rem; }
        .asset-row { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:#252526; border:1px solid #3e3e42; border-radius:6px; padding:0.5rem; }
        .asset-row .name { font-weight:600; }

        .modal-content { width:400px; background:#1f1f1f; border:1px solid #3e3e42; border-radius:8px; display:flex; flex-direction:column; }
        .modal-header { padding:1rem 1.25rem; border-bottom:1px solid #3e3e42; }
        .modal-header h3 { margin:0; }
        .modal-body { padding:1.25rem; }
        .modal-body p { margin:0 0 1rem 0; color:#b3b3b3; }
        .link-options { display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem; }
        .link-option { text-align:right; padding:0.75rem; border:2px solid #3e3e42; background:#252526; }
        .link-option:hover { border-color:#007acc; background:#2d2d30; }
        .option-title { font-weight:600; margin-bottom:0.25rem; }
        .option-desc { font-size:0.85rem; color:#9b9b9b; line-height:1.3; }
        .modal-actions { display:flex; justify-content:center; }
      </style>
    `;
  }

  private attachHandlers(): void {
    const back = document.getElementById('flow-back');
    const clear = document.getElementById('flow-clear');
    const saveBtn = document.getElementById('flow-save');
    const saveAsBtn = document.getElementById('flow-saveas');
    const loadBtn = document.getElementById('flow-load');
    const startBtn = document.getElementById('flow-start');
    const setActiveBtn = document.getElementById('flow-set-active');
    const refreshTriggersBtn = document.getElementById('flow-refresh-triggers');
    const addStartBtn = document.getElementById('flow-add-start');
    const delNodeBtn = document.getElementById('flow-delete-node');
    const delSelectedBtn = document.getElementById('flow-delete-selected');
    const renameBtn = document.getElementById('flow-rename');
    const deleteFlowBtn = document.getElementById('flow-delete-flow');
    const deleteLinkBtn = document.getElementById('flow-delete-link');
    const exportBtn = document.getElementById('flow-export') as HTMLButtonElement | null;
    const importInput = document.getElementById('flow-import-input') as HTMLInputElement | null;
    const zoomInBtn = document.getElementById('flow-zoom-in');
    const zoomOutBtn = document.getElementById('flow-zoom-out');
    const zoomResetBtn = document.getElementById('flow-zoom-reset');
    back?.addEventListener('click', () => this.router.navigate('/admin'));
    clear?.addEventListener('click', () => { this.nodes = []; this.edges = []; this.renderGraph(); });
    saveBtn?.addEventListener('click', () => this.saveFlowPrompt(false));
    saveAsBtn?.addEventListener('click', () => this.saveFlowPrompt(true));
    loadBtn?.addEventListener('click', () => this.openLoadOverlay());
    startBtn?.addEventListener('click', () => this.startGame());
    setActiveBtn?.addEventListener('click', () => this.setActiveCurrent());
    refreshTriggersBtn?.addEventListener('click', () => this.refreshAllTriggers());
    addStartBtn?.addEventListener('click', () => this.addGameStartNode());
    delNodeBtn?.addEventListener('click', () => this.deleteSelectedNode());
    deleteLinkBtn?.addEventListener('click', () => this.deleteSelectedLink());
    delSelectedBtn?.addEventListener('click', () => this.deleteSelected());
    renameBtn?.addEventListener('click', () => this.renameFlowPrompt());
    deleteFlowBtn?.addEventListener('click', () => this.deleteFlowPrompt());
    exportBtn?.addEventListener('click', () => this.exportFlow());
    importInput?.addEventListener('change', (e) => this.importFlow(e));
    zoomInBtn?.addEventListener('click', () => this.zoomIn());
    zoomOutBtn?.addEventListener('click', () => this.zoomOut());
    zoomResetBtn?.addEventListener('click', () => this.zoomReset());

    // Link type modal handlers
    const linkReplaceBtn = document.getElementById('link-replace');
    const linkOverlayBtn = document.getElementById('link-overlay');
    const linkCancelBtn = document.getElementById('link-cancel');
    linkReplaceBtn?.addEventListener('click', () => this.createConnection('replace'));
    linkOverlayBtn?.addEventListener('click', () => this.createConnection('overlay'));
    linkCancelBtn?.addEventListener('click', () => this.closeLinkTypeModal());

    const host = document.getElementById('graph-host') as HTMLDivElement | null;
    if (host) {
      // Setup SVG graph layer
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.display = 'block';
      svg.style.userSelect = 'none';
      svg.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
      host.appendChild(svg);
      this.svg = svg as SVGSVGElement;

      // Add Game Start trigger node (centered position)
      this.nodes.push({ id: this.nextNodeId++, name: 'Game Start', x: 400, y: 300, triggers: [] });

      // Zoom and pan handlers
      svg.addEventListener('wheel', (ev: WheelEvent) => {
        ev.preventDefault();
        const rect = svg.getBoundingClientRect();
        const cursorX = ev.clientX - rect.left;
        const cursorY = ev.clientY - rect.top;
        const beforeX = (cursorX - this.translate.x) / this.scale;
        const beforeY = (cursorY - this.translate.y) / this.scale;
        const delta = ev.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.min(2, Math.max(0.3, this.scale * delta));
        this.translate.x = cursorX - beforeX * this.scale;
        this.translate.y = cursorY - beforeY * this.scale;
        this.renderGraph();
      }, { passive: false });
      svg.addEventListener('pointerdown', (ev: PointerEvent) => {
        // Middle button or right button pans
        if (ev.button === 1 || ev.button === 2) {
          this.isPanning = true;
          this.lastPan = { x: ev.clientX, y: ev.clientY };
          try {
            (ev.target as Element).setPointerCapture?.(ev.pointerId);
          } catch (e) {
            // Ignore pointer capture errors
          }
        }
      });
      svg.addEventListener('pointermove', (ev: PointerEvent) => {
        if (this.isPanning) {
          const dx = ev.clientX - this.lastPan.x;
          const dy = ev.clientY - this.lastPan.y;
          this.translate.x += dx;
          this.translate.y += dy;
          this.lastPan = { x: ev.clientX, y: ev.clientY };
          this.renderGraph();
        } else if (this.draggingNodeId !== null) {
          // Handle node dragging globally
          const node = this.nodes.find(n => n.id === this.draggingNodeId);
          if (node) {
            const p = this.screenToWorld(ev.clientX, ev.clientY);
            node.x = p.x - this.dragOffset.x;
            node.y = p.y - this.dragOffset.y;
            this.renderGraph();
          }
        } else if (this.linkingFrom && this.svg) {
          const p = this.screenToWorld(ev.clientX, ev.clientY);
          const [sx, sy] = this.worldToScreen(...this.portCenterByNodeId(this.linkingFrom.nodeId, this.linkingFrom.port));
          if (!this.tempLine) {
            this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            this.tempLine.setAttribute('stroke', '#90caf9');
            this.tempLine.setAttribute('stroke-width', '2');
            this.svg.appendChild(this.tempLine);
          }
          this.tempLine.setAttribute('x1', String(sx));
          this.tempLine.setAttribute('y1', String(sy));
          const [ex, ey] = this.worldToScreen(p.x, p.y);
          this.tempLine.setAttribute('x2', String(ex));
          this.tempLine.setAttribute('y2', String(ey));
        }
      });
      svg.addEventListener('pointerup', (ev: PointerEvent) => {
        if (this.isPanning) {
          this.isPanning = false;
          try {
            (ev.target as Element).releasePointerCapture?.(ev.pointerId);
          } catch (e) {
            // Ignore pointer capture errors
          }
        }
        if (this.draggingNodeId !== null) {
          this.draggingNodeId = null;
          this.saveFlowDebounced();
        }
        if (this.linkingFrom) {
          const target = ev.target as SVGElement;
          const nodeAttr = target.getAttribute('data-node-id');
          const portAttr = target.getAttribute('data-port');
          const toNodeId = nodeAttr ? Number(nodeAttr) : null;
          const toPort = portAttr || null;
          if (toNodeId && toPort && toNodeId !== this.linkingFrom.nodeId) {
            // Store pending connection and show selection modal
            this.pendingConnection = {
              fromNodeId: this.linkingFrom.nodeId,
              fromPort: this.linkingFrom.port,
              toNodeId,
              toPort
            };
            this.showLinkTypeModal();
          }
          this.linkingFrom = null;
          if (this.tempLine && this.svg) { try { this.svg.removeChild(this.tempLine); } catch {}; this.tempLine = null; }
          // Small delay before re-rendering to prevent flickering
          setTimeout(() => this.renderGraph(), 10);
        }
      });
    }
  }

  private async loadScenes(): Promise<void> {
    try {
      const data = await this.api.listAssets('scene');
      this.scenes = (data.assets || []).map((a: any) => ({ name: a.name }));
    } catch {
      this.scenes = [];
    }
  }

  private renderSceneList(): void {
    const ul = document.getElementById('scene-list');
    if (!ul) return;
    ul.innerHTML = '';
    this.scenes.forEach(s => {
      const li = document.createElement('li');
      li.className = 'scene-item';
      li.textContent = s.name;
      li.draggable = true;
      li.addEventListener('dragstart', ev => {
        ev.dataTransfer?.setData('text/plain', s.name);
      });
      // Quick insert into graph by click
      li.addEventListener('click', () => this.addNode(s.name, 240 + Math.random()*200, 120 + Math.random()*120));
      ul.appendChild(li);
    });
    // enable drop on graph
    const host = document.getElementById('graph-host');
    if (host) {
      host.addEventListener('dragover', ev => {
        // Only allow drop if not currently dragging a node
        if (this.draggingNodeId === null) {
          ev.preventDefault();
        }
      });
      host.addEventListener('drop', ev => {
        // Only handle drop if not currently dragging a node
        if (this.draggingNodeId === null) {
          ev.preventDefault();
          const name = ev.dataTransfer?.getData('text/plain');
          if (!name) return;
          const rect = host.getBoundingClientRect();
          const p = this.screenToWorld(ev.clientX, ev.clientY);
          this.addNode(name, p.x, p.y);
        }
      });
    }
  }

  private async addNode(name: string, x: number, y: number): Promise<void> {
    const triggers = await this.parseSceneTriggers(name);
    this.nodes.push({ id: this.nextNodeId++, name, x, y, triggers });
    this.renderGraph();
  }

  private async parseSceneTriggers(sceneName: string): Promise<string[]> {
    try {
      // Try to load the scene code from the API
      const sceneData = await this.api.loadAsset('scene', sceneName);
      if (!sceneData?.data?.code) return [];
      
      const code = sceneData.data.code;
      const triggers: string[] = [];
      
      // Parse FLOW_TRIGGER comments: // FLOW_TRIGGER: id=triggerName
      const triggerRegex = /\/\/\s*FLOW_TRIGGER:\s*id=([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let match;
      
      while ((match = triggerRegex.exec(code)) !== null) {
        const triggerId = match[1];
        if (!triggers.includes(triggerId)) {
          triggers.push(triggerId);
        }
      }
      
      return triggers;
    } catch (error) {
      console.warn(`Could not parse triggers for scene ${sceneName}:`, error);
      return [];
    }
  }

  private async refreshAllTriggers(): Promise<void> {
    try {
      for (const node of this.nodes) {
        if (node.name !== 'Game Start') { // Skip the Game Start node
          node.triggers = await this.parseSceneTriggers(node.name);
        }
      }
      this.renderGraph();
      alert('تم تحديث جميع المحفزات بنجاح');
    } catch (error) {
      alert('فشل في تحديث المحفزات');
      console.error('Error refreshing triggers:', error);
    }
  }

  private renderGraph(): void {
    if (!this.svg) return;
    const svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Draw edges first
    this.edges.forEach(edge => {
      const from = this.nodes.find(n => n.id === edge.fromNodeId);
      const to = this.nodes.find(n => n.id === edge.toNodeId);
      if (!from || !to) return;
      const [fx, fy] = this.portCenterByNodeId(from.id, edge.fromPort);
      const [tx, ty] = this.portCenterByNodeId(to.id, edge.toPort);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(fx * this.scale + this.translate.x));
      line.setAttribute('y1', String(fy * this.scale + this.translate.y));
      line.setAttribute('x2', String(tx * this.scale + this.translate.x));
      line.setAttribute('y2', String(ty * this.scale + this.translate.y));
      const color = edge.mode === 'replace' ? '#4fc3f7' : '#ab47bc';
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', this.selectedEdgeId === edge.id ? '4' : '2');
      line.style.cursor = 'pointer';
      line.addEventListener('click', () => { this.selectedEdgeId = edge.id; this.renderGraph(); });
      svg.appendChild(line);
      // Label
      const midX = (fx + tx) / 2; const midY = (fy + ty) / 2;
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(midX * this.scale + this.translate.x + 6));
      label.setAttribute('y', String(midY * this.scale + this.translate.y - 6));
      label.setAttribute('fill', '#d4d4d4');
      label.setAttribute('font-size', '11');
      label.textContent = edge.mode === 'replace' ? 'replace' : 'overlay';
      svg.appendChild(label);
    });

    // Draw nodes
    this.nodes.forEach(node => {
      // Ensure node has triggers array (defensive programming)
      if (!node.triggers || !Array.isArray(node.triggers)) {
        node.triggers = [];
      }
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x * this.scale + this.translate.x}, ${node.y * this.scale + this.translate.y}) scale(${this.scale})`);

      // Background rectangle (drawn first, lower z-index)
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-40'); rect.setAttribute('y', '-28');
      rect.setAttribute('width', '80'); rect.setAttribute('height', '56');
      rect.setAttribute('rx', '8'); rect.setAttribute('ry', '8');
      const isSelected = this.selectedNodeId === node.id;
      rect.setAttribute('fill', isSelected ? '#2f3640' : '#263238');
      rect.setAttribute('stroke', isSelected ? '#00bcd4' : '#546e7a');
      rect.setAttribute('stroke-width', isSelected ? '2' : '1');
      rect.style.pointerEvents = 'none'; // Don't interfere with port clicks
      g.appendChild(rect);

      // Node label (prevent text selection)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '0'); label.setAttribute('y', '20');
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('fill', '#d4d4d4'); label.setAttribute('font-size', '12');
      label.style.userSelect = 'none';
      label.style.pointerEvents = 'none';
      label.textContent = node.name;
      g.appendChild(label);

      // Standard ports (top, right, bottom, left)
      (['top','right','bottom','left'] as const).forEach(port => {
        const [px, py] = this.portCenter(node, port);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        p.setAttribute('r', '7');
        p.setAttribute('cx', String(px - node.x)); p.setAttribute('cy', String(py - node.y));
        p.setAttribute('fill', 'rgba(144, 202, 249, 0.2)');
        p.setAttribute('stroke', '#90caf9'); p.setAttribute('stroke-width', '2');
        p.style.cursor = 'crosshair';
        p.setAttribute('data-node-id', String(node.id));
        p.setAttribute('data-port', String(port));
        
        this.addPortEvents(p, node.id, port);
        g.appendChild(p);
      });

      // Dynamic trigger ports
      if (node.triggers && Array.isArray(node.triggers) && node.triggers.length > 0) {
        node.triggers.forEach((triggerId, index) => {
          const angle = (Math.PI * 2 / node.triggers!.length) * index - Math.PI / 2; // Start from top
          const radius = 50; // Distance from center
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          
          // Trigger port (different style)
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          p.setAttribute('r', '8');
          p.setAttribute('cx', String(px)); p.setAttribute('cy', String(py));
          p.setAttribute('fill', 'rgba(255, 193, 7, 0.3)'); // Yellow/amber color
          p.setAttribute('stroke', '#ffc107'); p.setAttribute('stroke-width', '2');
          p.style.cursor = 'crosshair';
          p.setAttribute('data-node-id', String(node.id));
          p.setAttribute('data-port', triggerId);
          
          this.addPortEvents(p, node.id, triggerId);
          g.appendChild(p);
          
          // Trigger label
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', String(px + 12)); 
          label.setAttribute('y', String(py + 4));
          label.setAttribute('fill', '#ffc107'); 
          label.setAttribute('font-size', '10');
          label.setAttribute('font-weight', '600');
          label.style.userSelect = 'none';
          label.style.pointerEvents = 'none';
          label.textContent = triggerId;
          g.appendChild(label);
        });
      }

      // Center dragging dot (drawn last, highest z-index)
      const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      center.setAttribute('r', '6'); center.setAttribute('cx', '0'); center.setAttribute('cy', '-4');
      center.setAttribute('fill', '#90caf9');
      center.style.cursor = 'grab';
      // Dragging only from center dot
      center.addEventListener('pointerdown', (ev: PointerEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        center.style.cursor = 'grabbing';
        this.selectedNodeId = node.id;
        this.renderGraph();
        this.draggingNodeId = node.id;
        const p = this.screenToWorld(ev.clientX, ev.clientY);
        this.dragOffset = { x: p.x - node.x, y: p.y - node.y };
        try {
          (ev.target as Element).setPointerCapture?.(ev.pointerId);
        } catch (e) {
          // Ignore pointer capture errors
        }
      });
      center.addEventListener('pointerup', () => {
        center.style.cursor = 'grab';
      });
      g.appendChild(center);

      svg.appendChild(g);
    });
  }

  private addPortEvents(portElement: SVGCircleElement, nodeId: number, port: string): void {
    let isHovering = false;
    
    // Hover effect (only when not linking)
    portElement.addEventListener('mouseenter', () => {
      if (this.linkingFrom) return; // Don't show hover effects while linking
      isHovering = true;
      const currentFill = portElement.getAttribute('fill');
      if (currentFill?.includes('144, 202, 249')) {
        portElement.setAttribute('fill', 'rgba(144, 202, 249, 0.4)');
      } else {
        portElement.setAttribute('fill', 'rgba(255, 193, 7, 0.5)');
      }
      portElement.setAttribute('stroke-width', '3');
    });
    
    portElement.addEventListener('mouseleave', () => {
      if (this.linkingFrom) return; // Don't modify styles while linking
      isHovering = false;
      setTimeout(() => {
        if (!isHovering && !this.linkingFrom) { // Double check we're not hovering or linking
          const currentFill = portElement.getAttribute('fill');
          if (currentFill?.includes('144, 202, 249')) {
            portElement.setAttribute('fill', 'rgba(144, 202, 249, 0.2)');
          } else {
            portElement.setAttribute('fill', 'rgba(255, 193, 7, 0.3)');
          }
          portElement.setAttribute('stroke-width', '2');
        }
      }, 50); // Small delay to prevent flickering
    });
    
    // Drag-out linking
    portElement.addEventListener('pointerdown', (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.linkingFrom = { nodeId, port };
    });
  }

  private portCenter(node: SceneNode, port: 'top' | 'right' | 'bottom' | 'left'): [number, number] {
    const w = 80, h = 56;
    const x0 = node.x - w/2, y0 = node.y - h/2;
    switch (port) {
      case 'top': return [x0 + w/2, y0];
      case 'right': return [x0 + w, y0 + h/2];
      case 'bottom': return [x0 + w/2, y0 + h];
      case 'left': return [x0, y0 + h/2];
    }
  }

  private worldToScreen(x: number, y: number): [number, number] {
    return [x * this.scale + this.translate.x, y * this.scale + this.translate.y];
  }

  private portCenterByNodeId(nodeId: number, port: string): [number, number] {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return [0, 0];
    
    // Handle standard ports
    if (['top', 'right', 'bottom', 'left'].includes(port)) {
      return this.portCenter(node, port as 'top' | 'right' | 'bottom' | 'left');
    }
    
    // Handle trigger ports
    if (node.triggers && Array.isArray(node.triggers) && node.triggers.includes(port)) {
      const index = node.triggers.indexOf(port);
      const angle = (Math.PI * 2 / node.triggers.length) * index - Math.PI / 2;
      const radius = 50;
      return [
        node.x + Math.cos(angle) * radius,
        node.y + Math.sin(angle) * radius
      ];
    }
    
    return [node.x, node.y]; // Fallback to center
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.svg) return { x: 0, y: 0 };
    const rect = this.svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return { x: (sx - this.translate.x) / this.scale, y: (sy - this.translate.y) / this.scale };
  }

  private centerOnStartNode(): void {
    if (!this.svg) return;
    const startNode = this.nodes.find(n => n.name === 'Game Start');
    if (!startNode) return;
    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    this.translate.x = centerX - startNode.x * this.scale;
    this.translate.y = centerY - startNode.y * this.scale;
    this.renderGraph();
  }

  private zoomIn(): void {
    if (!this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const beforeX = (centerX - this.translate.x) / this.scale;
    const beforeY = (centerY - this.translate.y) / this.scale;
    this.scale = Math.min(2, this.scale * 1.2);
    this.translate.x = centerX - beforeX * this.scale;
    this.translate.y = centerY - beforeY * this.scale;
    this.renderGraph();
  }

  private zoomOut(): void {
    if (!this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const beforeX = (centerX - this.translate.x) / this.scale;
    const beforeY = (centerY - this.translate.y) / this.scale;
    this.scale = Math.max(0.3, this.scale / 1.2);
    this.translate.x = centerX - beforeX * this.scale;
    this.translate.y = centerY - beforeY * this.scale;
    this.renderGraph();
  }

  private zoomReset(): void {
    this.scale = 1;
    this.translate = { x: 0, y: 0 };
    this.centerOnStartNode();
  }

  private showLinkTypeModal(): void {
    const modal = document.getElementById('link-type-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Add escape key listener
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.closeLinkTypeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
  }

  private closeLinkTypeModal(): void {
    const modal = document.getElementById('link-type-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.pendingConnection = null;
    // Re-render to reset any hover states
    this.renderGraph();
  }

  private createConnection(mode: LinkMode): void {
    if (!this.pendingConnection) return;
    
    const { fromNodeId, fromPort, toNodeId, toPort } = this.pendingConnection;
    this.edges.push({ 
      id: this.nextEdgeId++, 
      fromNodeId, 
      fromPort, 
      toNodeId, 
      toPort, 
      mode 
    });
    
    this.closeLinkTypeModal();
    this.renderGraph();
    this.saveFlowDebounced();
  }

  private onPortClick(nodeId: number, port: string): void {
    if (!this.selectedPort) {
      this.selectedPort = { nodeId, port };
      return;
    }
    // if clicked same node/port, clear selection
    if (this.selectedPort.nodeId === nodeId && this.selectedPort.port === port) {
      this.selectedPort = null;
      return;
    }
    const from = this.selectedPort;
    const to = { nodeId, port };
    this.selectedPort = null;
    // choose link mode
    const mode = window.prompt('نوع الربط: replace أو overlay', 'replace');
    const linkMode: LinkMode = (mode === 'overlay') ? 'overlay' : 'replace';
    this.edges.push({ id: this.nextEdgeId++, fromNodeId: from.nodeId, fromPort: from.port, toNodeId: to.nodeId, toPort: to.port, mode: linkMode });
    this.renderGraph();
    // Save current flow snapshot (optional inline save)
    this.saveFlowDebounced();
  }

  // --- Saving/Loading flow (as asset type 'flow') ---
  private saveTimer: any = null;
  private saveFlowDebounced(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveFlow(), 500);
  }

  private async saveFlow(): Promise<void> {
    try {
      const name = this.currentFlowName || 'default-flow';
      const data = JSON.stringify({ nodes: this.nodes, edges: this.edges });
      await this.api.saveAsset('flow', name, data);
    } catch {}
  }

  private async saveFlowPrompt(forceAskName: boolean): Promise<void> {
    let name = this.currentFlowName || '';
    if (forceAskName || !name) {
      name = window.prompt('اسم المخطط للحفظ:', name || 'default-flow') || '';
    }
    if (!name) return;
    this.currentFlowName = name;
    await this.saveFlow();
    
    // Bundle all scenes and their assets with the flow
    await this.bundleFlowAssets(name);
    
    alert('تم حفظ المخطط مع جميع المشاهد والأصول');
  }

  private async bundleFlowAssets(flowName: string): Promise<void> {
    try {
      console.log('Bundling flow assets for:', flowName);
      
      // Get all unique scene names from the flow
      const sceneNames = this.getUniqueSceneNames();
      console.log('Scene names to bundle:', sceneNames);
      
      if (sceneNames.length === 0) {
        console.log('No scenes to bundle for flow');
        return; // No scenes to bundle
      }

      // Bundle the entire flow with all scenes and assets
      const response = await fetch('http://localhost:5001/api/assets/bundle-flow-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          flowName,
          sceneNames,
          flowData: { nodes: this.nodes, edges: this.edges }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bundle flow assets response error:', errorText);
      } else {
        const result = await response.json();
        console.log('Flow assets bundled successfully:', result);
      }
    } catch (error) {
      console.error('Flow asset bundling failed:', error);
      alert('فشل في تجميع أصول المخطط - تحقق من اتصال الخادم');
    }
  }

  private getUniqueSceneNames(): string[] {
    const sceneNames = new Set<string>();
    
    // Extract scene names from nodes (excluding Game Start)
    this.nodes.forEach(node => {
      if (node.name !== 'Game Start') {
        sceneNames.add(node.name);
      }
    });
    
    return Array.from(sceneNames);
  }

  private async loadFlowByName(name: string): Promise<void> {
    try {
      const res = await this.api.loadAsset('flow', name);
      const code = res?.data?.code;
      const parsed = typeof code === 'string' ? JSON.parse(code) : code;
      if (!parsed) return;
      
      // Restore flow assets before loading the flow
      await this.restoreFlowAssets(name);
      
      this.nodes = (parsed.nodes || []).map((node: any) => ({
        ...node,
        triggers: Array.isArray(node.triggers) ? node.triggers : []
      }));
      this.edges = parsed.edges || [];
      this.nextNodeId = (this.nodes.reduce((m: number, n: SceneNode) => Math.max(m, n.id), 0) || 0) + 1;
      this.nextEdgeId = (this.edges.reduce((m: number, e: SceneEdge) => Math.max(m, e.id), 0) || 0) + 1;
      this.currentFlowName = name;
      this.selectedNodeId = null;
      
      // Refresh triggers for all loaded nodes
      await this.refreshAllTriggers();
      
      this.renderGraph();
    } catch {
      alert('تعذر تحميل المخطط');
    }
  }

  private async restoreFlowAssets(flowName: string): Promise<void> {
    try {
      console.log('Restoring flow assets for:', flowName);
      
      // Clear existing external-import folder
      const clearResponse = await fetch('http://localhost:5001/api/assets/clear-external', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!clearResponse.ok) {
        const errorText = await clearResponse.text();
        console.error('Clear external assets error:', errorText);
      } else {
        console.log('External assets cleared successfully');
      }

      // Restore all bundled assets to external-import
      const restoreResponse = await fetch('http://localhost:5001/api/assets/restore-flow-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowName })
      });
      
      if (!restoreResponse.ok) {
        const errorText = await restoreResponse.text();
        console.error('Restore flow assets error:', errorText);
      } else {
        const result = await restoreResponse.json();
        console.log('Flow assets restored successfully:', result);
      }
    } catch (error) {
      console.error('Asset restoration failed:', error);
      alert('فشل في استعادة أصول المخطط - تحقق من اتصال الخادم');
    }
  }

  private async startGame(): Promise<void> {
    if (!this.currentFlowName) {
      alert('احفظ المخطط أولاً قبل بدء اللعبة');
      return;
    }

    try {
      // Ensure current flow is saved with latest changes
      await this.saveFlow();
      await this.bundleFlowAssets(this.currentFlowName);
      
      // Restore assets to external-import for gameplay
      await this.restoreFlowAssets(this.currentFlowName);
      
      // Set this flow as the active flow
      this.setActiveFlow(this.currentFlowName);
      
      // Navigate to the game runner
      alert('تم تحضير اللعبة مع جميع الأصول. سيتم تشغيل اللعبة الآن.');
      
      // Here you would typically navigate to a game runner component
      // For now, we'll just demonstrate the concept
      this.router.navigate('/game-runner');
      
    } catch (error) {
      alert('فشل في تحضير اللعبة');
      console.error('Game start failed:', error);
    }
  }

  private openLoadOverlay(): void {
    const ov = document.getElementById('flow-load-overlay');
    const close = document.getElementById('flow-load-close');
    if (!ov || !close) return;
    ov.classList.remove('hidden');
    close.addEventListener('click', () => ov.classList.add('hidden'));
    this.populateFlowList();
  }

  private async populateFlowList(): Promise<void> {
    const list = document.getElementById('flow-list');
    if (!list) return;
    list.innerHTML = 'جاري التحميل...';
    try {
      const res = await this.api.listAssets('flow');
      const flows: Array<{ name: string }> = res.assets || [];
      list.innerHTML = '';
      flows.forEach(f => {
        const row = document.createElement('div');
        row.className = 'asset-row';
        const span = document.createElement('span'); span.className = 'name'; span.textContent = f.name;
        const loadBtn = document.createElement('button'); loadBtn.className = 'btn'; loadBtn.textContent = 'تحميل';
        loadBtn.addEventListener('click', async () => {
          await this.loadFlowByName(f.name);
          const ov = document.getElementById('flow-load-overlay'); ov?.classList.add('hidden');
        });
        const activateBtn = document.createElement('button'); activateBtn.className = 'btn'; activateBtn.textContent = 'تعيين نشط';
        activateBtn.addEventListener('click', () => { this.setActiveFlow(f.name); alert('تم تعيينه كالنشط'); });
        row.appendChild(span); row.appendChild(loadBtn); row.appendChild(activateBtn);
        list.appendChild(row);
      });
    } catch {
      list.textContent = 'فشل التحميل';
    }
  }

  private setActiveFlow(name: string): void {
    try { 
      localStorage.setItem('activeFlowName', name);
      console.log('Active flow set to:', name);
      console.log('Active flow in localStorage:', localStorage.getItem('activeFlowName'));
    } catch (error) {
      console.error('Failed to set active flow:', error);
    }
  }

  private setActiveCurrent(): void {
    if (!this.currentFlowName) {
      alert('احفظ المخطط أولاً باسم.');
      return;
    }
    this.setActiveFlow(this.currentFlowName);
    alert('تم تعيين المخطط الحالي كالنشط');
  }

  private addGameStartNode(): void {
    // Check if Game Start node already exists
    const existingGameStart = this.nodes.find(node => node.name === 'Game Start');
    if (existingGameStart) {
      alert('عقدة "Game Start" موجودة بالفعل في المخطط');
      return;
    }

    // Create Game Start node
    const gameStartNode: SceneNode = {
      id: this.nextNodeId++,
      name: 'Game Start',
      x: 400,
      y: 300,
      triggers: []
    };

    this.nodes.push(gameStartNode);
    this.renderGraph();
    this.saveFlowDebounced();
    
    alert('تم إضافة عقدة "Game Start" بنجاح. هذه العقدة تمثل نقطة البداية للمخطط.');
  }

  private deleteSelectedNode(): void {
    if (!this.selectedNodeId) {
      alert('اختر عقدة أولاً');
      return;
    }
    const id = this.selectedNodeId;
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.fromNodeId !== id && e.toNodeId !== id);
    this.selectedNodeId = null;
    this.renderGraph();
    this.saveFlowDebounced();
  }

  private deleteSelectedLink(): void {
    if (!this.selectedEdgeId && this.selectedEdgeIds.size === 0) {
      alert('اختر رابطاً أولاً');
      return;
    }
    const ids = new Set<number>();
    if (this.selectedEdgeId) ids.add(this.selectedEdgeId);
    this.selectedEdgeIds.forEach(id => ids.add(id));
    this.edges = this.edges.filter(e => !ids.has(e.id));
    this.selectedEdgeId = null;
    this.selectedEdgeIds.clear();
    this.renderGraph();
    this.saveFlowDebounced();
  }

  private deleteSelected(): void {
    if (this.selectedNodeIds.size === 0 && this.selectedEdgeIds.size === 0) {
      alert('لا يوجد عناصر محددة');
      return;
    }
    this.nodes = this.nodes.filter(n => !this.selectedNodeIds.has(n.id));
    this.edges = this.edges.filter(e => !this.selectedEdgeIds.has(e.id) && !this.selectedNodeIds.has(e.fromNodeId) && !this.selectedNodeIds.has(e.toNodeId));
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.renderGraph();
    this.saveFlowDebounced();
  }

  private renameFlowPrompt(): void {
    const current = this.currentFlowName || 'default-flow';
    const name = window.prompt('اسم جديد للمخطط:', current);
    if (!name || name === current) return;
    this.currentFlowName = name;
    alert('سيتم الحفظ بالاسم الجديد عند الضغط على حفظ');
  }

  private async deleteFlowPrompt(): Promise<void> {
    const name = this.currentFlowName || window.prompt('اسم المخطط للحذف:') || '';
    if (!name) return;
    if (!confirm(`هل تريد حذف المخطط ${name}؟`)) return;
    try {
      await this.api.deleteAsset('flow', name);
      if (localStorage.getItem('activeFlowName') === name) localStorage.removeItem('activeFlowName');
      this.currentFlowName = null;
      this.nodes = []; this.edges = []; this.renderGraph();
      alert('تم الحذف');
    } catch {
      alert('فشل الحذف');
    }
  }

  private exportFlow(): void {
    const data = { name: this.currentFlowName || 'default-flow', nodes: this.nodes, edges: this.edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.name}.flow.json`; a.click();
    URL.revokeObjectURL(url);
  }

  private async importFlow(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      this.nodes = (parsed.nodes || []).map((node: any) => ({
        ...node,
        triggers: Array.isArray(node.triggers) ? node.triggers : []
      }));
      this.edges = parsed.edges || [];
      this.currentFlowName = parsed.name || this.currentFlowName || 'imported-flow';
      this.nextNodeId = (this.nodes.reduce((m: number, n: SceneNode) => Math.max(m, n.id), 0) || 0) + 1;
      this.nextEdgeId = (this.edges.reduce((m: number, e: SceneEdge) => Math.max(m, e.id), 0) || 0) + 1;
      this.renderGraph();
      alert('تم الاستيراد');
    } catch {
      alert('ملف غير صالح');
    }
  }
}


