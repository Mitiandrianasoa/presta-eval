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
/* ── Layout ──────────────────────────────────────────────────── */
.app-layout   { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 250px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header { margin-bottom: 24px; }
.btn-back {
  background: none; border: none; cursor: pointer;
  color: #2196f3; font-size: .9rem; font-weight: 600;
  padding: 0; margin-bottom: 8px; display: block;
}
.btn-back:hover { text-decoration: underline; }
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #c62828; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 8px; font-size: .9rem;
  font-weight: 600; border: none; cursor: pointer;
  transition: opacity .15s, transform .1s;
}
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn-primary { background: #2196f3; color: #fff; }
.btn-sm { padding: 6px 12px; font-size: .82rem; }

/* ── Alertes ────────────────────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem; }
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }

/* ── Chargement ─────────────────────────────────────────────── */
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #666; }
.spinner {
  width: 20px; height: 20px; border: 3px solid #e0e0e0;
  border-top-color: #e53935; border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card {
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  border-top: 3px solid #e53935;   /* barre rouge = annulé */
}
.table-wrapper { overflow-x: auto; }
.orders-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.orders-table thead { background: #fff5f5; border-bottom: 2px solid #ffcdd2; }
.orders-table th {
  padding: 13px 16px; text-align: left;
  font-size: .78rem; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: #999;
}
.orders-table td { padding: 13px 16px; border-bottom: 1px solid #f9f0f0; color: #444; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: #fff8f8; }
.row-active { background: #ffebee !important; }

/* ── Colonnes ───────────────────────────────────────────────── */
.col-ref { font-weight: 700; color: #e53935; font-family: monospace; }
.col-customer { display: flex; align-items: center; gap: 10px; }
.customer-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: #ffebee; color: #c62828;
  font-size: .8rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.col-price { font-weight: 700; color: #c62828; }
.tag {
  background: #f0f2f5; color: #555;
  padding: 3px 8px; border-radius: 20px; font-size: .8rem;
}
.col-date { color: #888; font-size: .85rem; }
.col-actions { text-align: center; }

/* ── Vide / Détails ─────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 1rem; }
.details-panel { margin-top: 28px; border-top: 2px solid #ffcdd2; padding-top: 24px; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
}
</style>