<template>
  <div class="checkout-page">
    <FrontHeader />

    <main class="checkout-main container">
      <div class="page-header">
        <h1>Finaliser ma commande</h1>
      </div>

      <div class="checkout-grid">
        <!-- Left: Checkout Forms Orchestration (Stepper) -->
        <div class="checkout-form">
          <AddressSelection 
            v-if="currentStep === 1"
            v-model="selectedAddressId"
            :addresses="addresses"
            :hasSavedAddresses="hasSavedAddresses"
            :loading="loadingAddresses"
            :form="addressForm"
            @next="currentStep = 2"
          />

          <CarrierSelection 
            v-else-if="currentStep === 2"
            v-model="selectedCarrierId"
            :carriers="carriers"
            :loading="loadingCarriers"
            @next="currentStep = 3"
            @back="currentStep = 1"
          />

          <PaymentSelection 
            v-else-if="currentStep === 3"
            v-model="selectedPaymentId"
            :payments="payments"
            :loading="loadingPayments"
            :isSubmitting="isSubmitting"
            @submit="submitCheckout"
            @back="currentStep = 2"
          />
        </div>

        <!-- Right: Order Summary using the new component -->
        <OrderSummary :cart="store.cart" />
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
        <button @click="errorMessage = ''" class="close-btn">✕</button>
      </div>
    </main>

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

// Import newly created checkout components
import AddressSelection from '../../components/checkout/AddressSelection.vue';
import CarrierSelection from '../../components/checkout/CarrierSelection.vue';
import PaymentSelection from '../../components/checkout/PaymentSelection.vue';
import OrderSummary from '../../components/checkout/OrderSummary.vue';

const router = useRouter();
const store = useCartStore();

// Stepper local state
const currentStep = ref(1);

// Choices local state
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
  phone_mobile: '',
});

// Loadings and Error State
const loadingAddresses = ref(false);
const loadingCarriers = ref(false);
const loadingPayments = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

// Computed Lists
const addresses = ref<any[]>([]);
const carriers = ref<any[]>([]);
const payments = ref<any[]>([]);
const hasSavedAddresses = computed(() => addresses.value.length > 0);

// Lifecycle
onMounted(async () => {
  const cartId = store.loadSavedCartId();
  if (cartId) {
    await store.fetchCart(cartId);
  } else if (!store.cart || store.cart.items.length === 0) {
    router.push('/cart');
    return;
  }
  await loadCheckoutData();
});

// Loading Methods
async function loadCheckoutData() {
  try {
    const customerId = localStorage.getItem('customerId') || '1';

    // 1. Addresses
    loadingAddresses.value = true;
    addresses.value = await frontOrderService.fetchCustomerAddresses(customerId);
    if (addresses.value.length > 0) {
      selectedAddressId.value = addresses.value[0].id;
    }
    loadingAddresses.value = false;

    // 2. Carriers
    loadingCarriers.value = true;
    carriers.value = await frontOrderService.fetchCarriers();
    if (carriers.value.length > 0) {
      selectedCarrierId.value = carriers.value[0].id;
    }
    loadingCarriers.value = false;

    // 3. Payments
    loadingPayments.value = true;
    payments.value = await frontOrderService.fetchOrderPayments();
    if (payments.value.length > 0) {
      selectedPaymentId.value = payments.value[0].id;
    }
    loadingPayments.value = false;

  } catch (error: any) {
    errorMessage.value = `Erreur de chargement: ${error.message}`;
  }
}

// Order Submission
async function submitCheckout() {
  if (!store.cart || store.cart.items.length === 0) {
    errorMessage.value = 'Votre panier est vide!';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const customerId = localStorage.getItem('customerId') || '1';

    // Si selectedAddressId est vide = l'utilisateur est en mode "formulaire nouvelle adresse"
    // (aucune adresse enregistrée OU il a cliqué "+ Nouvelle adresse")
    const usingForm = !selectedAddressId.value;

    const deliveryAddressId = usingForm
      ? await frontOrderService.createCustomerAddress({
          id_customer: customerId,
          alias: addressForm.value.alias || 'Adresse de livraison',
          firstname: addressForm.value.firstname,
          lastname: addressForm.value.lastname,
          address1: addressForm.value.address1,
          address2: addressForm.value.address2,
          postcode: addressForm.value.postcode,
          city: addressForm.value.city,
          phone: addressForm.value.phone,
          phone_mobile: addressForm.value.phone_mobile,
          id_country: '1',
        })
      : selectedAddressId.value;

    console.log('✅ Adresse sélectionnée/créée, ID:', deliveryAddressId);

    // Mettre à jour le panier AVANT de créer la commande pour que PrestaShop n'écrase pas les adresses avec des "0"
    if (store.cartId) {
      await store.updateCart({
        id_address_delivery: deliveryAddressId,
        id_address_invoice: deliveryAddressId,
        id_carrier: selectedCarrierId.value,
      });
      console.log('✅ Panier mis à jour avec les adresses et le transporteur');
    }

    const paymentMethod = payments.value.find(p => p.id === selectedPaymentId.value);

    const orderId = await frontOrderService.createOrder({
      id_customer: customerId,
      id_cart: store.cartId || '',
      id_currency: store.cart.id_currency || '1',
      id_lang: store.cart.id_lang || '1',
      id_carrier: selectedCarrierId.value,
      id_address_delivery: deliveryAddressId,
      id_address_invoice: deliveryAddressId,
      payment: paymentMethod ? paymentMethod.name : 'Paiement',
      module: selectedPaymentId.value,
      total_paid: String(store.cart.total),
      total_paid_tax_incl: String(store.cart.total),
      total_products: String(store.cart.total_products),
      total_shipping: String(store.cart.total_shipping),
        items: store.cart.items
          .filter(item => item.id_product && item.id_product !== 0 && item.id_product !== '0')
          .map((item) => ({
            id_product: String(item.id_product),
            product_name: item.product_name || `Produit ${item.id_product}`,
            product_quantity: String(item.quantity),
            unit_price_tax_incl: String(item.product_price ?? 0),
            total_price_tax_incl: String((item.product_price ?? 0) * item.quantity),
          })),
    });

    console.log('✅ Commande créée:', orderId);
    store.clearLocalCart();

    setTimeout(() => {
      router.push({
        name: 'confirmation',
        params: { orderId },
      }).catch(() => {
        router.push('/products');
      });
    }, 500);
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
.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
  margin-bottom: 30px;
}
.checkout-form {
  background-color: white;
  border-radius: 4px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.error-banner {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
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
.front-footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: auto;
}
@media (max-width: 768px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
