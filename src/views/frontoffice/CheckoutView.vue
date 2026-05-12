<template>
  <div class="checkout-page">
    <FrontHeader />
    
    <main class="checkout-main">
      <div class="container">
        <div class="page-header">
          <h1>Validation de commande</h1>
          <p>Vérifiez vos informations avant de confirmer</p>
        </div>

        <!-- États de chargement -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>

        <div v-else-if="error" class="error-message">
          <div class="error-content">
            <h3>Erreur</h3>
            <p>{{ error }}</p>
            <button @click="retryCheckout" class="retry-btn">
              Réessayer
            </button>
          </div>
        </div>

        <!-- Succès -->
        <div v-else-if="checkoutSuccess" class="success-message">
          <div class="success-icon">✅</div>
          <h2>Commande confirmée !</h2>
          <p>Votre commande a été créée avec succès.</p>
          <div v-if="orderDetails" class="order-details">
            <p><strong>N° de commande:</strong> {{ orderDetails.id }}</p>
            <p><strong>Total:</strong> {{ formatPrice(orderDetails.total) }}</p>
          </div>
          <router-link to="/orders" class="view-orders-btn">
            Voir mes commandes
          </router-link>
        </div>

        <!-- Récapitulatif avant validation -->
        <div v-else class="checkout-content">
          <!-- Résumé de la commande -->
          <div class="summary-section">
            <h2>Récapitulatif de votre commande</h2>
            
            <div class="info-card">
              <h3>👤 Client</h3>
              <p>{{ customerInfo?.firstname }} {{ customerInfo?.lastname }}</p>
              <p>{{ customerInfo?.email }}</p>
            </div>

            <div class="info-card">
              <h3>🚚 Livraison</h3>
              <p>{{ carrierInfo?.name || 'Transporteur standard' }}</p>
              <p v-if="carrierInfo?.delay">{{ carrierInfo.delay }}</p>
              <p class="free-shipping">Gratuit</p>
            </div>

            <div class="info-card">
              <h3>💳 Paiement</h3>
              <p>Paiement à la livraison</p>
              <p class="payment-note">Vous paierez à la réception de votre commande</p>
            </div>

            <!-- Liste des produits -->
            <div class="cart-summary">
              <h3>📦 Articles ({{ totalItems }})</h3>
              <div class="cart-item" v-for="item in cart" :key="item.id">
                <img 
                  :src="item.image_url || '/placeholder-product.jpg'" 
                  :alt="item.name"
                  class="item-image"
                />
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-quantity">x{{ item.quantity }}</span>
                </div>
                <span class="item-price">
                  {{ formatPrice((parseFloat(item.price) * item.quantity).toString()) }}
                </span>
              </div>
              
              <div class="total-line">
                <span>Total</span>
                <span class="total-price">{{ formatPrice(cartTotal.toString()) }}</span>
              </div>
            </div>
          </div>

          <!-- Bouton de confirmation -->
          <div class="confirmation-section">
            <button 
              @click="confirmOrder" 
              class="confirm-btn"
              :disabled="!canConfirm"
            >
              Confirmer la commande
            </button>
            <p class="terms-text">
              En confirmant, vous acceptez nos conditions générales de vente
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FrontHeader from '../../components/FrontHeader.vue';
import { processCheckout, getCustomerInfo, getDefaultCarrier } from '../../services/checkout.service';

const router = useRouter();

// États
const loading = ref(false);
const loadingMessage = ref('');
const error = ref('');
const checkoutSuccess = ref(false);
const orderDetails = ref<any>(null);
const customerInfo = ref<any>(null);
const carrierInfo = ref<any>(null);

// Panier (depuis localStorage)
const cart = ref<any[]>([]);

// Calculs
const totalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0);
});

const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => {
    return total + (parseFloat(item.price) || 0) * item.quantity;
  }, 0);
});

const canConfirm = computed(() => {
  return cart.value.length > 0 && customerInfo.value;
});

// Charger le panier depuis localStorage
const loadCart = () => {
  const savedCart = localStorage.getItem('prestashop_cart');
  if (savedCart) {
    cart.value = JSON.parse(savedCart);
  }
};

// Charger les informations du client
const loadCustomerInfo = async () => {
  const savedUser = localStorage.getItem('prestashop_user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    try {
      customerInfo.value = await getCustomerInfo(user.id);
    } catch (err) {
      // Fallback avec les données locales
      customerInfo.value = user;
    }
  }
};

// Charger les informations du transporteur
const loadCarrierInfo = async () => {
  try {
    carrierInfo.value = await getDefaultCarrier();
  } catch (err) {
    console.error('Erreur chargement transporteur:', err);
  }
};

// Confirmer la commande
const confirmOrder = async () => {
  if (!customerInfo.value) {
    error.value = 'Vous devez être connecté pour commander';
    return;
  }

  loading.value = true;
  loadingMessage.value = 'Création de votre commande...';
  error.value = '';

  try {
    const cartData = {
      products: cart.value.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        image_url: item.image_url
      })),
      customerId: customerInfo.value.id,
      carrierId: '1', // Transporteur par défaut
      paymentMethod: 'paiement_livraison'
    };

    const result = await processCheckout(cartData);

    if (result.success) {
      checkoutSuccess.value = true;
      orderDetails.value = {
        id: result.order?.id || 'En cours',
        total: cartTotal.value.toString()
      };
      
      // Vider le panier
      localStorage.removeItem('prestashop_cart');
      cart.value = [];
      
      console.log('✅ Commande réussie:', result);
    }

  } catch (err: any) {
    console.error('❌ Erreur commande:', err);
    error.value = err.message || 'Erreur lors de la création de la commande';
  } finally {
    loading.value = false;
  }
};

// Réessayer
const retryCheckout = () => {
  error.value = '';
  confirmOrder();
};

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(numPrice);
};

onMounted(() => {
  loadCart();
  loadCustomerInfo();
  loadCarrierInfo();
  
  // Vérifier si l'utilisateur est connecté
  if (!localStorage.getItem('prestashop_token')) {
    router.push('/login?redirect=/checkout');
  }
});
</script>

<style scoped>
/* Styles pour la page de checkout */
.checkout-page {
  min-height: 100vh;
  background: var(--bg);
}

.checkout-main {
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

.error-content h3 {
  color: var(--error);
  margin-bottom: 0.5rem;
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

/* Success */
.success-message {
  text-align: center;
  padding: 4rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-lg);
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.order-details {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  display: inline-block;
}

.view-orders-btn {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background var(--transition);
}

.view-orders-btn:hover {
  background: var(--primary-dark);
}

/* Checkout Content */
.checkout-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.info-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.info-card h3 {
  color: var(--navy);
  font-size: 1rem;
  margin: 0 0 0.75rem;
}

.free-shipping {
  color: var(--success);
  font-weight: 600;
}

.payment-note {
  font-size: 0.85rem;
  color: var(--muted);
  font-style: italic;
}

.cart-summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.item-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.item-info {
  flex: 1;
}

.item-name {
  display: block;
  font-weight: 500;
  color: var(--text);
}

.item-quantity {
  font-size: 0.85rem;
  color: var(--muted);
}

.item-price {
  font-weight: 600;
  color: var(--navy);
}

.total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 2px solid var(--navy);
  font-weight: 700;
  font-size: 1.2rem;
}

.total-price {
  color: var(--success);
}

.confirmation-section {
  position: sticky;
  top: 80px;
  height: fit-content;
}

.confirm-btn {
  width: 100%;
  background: var(--success);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition);
}

.confirm-btn:hover:not(:disabled) {
  background: #15803d;
}

.confirm-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.terms-text {
  text-align: center;
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.75rem;
}

@media (max-width: 768px) {
  .checkout-content {
    grid-template-columns: 1fr;
  }
}
</style>