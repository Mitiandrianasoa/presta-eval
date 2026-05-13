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
.confirmation-page {
  min-height: 100vh;
  background: var(--bg);
}

.confirmation-main {
  padding: 5rem 0;
}

.confirmation-card {
  background: white;
  border-radius: 16px;
  padding: 4rem 3rem;
  text-align: center;
  max-width: 550px;
  margin: 0 auto;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

.success-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

h1 {
  color: var(--navy);
  margin: 0 0 0.75rem;
  font-size: 2rem;
  font-weight: 700;
}

.success-message {
  color: var(--text);
  font-size: 1.1rem;
  margin: 0 0 0.5rem;
}

.success-detail {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0 0 2rem;
}

.order-details {
  background: var(--bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  color: var(--muted);
  font-weight: 500;
  font-size: 0.9rem;
}

.value {
  font-weight: 600;
  color: var(--navy);
  font-size: 0.95rem;
}

.order-id {
  color: var(--primary);
}

.price {
  color: var(--success);
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.orders-btn,
.continue-btn {
  display: inline-block;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.orders-btn {
  background: var(--primary);
  color: white;
}

.orders-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.continue-btn {
  background: var(--bg);
  color: var(--text);
  border: 2px solid var(--border);
}

.continue-btn:hover {
  background: var(--surface);
  border-color: var(--primary);
  transform: translateY(-2px);
}

@media (max-width: 480px) {
  .confirmation-card {
    padding: 2.5rem 1.5rem;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>