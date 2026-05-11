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
        target: 'http://localhost/ETUDE/prestashop_edition_classic_version_8.2.6',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        // Injecte l'auth pour toutes les requêtes proxy (y compris les <img>)
        headers: {
          Authorization: 'Basic ' + Buffer.from('3GRNXCFZWTWID1J1LHIPAB5CTTE14W2X:').toString('base64')
        }
      }
    }
  }
})
