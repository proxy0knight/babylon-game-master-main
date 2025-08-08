/**
 * نظام التوجيه البسيط للتطبيق
 */
export class Router {
    private routes: Map<string, () => void> = new Map();
    private currentRoute: string = '/';

    /**
     * إضافة مسار جديد
     */
    addRoute(path: string, handler: () => void): void {
        this.routes.set(path, handler);
    }

    /**
     * الانتقال إلى مسار معين
     */
    navigate(path: string): void {
        if (this.routes.has(path)) {
            this.currentRoute = path;
            history.pushState(null, '', path);
            this.routes.get(path)!();
        } else {
            console.warn(`Route not found: ${path}`);
            this.navigate('/');
        }
    }

    /**
     * الحصول على المسار الحالي
     */
    getCurrentRoute(): string {
        return this.currentRoute;
    }

    /**
     * بدء نظام التوجيه
     */
    start(): void {
        // التعامل مع أزرار المتصفح (Back/Forward)
        window.addEventListener('popstate', () => {
            this.handleLocationChange();
        });

        // التعامل مع المسار الحالي
        this.handleLocationChange();
    }

    /**
     * التعامل مع تغيير الموقع
     */
    private handleLocationChange(): void {
        const path = window.location.pathname;
        if (this.routes.has(path)) {
            this.currentRoute = path;
            this.routes.get(path)!();
        } else {
            this.navigate('/');
        }
    }

    /**
     * العودة للصفحة السابقة
     */
    goBack(): void {
        history.back();
    }
}

