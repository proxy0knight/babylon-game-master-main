# Deployment Guide - Babylon.js Game Engine

This guide provides detailed instructions for deploying the Babylon.js Game Engine in various environments.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Python**: v3.8.0 or higher
- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: Minimum 2GB free space
- **Network**: Stable internet connection for initial setup

### Browser Requirements
- **Chrome/Chromium**: v113+ (recommended)
- **Microsoft Edge**: v113+
- **Firefox**: v113+ (with WebGPU enabled)
- **Safari**: v16+ (experimental WebGPU support)

## 🏠 Local Development Setup

### Step 1: Environment Preparation

1. **Install Node.js**
   ```bash
   # Using Node Version Manager (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Or download from https://nodejs.org/
   ```

2. **Install Python**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   
   # macOS (using Homebrew)
   brew install python3
   
   # Windows: Download from https://python.org/
   ```

3. **Verify installations**
   ```bash
   node --version  # Should show v18.x.x or higher
   npm --version   # Should show 9.x.x or higher
   python3 --version  # Should show 3.8.x or higher
   ```

### Step 2: Project Setup

1. **Clone and setup frontend**
   ```bash
   git clone <repository-url>
   cd babylon-game-engine
   
   # Install dependencies
   npm install
   
   # Verify installation
   npm list --depth=0
   ```

2. **Setup backend**
   ```bash
   cd babylon-server
   
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Verify installation
   pip list
   ```

### Step 3: Configuration

1. **Create environment files**
   ```bash
   # Root directory - .env
   VITE_API_BASE_URL=http://localhost:5001/api
   VITE_APP_TITLE=Babylon.js Game Engine
   VITE_APP_VERSION=1.0.0
   ```

   ```bash
   # babylon-server/.env
   FLASK_ENV=development
   FLASK_DEBUG=true
   FLASK_APP=src/main.py
   API_PORT=5001
   CORS_ORIGINS=http://localhost:3000
   ```

2. **Update configuration files**
   
   **vite.config.ts**:
   ```typescript
   import { defineConfig } from 'vite'
   
   export default defineConfig({
     server: {
       port: 3000,
       host: 'localhost',
       cors: true
     },
     build: {
       outDir: 'dist',
       sourcemap: true
     },
     resolve: {
       alias: {
         '@': '/src'
       }
     }
   })
   ```

### Step 4: Running the Application

1. **Start backend server**
   ```bash
   cd babylon-server
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   python src/main.py
   
   # You should see:
   # * Running on http://127.0.0.1:5001
   # * Debug mode: on
   ```

2. **Start frontend server**
   ```bash
   # In root directory
   npm run dev
   
   # You should see:
   # ➜  Local:   http://localhost:3000/
   # ➜  Network: http://192.168.x.x:3000/
   ```

3. **Verify setup**
   - Frontend: http://localhost:3000
   - API Health: http://localhost:5001/api/assets/list/map
   - Admin Dashboard: http://localhost:3000/admin

## 🌐 Network Deployment

### Local Network Access

1. **Configure frontend for network access**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       host: '0.0.0.0',  // Allow external connections
       port: 3000,
       cors: true
     }
   })
   ```

2. **Configure backend for network access**
   ```python
   # babylon-server/src/main.py
   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=5001, debug=True)
   ```

3. **Update CORS settings**
   ```python
   # babylon-server/src/main.py
   from flask_cors import CORS
   
   CORS(app, origins=['http://localhost:3000', 'http://192.168.*.*:3000'])
   ```

4. **Find your local IP**
   ```bash
   # Windows
   ipconfig | findstr IPv4
   
   # macOS/Linux
   ifconfig | grep inet
   # or
   ip addr show
   ```

5. **Access from other devices**
   - Replace `localhost` with your local IP
   - Example: `http://192.168.1.100:3000`

### Firewall Configuration

#### Windows
```cmd
# Allow inbound connections
netsh advfirewall firewall add rule name="Babylon Game Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Babylon Game Backend" dir=in action=allow protocol=TCP localport=5001
```

#### macOS
```bash
# Add firewall rules (if firewall is enabled)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
```

#### Linux (UFW)
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5001/tcp
sudo ufw reload
```

## 🚀 Production Deployment

### Option 1: Traditional Server Deployment

#### Frontend (Nginx + Static Files)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Install and configure Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt install nginx
   
   # Create site configuration
   sudo nano /etc/nginx/sites-available/babylon-game
   ```

3. **Nginx configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/babylon-game;
       index index.html;
       
       # Frontend static files
       location / {
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 1y;
               add_header Cache-Control "public, immutable";
           }
       }
       
       # API proxy
       location /api/ {
           proxy_pass http://localhost:5001/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # CORS headers
           add_header Access-Control-Allow-Origin *;
           add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
           add_header Access-Control-Allow-Headers "Content-Type, Authorization";
       }
       
       # Handle preflight requests
       location /api/ {
           if ($request_method = 'OPTIONS') {
               add_header Access-Control-Allow-Origin *;
               add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
               add_header Access-Control-Allow-Headers "Content-Type, Authorization";
               return 204;
           }
       }
   }
   ```

4. **Deploy frontend**
   ```bash
   # Copy built files
   sudo cp -r dist/* /var/www/babylon-game/
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/babylon-game /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

#### Backend (Gunicorn + Systemd)

1. **Install Gunicorn**
   ```bash
   cd babylon-server
   source venv/bin/activate
   pip install gunicorn
   ```

2. **Create Gunicorn configuration**
   ```python
   # babylon-server/gunicorn.conf.py
   bind = "127.0.0.1:5001"
   workers = 4
   worker_class = "sync"
   worker_connections = 1000
   max_requests = 1000
   max_requests_jitter = 100
   timeout = 30
   keepalive = 2
   preload_app = True
   ```

3. **Create systemd service**
   ```ini
   # /etc/systemd/system/babylon-game-api.service
   [Unit]
   Description=Babylon Game API
   After=network.target
   
   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/path/to/babylon-server
   Environment=PATH=/path/to/babylon-server/venv/bin
   ExecStart=/path/to/babylon-server/venv/bin/gunicorn -c gunicorn.conf.py src.main:app
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

4. **Start and enable service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable babylon-game-api
   sudo systemctl start babylon-game-api
   sudo systemctl status babylon-game-api
   ```

### Option 2: Docker Deployment

#### Single Container Setup

1. **Create Dockerfile**
   ```dockerfile
   # Multi-stage build
   FROM node:18-alpine AS frontend-build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   
   FROM python:3.9-slim AS backend
   WORKDIR /app
   
   # Install Python dependencies
   COPY babylon-server/requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   # Copy backend code
   COPY babylon-server/ .
   
   # Copy frontend build
   COPY --from=frontend-build /app/dist ./static
   
   # Install nginx
   RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*
   
   # Copy nginx config
   COPY nginx.conf /etc/nginx/nginx.conf
   
   EXPOSE 80
   
   # Start script
   COPY start.sh .
   RUN chmod +x start.sh
   CMD ["./start.sh"]
   ```

2. **Create start script**
   ```bash
   #!/bin/bash
   # start.sh
   
   # Start nginx
   nginx &
   
   # Start Flask app
   gunicorn -w 4 -b 127.0.0.1:5001 src.main:app
   ```

3. **Build and run**
   ```bash
   docker build -t babylon-game .
   docker run -p 80:80 -v $(pwd)/data:/app/data babylon-game
   ```

#### Docker Compose Setup

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     frontend:
       build:
         context: .
         dockerfile: Dockerfile.frontend
       ports:
         - "3000:80"
       depends_on:
         - backend
       environment:
         - VITE_API_BASE_URL=http://localhost:5001/api
   
     backend:
       build:
         context: .
         dockerfile: Dockerfile.backend
       ports:
         - "5001:5001"
       volumes:
         - ./babylon-server/data:/app/data
         - ./babylon-server/logs:/app/logs
       environment:
         - FLASK_ENV=production
         - FLASK_DEBUG=false
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - frontend
         - backend
       restart: unless-stopped
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   docker-compose logs -f
   ```

### Option 3: Cloud Deployment

#### Netlify (Frontend Only)

1. **Build configuration**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [[redirects]]
     from = "/api/*"
     to = "https://your-api-domain.com/api/:splat"
     status = 200
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login and deploy
   netlify login
   netlify deploy --prod
   ```

#### Heroku (Full Stack)

1. **Create Procfile**
   ```
   web: cd babylon-server && gunicorn -w 4 -b 0.0.0.0:$PORT src.main:app
   ```

2. **Create heroku.yml**
   ```yaml
   build:
     docker:
       web: Dockerfile.heroku
   ```

3. **Deploy**
   ```bash
   heroku create babylon-game-app
   heroku stack:set container
   git push heroku main
   ```

#### AWS EC2

1. **Launch EC2 instance**
   - Ubuntu 20.04 LTS
   - t3.medium or larger
   - Security groups: HTTP (80), HTTPS (443), SSH (22)

2. **Setup script**
   ```bash
   #!/bin/bash
   # setup-ec2.sh
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Python
   sudo apt install -y python3 python3-pip python3-venv
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Install PM2
   sudo npm install -g pm2
   
   # Clone and setup project
   git clone <your-repo-url>
   cd babylon-game-engine
   npm install
   npm run build
   
   # Setup backend
   cd babylon-server
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Configure PM2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

## 🔧 Advanced Configuration

### SSL/HTTPS Setup

1. **Obtain SSL certificate**
   ```bash
   # Using Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **Update Nginx configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
       
       # Rest of configuration...
   }
   ```

### Performance Optimization

1. **Enable Gzip compression**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **Configure caching**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Enable HTTP/2**
   ```nginx
   listen 443 ssl http2;
   ```

### Monitoring and Logging

1. **Setup log rotation**
   ```bash
   # /etc/logrotate.d/babylon-game
   /var/log/babylon-game/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 www-data www-data
   }
   ```

2. **Configure application logging**
   ```python
   # babylon-server/src/main.py
   import logging
   from logging.handlers import RotatingFileHandler
   
   if not app.debug:
       file_handler = RotatingFileHandler('logs/babylon-game.log', maxBytes=10240, backupCount=10)
       file_handler.setFormatter(logging.Formatter(
           '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
       ))
       file_handler.setLevel(logging.INFO)
       app.logger.addHandler(file_handler)
   ```

## 🔍 Troubleshooting

### Common Deployment Issues

1. **Port conflicts**
   ```bash
   # Check what's using a port
   sudo netstat -tulpn | grep :3000
   sudo lsof -i :3000
   
   # Kill process using port
   sudo kill -9 <PID>
   ```

2. **Permission issues**
   ```bash
   # Fix file permissions
   sudo chown -R www-data:www-data /var/www/babylon-game
   sudo chmod -R 755 /var/www/babylon-game
   ```

3. **Service not starting**
   ```bash
   # Check service status
   sudo systemctl status babylon-game-api
   
   # View logs
   sudo journalctl -u babylon-game-api -f
   ```

4. **CORS issues**
   ```python
   # Update CORS configuration
   CORS(app, origins=['https://your-domain.com'], supports_credentials=True)
   ```

### Performance Issues

1. **High memory usage**
   - Reduce Gunicorn workers
   - Enable swap if needed
   - Monitor with `htop` or `top`

2. **Slow loading**
   - Enable Gzip compression
   - Optimize asset sizes
   - Use CDN for static assets

3. **WebGPU not working**
   - Check browser compatibility
   - Verify HTTPS (required for some WebGPU features)
   - Test WebGL2 fallback

## 📊 Monitoring

### Health Checks

1. **API health endpoint**
   ```python
   @app.route('/health')
   def health_check():
       return {'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}
   ```

2. **Frontend health check**
   ```javascript
   // Add to main.ts
   window.addEventListener('load', () => {
       fetch('/api/health')
           .then(response => response.json())
           .then(data => console.log('API Health:', data))
           .catch(error => console.error('API Health Check Failed:', error));
   });
   ```

### Metrics Collection

1. **Basic metrics**
   ```bash
   # CPU and memory usage
   top -p $(pgrep -f "gunicorn")
   
   # Disk usage
   df -h
   
   # Network connections
   ss -tuln
   ```

2. **Application metrics**
   ```python
   # Add to Flask app
   from flask import request
   import time
   
   @app.before_request
   def before_request():
       request.start_time = time.time()
   
   @app.after_request
   def after_request(response):
       duration = time.time() - request.start_time
       app.logger.info(f'{request.method} {request.path} - {response.status_code} - {duration:.3f}s')
       return response
   ```

This deployment guide should cover all the scenarios you might encounter when deploying the Babylon.js Game Engine. Choose the deployment method that best fits your needs and infrastructure.

