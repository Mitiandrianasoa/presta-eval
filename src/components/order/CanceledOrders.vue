<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../../components/Sidebar.vue';
import OrderDetails from './OrderDetails.vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

// ─── État ──────────────────────────────────────────────────────────────────────

const orders           = ref<Order[]>([]);
const orderStates      = ref<OrderState[]>([]);
const selectedId       = ref<string | null>(null);
const loading          = ref(false);
const error            = ref<string | null>(null);
const sidebarCollapsed = ref(false);

const router = useRouter();

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const [states, canceled] = await Promise.all([
      orderService.fetchOrderStates(),
      orderService.fetchCanceled(),   // ← filtre current_state === '6' dans le service
    ]);
    orderStates.value = states;
    orders.value      = canceled;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
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

        <!-- En-tête -->
        <div class="page-header">
          <div>
            <button class="btn-back" @click="router.push('/admin/orders')">← Retour aux commandes</button>
            <h2> Commandes Annulées</h2>
            <p class="subtitle">{{ orders.length }} commande(s) annulée(s) (état #6)</p>
          </div>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>

        <!-- Chargement -->
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement...
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
                  <th>Date annulation</th>
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

                  <td class="col-customer">
                    <span class="customer-avatar">
                      {{ (order.customer_name || '?')[0].toUpperCase() }}
                    </span>
                    {{ order.customer_name || `Client #${order.id_customer}` }}
                  </td>

                  <td class="col-price">{{ paymentService.formatAmount(order.total_paid) }}</td>

                  <td>
                    <span class="tag">{{ order.payment || '—' }}</span>
                  </td>

                  <!-- date_upd = dernière modification = date de l'annulation -->
                  <td class="col-date">
                    {{ new Date(order.date_upd).toLocaleDateString('fr-FR') }}
                  </td>

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

        <!-- Aucune commande annulée -->
        <div v-else class="empty-state">
           Aucune commande annulée. Tout va bien !
        </div>

        <!-- Détails inline -->
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

.canceled-orders { }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.cancel-reason { font-size: 0.8rem; color: #f85149; }
.order-id { color: #388bfd; font-weight: 600; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }
.empty-state { text-align: center; padding: 2rem; color: #7d8590; }

</style>