<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';
import { paymentService, PAYMENT_METHODS } from '../../services/paymentService';

// ─── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  orderId: string;
  orderStates: OrderState[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated'): void;   // signale au parent qu'il faut recharger
}>();

// ─── État local ────────────────────────────────────────────────────────────────

const order   = ref<Order | null>(null);
const loading = ref(false);
const error   = ref<string | null>(null);
const saving  = ref(false);

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadOrder = async () => {
  loading.value = true;
  error.value   = null;
  try {
    order.value = await orderService.fetchOne(props.orderId);
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const updatePayment = async (newPayment: string) => {
  saving.value = true;
  try {
    await paymentService.updatePayment(props.orderId, newPayment);
    await loadOrder();
    emit('updated');
  } catch (e: any) {
    error.value = `Erreur paiement : ${e.message}`;
  } finally {
    saving.value = false;
  }
};

const updateState = async (newState: string) => {
  saving.value = true;
  try {
    await orderService.updateState(props.orderId, newState);
    await loadOrder();
    emit('updated');
  } catch (e: any) {
    error.value = `Erreur état : ${e.message}`;
  } finally {
    saving.value = false;
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadOrder);
</script>

<template>
  <!-- Chargement -->
  <div v-if="loading" class="od-loading">
    <span class="spinner"></span> Chargement...
  </div>

  <!-- Contenu -->
  <div v-else-if="order" class="od-wrapper">

    <!-- En-tête -->
    <div class="od-header">
      <div>
        <span class="od-badge">Commande</span>
        <h3 class="od-title">#{{ order.reference }}</h3>
      </div>
      <button class="od-close" @click="emit('close')" title="Fermer">✕</button>
    </div>

    <!-- Alerte erreur -->
    <div v-if="error" class="od-error">⚠️ {{ error }}</div>
    <div v-if="saving" class="od-saving"> Enregistrement...</div>

    <!-- Grille d'infos -->
    <div class="od-grid">

      <!-- Client -->
      <div class="od-card">
        <div class="od-card-icon">👤</div>
        <h4>Client</h4>
        <p><span>Nom</span><strong>{{ order.customer_name || '—' }}</strong></p>
        <p><span>ID</span><strong>#{{ order.id_customer }}</strong></p>
      </div>

      <!-- Commande -->
      <div class="od-card">
        <div class="od-card-icon"></div>
        <h4>Commande</h4>
        <p><span>Référence</span><strong>{{ order.reference }}</strong></p>
        <p><span>Total</span><strong class="price">{{ paymentService.formatAmount(order.total_paid) }}</strong></p>
        <p><span>Date</span><strong>{{ new Date(order.date_add).toLocaleDateString('fr-FR') }}</strong></p>
      </div>

      <!-- Paiement -->
      <div class="od-card">
        <div class="od-card-icon"></div>
        <h4>Paiement</h4>
        <p><span>Méthode</span></p>
        <select
          :value="order.payment"
          @change="updatePayment(($event.target as HTMLSelectElement).value)"
          class="od-select"
          :disabled="saving"
        >
          <option value="">— Sélectionner —</option>
          <option v-for="m in PAYMENT_METHODS" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <!-- État -->
      <div class="od-card">
        <div class="od-card-icon"></div>
        <h4>État</h4>
        <p><span>Actuel</span></p>
        <select
          :value="order.current_state"
          @change="updateState(($event.target as HTMLSelectElement).value)"
          class="od-select"
          :disabled="saving"
        >
          <option
            v-for="state in orderService.ensureStateInList(orderStates, order.current_state)"
            :key="state.id"
            :value="state.id"
          >
            {{ state.name }}
          </option>
        </select>
      </div>

    </div>

    <!-- Tableau articles -->
    <div v-if="order.items.length > 0" class="od-items">
      <h4> Articles commandés ({{ order.items.length }})</h4>
      <div class="od-table-wrapper">
        <table class="od-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Référence</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.id">
              <td>{{ item.product_name }}</td>
              <td class="ref">{{ item.product_reference }}</td>
              <td class="center">{{ item.quantity }}</td>
              <td class="price">{{ paymentService.formatAmount(item.price) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="od-no-items">Aucun article dans cette commande.</div>

  </div>
</template>

<style scoped>

.order-details { }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
.order-title { font-size: 1.2rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.25rem; }
.order-meta { font-size: 0.8rem; color: #7d8590; }
.detail-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
.detail-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
.detail-card h3 { font-size: 0.8rem; font-weight: 700; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #21262d; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 0.75rem 0.75rem; text-align: left; border-bottom: 1px solid #21262d; }
.items-table td { padding: 0.75rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.items-table tr:last-child td { border-bottom: none; }
.price-positive { color: #3fb950; font-weight: 600; }
.price-negative { color: #f85149; font-weight: 600; }
.info-row { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.875rem; }
.info-row .label { color: #7d8590; }
.info-row .val { color: #e6edf3; font-weight: 500; }
.info-row.total .val { color: #3fb950; font-weight: 700; }
.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.s-paid { background: rgba(63,185,80,0.12); color: #3fb950; }
.s-pending { background: rgba(210,153,34,0.12); color: #d29922; }
.s-shipped { background: rgba(56,139,253,0.12); color: #388bfd; }
.s-cancelled { background: rgba(248,81,73,0.12); color: #f85149; }
@media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }

</style>