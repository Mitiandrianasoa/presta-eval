<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';

const props = defineProps<{
  orderId: string;
  orderStates: OrderState[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const order = ref<Order | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const paymentMethods = [
  'Paiement à la livraison',
  'Carte bancaire',
  'Virement',
  'Chèque',
];

const loadOrder = async () => {
  loading.value = true;
  error.value = null;
  try {
    order.value = await orderService.fetchOne(props.orderId);
  } catch (e: any) {
    error.value = e.message;
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const updatePayment = async (newPayment: string) => {
  try {
    await orderService.updatePayment(props.orderId, newPayment);
    alert('Paiement mis à jour ✅');
    await loadOrder();
  } catch (e: any) {
    alert(`Erreur: ${e.message}`);
  }
};

onMounted(() => {
  loadOrder();
});
</script>

<template>
  <div class="order-details" v-if="order && !loading">
    <div class="details-header">
      <h3>Détails Commande #{{ order.reference }}</h3>
      <button @click="emit('close')" class="btn-close">✕</button>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-box">
      ❌ {{ error }}
    </div>

    <div class="details-grid">
      <!-- Section Client -->
      <div class="detail-section">
        <h4>👤 Client</h4>
        <p><strong>Nom:</strong> {{ order.customer_name }}</p>
        <p><strong>ID Client:</strong> {{ order.id_customer }}</p>
      </div>

      <!-- Section Commande -->
      <div class="detail-section">
        <h4>📦 Commande</h4>
        <p><strong>Référence:</strong> {{ order.reference }}</p>
        <p><strong>Total:</strong> {{ order.total_paid }} €</p>
        <p><strong>Date:</strong> {{ new Date(order.date_add).toLocaleDateString('fr-FR') }}</p>
      </div>

      <!-- Section Paiement -->
      <div class="detail-section">
        <h4> Paiement</h4>
        <p><strong>Méthode actuelle:</strong></p>
        <select 
          :value="order.payment"
          @change="updatePayment(($event.target as HTMLSelectElement).value)"
          class="payment-select"
        >
          <option value="">-- Sélectionner --</option>
          <option v-for="method in paymentMethods" :key="method" :value="method">
            {{ method }}
          </option>
        </select>
      </div>

      <!-- Section État -->
      <div class="detail-section">
        <h4>État Courant</h4>
        <p>{{ orderService.getStateLabel(orderStates, order.current_state) }}</p>
      </div>
    </div>

    <!-- Items commandés -->
    <div class="items-section" v-if="order.items.length > 0">
      <h4>📋 Articles</h4>
      <table class="items-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Référence</th>
            <th>Quantité</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.id">
            <td>{{ item.product_name }}</td>
            <td>{{ item.product_reference }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.price }} €</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Chargement -->
  <div v-else-if="loading" class="loading">
    ⏳ Chargement...
  </div>
</template>

<style scoped>
.order-details {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #999;
}

.btn-close:hover {
  color: #333;
}

h3 {
  color: #333;
  margin: 0;
}

.error-box {
  background-color: #fee;
  border: 1px solid #f99;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.detail-section {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #2196f3;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.detail-section p {
  margin: 8px 0;
  color: #666;
}

.detail-section strong {
  color: #333;
}

.payment-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  cursor: pointer;
}

.items-section {
  margin-top: 30px;
}

.items-section h4 {
  color: #333;
  margin-bottom: 12px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  background: #f9f9f9;
}

.items-table thead {
  background-color: #e8e8e8;
}

.items-table th {
  padding: 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.items-table td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  color: #666;
}
</style>
