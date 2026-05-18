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
.od-wrapper {
  background: #13131f; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 24px;
}

.od-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.od-badge {
  font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: #f97316; background: rgba(249,115,22,0.12); padding: 2px 8px; border-radius: 20px;
}
.od-title { margin: 6px 0 0; font-size: 1.4rem; font-weight: 700; color: #f1f1f8; }
.od-close {
  background: none; border: none; font-size: 1.2rem; color: #6b7280;
  cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all .15s;
}
.od-close:hover { background: rgba(255,255,255,0.06); color: #f1f1f8; }

.od-loading { display: flex; align-items: center; gap: 10px; padding: 32px; color: #6b7280; font-size: 1rem; }
.spinner {
  width: 18px; height: 18px;
  border: 3px solid rgba(255,255,255,0.07); border-top-color: #f97316;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.od-error  { background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.2); color: #f87171; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: .9rem; }
.od-saving { background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.2); color: #10b981; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: .9rem; }

.od-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
.od-card { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 16px; border-left: 4px solid #f97316; position: relative; }
.od-card-icon { font-size: 1.4rem; margin-bottom: 8px; }
.od-card h4 { margin: 0 0 10px; font-size: .85rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
.od-card p { display: flex; justify-content: space-between; align-items: center; margin: 6px 0; font-size: .9rem; color: #a0a0b8; }
.od-card p span { color: #6b7280; }
.od-card p strong { color: #f1f1f8; }
.od-card p strong.price { color: #10b981; font-size: 1rem; }

.od-select {
  width: 100%; margin-top: 6px; padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.10); border-radius: 8px; font-size: .9rem;
  background: #0d0d14; color: #e2e2f0; cursor: pointer; font-family: inherit;
  transition: border-color .2s;
}
.od-select:hover:not(:disabled) { border-color: #f97316; }
.od-select:disabled { opacity: .6; cursor: default; }

.od-items h4 { font-size: 1rem; font-weight: 700; color: #f1f1f8; margin-bottom: 12px; }
.od-table-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); }
.od-table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.01); font-size: .9rem; }
.od-table thead { background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); }
.od-table th { padding: 11px 14px; text-align: left; font-weight: 600; color: #6b7280; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
.od-table td { padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #a0a0b8; }
.od-table tbody tr:last-child td { border-bottom: none; }
.od-table tbody tr:hover { background: rgba(255,255,255,0.03); }
.od-table td.ref { font-family: monospace; color: #6b7280; }
.od-table td.center { text-align: center; }
.od-table td.price { color: #10b981; font-weight: 600; }
.od-no-items { color: #6b7280; font-size: .9rem; padding: 12px 0; }
</style>
