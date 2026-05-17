<template>
  <div class="cart-page">
    <FrontHeader />

    <main class="cart-main">
      <div class="container">
        <div class="page-header">
          <h1>Votre Panier</h1>
          <p>Gérez les articles que vous avez ajoutés</p>
        </div>

        <section v-if="isLoggedIn" class="saved-carts-section">
          <div class="saved-carts-header">
            <div>
              <h2>Mes paniers enregistrés</h2>
              <p>Tous les paniers du client, avec un repère visuel sur ceux déjà convertis en commande</p>
            </div>
          </div>

          <div v-if="savedCartsLoading" class="saved-carts-state">
            Chargement des paniers...
          </div>

          <div v-else-if="savedCartsError" class="saved-carts-state error">
            {{ savedCartsError }}
          </div>

          <div v-else-if="savedCarts.length === 0" class="saved-carts-state empty">
            Aucun panier trouvé pour ce client.
          </div>

          <div v-else class="saved-carts-list">
            <div v-for="savedCart in savedCarts" :key="savedCart.id" class="saved-cart-card">
              <div class="saved-cart-info">
                <strong>Panier #{{ savedCart.id }}</strong>
                <span>{{ savedCart.totalQuantity }} article(s) · {{ formatDate(savedCart.dateUpd || savedCart.dateAdd) }}</span>
              </div>
              <span class="cart-status-badge" :class="savedCart.hasOrder ? 'linked' : 'open'">
                {{ savedCart.hasOrder ? 'Commande liée' : 'Disponible' }}
              </span>
              <button
                class="resume-cart-btn"
                :class="{ disabled: savedCart.hasOrder }"
                :disabled="resumeCartLoadingId === savedCart.id || savedCart.hasOrder"
                :title="savedCart.hasOrder ? 'Ce panier a déjà été utilisé pour une commande' : 'Poursuivre ce panier'"
                @click="resumeSavedCart(savedCart.id)"
              >
                {{ resumeCartLoadingId === savedCart.id ? 'Chargement...' : (savedCart.hasOrder ? 'Déjà commandé' : 'Poursuivre ce panier') }}
              </button>
            </div>
          </div>

          <p v-if="resumeCartError" class="saved-carts-error">{{ resumeCartError }}</p>
        </section>

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
              :key="`${item.id}_${item.id_product_attribute || 0}`"
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
                
                <!-- ✅ AFFICHAGE DE LA COMBINAISON SÉLECTIONNÉE -->
                <div v-if="item.combination_name" class="item-combination">
                  <span class="combination-label">Variante :</span>
                  <span class="combination-value">{{ item.combination_name }}</span>
                </div>
                <div v-if="item.combination_reference && item.combination_reference !== item.reference" class="item-combination-ref">
                  <span class="combination-label">Réf. variante :</span>
                  <span class="combination-value">{{ item.combination_reference }}</span>
                </div>
                
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
                :key="`summary-${item.id}_${item.id_product_attribute || 0}`"
                class="summary-item"
              >
                <div class="summary-item-info">
                  <span class="summary-item-name">{{ item.name }}</span>
                  <span v-if="item.combination_name" class="summary-item-combination">
                    ({{ item.combination_name }})
                  </span>
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
              <span>Total estimé TTC</span>
              <span>{{ formatPrice(cartTotal.toString()) }}</span>
            </div>
            
            <!-- Message si non connecté -->
            <div v-if="!isLoggedIn" class="anon-section">
              <div class="anon-notice">
                <p>📌 Vous pouvez enregistrer votre panier ou vous connecter pour commander</p>
              </div>
              
              <!-- Formulaire anonyme pour enregistrer le panier -->
              <div class="anon-form">
                <h3>Enregistrer votre panier en tant qu'anonyme</h3>
                <input 
                  v-model="anonEmail" 
                  type="email" 
                  placeholder="Votre adresse email"
                  class="form-input"
                >
                <input 
                  v-model="anonFirstName" 
                  type="text" 
                  placeholder="Prénom"
                  class="form-input"
                >
                <input 
                  v-model="anonLastName" 
                  type="text" 
                  placeholder="Nom"
                  class="form-input"
                >
                <button
                  class="save-anon-cart-btn"
                  :disabled="saveCartLoading || !anonEmail || !anonFirstName || !anonLastName"
                  @click="saveAnonCart"
                >
                  <span v-if="saveCartLoading" class="btn-content">
                    <span class="mini-spinner"></span>
                    Enregistrement...
                  </span>
                  <span v-else>💾 Enregistrer mon panier</span>
                </button>
              </div>
              
              <div class="anon-login">
                <p>Ou connectez-vous pour commander immédiatement :</p>
                <router-link to="/login?redirect=/cart" class="login-link">
                  Se connecter
                </router-link>
              </div>
            </div>
            
            <!-- BOUTON DE PAIEMENT -->
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

            <button
              v-if="isLoggedIn"
              class="save-cart-btn"
              :disabled="saveCartLoading || cart.length === 0"
              @click="saveCurrentCart"
            >
              <span v-if="saveCartLoading" class="btn-content">
                <span class="mini-spinner"></span>
                Enregistrement en cours...
              </span>
              <span v-else>Enregistrer le panier</span>
            </button>

            <div v-if="saveCartSuccess" class="save-cart-success">
              {{ saveCartSuccess }}
            </div>
            <div v-if="saveCartError" class="save-cart-error">
              {{ saveCartError }}
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
        <p>Total TTC : <strong>{{ formatPrice(cartTotal.toString()) }}</strong></p>
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
import { cartOrderService, type OpenCartSummary, type CurrentCartItem } from '../../../services/cartOrder.service';
import { useAuth } from '../../../services/useAuth';

interface CartItem {
  id: string;
  id_product_attribute?: string | number;
  name: string;
  price: string;
  quantity: number;
  image_url?: string;
  reference?: string;
  combination_name?: string;
  combination_reference?: string;
}

const router = useRouter();

// État du panier
const cart = ref<CartItem[]>([]);
const isCartLoaded = ref(false);
const savedCarts = ref<OpenCartSummary[]>([]);
const savedCartsLoading = ref(false);
const savedCartsError = ref('');
const resumeCartError = ref('');
const resumeCartLoadingId = ref<string | null>(null);
const saveCartLoading = ref(false);
const saveCartSuccess = ref('');
const saveCartError = ref('');

// État anonyme
const anonEmail = ref('');
const anonFirstName = ref('');
const anonLastName = ref('');

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
    const price = parseFloat(item.price) || 0;
    return total + price * item.quantity;
  }, 0);
});

// Charger le panier
const loadCart = () => {
  const savedCart = localStorage.getItem('prestashop_cart');
  if (savedCart) {
    cart.value = JSON.parse(savedCart);
    console.log('📦 Panier chargé avec combinaisons:', cart.value.map(item => ({
      name: item.name,
      combination: item.combination_name,
      combinationId: item.id_product_attribute,
      quantity: item.quantity,
      price: item.price
    })));
  }
  isCartLoaded.value = true;
};

const loadSavedCarts = async () => {
  if (!isLoggedIn.value) {
    savedCarts.value = [];
    return;
  }

  savedCartsLoading.value = true;
  savedCartsError.value = '';

  try {
    const customerId = getCustomerId();
    savedCarts.value = await cartOrderService.fetchOpenCustomerCarts(customerId);
  } catch (err: any) {
    savedCartsError.value = err?.message || 'Impossible de charger vos paniers enregistrés';
  } finally {
    savedCartsLoading.value = false;
  }
};

const resumeSavedCart = async (cartId: string) => {
  resumeCartError.value = '';
  resumeCartLoadingId.value = cartId;

  try {
    const resumedCart = await cartOrderService.resumeCart(cartId);
    cart.value = resumedCart as CurrentCartItem[];
    isCartLoaded.value = true;
  } catch (err: any) {
    resumeCartError.value = err?.message || 'Impossible de poursuivre ce panier';
  } finally {
    resumeCartLoadingId.value = null;
  }
};

const saveCurrentCart = async () => {
  saveCartLoading.value = true;
  saveCartError.value = '';
  saveCartSuccess.value = '';

  try {
    const customerId = getCustomerId();
    const cartId = await cartOrderService.saveCurrentCart(customerId);
    saveCartSuccess.value = `Panier enregistré avec l'ID #${cartId}`;
    await loadSavedCarts();
  } catch (err: any) {
    saveCartError.value = err?.message || 'Impossible d’enregistrer le panier';
  } finally {
    saveCartLoading.value = false;
  }
};

const saveAnonCart = async () => {
  saveCartLoading.value = true;
  saveCartError.value = '';
  saveCartSuccess.value = '';

  try {
    const cartId = await cartOrderService.saveAnonymousCart(anonEmail.value, anonFirstName.value, anonLastName.value);
    saveCartSuccess.value = `Panier anonyme enregistré avec l'ID #${cartId}. Connectez-vous pour commander!`;
    
    // Réinitialiser le formulaire
    anonEmail.value = '';
    anonFirstName.value = '';
    anonLastName.value = '';
  } catch (err: any) {
    saveCartError.value = err?.message || 'Impossible d\'enregistrer le panier anonyme';
  } finally {
    saveCartLoading.value = false;
  }
};

// Sauvegarder le panier
const saveCart = () => {
  localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));
};

// Gestion des quantités
const increaseQuantity = (index: number) => {
  const item = cart.value[index];
  if (!item) return;
  item.quantity++;
  saveCart();
};

const decreaseQuantity = (index: number) => {
  const item = cart.value[index];
  if (!item) return;
  if (item.quantity > 1) {
    item.quantity--;
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
  
  showConfirmModal.value = true;
};

// Lancer le processus de checkout
const startCheckout = async () => {
  showConfirmModal.value = false;
  isProcessing.value = true;
  checkoutError.value = '';
  
  try {
    const customerId = getCustomerId();
    
    // Construire les données pour le checkout avec les combinaisons
    const cartData = {
      products: cart.value.map(item => ({
        product_id: item.id,
        id_product_attribute: String(item.id_product_attribute || '0'),
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        combination_name: item.combination_name,
        combination_reference: item.combination_reference
      })),
      customerId: customerId,
      paymentMethod: 'paiement_livraison'
    };
    
    console.log('🚀 Démarrage du checkout avec combinaisons:', {
      productsCount: cartData.products.length,
      products: cartData.products.map(p => ({
        id: p.product_id,
        attribute: p.id_product_attribute,
        name: p.name,
        combination: p.combination_name
      }))
    });
    
    const result = await processCheckout(cartData);
    
    console.log('✅ Résultat checkout:', result);
    
    if (result.success) {
      localStorage.setItem('last_order', JSON.stringify({
        orderId: result.order?.id || 'Inconnu',
        cartId: result.cartId,
        total: cartTotal.value.toString(),
        date: new Date().toISOString(),
        items: cart.value.length
      }));
      
      localStorage.removeItem('prestashop_cart');
      cart.value = [];
      
      router.push('/order-confirmation');
    }
    
  } catch (err: any) {
    console.error('❌ Erreur checkout:', err);
    checkoutError.value = err.message || 'Une erreur est survenue lors du traitement';
  } finally {
    isProcessing.value = false;
  }
};

// Formatage des prix (TTC)
const formatPrice = (price: string | number) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
};

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return 'Date inconnue';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-product.jpg';
};

onMounted(() => {
  loadCart();
  loadSavedCarts();
});
</script>

<style scoped>
/* Styles ajoutés pour les combinaisons */
.item-combination, .item-combination-ref {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.combination-label {
  font-weight: 500;
  color: #475569;
}

.combination-value {
  color: #3b82f6;
}

.summary-item-combination {
  font-size: 0.7rem;
  color: #64748b;
  margin-left: 0.25rem;
}

/* Styles existants (garder tous les styles de votre version originale) */
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

.saved-carts-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.saved-carts-header h2 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
  color: var(--navy);
}

.saved-carts-header p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.saved-carts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.saved-cart-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f8fafc;
}

.saved-cart-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.saved-cart-info strong {
  color: var(--text);
}

.saved-cart-info span {
  color: var(--muted);
  font-size: 0.85rem;
}

.cart-status-badge {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.cart-status-badge.open {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.cart-status-badge.linked {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.resume-cart-btn {
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  padding: 0.65rem 1rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.resume-cart-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.resume-cart-btn.disabled {
  background: #94a3b8;
}

.saved-carts-state {
  margin-top: 1rem;
  color: var(--muted);
}

.saved-carts-state.error,
.saved-carts-error {
  color: #dc2626;
}

.saved-carts-state.empty {
  color: var(--muted);
}

.save-cart-btn {
  width: 100%;
  padding: 1rem;
  background: #0f766e;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 1rem;
  font-family: inherit;
}

.save-cart-btn:hover:not(:disabled) {
  background: #115e59;
  transform: translateY(-1px);
}

.save-cart-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  transform: none;
}

.save-cart-success {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  text-align: center;
  font-size: 0.9rem;
}

.save-cart-error {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  text-align: center;
  font-size: 0.9rem;
}

.cart-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

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

.item-total {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--navy);
  white-space: nowrap;
  margin-left: auto;
}

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