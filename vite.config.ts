import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Gzip 压缩
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240, // 只压缩大于 10KB 的文件
          deleteOriginFile: false,
        }),
        // Brotli 压缩 (更高压缩率)
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 10240,
          deleteOriginFile: false,
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase chunk size warning limit to avoid warnings for large three.js chunk
        chunkSizeWarningLimit: 2000, // 2MB
        rollupOptions: {
          output: {
            manualChunks: {
              'threejs': ['three', '@react-three/fiber', '@react-three/drei'],
              'gesture': ['@use-gesture/react'],
              'icons': ['lucide-react'],
              'react': ['react', 'react-dom']
            }
          }
        },
        // Enable gzip compression
        assetsDir: 'assets',
        // Optimize for production
        minify: 'esbuild',
        esbuildOptions: {
          drop: ['console', 'debugger'],
        },
        // Target modern browsers
        target: 'es2020',
        // Enable CSS code splitting
        cssCodeSplit: true,
        // Generate source maps for production
        sourcemap: false,
      },
      // Optimize dependencies pre-bundling
      optimizeDeps: {
        include: ['three', '@react-three/fiber', '@react-three/drei', '@use-gesture/react'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
    };
});
