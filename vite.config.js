import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression'
import { resolveVoiceModelContentType, resolveVoiceModelLocalPath } from './src/utils/voiceModelDevServer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 语音模型中间件：开发模式下从 voice-models-local/ 提供文件，避免 280MB+ 进入构建产物
function voiceModelsPlugin() {
  return {
    name: 'serve-voice-models',
    configureServer(server) {
      const modelsDir = path.join(__dirname, 'voice-models-local')
      if (!fs.existsSync(modelsDir)) return

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/voice-models/')) return next()
        const filePath = resolveVoiceModelLocalPath(modelsDir, req.url)
        if (!filePath) return next()
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return next()
        res.setHeader('Content-Type', resolveVoiceModelContentType(filePath))
        fs.createReadStream(filePath).pipe(res)
      })
    }
  }
}

/// <reference types="vitest" />
export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 按需引入：自动注册组件和对应 API
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    // 语音模型开发服务
    voiceModelsPlugin(),
    // 生产构建 gzip 压缩（>10KB 的文件生成 .gz）
    viteCompression({
      algorithm: 'gzip',
      threshold: 10240,
      deleteOriginFile: false
    })
  ],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    server: {
      deps: {
        inline: ['element-plus']
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // 统一告警阈值：基础 UI 库（Element Plus）体积较大且已独立成 vendor chunk，
    // 将阈值调到 1000kB，避免对已知可控依赖产生噪声告警。
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 管理端收尾：手动拆分第三方依赖，降低入口包体积并缓解构建告警。
          // 这样做可以避免单个 index chunk 过大，提升首屏缓存复用效率。
          if (!id.includes('node_modules')) return

          if (id.includes('chart.js') || id.includes('vue-chartjs')) {
            return 'chart-vendor'
          }
          if (id.includes('element-plus') || id.includes('@element-plus/icons-vue')) {
            return 'element-plus-vendor'
          }
          if (id.includes('axios')) {
            return 'axios-vendor'
          }
          if (id.includes('docx')) {
            return 'docx-vendor'
          }
          if (
            id.includes('/vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/')
          ) {
            return 'vue-vendor'
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 120000
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
