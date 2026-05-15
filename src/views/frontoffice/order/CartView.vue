<template>
  <div class="cart-page">
    <FrontHeader />

    <main class="cart-main">
      <div class="container">
        <div class="page-header">
          <h1>Votre Panier</h1>
          <p>Gérez les articles que vous avez ajoutés</p>
        </div>

        <!-- État : Panier vide -->
        <div v-if="!isCartLoaded" class="loading">
          <p>Chargement du panier...</p>
        </div>
        <div v-else-if="cart.length === 0" class="empty-cart">
          <div class="empty-cart-icon">🛒</div>
          <h2>Votre panier est vide</h2>
          <p>Explorez notre boutique et ajoutez des articles !</p>
          <router-link to="/products" class="continue-shopping-btn">
            Continuer mes achats
          </router-link>
        </div>

        <!-- État : Panier avec des articles -->
        <div v-else class="cart-content">
          <!-- Liste des articles -->
          <div class="cart-items">
            <div
              v-for="(item, index) in cart"
              :key="item.id"
              class="cart-item"
            >
              <div class="item-image" @click="goToProduct(item.id)">
                <img
                  :src="item.image_url || '/placeholder-product.jpg'"
                  :alt="item.name"
                  @error="handleImageError"
                />
              </div>
              <div class="item-details">
                <router-link :to="`/product/${item.id}`" class="item-name">
                  {{ item.name }}
                </router-link>
                <div class="item-price">
                  {{ formatPrice(item.price) }}
                </div>
                <div class="item-actions">
                  <div class="quantity-controls">
                    <button
                      @click="decreaseQuantity(index)"
                      :disabled="item.quantity <= 1"
                      class="quantity-btn"
                    >
                      -
                    </button>
                    <span class="quantity-display">{{ item.quantity }}</span>
                    <button
                      @click="increaseQuantity(index)"
                      class="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button @click="removeItem(index)" class="remove-btn">
                    Supprimer
                  </button>
                </div>
              </div>
              <div class="item-total">
                {{ formatPrice((parseFloat(item.price) * item.quantity).toString()) }}
              </div>
            </div>
          </div>

          <!-- Résumé de la commande -->
          <div class="cart-summary">
            <h2>Résumé de la commande</h2>
            
            <!-- Liste des articles -->
            <div class="summary-items">
              <div
                v-for="item in cart"
                :key="'summary-' + item.id"
                class="summary-item"
              >
                <div class="summary-item-info">
                  <span class="summary-item-name">{{ item.name }}</span>
                  <span class="summary-item-quantity">x{{ item.quantity }}</span>
                </div>
                <span class="summary-item-total">
                  {{ formatPrice((parseFloat(item.price) * item.quantity).toString()) }}
                </span>
              </div>
            </div>
            
            <div class="summary-divider"></div>
            
            <!-- Totaux -->
            <div class="summary-line">
              <span>Sous-total ({{ cartItemCount }} article(s))</span>
              <span>{{ formatPrice(cartTotal.toString()) }}</span>
            </div>
            
            <div class="summary-line">
              <span>Livraison</span>
              <span class="free-shipping">Gratuite</span>
            </div>
            
            <div class="summary-line total">
              <span>Total estimé</span>
              <span>{{ formatPrice(cartTotal.toString()) }}</span>
            </div>
            
            <!-- Message si non connecté -->
            <div v-if="!isLoggedIn" class="login-notice">
              <p>Connectez-vous pour finaliser votre commande</p>
              <router-link to="/login?redirect=/cart" class="login-link">
                Se connecter
              </router-link>
            </div>
            
            <!-- ✅ BOUTON DE PAIEMENT -->
            <button 
              class="checkout-btn" 
              @click="proceedToCheckout"
              :disabled="isProcessing || cart.length === 0"
            >
              <span v-if="isProcessing" class="btn-content">
                <span class="mini-spinner"></span>
                Traitement en cours...
              </span>
              <span v-else>
                {{ isLoggedIn ? 'Procéder au paiement' : 'Se connecter pour commander' }}
              </span>
            </button>
            
            <!-- Information de paiement -->
            <p class="checkout-info">
              <span v-if="isLoggedIn">
                ✓ Paiement à la livraison
              </span>
            </p>
            
            <!-- Message d'erreur -->
            <div v-if="checkoutError" class="checkout-error">
              {{ checkoutError }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal de confirmation -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="showConfirmModal = false">
      <div class="modal-content" @click.stop>
        <h3>Confirmer la commande</h3>
        <p>Vous allez être redirigé vers la page de validation.</p>
        <p>Mode de paiement : <strong>Paiement à la livraison</strong></p>
        <p>Total : <strong>{{ formatPrice(cartTotal.toString()) }}</strong></p>
        <div class="modal-actions">
          <button @click="showConfirmModal = false" class="cancel-btn">
            Annuler
          </button>
          <button @click="startCheckout" class="confirm-btn">
            Confirmer et payer
          </button>
        </div>
      </div>
    </div>

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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import FrontHeader from '../../../components/FrontHeader.vue';
import { processCheckout } from '../../../services/checkout.service';
import { useAuth } from '../../../services/useAuth';

const router = useRouter();

// État du panier
const cart = ref<any[]>([]);
const isCartLoaded = ref(false);

// État du checkout
const isProcessing = ref(false);
const checkoutError = ref('');
const showConfirmModal = ref(false);
const { getCustomerId, isLoggedIn } = useAuth();

// Calculs du panier
const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0);
});

const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => {
    return total + (parseFloat(item.price) || 0) * item.quantity;
  }, 0);
});

// Charger le panier
const loadCart = () => {
  const savedCart = localStorage.getItem('prestashop_cart');
  if (savedCart) {
    cart.value = JSON.parse(savedCart);
  }
  isCartLoaded.value = true;
};

// Sauvegarder le panier
const saveCart = () => {
  localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));
};

// Gestion des quantités
const increaseQuantity = (index: number) => {
  cart.value[index].quantity++;
  saveCart();
};

const decreaseQuantity = (index: number) => {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity--;
    saveCart();
  }
};

const removeItem = (index: number) => {
  cart.value.splice(index, 1);
  saveCart();
};

// Navigation
const goToProduct = (productId: string) => {
  router.push(`/product/${productId}`);
};

// Gestion du checkout
const proceedToCheckout = () => {
  checkoutError.value = '';
  
  if (cart.value.length === 0) {
    checkoutError.value = 'Votre panier est vide';
    return;
  }
  
  if (!isLoggedIn.value) {
    router.push('/login?redirect=/cart');
    return;
  }
  
  // Afficher la modal de confirmation
  showConfirmModal.value = true;
};

// Lancer le processus de checkout
const startCheckout = async () => {
  showConfirmModal.value = false;
  isProcessing.value = true;
  checkoutError.value = '';
  
  try {
    const customerId = getCustomerId();
    
    // Construire les données pour le checkout
    const cartData = {
      products: cart.value.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        image_url: item.image_url
      })),
      customerId: customerId,
      paymentMethod: 'paiement_livraison'
    };
    
    console.log('🚀 Démarrage du checkout avec:', {
      productsCount: cartData.products.length,
      customerId: cartData.customerId
    });
    
    // Appeler le service de checkout
    const result = await processCheckout(cartData);
    
    console.log('✅ Résultat checkout:', result);
    
    if (result.success) {
      // Sauvegarder les infos de commande pour la page de confirmation
      localStorage.setItem('last_order', JSON.stringify({
        orderId: result.order?.id || 'Inconnu',
        cartId: result.cartId,
        total: cartTotal.value.toString(),
        date: new Date().toISOString(),
        items: cart.value.length
      }));
      
      // Vider le panier
      localStorage.removeItem('prestashop_cart');
      cart.value = [];
      
      // Rediriger vers la page de confirmation
      router.push('/order-confirmation');
    }
    
  } catch (err: any) {
    console.error('❌ Erreur checkout:', err);
    checkoutError.value = err.message || 'Une erreur est survenue lors du traitement';
  } finally {
    isProcessing.value = false;
  }
};

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(numPrice);
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-product.jpg';
};

onMounted(() => {
  loadCart();
});
</script>

<style scoped>
/* Styles pour le bouton de checkout */
.checkout-btn {
  width: 100%;
  padding: 1rem;
  background: var(--success, #16a34a);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  font-family: inherit;
}

.checkout-btn:hover:not(:disabled) {
  background: #15803d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.checkout-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  transform: none;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.mini-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.free-shipping {
  color: #16a34a;
  font-weight: 600;
}

.checkout-info {
  text-align: center;
  font-size: 0.85rem;
  margin-top: 0.75rem;
  color: var(--muted, #64748b);
}

.checkout-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 0.75rem;
  font-size: 0.9rem;
  text-align: center;
}

.login-notice {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  text-align: center;
}

.login-link {
  display: inline-block;
  background: var(--primary, #2563eb);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-content h3 {
  margin: 0 0 1.5rem;
  color: var(--navy, #1e3a8a);
  font-size: 1.3rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.cancel-btn {
  background: #f1f5f9;
  color: var(--text, #334155);
  border: 1px solid var(--border, #e2e8f0);
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.confirm-btn {
  background: #16a34a;
  color: white;
  border: none;
}

.confirm-btn:hover {
  background: #15803d;
}

/* Styles de base */
.cart-page {
  min-height: 100vh;
  background: var(--bg);
}

.cart-main {
  padding: 3rem 0 5rem;
}

.page-header {
  margin-bottom: 2.5rem;
}
.page-header h1 { font-size: 2rem; font-weight: 700; color: var(--navy); margin: 0 0 0.4rem; }
.page-header p { color: var(--muted); margin: 0; }

/* État vide */
.empty-cart {
  text-align: center;
  padding: 5rem 2rem;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}
.empty-cart-icon { font-size: 3rem; margin-bottom: 1rem; }
.empty-cart h2 { color: var(--navy); margin-bottom: 0.5rem; }
.empty-cart p { color: var(--muted); margin-bottom: 2rem; }
.continue-shopping-btn {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: background var(--transition);
}
.continue-shopping-btn:hover { background: var(--primary-dark); }

/* Grille principale du panier */
.cart-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

/* Liste des articles */
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cart-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}
.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-name {
  font-weight: 600;
  color: var(--navy);
  text-decoration: none;
  font-size: 1rem;
}
.item-name:hover { color: var(--primary); }

.item-price {
  font-weight: 600;
  color: var(--success);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.quantity-btn {
  background: var(--bg);
  border: none;
  width: 36px;
  height: 36px;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text);
  transition: background 0.2s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quantity-btn:hover:not(:disabled) { background: #e2e8f0; }
.quantity-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.quantity-display {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--error);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  transition: background 0.2s;
}
.remove-btn:hover { background: #fee2e2; }

/* Total par article */
.item-total {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--navy);
  white-space: nowrap;
  margin-left: auto;
}

/* Résumé de la commande */
.cart-summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  position: sticky;
  top: 80px;
}
.cart-summary h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}
.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: var(--muted);
  font-size: 0.95rem;
}
.summary-line.total {
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--navy);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.summary-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.summary-items::-webkit-scrollbar {
  width: 4px;
}
.summary-items::-webkit-scrollbar-track {
  background: var(--bg);
  border-radius: 4px;
}
.summary-items::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--border);
}

.summary-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.summary-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.summary-item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-item-quantity {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
}

.summary-item-total {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--navy);
  white-space: nowrap;
}

.summary-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 1.25rem;
}

/* Responsive */
@media (max-width: 768px) {
  .cart-content {
    grid-template-columns: 1fr;
  }
  .cart-item {
    flex-wrap: wrap;
  }
  .item-total {
    margin-left: 0;
    width: 100%;
    text-align: right;
    margin-top: 0.5rem;
  }
}
</style>