<template>
  <div class="stock-entry-layout">
    <Sidebar
      @show-products="router.push('/admin')"
      @show-categories="router.push('/admin?view=categories')"
      @show-stock="router.push('/admin?view=stock')"
      @show-customers="router.push('/admin?view=customers')"
      @show-brands-suppliers="router.push('/admin?view=products')"
      @show-import="router.push('/import')"
    />

    <div class="stock-entry-container">
      <div class="page-header">
        <div class="page-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <div>
            <h1>Approvisionnement en stock</h1>
            <p>Saisissez les quantités à ajouter pour chaque produit</p>
          </div>
        </div>

        <div v-if="pendingCount > 0" class="apply-bar">
          <span class="pending-label">{{ pendingCount }} modification(s) en attente</span>
          <button @click="applyAll" class="btn-apply" :disabled="saving">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ saving ? 'Enregistrement…' : 'Valider l\'approvisionnement' }}
          </button>
          <button @click="clearAll" class="btn-clear-pending" :disabled="saving">Annuler</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ stockStore.stocks.length }}</span>
          <span class="stat-lbl">Références</span>
        </div>
        <div class="stat-card stat-warn">
          <span class="stat-num">{{ lowStockCount }}</span>
          <span class="stat-lbl">Stock faible (&lt; 5)</span>
        </div>
        <div class="stat-card stat-danger">
          <span class="stat-num">{{ outOfStockCount }}</span>
          <span class="stat-lbl">Rupture de stock</span>
        </div>
        <div class="stat-card stat-info">
          <span class="stat-num">{{ pendingCount }}</span>
          <span class="stat-lbl">À approvisionner</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher un produit..."
          class="search-input"
        />
        <div class="filter-tabs">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            :class="['filter-tab', { active: activeFilter === f.key }]"
            @click="activeFilter = f.key"
          >
            {{ f.label }}
            <span class="filter-count">{{ f.count.value }}</span>
          </button>
        </div>
      </div>

      <!-- Banner succès -->
      <transition name="fade">
        <div v-if="successMsg" class="success-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ successMsg }}
        </div>
      </transition>

      <!-- Chargement -->
      <div v-if="stockStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des stocks…</p>
      </div>

      <!-- Tableau -->
      <div v-else class="table-wrap">
        <table class="entry-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Déclinaison</th>
              <th class="num-col">Stock actuel</th>
              <th class="num-col">État</th>
              <th class="num-col">Qté à ajouter</th>
              <th class="num-col">Nouveau stock</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="stock in displayedStocks"
              :key="stock.id"
              :class="rowClass(stock)"
            >
              <td class="product-cell">
                <span class="product-name">{{ stock.product_name }}</span>
                <span class="product-id">Ref #{{ stock.id_product }}</span>
              </td>
              <td class="combo-cell">
                <span v-if="stock.combination_name" class="combo-badge">{{ stock.combination_name }}</span>
                <span v-else class="combo-none">—</span>
              </td>
              <td class="num-col">
                <span class="qty-current" :class="stockClass(stock.quantity)">{{ stock.quantity }}</span>
              </td>
              <td class="num-col">
                <span class="status-pill" :class="stockClass(stock.quantity)">
                  {{ stock.quantity === 0 ? 'Épuisé' : stock.quantity < 5 ? 'Faible' : 'OK' }}
                </span>
              </td>
              <td class="num-col">
                <input
                  type="number"
                  min="0"
                  :value="additions[stock.id] ?? ''"
                  @input="onInput(stock.id, ($event.target as HTMLInputElement).value)"
                  class="add-input"
                  :class="{ 'has-value': (additions[stock.id] ?? 0) > 0 }"
                  placeholder="0"
                />
              </td>
              <td class="num-col">
                <span
                  class="qty-preview"
                  :class="(additions[stock.id] ?? 0) > 0 ? 'qty-up' : ''"
                >
                  {{ stock.quantity + (additions[stock.id] ?? 0) }}
                  <svg v-if="(additions[stock.id] ?? 0) > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="arrow-up">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="displayedStocks.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Aucun produit trouvé</p>
        </div>
      </div>

      <!-- Barre d'action flottante en bas -->
      <div v-if="pendingCount > 0" class="floating-bar">
        <span>{{ pendingCount }} produit(s) à réapprovisionner</span>
        <div class="floating-actions">
          <button @click="clearAll" class="btn-cancel-float" :disabled="saving">Annuler</button>
          <button @click="applyAll" class="btn-apply-float" :disabled="saving">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ saving ? 'Enregistrement…' : `Valider (${pendingCount})` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '@/components/Sidebar.vue';
import { useStockStore } from '@/stores/stock/stockStore';

const router = useRouter();
const stockStore = useStockStore();

const search = ref('');
const activeFilter = ref<'all' | 'low' | 'out'>('all');
const additions = reactive<Record<string, number>>({});
const saving = ref(false);
const successMsg = ref('');

onMounted(() => stockStore.fetchAll());

const lowStockCount  = computed(() => stockStore.stocks.filter(s => s.quantity > 0 && s.quantity < 5).length);
const outOfStockCount = computed(() => stockStore.stocks.filter(s => s.quantity === 0).length);
const pendingCount   = computed(() => Object.values(additions).filter(v => v > 0).length);

const FILTERS = [
  { key: 'all' as const, label: 'Tous',         count: computed(() => stockStore.stocks.length) },
  { key: 'low' as const, label: 'Stock faible',  count: lowStockCount },
  { key: 'out' as const, label: 'Rupture',        count: outOfStockCount },
];

const filteredStocks = computed(() => {
  let list = stockStore.stocks;
  if (activeFilter.value === 'low') list = list.filter(s => s.quantity > 0 && s.quantity < 5);
  if (activeFilter.value === 'out') list = list.filter(s => s.quantity === 0);
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(s => s.product_name?.toLowerCase().includes(q) || s.id_product.includes(q));
  }
  return list;
});

const displayedStocks = computed(() => {
  const withPending = filteredStocks.value.filter(s => (additions[s.id] ?? 0) > 0);
  const withoutPending = filteredStocks.value.filter(s => !(additions[s.id] ?? 0));
  return [...withPending, ...withoutPending];
});

function onInput(id: string, raw: string) {
  const val = parseInt(raw);
  if (!raw || isNaN(val) || val <= 0) {
    delete additions[id];
  } else {
    additions[id] = val;
  }
}

function clearAll() {
  for (const k of Object.keys(additions)) delete additions[k];
}

async function applyAll() {
  if (pendingCount.value === 0) return;
  saving.value = true;
  let ok = 0, fail = 0;

  for (const [id, qty] of Object.entries(additions)) {
    if (qty <= 0) continue;
    try {
      await stockStore.increaseStock(id, qty);
      ok++;
    } catch {
      fail++;
    }
  }

  saving.value = false;
  clearAll();

  successMsg.value = fail === 0
    ? `${ok} produit(s) approvisionné(s) avec succès.`
    : `${ok} succès, ${fail} erreur(s).`;

  setTimeout(() => { successMsg.value = ''; }, 4000);
}

function stockClass(qty: number) {
  if (qty === 0) return 'out';
  if (qty < 5) return 'low';
  return 'ok';
}

function rowClass(stock: { id: string; quantity: number }) {
  if ((additions[stock.id] ?? 0) > 0) return 'row-pending';
  if (stock.quantity === 0) return 'row-out';
  if (stock.quantity < 5) return 'row-low';
  return '';
}
</script>

<style scoped>
.stock-entry-layout {
  display: flex;
  min-height: 100vh;
}

.stock-entry-container {
  flex: 1;
  margin-left: 260px;
  padding: 28px 28px 100px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-title svg {
  width: 36px;
  height: 36px;
  background: #27ae60;
  color: white;
  border-radius: 10px;
  padding: 7px;
  flex-shrink: 0;
}

.page-title h1 {
  font-size: 24px;
  color: #2c3e50;
  margin: 0 0 4px;
}

.page-title p {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

.apply-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pending-label {
  font-size: 13px;
  color: #e67e22;
  font-weight: 600;
  background: #fef3cd;
  padding: 6px 12px;
  border-radius: 8px;
}

/* ── Stats ── */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 16px 24px;
  min-width: 130px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: #27ae60;
}
.stat-lbl {
  font-size: 12px;
  color: #7f8c8d;
  text-align: center;
}
.stat-card.stat-warn  .stat-num { color: #e67e22; }
.stat-card.stat-danger .stat-num { color: #e74c3c; }
.stat-card.stat-info  .stat-num { color: #3498db; }

/* ── Toolbar ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #dce1e7;
  border-radius: 8px;
  font-size: 14px;
  width: 260px;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #27ae60;
}

.filter-tabs {
  display: flex;
  gap: 6px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #dce1e7;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.18s;
}

.filter-tab:hover { border-color: #27ae60; color: #27ae60; }
.filter-tab.active { background: #27ae60; border-color: #27ae60; color: white; }

.filter-count {
  background: rgba(0,0,0,0.12);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
}
.filter-tab.active .filter-count { background: rgba(255,255,255,0.25); }

/* ── Success banner ── */
.success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  padding: 12px 18px;
  color: #2e7d32;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 16px;
}

.success-banner svg { width: 18px; height: 18px; flex-shrink: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Loading ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #27ae60;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ── */
.table-wrap {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  overflow: hidden;
}

.entry-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.entry-table thead th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  color: #555;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 2px solid #e9ecef;
}

.num-col { text-align: center; }

.entry-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.entry-table tbody tr:hover { background: #fafafa; }
.row-out  { background: #fff5f5 !important; }
.row-low  { background: #fffbee !important; }
.row-pending { background: #f0fdf4 !important; border-left: 3px solid #27ae60; }

.entry-table td { padding: 11px 16px; }

.product-cell { display: flex; flex-direction: column; gap: 2px; }
.product-name { font-weight: 600; color: #2c3e50; }
.product-id   { font-size: 11px; color: #aaa; }

.combo-badge {
  display: inline-block;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.combo-none { color: #bbb; }

/* Status / qty colors */
.qty-current.ok  { color: #27ae60; font-weight: 700; font-size: 15px; }
.qty-current.low { color: #e67e22; font-weight: 700; font-size: 15px; }
.qty-current.out { color: #e74c3c; font-weight: 700; font-size: 15px; }

.status-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-pill.ok  { background: #e8f5e9; color: #2e7d32; }
.status-pill.low { background: #fff3e0; color: #e65100; }
.status-pill.out { background: #ffebee; color: #c62828; }

/* Add input */
.add-input {
  width: 80px;
  padding: 7px 10px;
  border: 2px solid #dce1e7;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  transition: border-color 0.2s;
  background: #fafafa;
}

.add-input:focus { outline: none; border-color: #27ae60; background: white; }
.add-input.has-value { border-color: #27ae60; background: #f0fdf4; color: #2e7d32; font-weight: 700; }

/* Preview new qty */
.qty-preview {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #7f8c8d;
  font-size: 15px;
}

.qty-preview.qty-up { color: #27ae60; }

.arrow-up {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: #27ae60;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  gap: 12px;
  color: #bbb;
}

.empty-state svg { width: 40px; height: 40px; }

/* ── Buttons ── */
.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-apply:hover:not(:disabled) { background: #219a52; }
.btn-apply:disabled { background: #bdc3c7; cursor: not-allowed; }
.btn-apply svg { width: 16px; height: 16px; }

.btn-clear-pending {
  padding: 10px 16px;
  background: #ecf0f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #7f8c8d;
  transition: background 0.2s;
}
.btn-clear-pending:hover:not(:disabled) { background: #dfe6e9; }

/* ── Floating bottom bar ── */
.floating-bar {
  position: fixed;
  bottom: 0;
  left: 260px;
  right: 0;
  background: #2c3e50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  font-size: 14px;
  font-weight: 500;
}

.floating-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-cancel-float {
  padding: 9px 18px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.btn-cancel-float:hover:not(:disabled) { background: rgba(255,255,255,0.2); }

.btn-apply-float {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: background 0.2s;
}
.btn-apply-float:hover:not(:disabled) { background: #219a52; }
.btn-apply-float:disabled { background: #7f8c8d; cursor: not-allowed; }
.btn-apply-float svg { width: 16px; height: 16px; }
</style>
