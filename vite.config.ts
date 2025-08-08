import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    fs: {
      strict: false
    },
    allowedHosts: [
      '3000-i9ho0jnsu26cbx6vv81f6-e494eed5.manusvm.computer',
      '3000-ikwv5bkgclxz0t4oy5gif-6721939a.manusvm.computer'
    ]
  },
  optimizeDeps: {
    include: [
      '@babylonjs/core',
      '@babylonjs/gui',
      '@babylonjs/loaders',
      '@babylonjs/materials',
      '@babylonjs/inspector',
      '@babylonjs/serializers',
      'monaco-editor'
    ]
  }
});

