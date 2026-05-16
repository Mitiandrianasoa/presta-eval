<script setup lang="ts">
import Sidebar from '../../components/Sidebar.vue';
import { onMounted, ref, computed } from 'vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';
import OrderDetails from './OrderDetails.vue';

// ─── État ──────────────────────────────────────────────────────────────────────
const orders        = ref<Order[]>([]);
const orderStates   = ref<OrderState[]>([]);
const selectedOrderId = ref<string | null>(null);
const loading       = ref(false);
const error         = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const updatingId    = ref<string | null>(null);
const successId     = ref<string | null>(null);

// ─── Filtres multicritères ─────────────────────────────────────────────────────
const searchText    = ref('');   // référence ou client
const filterState   = ref('');   // id état
const filterPayment = ref('');   // méthode paiement
const filterDateFrom = ref('');  // date début
const filterDateTo   = ref('');  // date fin

// ─── Données dérivées ─────────────────────────────────────────────────────────
const uniquePayments = computed(() =>
  [...new Set(orders.value.map(o => o.payment).filter(Boolean))]
);

const filteredOrders = computed(() => {
  let result = orders.value;

  const q = searchText.value.trim().toLowerCase();
  if (q) {
    result = result.filter(o =>
      o.reference.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q)
    );
  }

  if (filterState.value) {
    result = result.filter(o => o.current_state === filterState.value);
  }

  if (filterPayment.value) {
    result = result.filter(o => o.payment === filterPayment.value);
  }

  if (filterDateFrom.value) {
    const from = new Date(filterDateFrom.value);
    result = result.filter(o => new Date(o.date_add) >= from);
  }

  if (filterDateTo.value) {
    const to = new Date(filterDateTo.value);
    to.setHours(23, 59, 59);
    result = result.filter(o => new Date(o.date_add) <= to);
  }

  return result;
});

const hasActiveFilters = computed(() =>
  !!(searchText.value || filterState.value || filterPayment.value || filterDateFrom.value || filterDateTo.value)
);

// ─── Stats ─────────────────────────────────────────────────────────────────────
const totalRevenue = computed(() =>
  orders.value.reduce((sum, o) => sum + (parseFloat(o.total_paid) || 0), 0)
);

const filteredRevenue = computed(() =>
  filteredOrders.value.reduce((sum, o) => sum + (parseFloat(o.total_paid) || 0), 0)
);

// ─── Chargement ────────────────────────────────────────────────────────────────
const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const [states, ordersData] = await Promise.all([
      orderService.fetchOrderStates(),
      orderService.fetchAll(),
    ]);
    orderStates.value = states;
    orders.value      = ordersData;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// ─── Actions ───────────────────────────────────────────────────────────────────
const clearFilters = () => {
  searchText.value    = '';
  filterState.value   = '';
  filterPayment.value = '';
  filterDateFrom.value = '';
  filterDateTo.value   = '';
};

const updateState = async (orderId: string, newState: string) => {
  if (!newState) return;
  updatingId.value = orderId;
  try {
    await orderService.updateState(orderId, newState);
    const idx = orders.value.findIndex(o => o.id === orderId);
    if (idx !== -1) orders.value[idx].current_state = newState;
    successId.value = orderId;
    setTimeout(() => { successId.value = null; }, 1800);
  } catch (e: any) {
    error.value = `Erreur mise à jour : ${e.message}`;
  } finally {
    updatingId.value = null;
  }
};

const selectOrder = (orderId: string) => {
  selectedOrderId.value = selectedOrderId.value === orderId ? null : orderId;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getStateName = (stateId: string) => {
  const s = orderStates.value.find(s => s.id === stateId);
  return s?.name || `État ${stateId}`;
};

const STATE_COLORS: Record<string, string> = {
  '1': 'badge-warning',
  '2': 'badge-success',
  '3': 'badge-success',
  '4': 'badge-danger',
  '5': 'badge-danger',
  '6': 'badge-info',
};

const stateBadgeClass = (stateId: string) =>
  STATE_COLORS[stateId] || 'badge-neutral';

const formatPrice = (v: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(parseFloat(v) || 0);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(loadData);
</script>

<template>
  <div class="app-layout">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
      <div class="page">

        <!-- ── En-tête ── -->
        <div class="page-header">
          <div class="header-left">
            <h2>Commandes</h2>
            <p class="subtitle">
              {{ orders.length }} commande(s) au total
              <span v-if="hasActiveFilters" class="filter-count">
                · {{ filteredOrders.length }} affiché(s)
              </span>
            </p>
          </div>
          <button class="btn btn-outline" @click="loadData" :disabled="loading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualiser
          </button>
        </div>

        <!-- ── Cartes stats ── -->
        <div class="stats-grid" v-if="orders.length > 0">
          <div class="stat-card">
            <div class="stat-icon stat-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M9 11H3v2h6v-2zm12-4H9v2h12V7zm0 8H9v2h12v-2z"/><rect x="2" y="3" width="20" height="18" rx="2"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ orders.length }}</div>
              <div class="stat-label">Total commandes</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ formatPrice(totalRevenue.toString()) }}</div>
              <div class="stat-label">Chiffre d'affaires</div>
            </div>
          </div>
          <div class="stat-card" v-if="hasActiveFilters">
            <div class="stat-icon stat-icon-purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ filteredOrders.length }}</div>
              <div class="stat-label">Résultats filtrés · {{ formatPrice(filteredRevenue.toString()) }}</div>
            </div>
          </div>
        </div>

        <!-- ── Bloc recherche multicritère ── -->
        <div class="search-block">
          <div class="search-row">
            <!-- Texte libre -->
            <div class="search-field search-field-wide">
              <label>Référence / Client</label>
              <div class="input-with-icon">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="searchText" type="text" placeholder="Rechercher…" class="form-input" />
                <button v-if="searchText" class="clear-field" @click="searchText = ''">✕</button>
              </div>
            </div>

            <!-- État -->
            <div class="search-field">
              <label>État</label>
              <select v-model="filterState" class="form-select">
                <option value="">Tous les états</option>
                <option v-for="s in orderStates" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <!-- Paiement -->
            <div class="search-field">
              <label>Paiement</label>
              <select v-model="filterPayment" class="form-select">
                <option value="">Toutes méthodes</option>
                <option v-for="p in uniquePayments" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <!-- Date début -->
            <div class="search-field">
              <label>Du</label>
              <input v-model="filterDateFrom" type="date" class="form-input" />
            </div>

            <!-- Date fin -->
            <div class="search-field">
              <label>Au</label>
              <input v-model="filterDateTo" type="date" class="form-input" />
            </div>
          </div>

          <div class="search-actions" v-if="hasActiveFilters">
            <span class="filter-summary">
              {{ filteredOrders.length }} résultat(s) sur {{ orders.length }}
            </span>
            <button class="btn-clear-all" @click="clearFilters">
              ✕ Effacer les filtres
            </button>
          </div>
        </div>

        <!-- ── Erreur ── -->
        <div v-if="error" class="alert alert-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <!-- ── Chargement ── -->
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement des commandes…
        </div>

        <!-- ── Tableau ── -->
        <div v-else-if="filteredOrders.length > 0" class="table-card">
          <div class="table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>État</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in filteredOrders"
                  :key="order.id"
                  :class="{ 'row-selected': selectedOrderId === order.id, 'row-success': successId === order.id }"
                >
                  <td class="col-id">{{ order.id }}</td>

                  <td class="col-ref">{{ order.reference }}</td>

                  <td class="col-customer">
                    <span class="customer-avatar">{{ (order.customer_name || '?')[0].toUpperCase() }}</span>
                    {{ order.customer_name || '—' }}
                  </td>

                  <td class="col-price">{{ formatPrice(order.total_paid) }}</td>

                  <td>
                    <span class="payment-tag">{{ order.payment || '—' }}</span>
                  </td>

                  <td>
                    <div class="state-cell">
                      <span :class="['state-badge', stateBadgeClass(order.current_state)]">
                        {{ getStateName(order.current_state) }}
                      </span>
                      <select
                        :value="order.current_state"
                        @change="updateState(order.id, ($event.target as HTMLSelectElement).value)"
                        class="state-select"
                        :disabled="updatingId === order.id"
                        title="Changer l'état"
                      >
                        <option v-for="s in orderStates" :key="s.id" :value="s.id">{{ s.name }}</option>
                      </select>
                      <span v-if="updatingId === order.id" class="mini-spinner"></span>
                    </div>
                  </td>

                  <td class="col-date">{{ formatDate(order.date_add) }}</td>

                  <td class="col-actions">
                    <button
                      @click="selectOrder(order.id)"
                      :class="['btn-details', { active: selectedOrderId === order.id }]"
                    >
                      {{ selectedOrderId === order.id ? 'Fermer' : 'Détails' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Vide ── -->
        <div v-else-if="!loading" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p v-if="hasActiveFilters">Aucune commande ne correspond à ces filtres.</p>
          <p v-else>Aucune commande trouvée.</p>
          <button v-if="hasActiveFilters" class="btn-clear-all" @click="clearFilters">Effacer les filtres</button>
        </div>

        <!-- ── Panneau détails ── -->
        <transition name="slide-down">
          <div v-if="selectedOrderId" class="details-panel">
            <OrderDetails
              :orderId="selectedOrderId"
              :orderStates="orderStates"
              @close="selectedOrderId = null"
            />
          </div>
        </transition>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────── */
.app-layout   { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 260px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1400px; margin: 0 auto; }

/* ── En-tête ─────────────────────────────────────────────── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24px;
}
.page-header h2 { margin: 0; font-size: 1.75rem; font-weight: 700; color: #1a1a2e; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }
.filter-count { color: #2196f3; font-weight: 600; }

/* ── Boutons ─────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 8px; font-size: .9rem;
  font-weight: 600; border: none; cursor: pointer;
  transition: opacity .15s, transform .1s;
}
.btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-outline { background: #fff; border: 2px solid #2196f3; color: #2196f3; }

/* ── Stats ───────────────────────────────────────────────── */
.stats-grid {
  display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;
}
.stat-card {
  background: #fff; border-radius: 12px; padding: 18px 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  display: flex; align-items: center; gap: 16px;
  flex: 1; min-width: 180px;
}
.stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon-blue   { background: #e3f2fd; color: #1565c0; }
.stat-icon-green  { background: #e8f5e9; color: #2e7d32; }
.stat-icon-purple { background: #f3e5f5; color: #6a1b9a; }
.stat-value { font-size: 1.3rem; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: .78rem; color: #888; margin-top: 2px; }

/* ── Recherche ───────────────────────────────────────────── */
.search-block {
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 20px 22px; margin-bottom: 20px;
}
.search-row {
  display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end;
}
.search-field {
  display: flex; flex-direction: column; gap: 5px;
  min-width: 140px; flex: 1;
}
.search-field-wide { flex: 2; min-width: 220px; }
.search-field label {
  font-size: .75rem; font-weight: 700; color: #666;
  text-transform: uppercase; letter-spacing: .04em;
}
.input-with-icon {
  position: relative; display: flex; align-items: center;
}
.field-icon {
  position: absolute; left: 10px; color: #aaa; pointer-events: none;
}
.form-input, .form-select {
  width: 100%; padding: 9px 12px; border: 1.5px solid #e0e0e0;
  border-radius: 8px; font-size: .9rem; color: #333;
  background: #fafafa; transition: border-color .2s, box-shadow .2s;
  box-sizing: border-box; font-family: inherit;
}
.input-with-icon .form-input { padding-left: 34px; }
.form-input:focus, .form-select:focus {
  outline: none; border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33,150,243,.12); background: #fff;
}
.clear-field {
  position: absolute; right: 8px; background: none; border: none;
  color: #bbb; cursor: pointer; font-size: .9rem; padding: 2px 4px;
}
.clear-field:hover { color: #666; }

.search-actions {
  display: flex; align-items: center; gap: 14px;
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}
.filter-summary { font-size: .85rem; color: #555; }
.btn-clear-all {
  background: none; border: 1px solid #e0e0e0; color: #666;
  border-radius: 6px; padding: 5px 12px; font-size: .82rem;
  cursor: pointer; transition: background .15s;
}
.btn-clear-all:hover { background: #f5f5f5; color: #333; }

/* ── Alertes / Chargement ───────────────────────────────── */
.alert {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem;
}
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }
.loading-state {
  display: flex; align-items: center; gap: 12px;
  padding: 48px; justify-content: center; color: #666;
}
.spinner {
  width: 20px; height: 20px; border: 3px solid #e0e0e0;
  border-top-color: #2196f3; border-radius: 50%;
  animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tableau ─────────────────────────────────────────────── */
.table-card {
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,.07);
  border-top: 3px solid #2196f3; overflow: hidden;
}
.table-wrapper { overflow-x: auto; }
.orders-table {
  width: 100%; border-collapse: collapse; font-size: .88rem;
}
.orders-table thead { background: #f0f7ff; border-bottom: 2px solid #bbdefb; }
.orders-table th {
  padding: 12px 16px; text-align: left;
  font-size: .73rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em; color: #666;
  white-space: nowrap;
}
.orders-table td {
  padding: 13px 16px; border-bottom: 1px solid #f0f2f5; color: #444;
  vertical-align: middle;
}
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: #f8fbff; }
.orders-table tbody tr.row-selected { background: #e3f2fd; }
.orders-table tbody tr.row-success { background: #e8f5e9; transition: background .5s; }

/* ── Colonnes ────────────────────────────────────────────── */
.col-id   { color: #bbb; font-size: .8rem; font-family: monospace; }
.col-ref  { font-weight: 700; color: #2196f3; font-family: monospace; font-size: .9rem; }
.col-customer {
  display: flex; align-items: center; gap: 8px;
  font-weight: 500;
}
.customer-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #e3f2fd; color: #1565c0;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: .8rem; flex-shrink: 0;
}
.col-price { font-weight: 700; color: #2e7d32; white-space: nowrap; }
.col-date  { color: #888; font-size: .83rem; white-space: nowrap; }
.col-actions { text-align: center; }

/* ── Paiement tag ────────────────────────────────────────── */
.payment-tag {
  background: #fff8e1; color: #e65100;
  padding: 3px 10px; border-radius: 20px;
  font-size: .78rem; font-weight: 600; white-space: nowrap;
}

/* ── Badges état ─────────────────────────────────────────── */
.state-badge {
  display: inline-block;
  padding: 3px 9px; border-radius: 20px;
  font-size: .75rem; font-weight: 700;
  white-space: nowrap; letter-spacing: .02em;
}
.badge-success { background: #e8f5e9; color: #2e7d32; }
.badge-warning { background: #fff8e1; color: #f57f17; }
.badge-danger  { background: #fce4ec; color: #c62828; }
.badge-info    { background: #e3f2fd; color: #1565c0; }
.badge-neutral { background: #f5f5f5; color: #757575; }

/* ── Cellule état (badge + select) ──────────────────────── */
.state-cell {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.state-select {
  padding: 5px 28px 5px 8px;
  border: 1.5px solid #e0e0e0; border-radius: 6px;
  font-size: .82rem; cursor: pointer; background: #fafafa;
  font-family: inherit; transition: border-color .2s;
  appearance: auto; max-width: 160px;
}
.state-select:hover:not(:disabled) { border-color: #2196f3; }
.state-select:disabled { opacity: .5; cursor: not-allowed; }
.mini-spinner {
  width: 14px; height: 14px; border: 2px solid #e0e0e0;
  border-top-color: #2196f3; border-radius: 50%;
  animation: spin .6s linear infinite; flex-shrink: 0;
}

/* ── Bouton Détails ──────────────────────────────────────── */
.btn-details {
  padding: 6px 14px; background: #2196f3; color: #fff;
  border: none; border-radius: 6px; cursor: pointer;
  font-size: .83rem; font-weight: 600;
  transition: background .2s, transform .1s; white-space: nowrap;
}
.btn-details:hover { background: #1976d2; transform: translateY(-1px); }
.btn-details.active { background: #546e7a; }
.btn-details.active:hover { background: #37474f; }

/* ── Vide ────────────────────────────────────────────────── */
.empty-state {
  text-align: center; padding: 70px 20px; color: #bbb;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.empty-state p { margin: 0; font-size: 1rem; color: #999; }

/* ── Panneau détails ─────────────────────────────────────── */
.details-panel { margin-top: 24px; }

.slide-down-enter-active, .slide-down-leave-active {
  transition: opacity .3s ease, transform .3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0; transform: translateY(-12px);
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .main-content  { margin-left: 70px; padding: 16px; }
  .search-row    { gap: 10px; }
  .search-field  { min-width: 120px; }
  .stats-grid    { gap: 10px; }
  .stat-card     { min-width: 140px; padding: 14px 16px; }
  .orders-table td, .orders-table th { padding: 10px 10px; }
  .state-cell    { flex-direction: column; align-items: flex-start; }
}
</style>
