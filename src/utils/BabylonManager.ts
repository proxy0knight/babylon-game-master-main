/**
 * Browser-compatible Babylon.js Engine Manager
 * Provides reusable engine and scene management across components
 */

export interface BabylonEngineConfig {
  canvasId: string;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
  stencil?: boolean;
  adaptToDeviceRatio?: boolean;
}

export interface SceneExecutionContext {
  engine: any;
  canvas: HTMLCanvasElement;
  BABYLON: any;
  scene?: any;
}

export class BabylonManager {
  private static instances = new Map<string, BabylonManager>();
  
  private engine: any = null;
  private scene: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private isRunning: boolean = false;
  private babylonModules: any = {};
  private callbacks: { [key: string]: Function[] } = {};

  constructor(private config: BabylonEngineConfig, private instanceId: string) {
    BabylonManager.instances.set(instanceId, this);
  }

  /**
   * Get or create a Babylon manager instance
   */
  static getInstance(instanceId: string, config?: BabylonEngineConfig): BabylonManager {
    if (BabylonManager.instances.has(instanceId)) {
      return BabylonManager.instances.get(instanceId)!;
    }
    
    if (!config) {
      throw new Error(`BabylonManager instance '${instanceId}' not found and no config provided`);
    }
    
    return new BabylonManager(config, instanceId);
  }

  /**
   * Simple event system
   */
  on(event: string, callback: Function): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  private emit(event: string, data?: any): void {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Initialize the Babylon.js engine
   */
  async initialize(): Promise<void> {
    try {
      await this.loadBabylonModules();
      await this.createEngine();
      await this.createScene();
      this.startRenderLoop();
      this.attachWindowEvents();
      
      this.emit('initialized', { engine: this.engine, scene: this.scene });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute scene code with proper context
   */
  async executeSceneCode(code: string, additionalContext: any = {}): Promise<any> {
    if (!this.scene || !this.engine) {
      throw new Error('Engine or scene not initialized');
    }

    // Create execution context
    const context = {
      ...this.babylonModules,
      engine: this.engine,
      canvas: this.canvas,
      // Additional context for external asset handling
      ...additionalContext
    };

    try {
      // Execute the scene code
      const sceneFunction = new Function(...Object.keys(context), `
        ${code}
        
        // Try to call createScene if it exists, otherwise return the scene variable
        if (typeof createScene === 'function') {
          const result = createScene();
          return result;
        } else if (typeof scene !== 'undefined') {
          return scene;
        } else {
          // Return current scene if no scene creation function found
          return arguments[${Object.keys(context).indexOf('scene')}];
        }
      `);
      
      const resultScene = sceneFunction(...Object.values(context));
      
      if (resultScene && resultScene !== this.scene) {
        // Replace current scene with new one
        const oldScene = this.scene;
        this.scene = resultScene;
        
        // Clean up old scene
        if (oldScene) {
          oldScene.dispose();
        }
        
        // The new scene already has its own activeCamera set by the createScene function
        // No need to manually set it since resultScene becomes this.scene
        
        this.emit('sceneReplaced', resultScene);
      }
      
      return resultScene || this.scene;
    } catch (error) {
      this.emit('codeExecutionError', error);
      throw error;
    }
  }

  /**
   * Get current scene
   */
  getScene(): any {
    return this.scene;
  }

  /**
   * Get current engine
   */
  getEngine(): any {
    return this.engine;
  }

  /**
   * Get current canvas
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Get execution context for manual scene creation
   */
  getExecutionContext(): SceneExecutionContext {
    return {
      engine: this.engine,
      canvas: this.canvas!,
      BABYLON: this.babylonModules.BABYLON,
      scene: this.scene
    };
  }

  /**
   * Set active camera
   */
  setActiveCamera(camera: any): void {
    if (this.scene && camera) {
      this.scene.activeCamera = camera;
      this.emit('cameraChanged', camera);
    }
  }

  /**
   * Capture screenshot
   */
  async captureScreenshot(options: { width?: number; height?: number; format?: string } = {}): Promise<string> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    return new Promise((resolve) => {
      const { format = 'png' } = options;
      this.engine.onEndFrameObservable.addOnce(() => {
        const canvas = this.engine.getRenderingCanvas();
        const dataURL = canvas.toDataURL(`image/${format}`, 1.0);
        resolve(dataURL);
      });
    });
  }

  /**
   * Resize engine
   */
  resize(): void {
    if (this.engine) {
      this.engine.resize();
      this.emit('resized');
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopRenderLoop();
    
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
    
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    
    this.canvas = null;
    
    BabylonManager.instances.delete(this.instanceId);
    this.emit('disposed');
  }

  // Private methods

  private async loadBabylonModules(): Promise<void> {
    const [
      BABYLON_CORE,
      { Engine },
      { WebGPUEngine },
      { Scene },
      { FreeCamera },
      { ArcRotateCamera },
      { HemisphericLight },
      { DirectionalLight },
      { PointLight },
      { Vector3 },
      { Color3 },
      { Color4 },
      { MeshBuilder },
      BABYLON_GUI
    ] = await Promise.all([
      import('@babylonjs/core'),
      import('@babylonjs/core/Engines/engine'),
      import('@babylonjs/core/Engines/webgpuEngine'),
      import('@babylonjs/core/scene'),
      import('@babylonjs/core/Cameras/freeCamera'),
      import('@babylonjs/core/Cameras/arcRotateCamera'),
      import('@babylonjs/core/Lights/hemisphericLight'),
      import('@babylonjs/core/Lights/directionalLight'),
      import('@babylonjs/core/Lights/pointLight'),
      import('@babylonjs/core/Maths/math.vector'),
      import('@babylonjs/core/Maths/math.color'),
      import('@babylonjs/core/Maths/math.color'),
      import('@babylonjs/core/Meshes/meshBuilder'),
      import('@babylonjs/gui')
    ]);

    // Register loaders
    try {
      const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
      const { GLTFFileLoader } = await import('@babylonjs/loaders/glTF/glTFFileLoader');
      SceneLoader.RegisterPlugin(new GLTFFileLoader());
      await import('@babylonjs/core/Loading/Plugins/babylonFileLoader');
    } catch {}

    // Create global BABYLON object
    const BABYLON = { 
      ...BABYLON_CORE, 
      Scene, 
      FreeCamera, 
      ArcRotateCamera, 
      HemisphericLight,
      DirectionalLight,
      PointLight,
      Vector3, 
      MeshBuilder, 
      Color3,
      Color4,
      GUI: BABYLON_GUI 
    };

    this.babylonModules = {
      BABYLON,
      Engine,
      WebGPUEngine,
      Scene,
      FreeCamera,
      ArcRotateCamera,
      HemisphericLight,
      DirectionalLight,
      PointLight,
      Vector3,
      Color3,
      Color4,
      MeshBuilder
    };
  }

  private async createEngine(): Promise<void> {
    this.canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas with id '${this.config.canvasId}' not found`);
    }

    const engineOptions = {
      antialias: this.config.antialias ?? true,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer ?? true,
      stencil: this.config.stencil ?? true,
      adaptToDeviceRatio: this.config.adaptToDeviceRatio ?? true
    };

    // Create WebGL engine (avoiding WebGPU browser compatibility issues)
    this.engine = new this.babylonModules.Engine(this.canvas, true, engineOptions);
    this.emit('engineCreated', { type: 'webgl', engine: this.engine });
  }

  private async createScene(): Promise<void> {
    this.scene = new this.babylonModules.Scene(this.engine);
    this.emit('sceneCreated', this.scene);
  }

  private startRenderLoop(): void {
    if (this.isRunning || !this.engine) return;
    
    this.engine.runRenderLoop(() => {
      if (this.scene && !this.scene.isDisposed) {
        try {
          this.scene.render();
        } catch (error) {
          this.emit('renderError', error);
        }
      }
    });
    
    this.isRunning = true;
    this.emit('renderStarted');
  }

  private stopRenderLoop(): void {
    if (!this.isRunning || !this.engine) return;
    
    this.engine.stopRenderLoop();
    this.isRunning = false;
    this.emit('renderStopped');
  }

  private attachWindowEvents(): void {
    window.addEventListener('resize', () => this.resize());
  }
}

/**
 * Convenience function to get a babylon manager instance
 */
export const getBabylonManager = (instanceId: string, config?: BabylonEngineConfig) => {
  return BabylonManager.getInstance(instanceId, config);
};
