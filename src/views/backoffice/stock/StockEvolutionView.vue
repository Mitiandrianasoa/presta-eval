<template>
  <div class="evo-layout">
    <Sidebar
      @show-products="router.push('/admin')"
      @show-categories="router.push('/admin?view=categories')"
      @show-stock="router.push('/admin?view=stock')"
      @show-customers="router.push('/admin?view=customers')"
      @show-brands-suppliers="router.push('/admin?view=products')"
      @show-import="router.push('/import')"
    />

    <div class="evo-container">
      <!-- Header -->
      <div class="page-header">
        <div class="page-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <div>
            <h1>Évolution journalière du stock</h1>
            <p>Historique des mouvements de stock par produit</p>
          </div>
        </div>
      </div>

      <!-- Sélecteur de produit -->
      <div class="product-selector-card">
        <div class="selector-row">
          <div class="search-group">
            <label>Produit</label>
            <div class="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="productSearch"
                type="text"
                placeholder="Rechercher par nom ou référence…"
                class="product-search"
                @input="onSearchInput"
              />
            </div>
            <div v-if="searchResults.length > 0" class="search-dropdown">
              <div
                v-for="p in searchResults"
                :key="p.id"
                class="search-result"
                @click="selectProduct(p)"
              >
                <span class="res-name">{{ p.name }}</span>
                <span class="res-ref">{{ p.reference }}</span>
              </div>
            </div>
          </div>

          <div class="days-group">
            <label>Période</label>
            <select v-model="days" class="days-select" @change="loadMovements">
              <option :value="7">7 jours</option>
              <option :value="14">14 jours</option>
              <option :value="30">30 jours</option>
              <option :value="90">3 mois</option>
              <option :value="180">6 mois</option>
              <option :value="365">1 an</option>
            </select>
          </div>
        </div>

        <div v-if="selectedProduct" class="selected-product-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <strong>{{ selectedProduct.name }}</strong>
          <span class="ref-tag">{{ selectedProduct.reference }}</span>
          <span class="stock-badge" :class="currentStock > 0 ? 'in-stock' : 'out-stock'">
            {{ currentStock }} en stock
          </span>
          <button class="btn-change" @click="clearProduct">Changer</button>
        </div>
      </div>

      <template v-if="selectedProduct">

        <!-- Stats rapides -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-num">{{ currentStock }}</span>
            <span class="stat-lbl">Stock actuel</span>
          </div>
          <div class="stat-card stat-green">
            <span class="stat-num">+{{ totalIn }}</span>
            <span class="stat-lbl">Entrées ({{ days }}j)</span>
          </div>
          <div class="stat-card stat-red">
            <span class="stat-num">-{{ totalOut }}</span>
            <span class="stat-lbl">Sorties ({{ days }}j)</span>
          </div>
          <div class="stat-card stat-purple">
            <span class="stat-num">{{ movements.length }}</span>
            <span class="stat-lbl">Mouvements</span>
          </div>
        </div>

        <!-- Sparkline SVG -->
        <div v-if="sparkDots.length > 1" class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Tendance du stock ({{ days }} jours)</span>
            <div class="chart-legend">
              <span class="leg-dot leg-green"></span><span>Entrée</span>
              <span class="leg-dot leg-red"></span><span>Sortie</span>
            </div>
          </div>
          <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="sparkline" preserveAspectRatio="none">
            <line
              v-for="(y, i) in gridLines" :key="i"
              x1="0" :y1="y" :x2="SVG_W" :y2="y"
              stroke="#e9ecef" stroke-width="1"
            />
            <polyline :points="sparkPoints" fill="none" stroke="#8e44ad" stroke-width="2.5" stroke-linejoin="round"/>
            <circle
              v-for="(pt, i) in sparkDots" :key="i"
              :cx="pt.x" :cy="pt.y" r="4"
              :fill="pt.sign > 0 ? '#27ae60' : '#e74c3c'"
              stroke="white" stroke-width="1.5"
            />
          </svg>
        </div>

        <!-- Table des mouvements -->
        <div class="table-card">
          <div class="table-header">
            <h2>Historique des mouvements</h2>
            <span class="entry-count">{{ movements.length }} entrée(s)</span>
            <button class="btn-reload" @click="loadMovements" :disabled="loadingMvt">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Actualiser
            </button>
          </div>

          <div v-if="loadingMvt" class="loading-state">
            <div class="spinner"></div><p>Chargement…</p>
          </div>

          <div v-else-if="movements.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Aucun mouvement sur cette période</p>
          </div>

          <div v-else class="table-wrap">
            <table class="evo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th class="num-col">Quantité</th>
                  <th class="num-col">Sens</th>
                  <th>Origine</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(mvt, i) in movements"
                  :key="i"
                  :class="mvt.sign > 0 ? 'row-in' : 'row-out'"
                >
                  <td class="date-cell">{{ formatDate(mvt.date_add) }}</td>
                  <td class="time-cell">{{ formatTime(mvt.date_add) }}</td>
                  <td class="num-col">
                    <span :class="['delta-badge', mvt.sign > 0 ? 'delta-pos' : 'delta-neg']">
                      {{ mvt.sign > 0 ? '+' : '−' }}{{ mvt.physical_quantity }}
                    </span>
                  </td>
                  <td class="num-col">
                    <span class="direction-pill" :class="mvt.sign > 0 ? 'dir-in' : 'dir-out'">
                      {{ mvt.sign > 0 ? 'Entrée' : 'Sortie' }}
                    </span>
                  </td>
                  <td class="reason-cell">{{ mvt.reason || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>

      <!-- Placeholder initial -->
      <div v-else class="empty-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <p>Recherchez un produit pour afficher l'historique de son stock</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api/api';
import Sidebar from '@/components/Sidebar.vue';

const router = useRouter();
const parse  = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const txt    = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() ?? '';

// ── Produit ────────────────────────────────────────────────────────────────
interface ProductItem { id: number; name: string; reference: string }

const productSearch   = ref('');
const searchResults   = ref<ProductItem[]>([]);
const selectedProduct = ref<ProductItem | null>(null);
const currentStock    = ref(0);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchProducts, 350);
}

async function fetchProducts() {
  const q = productSearch.value.trim();
  if (q.length < 2) { searchResults.value = []; return; }
  try {
    const res = await api.get(
      `/products?output_format=XML&display=[id,name,reference]&filter[name]=%[${q}]%&limit=10`
    );
    searchResults.value = Array.from(parse(res.data).querySelectorAll('product')).map(el => ({
      id:        parseInt(txt(el, 'id')),
      name:      el.querySelector('name language')?.textContent?.trim() || txt(el, 'name'),
      reference: txt(el, 'reference'),
    }));
  } catch {
    searchResults.value = [];
  }
}

async function selectProduct(p: ProductItem) {
  selectedProduct.value = p;
  productSearch.value   = p.name;
  searchResults.value   = [];

  // Charger le stock actuel et récupérer l'id_stock_available
  try {
    const sRes = await api.get(
      `/stock_availables?output_format=XML&display=full&filter[id_product]=[${p.id}]&filter[id_product_attribute]=[0]&limit=1`
    );
    const sEl = parse(sRes.data).querySelector('stock_available');
    const dummy = document.createElement('span');
    currentStock.value    = parseInt(txt(sEl ?? dummy, 'quantity')) || 0;
    idStockAvailable.value = txt(sEl ?? dummy, 'id');
  } catch {
    currentStock.value    = 0;
    idStockAvailable.value = '';
  }

  loadMovements();
}

function clearProduct() {
  selectedProduct.value  = null;
  productSearch.value    = '';
  movements.value        = [];
  currentStock.value     = 0;
  idStockAvailable.value = '';
}

// ── Mouvements via API stock_movements ────────────────────────────────────
interface Movement {
  date_add:          string;
  physical_quantity: number;
  sign:              number;
  reason:            string;
}

const days            = ref(30);
const movements       = ref<Movement[]>([]);
const loadingMvt      = ref(false);
const idStockAvailable = ref('');

async function loadMovements() {
  if (!selectedProduct.value || !idStockAvailable.value) return;
  loadingMvt.value = true;
  movements.value  = [];
  try {
    const res = await api.get(
      `/stock_movements?output_format=XML&display=full&date=1` +
      `&filter[id_stock]=[${idStockAvailable.value}]` +
      `&sort=date_add_DESC&limit=500`
    );
    const since = new Date();
    since.setDate(since.getDate() - days.value);
    movements.value = Array.from(parse(res.data).querySelectorAll('stock_mvt'))
      .map(el => ({
        date_add:          txt(el, 'date_add'),
        physical_quantity: parseInt(txt(el, 'physical_quantity')) || 0,
        sign:              parseInt(txt(el, 'sign'))               || 1,
        reason:            txt(el, 'id_stock_mvt_reason')          || '—',
      }))
      .filter(m => new Date(m.date_add) >= since);
  } catch {
    movements.value = [];
  } finally {
    loadingMvt.value = false;
  }
}

const totalIn  = computed(() => movements.value.filter(m => m.sign > 0).reduce((s, m) => s + m.physical_quantity, 0));
const totalOut = computed(() => movements.value.filter(m => m.sign < 0).reduce((s, m) => s + m.physical_quantity, 0));

// ── Sparkline ──────────────────────────────────────────────────────────────
const SVG_W = 800, SVG_H = 100, PAD = 18;

const sparkDots = computed(() => {
  if (movements.value.length < 2) return [];
  let running = currentStock.value;
  const revMvts = [...movements.value];
  const qtys: number[] = [];
  for (const m of revMvts) {
    qtys.unshift(running);
    running -= m.physical_quantity * m.sign;
  }
  const minQ = Math.min(...qtys), maxQ = Math.max(...qtys);
  const rangeQ = maxQ - minQ || 1;
  return qtys.map((q, i) => ({
    x: PAD + (i / (qtys.length - 1)) * (SVG_W - PAD * 2),
    y: SVG_H - PAD - ((q - minQ) / rangeQ) * (SVG_H - PAD * 2),
    sign: revMvts[i]?.sign ?? 1,
  }));
});

const sparkPoints = computed(() => sparkDots.value.map(p => `${p.x},${p.y}`).join(' '));
const gridLines   = computed(() =>
  [0, 1, 2, 3].map(i => PAD + i * ((SVG_H - PAD * 2) / 3))
);

// ── Formatage ──────────────────────────────────────────────────────────────
function formatDate(dt: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(dt: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.evo-layout { display: flex; min-height: 100vh; }
.evo-container {
  flex: 1; margin-left: 260px; padding: 28px 28px 60px;
  background: #f5f7fa; min-height: 100vh;
}

.page-header { margin-bottom: 24px; }
.page-title { display: flex; align-items: center; gap: 14px; }
.page-title svg {
  width: 38px; height: 38px; padding: 7px;
  background: #8e44ad; color: white; border-radius: 10px; flex-shrink: 0;
}
.page-title h1 { font-size: 24px; color: #2c3e50; margin: 0 0 4px; }
.page-title p  { font-size: 14px; color: #7f8c8d; margin: 0; }

.product-selector-card {
  background: white; border-radius: 12px; padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07); margin-bottom: 20px; position: relative;
}
.selector-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; }
.search-group { flex: 1; min-width: 260px; position: relative; }
.days-group   { min-width: 140px; }
.search-group label, .days-group label {
  font-size: 12px; font-weight: 700; color: #555; text-transform: uppercase;
  letter-spacing: 0.4px; display: block; margin-bottom: 6px;
}
.search-wrap { position: relative; }
.search-wrap svg {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: #aaa;
}
.product-search {
  width: 100%; padding: 10px 14px 10px 34px; border: 1px solid #dce1e7;
  border-radius: 8px; font-size: 14px; background: white; box-sizing: border-box;
}
.product-search:focus { outline: none; border-color: #8e44ad; }
.search-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white;
  border: 1px solid #dce1e7; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 50; max-height: 260px; overflow-y: auto;
}
.search-result {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; gap: 12px;
}
.search-result:hover { background: #f5f0fa; }
.res-name { font-weight: 500; color: #2c3e50; font-size: 14px; }
.res-ref  { font-size: 12px; color: #999; white-space: nowrap; }
.days-select {
  padding: 10px 14px; border: 1px solid #dce1e7; border-radius: 8px;
  font-size: 14px; background: white; width: 100%; cursor: pointer;
}
.days-select:focus { outline: none; border-color: #8e44ad; }
.selected-product-info {
  display: flex; align-items: center; gap: 12px; margin-top: 14px;
  padding: 10px 14px; background: #f5f0fa; border-radius: 8px;
  border: 1px solid #d3b3f0; flex-wrap: wrap;
}
.selected-product-info svg { width: 16px; height: 16px; color: #8e44ad; flex-shrink: 0; }
.selected-product-info strong { color: #2c3e50; font-size: 14px; }
.ref-tag {
  font-size: 12px; background: #ede7f6; color: #6a1b9a;
  padding: 2px 8px; border-radius: 10px; font-weight: 600;
}
.stock-badge { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 12px; }
.stock-badge.in-stock  { background: #e8f5e9; color: #2e7d32; }
.stock-badge.out-stock { background: #ffebee; color: #c62828; }
.btn-change {
  margin-left: auto; background: none; border: 1px solid #aaa; color: #666;
  padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;
}
.btn-change:hover { background: #f0f0f0; }

.stats-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  background: white; border-radius: 10px; padding: 16px 24px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.07); flex: 1; min-width: 120px; text-align: center;
}
.stat-num { display: block; font-size: 28px; font-weight: 700; color: #2c3e50; }
.stat-lbl { font-size: 12px; color: #7f8c8d; }
.stat-green  .stat-num { color: #27ae60; }
.stat-red    .stat-num { color: #e74c3c; }
.stat-purple .stat-num { color: #8e44ad; }

.chart-card {
  background: white; border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07); margin-bottom: 20px;
}
.chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.chart-title  { font-size: 14px; font-weight: 600; color: #2c3e50; }
.chart-legend { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #666; }
.leg-dot   { width: 10px; height: 10px; border-radius: 50%; }
.leg-green { background: #27ae60; }
.leg-red   { background: #e74c3c; }
.sparkline { width: 100%; height: 80px; display: block; }

.table-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }
.table-header {
  display: flex; align-items: center; gap: 12px; padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0; flex-wrap: wrap;
}
.table-header h2 { font-size: 16px; color: #2c3e50; margin: 0; flex: 1; }
.entry-count { font-size: 13px; background: #ede7f6; color: #6a1b9a; padding: 3px 10px; border-radius: 10px; font-weight: 600; }
.btn-reload {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; color: #555;
}
.btn-reload:hover:not(:disabled) { background: #ddd; }
.btn-reload:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reload svg { width: 14px; height: 14px; }
.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center; padding: 50px; gap: 12px; color: #bbb;
}
.empty-state svg { width: 40px; height: 40px; }
.spinner {
  width: 36px; height: 36px; border: 3px solid #f0f0f0;
  border-top-color: #8e44ad; border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.table-wrap { overflow-x: auto; }
.evo-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.evo-table thead th {
  background: #f8f9fa; padding: 12px 16px; text-align: left;
  color: #555; font-weight: 700; font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.4px; border-bottom: 2px solid #e9ecef;
}
.num-col { text-align: center; }
.evo-table tbody tr { border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
.evo-table tbody tr:hover { background: #fafafa; }
.row-in  { border-left: 3px solid #27ae60; }
.row-out { border-left: 3px solid #e74c3c; }
.evo-table td { padding: 11px 16px; }
.date-cell  { font-weight: 600; color: #2c3e50; white-space: nowrap; }
.time-cell  { color: #999; font-size: 12px; white-space: nowrap; }
.reason-cell { color: #7f8c8d; font-size: 12px; }
.delta-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 13px; font-weight: 700; }
.delta-pos { background: #e8f5e9; color: #2e7d32; }
.delta-neg { background: #ffebee; color: #c62828; }
.direction-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.dir-in  { background: #e8f5e9; color: #2e7d32; }
.dir-out { background: #ffebee; color: #c62828; }

.empty-placeholder {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px; gap: 16px; color: #bbb;
}
.empty-placeholder svg { width: 64px; height: 64px; }
.empty-placeholder p { font-size: 15px; }
</style>
