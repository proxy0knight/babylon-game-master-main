import { Router } from '@/utils/Router';
import { ApiClient } from '@/utils/ApiClient';

/**
 * Scene Builder: two-panel tool to assemble scenes with primitives and edit their properties
 */
export class SceneBuilder {
  private container: HTMLElement;
  private router: Router;
  private api: ApiClient;

  // Babylon
  private engine: any;
  private scene: any;
  private canvas: HTMLCanvasElement | null = null;
  private camera: any;

  // State
  private nextItemId = 1;
  private items: Array<{
    id: number;
    name: string;
    type: 'box' | 'sphere' | 'ground' | 'asset';
    assetType?: 'map' | 'character' | 'object';
    assetName?: string;
    mesh: any;
  }> = [];
  private selectedItemId: number | null = null;
  private spawnMarker: any | null = null;
  private spawn = { position: { x: 0, y: 0.6, z: -3 }, rotationY: 0 };

  // Code view (Monaco)
  private codeEditor: any = null;
  private sceneEditor: any = null; // full scene JSON editor

  // Map settings and ground reference
  private mapSettings = { width: 12, height: 12 };
  private groundMesh: any | null = null;

  constructor(container: HTMLElement, router: Router) {
    this.container = container;
    this.router = router;
    this.api = new ApiClient();
  }

  async initialize(): Promise<void> {
    this.render();
    await this.initBabylon();
    await this.ensureCodeEditor();
    await this.ensureSceneEditor();
    this.attachHandlers();
    // Prompt to choose a base map or empty ground
    this.openChooseBaseMapOverlay();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="scene-builder">
        <div class="sb-header">
          <div class="left">
            <button id="sb-back" class="btn primary">← العودة</button>
            <h2>منشئ المشهد</h2>
          </div>
          <div class="right">
            <button id="sb-assets" class="btn">📚 مكتبة الأصول</button>
            <button id="sb-set-spawn" class="btn">🎯 تحديد نقطة الظهور</button>
            <button id="sb-save" class="btn">💾 حفظ</button>
            <button id="sb-load" class="btn">📂 تحميل</button>
            <button id="sb-to-playground" class="btn">↔ المحرر</button>
          </div>
        </div>
        <div class="sb-body">
          <div class="viewport">
            <div class="viewport-toolbar">
              <button id="add-box" class="btn small">➕ Box</button>
              <button id="add-sphere" class="btn small">➕ Sphere</button>
              <button id="add-ground" class="btn small">➕ Ground</button>
              <div class="spacer"></div>
              <button id="delete-item" class="btn small danger" disabled>🗑 حذف المحدد</button>
            </div>
            <canvas id="sb-canvas" tabindex="0"></canvas>
          </div>
          <div class="explorer">
            <div class="panel">
              <div class="panel-header">إعدادات الخريطة</div>
              <div class="panel-content">
                <div class="form-grid">
                  <label>العرض</label><input id="map-width" type="number" step="1" min="2" />
                  <label>الارتفاع</label><input id="map-height" type="number" step="1" min="2" />
                  <button id="apply-map-size" class="btn small">تطبيق</button>
                </div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-header">العناصر</div>
              <div id="items-list" class="items-list"></div>
            </div>
            <div class="panel">
              <div class="panel-header">خصائص العنصر</div>
              <div class="panel-content">
                <div class="form-grid">
                  <label>X</label><input id="prop-pos-x" type="number" step="0.1" />
                  <label>Y</label><input id="prop-pos-y" type="number" step="0.1" />
                  <label>Z</label><input id="prop-pos-z" type="number" step="0.1" />
                  <label>Rot X</label><input id="prop-rot-x" type="number" step="0.1" />
                  <label>Rot Y</label><input id="prop-rot-y" type="number" step="0.1" />
                  <label>Rot Z</label><input id="prop-rot-z" type="number" step="0.1" />
                  <label>Scale</label><input id="prop-scale" type="number" step="0.1" />
                </div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-header">كود العنصر</div>
              <div class="panel-content code">
                <div id="sb-code-editor" class="code-editor"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scene JSON Editor (collapsible) -->
        <div id="sb-scene-editor" class="scene-editor">
          <div class="scene-editor-bar">
            <div>
              <button id="toggle-scene-editor" class="btn small">عرض/إخفاء كود المشهد</button>
            </div>
            <div>
              <button id="refresh-scene-json" class="btn small">تحديث من المشهد</button>
              <button id="apply-scene-json" class="btn small primary">تطبيق على المشهد</button>
            </div>
          </div>
          <div id="sb-scene-editor-host" class="scene-editor-host hidden"></div>
        </div>

        <!-- Asset Library Overlay -->
        <div id="sb-library" class="overlay hidden">
          <div class="overlay-content">
            <div class="overlay-header">
              <h3>مكتبة الأصول</h3>
              <div class="row">
                <select id="sb-lib-type" class="select">
                  <option value="object">الكائنات</option>
                  <option value="character">الشخصيات</option>
                  <option value="map">الخرائط</option>
                </select>
                <button id="sb-lib-refresh" class="btn small">تحديث</button>
                <button id="sb-lib-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div id="sb-lib-grid" class="grid"></div>
          </div>
        </div>

        <!-- Load Scene Overlay -->
        <div id="sb-load-overlay" class="overlay hidden">
          <div class="overlay-content">
            <div class="overlay-header">
              <h3>تحميل مشهد محفوظ</h3>
              <div class="row">
                <button id="sb-load-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div id="sb-load-grid" class="grid"></div>
          </div>
        </div>
        
        <!-- Choose Base Map Overlay -->
        <div id="sb-base-overlay" class="overlay hidden">
          <div class="overlay-content">
            <div class="overlay-header">
              <h3>اختر خريطة أساسية</h3>
              <div class="row">
                <button id="sb-base-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div id="sb-base-grid" class="grid"></div>
          </div>
        </div>
      </div>
      <style>
        .scene-builder { display:flex; flex-direction:column; height:100vh; background:#1e1e1e; color:#d4d4d4; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .sb-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; background:#2d2d30; border-bottom:1px solid #3e3e42; }
        .sb-header .left { display:flex; align-items:center; gap:0.75rem; }
        .sb-body { flex:1; display:flex; min-height:0; }
        .viewport { flex:2; display:flex; flex-direction:column; border-inline-end:1px solid #3e3e42; }
        .viewport-toolbar { display:flex; gap:0.5rem; align-items:center; padding:0.5rem; background:#252526; border-bottom:1px solid #3e3e42; }
        .viewport .spacer { flex:1; }
        #sb-canvas { width:100%; height:100%; display:block; background:#111; outline:none; }
        .explorer { flex:1; display:flex; flex-direction:column; gap:0.75rem; padding:0.75rem; overflow:auto; }
        .panel { background:#252526; border:1px solid #3e3e42; border-radius:6px; overflow:hidden; }
        .panel-header { padding:0.5rem 0.75rem; border-bottom:1px solid #3e3e42; font-weight:600; font-size:0.9rem; }
        .panel-content { padding:0.75rem; }
        .items-list { max-height:220px; overflow:auto; display:flex; flex-direction:column; gap:0.25rem; }
        .item { padding:0.4rem 0.6rem; border:1px solid #3e3e42; border-radius:4px; cursor:pointer; background:#2b2b2f; }
        .item.active { border-color:#007acc; background:#333a46; }
        .form-grid { display:grid; grid-template-columns: 60px 1fr; gap:0.5rem 0.75rem; align-items:center; }
        .form-grid input { width:100%; background:#3c3c3c; color:#d4d4d4; border:1px solid #3e3e42; border-radius:4px; padding:0.25rem 0.4rem; }
        .code-editor { height:180px; }
        .btn { background:transparent; color:#d4d4d4; border:1px solid #3e3e42; border-radius:4px; padding:0.4rem 0.7rem; cursor:pointer; transition:all .2s; }
        .btn:hover { background:#3e3e42; }
        .btn.small { padding:0.25rem 0.5rem; font-size:0.85rem; }
        .btn.primary { background:#0e639c; border-color:#0e639c; color:#fff; }
        .btn.primary:hover { background:#1177bb; }
        .btn.danger { border-color:#8b2e2e; color:#ffb3b3; }
        .btn.danger:hover { background:#572323; }

        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:50; }
        .overlay.hidden { display:none; }
        .overlay-content { width:min(1000px, 90vw); height:min(600px, 80vh); background:#1f1f1f; border:1px solid #3e3e42; border-radius:8px; display:flex; flex-direction:column; }
        .overlay-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; border-bottom:1px solid #3e3e42; }
        .overlay-header .row { display:flex; gap:0.5rem; align-items:center; }
        .grid { padding:0.75rem; display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem; overflow:auto; }
        .card { background:#252526; border:1px solid #3e3e42; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; }
        .thumb { height:120px; background:#111; display:flex; align-items:center; justify-content:center; color:#888; font-size:0.85rem; }
        .card-body { padding:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; }
        .select { padding:0.4rem 0.6rem; background:#3c3c3c; border:1px solid #3e3e42; color:#d4d4d4; border-radius:4px; }
        
        .scene-editor { position:fixed; left:0; right:0; top:60px; z-index:40; }
        .scene-editor-bar { display:flex; align-items:center; justify-content:space-between; background:#252526; border-bottom:1px solid #3e3e42; padding:0.4rem 0.6rem; }
        .scene-editor-host { height:240px; background:#1e1e1e; border-bottom:1px solid #3e3e42; }
        .hidden { display:none; }
      </style>
    `;
  }

  private attachHandlers(): void {
    const back = document.getElementById('sb-back');
    const toPlayground = document.getElementById('sb-to-playground');
    const openAssets = document.getElementById('sb-assets');
    const setSpawn = document.getElementById('sb-set-spawn');
    const saveBtn = document.getElementById('sb-save');
    const loadBtn = document.getElementById('sb-load');
    const addBox = document.getElementById('add-box');
    const addSphere = document.getElementById('add-sphere');
    const addGround = document.getElementById('add-ground');
    const deleteItem = document.getElementById('delete-item') as HTMLButtonElement;

    back?.addEventListener('click', () => {
      this.cleanup();
      this.router.navigate('/admin');
    });
    toPlayground?.addEventListener('click', () => {
      this.cleanup();
      this.router.navigate('/admin');
    });

    openAssets?.addEventListener('click', () => this.openLibrary());
    setSpawn?.addEventListener('click', () => this.placeOrMoveSpawn());
    saveBtn?.addEventListener('click', () => this.saveScene());
    loadBtn?.addEventListener('click', () => this.openLoadOverlay());

    addBox?.addEventListener('click', () => this.addPrimitive('box'));
    addSphere?.addEventListener('click', () => this.addPrimitive('sphere'));
    addGround?.addEventListener('click', () => this.addPrimitive('ground'));
    deleteItem?.addEventListener('click', () => this.removeSelected());

    // Property inputs
    const bind = (id: string, fn: (v: number) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (!Number.isNaN(v)) fn(v);
      });
    };

    bind('prop-pos-x', v => this.updateSelected(mesh => (mesh.position.x = v)));
    bind('prop-pos-y', v => this.updateSelected(mesh => (mesh.position.y = v)));
    bind('prop-pos-z', v => this.updateSelected(mesh => (mesh.position.z = v)));
    bind('prop-rot-x', v => this.updateSelected(mesh => (mesh.rotation.x = v)));
    bind('prop-rot-y', v => this.updateSelected(mesh => (mesh.rotation.y = v)));
    bind('prop-rot-z', v => this.updateSelected(mesh => (mesh.rotation.z = v)));
    bind('prop-scale', v => this.updateSelected(mesh => (mesh.scaling.set(v, v, v))));
    // Map size controls
    const mw = document.getElementById('map-width') as HTMLInputElement | null;
    const mh = document.getElementById('map-height') as HTMLInputElement | null;
    const applyMap = document.getElementById('apply-map-size');
    if (mw) mw.value = String(this.mapSettings.width);
    if (mh) mh.value = String(this.mapSettings.height);
    applyMap?.addEventListener('click', () => {
      const w = Math.max(2, Math.round(parseFloat(mw?.value || '12')));
      const h = Math.max(2, Math.round(parseFloat(mh?.value || '12')));
      this.mapSettings.width = w;
      this.mapSettings.height = h;
      this.ensureGroundSize();
      this.refreshSceneJSON();
    });

    // Scene JSON editor controls
    const toggleEditor = document.getElementById('toggle-scene-editor');
    const refreshScene = document.getElementById('refresh-scene-json');
    const applyScene = document.getElementById('apply-scene-json');
    const editorHost = document.getElementById('sb-scene-editor-host');
    toggleEditor?.addEventListener('click', () => editorHost?.classList.toggle('hidden'));
    refreshScene?.addEventListener('click', () => this.refreshSceneJSON());
    applyScene?.addEventListener('click', () => this.applySceneJSON());
  }

  private async initBabylon(): Promise<void> {
    const [
      { Engine },
      { Scene },
      { ArcRotateCamera },
      { HemisphericLight },
      { Vector3 },
      { Color3 },
      { MeshBuilder }
    ] = await Promise.all([
      import('@babylonjs/core/Engines/engine'),
      import('@babylonjs/core/scene'),
      import('@babylonjs/core/Cameras/arcRotateCamera'),
      import('@babylonjs/core/Lights/hemisphericLight'),
      import('@babylonjs/core/Maths/math.vector'),
      import('@babylonjs/core/Maths/math.color'),
      import('@babylonjs/core/Meshes/meshBuilder')
    ]);

    this.canvas = document.getElementById('sb-canvas') as HTMLCanvasElement;
    this.engine = new Engine(this.canvas, true, { antialias: true });
    this.scene = new Scene(this.engine);

    // Camera
    this.camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 15, new Vector3(0, 2, 0), this.scene);
    this.camera.attachControl(this.canvas, true);

    // Light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.9;
    (light as any).diffuse = new Color3(1, 1, 1);

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', () => this.engine.resize());
  }

  private async ensureCodeEditor(): Promise<void> {
    try {
      const monaco = await import('monaco-editor');
      const host = document.getElementById('sb-code-editor');
      if (!host) return;
      this.codeEditor = monaco.editor.create(host, {
        value: '// Select an item to view its JSON...',
        language: 'json',
        theme: 'vs-dark',
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
        lineNumbers: 'off',
        wordWrap: 'on',
        fontSize: 12
      });
    } catch {
      this.codeEditor = null;
    }
  }

  private async ensureSceneEditor(): Promise<void> {
    try {
      const monaco = await import('monaco-editor');
      const host = document.getElementById('sb-scene-editor-host');
      if (!host) return;
      this.sceneEditor = monaco.editor.create(host, {
        value: JSON.stringify(this.serialize(), null, 2),
        language: 'json',
        theme: 'vs-dark',
        readOnly: false,
        minimap: { enabled: false },
        automaticLayout: true,
        lineNumbers: 'on',
        wordWrap: 'off',
        fontSize: 12
      });
    } catch {
      this.sceneEditor = null;
    }
  }

  private addPrimitive(type: 'box' | 'sphere' | 'ground'): void {
    if (!this.scene) return;
    const create = (meshType: typeof type) => import('@babylonjs/core/Meshes/meshBuilder').then(({ MeshBuilder }) => {
      switch (meshType) {
        case 'box':
          return MeshBuilder.CreateBox(`box_${this.nextItemId}`, { size: 1 }, this.scene);
        case 'sphere':
          return MeshBuilder.CreateSphere(`sphere_${this.nextItemId}`, { diameter: 1.2 }, this.scene);
        case 'ground':
        default:
          return MeshBuilder.CreateGround(`ground_${this.nextItemId}`, { width: 8, height: 8 }, this.scene);
      }
    });

    create(type).then(mesh => {
      if (type === 'ground') {
        // Replace ground with specified size
        try { this.groundMesh?.dispose?.(); } catch {}
        this.groundMesh = mesh;
        this.ensureGroundSize();
      } else {
        mesh.position.y = 0.6;
        const item = { id: this.nextItemId++, name: mesh.name, type, mesh };
        this.items.push(item);
        this.refreshList();
        this.select(item.id);
        this.guardWithinBounds(item);
      }
    }).catch(() => this.openSceneEditorDueToError());
  }

  private async addAsset(assetType: 'map' | 'character' | 'object', assetName: string): Promise<void> {
    if (!this.scene) return;
    const { MeshBuilder, Color3, StandardMaterial } = await Promise.all([
      import('@babylonjs/core/Meshes/meshBuilder').then(m => m),
      import('@babylonjs/core/Maths/math.color').then(m => m),
      import('@babylonjs/core/Materials/standardMaterial').then(m => m)
    ]).then(([mb, c3, sm]) => ({ MeshBuilder: mb.MeshBuilder, Color3: c3.Color3, StandardMaterial: sm.StandardMaterial }));

    // Placeholder: a box labeled with asset name
    const mesh = MeshBuilder.CreateBox(`asset_${assetName}_${this.nextItemId}`, { size: 1.2 }, this.scene);
    mesh.position.y = 0.6;
    const mat = new StandardMaterial(`mat_${mesh.name}`, this.scene);
    mat.diffuseColor = new Color3(0.2, 0.6, 0.9);
    (mesh as any).material = mat;
    mesh.metadata = { assetType, assetName };

    const item = { id: this.nextItemId++, name: assetName, type: 'asset' as const, assetType, assetName, mesh };
    this.items.push(item);
    this.refreshList();
    this.select(item.id);
    this.guardWithinBounds(item);
  }

  private refreshList(): void {
    const container = document.getElementById('items-list');
    if (!container) return;
    container.innerHTML = '';
    this.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'item' + (item.id === this.selectedItemId ? ' active' : '');
      div.textContent = `${item.type}: ${item.name}`;
      div.addEventListener('click', () => this.select(item.id));
      container.appendChild(div);
    });
    const del = document.getElementById('delete-item') as HTMLButtonElement | null;
    if (del) del.disabled = this.selectedItemId == null;
    this.populateProperties();
    this.refreshCode();
  }

  private select(id: number): void {
    this.selectedItemId = id;
    this.refreshList();
  }

  private getSelected(): { id: number; name: string; type: 'box' | 'sphere' | 'ground'; mesh: any } | null {
    if (this.selectedItemId == null) return null;
    return this.items.find(i => i.id === this.selectedItemId) || null;
  }

  private updateSelected(mutator: (mesh: any) => void): void {
    const sel = this.getSelected();
    if (!sel) return;
    mutator(sel.mesh);
    this.populateProperties();
    this.refreshCode();
  }

  private populateProperties(): void {
    const sel = this.getSelected();
    const set = (id: string, v: number | '') => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = v === '' ? '' : String((v as number).toFixed ? (v as number).toFixed(2) : v);
    };
    if (!sel) {
      set('prop-pos-x', ''); set('prop-pos-y', ''); set('prop-pos-z', '');
      set('prop-rot-x', ''); set('prop-rot-y', ''); set('prop-rot-z', '');
      set('prop-scale', '');
      return;
    }
    set('prop-pos-x', sel.mesh.position.x);
    set('prop-pos-y', sel.mesh.position.y);
    set('prop-pos-z', sel.mesh.position.z);
    set('prop-rot-x', sel.mesh.rotation.x);
    set('prop-rot-y', sel.mesh.rotation.y);
    set('prop-rot-z', sel.mesh.rotation.z);
    // crude uniform scale read
    const s = (sel.mesh.scaling && sel.mesh.scaling.x) ? sel.mesh.scaling.x : 1;
    set('prop-scale', s);
  }

  private refreshCode(): void {
    const sel = this.getSelected();
    const json = sel ? {
      id: sel.id,
      name: sel.name,
      type: sel.type,
      assetType: sel.assetType,
      assetName: sel.assetName,
      position: [sel.mesh.position.x, sel.mesh.position.y, sel.mesh.position.z],
      rotation: [sel.mesh.rotation.x, sel.mesh.rotation.y, sel.mesh.rotation.z],
      scale: sel.mesh.scaling ? [sel.mesh.scaling.x, sel.mesh.scaling.y, sel.mesh.scaling.z] : [1,1,1]
    } : { note: 'Select an item to view its JSON' };
    const text = JSON.stringify(json, null, 2);
    if (this.codeEditor && this.codeEditor.setValue) {
      if (this.codeEditor.getValue && this.codeEditor.getValue() === text) return;
      this.codeEditor.setValue(text);
    } else {
      const host = document.getElementById('sb-code-editor');
      if (host) host.textContent = text;
    }
  }

  private removeSelected(): void {
    const sel = this.getSelected();
    if (!sel) return;
    try { sel.mesh.dispose(); } catch {}
    this.items = this.items.filter(i => i.id !== sel.id);
    this.selectedItemId = null;
    this.refreshList();
  }

  cleanup(): void {
    if (this.engine) this.engine.dispose();
    if (this.codeEditor && this.codeEditor.dispose) this.codeEditor.dispose();
    if (this.sceneEditor && this.sceneEditor.dispose) this.sceneEditor.dispose();
  }

  // --- Library overlay ---
  private openLibrary(): void {
    const ov = document.getElementById('sb-library');
    const typeSel = document.getElementById('sb-lib-type') as HTMLSelectElement | null;
    const refresh = document.getElementById('sb-lib-refresh');
    const close = document.getElementById('sb-lib-close');
    if (!ov || !typeSel || !refresh || !close) return;
    ov.classList.remove('hidden');
    const load = async () => {
      const grid = document.getElementById('sb-lib-grid');
      if (!grid) return;
      grid.innerHTML = 'جاري التحميل...';
      try {
        const type = (typeSel.value as 'map' | 'character' | 'object');
        const result = await this.api.listAssets(type);
        const items: Array<{ name: string; has_thumbnail?: boolean }> = result.assets || [];
        grid.innerHTML = '';
        items.forEach(asset => {
          const card = document.createElement('div');
          card.className = 'card';
          const thumb = document.createElement('div');
          thumb.className = 'thumb';
          if (asset.has_thumbnail) {
            const img = document.createElement('img');
            img.src = this.api.getThumbnailUrl(type, asset.name);
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            thumb.innerHTML = '';
            thumb.appendChild(img);
          } else {
            thumb.textContent = 'لا توجد صورة';
          }
          const body = document.createElement('div');
          body.className = 'card-body';
          const span = document.createElement('span');
          span.textContent = asset.name;
          const btn = document.createElement('button');
          btn.className = 'btn small';
          btn.textContent = 'إضافة';
          btn.addEventListener('click', async () => {
            await this.addAsset(type, asset.name);
          });
          body.appendChild(span);
          body.appendChild(btn);
          card.appendChild(thumb);
          card.appendChild(body);
          grid.appendChild(card);
        });
      } catch (e) {
        grid!.textContent = 'فشل التحميل';
      }
    };
    typeSel.onchange = load;
    refresh.addEventListener('click', load);
    close.addEventListener('click', () => ov.classList.add('hidden'));
    load();
  }

  // --- Spawn management ---
  private async placeOrMoveSpawn(): Promise<void> {
    const { MeshBuilder, Color3, StandardMaterial } = await Promise.all([
      import('@babylonjs/core/Meshes/meshBuilder').then(m => m),
      import('@babylonjs/core/Maths/math.color').then(m => m),
      import('@babylonjs/core/Materials/standardMaterial').then(m => m)
    ]).then(([mb, c3, sm]) => ({ MeshBuilder: mb.MeshBuilder, Color3: c3.Color3, StandardMaterial: sm.StandardMaterial }));

    if (!this.spawnMarker) {
      const sphere = MeshBuilder.CreateSphere('spawn_marker', { diameter: 0.3 }, this.scene);
      sphere.position.set(this.spawn.position.x, this.spawn.position.y, this.spawn.position.z);
      const mat = new StandardMaterial('spawn_mat', this.scene);
      mat.emissiveColor = new Color3(0.1, 1, 0.2);
      (sphere as any).material = mat;
      this.spawnMarker = sphere;
    } else {
      const cam = (this.scene as any).activeCamera;
      if (cam) {
        // Place spawn in front of camera
        const forward = cam.getForwardRay(3).direction;
        this.spawnMarker.position.copyFrom(cam.position.add(forward.scale(2)));
      }
    }
    this.spawn.position = { x: this.spawnMarker.position.x, y: this.spawnMarker.position.y, z: this.spawnMarker.position.z };
  }

  // --- Save/Load ---
  private serialize(): any {
    return {
      version: 1,
      mapSettings: this.mapSettings,
      spawn: this.spawn,
      items: this.items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        assetType: i.assetType,
        assetName: i.assetName,
        position: [i.mesh.position.x, i.mesh.position.y, i.mesh.position.z],
        rotation: [i.mesh.rotation.x, i.mesh.rotation.y, i.mesh.rotation.z],
        scale: i.mesh.scaling ? [i.mesh.scaling.x, i.mesh.scaling.y, i.mesh.scaling.z] : [1,1,1]
      }))
    };
  }

  private async saveScene(): Promise<void> {
    const name = prompt('اسم المشهد (سيُحفظ كخريطة):');
    if (!name) return;
    const data = JSON.stringify(this.serialize());
    try {
      await this.api.saveAsset('map', name, data);
      alert('تم الحفظ بنجاح');
    } catch (e) {
      alert('فشل الحفظ');
    }
  }

  private openLoadOverlay(): void {
    const ov = document.getElementById('sb-load-overlay');
    const close = document.getElementById('sb-load-close');
    if (!ov || !close) return;
    ov.classList.remove('hidden');
    close.addEventListener('click', () => ov.classList.add('hidden'));
    this.populateLoadList();
  }

  private async populateLoadList(): Promise<void> {
    const grid = document.getElementById('sb-load-grid');
    if (!grid) return;
    grid.innerHTML = 'جاري التحميل...';
    try {
      const result = await this.api.listAssets('map');
      const maps: Array<{ name: string; has_thumbnail?: boolean }> = result.assets || [];
      grid.innerHTML = '';
      maps.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        if (m.has_thumbnail) {
          const img = document.createElement('img');
          img.src = this.api.getThumbnailUrl('map', m.name);
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          thumb.innerHTML = '';
          thumb.appendChild(img);
        } else {
          thumb.textContent = 'لا توجد صورة';
        }
        const body = document.createElement('div');
        body.className = 'card-body';
        const span = document.createElement('span');
        span.textContent = m.name;
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.textContent = 'تحميل';
        btn.addEventListener('click', async () => {
          await this.loadSceneByName(m.name);
          const ov = document.getElementById('sb-load-overlay');
          ov?.classList.add('hidden');
        });
        body.appendChild(span);
        body.appendChild(btn);
        card.appendChild(thumb);
        card.appendChild(body);
        grid.appendChild(card);
      });
    } catch (e) {
      grid.textContent = 'فشل التحميل';
    }
  }

  private async loadSceneByName(name: string): Promise<void> {
    try {
      const result = await this.api.loadAsset('map', name);
      const parsed = typeof result.data?.code === 'string' ? JSON.parse(result.data.code) : result.data?.code || result.data;
      if (!parsed) return;
      // Clear current
      this.items.forEach(i => { try { i.mesh.dispose(); } catch {} });
      this.items = [];
      this.selectedItemId = null;
      if (this.spawnMarker) { try { this.spawnMarker.dispose(); } catch {} this.spawnMarker = null; }

      // Restore spawn
      if (parsed.spawn) {
        this.spawn = parsed.spawn;
        await this.placeOrMoveSpawn();
      }
      // Map settings
      if (parsed.mapSettings) {
        this.mapSettings = parsed.mapSettings;
      }
      // Ensure ground exists per size
      this.addPrimitive('ground');
      // Restore items
      const toNum = (a: any, d: number) => (typeof a === 'number' ? a : d);
      for (const it of parsed.items || []) {
        if (it.type === 'asset' && it.assetType && it.assetName) {
          await this.addAsset(it.assetType, it.assetName);
        } else if (it.type === 'box' || it.type === 'sphere' || it.type === 'ground') {
          this.addPrimitive(it.type);
        }
        const last = this.items[this.items.length - 1];
        if (!last) continue;
        const p = it.position || [0, 0, 0];
        const r = it.rotation || [0, 0, 0];
        const s = it.scale || [1, 1, 1];
        last.mesh.position.set(toNum(p[0], 0), toNum(p[1], 0), toNum(p[2], 0));
        last.mesh.rotation.set(toNum(r[0], 0), toNum(r[1], 0), toNum(r[2], 0));
        last.mesh.scaling.set(toNum(s[0], 1), toNum(s[1], 1), toNum(s[2], 1));
      }
      this.refreshList();
      this.refreshSceneJSON();
    } catch (e) {
      alert('تعذر تحميل المشهد');
    }
  }

  private ensureGroundSize(): void {
    if (!this.scene) return;
    import('@babylonjs/core/Meshes/meshBuilder').then(({ MeshBuilder }) => {
      try { this.groundMesh?.dispose?.(); } catch {}
      this.groundMesh = MeshBuilder.CreateGround('ground', { width: this.mapSettings.width, height: this.mapSettings.height }, this.scene);
    });
  }

  private guardWithinBounds(item: { mesh: any }): void {
    const w = this.mapSettings.width, h = this.mapSettings.height;
    const halfW = w / 2, halfH = h / 2;
    const x = item.mesh.position.x, z = item.mesh.position.z;
    const out = x < -halfW || x > halfW || z < -halfH || z > halfH;
    if (out) {
      this.openSceneEditorDueToError();
    }
  }

  private refreshSceneJSON(): void {
    if (!this.sceneEditor) return;
    this.sceneEditor.setValue(JSON.stringify(this.serialize(), null, 2));
  }

  private async applySceneJSON(): Promise<void> {
    if (!this.sceneEditor) return;
    try {
      const text = this.sceneEditor.getValue();
      const data = JSON.parse(text);
      // Clear current
      this.items.forEach(i => { try { i.mesh.dispose(); } catch {} });
      this.items = [];
      this.selectedItemId = null;
      if (this.spawnMarker) { try { this.spawnMarker.dispose(); } catch {} this.spawnMarker = null; }
      // Map settings and ground
      this.mapSettings = data.mapSettings || this.mapSettings;
      this.addPrimitive('ground');
      // Spawn
      this.spawn = data.spawn || this.spawn;
      await this.placeOrMoveSpawn();
      // Items
      for (const it of data.items || []) {
        if (it.type === 'asset' && it.assetType && it.assetName) {
          await this.addAsset(it.assetType, it.assetName);
        } else if (it.type === 'box' || it.type === 'sphere' || it.type === 'ground') {
          this.addPrimitive(it.type);
        }
        const last = this.items[this.items.length - 1];
        if (last) {
          const p = it.position || [0,0,0];
          const r = it.rotation || [0,0,0];
          const s = it.scale || [1,1,1];
          last.mesh.position.set(p[0], p[1], p[2]);
          last.mesh.rotation.set(r[0], r[1], r[2]);
          last.mesh.scaling.set(s[0], s[1], s[2]);
          this.guardWithinBounds(last);
        }
      }
      this.refreshList();
    } catch {
      alert('تعذر تطبيق كود المشهد: تحقق من صحة JSON');
    }
  }

  private openSceneEditorDueToError(): void {
    const host = document.getElementById('sb-scene-editor-host');
    if (!host) return;
    if (host.classList.contains('hidden')) host.classList.remove('hidden');
    this.refreshSceneJSON();
  }

  private openChooseBaseMapOverlay(): void {
    const ov = document.getElementById('sb-base-overlay');
    const close = document.getElementById('sb-base-close');
    if (!ov || !close) return;
    ov.classList.remove('hidden');
    close.addEventListener('click', () => ov.classList.add('hidden'));
    (async () => {
      const grid = document.getElementById('sb-base-grid');
      if (!grid) return;
      grid.innerHTML = 'جاري التحميل...';
      try {
        const result = await this.api.listAssets('map');
        const maps: Array<{ name: string; has_thumbnail?: boolean }> = result.assets || [];
        grid.innerHTML = '';
        // Empty scene option
        const empty = document.createElement('div');
        empty.className = 'card';
        const et = document.createElement('div'); et.className = 'thumb'; et.textContent = 'مشهد فارغ';
        const eb = document.createElement('div'); eb.className = 'card-body';
        const ebSpan = document.createElement('span'); ebSpan.textContent = 'أرضية افتراضية بالحجم الحالي';
        const ebBtn = document.createElement('button'); ebBtn.className = 'btn small'; ebBtn.textContent = 'اختيار';
        ebBtn.addEventListener('click', () => { this.addPrimitive('ground'); ov.classList.add('hidden'); });
        eb.appendChild(ebSpan); eb.appendChild(ebBtn); empty.appendChild(et); empty.appendChild(eb); grid.appendChild(empty);
        // Existing maps
        maps.forEach(m => {
          const card = document.createElement('div'); card.className = 'card';
          const thumb = document.createElement('div'); thumb.className = 'thumb';
          if (m.has_thumbnail) {
            const img = document.createElement('img'); img.src = this.api.getThumbnailUrl('map', m.name); img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; thumb.innerHTML = ''; thumb.appendChild(img);
          } else { thumb.textContent = 'لا توجد صورة'; }
          const body = document.createElement('div'); body.className = 'card-body';
          const span = document.createElement('span'); span.textContent = m.name;
          const btn = document.createElement('button'); btn.className = 'btn small'; btn.textContent = 'استخدام كأساس';
          btn.addEventListener('click', async () => { await this.loadSceneByName(m.name); ov.classList.add('hidden'); });
          body.appendChild(span); body.appendChild(btn);
          card.appendChild(thumb); card.appendChild(body);
          grid.appendChild(card);
        });
      } catch { grid.textContent = 'فشل التحميل'; }
    })();
  }
}


