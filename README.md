# Babylon.js Game Engine

A comprehensive 3D browser-based game development platform built with Babylon.js, featuring a main menu, 3D game environment, and an administrative playground editor similar to the official Babylon.js Playground.

## 🌟 Features

### Core Components
- **Main Menu**: Interactive 3D background with Babylon.js Gaming logo
- **3D Game Environment**: WebGPU-powered Babylon.js engine with real-time rendering
- **Admin Dashboard**: Full-featured playground editor with Monaco code editor
- **Asset Management**: Save/load system for maps, characters, and objects
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Technical Highlights
- **Modern Stack**: Vite + TypeScript + Babylon.js v7.54.3
- **WebGPU Support**: Enhanced performance and stability
- **Modular Architecture**: Clean, organized, and maintainable code structure
- **Real-time Editing**: Live preview of 3D scenes while coding
- **Local Storage**: Flask-based API for asset management

## 🏗️ Project Structure

```
babylon-game-engine/
├── src/
│   ├── components/          # Main application components
│   │   ├── MainMenu.ts      # Main menu with 3D background
│   │   ├── GameEngine.ts    # 3D game environment
│   │   └── AdminDashboard.ts # Playground editor
│   ├── utils/
│   │   ├── Router.ts        # Client-side routing
│   │   └── ApiClient.ts     # API communication
│   ├── assets/
│   │   └── defaultScene.ts  # Default 3D scene template
│   └── main.ts              # Application entry point
├── babylon-server/          # Flask API server
│   ├── src/
│   │   ├── main.py          # Flask application
│   │   └── routes/
│   │       └── assets.py    # Asset management endpoints
│   └── data/                # Saved assets storage
│       ├── maps/
│       ├── characters/
│       └── objects/
├── public/
│   └── game-config.json     # Default game configuration
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Modern Browser** with WebGPU support (Chrome 113+, Edge 113+, Firefox 113+)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd babylon-game-engine
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up the Flask API server**
   ```bash
   cd babylon-server
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

### Development Mode

1. **Start the Flask API server**
   ```bash
   cd babylon-server
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   python src/main.py
   ```
   The API server will run on `http://localhost:5001`

2. **Start the frontend development server**
   ```bash
   # In the root directory
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

3. **Access the application**
   - Main Menu: `http://localhost:3000`
   - Game Environment: `http://localhost:3000/game`
   - Admin Dashboard: `http://localhost:3000/admin`

## 🔧 Configuration

### Network Settings

#### Development Environment
- **Frontend**: `http://localhost:3000`
- **API Server**: `http://localhost:5001`
- **CORS**: Enabled for cross-origin requests

#### Production Environment
Update the API base URL in `src/utils/ApiClient.ts`:
```typescript
constructor(baseUrl: string = 'https://your-api-domain.com/api') {
    this.baseUrl = baseUrl;
}
```

### Environment Variables

Create a `.env` file in the root directory:
```env
# Frontend Configuration
VITE_API_BASE_URL=http://localhost:5001/api

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=true
```

### Browser Compatibility

The application requires WebGPU support. Ensure your browser meets these requirements:
- **Chrome/Edge**: Version 113 or higher
- **Firefox**: Version 113 or higher with `dom.webgpu.enabled` set to `true`
- **Safari**: WebGPU support is experimental

To enable WebGPU in Firefox:
1. Open `about:config`
2. Set `dom.webgpu.enabled` to `true`
3. Restart the browser

## 🌐 Deployment

### Local Network Deployment

1. **Configure network access**
   
   Update `vite.config.ts`:
   ```typescript
   export default defineConfig({
     server: {
       host: '0.0.0.0',
       port: 3000
     }
   })
   ```

   Update Flask server in `babylon-server/src/main.py`:
   ```python
   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=5001, debug=True)
   ```

2. **Start both servers**
   ```bash
   # Terminal 1: API Server
   cd babylon-server
   source venv/bin/activate
   python src/main.py
   
   # Terminal 2: Frontend
   npm run dev
   ```

3. **Access from other devices**
   - Find your local IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux)
   - Access via: `http://YOUR_LOCAL_IP:3000`

### Production Deployment

#### Frontend (Static Hosting)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your preferred hosting service:
   - **Netlify**: Drag and drop the `dist` folder
   - **Vercel**: Connect your repository and deploy
   - **GitHub Pages**: Use GitHub Actions for automated deployment
   - **Apache/Nginx**: Copy `dist` contents to web root

#### Backend (Flask API)

1. **Production server setup**
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn**
   ```bash
   cd babylon-server
   gunicorn -w 4 -b 0.0.0.0:5001 src.main:app
   ```

3. **Nginx configuration** (optional):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api/ {
           proxy_pass http://localhost:5001/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location / {
           root /path/to/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Docker Deployment

1. **Create Dockerfile for frontend**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=0 /app/dist /usr/share/nginx/html
   EXPOSE 80
   ```

2. **Create Dockerfile for backend**
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY babylon-server/requirements.txt .
   RUN pip install -r requirements.txt
   COPY babylon-server/ .
   EXPOSE 5001
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "src.main:app"]
   ```

3. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     frontend:
       build: .
       ports:
         - "3000:80"
       depends_on:
         - backend
     
     backend:
       build:
         context: .
         dockerfile: Dockerfile.backend
       ports:
         - "5001:5001"
       volumes:
         - ./data:/app/data
   ```

## 🎮 Usage Guide

### Main Menu
- **Start Game**: Launches the 3D game environment
- **Admin Dashboard**: Opens the playground editor
- **Responsive Design**: Adapts to different screen sizes

### Game Environment
- **WASD**: Camera movement (if implemented)
- **Mouse**: Look around
- **FPS Counter**: Real-time performance monitoring
- **Coordinates Display**: Current camera position

### Admin Dashboard (Playground)
- **Code Editor**: Monaco editor with syntax highlighting
- **3D Preview**: Real-time rendering of your code
- **Save/Load**: Asset management system
- **Asset Types**: Maps, Characters, Objects
- **Language Support**: JavaScript and TypeScript

#### Playground Controls
- **New**: Clear the code editor
- **Save**: Save current code as an asset
- **Load**: Load previously saved assets
- **Run**: Execute the code in the 3D viewport
- **Format**: Auto-format the code
- **Validate**: Check for syntax errors

## 🔌 API Reference

### Endpoints

#### Save Asset
```http
POST /api/assets/save
Content-Type: application/json

{
  "type": "map|character|object",
  "name": "asset-name",
  "code": "javascript-code"
}
```

#### Load Asset
```http
GET /api/assets/load/{type}/{name}
```

#### List Assets
```http
GET /api/assets/list/{type}
```

### Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "filename": "asset-name.json"
}
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking

# Backend
cd babylon-server
python src/main.py   # Start Flask development server
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Modular Architecture**: Clean separation of concerns

### Adding New Features

1. **Create component** in `src/components/`
2. **Add route** in `src/utils/Router.ts`
3. **Update navigation** in relevant components
4. **Add API endpoints** in `babylon-server/src/routes/`

## 🐛 Troubleshooting

### Common Issues

#### WebGPU Not Supported
- **Solution**: Use a compatible browser or enable WebGPU flags
- **Fallback**: The engine automatically falls back to WebGL2

#### CORS Errors
- **Solution**: Ensure Flask-CORS is installed and configured
- **Check**: API server is running on the correct port

#### Monaco Editor Warnings
- **Issue**: Web worker warnings in console
- **Impact**: Cosmetic only, doesn't affect functionality
- **Solution**: Configure Monaco environment (optional)

#### Port Conflicts
- **Frontend**: Change port in `vite.config.ts`
- **Backend**: Change port in `babylon-server/src/main.py`

### Performance Optimization

1. **WebGPU**: Ensure WebGPU is enabled for best performance
2. **Asset Size**: Optimize 3D models and textures
3. **Code Splitting**: Lazy load components when needed
4. **Caching**: Enable browser caching for static assets

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the Babylon.js documentation: https://doc.babylonjs.com/

## 🙏 Acknowledgments

- [Babylon.js](https://www.babylonjs.com/) - 3D engine
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Vite](https://vitejs.dev/) - Build tool
- [Flask](https://flask.palletsprojects.com/) - Backend framework

---

**Built with ❤️ using Babylon.js and modern web technologies**



## التحديثات الأخيرة (الإصدار 1.1.0)

### الإصلاحات المنجزة ✅

#### 1. إصلاح محرر الكود في لوحة التحكم الإدارية
- **المشكلة**: كان محرر Monaco غير قابل للكتابة بسبب خطأ في إعداد `readOnly`
- **الحل**: تم إصلاح إعداد `readOnly: false` في محرر Monaco
- **النتيجة**: يمكن الآن الكتابة والتعديل في محرر الكود بحرية

#### 2. تحسين سلوك تحميل المشهد الافتراضي
- **المشكلة**: كان المشهد الافتراضي يتم عرضه مباشرة دون تحميل الكود في المحرر
- **الحل**: تم تعديل السلوك ليتم تحميل الكود الافتراضي في المحرر أولاً، ثم تشغيله عند الحاجة
- **النتيجة**: السلوك الصحيح - الكود في المحرر، والعرض يحدث عند التشغيل

#### 3. إضافة دعم التبديل بين WebGL2 و WebGPU
- **الميزة الجديدة**: قائمة منسدلة في شريط الأدوات للتبديل بين محركات العرض
- **الوظائف**:
  - تبديل فوري بين WebGL2 و WebGPU
  - إعادة تشغيل المشهد تلقائيًا بعد التبديل
  - تحديث معلومات المحرك في شريط الحالة
  - التراجع التلقائي إلى WebGL2 إذا لم يكن WebGPU مدعومًا

#### 4. تحسين إدارة الخوادم
- **خادم Vite**: للواجهة الأمامية (المنفذ 3000)
- **خادم Flask**: لـ API الحفظ والتحميل (المنفذ 5001)
- **التبعيات**: تم إضافة `flask-cors` و `flask-sqlalchemy` المطلوبة

### كيفية الاستخدام المحدثة

#### بدء التشغيل
```bash
# تشغيل خادم Flask (في terminal منفصل)
cd babylon-server
python src/main.py

# تشغيل خادم Vite (في terminal آخر)
cd babylon-game-engine
npm run dev
```

#### استخدام لوحة التحكم الإدارية
1. **فتح لوحة التحكم**: انقر على "لوحة التحكم" من القائمة الرئيسية
2. **محرر الكود**: سيتم تحميل الكود الافتراضي تلقائيًا
3. **تشغيل المشهد**: انقر على زر "تشغيل" لعرض المشهد في منطقة العرض ثلاثية الأبعاد
4. **تبديل المحرك**: استخدم القائمة المنسدلة لاختيار WebGL2 أو WebGPU
5. **حفظ/تحميل**: استخدم أزرار الحفظ والتحميل لإدارة الأصول

#### الميزات المتقدمة
- **تحرير الكود**: يمكن تعديل الكود في المحرر وإعادة تشغيله
- **أنواع الأصول**: دعم حفظ وتحميل الخرائط، الشخصيات، والكائنات
- **التوافق**: دعم كامل للأجهزة المحمولة والشاشات المختلفة


