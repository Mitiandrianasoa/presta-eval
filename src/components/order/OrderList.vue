<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../../components/Sidebar.vue';
import OrderDetails from './OrderDetails.vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

const router = useRouter();

// ─── État ──────────────────────────────────────────────────────────────────────

const orders         = ref<Order[]>([]);
const orderStates    = ref<OrderState[]>([]);
const selectedId     = ref<string | null>(null);
const loading        = ref(false);
const error          = ref<string | null>(null);
const sidebarCollapsed = ref(false);

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const [states, data] = await Promise.all([
      orderService.fetchOrderStates(),
      orderService.fetchAll(),
    ]);
    orderStates.value = states;
    orders.value      = data;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const updateState = async (orderId: string, newState: string) => {
  if (!newState) return;
  try {
    await orderService.updateState(orderId, newState);
    await loadData();
  } catch (e: any) {
    error.value = `Erreur état : ${e.message}`;
  }
};

const goToCarts = () => {
  router.push('/admin/cart');
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<template>
  <div class="app-layout">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
      <div class="page">

        <!-- En-tête de page -->
        <div class="page-header">
          <div>
            <h2>Commandes</h2>
            <p class="subtitle">{{ orders.length }} commande(s) au total</p>
          </div>
          <div class="header-actions">
            <!-- Bouton vers les paniers -->
            <button @click="goToCarts" class="btn btn-secondary">
              Paniers
            </button>
            <router-link to="/admin/orders/invoices" class="btn btn-secondary">
              Factures PDF
            </router-link>
             <router-link to="/admin/payments" class="btn btn-secondary">
               Commandes payer
            </router-link>
            <!-- Bouton vers les commandes annulées -->
            <router-link to="/admin/orders/canceled" class="btn btn-danger">
               Commandes annulées
            </router-link>
          </div>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="alert alert-error"> {{ error }}</div>

        <!-- Chargement -->
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement des commandes...
        </div>

        <!-- Tableau -->
        <div v-else-if="orders.length > 0" class="table-card">
          <div class="table-wrapper">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>État</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in orders"
                  :key="order.id"
                  :class="{ 'row-active': selectedId === order.id }"
                >
                  <td class="col-ref">{{ order.reference }}</td>

                  <!-- Nom client -->
                  <td class="col-customer">
                    <span class="customer-avatar">{{ (order.customer_name || '?')[0].toUpperCase() }}</span>
                    {{ order.customer_name || `Client #${order.id_customer}` }}
                  </td>

                  <!-- Total formaté -->
                  <td class="col-price">{{ paymentService.formatAmount(order.total_paid) }}</td>

                  <!-- Méthode de paiement -->
                  <td class="col-payment">
                    <span class="tag">{{ order.payment || '—' }}</span>
                  </td>

                  <!-- Select état -->
                  <td class="col-state">
                    <select
                      :value="order.current_state"
                      @change="updateState(order.id, ($event.target as HTMLSelectElement).value)"
                      class="state-select"
                    >
                      <option
                        v-for="state in orderService.ensureStateInList(orderStates, order.current_state)"
                        :key="state.id"
                        :value="state.id"
                      >
                        {{ state.name }}
                      </option>
                    </select>
                  </td>

                  <!-- Date -->
                  <td class="col-date">
                    {{ new Date(order.date_add).toLocaleDateString('fr-FR') }}
                  </td>

                  <!-- Bouton Détails -->
                  <td class="col-actions">
                    <button
                      class="btn btn-primary btn-sm"
                      @click="selectedId = selectedId === order.id ? null : order.id"
                    >
                      {{ selectedId === order.id ? 'Fermer' : 'Détails' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Aucune donnée -->
        <div v-else class="empty-state">
           Aucune commande trouvée.
        </div>

        <!-- Panneau de détails (inline) -->
        <div v-if="selectedId" class="details-panel">
          <OrderDetails
            :orderId="selectedId"
            :orderStates="orderStates"
            @close="selectedId = null"
            @updated="loadData"
          />
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.app-layout   { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 250px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1a1a2e; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* ── Boutons ────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: .9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: opacity .15s, transform .1s;
}
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn-primary { background: #2196f3; color: #fff; }
.btn-secondary { background: #4caf50; color: #fff; }
.btn-danger  { background: #e53935; color: #fff; }
.btn-sm { padding: 6px 12px; font-size: .82rem; }

/* ── Alertes ────────────────────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem; }
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }

/* ── Chargement ─────────────────────────────────────────────── */
.loading-state {
  display: flex; align-items: center; gap: 12px;
  padding: 48px; justify-content: center; color: #666;
}
.spinner {
  width: 20px; height: 20px;
  border: 3px solid #e0e0e0; border-top-color: #2196f3;
  border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.table-wrapper { overflow-x: auto; }
.orders-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.orders-table thead { background: #f8f9fb; border-bottom: 2px solid #eef0f3; }
.orders-table th {
  padding: 13px 16px; text-align: left;
  font-size: .78rem; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: #666;
}
.orders-table td { padding: 13px 16px; border-bottom: 1px solid #f0f2f5; color: #444; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: #f8f9fb; }
.row-active { background: #e3f2fd !important; }

/* ── Colonnes spéciales ──────────────────────────────────────── */
.col-ref { font-weight: 700; color: #2196f3; font-family: monospace; }
.col-customer { display: flex; align-items: center; gap: 10px; }
.customer-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: #e3f2fd; color: #1565c0;
  font-size: .8rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.col-price { font-weight: 700; color: #2e7d32; }
.tag {
  background: #f0f2f5; color: #555;
  padding: 3px 8px; border-radius: 20px;
  font-size: .8rem; white-space: nowrap;
}
.col-date { color: #888; font-size: .85rem; }
.col-actions { text-align: center; }

/* ── Select état ────────────────────────────────────────────── */
.state-select {
  padding: 6px 10px; border: 1px solid #ddd;
  border-radius: 8px; font-size: .85rem;
  background: #fff; cursor: pointer;
  max-width: 210px; width: 100%;
  transition: border-color .2s;
}
.state-select:hover { border-color: #2196f3; }

/* ── Vide / Détails ─────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 1rem; }
.details-panel { margin-top: 28px; border-top: 2px solid #eef0f3; padding-top: 24px; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
  .page-header  { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>
