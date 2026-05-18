<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Sidebar from '../../components/Sidebar.vue';
import OrderDetails from './OrderDetails.vue';
import { orderService, type Order, type OrderState, CANCELED_STATE_ID, DELIVERED_STATE_ID } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

// ─── État ──────────────────────────────────────────────────────────────────────

const orders           = ref<Order[]>([]);
const orderStates      = ref<OrderState[]>([]);
const selectedId       = ref<string | null>(null);
const loading          = ref(false);
const error            = ref<string | null>(null);
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

// Boutons Livrer / Annuler → passent par shiporder.php (état + stock)
const markDelivered = async (orderId: string) => {
  try {
    await orderService.callShiporder(orderId, '4');
    await loadData();
  } catch (e: any) {
    error.value = `Erreur livraison : ${e.message}`;
  }
};

const cancelOrder = async (orderId: string) => {
  try {
    await orderService.callShiporder(orderId, '6');
    await loadData();
  } catch (e: any) {
    error.value = `Erreur annulation : ${e.message}`;
  }
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
          <!-- Bouton vers les commandes annulées -->
          <router-link to="/admin/orders/canceled" class="btn btn-danger">
             Commandes annulées
          </router-link>
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
                  <th>Actions</th>
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

                  <!-- Boutons d'action -->
                  <td class="col-actions">
                    <div class="action-btns">
                      <button
                        class="btn btn-primary btn-sm"
                        @click="selectedId = selectedId === order.id ? null : order.id"
                      >
                        {{ selectedId === order.id ? 'Fermer' : 'Détails' }}
                      </button>

                      <button
                        class="btn btn-success btn-sm"
                        :disabled="order.current_state === DELIVERED_STATE_ID"
                        @click="markDelivered(order.id)"
                        title="Marquer comme livré"
                      >
                        ✓ Livré
                      </button>

                      <button
                        class="btn btn-danger btn-sm"
                        :disabled="order.current_state === CANCELED_STATE_ID || order.current_state === DELIVERED_STATE_ID"
                        @click="cancelOrder(order.id)"
                        :title="order.current_state === DELIVERED_STATE_ID ? 'Impossible : commande déjà livrée' : 'Annuler la commande'"
                      >
                        ✕ Annuler
                      </button>
                    </div>
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
.app-layout   { display: flex; min-height: 100vh; background: #0d0d14; }
.main-content { flex: 1; margin-left: 240px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #f1f1f8; letter-spacing: -0.02em; }
.subtitle { margin: 4px 0 0; color: #6b7280; font-size: .875rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: .875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: opacity .15s, transform .1s;
  font-family: inherit;
}
.btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.btn-primary { background: #f97316; color: #fff; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
.btn-success { background: #10b981; color: #fff; }
.btn-danger  { background: #ef4444; color: #fff; }
.btn-sm { padding: 6px 12px; font-size: .82rem; }

/* ── Groupe de boutons ───────────────────────────────────────── */
.action-btns { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }

/* ── Alertes ────────────────────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .875rem; }
.alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }

/* ── Chargement ─────────────────────────────────────────────── */
.loading-state {
  display: flex; align-items: center; gap: 12px;
  padding: 48px; justify-content: center; color: #6b7280;
}
.spinner {
  width: 20px; height: 20px;
  border: 3px solid rgba(255,255,255,0.07); border-top-color: #f97316;
  border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card { background: #13131f; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); }
.table-wrapper { overflow-x: auto; }
.orders-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.orders-table thead { background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); }
.orders-table th {
  padding: 13px 16px; text-align: left;
  font-size: .72rem; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: #6b7280;
}
.orders-table td { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #a0a0b8; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.row-active { background: rgba(249,115,22,0.06) !important; }

/* ── Colonnes spéciales ──────────────────────────────────────── */
.col-ref { font-weight: 700; color: #f97316; font-family: monospace; }
.col-customer { display: flex; align-items: center; gap: 10px; }
.customer-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(168,85,247,0.15); color: #a855f7;
  font-size: .78rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.col-price { font-weight: 700; color: #10b981; }
.tag {
  background: rgba(255,255,255,0.06); color: #a0a0b8;
  padding: 3px 8px; border-radius: 20px;
  font-size: .78rem; white-space: nowrap;
}
.col-date { color: #6b7280; font-size: .85rem; }
.col-actions { text-align: center; }

/* ── Select état ────────────────────────────────────────────── */
.state-select {
  padding: 6px 10px; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: .85rem;
  background: #0d0d14; color: #e2e2f0; cursor: pointer;
  max-width: 210px; width: 100%;
  transition: border-color .2s;
  font-family: inherit;
}
.state-select:hover { border-color: #f97316; }

/* ── Vide / Détails ─────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #4b5563; font-size: 1rem; }
.details-panel { margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
  .page-header  { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>