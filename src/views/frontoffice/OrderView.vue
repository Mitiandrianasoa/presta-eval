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
          <div class="empty-icon">📋</div>
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
            class="order-card"
          >
            <div class="order-header">
              <div class="order-info">
                <span class="order-id">Commande #{{ order.id }}</span>
                <span class="order-date">{{ formatDate(order.date_add) }}</span>
              </div>
              <span class="order-status" :class="getStatusClass(order.current_state)">
                {{ getStatusLabel(order.current_state) }}
              </span>
            </div>
            
            <div class="order-body">
              <div class="order-products">
                <span class="products-label">Nombre Articles :</span>
                <span class="products-count">{{ parseInt(order.total_products) || 'N/C' }}</span>
              </div>
              <div class="order-payment">
                <span class="payment-label">Paiement :</span>
                <span class="payment-method">{{ order.payment }}</span>
              </div>
              <div class="order-total">
                <span class="total-label">Total :</span>
                <span class="total-price">{{ formatPrice(order.total_paid) }}</span>
              </div>
            </div>
            
            <div class="order-footer">
              <button 
                @click="viewOrderDetail(order.id)" 
                class="detail-btn"
              >
                Voir le détail
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <footer class="front-footer">
      <div class="container">
        <div class="footer-bottom">
          <p>&copy; 2025 PrestaShop. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FrontHeader from '../../components/FrontHeader.vue';
import api from '../../api/api';

const router = useRouter();

const orders = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

// Récupérer le customer ID
const getCustomerId = (): string => {
  const user = localStorage.getItem('prestashop_user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      return userData.id || '3';
    } catch (err) {
      return '3';
    }
  }
  return '3'; // Client par défaut
};

// Charger les commandes
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
    
    orders.value = Array.from(orderElements).map(el => ({
      id: el.querySelector('id')?.textContent?.trim() || '',
      reference: el.querySelector('reference')?.textContent?.trim() || '',
      total_paid: el.querySelector('total_paid')?.textContent?.trim() || '0',
      total_products: el.querySelector('total_products_wt')?.textContent?.trim() || '0',
      payment: el.querySelector('payment')?.textContent?.trim() || 'N/C',
      current_state: el.querySelector('current_state')?.textContent?.trim() || '1',
      date_add: el.querySelector('date_add')?.textContent?.trim() || '',
      id_cart: el.querySelector('id_cart')?.textContent?.trim() || '',
    }));
    
    console.log(`✅ ${orders.value.length} commande(s) trouvée(s)`);
    
  } catch (err: any) {
    console.error('❌ Erreur chargement commandes:', err);
    error.value = 'Impossible de charger vos commandes';
  } finally {
    loading.value = false;
  }
};

// Voir le détail d'une commande
const viewOrderDetail = (orderId: string) => {
  router.push(`/order/${orderId}`);
};

// Statuts des commandes
const getStatusLabel = (stateId: string): string => {
  const statuses: Record<string, string> = {
    '1': 'En attente',
    '2': 'En préparation',
    '3': 'Prête',
    '4': 'Expédiée',
    '5': 'Livrée',
    '6': 'Annulée',
    '7': 'Remboursée',
    '8': 'Erreur paiement',
    '13': 'En attente',
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

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-EU', {
    style: 'currency',
    currency: 'EUR'
  }).format(numPrice);
};

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return 'Date inconnue';
  
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-EU', {
    day: '2-digit',
    month: 'long',
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
  background: var(--bg);
}

.orders-main {
  padding: 3rem 0 5rem;
}

.page-header {
  margin-bottom: 2.5rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 0.4rem;
}

.page-header p {
  color: var(--muted);
  margin: 0;
}

/* Loading */
.loading {
  text-align: center;
  padding: 4rem;
}

.spinner {
  border: 3px solid var(--border);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
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
  border-radius: var(--radius-lg);
  padding: 3rem;
  text-align: center;
}

.retry-btn {
  margin-top: 1rem;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

/* Empty */
.empty-orders {
  text-align: center;
  padding: 5rem 2rem;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-orders h2 {
  color: var(--navy);
  margin-bottom: 0.5rem;
}

.empty-orders p {
  color: var(--muted);
  margin-bottom: 2rem;
}

.shop-btn {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background var(--transition);
}

.shop-btn:hover {
  background: var(--primary-dark);
}

/* Orders List */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.order-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  transition: box-shadow var(--transition), border-color var(--transition);
}

.order-card:hover {
  box-shadow: var(--shadow-md);
  border-color: #93c5fd;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.order-id {
  font-weight: 700;
  color: var(--navy);
  font-size: 1.1rem;
}

.order-date {
  font-size: 0.85rem;
  color: var(--muted);
}

/* Statuts */
.order-status {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: #fef9c3;
  color: #a16207;
}

.status-processing {
  background: #dbeafe;
  color: #1e40af;
}

.status-ready {
  background: #e0e7ff;
  color: #3730a3;
}

.status-shipped {
  background: #f3e8ff;
  color: #6b21a8;
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
  color: #475569;
}

.order-body {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.order-products,
.order-payment,
.order-total {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.products-label,
.payment-label,
.total-label {
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.products-count,
.payment-method {
  font-weight: 500;
  color: var(--text);
}

.total-price {
  font-weight: 700;
  color: var(--success);
  font-size: 1.1rem;
}

.order-footer {
  display: flex;
  justify-content: flex-end;
}

.detail-btn {
  background: transparent;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.detail-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary-dark);
}

@media (max-width: 768px) {
  .order-body {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>