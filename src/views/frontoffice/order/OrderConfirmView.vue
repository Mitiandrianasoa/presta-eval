<template>
  <div class="confirmation-page">
    <FrontHeader />
    
    <main class="confirmation-main">
      <div class="container">
        <div class="confirmation-card">
          <div class="success-icon"></div>
          <h1>Commande confirmée !</h1>
          <p class="success-message">Votre commande a été créée avec succès.</p>
          <p class="success-detail">Vous recevrez un email de confirmation prochainement.</p>
          
          <div v-if="orderInfo" class="order-details">
            <div class="detail-item">
              <span class="label">N° de commande</span>
              <span class="value order-id">#{{ orderInfo.orderId }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Total</span>
              <span class="value price">{{ formatPrice(orderInfo.total) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Articles</span>
              <span class="value">{{ orderInfo.items }} article(s)</span>
            </div>
            <div class="detail-item">
              <span class="label">Paiement</span>
              <span class="value">Paiement à la livraison</span>
            </div>
            <div class="detail-item">
              <span class="label">Date</span>
              <span class="value">{{ formatDate(orderInfo.date) }}</span>
            </div>
          </div>
          
          <div class="actions">
            <router-link to="/orders" class="orders-btn">
               Voir mes commandes
            </router-link>
            <router-link to="/products" class="continue-btn">
              Continuer mes achats
            </router-link>
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
import FrontHeader from '../../../components/FrontHeader.vue';

const orderInfo = ref<any>(null);

onMounted(() => {
  const savedOrder = localStorage.getItem('last_order');
  if (savedOrder) {
    orderInfo.value = JSON.parse(savedOrder);
  }
});

const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-EU', {
    style: 'currency',
    currency: 'EUR'
  }).format(numPrice);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
</script>

<style scoped>

.confirm-page { background: #07070e; min-height: 100vh; color: #e8e8f5; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
.confirm-card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 16px; padding: 3rem 2.5rem; max-width: 540px; width: 100%; text-align: center; }
.success-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(52,211,153,0.12); border: 2px solid rgba(52,211,153,0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2rem; }
.confirm-card h1 { font-size: 1.5rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.75rem; }
.confirm-card p { color: #8080b0; margin: 0 0 2rem; line-height: 1.6; }
.order-number { background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.2); border-radius: 8px; padding: 1rem; margin-bottom: 2rem; }
.order-number .label { font-size: 0.75rem; color: #5a5a85; text-transform: uppercase; letter-spacing: 0.06em; }
.order-number .value { font-size: 1.1rem; font-weight: 700; color: #a78bfa; margin-top: 0.25rem; }
.confirm-actions { display: flex; flex-direction: column; gap: 0.75rem; }
.btn-primary { padding: 0.85rem; background: linear-gradient(135deg, #7c3aed, #a78bfa); border: none; border-radius: 8px; color: white; font-weight: 700; font-size: 0.95rem; cursor: pointer; text-decoration: none; display: block; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.88; }
.btn-ghost { padding: 0.85rem; background: transparent; border: 1px solid #1e1e35; border-radius: 8px; color: #8080b0; font-size: 0.875rem; cursor: pointer; text-decoration: none; display: block; transition: all 0.2s; }
.btn-ghost:hover { border-color: rgba(167,139,250,0.3); color: #a78bfa; }

</style>