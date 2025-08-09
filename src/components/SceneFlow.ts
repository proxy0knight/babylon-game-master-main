import { Router } from '@/utils/Router';
import { ApiClient } from '@/utils/ApiClient';

type LinkMode = 'replace' | 'overlay';

interface SceneNode {
  id: number;
  name: string;
  x: number;
  y: number;
}

interface SceneEdge {
  id: number;
  fromNodeId: number;
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  toNodeId: number;
  toPort: 'top' | 'right' | 'bottom' | 'left';
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
  private selectedPort: { nodeId: number; port: 'top' | 'right' | 'bottom' | 'left' } | null = null;
  private selectedNodeId: number | null = null;
  private selectedEdgeId: number | null = null;
  private draggingNodeId: number | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private scale: number = 1;
  private translate: { x: number; y: number } = { x: 0, y: 0 };
  private isPanning: boolean = false;
  private lastPan: { x: number; y: number } = { x: 0, y: 0 };
  private linkingFrom: { nodeId: number; port: 'top' | 'right' | 'bottom' | 'left' } | null = null;
  private tempLine: SVGLineElement | null = null;

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
          <button id="flow-set-active" class="btn">⭐ تعيين كالنشط</button>
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
        .graph-host { position:absolute; inset:0; background:#111; }
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
      </style>
    `;
  }

  private attachHandlers(): void {
    const back = document.getElementById('flow-back');
    const clear = document.getElementById('flow-clear');
    const saveBtn = document.getElementById('flow-save');
    const saveAsBtn = document.getElementById('flow-saveas');
    const loadBtn = document.getElementById('flow-load');
    const setActiveBtn = document.getElementById('flow-set-active');
    const delNodeBtn = document.getElementById('flow-delete-node');
    const delSelectedBtn = document.getElementById('flow-delete-selected');
    const renameBtn = document.getElementById('flow-rename');
    const deleteFlowBtn = document.getElementById('flow-delete-flow');
    const deleteLinkBtn = document.getElementById('flow-delete-link');
    const exportBtn = document.getElementById('flow-export') as HTMLButtonElement | null;
    const importInput = document.getElementById('flow-import-input') as HTMLInputElement | null;
    back?.addEventListener('click', () => this.router.navigate('/admin'));
    clear?.addEventListener('click', () => { this.nodes = []; this.edges = []; this.renderGraph(); });
    saveBtn?.addEventListener('click', () => this.saveFlowPrompt(false));
    saveAsBtn?.addEventListener('click', () => this.saveFlowPrompt(true));
    loadBtn?.addEventListener('click', () => this.openLoadOverlay());
    setActiveBtn?.addEventListener('click', () => this.setActiveCurrent());
    delNodeBtn?.addEventListener('click', () => this.deleteSelectedNode());
    deleteLinkBtn?.addEventListener('click', () => this.deleteSelectedLink());
    delSelectedBtn?.addEventListener('click', () => this.deleteSelected());
    renameBtn?.addEventListener('click', () => this.renameFlowPrompt());
    deleteFlowBtn?.addEventListener('click', () => this.deleteFlowPrompt());
    exportBtn?.addEventListener('click', () => this.exportFlow());
    importInput?.addEventListener('change', (e) => this.importFlow(e));

    const host = document.getElementById('graph-host') as HTMLDivElement | null;
    if (host) {
      // Setup SVG graph layer
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.display = 'block';
      host.appendChild(svg);
      this.svg = svg as SVGSVGElement;

      // Add Game Start trigger node (fixed position)
      this.nodes.push({ id: this.nextNodeId++, name: 'Game Start', x: 120, y: 100 });

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
          (ev.target as Element).setPointerCapture?.(ev.pointerId);
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
          (ev.target as Element).releasePointerCapture?.(ev.pointerId);
        }
        if (this.linkingFrom) {
          const target = ev.target as SVGElement;
          const nodeAttr = target.getAttribute('data-node-id');
          const portAttr = target.getAttribute('data-port');
          const toNodeId = nodeAttr ? Number(nodeAttr) : null;
          const toPort = (portAttr as ('top'|'right'|'bottom'|'left')) || null;
          if (toNodeId && toPort) {
            const from = this.linkingFrom;
            this.edges.push({ id: this.nextEdgeId++, fromNodeId: from.nodeId, fromPort: from.port, toNodeId, toPort, mode: 'replace' });
            this.saveFlowDebounced();
          }
          this.linkingFrom = null;
          if (this.tempLine && this.svg) { try { this.svg.removeChild(this.tempLine); } catch {}; this.tempLine = null; }
          this.renderGraph();
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
      host.addEventListener('dragover', ev => ev.preventDefault());
      host.addEventListener('drop', ev => {
        ev.preventDefault();
        const name = ev.dataTransfer?.getData('text/plain');
        if (!name) return;
        const rect = host.getBoundingClientRect();
        const x = (ev.clientX - rect.left);
        const y = (ev.clientY - rect.top);
        this.addNode(name, x, y);
      });
    }
  }

  private addNode(name: string, x: number, y: number): void {
    this.nodes.push({ id: this.nextNodeId++, name, x, y });
    this.renderGraph();
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
      const [fx, fy] = this.portCenter(from, edge.fromPort);
      const [tx, ty] = this.portCenter(to, edge.toPort);
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
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x * this.scale + this.translate.x}, ${node.y * this.scale + this.translate.y}) scale(${this.scale})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '-40'); rect.setAttribute('y', '-28');
      rect.setAttribute('width', '80'); rect.setAttribute('height', '56');
      rect.setAttribute('rx', '8'); rect.setAttribute('ry', '8');
      const isSelected = this.selectedNodeId === node.id;
      rect.setAttribute('fill', isSelected ? '#2f3640' : '#263238');
      rect.setAttribute('stroke', isSelected ? '#00bcd4' : '#546e7a');
      rect.setAttribute('stroke-width', isSelected ? '2' : '1');
      g.appendChild(rect);

      const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      center.setAttribute('r', '6'); center.setAttribute('cx', '0'); center.setAttribute('cy', '-4');
      center.setAttribute('fill', '#90caf9');
      // Dragging only from center dot
      center.addEventListener('pointerdown', (ev: PointerEvent) => {
        this.selectedNodeId = node.id;
        this.renderGraph();
        this.draggingNodeId = node.id;
        const p = this.screenToWorld(ev.clientX, ev.clientY);
        this.dragOffset = { x: p.x - node.x, y: p.y - node.y };
        (ev.target as Element).setPointerCapture?.(ev.pointerId);
      });
      center.addEventListener('pointermove', (ev: PointerEvent) => {
        if (this.draggingNodeId === node.id) {
          const p = this.screenToWorld(ev.clientX, ev.clientY);
          node.x = p.x - this.dragOffset.x;
          node.y = p.y - this.dragOffset.y;
          this.renderGraph();
        }
      });
      center.addEventListener('pointerup', (ev: PointerEvent) => {
        if (this.draggingNodeId === node.id) {
          this.draggingNodeId = null;
          (ev.target as Element).releasePointerCapture?.(ev.pointerId);
          this.saveFlowDebounced();
        }
      });
      g.appendChild(center);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '0'); label.setAttribute('y', '20');
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('fill', '#d4d4d4'); label.setAttribute('font-size', '12');
      label.textContent = node.name;
      g.appendChild(label);

      // Ports
      (['top','right','bottom','left'] as const).forEach(port => {
        const [px, py] = this.portCenter(node, port);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        p.setAttribute('r', '5'); p.setAttribute('cx', String(px - node.x)); p.setAttribute('cy', String(py - node.y));
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#90caf9'); p.setAttribute('stroke-width', '1.5');
        p.style.cursor = 'crosshair';
        p.setAttribute('data-node-id', String(node.id));
        p.setAttribute('data-port', String(port));
        // Drag-out linking
        p.addEventListener('pointerdown', (ev: PointerEvent) => {
          this.linkingFrom = { nodeId: node.id, port };
          ev.stopPropagation();
        });
        g.appendChild(p);
      });

      svg.appendChild(g);
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

  private portCenterByNodeId(nodeId: number, port: 'top' | 'right' | 'bottom' | 'left'): [number, number] {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return [0, 0];
    return this.portCenter(node, port);
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.svg) return { x: 0, y: 0 };
    const rect = this.svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return { x: (sx - this.translate.x) / this.scale, y: (sy - this.translate.y) / this.scale };
  }

  private onPortClick(nodeId: number, port: 'top' | 'right' | 'bottom' | 'left'): void {
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
    alert('تم حفظ المخطط');
  }

  private async loadFlowByName(name: string): Promise<void> {
    try {
      const res = await this.api.loadAsset('flow', name);
      const code = res?.data?.code;
      const parsed = typeof code === 'string' ? JSON.parse(code) : code;
      if (!parsed) return;
      this.nodes = parsed.nodes || [];
      this.edges = parsed.edges || [];
      this.nextNodeId = (this.nodes.reduce((m: number, n: SceneNode) => Math.max(m, n.id), 0) || 0) + 1;
      this.nextEdgeId = (this.edges.reduce((m: number, e: SceneEdge) => Math.max(m, e.id), 0) || 0) + 1;
      this.currentFlowName = name;
      this.selectedNodeId = null;
      this.renderGraph();
    } catch {
      alert('تعذر تحميل المخطط');
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
    try { localStorage.setItem('activeFlowName', name); } catch {}
  }

  private setActiveCurrent(): void {
    if (!this.currentFlowName) {
      alert('احفظ المخطط أولاً باسم.');
      return;
    }
    this.setActiveFlow(this.currentFlowName);
    alert('تم تعيين المخطط الحالي كالنشط');
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
      this.nodes = parsed.nodes || [];
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


