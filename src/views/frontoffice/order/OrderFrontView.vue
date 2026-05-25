<template>
  <div class="orders-page">
    <FrontHeader />
    
    <main class="orders-main">
      <div class="container">
        <div class="page-header">
          <h1>Mes commandes</h1>
          <p>Retrouvez l'historique de vos commandes</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement de vos commandes...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error-message">
          <div class="error-content">
            <h3>Erreur</h3>
            <p>{{ error }}</p>
            <button @click="loadOrders" class="retry-btn">
              Réessayer
            </button>
          </div>
        </div>

        <!-- Pas de commandes -->
        <div v-else-if="orders.length === 0" class="empty-orders">
          <div class="empty-icon"></div>
          <h2>Aucune commande</h2>
          <p>Vous n'avez pas encore passé de commande.</p>
          <router-link to="/products" class="shop-btn">
            Découvrir nos produits
          </router-link>
        </div>

        <!-- Liste des commandes -->
        <div v-else class="orders-list">
          <div 
            v-for="order in orders" 
            :key="order.id"
            class="order-item-container"
          >
            <div class="order-card" @click="viewOrderDetail(order.id)">
              <div class="order-left">
                <div class="order-main-info">
                  <span class="order-id">#{{ order.id }}</span>
                  <span class="order-date">{{ formatDate(order.date_add) }}</span>
                </div>
                <div class="order-payment-info">
                  <span class="payment-method">{{ order.payment }}</span>
                </div>
              </div>
              
              <div class="order-right">
                <span class="order-status" :class="getStatusClass(order.current_state)">
                  {{ getStatusLabel(order.current_state) }}
                </span>
                <span class="order-total">{{ formatPrice(order.total_paid) }}</span>
                <span class="detail-arrow">→</span>
              </div>
            </div>
            <!-- Panneau de duplication -->
            <div v-if="duplicationState[order.id]" class="duplication-panel">
              <div class="duplication-controls">
                <label :for="'qty-' + order.id">Dupliquer :</label>
                <input 
                  type="number" 
                  v-model.number="duplicationState[order.id].quantity" 
                  min="1" 
                  :id="'qty-' + order.id"
                  @click.stop
                />
                <span>fois</span>
              </div>
              <button 
                @click.stop="handleDuplicate(order.id)" 
                :disabled="duplicationState[order.id].isLoading"
                class="btn-duplicate"
              >
                <span v-if="duplicationState[order.id].isLoading" class="spinner-small"></span>
                {{ duplicationState[order.id].isLoading ? 'En cours...' : 'Dupliquer' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- <footer class="front-footer">
      <div class="container">
        <div class="footer-bottom">
          <p>&copy; 2025 PrestaShop. Tous droits réservés.</p>
        </div>
      </div>
    </footer> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FrontHeader from '../../../components/FrontHeader.vue';
import api from '../../../api/api';
import { useAuth } from '../../../services/useAuth';

import { duplicateOrder } from '../../../services/duplication.service';

const { getCustomerId } = useAuth();
const router = useRouter();
const orders = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const duplicationState = ref<{ [key: string]: { quantity: number; isLoading: boolean } }>({});

const handleDuplicate = async (orderId: string) => {
  const state = duplicationState.value[orderId];
  if (!state || state.isLoading) return;

  state.isLoading = true;
  try {
    await duplicateOrder(orderId, state.quantity);
    // Rafraîchir la liste des commandes pour voir les nouvelles
    await loadOrders();
  } catch (err) {
    console.error(`Erreur lors de la duplication de la commande #${orderId}:`, err);
    // Gérer l'affichage de l'erreur à l'utilisateur si nécessaire
  } finally {
    state.isLoading = false;
  }
};


// const getCustomerId = (): string => {
//   const user = localStorage.getItem('prestashop_user');
//   if (user) {
//     try {
//       const userData = JSON.parse(user);
//       return userData.id || '3';
//     } catch (err) {
//       return '3';
//     }
//   }
//   return '3';
// };

const loadOrders = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const customerId = getCustomerId();
    console.log(`📋 Chargement des commandes pour le client ${customerId}`);
    
    const response = await api.get(
      `/orders?output_format=XML&filter[id_customer]=[${customerId}]&sort=[id_DESC]&limit=50&display=full`
    );
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const orderElements = xmlDoc.querySelectorAll('orders order');
    
    orders.value = Array.from(orderElements).map(el => {
      const orderId = el.querySelector('id')?.textContent?.trim() || '';
      // Initialiser l'état de duplication pour chaque commande
      if (!duplicationState.value[orderId]) {
        duplicationState.value[orderId] = { quantity: 1, isLoading: false };
      }
      return {
        id: orderId,
        reference: el.querySelector('reference')?.textContent?.trim() || '',
        total_paid: el.querySelector('total_paid')?.textContent?.trim() || '0',
        total_products: el.querySelector('total_products_wt')?.textContent?.trim() || '0',
        payment: el.querySelector('payment')?.textContent?.trim() || 'N/C',
        current_state: el.querySelector('current_state')?.textContent?.trim() || '1',
        date_add: el.querySelector('date_add')?.textContent?.trim() || '',
        id_cart: el.querySelector('id_cart')?.textContent?.trim() || '',
      };
    });
    console.log(`✅ ${customerId} :'ID CUSTOMER'`);
    console.log(`✅ ${orders.value.length} commande(s) trouvée(s)`);
    
  } catch (err: any) {
    console.error('❌ Erreur chargement commandes:', err);
    error.value = 'Impossible de charger vos commandes';
  } finally {
    loading.value = false;
  }
};

const viewOrderDetail = (orderId: string) => {
  router.push(`/order/${orderId}`);
};

const getStatusLabel = (stateId: string): string => {
  const statuses: Record<string, string> = {
    '1': 'En attente',
    '2': 'Payed',
    '3': 'Prête',
    '4': 'Expédiée',
    '5': 'Livrée',
    '6': 'Annulée',
    '7': 'Remboursée',
    '8': 'Erreur',
    '13': 'En attente',
    '11': 'Payed',
  };
  return statuses[stateId] || `Statut ${stateId}`;
};

const getStatusClass = (stateId: string): string => {
  const classes: Record<string, string> = {
    '1': 'status-pending',
    '2': 'status-processing',
    '3': 'status-ready',
    '4': 'status-shipped',
    '5': 'status-delivered',
    '6': 'status-cancelled',
    '7': 'status-refunded',
    '8': 'status-error',
    '13': 'status-pending',
    
  };
  return classes[stateId] || 'status-default';
};

const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '0 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
};

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f8fafc;
}

.orders-main {
  padding: 2.5rem 0 4rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.3rem;
  letter-spacing: -0.02em;
}

.page-header p {
  color: #64748b;
  margin: 0;
  font-size: 0.95rem;
}

/* Loading */
.loading {
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
}

.spinner {
  border: 3px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 0.7s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error */
.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  text-align: center;
}

.error-content h3 {
  color: #dc2626;
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.error-content p {
  color: #7f1d1d;
  margin: 0 0 1rem;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}

.retry-btn:hover {
  background: #2563eb;
}

/* Empty */
.empty-orders {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.empty-orders h2 {
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.empty-orders p {
  color: #64748b;
  margin-bottom: 1.5rem;
}

.shop-btn {
  display: inline-block;
  background: #3b82f6;
  color: white;
  padding: 0.7rem 1.75rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.shop-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* Espace entre les cartes */
}

.order-item-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.order-item-container:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}

.order-card {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  gap: 1rem;
}
.order-card:hover .detail-arrow {
  transform: translateX(3px);
}

/* Panneau de duplication */
.duplication-panel {
  border-top: 1px solid #f1f5f9;
  padding: 0.75rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.duplication-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #475569;
}

.duplication-controls input[type="number"] {
  width: 50px;
  padding: 0.3rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-align: center;
  font-family: inherit;
}

.btn-duplicate {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-duplicate:hover:not(:disabled) {
  background: #059669;
}

.btn-duplicate:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.order-card:active {
  transform: scale(0.995);
}

/* Partie gauche */
.order-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  min-width: 0;
  flex-shrink: 1;
}

.order-main-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.order-id {
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
  letter-spacing: -0.01em;
}

.order-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

.order-payment-info {
  display: flex;
  align-items: center;
}

.payment-method {
  font-size: 0.8rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  white-space: nowrap;
}

/* Partie droite */
.order-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.order-total {
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
  white-space: nowrap;
}

/* Statuts - badges compacts */
.order-status {
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.status-pending {
  background: #fef9c3;
  color: #a16207;
}

.status-processing {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-ready {
  background: #e0e7ff;
  color: #4338ca;
}

.status-shipped {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-delivered {
  background: #dcfce7;
  color: #15803d;
}

.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.status-refunded {
  background: #ffe4e6;
  color: #be123c;
}

.status-error {
  background: #fee2e2;
  color: #b91c1c;
}

.status-default {
  background: #f1f5f9;
  color: #64748b;
}

/* Flèche discrète */
.detail-arrow {
  color: #cbd5e1;
  font-size: 1rem;
  transition: all 0.2s;
}

.order-card:hover .detail-arrow {
  color: #3b82f6;
  transform: translateX(3px);
}

/* Responsive */
@media (max-width: 640px) {
  .order-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .order-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
  }

  .order-right {
    width: 100%;
    justify-content: space-between;
  }

  .detail-arrow {
    display: none;
  }
}
</style>