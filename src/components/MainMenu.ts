import { Router } from '@/utils/Router';

/**
 * مكون القائمة الرئيسية
 */
export class MainMenu {
    private container: HTMLElement;
    private router: Router;

    constructor(container: HTMLElement, router: Router) {
        this.container = container;
        this.router = router;
    }

    /**
     * عرض القائمة الرئيسية
     */
    render(): void {
        this.container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.initializeBackground();
    }

    /**
     * الحصول على HTML للقائمة الرئيسية
     */
    private getHTML(): string {
        return `
            <div class="main-menu">
                <canvas id="background-canvas"></canvas>
                <div class="menu-overlay">
                    <div class="logo-container">
                        <div class="logo">
                            <div class="logo-icon">🎮</div>
                            <div class="logo-text">
                                <h1>Babylon.js</h1>
                                <span>Game Engine</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="menu-buttons">
                        <button id="start-game-btn" class="menu-btn primary">
                            <span class="btn-icon">🚀</span>
                            <span class="btn-text">بدء اللعبة</span>
                        </button>
                        
                        <button id="admin-dashboard-btn" class="menu-btn secondary">
                            <span class="btn-icon">⚙️</span>
                            <span class="btn-text">لوحة التحكم</span>
                        </button>
                    </div>
                    
                    <div class="version-info">
                        <span>الإصدار 1.0.0</span>
                    </div>
                </div>
            </div>
            
            <style>
                .main-menu {
                    position: relative;
                    width: 100%;
                    height: 100vh;
                    overflow: hidden;
                }
                
                #background-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }
                
                .menu-overlay {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(5px);
                }
                
                .logo-container {
                    margin-bottom: 4rem;
                    text-align: center;
                }
                
                .logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: white;
                }
                
                .logo-icon {
                    font-size: 4rem;
                    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
                }
                
                .logo-text h1 {
                    font-size: 3rem;
                    font-weight: bold;
                    margin: 0;
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
                }
                
                .logo-text span {
                    font-size: 1.2rem;
                    opacity: 0.8;
                    display: block;
                    margin-top: 0.5rem;
                }
                
                .menu-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    align-items: center;
                }
                
                .menu-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 2rem;
                    border: none;
                    border-radius: 12px;
                    font-size: 1.2rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 250px;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                
                .menu-btn.primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
                }
                
                .menu-btn.secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }
                
                .menu-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                }
                
                .menu-btn.primary:hover {
                    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
                }
                
                .menu-btn.secondary:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.4);
                }
                
                .btn-icon {
                    font-size: 1.5rem;
                }
                
                .version-info {
                    position: absolute;
                    bottom: 2rem;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.9rem;
                }
                
                @media (max-width: 768px) {
                    .logo-text h1 {
                        font-size: 2rem;
                    }
                    
                    .menu-btn {
                        min-width: 200px;
                        padding: 0.8rem 1.5rem;
                        font-size: 1rem;
                    }
                    
                    .logo-icon {
                        font-size: 3rem;
                    }
                }
            </style>
        `;
    }

    /**
     * ربط مستمعي الأحداث
     */
    private attachEventListeners(): void {
        const startGameBtn = document.getElementById('start-game-btn');
        const adminDashboardBtn = document.getElementById('admin-dashboard-btn');

        startGameBtn?.addEventListener('click', () => {
            this.router.navigate('/game');
        });

        adminDashboardBtn?.addEventListener('click', () => {
            this.router.navigate('/admin');
        });
    }

    /**
     * تهيئة الخلفية ثلاثية الأبعاد
     */
    private async initializeBackground(): Promise<void> {
        const canvas = document.getElementById('background-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        try {
            // استيراد Babylon.js بشكل مودولي
            const [
                { Engine },
                { Scene },
                { ArcRotateCamera },
                { HemisphericLight },
                { Vector3 },
                { Color3, Color4 },
                { MeshBuilder },
                { StandardMaterial }
            ] = await Promise.all([
                import('@babylonjs/core/Engines/engine'),
                import('@babylonjs/core/scene'),
                import('@babylonjs/core/Cameras/arcRotateCamera'),
                import('@babylonjs/core/Lights/hemisphericLight'),
                import('@babylonjs/core/Maths/math.vector'),
                import('@babylonjs/core/Maths/math.color'),
                import('@babylonjs/core/Meshes/meshBuilder'),
                import('@babylonjs/core/Materials/standardMaterial')
            ]);
            
            // إنشاء المحرك
            const engine = new Engine(canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            // إنشاء المشهد
            const scene = new Scene(engine);
            scene.clearColor = new Color4(0, 0, 0, 0);

            // إنشاء الكاميرا
            const camera = new ArcRotateCamera(
                'camera',
                0,
                Math.PI / 3,
                10,
                Vector3.Zero(),
                scene
            );

            // إنشاء الإضاءة
            const light = new HemisphericLight(
                'light',
                new Vector3(0, 1, 0),
                scene
            );
            light.intensity = 0.7;

            // إنشاء كائنات ثلاثية الأبعاد للخلفية
            this.createBackgroundObjects(scene, {
                MeshBuilder,
                StandardMaterial,
                Color3,
                Vector3
            });

            // بدء حلقة الرسم
            engine.runRenderLoop(() => {
                scene.render();
            });

            // التعامل مع تغيير حجم النافذة
            window.addEventListener('resize', () => {
                engine.resize();
            });

        } catch (error) {
            console.warn('Failed to initialize 3D background:', error);
        }
    }

    /**
     * إنشاء كائنات الخلفية ثلاثية الأبعاد
     */
    private createBackgroundObjects(scene: any, BABYLON: any): void {
        // إنشاء جسيمات متحركة
        for (let i = 0; i < 20; i++) {
            const sphere = BABYLON.MeshBuilder.CreateSphere(
                `sphere${i}`,
                { diameter: 0.1 },
                scene
            );

            // مادة مضيئة
            const material = new BABYLON.StandardMaterial(`mat${i}`, scene);
            material.emissiveColor = new BABYLON.Color3(
                Math.random(),
                Math.random(),
                Math.random()
            );
            material.alpha = 0.6;
            sphere.material = material;

            // موضع عشوائي
            sphere.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            // حركة دورانية
            scene.registerBeforeRender(() => {
                sphere.rotation.y += 0.01;
                sphere.rotation.x += 0.005;
                
                // حركة عائمة
                sphere.position.y += Math.sin(Date.now() * 0.001 + i) * 0.01;
            });
        }
    }
}

