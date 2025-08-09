import { Router } from '@/utils/Router';
import { createDefaultScene } from '@/assets/defaultScene';
import { ApiClient } from '@/utils/ApiClient';

/**
 * محرك اللعبة ثلاثية الأبعاد
 */
export class GameEngine {
    private container: HTMLElement;
    private router: Router;
    private engine: any;
    private scene: any;
    private canvas: HTMLCanvasElement | null = null;
    private apiClient: ApiClient;

    constructor(container: HTMLElement, router: Router) {
        this.container = container;
        this.router = router;
        this.apiClient = new ApiClient();
    }

    /**
     * تهيئة محرك اللعبة
     */
    async initialize(): Promise<void> {
        this.container.innerHTML = this.getHTML();
        this.attachEventListeners();
        await this.initializeBabylon();
        await this.loadGameData();
    }

    /**
     * تهيئة محرك اللعبة مع المخطط النشط
     */
    async initializeWithActiveFlow(): Promise<void> {
        this.container.innerHTML = this.getHTML();
        this.attachEventListeners();
        await this.initializeBabylon();
        await this.loadActiveFlowOrDefault();
    }

    /**
     * الحصول على HTML لمحرك اللعبة
     */
    private getHTML(): string {
        return `
            <div class="game-engine">
                <div class="game-header">
                    <button id="back-btn" class="back-btn">
                        <span>←</span>
                        <span>العودة</span>
                    </button>
                    <div class="game-title">
                        <h2>بيئة اللعبة ثلاثية الأبعاد</h2>
                    </div>
                    <div class="game-controls">
                        <button id="fullscreen-btn" class="control-btn">⛶</button>
                        <button id="settings-btn" class="control-btn">⚙️</button>
                    </div>
                </div>
                
                <div class="game-viewport">
                    <canvas id="game-canvas"></canvas>
                    <div id="loading-overlay" class="loading-overlay">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">جاري تحميل البيئة ثلاثية الأبعاد...</div>
                    </div>
                </div>
                
                <div class="game-ui">
                    <div class="fps-counter" id="fps-counter">FPS: --</div>
                    <div class="coordinates" id="coordinates">X: 0, Y: 0, Z: 0</div>
                </div>
            </div>
            
            <style>
                .game-engine {
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #1a1a1a;
                    color: white;
                }
                
                .game-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 2rem;
                    background: rgba(0, 0, 0, 0.8);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .back-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateX(-2px);
                }
                
                .game-title h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                }
                
                .game-controls {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .control-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                }
                
                .control-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                .game-viewport {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                
                #game-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                }
                
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }
                
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .loading-text {
                    font-size: 1.2rem;
                    color: white;
                }
                
                .game-ui {
                    position: absolute;
                    top: 80px;
                    left: 20px;
                    z-index: 5;
                }
                
                .fps-counter, .coordinates {
                    background: rgba(0, 0, 0, 0.7);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                @media (max-width: 768px) {
                    .game-header {
                        padding: 0.5rem 1rem;
                    }
                    
                    .game-title h2 {
                        font-size: 1.2rem;
                    }
                    
                    .control-btn {
                        width: 35px;
                        height: 35px;
                        font-size: 1rem;
                    }
                    
                    .game-ui {
                        top: 70px;
                        left: 10px;
                    }
                    
                    .fps-counter, .coordinates {
                        font-size: 0.8rem;
                        padding: 0.3rem 0.8rem;
                    }
                }
            </style>
        `;
    }

    /**
     * ربط مستمعي الأحداث
     */
    private attachEventListeners(): void {
        const backBtn = document.getElementById('back-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const settingsBtn = document.getElementById('settings-btn');

        backBtn?.addEventListener('click', () => {
            this.cleanup();
            this.router.navigate('/');
        });

        fullscreenBtn?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        settingsBtn?.addEventListener('click', () => {
            this.showSettings();
        });
    }

    /**
     * تهيئة Babylon.js
     */
    private async initializeBabylon(): Promise<void> {
        try {
            // استيراد Babylon.js
            const [
                { Engine, WebGPUEngine },
                { Scene },
                { FreeCamera },
                { ArcRotateCamera },
                { HemisphericLight, DirectionalLight },
                { Vector3 },
                { Color3 },
                { MeshBuilder },
                { StandardMaterial }
            ] = await Promise.all([
                import('@babylonjs/core/Engines/engine'),
                import('@babylonjs/core/scene'),
                import('@babylonjs/core/Cameras/freeCamera'),
                import('@babylonjs/core/Cameras/arcRotateCamera'),
                import('@babylonjs/core/Lights/hemisphericLight'),
                import('@babylonjs/core/Maths/math.vector'),
                import('@babylonjs/core/Maths/math.color'),
                import('@babylonjs/core/Meshes/meshBuilder'),
                import('@babylonjs/core/Materials/standardMaterial')
            ]);
            
            this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
            if (!this.canvas) throw new Error('Canvas not found');

            // إنشاء المحرك
            this.engine = new Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true,
                antialias: true,
                powerPreference: 'high-performance'
            });

            // إنشاء المشهد باستخدام المشهد الافتراضي
            this.scene = createDefaultScene(this.engine, this.canvas, {
                Scene,
                FreeCamera,
                ArcRotateCamera,
                HemisphericLight,
                Vector3,
                Color3,
                MeshBuilder,
                StandardMaterial
            });
            
            // بدء حلقة الرسم
            this.engine.runRenderLoop(() => {
                this.scene.render();
                this.updateUI();
            });

            // التعامل مع تغيير حجم النافذة
            window.addEventListener('resize', () => {
                this.engine.resize();
            });

            // إخفاء شاشة التحميل
            this.hideLoadingOverlay();

        } catch (error) {
            console.error('Failed to initialize Babylon.js:', error);
            this.showError('فشل في تهيئة محرك الرسم ثلاثي الأبعاد');
        }
    }

    /**
     * تحميل بيانات اللعبة من ملف JSON أو من الخادم
     */
    private async loadGameData(): Promise<void> {
        try {
            // محاولة تحميل خريطة محفوظة أولاً
            const mapsResult = await this.apiClient.listAssets('map');
            
            if (mapsResult.success && mapsResult.assets.length > 0) {
                // استخدام أول خريطة متاحة
                const firstMap = mapsResult.assets[0];
                const mapResult = await this.apiClient.loadAsset('map', firstMap.name);
                
                if (mapResult.success && mapResult.data) {
                    console.log(`Loaded saved map: ${mapResult.data.name}`);
                    // يمكن تطبيق الكود المحفوظ هنا إذا لزم الأمر
                    return;
                }
            }
            
            // إذا لم توجد خرائط محفوظة، استخدم الإعدادات الافتراضية
            const response = await fetch('/game-config.json');
            if (response.ok) {
                const gameConfig = await response.json();
                console.log('Game configuration loaded:', gameConfig);
                // تطبيق الإعدادات هنا
            } else {
                console.warn('Game configuration file not found, using defaults');
            }
            
        } catch (error) {
            console.warn('Failed to load game data:', error);
        }
    }

    /**
     * تحميل المخطط النشط أو المشهد الافتراضي
     */
    private async loadActiveFlowOrDefault(): Promise<void> {
        try {
            // Check for active flow in localStorage
            const activeFlowName = localStorage.getItem('activeFlowName');
            console.log('Active flow name from localStorage:', activeFlowName);
            
            if (activeFlowName) {
                console.log(`Loading active flow: ${activeFlowName}`);
                
                // Try to load the active flow
                const flowResult = await this.apiClient.loadAsset('flow', activeFlowName);
                console.log('Flow load result:', flowResult);
                
                if (flowResult.success && flowResult.data) {
                    console.log('Flow data received:', flowResult.data);
                    
                    const flowData = typeof flowResult.data.code === 'string' 
                        ? JSON.parse(flowResult.data.code) 
                        : flowResult.data.code;
                    
                    console.log('Parsed flow data:', flowData);
                    
                    if (flowData && flowData.nodes && flowData.edges) {
                        console.log('Flow has nodes and edges, looking for Game Start node');
                        
                        // Find the "Game Start" node to determine the first scene
                        const gameStartNode = flowData.nodes.find((node: any) => node.name === 'Game Start');
                        console.log('Game Start node found:', gameStartNode);
                        
                        if (gameStartNode) {
                            // Find outgoing edges from Game Start node (check both from and fromNodeId properties)
                            const startEdges = flowData.edges.filter((edge: any) => 
                                edge.from === gameStartNode.id || edge.fromNodeId === gameStartNode.id
                            );
                            console.log('Start edges from Game Start node:', startEdges);
                            
                            if (startEdges.length > 0) {
                                // Get the first connected scene (check both to and toNodeId properties)
                                const targetId = startEdges[0].to || startEdges[0].toNodeId;
                                const firstSceneNode = flowData.nodes.find((node: any) => node.id === targetId);
                                console.log('First scene node to load:', firstSceneNode);
                                
                                if (firstSceneNode && firstSceneNode.name !== 'Game Start') {
                                    console.log(`Starting game with scene: ${firstSceneNode.name}`);
                                    await this.loadAndExecuteScene(firstSceneNode.name, flowData);
                                    return;
                                } else {
                                    console.warn('First scene node is invalid or is Game Start');
                                }
                            } else {
                                console.warn('No outgoing edges from Game Start node');
                            }
                        } else {
                            console.warn('Game Start node not found in flow');
                        }
                    } else {
                        console.warn('Flow data missing nodes or edges');
                    }
                } else {
                    console.warn('Failed to load flow data or flow result unsuccessful');
                }
                
                console.warn(`Failed to load active flow: ${activeFlowName}, falling back to default`);
            } else {
                console.log('No active flow set, using default scene');
            }
            
            // Fallback to default behavior
            await this.loadGameData();
            
        } catch (error) {
            console.error('Failed to load active flow, using default:', error);
            await this.loadGameData();
        }
    }

    /**
     * تحميل وتشغيل مشهد معين من المخطط
     */
    private async loadAndExecuteScene(sceneName: string, flowData: any): Promise<void> {
        try {
            // Load the scene code
            const sceneResult = await this.apiClient.loadAsset('scene', sceneName);
            
            if (sceneResult.success && sceneResult.data && sceneResult.data.code) {
                console.log(`Executing scene: ${sceneName}`);
                
                // Execute the scene code instead of the default scene
                await this.executeSceneCode(sceneResult.data.code, sceneName, flowData);
            } else {
                console.warn(`Scene not found: ${sceneName}, using default scene`);
                // Fallback to default if scene not found
            }
            
        } catch (error) {
            console.error(`Failed to load scene ${sceneName}:`, error);
        }
    }

    /**
     * تشغيل كود المشهد
     */
    private async executeSceneCode(code: string, sceneName: string, flowData: any): Promise<void> {
        try {
            // Update the loading text to show current scene
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = `جاري تحميل المشهد: ${sceneName}`;
            }

            // Clear the current scene
            if (this.scene) {
                this.scene.dispose();
            }

            // Import Babylon modules (same as in Scene Builder)
            const [
                BABYLON_CORE,
                { Scene },
                { FreeCamera },
                { ArcRotateCamera },
                { HemisphericLight },
                { Vector3 },
                { MeshBuilder },
                { Color3 },
                BABYLON_GUI
            ] = await Promise.all([
                import('@babylonjs/core'),
                import('@babylonjs/core/scene'),
                import('@babylonjs/core/Cameras/freeCamera'),
                import('@babylonjs/core/Cameras/arcRotateCamera'),
                import('@babylonjs/core/Lights/hemisphericLight'),
                import('@babylonjs/core/Maths/math.vector'),
                import('@babylonjs/core/Meshes/meshBuilder'),
                import('@babylonjs/core/Maths/math.color'),
                import('@babylonjs/gui')
            ]);

            // Register loaders
            try {
                const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
                const { GLTFFileLoader } = await import('@babylonjs/loaders/glTF/glTFFileLoader');
                SceneLoader.RegisterPlugin(new GLTFFileLoader());
            } catch {}

            try {
                await import('@babylonjs/core/Loading/Plugins/babylonFileLoader');
            } catch {}

            // Create Babylon context with GUI included
            const BABYLON = { 
                ...BABYLON_CORE, 
                Scene, 
                FreeCamera, 
                ArcRotateCamera, 
                HemisphericLight, 
                Vector3, 
                MeshBuilder, 
                Color3,
                GUI: BABYLON_GUI  // Add GUI to BABYLON object
            };

            // Create scene evaluation context (without creating scene yet)
            const context = {
                BABYLON,
                engine: this.engine,
                canvas: this.canvas,
                // Add flow navigation capabilities
                navigateToScene: (targetSceneName: string) => this.navigateToScene(targetSceneName, flowData),
                triggerFlow: (triggerId: string) => this.triggerFlow(triggerId, flowData, sceneName)
            };

            // Execute the scene code and get the result
            const sceneFunction = new Function(...Object.keys(context), `
                ${code}
                
                // Try to call createScene if it exists, otherwise return the scene variable
                if (typeof createScene === 'function') {
                    return createScene();
                } else if (typeof scene !== 'undefined') {
                    return scene;
                } else {
                    // Fallback: create a basic scene
                    const fallbackScene = new BABYLON.Scene(engine);
                    return fallbackScene;
                }
            `);
            
            const resultScene = sceneFunction(...Object.values(context));
            
            // Set the returned scene as the active scene
            if (resultScene) {
                this.scene = resultScene;
                console.log(`Scene "${sceneName}" loaded successfully with camera:`, this.scene.activeCamera ? 'Yes' : 'No');
                
                // Set up global flow trigger function for scene code to use
                (window as any).__triggerFlowNode = (triggerId: string) => {
                    console.log(`Flow trigger activated: ${triggerId}`);
                    this.triggerFlow(triggerId, flowData, sceneName);
                };
                
            } else {
                throw new Error('Scene creation function did not return a valid scene');
            }

        } catch (error) {
            console.error(`Error executing scene "${sceneName}":`, error);
            // Show error to user
            this.showError(`خطأ في تحميل المشهد: ${sceneName}`);
        }
    }

    /**
     * الانتقال إلى مشهد آخر في المخطط
     */
    private async navigateToScene(targetSceneName: string, flowData: any): Promise<void> {
        console.log(`Navigating to scene: ${targetSceneName}`);
        await this.loadAndExecuteScene(targetSceneName, flowData);
    }

    /**
     * تفعيل انتقال في المخطط باستخدام trigger
     */
    private async triggerFlow(triggerId: string, flowData: any, currentSceneName: string): Promise<void> {
        try {
            console.log(`=== TRIGGER FLOW DEBUG ===`);
            console.log(`Trigger ID: ${triggerId}`);
            console.log(`Current Scene: ${currentSceneName}`);
            console.log(`Flow Data:`, flowData);
            
            // Find the current scene node
            const currentNode = flowData.nodes.find((node: any) => node.name === currentSceneName);
            console.log(`Current Node:`, currentNode);
            
            if (!currentNode) {
                console.warn(`Current scene node not found: ${currentSceneName}`);
                return;
            }

            // Show all edges for debugging
            console.log(`All edges:`, flowData.edges);
            
            // Find edges that start from current node and match the trigger
            const matchingEdge = flowData.edges.find((edge: any) => 
                (edge.from === currentNode.id || edge.fromNodeId === currentNode.id) && 
                edge.fromPort === triggerId
            );

            console.log(`Matching edge for trigger "${triggerId}":`, matchingEdge);

            if (matchingEdge) {
                // Find the target node
                const targetId = matchingEdge.to || matchingEdge.toNodeId;
                const targetNode = flowData.nodes.find((node: any) => node.id === targetId);
                console.log(`Target Node:`, targetNode);
                
                if (targetNode && targetNode.name !== 'Game Start') {
                    console.log(`✅ Triggering flow from ${currentSceneName} to ${targetNode.name} via ${triggerId}`);
                    
                    // Handle different link types
                    if (matchingEdge.linkType === 'overlay') {
                        // For overlay, we could implement a different behavior
                        // For now, just navigate normally
                        await this.navigateToScene(targetNode.name, flowData);
                    } else {
                        // Default replace behavior
                        await this.navigateToScene(targetNode.name, flowData);
                    }
                } else {
                    console.warn(`❌ Target node not found or is Game Start node`);
                }
            } else {
                console.warn(`❌ No flow edge found for trigger: ${triggerId} from scene: ${currentSceneName}`);
                
                // Debug: Show what triggers are available
                const availableEdges = flowData.edges.filter((edge: any) => 
                    edge.from === currentNode.id || edge.fromNodeId === currentNode.id
                );
                console.log(`Available outgoing edges from current node:`, availableEdges);
                
                const availableTriggers = availableEdges.map((edge: any) => edge.fromPort);
                console.log(`Available trigger IDs:`, availableTriggers);
            }

        } catch (error) {
            console.error(`Error triggering flow with ${triggerId}:`, error);
        }
    }

    /**
     * تحديث واجهة المستخدم
     */
    private updateUI(): void {
        const fpsCounter = document.getElementById('fps-counter');
        const coordinates = document.getElementById('coordinates');
        
        if (fpsCounter && this.engine) {
            fpsCounter.textContent = `FPS: ${Math.round(this.engine.getFps())}`;
        }
        
        if (coordinates && this.scene) {
            const camera = this.scene.activeCamera;
            if (camera) {
                const pos = camera.position;
                coordinates.textContent = `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
            }
        }
    }

    /**
     * إخفاء شاشة التحميل
     */
    private hideLoadingOverlay(): void {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    /**
     * عرض رسالة خطأ
     */
    private showError(message: string): void {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <div style="font-size: 1.2rem; color: #ff6b6b;">${message}</div>
                </div>
            `;
        }
    }

    /**
     * تبديل وضع ملء الشاشة
     */
    private toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * عرض الإعدادات
     */
    private showSettings(): void {
        // TODO: تنفيذ نافذة الإعدادات
        console.log('Settings clicked');
    }

    /**
     * تنظيف الموارد
     */
    private cleanup(): void {
        if (this.engine) {
            this.engine.dispose();
        }
        if (this.scene) {
            this.scene.dispose();
        }
    }
}

