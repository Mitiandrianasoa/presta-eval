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
        target: 'http://localhost:8081/EVALUATION/prestashop_edition_classic_version_8.2.6',
        changeOrigin: true,
        // ✅ Pas de rewrite : le chemin /api/... doit rester inchangé
        // ✅ Ajouter l'authentification pour que PrestaShop accepte la requête
        headers: {
          'Authorization': 'Basic ' + Buffer.from('bqHTFCOOgQIPEq03m6yZTUZt6iyhAwVG:').toString('base64')
        }
      },
      // Proxy pour l'endpoint shiporder.php (gestion état + stock)
      '/shiporder': {
        target: 'http://localhost:8081/EVALUATION/prestashop_edition_classic_version_8.2.6',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/shiporder/, '/index.php'),
      }
    }
  }
})
