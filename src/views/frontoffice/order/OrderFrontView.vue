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
            class="order-card"
            @click="viewOrderDetail(order.id)"
          >
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

const { getCustomerId } = useAuth();
const router = useRouter();
const orders = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

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
    '11': 'status-delivered-and-paid',
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

.orders-page { background: #07070e; min-height: 100vh; color: #e8e8f5; padding-bottom: 4rem; }
.page-hero { background: linear-gradient(160deg, #0c0c18, #07070e); border-bottom: 1px solid #1e1e35; padding: 2.5rem 0 2rem; }
.page-hero h1 { font-size: 1.5rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.3rem; }
.page-hero p { color: #5a5a85; margin: 0; font-size: 0.875rem; }

.orders-list { padding: 2rem 0; }
.order-card {
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  display: flex; align-items: center; gap: 1.5rem;
  cursor: pointer;
  transition: border-color 0.2s;
  text-decoration: none;
}
.order-card:hover { border-color: rgba(167,139,250,0.3); }
.order-id { font-size: 0.875rem; font-weight: 600; color: #a78bfa; min-width: 100px; }
.order-date { font-size: 0.8rem; color: #5a5a85; flex: 1; }
.order-total { font-size: 1rem; font-weight: 700; color: #f59e0b; min-width: 100px; text-align: right; }
.order-status { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.status-delivered { background: rgba(52,211,153,0.12); color: #34d399; }
.status-shipped { background: rgba(56,139,253,0.12); color: #388bfd; }
.status-processing { background: rgba(210,153,34,0.12); color: #d29922; }
.status-cancelled { background: rgba(248,113,113,0.12); color: #f87171; }
.status-default { background: rgba(128,128,176,0.12); color: #8080b0; }
.order-arrow { color: #2a2a4a; margin-left: auto; }

.loading-state, .empty-state { text-align: center; padding: 4rem 2rem; color: #5a5a85; }
.spinner { width: 36px; height: 36px; border: 2px solid #1e1e35; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>