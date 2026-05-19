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

.order-list { }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
.search-input { padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 0.875rem; width: 240px; transition: border-color 0.2s; }
.search-input:focus { outline: none; border-color: #388bfd; }
.search-input::placeholder { color: #7d8590; }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; white-space: nowrap; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.order-id { color: #388bfd; font-weight: 600; font-size: 0.8rem; }
.status-badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.s-paid { background: rgba(63,185,80,0.12); color: #3fb950; }
.s-pending { background: rgba(210,153,34,0.12); color: #d29922; }
.s-shipped { background: rgba(56,139,253,0.12); color: #388bfd; }
.s-cancelled { background: rgba(248,81,73,0.12); color: #f85149; }
.s-default { background: rgba(125,133,144,0.12); color: #7d8590; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; }
.icon-btn:hover { color: #388bfd; }
.loading-state { text-align: center; padding: 3rem; color: #7d8590; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>