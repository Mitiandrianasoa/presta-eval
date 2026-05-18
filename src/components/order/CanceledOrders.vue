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
.app-layout   { min-height: 100vh; background: #0d0d14; }
.main-content { margin-left: 240px; transition: margin-left .3s; padding: 28px 24px; min-height: 100vh; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header { margin-bottom: 24px; }
.btn-back { background: none; border: none; cursor: pointer; color: #f97316; font-size: .9rem; font-weight: 600; padding: 0; margin-bottom: 8px; display: block; font-family: inherit; }
.btn-back:hover { text-decoration: underline; }
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #f87171; letter-spacing: -0.02em; }
.subtitle { margin: 4px 0 0; color: #6b7280; font-size: .875rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; font-size: .875rem; font-weight: 600; border: none; cursor: pointer; transition: opacity .15s, transform .1s; font-family: inherit; }
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn-primary { background: #f97316; color: #fff; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
.btn-sm { padding: 6px 12px; font-size: .82rem; }

/* ── Alertes ────────────────────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .875rem; }
.alert-error { background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }

/* ── Chargement ─────────────────────────────────────────────── */
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #6b7280; }
.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.07); border-top-color: #f97316; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card { background: #13131f; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); border-top: 3px solid #ef4444; }
.table-wrapper { overflow-x: auto; }
.orders-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.orders-table thead { background: rgba(239,68,68,0.06); border-bottom: 1px solid rgba(239,68,68,0.15); }
.orders-table th { padding: 13px 16px; text-align: left; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; }
.orders-table td { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #a0a0b8; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.row-active { background: rgba(239,68,68,0.06) !important; }

/* ── Colonnes ───────────────────────────────────────────────── */
.col-ref { font-weight: 700; color: #f87171; font-family: monospace; }
.col-customer { display: flex; align-items: center; gap: 10px; }
.customer-avatar { width: 30px; height: 30px; border-radius: 50%; background: rgba(239,68,68,0.15); color: #f87171; font-size: .78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.col-price { font-weight: 700; color: #ef4444; }
.tag { background: rgba(255,255,255,0.06); color: #a0a0b8; padding: 3px 8px; border-radius: 20px; font-size: .78rem; white-space: nowrap; }
.col-date { color: #6b7280; font-size: .85rem; }
.col-actions { text-align: center; }

/* ── Vide / Détails ─────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #4b5563; font-size: 1rem; }
.details-panel { margin-top: 28px; border-top: 1px solid rgba(239,68,68,0.15); padding-top: 24px; }

@media (max-width: 768px) { .main-content { margin-left: 70px; } }
</style>
