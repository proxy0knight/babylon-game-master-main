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

