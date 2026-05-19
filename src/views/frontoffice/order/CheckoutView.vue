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
import FrontHeader from '../../../components/FrontHeader.vue';
import { processCheckout, getCustomerInfo, getDefaultCarrier } from '../../../services/checkout.service';

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

.checkout-page { background: #07070e; min-height: 100vh; color: #e8e8f5; padding-bottom: 4rem; }
.page-hero { background: linear-gradient(160deg, #0c0c18, #07070e); border-bottom: 1px solid #1e1e35; padding: 2.5rem 0 2rem; }
.page-hero h1 { font-size: 1.5rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.3rem; }
.page-hero p { color: #5a5a85; margin: 0; font-size: 0.875rem; }

.checkout-layout { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; padding: 2rem 0; }

/* Steps */
.steps { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; }
.step { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #5a5a85; }
.step.active { color: #a78bfa; }
.step-num { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
.step.active .step-num { background: #a78bfa; border-color: #a78bfa; color: white; }
.step-sep { flex: 1; height: 1px; background: #1e1e35; min-width: 20px; }

/* Form card */
.form-card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 12px; padding: 1.75rem; margin-bottom: 1.25rem; }
.form-card h3 { font-size: 0.95rem; font-weight: 700; color: #e8e8f5; margin: 0 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #1e1e35; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 0.8rem; color: #8080b0; font-weight: 500; }
.form-input, .form-select, .form-textarea {
  padding: 0.6rem 0.875rem;
  background: #07070e;
  border: 1px solid #1e1e35;
  border-radius: 6px;
  color: #e8e8f5;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #a78bfa; }
.form-select option { background: #0e0e1a; }
.form-textarea { resize: vertical; min-height: 80px; }

/* Payment options */
.payment-options { display: flex; flex-direction: column; gap: 0.75rem; }
.payment-opt {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1.5px solid #1e1e35;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.payment-opt.selected { border-color: rgba(167,139,250,0.5); background: rgba(167,139,250,0.06); }
.payment-opt input[type=radio] { accent-color: #a78bfa; }
.payment-icon { font-size: 1.25rem; }
.payment-label { font-size: 0.875rem; font-weight: 600; color: #e8e8f5; }
.payment-desc { font-size: 0.75rem; color: #5a5a85; }

/* Order summary sidebar */
.order-sidebar { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 12px; padding: 1.5rem; height: fit-content; position: sticky; top: 5rem; }
.sidebar-title { font-size: 0.95rem; font-weight: 700; color: #e8e8f5; margin: 0 0 1.25rem; }
.order-items { margin-bottom: 1.25rem; }
.order-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #1e1e35; }
.order-item:last-child { border-bottom: none; }
.o-img { width: 44px; height: 44px; border-radius: 6px; background: #15152a; overflow: hidden; flex-shrink: 0; }
.o-img img { width: 100%; height: 100%; object-fit: cover; }
.o-name { flex: 1; font-size: 0.8rem; color: #e8e8f5; }
.o-qty { font-size: 0.75rem; color: #5a5a85; }
.o-price { font-size: 0.875rem; font-weight: 600; color: #f59e0b; }
.totals { border-top: 1px solid #1e1e35; padding-top: 1rem; }
.total-row { display: flex; justify-content: space-between; font-size: 0.875rem; padding: 0.35rem 0; }
.total-row .label { color: #8080b0; }
.total-row .val { color: #e8e8f5; }
.total-row.grand { font-weight: 700; font-size: 1rem; border-top: 1px solid #1e1e35; margin-top: 0.5rem; padding-top: 0.75rem; }
.total-row.grand .val { color: #f59e0b; }

.place-order-btn {
  width: 100%; margin-top: 1.5rem;
  padding: 0.9rem;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border: none; border-radius: 8px;
  color: white; font-weight: 700; font-size: 0.95rem;
  cursor: pointer; transition: opacity 0.2s;
}
.place-order-btn:hover { opacity: 0.88; }
.place-order-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 768px) { .checkout-layout { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } }

</style>