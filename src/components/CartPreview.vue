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
.cart-preview {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.cart-header h4 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.3em;
  cursor: pointer;
  color: #999;
}

.btn-close:hover { color: #333; }

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error-box {
  background: #fee;
  border: 1px solid #f99;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
}

.cart-info {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.info-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
  background: #f9f9f9;
  border-radius: 6px;
  overflow: hidden;
}

.cart-table thead {
  background: #e8e8e8;
}

.cart-table th {
  padding: 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 0.85em;
}

.cart-table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  color: #555;
  font-size: 0.9em;
}

.img-col { width: 60px; }
.name-col { font-weight: 500; }
.ref-col { color: #888; font-size: 0.85em; }
.qty-col { text-align: center; }
.price-col { font-weight: 600; color: #4caf50; }

.product-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.cart-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  padding: 15px 10px 0;
  margin-top: 10px;
  border-top: 2px solid #e0e0e0;
  font-size: 1.1em;
}

.cart-total strong {
  color: #4caf50;
  font-size: 1.2em;
}

.empty-cart {
  text-align: center;
  padding: 30px;
  color: #999;
}
</style>