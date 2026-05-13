<template>
  <div class="order-detail-page">
    <FrontHeader />
    
    <main class="order-detail-main">
      <div class="container">
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <router-link to="/">Accueil</router-link>
          <span class="separator">/</span>
          <router-link to="/orders">Mes commandes</router-link>
          <span class="separator">/</span>
          <span class="current">Commande #{{ orderId }}</span>
        </nav>

        <!-- Loading -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement de la commande...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error-message">
          <div class="error-content">
            <h3>Erreur</h3>
            <p>{{ error }}</p>
            <router-link to="/orders" class="back-link">
              ← Retour aux commandes
            </router-link>
          </div>
        </div>

        <!-- Détail commande -->
        <div v-else-if="order" class="order-content">
          <!-- En-tête commande -->
          <div class="order-header-card">
            <div class="header-top">
              <div>
                <h1>Commande #{{ order.id }}</h1>
                <p class="order-ref">Référence : {{ order.reference || 'N/C' }}</p>
              </div>
              <span class="order-status" :class="getStatusClass(order.current_state)">
                {{ getStatusLabel(order.current_state) }}
              </span>
            </div>
            
            <div class="header-info">
              <div class="info-item">
                <span class="info-label">Date de commande</span>
                <span class="info-value">{{ formatDate(order.date_add) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Paiement</span>
                <span class="info-value">{{ order.payment }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Transporteur</span>
                <span class="info-value">{{ carrierName }}</span>
              </div>
            </div>
          </div>

          <div class="order-grid">
            <!-- Colonne gauche : Produits -->
            <div class="order-products-section">
              <h2> Articles commandés</h2>
              
              <div class="products-list">
                <div 
                  v-for="(product, index) in orderProducts" 
                  :key="index"
                  class="product-item"
                >
                  <div class="product-image">
                    <img 
                      :src="product.image_url || '/placeholder-product.jpg'" 
                      :alt="product.product_name"
                      @error="handleImageError"
                    />
                  </div>
                  <div class="product-details">
                    <router-link 
                      :to="`/product/${product.product_id}`" 
                      class="product-name"
                    >
                      {{ product.product_name }}
                    </router-link>
                    <span class="product-ref" v-if="product.product_reference">
                      Réf : {{ product.product_reference }}
                    </span>
                    <span class="product-price-unit">
                      Prix unitaire : {{ formatPrice(product.unit_price_tax_incl || product.product_price) }}
                    </span>
                  </div>
                  <div class="product-quantity">
                    <span class="qty-label">Qté</span>
                    <span class="qty-value">{{ product.product_quantity }}</span>
                  </div>
                  <div class="product-total">
                    <span class="total-label">Total</span>
                    <span class="total-value">
                      {{ formatPrice(calculateProductTotal(product)) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Si pas de produits -->
              <div v-if="orderProducts.length === 0" class="no-products">
                <p>Aucun produit trouvé pour cette commande.</p>
              </div>
            </div>

            <!-- Colonne droite : Résumé -->
            <div class="order-summary-section">
              <div class="summary-card">
                <h2> Récapitulatif</h2>
                
                <div class="summary-row">
                  <span>Sous-total</span>
                  <span>{{ formatPrice(order.total_products_wt || order.total_products || '0') }}</span>
                </div>
                <div class="summary-row">
                  <span>Livraison</span>
                  <span :class="{ 'free-shipping': isFreeShipping }">
                    {{ isFreeShipping ? 'Gratuite' : formatPrice(order.total_shipping || '0') }}
                  </span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span class="total-price">{{ formatPrice(order.total_paid || '0') }}</span>
                </div>
              </div>

              <!-- Adresse de livraison -->
              <div class="address-card" v-if="deliveryAddress">
                <h3>📍 Adresse de livraison</h3>
                <div class="address-content">
                  <p class="address-name">{{ deliveryAddress.firstname }} {{ deliveryAddress.lastname }}</p>
                  <p>{{ deliveryAddress.address1 }}</p>
                  <p v-if="deliveryAddress.address2">{{ deliveryAddress.address2 }}</p>
                  <p>{{ deliveryAddress.postcode }} {{ deliveryAddress.city }}</p>
                  <p v-if="deliveryAddress.phone">📞 {{ deliveryAddress.phone }}</p>
                </div>
              </div>

              <!-- Adresse de facturation -->
              <div class="address-card" v-if="invoiceAddress">
                <h3>Adresse de facturation</h3>
                <div class="address-content">
                  <p class="address-name">{{ invoiceAddress.firstname }} {{ invoiceAddress.lastname }}</p>
                  <p>{{ invoiceAddress.address1 }}</p>
                  <p v-if="invoiceAddress.address2">{{ invoiceAddress.address2 }}</p>
                  <p>{{ invoiceAddress.postcode }} {{ invoiceAddress.city }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="order-actions">
            <router-link to="/orders" class="back-btn">
              ← Retour aux commandes
            </router-link>
            <router-link to="/products" class="shop-btn">
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import FrontHeader from '../../../components/FrontHeader.vue';
import api from '../../../api/api';

const route = useRoute();
const orderId = route.params.id as string;

const order = ref<any>(null);
const orderProducts = ref<any[]>([]);
const deliveryAddress = ref<any>(null);
const invoiceAddress = ref<any>(null);
const carrierName = ref('Transporteur standard');
const loading = ref(false);
const error = ref('');

// Livraison gratuite ?
const isFreeShipping = computed(() => {
  const shipping = order.value?.total_shipping;
  return !shipping || shipping === '0' || shipping === '0.000000';
});

// Charger le détail de la commande
const loadOrderDetail = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.log(`📋 Chargement de la commande #${orderId}`);
    const parser = new DOMParser();
    
    // 1. Récupérer la commande
    const orderResponse = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
    const orderDoc = parser.parseFromString(orderResponse.data, 'text/xml');
    const orderEl = orderDoc.querySelector('order');
    
    if (!orderEl) {
      error.value = 'Commande introuvable';
      loading.value = false;
      return;
    }
    
    order.value = {
      id: orderEl.querySelector('id')?.textContent?.trim() || '',
      reference: orderEl.querySelector('reference')?.textContent?.trim() || '',
      total_paid: orderEl.querySelector('total_paid')?.textContent?.trim() || '0',
      total_products: orderEl.querySelector('total_products')?.textContent?.trim() || '0',
      total_products_wt: orderEl.querySelector('total_products_wt')?.textContent?.trim() || '0',
      total_shipping: orderEl.querySelector('total_shipping')?.textContent?.trim() || '0',
      payment: orderEl.querySelector('payment')?.textContent?.trim() || 'N/C',
      current_state: orderEl.querySelector('current_state')?.textContent?.trim() || '1',
      date_add: orderEl.querySelector('date_add')?.textContent?.trim() || '',
      id_address_delivery: orderEl.querySelector('id_address_delivery')?.textContent?.trim() || '',
      id_address_invoice: orderEl.querySelector('id_address_invoice')?.textContent?.trim() || '',
      id_carrier: orderEl.querySelector('id_carrier')?.textContent?.trim() || '',
    };
    
    // 2. Récupérer les produits
    const orderRows = orderEl.querySelectorAll('associations order_rows order_row');
    orderProducts.value = Array.from(orderRows).map(row => {
      const productId = row.querySelector('product_id')?.textContent?.trim() || '';
      return {
        product_id: productId,
        product_name: row.querySelector('product_name')?.textContent?.trim() || 'Produit',
        product_reference: row.querySelector('product_reference')?.textContent?.trim() || '',
        product_price: row.querySelector('product_price')?.textContent?.trim() || '0',
        product_quantity: row.querySelector('product_quantity')?.textContent?.trim() || '0',
        unit_price_tax_incl: row.querySelector('unit_price_tax_incl')?.textContent?.trim() || '',
        image_url: productId ? `/api/images/products/${productId}/${productId}` : null,
      };
    });
    
    // 3. Récupérer les adresses
    await Promise.all([
      loadAddress(order.value.id_address_delivery, 'delivery'),
      loadAddress(order.value.id_address_invoice, 'invoice'),
      loadCarrier(order.value.id_carrier),
    ]);
    
    console.log('✅ Commande chargée avec succès');
    
  } catch (err: any) {
    console.error('❌ Erreur:', err);
    error.value = 'Impossible de charger les détails de la commande';
  } finally {
    loading.value = false;
  }
};

// Charger une adresse
const loadAddress = async (addressId: string, type: 'delivery' | 'invoice') => {
  if (!addressId || addressId === '0') return;
  
  try {
    const parser = new DOMParser();
    const response = await api.get(`/addresses/${addressId}?output_format=XML`);
    const doc = parser.parseFromString(response.data, 'text/xml');
    
    const address = {
      firstname: doc.querySelector('address firstname')?.textContent?.trim() || '',
      lastname: doc.querySelector('address lastname')?.textContent?.trim() || '',
      address1: doc.querySelector('address address1')?.textContent?.trim() || '',
      address2: doc.querySelector('address address2')?.textContent?.trim() || '',
      city: doc.querySelector('address city')?.textContent?.trim() || '',
      postcode: doc.querySelector('address postcode')?.textContent?.trim() || '',
      phone: doc.querySelector('address phone')?.textContent?.trim() || '',
    };
    
    if (type === 'delivery') {
      deliveryAddress.value = address;
    } else if (addressId !== order.value?.id_address_delivery) {
      invoiceAddress.value = address;
    }
  } catch (err) {
    console.warn(`⚠️ Adresse ${type} introuvable`);
  }
};

// Charger le transporteur
const loadCarrier = async (carrierId: string) => {
  if (!carrierId || carrierId === '0') return;
  
  try {
    const parser = new DOMParser();
    const response = await api.get(`/carriers/${carrierId}?output_format=XML`);
    const doc = parser.parseFromString(response.data, 'text/xml');
    carrierName.value = doc.querySelector('carrier name')?.textContent?.trim() || 'Transporteur standard';
  } catch (err) {
    console.warn('⚠️ Transporteur introuvable');
  }
};

// Calculer le total d'un produit
const calculateProductTotal = (product: any): string => {
  const price = parseFloat(product.unit_price_tax_incl || product.product_price || '0');
  const qty = parseInt(product.product_quantity || '0');
  return (price * qty).toFixed(6);
};

// Gestion erreur image
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-product.jpg';
};

// Statuts
const getStatusLabel = (stateId: string): string => {
  const statuses: Record<string, string> = {
    '1': 'En attente',
    '2': 'En préparation',
    '3': 'Prête',
    '4': 'Expédiée',
    '5': 'Livrée',
    '6': 'Annulée',
    '7': 'Remboursée',
    '8': 'Erreur paiement',
    '13': 'En attente',
  };
  return statuses[stateId] || `Statut ${stateId}`;
};

const getStatusClass = (stateId: string): string => {
  const classes: Record<string, string> = {
    '1': 'status-pending',
    '2': 'status-processing',
    '3': 'status-ready',
    '4': 'status-shipped',
    '5': 'status-delivered',
    '6': 'status-cancelled',
    '7': 'status-refunded',
    '8': 'status-error',
    '13': 'status-pending',
  };
  return classes[stateId] || 'status-default';
};

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '0 MGA';
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(numPrice);
};

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return 'Date inconnue';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Date invalide';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

onMounted(() => {
  loadOrderDetail();
});
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: var(--bg);
}

.order-detail-main {
  padding: 2rem 0 5rem;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.breadcrumb a {
  color: var(--primary);
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.separator {
  color: var(--muted);
}

.current {
  color: var(--text);
  font-weight: 500;
}

/* Loading */
.loading {
  text-align: center;
  padding: 4rem;
  color: var(--muted);
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
  text-align: center;
  padding: 4rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
}

.error-content h3 {
  color: var(--error);
  margin-bottom: 0.5rem;
}

.back-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

/* Order Header */
.order-header-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-top h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 0.25rem;
}

.order-ref {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

/* Statuts */
.order-status {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending { background: #fef9c3; color: #a16207; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-ready { background: #e0e7ff; color: #3730a3; }
.status-shipped { background: #f3e8ff; color: #6b21a8; }
.status-delivered { background: #dcfce7; color: #15803d; }
.status-cancelled { background: #fee2e2; color: #dc2626; }
.status-refunded { background: #ffe4e6; color: #be123c; }
.status-error { background: #fee2e2; color: #b91c1c; }
.status-default { background: #f1f5f9; color: #475569; }

.header-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-weight: 600;
  color: var(--text);
}

/* Order Grid */
.order-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
  margin-bottom: 2rem;
}

/* Products Section */
.order-products-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.order-products-section h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 1.5rem;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.product-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.product-image {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.product-name {
  font-weight: 600;
  color: var(--navy);
  text-decoration: none;
  font-size: 0.95rem;
}

.product-name:hover {
  color: var(--primary);
}

.product-ref {
  font-size: 0.8rem;
  color: var(--muted);
}

.product-price-unit {
  font-size: 0.85rem;
  color: var(--text);
}

.product-quantity,
.product-total {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.qty-label,
.total-label {
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
}

.qty-value {
  font-weight: 600;
  color: var(--text);
  font-size: 1rem;
}

.total-value {
  font-weight: 700;
  color: var(--success);
  font-size: 1rem;
}

.no-products {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

/* Summary Section */
.order-summary-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.summary-card h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.95rem;
  color: var(--text);
}

.summary-row.total {
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--navy);
}

.total-price {
  color: var(--success);
}

.summary-divider {
  height: 1px;
  background: var(--border);
  margin: 0.5rem 0;
}

.free-shipping {
  color: var(--success);
  font-weight: 600;
}

/* Address Card */
.address-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}

.address-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--navy);
  margin: 0 0 0.75rem;
}

.address-content p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--text);
}

.address-name {
  font-weight: 600;
}

/* Actions */
.order-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
}

.back-btn,
.shop-btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.back-btn {
  background: var(--surface);
  color: var(--text);
  border: 1.5px solid var(--border);
}

.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.shop-btn {
  background: var(--primary);
  color: white;
}

.shop-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

/* Responsive */
@media (max-width: 768px) {
  .order-grid {
    grid-template-columns: 1fr;
  }
  
  .header-info {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .product-item {
    flex-wrap: wrap;
  }
  
  .product-quantity,
  .product-total {
    flex-direction: row;
    gap: 0.5rem;
  }
}
</style>