<template>
  <div class="checkout-page">
    <!-- Header -->
    <FrontHeader />

    <main class="checkout-main">
      <div class="container">
        <!-- Page Title -->
        <div class="page-header">
          <h1>Finaliser ma commande</h1>
        </div>

        <!-- Main Content -->
        <div class="checkout-grid">
          <!-- Left: Checkout Form -->
          <div class="checkout-form">
            <!-- Step 1: Address -->
            <section class="checkout-section">
              <div class="section-header">
                <span class="step-number">1</span>
                <h2>Adresse de livraison</h2>
              </div>

              <div v-if="loadingAddresses" class="loading-text">
                Vérification des adresses enregistrées...
              </div>

              <div v-else-if="hasSavedAddresses" class="radio-group">
                <label v-for="addr in addresses" :key="addr.id" class="radio-item">
                  <input v-model="selectedAddressId" :value="addr.id" type="radio" />
                  <div class="address-display">
                    <strong>{{ addr.alias || `${addr.firstname} ${addr.lastname}` }}</strong><br />
                    {{ addr.firstname }} {{ addr.lastname }}<br />
                    {{ addr.address1 }}
                    <span v-if="addr.address2"> {{ addr.address2 }}</span><br />
                    {{ addr.postcode }} {{ addr.city }}
                  </div>
                </label>
              </div>

              <div v-else class="address-form-grid">
                <div class="field-group">
                  <label>Alias</label>
                  <input v-model="addressForm.alias" type="text" placeholder="Maison, bureau..." />
                </div>
                <div class="field-group">
                  <label>Prénom</label>
                  <input v-model="addressForm.firstname" type="text" placeholder="Prénom" />
                </div>
                <div class="field-group">
                  <label>Nom</label>
                  <input v-model="addressForm.lastname" type="text" placeholder="Nom" />
                </div>
                <div class="field-group field-full">
                  <label>Adresse</label>
                  <input v-model="addressForm.address1" type="text" placeholder="Rue, quartier, numéro" />
                </div>
                <div class="field-group field-full">
                  <label>Complément</label>
                  <input v-model="addressForm.address2" type="text" placeholder="Appartement, étage..." />
                </div>
                <div class="field-group">
                  <label>Code postal</label>
                  <input v-model="addressForm.postcode" type="text" placeholder="101" />
                </div>
                <div class="field-group">
                  <label>Ville</label>
                  <input v-model="addressForm.city" type="text" placeholder="Antananarivo" />
                </div>
                <div class="field-group">
                  <label>Téléphone</label>
                  <input v-model="addressForm.phone" type="text" placeholder="+261..." />
                </div>
              </div>
            </section>

            <!-- Step 2: Carrier -->
            <section class="checkout-section">
              <div class="section-header">
                <span class="step-number">2</span>
                <h2> Mode de livraison</h2>
              </div>

              <div v-if="loadingCarriers" class="loading-text">
                Chargement des transporteurs...
              </div>
              <div v-else-if="carriers.length === 0" class="empty-text">
                Aucun transporteur disponible.
              </div>
              <div v-else class="radio-group">
                <label v-for="carrier in carriers" :key="carrier.id" class="radio-item">
                  <input v-model="selectedCarrierId" :value="carrier.id" type="radio" />
                  <div class="carrier-display">
                    <strong>{{ carrier.name }}</strong>
                    <span v-if="carrier.price" class="carrier-price">
                      ({{ formatPrice(carrier.price) }})
                    </span>
                    <p v-if="carrier.delay" class="carrier-delay">
                      {{ carrier.delay }}
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <!-- Step 3: Payment -->
            <section class="checkout-section">
              <div class="section-header">
                <span class="step-number">3</span>
                <h2> Mode de paiement</h2>
              </div>

              <div v-if="loadingPayments" class="loading-text">
                Chargement des modes de paiement...
              </div>
              <div v-else-if="payments.length === 0" class="empty-text">
                Aucun mode de paiement disponible.
              </div>
              <div v-else class="radio-group">
                <label v-for="payment in payments" :key="payment.id" class="radio-item">
                  <input v-model="selectedPaymentId" :value="payment.id" type="radio" />
                  <div class="payment-display">
                    <strong>{{ payment.name }}</strong>
                    <p v-if="payment.description" class="payment-description">
                      {{ payment.description }}
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <!-- Form Actions -->
            <div class="form-actions">
              <router-link to="/cart" class="btn btn-secondary">
                ← Retour au panier
              </router-link>
              <button
                @click="submitCheckout"
                :disabled="!isFormValid || isSubmitting"
                class="btn btn-primary"
              >
                <span v-if="isSubmitting" class="spinner-small"></span>
                {{ isSubmitting ? 'Création en cours...' : 'Créer la commande' }}
              </button>
            </div>
          </div>

          <!-- Right: Order Summary -->
          <aside class="order-summary">
            <div class="summary-card">
              <h3>Résumé de commande</h3>

              <!-- Items -->
              <div class="summary-items">
                <div
                  v-for="item in store.cart?.items || []"
                  :key="`${item.id_product}-${item.id_product_attribute}`"
                  class="summary-item"
                >
                  <div class="item-name">
                    {{ item.product_name || `Produit ${item.id_product}` }}
                    <span class="item-qty">x{{ item.quantity }}</span>
                  </div>
                  <div class="item-price">
                    {{ formatPrice((item.product_price ?? 0) * item.quantity) }}
                  </div>
                </div>
              </div>

              <!-- Totals -->
              <div class="summary-totals">
                <div class="total-row">
                  <span>Sous-total:</span>
                  <strong>{{ formatPrice(store.cart?.total_products ?? 0) }}</strong>
                </div>
                <div class="total-row">
                  <span>Livraison:</span>
                  <strong>{{ formatPrice(store.cart?.total_shipping ?? 0) }}</strong>
                </div>
                <div class="total-row grand-total">
                  <span>Total (TTC):</span>
                  <strong>{{ formatPrice(store.cart?.total ?? 0) }}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
          <button @click="errorMessage = ''" class="close-btn">✕</button>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="front-footer">
      <div class="container">
        <p>&copy; 2025 PrestaShop. Tous droits réservés.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../../stores/cart/cartStore';
import { frontOrderService } from '../../services/FrontorderService';
import FrontHeader from '../../components/FrontHeader.vue';

const router = useRouter();
const store = useCartStore();

// Form state
const selectedAddressId = ref('');
const selectedCarrierId = ref('');
const selectedPaymentId = ref('');
const addressForm = ref({
  alias: 'Adresse de livraison',
  firstname: '',
  lastname: '',
  address1: '',
  address2: '',
  postcode: '',
  city: '',
  phone: '',
});

// Loading states
const loadingAddresses = ref(false);
const loadingCarriers = ref(false);
const loadingPayments = ref(false);
const isSubmitting = ref(false);

// Data
const addresses = ref<any[]>([]);
const carriers = ref<any[]>([]);
const payments = ref<any[]>([]);
const errorMessage = ref('');

// Computed
const hasSavedAddresses = computed(() => addresses.value.length > 0);

const isFormValid = computed(
  () =>
    (
      (hasSavedAddresses.value && selectedAddressId.value) ||
      (!hasSavedAddresses.value &&
        addressForm.value.firstname.trim() &&
        addressForm.value.lastname.trim() &&
        addressForm.value.address1.trim() &&
        addressForm.value.city.trim() &&
        addressForm.value.postcode.trim())
    ) &&
    selectedCarrierId.value &&
    selectedPaymentId.value
);

// Lifecycle
onMounted(async () => {
  // Charger le panier
  const cartId = store.loadSavedCartId();
  if (cartId) {
    await store.fetchCart(cartId);
  } else if (!store.cart) {
    // Aucun panier, rediriger
    router.push('/products');
    return;
  }
  // Charger les données de checkout
  await loadCheckoutData();
});

// Methods
async function loadCheckoutData() {
  try {
    // Get customer ID from localStorage or use default
    const customerId = localStorage.getItem('customerId') || '1';

    // Load addresses
    loadingAddresses.value = true;
    addresses.value = await frontOrderService.fetchCustomerAddresses(customerId);
    if (addresses.value.length > 0) {
      selectedAddressId.value = addresses.value[0].id;
    } else {
      selectedAddressId.value = '';
    }
    loadingAddresses.value = false;

    // Load carriers
    loadingCarriers.value = true;
    carriers.value = await frontOrderService.fetchCarriers();
    if (carriers.value.length > 0) {
      selectedCarrierId.value = carriers.value[0].id;
    }
    loadingCarriers.value = false;

    // Load payments depuis l'API réelle
    loadingPayments.value = true;
    payments.value = await frontOrderService.fetchOrderPayments();
    if (payments.value.length > 0) {
      selectedPaymentId.value = payments.value[0].id;
    }
    loadingPayments.value = false;
  } catch (error: any) {
    errorMessage.value = `Erreur chargement: ${error.message}`;
  }
}

function formatPrice(price: number | string): string {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount);
}

async function submitCheckout() {
  try {
    // Validation
    if (!isFormValid.value) {
      errorMessage.value = 'Veuillez sélectionner une adresse, un transporteur et un mode de paiement.';
      return;
    }

    if (!store.cart || store.cart.items.length === 0) {
      errorMessage.value = 'Votre panier est vide!';
      return;
    }

    isSubmitting.value = true;
    errorMessage.value = '';

    const customerId = localStorage.getItem('customerId') || '1';

    const deliveryAddressId = hasSavedAddresses.value
      ? selectedAddressId.value
      : await frontOrderService.createCustomerAddress({
          id_customer: customerId,
          alias: addressForm.value.alias || 'Adresse de livraison',
          firstname: addressForm.value.firstname,
          lastname: addressForm.value.lastname,
          address1: addressForm.value.address1,
          address2: addressForm.value.address2,
          postcode: addressForm.value.postcode,
          city: addressForm.value.city,
          phone: addressForm.value.phone,
          id_country: '1',
        });

    // Create order using frontOrderService
    const orderId = await frontOrderService.createOrder({
      id_customer: customerId,
      id_cart: store.cartId || '',
      id_currency: store.cart.id_currency || '1',
      id_lang: store.cart.id_lang || '1',
      id_carrier: selectedCarrierId.value,
      id_address_delivery: deliveryAddressId,
      id_address_invoice: deliveryAddressId,
      payment: selectedPaymentId.value,
      module: 'prestashop',
      total_paid: String(store.cart.total),
      total_paid_tax_incl: String(store.cart.total),
      total_products: String(store.cart.total_products),
      total_shipping: String(store.cart.total_shipping),
      items: store.cart.items.map((item) => ({
        id_product: item.id_product,
        product_name: item.product_name || `Produit ${item.id_product}`,
        product_quantity: String(item.quantity),
        unit_price_tax_incl: String(item.product_price ?? 0),
        total_price_tax_incl: String((item.product_price ?? 0) * item.quantity),
      })),
    });

    console.log('✅ Commande créée:', orderId);

    // Clear cart and navigate to confirmation
    store.clearLocalCart();

    setTimeout(() => {
      router.push({
        name: 'confirmation',
        params: { orderId },
      }).catch(() => {
        // Fallback if confirmation route doesn't exist
        alert('Commande créée avec succès! N° ' + orderId);
        router.push('/products');
      });
    }, 1000);
  } catch (error: any) {
    console.error('❌ Erreur:', error);
    errorMessage.value = error.message || 'Erreur lors de la création de la commande';
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.checkout-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f9f9f9;
}

.checkout-main {
  flex: 1;
  padding: 40px 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-header h1 {
  font-size: 32px;
  color: #333;
  margin: 0;
}

/* Layout */
.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
  margin-bottom: 30px;
}

/* Form */
.checkout-form {
  background-color: white;
  border-radius: 4px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.checkout-section {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #eee;
}

.checkout-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 18px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.loading-text,
.empty-text {
  padding: 15px;
  color: #999;
  text-align: center;
}

/* Radio Group */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group label {
  font-size: 13px;
  font-weight: 600;
  color: #444;
}

.field-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.field-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.12);
}

.field-full {
  grid-column: 1 / -1;
}

.radio-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  border: 2px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-item:hover {
  background-color: #f9f9f9;
  border-color: #007bff;
}

.radio-item input[type='radio'] {
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.radio-item input[type='radio']:checked ~ div {
  font-weight: bold;
  color: #007bff;
}

.address-display,
.carrier-display,
.payment-display {
  flex: 1;
  line-height: 1.6;
  color: #333;
}

.carrier-delay,
.payment-description {
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #999;
}

.carrier-price {
  margin-left: 10px;
  color: #666;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.spinner-small {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Order Summary */
.order-summary {
  position: sticky;
  top: 20px;
  height: fit-content;
}

.summary-card {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.summary-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.summary-items {
  margin-bottom: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.summary-item:last-child {
  border-bottom: none;
}

.item-name {
  flex: 1;
  color: #666;
}

.item-qty {
  display: inline-block;
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

.item-price {
  text-align: right;
  color: #333;
  font-weight: 500;
}

.summary-totals {
  padding-top: 15px;
  border-top: 2px solid #eee;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.total-row span {
  color: #666;
}

.total-row strong {
  color: #333;
}

.total-row.grand-total {
  padding-top: 12px;
  font-size: 16px;
  font-weight: bold;
}

.total-row.grand-total span {
  color: #333;
}

.total-row.grand-total strong {
  color: #007bff;
}

/* Error Banner */
.error-banner {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
  padding: 0;
}

/* Footer */
.front-footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }

  .order-summary {
    position: static;
  }

  .checkout-form {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .section-header {
    flex-wrap: wrap;
  }

  .section-header h2 {
    flex: 1;
    min-width: 100%;
  }
}
</style>
