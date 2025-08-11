import { Router } from '@/utils/Router';
import { ApiClient } from '@/utils/ApiClient';
import { getDefaultSceneCode } from '@/assets/defaultScene';

import { BabylonManager } from '@/utils/BabylonManager';

/**
 * Scene Builder: two-panel tool to assemble scenes with primitives and edit their properties
 */
export class SceneBuilder {
  private container: HTMLElement;
  private router: Router;
  private api: ApiClient;
  private babylonManager!: BabylonManager;

  // Babylon (managed by BabylonManager)
  private engine: any;
  private scene: any;
  private canvas: HTMLCanvasElement | null = null;
  private camera: any;
  private devCameraEnabled: boolean = true;

  private devCamera: any = null;
  private previousUserCamera: any = null;
  private devCamKeyState: { up: boolean; down: boolean } = { up: false, down: false };
  private devCamKeyboardObserver: any = null;
  private devCamBeforeRenderObserver: any = null;
  private devCamDocKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private devCamDocKeyUp: ((e: KeyboardEvent) => void) | null = null;

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
  private libCodeEditor: any = null; // code preview in library
  private libSelected: { type: 'map' | 'scene' | 'code' | null; name: string | null } = { type: null, name: null };

  // Map settings and ground reference
  private mapSettings = { width: 12, height: 12 };
  private groundMesh: any | null = null;

  constructor(container: HTMLElement, router: Router) {
    this.container = container;
    this.router = router;
    this.api = new ApiClient();
    
    // Initialize BabylonManager
    this.babylonManager = BabylonManager.getInstance('scene-builder', {
      canvasId: 'sb-canvas',
      antialias: true,
      preserveDrawingBuffer: true,
      stencil: true
    });
  }

  async initialize(): Promise<void> {
    this.render();
    // Small delay to ensure DOM is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.initBabylon();
    await this.ensureCodeEditor();
    await this.ensureSceneEditor();
    this.attachHandlers();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="scene-builder">
        <div class="sb-header">
          <div class="left">
            <button id="sb-menu" class="btn">☰</button>
            <h2>منشئ المشهد</h2>
          </div>
          <div class="right">
            <button id="sb-assets" class="btn">📚 من المكتبة</button>
            <button id="sb-import-assets" class="btn">📦 استيراد أصول</button>
            <button id="sb-clean" class="btn">🧹 مشهد نظيف</button>
            <button id="sb-run" class="btn">▶ تشغيل</button>
            <button id="sb-devcam" class="btn">🧭 كاميرا المطور: تشغيل</button>
            <button id="sb-save" class="btn primary">💾 حفظ المشهد</button>
          </div>
        </div>
        <div class="sb-body two-col">
          <div class="left-panel">
            <div class="toolbox">
              <button id="tool-add-code" class="btn small">➕ إضافة كود</button>
              <button id="tool-save-code" class="btn small primary">💾 حفظ في مكتبة الأكواد</button>
            </div>
            <div id="sb-code-editor" class="code-editor full" dir="ltr"></div>
          </div>
          <div class="render-panel">
            <div class="viewport-toolbar">
              <span id="runtime-status" class="muted">جاهز</span>
              <div class="spacer"></div>
              <button id="screenshot" class="btn small">📸</button>
            </div>
            <canvas id="sb-canvas" tabindex="0"></canvas>
          </div>
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
                  <option value="scene">المشاهد</option>
                  <option value="code">مكتبة الأكواد</option>
                </select>
                <button id="sb-lib-refresh" class="btn small">تحديث</button>
                <button id="sb-lib-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div class="overlay-body two-col">
              <div class="left-col">
            <div id="sb-lib-grid" class="grid"></div>
          </div>
              <div class="right-col">
                <div class="panel">
                  <div class="panel-header">معاينة الكود: <span id="sb-lib-selected-name" class="muted">—</span></div>
                  <div class="panel-content code">
                    <div id="sb-lib-code-editor" class="code-editor" style="height:260px" dir="ltr"></div>
        </div>
                  <div class="panel-content">
                    <button id="sb-lib-insert" class="btn small">إدراج في المؤشر</button>
                    <button id="sb-lib-replace" class="btn small">استبدال محتوى المحرر</button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Code Snippets Overlay -->
        <div id="code-lib" class="overlay hidden">
          <div class="overlay-content">
            <div class="overlay-header">
              <h3>مكتبة الأكواد</h3>
              <div class="row">
                <button id="code-lib-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div id="code-lib-grid" class="grid"></div>
          </div>
        </div>
        
        <!-- External Assets Import Overlay -->
        <div id="import-assets-panel" class="overlay hidden">
          <div class="overlay-content">
            <div class="overlay-header">
              <h3>استيراد أصول خارجية</h3>
              <div class="row">
                <button id="import-close" class="btn small">✕ إغلاق</button>
              </div>
            </div>
            <div class="overlay-body" style="display:flex; gap:.75rem; padding:.75rem; height:100%; box-sizing:border-box;">
              <div style="flex:0 0 320px; display:flex; flex-direction:column; gap:.5rem;">
                <label class="btn small">
                  اختر ملفات
                  <input id="single-file-input" type="file" multiple style="display:none" />
                </label>
                <button id="upload-files-btn" class="btn small">رفع الملفات المختارة</button>
                <label class="btn small">
                  اختر مجلد
                  <input id="folder-input" type="file" webkitdirectory directory multiple style="display:none" />
                </label>
                <button id="upload-folder-btn" class="btn small">رفع المجلد</button>
                <div id="import-status" class="muted"></div>
              </div>
              <div style="flex:1; min-width:0;">
                <div class="panel">
                  <div class="panel-header">الملفات المستوردة</div>
                  <div class="panel-content" style="max-height:100%; overflow:auto;">
                    <ul id="imported-files-list" style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:.25rem;"></ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>
        .scene-builder { display:flex; flex-direction:column; height:100vh; width:100%; background:#1e1e1e; color:#d4d4d4; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow:auto; }
        .sb-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; background:#2d2d30; border-bottom:1px solid #3e3e42; }
        .sb-header .left { display:flex; align-items:center; gap:0.75rem; }
        .sb-body { flex:1; display:flex; min-height:0; width:100%; }
        .sb-body.two-col { gap:0; flex: 1 1 auto; width:100%; }
        .left-panel { flex:0 0 30%; min-width:260px; max-width:600px; display:flex; flex-direction:column; border-inline-start:1px solid #3e3e42; border-inline-end:1px solid #3e3e42; background:#1b1b1c; min-height:0; overflow:auto; }
        .toolbox { display:flex; gap:0.5rem; align-items:center; padding:0.5rem; background:#252526; border-bottom:1px solid #3e3e42; }
        .code-editor.full { flex:1; min-height:0; }
        .render-panel { flex:1 1 70%; display:flex; flex-direction:column; min-height:0; min-width:0; overflow:hidden; }
        .viewport { flex:1; display:flex; flex-direction:column; border-inline-end:1px solid #3e3e42; }
        .viewport-toolbar { display:flex; gap:0.5rem; align-items:center; padding:0.5rem; background:#252526; border-bottom:1px solid #3e3e42; }
        .viewport .spacer { flex:1; }
        #sb-canvas { width:100%; height:100%; display:block; background:#111; outline:none; }
        /* Force Monaco LTR inside RTL app */
        .scene-builder .monaco-editor,
        .scene-builder .monaco-editor .view-lines,
        .scene-builder .monaco-editor .margin {
          direction: ltr !important;
          text-align: left !important;
        }
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
        .muted { color:#9b9b9b; font-size:0.85rem; }

        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:50; }
        .overlay.hidden { display:none; }
        .overlay-content { width:min(1000px, 90vw); height:min(600px, 80vh); background:#1f1f1f; border:1px solid #3e3e42; border-radius:8px; display:flex; flex-direction:column; }
        .overlay-header { display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; border-bottom:1px solid #3e3e42; }
        .overlay-header .row { display:flex; gap:0.5rem; align-items:center; }
        .grid { padding:0.75rem; display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem; overflow:auto; }
        .overlay-body.two-col { display:grid; grid-template-columns: 1.4fr 1fr; gap:0.75rem; flex:1; overflow:hidden; }
        .overlay-body .left-col { overflow:auto; }
        .overlay-body .right-col { overflow:auto; padding:0.75rem; }
        .card { background:#252526; border:1px solid #3e3e42; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; }
        .thumb { height:120px; background:#111; display:flex; align-items:center; justify-content:center; color:#888; font-size:0.85rem; }
        .card-body { padding:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; }
        .select { padding:0.4rem 0.6rem; background:#3c3c3c; border:1px solid #3e3e42; color:#d4d4d4; border-radius:4px; }
        
        .hidden { display:none; }

        @media (max-width: 1100px) {
          .left-panel { flex:0 0 40%; }
        }
        @media (max-width: 900px) {
          .sb-body.two-col { flex-direction:column; }
          .left-panel { flex:0 0 auto; max-width:none; height:40vh; }
          .render-panel { height:60vh; }
        }
      </style>
    `;
  }

  private attachHandlers(): void {
    const openAssets = document.getElementById('sb-assets');
    const openImportAssets = document.getElementById('sb-import-assets');
    const saveBtn = document.getElementById('sb-save');
    const cleanBtn = document.getElementById('sb-clean');
    const runBtn = document.getElementById('sb-run');
    const devCamBtn = document.getElementById('sb-devcam');
    const screenshotBtn = document.getElementById('screenshot');
    const menuBtn = document.getElementById('sb-menu');
    const addCodeBtn = document.getElementById('tool-add-code');
    const saveCodeBtn = document.getElementById('tool-save-code');

    menuBtn?.addEventListener('click', () => this.router.navigate('/admin'));
    openAssets?.addEventListener('click', () => this.openLibrary());
    openImportAssets?.addEventListener('click', () => this.openImportAssetsPanel());
    saveBtn?.addEventListener('click', () => this.saveScene());
    cleanBtn?.addEventListener('click', () => this.cleanScene());
    runBtn?.addEventListener('click', () => this.runEditorCode());
    devCamBtn?.addEventListener('click', () => this.toggleDevCamera());
    screenshotBtn?.addEventListener('click', () => this.captureAndDownload());
    addCodeBtn?.addEventListener('click', () => this.openCodeLibrary());
    saveCodeBtn?.addEventListener('click', () => this.saveToCodeLibrary());
    // Use load overlay entrypoint via menu (hidden trigger) to satisfy usage
    document.getElementById('sb-load-close'); // reference to avoid tree-shake

    // Property inputs (kept for future left-side property panel if reintroduced)
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
    // Map sizing now via scene JSON; keep hooks for future toolbox controls

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
    // Initialize using BabylonManager
    await this.babylonManager.initialize();
    
    // Get references from manager
    this.engine = this.babylonManager.getEngine();
    this.scene = this.babylonManager.getScene();
    this.canvas = this.babylonManager.getCanvas();
    
    // Set up default camera and lighting using the execution context
    const context = this.babylonManager.getExecutionContext();
    
    // Camera
    this.camera = new context.BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 15, new context.BABYLON.Vector3(0, 2, 0), this.scene);
    this.camera.attachControl(this.canvas, true);

    // Light
    const light = new context.BABYLON.HemisphericLight('light', new context.BABYLON.Vector3(0, 1, 0), this.scene);
    light.intensity = 0.9;
    light.diffuse = new context.BABYLON.Color3(1, 1, 1);



    // Ensure dev camera state is respected on initial load
    this.updateDevCameraState();
  }

  private async ensureCodeEditor(): Promise<void> {
    try {
      // Configure Monaco Environment to disable all workers (same as AdminDashboard)
      (window as any).MonacoEnvironment = {
        getWorker: () => {
          return {
            postMessage: () => {},
            terminate: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        }
      };

      const monaco = await import('monaco-editor');
      
      // Disable language features that require workers
      monaco.languages.typescript.javascriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
      });
      monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
      });

      const host = document.getElementById('sb-code-editor');
      if (!host) {
        console.error('SceneBuilder: Code editor element not found!');
        return;
      }
      
      const defaultCode = getDefaultSceneCode();
      
      this.codeEditor = monaco.editor.create(host, {
        value: defaultCode,
        language: 'javascript',
        theme: 'vs-dark',
        readOnly: false,
        minimap: { enabled: false },
        automaticLayout: true,
        lineNumbers: 'on',
        wordWrap: 'on',
        fontSize: 12,
        wordWrapColumn: 120,
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        scrollBeyondLastLine: false,
        // Disable features that require workers to avoid errors
        quickSuggestions: false,
        parameterHints: { enabled: false },
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: "off",
        tabCompletion: "off",
        wordBasedSuggestions: "off",
      });

      // Force LTR direction on the editor
      const editorDomNode = this.codeEditor.getDomNode();
      if (editorDomNode) {
        editorDomNode.style.direction = 'ltr';
        editorDomNode.dir = 'ltr';
        
        // Also set direction on editor container
        const editorContainer = editorDomNode.querySelector('.monaco-editor');
        if (editorContainer) {
          (editorContainer as HTMLElement).style.direction = 'ltr';
          (editorContainer as HTMLElement).dir = 'ltr';
        }
      }
      

    } catch (error) {
      console.error('SceneBuilder: Failed to create Monaco editor:', error);
      this.codeEditor = null;
    }
  }

  private async ensureSceneEditor(): Promise<void> {
    // Scene JSON editor UI removed per request; keep method for future use if needed
    this.sceneEditor = null;
  }

  private async runEditorCode(): Promise<void> {
    if (!this.codeEditor) return;
    const status = document.getElementById('runtime-status');
    const code = this.codeEditor.getValue();
    try {
      if (status) status.textContent = 'تشغيل الكود...';
      
      // Use BabylonManager to execute the scene code
      const resultScene = await this.babylonManager.executeSceneCode(code);
      
      // Update our reference to the scene
      this.scene = resultScene || this.babylonManager.getScene();

      // Apply developer camera policy after user scene setup
      this.updateDevCameraState();

      if (status) status.textContent = 'تم التنفيذ';
    } catch (e) {
      console.error('SceneBuilder: Error executing scene code:', e);
      if (status) status.textContent = 'خطأ أثناء التشغيل';
    }
  }

  private toggleDevCamera(): void {
    this.devCameraEnabled = !this.devCameraEnabled;
    const btn = document.getElementById('sb-devcam');
    if (btn) btn.textContent = this.devCameraEnabled ? '🧭 كاميرا المطور: تشغيل' : '🧭 كاميرا المطور: إيقاف';
    this.updateDevCameraState();
  }

  private async cleanScene(): Promise<void> {
    if (this.codeEditor && typeof this.codeEditor.setValue === 'function') {
      this.codeEditor.setValue(getDefaultSceneCode());
    }
    
    // Use BabylonManager to execute the default scene code
    try {
      const defaultCode = getDefaultSceneCode();
      const resultScene = await this.babylonManager.executeSceneCode(defaultCode);
      this.scene = resultScene || this.babylonManager.getScene();
      this.updateDevCameraState();
    } catch (error) {
      console.error('SceneBuilder: Error cleaning scene:', error);
    }
  }

  private updateDevCameraState(): void {
    if (!this.scene || !this.canvas) return;
    // Tear down existing dev camera if present
    const removeDevCam = () => {
      if (this.devCamKeyboardObserver && this.scene && this.scene.onKeyboardObservable) {
        try { this.scene.onKeyboardObservable.remove(this.devCamKeyboardObserver); } catch {}
        this.devCamKeyboardObserver = null;
      }
      if (this.devCamBeforeRenderObserver && this.scene && this.scene.onBeforeRenderObservable) {
        try { this.scene.onBeforeRenderObservable.remove(this.devCamBeforeRenderObserver); } catch {}
        this.devCamBeforeRenderObserver = null;
      }
      if (this.devCamDocKeyDown) { try { window.removeEventListener('keydown', this.devCamDocKeyDown); } catch {} this.devCamDocKeyDown = null; }
      if (this.devCamDocKeyUp) { try { window.removeEventListener('keyup', this.devCamDocKeyUp); } catch {} this.devCamDocKeyUp = null; }
      if (this.devCamera) {
        try { this.devCamera.detachControl(); } catch {}
        try { this.devCamera.dispose(); } catch {}
        this.devCamera = null;
      }
    };

    if (this.devCameraEnabled) {
      // Capture current user active camera before overriding
      this.previousUserCamera = this.scene.activeCamera || null;
      // Create/attach dev camera
      (async () => {
        const [
          { FreeCamera },
          { Vector3 },
          _k1,
          _k2,
          _k3
        ] = await Promise.all([
          import('@babylonjs/core/Cameras/freeCamera'),
          import('@babylonjs/core/Maths/math.vector'),
          import('@babylonjs/core/Cameras/Inputs/freeCameraKeyboardMoveInput'),
          import('@babylonjs/core/Cameras/Inputs/freeCameraMouseInput'),
          import('@babylonjs/core/Cameras/Inputs/freeCameraMouseWheelInput')
        ]);
        this.devCamera = new (FreeCamera as any)('devCam', new (Vector3 as any)(0, 3, -10), this.scene);
        this.devCamera.attachControl(this.canvas, true);
        // Avoid duplicate inputs
        const attachedInputs: any = (this.devCamera as any)?.inputs?.attached || {};
        if (this.devCamera?.inputs?.addKeyboard && !attachedInputs.keyboard) {
          this.devCamera.inputs.addKeyboard();
        }
        if (this.devCamera?.inputs?.addMouse && !attachedInputs.mouse) {
          this.devCamera.inputs.addMouse();
        }
        // WASD
        this.devCamera.keysUp = [87];
        this.devCamera.keysDown = [83];
        this.devCamera.keysLeft = [65];
        this.devCamera.keysRight = [68];
        // Look/feel
        this.devCamera.speed = 0.6;
        this.devCamera.angularSensibility = 2000;
        this.devCamera.checkCollisions = false;
        this.devCamera.applyGravity = false;
        // Focus canvas to receive key events for WASD
        try { this.canvas?.setAttribute('tabindex', '0'); this.canvas?.focus(); } catch {}
        this.canvas?.addEventListener('pointerdown', () => { try { this.canvas?.focus(); } catch {} });
        // QE vertical movement via keyboard observable
        this.devCamKeyState = { up: false, down: false };
        this.devCamDocKeyDown = (ev: KeyboardEvent) => {
          if (ev.code === 'KeyQ') this.devCamKeyState.down = true;
          if (ev.code === 'KeyE') this.devCamKeyState.up = true;
        };
        this.devCamDocKeyUp = (ev: KeyboardEvent) => {
          if (ev.code === 'KeyQ') this.devCamKeyState.down = false;
          if (ev.code === 'KeyE') this.devCamKeyState.up = false;
        };
        window.addEventListener('keydown', this.devCamDocKeyDown);
        window.addEventListener('keyup', this.devCamDocKeyUp);
        this.devCamBeforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
          if (!this.devCamera) return;
          const delta = this.engine ? (this.engine.getDeltaTime() / 1000) : 0.016;
          const verticalSpeed = this.devCamera.speed * 3 * delta;
          if (this.devCamKeyState.up) this.devCamera.position.y += verticalSpeed;
          if (this.devCamKeyState.down) this.devCamera.position.y -= verticalSpeed;
        });
        // Override active camera
        this.scene.activeCamera = this.devCamera;
      })();
    } else {
      // Disable dev camera and restore user camera
      removeDevCam();
      if (this.previousUserCamera) {
        this.scene.activeCamera = this.previousUserCamera;
      }
      this.previousUserCamera = null;
    }
  }

  private openCodeLibrary(): void {
    // Open the main asset library overlay pre-filtered to Code Library
    const typeSel = document.getElementById('sb-lib-type') as HTMLSelectElement | null;
    if (typeSel) typeSel.value = 'code';
    this.openLibrary();
    // Ensure type is set if overlay just opened
    setTimeout(() => {
      const t = document.getElementById('sb-lib-type') as HTMLSelectElement | null;
      if (t) {
        t.value = 'code';
        const refresh = document.getElementById('sb-lib-refresh') as HTMLButtonElement | null;
        refresh?.click();
      }
    }, 0);
  }

  private insertCodeAtCursor(text: string): void {
    const editor = this.codeEditor;
    if (!editor || !text) return;
    const sel = editor.getSelection();
    const id = { major: 1, minor: 1 };
    editor.executeEdits('insert-code', [{ range: sel, text, forceMoveMarkers: true }], [sel], id);
    editor.focus();
  }

  private async captureAndDownload(): Promise<void> {
    if (!this.engine) return;
    const canvas = this.engine.getRenderingCanvas() as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'screenshot.png';
    link.click();
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

  private getSelected(): { id: number; name: string; type: 'box' | 'sphere' | 'ground' | 'asset'; assetType?: 'map' | 'character' | 'object'; assetName?: string; mesh: any } | null {
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



  cleanup(): void {
    // Cleanup BabylonManager
    this.babylonManager.dispose();
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
    const ensurePreviewEditor = async () => {
      if (this.libCodeEditor) return;
      try {
        // Configure Monaco Environment to disable all workers (same as main editor)
        (window as any).MonacoEnvironment = {
          getWorker: () => {
            return {
              postMessage: () => {},
              terminate: () => {},
              addEventListener: () => {},
              removeEventListener: () => {}
            };
          }
        };

        const monaco = await import('monaco-editor');
        
        // Disable language features that require workers
        monaco.languages.typescript.javascriptDefaults.setWorkerOptions({
          customWorkerPath: undefined
        });
        monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
          customWorkerPath: undefined
        });

        const host = document.getElementById('sb-lib-code-editor');
        if (!host) return;
        this.libCodeEditor = monaco.editor.create(host, {
          value: '// اختر عنصراً لعرض الكود هنا',
          language: 'javascript',
          theme: 'vs-dark',
          readOnly: false,
          minimap: { enabled: false },
          automaticLayout: true,
          lineNumbers: 'on',
          wordWrap: 'on',
          fontSize: 12,
          wordWrapColumn: 120,
          scrollbar: { vertical: 'auto', horizontal: 'auto' },
          scrollBeyondLastLine: false,
          // Disable features that require workers to avoid errors
          quickSuggestions: false,
          parameterHints: { enabled: false },
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: "off",
          tabCompletion: "off",
          wordBasedSuggestions: "off",
        });

        // Force LTR direction on the editor
        const editorDomNode = this.libCodeEditor.getDomNode();
        if (editorDomNode) {
          editorDomNode.style.direction = 'ltr';
          editorDomNode.dir = 'ltr';
          
          // Also set direction on editor container
          const editorContainer = editorDomNode.querySelector('.monaco-editor');
          if (editorContainer) {
            (editorContainer as HTMLElement).style.direction = 'ltr';
            (editorContainer as HTMLElement).dir = 'ltr';
          }
        }
      } catch {
        this.libCodeEditor = null;
      }
    };

    const load = async () => {
      const grid = document.getElementById('sb-lib-grid');
      if (!grid) return;
      grid.innerHTML = 'جاري التحميل...';
      try {
        const type = (typeSel.value as 'map' | 'character' | 'object' | 'scene' | 'code');
        const result = await this.api.listAssets(type);
        const items: Array<{ name: string; has_thumbnail?: boolean }> = result.assets || [];
        grid.innerHTML = '';
        await ensurePreviewEditor();
        const nameSpan = document.getElementById('sb-lib-selected-name');
        const insertBtn = document.getElementById('sb-lib-insert');
        const replaceBtn = document.getElementById('sb-lib-replace');
        const onSelect = async (assetName: string) => {
          this.libSelected = { type: (type === 'scene' || type === 'map' || type === 'code') ? (type as 'scene' | 'map' | 'code') : null, name: assetName };
          if (nameSpan) nameSpan.textContent = assetName;
          if (this.libCodeEditor) {
            if (type === 'scene') {
              const data = await this.api.loadAsset('scene', assetName);
              const code = data?.data?.code || '';
              this.libCodeEditor.setValue(code || '// لا يوجد كود');
              // Non-destructive copy of project assets to external-import for runtime use
              await this.copyProjectAssets('scene', assetName);
            } else if ((type as string) === 'code') {
              const data = await this.api.loadAsset('code', assetName);
              const code = data?.data?.code || '';
              this.libCodeEditor.setValue(code || '// لا يوجد كود');
              await this.copyProjectAssets('code', assetName);
            } else if (type === 'map') {
              const data = await this.api.loadAsset('map', assetName);
              const jsonStr = data?.data?.code || '';
              try {
                const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
                this.libCodeEditor.setValue(JSON.stringify(parsed, null, 2));
              } catch {
                this.libCodeEditor.setValue(String(jsonStr || ''));
              }
              await this.copyProjectAssets('map', assetName);
            } else {
              this.libCodeEditor.setValue('// هذا الأصل لا يحتوي كوداً قابلاً للإدراج');
            }
          }
          const canInsert = type === 'scene' || type === 'map' || (type as string) === 'code';
          if (insertBtn) insertBtn.toggleAttribute('disabled', !canInsert);
          if (replaceBtn) replaceBtn.toggleAttribute('disabled', !canInsert);
        };

        if (insertBtn) insertBtn.onclick = () => {
          if (!this.libCodeEditor || !this.codeEditor) return;
          const text = this.libCodeEditor.getValue();
          this.insertCodeAtCursor(text);
          if (this.libSelected && this.libSelected.type && this.libSelected.name) {
            this.copyProjectAssets(this.libSelected.type as any, this.libSelected.name);
          }
        };
        if (replaceBtn) replaceBtn.onclick = () => {
          if (!this.libCodeEditor || !this.codeEditor) return;
          const text = this.libCodeEditor.getValue();
          this.codeEditor.setValue(text);
          if (this.libSelected && this.libSelected.type && this.libSelected.name) {
            this.copyProjectAssets(this.libSelected.type as any, this.libSelected.name);
          }
        };

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
            if (type === 'scene' || type === 'map' || type === 'code') {
              await onSelect(asset.name);
            } else {
              await this.copyProjectAssets(type as 'map' | 'character' | 'object', asset.name);
              await this.addAsset(type as 'map' | 'character' | 'object', asset.name);
            }
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

  private async captureAndSaveThumbnail(type: 'map' | 'character' | 'object' | 'scene', name: string): Promise<void> {
    try {
      if (!this.engine) return;
      const canvas = this.engine.getRenderingCanvas() as HTMLCanvasElement;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 256; thumbCanvas.height = 256;
      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(canvas, 0, 0, 256, 256);
      const dataUrl = thumbCanvas.toDataURL('image/png');
      await this.api.saveThumbnail(type, name, dataUrl);
    } catch {}
  }

  private async saveToCodeLibrary(): Promise<void> {
    if (!this.codeEditor) return;
    const name = prompt('اسم الكود للمكتبة:');
    if (!name) return;
    const code = this.codeEditor.getValue();
    try {
      const result = await this.api.saveAsset('code', name, code);
      if (result?.success) {
        alert('تم حفظ الكود في مكتبة الأكواد');
      } else {
        alert('فشل حفظ الكود');
      }
    } catch (e) {
      alert('خطأ أثناء حفظ الكود');
    }
  }

  private async saveScene(): Promise<void> {
    const name = prompt('اسم المشهد:');
    if (!name) return;
    const data = this.codeEditor ? this.codeEditor.getValue() : JSON.stringify(this.serialize());
    try {
      const res = await this.api.saveAsset('scene', name, data);
      if (res?.success) {
        await this.captureAndSaveThumbnail('scene', name);
        
        // Bundle assets with scene
        await this.bundleSceneAssets(name, data);
        
        alert('تم الحفظ بنجاح مع الأصول');
      } else {
        alert('فشل الحفظ');
      }
    } catch (e) {
      alert('فشل الحفظ');
    }
  }

  private async bundleSceneAssets(sceneName: string, sceneCode: string): Promise<void> {
    try {
      console.log('Bundling assets for scene:', sceneName);
      
      // Bundle scene assets (this saves external-import contents to scene's assets folder)
      const bundleResponse = await fetch('http://localhost:5001/api/assets/bundle-scene-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sceneName, 
          sceneCode
        })
      });
      
      if (!bundleResponse.ok) {
        const errorText = await bundleResponse.text();
        console.error('Bundle assets response error:', errorText);
        throw new Error('Failed to bundle scene assets');
      } else {
        const bundleResult = await bundleResponse.json();
        console.log('Assets bundled successfully:', bundleResult);
      }
      
    } catch (error) {
      console.error('Asset bundling failed:', error);
      alert('فشل في تجميع الأصول - تحقق من اتصال الخادم');
    }
  }



  private async copyProjectAssets(type: 'map' | 'character' | 'object' | 'scene' | 'code', name: string): Promise<void> {
    try {
      await fetch('http://localhost:5001/api/assets/copy-project-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });
    } catch {}
  }

  private openImportAssetsPanel(): void {
    const panel = document.getElementById('import-assets-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    const close = document.getElementById('import-close');
    close?.addEventListener('click', () => panel.classList.add('hidden'));
    const uploadFilesBtn = document.getElementById('upload-files-btn');
    const uploadFolderBtn = document.getElementById('upload-folder-btn');
    uploadFilesBtn?.addEventListener('click', () => this.importSelectedFiles());
    uploadFolderBtn?.addEventListener('click', () => this.importSelectedFolder());
    this.refreshImportedFilesList();
  }

  private async refreshImportedFilesList(): Promise<void> {
    const list = document.getElementById('imported-files-list');
    if (!list) return;
    try {
      const resp = await fetch('http://localhost:5001/api/assets/list-external');
      const data = await resp.json();
      list.innerHTML = '';
      (data.files || []).forEach((f: any) => {
        const li = document.createElement('li');
        li.textContent = f.name;
        list.appendChild(li);
      });
    } catch {
      list.innerHTML = '<li>فشل تحميل القائمة</li>';
    }
  }

  private updateImportStatus(text: string, _cls: 'success' | 'error' | 'processing'): void {
    const el = document.getElementById('import-status');
    if (!el) return;
    el.textContent = text;
  }

  private async importSelectedFiles(): Promise<void> {
    const fileInput = document.getElementById('single-file-input') as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.updateImportStatus('يرجى اختيار ملفات للاستيراد', 'error');
      return;
    }
    await this.uploadFiles(Array.from(fileInput.files));
  }

  private async importSelectedFolder(): Promise<void> {
    const folderInput = document.getElementById('folder-input') as HTMLInputElement;
    if (!folderInput || !folderInput.files || folderInput.files.length === 0) {
      this.updateImportStatus('يرجى اختيار مجلد للاستيراد', 'error');
      return;
    }
    await this.uploadFiles(Array.from(folderInput.files));
  }

  private async uploadFiles(files: File[]): Promise<void> {
    try {
      this.updateImportStatus(`جاري رفع ${files.length} ملف...`, 'processing');
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
        formData.append('paths', (file as any).webkitRelativePath || file.name);
      });
      const response = await fetch('http://localhost:5001/api/assets/import-external', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        this.updateImportStatus(`تم رفع ${files.length} ملف بنجاح`, 'success');
        this.refreshImportedFilesList();
        const fileInput = document.getElementById('single-file-input') as HTMLInputElement;
        const folderInput = document.getElementById('folder-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        if (folderInput) folderInput.value = '';
      } else {
        throw new Error(result.error || 'فشل في رفع الملفات');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateImportStatus(`خطأ في رفع الملفات: ${errorMessage}`, 'error');
    }
  }





  private async loadSceneByName(name: string): Promise<void> {
    try {
      const result = await this.api.loadAsset('scene', name);
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


}




