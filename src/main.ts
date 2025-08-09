import "@babylonjs/loaders/glTF/glTFFileLoader";
import { Router } from '@/utils/Router';
import { MainMenu } from '@/components/MainMenu';
import { GameEngine } from '@/components/GameEngine';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SceneBuilder } from '@/components/SceneBuilder';
import { SceneFlow } from '@/components/SceneFlow';

/**
 * تطبيق محرك الألعاب الرئيسي
 */
class BabylonGameApp {
    private router: Router;
    private appContainer: HTMLElement;

    constructor() {
        this.appContainer = document.getElementById('app')!;
        this.router = new Router();
        this.initializeRoutes();
        this.start();
    }

    /**
     * تهيئة المسارات
     */
    private initializeRoutes(): void {
        this.router.addRoute('/', () => this.showMainMenu());
        this.router.addRoute('/game', () => this.showGame());
        this.router.addRoute('/admin', () => this.showAdmin());
        this.router.addRoute('/admin/scene-builder', () => this.showSceneBuilder());
    this.router.addRoute('/admin/scene-flow', () => this.showSceneFlow());
    }

    /**
     * عرض القائمة الرئيسية
     */
    private showMainMenu(): void {
        this.clearContainer();
        const mainMenu = new MainMenu(this.appContainer, this.router);
        mainMenu.render();
    }

    /**
     * عرض اللعبة
     */
    private showGame(): void {
        this.clearContainer();
        const gameEngine = new GameEngine(this.appContainer, this.router);
        gameEngine.initialize();
    }

    /**
     * عرض لوحة التحكم الإدارية
     */
    private showAdmin(): void {
        this.clearContainer();
        const adminDashboard = new AdminDashboard(this.appContainer, this.router);
        adminDashboard.initialize();
    }

    /**
     * عرض منشئ المشهد
     */
    private showSceneBuilder(): void {
        this.clearContainer();
        const sceneBuilder = new SceneBuilder(this.appContainer, this.router);
        sceneBuilder.initialize();
    }

  /**
   * عرض مخطط المشاهد
   */
  private showSceneFlow(): void {
    this.clearContainer();
    const flow = new SceneFlow(this.appContainer, this.router);
    flow.initialize();
  }

    /**
     * تنظيف الحاوية
     */
    private clearContainer(): void {
        this.appContainer.innerHTML = '';
    }

    /**
     * بدء التطبيق
     */
    private start(): void {
        this.router.start();
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new BabylonGameApp();
});

