/**
 * عميل API للتواصل مع خادم Flask
 */
export class ApiClient {
    private baseUrl: string;
// change the url foe the api path and make sure it is public
    constructor(baseUrl: string = `http://localhost:5001/api`) {
        this.baseUrl = baseUrl;
    }

    /**
     * حفظ أصل (خريطة، شخصية، أو كائن)
     */
    async saveAsset(type: 'map' | 'character' | 'object', name: string, code: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    name,
                    code
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving asset:', error);
            throw error;
        }
    }

    /**
     * تحميل أصل محفوظ
     */
    async loadAsset(type: 'map' | 'character' | 'object', name: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/load/${type}/${name}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error loading asset:', error);
            throw error;
        }
    }

    /**
     * الحصول على قائمة بجميع الأصول من نوع معين
     */
    async listAssets(type: 'map' | 'character' | 'object'): Promise<any> {
        try {
            
            const response = await fetch(`${this.baseUrl}/assets/list/${type}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error listing assets:', error);
            throw error;
        }
    }

    /**
     * حذف أصل محفوظ
     */
    async deleteAsset(type: 'map' | 'character' | 'object', name: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/delete/${type}/${name}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting asset:', error);
            throw error;
        }
    }

    /**
     * حفظ صورة مصغرة للأصل
     */
    async saveThumbnail(type: 'map' | 'character' | 'object', name: string, thumbnailData: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/save-thumbnail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    name,
                    thumbnail: thumbnailData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving thumbnail:', error);
            throw error;
        }
    }

    /**
     * الحصول على رابط الصورة المصغرة للأصل
     */
    getThumbnailUrl(type: 'map' | 'character' | 'object', name: string): string {
        return `${this.baseUrl}/assets/thumbnail/${type}/${name}`;
    }
}

