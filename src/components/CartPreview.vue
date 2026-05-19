<template>
  <div class="cart-preview">
    <div class="cart-header">
      <h4>🛒 Panier #{{ cart?.id || 'N/C' }}</h4>
      <button @click="emit('close')" class="btn-close">✕</button>
    </div>

    <div v-if="loading" class="loading">⏳ Chargement du panier...</div>
    
    <div v-else-if="error" class="error-box">❌ {{ error }}</div>
    
    <div v-else-if="cart && cart.products.length > 0" class="cart-content">
      <div class="cart-info">
        <span class="info-badge">Client ID: {{ cart.id_customer }}</span>
        <span class="info-badge">Date: {{ formatDate(cart.date_add) }}</span>
      </div>
      
      <table class="cart-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Produit</th>
            <th>Réf.</th>
            <th>Qté</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in cart.products" :key="product.id_product">
            <td class="img-col">
              <img 
                :src="product.image_url || '/placeholder-product.jpg'" 
                :alt="product.product_name"
                class="product-img"
                @error="handleImageError"
              />
            </td>
            <td class="name-col">{{ product.product_name }}</td>
            <td class="ref-col">{{ product.product_reference || '—' }}</td>
            <td class="qty-col">{{ product.quantity }}</td>
            <td class="price-col">{{ formatPrice(product.price) }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="cart-total">
        <span>Total panier:</span>
        <strong>{{ formatPrice(cart.total_products_wt) }}</strong>
      </div>
    </div>
    
    <div v-else class="empty-cart">
      📭 Aucun produit trouvé dans ce panier
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { orderService, type Cart } from '../../services/orderService';

const props = defineProps<{
  orderId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const cart = ref<Cart | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const loadCart = async () => {
  loading.value = true;
  error.value = null;
  try {
    cart.value = await orderService.fetchCartByOrderId(props.orderId);
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const formatPrice = (price: string) => {
  const num = parseFloat(price);
  if (isNaN(num)) return '0 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(num);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
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

.cart-preview { }
.preview-items { margin-bottom: 1rem; }
.preview-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid #1e1e35; }
.preview-item:last-child { border-bottom: none; }
.item-img { width: 44px; height: 44px; border-radius: 6px; background: #15152a; overflow: hidden; flex-shrink: 0; }
.item-img img { width: 100%; height: 100%; object-fit: cover; }
.item-info { flex: 1; }
.item-name { font-size: 0.8rem; font-weight: 600; color: #e8e8f5; margin: 0 0 0.15rem; }
.item-qty { font-size: 0.72rem; color: #5a5a85; }
.item-price { font-size: 0.875rem; font-weight: 700; color: #f59e0b; }
.preview-total { display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid #2a2a4a; font-weight: 700; }
.total-label { color: #8080b0; font-size: 0.875rem; }
.total-value { color: #f59e0b; font-size: 1rem; }
.preview-actions { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.btn-checkout { padding: 0.7rem; background: linear-gradient(135deg, #7c3aed, #a78bfa); border: none; border-radius: 7px; color: white; font-weight: 700; font-size: 0.875rem; cursor: pointer; text-decoration: none; text-align: center; display: block; transition: opacity 0.2s; }
.btn-checkout:hover { opacity: 0.88; }
.btn-cart { padding: 0.7rem; background: transparent; border: 1px solid #2a2a4a; border-radius: 7px; color: #8080b0; font-size: 0.875rem; cursor: pointer; text-decoration: none; text-align: center; display: block; transition: all 0.2s; }
.btn-cart:hover { border-color: rgba(167,139,250,0.3); color: #a78bfa; }
.empty-cart { text-align: center; padding: 2rem 1rem; color: #5a5a85; font-size: 0.875rem; }

</style>