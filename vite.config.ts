import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/ETUDE/prestashop',
        changeOrigin: true,
        // ✅ Pas de rewrite : le chemin /api/... doit rester inchangé
        // ✅ Ajouter l'authentification pour que PrestaShop accepte la requête
        headers: {
          'Authorization': 'Basic ' + Buffer.from('XH2WM6KI15W9WXR4AB92KGVMALT6YXDY:').toString('base64')
        }
      }
    }
  }
})
