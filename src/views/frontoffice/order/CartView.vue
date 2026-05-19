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

.cart-page { background: #07070e; min-height: 100vh; color: #e8e8f5; padding-bottom: 4rem; }
.page-hero { background: linear-gradient(160deg, #0c0c18, #07070e); border-bottom: 1px solid #1e1e35; padding: 2.5rem 0 2rem; }
.page-hero h1 { font-size: 1.6rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.3rem; }
.page-hero p { color: #5a5a85; margin: 0; font-size: 0.9rem; }

.cart-layout { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; padding: 2rem 0; }

/* Items */
.cart-items {}
.cart-item {
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}
.cart-item:hover { border-color: #2a2a4a; }
.item-img {
  width: 80px; height: 80px;
  border-radius: 8px;
  background: #15152a;
  overflow: hidden;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.item-img img { width: 100%; height: 100%; object-fit: cover; }
.img-ph { font-size: 1.5rem; opacity: 0.3; }
.item-info { flex: 1; }
.item-name { font-size: 0.9rem; font-weight: 600; color: #e8e8f5; margin: 0 0 0.25rem; }
.item-ref { font-size: 0.75rem; color: #5a5a85; margin: 0 0 0.5rem; }
.item-combo { font-size: 0.75rem; color: #8080b0; }
.item-controls { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
.qty-wrap { display: flex; align-items: center; border: 1px solid #2a2a4a; border-radius: 6px; overflow: hidden; }
.q-btn { width: 30px; height: 30px; background: #0e0e1a; border: none; color: #8080b0; cursor: pointer; font-size: 1rem; transition: background 0.2s; }
.q-btn:hover { background: #15152a; color: #e8e8f5; }
.q-val { width: 36px; text-align: center; font-size: 0.875rem; font-weight: 600; color: #e8e8f5; border: none; background: transparent; }
.item-price { font-size: 1rem; font-weight: 700; color: #f59e0b; min-width: 80px; text-align: right; }
.remove-btn { background: transparent; border: none; color: #5a5a85; cursor: pointer; padding: 0.25rem; border-radius: 4px; transition: color 0.2s; line-height: 1; font-size: 1.1rem; }
.remove-btn:hover { color: #f87171; }

/* Summary */
.cart-summary {
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 5rem;
}
.summary-title { font-size: 1rem; font-weight: 700; color: #e8e8f5; margin: 0 0 1.25rem; }
.summary-rows { margin-bottom: 1.25rem; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #1e1e35; font-size: 0.875rem; }
.summary-row:last-child { border-bottom: none; }
.summary-row.total { font-weight: 700; font-size: 1rem; }
.row-label { color: #8080b0; }
.row-val { color: #e8e8f5; }
.row-val.gold { color: #f59e0b; }
.checkout-btn {
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-bottom: 0.75rem;
}
.checkout-btn:hover { opacity: 0.88; }
.continue-link { display: block; text-align: center; color: #5a5a85; font-size: 0.8rem; text-decoration: none; }
.continue-link:hover { color: #a78bfa; }

/* Empty */
.empty-cart { text-align: center; padding: 5rem 2rem; color: #5a5a85; }
.empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; }
.empty-cart h2 { color: #e8e8f5; font-size: 1.2rem; margin: 0 0 0.5rem; }
.empty-cart p { margin: 0 0 1.5rem; }

@media (max-width: 768px) { .cart-layout { grid-template-columns: 1fr; } }

</style>