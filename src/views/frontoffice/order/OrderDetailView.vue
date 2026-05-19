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

.order-detail-page { background: #07070e; min-height: 100vh; color: #e8e8f5; padding-bottom: 4rem; }
.breadcrumb { padding: 1.25rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #5a5a85; }
.breadcrumb a { color: #5a5a85; text-decoration: none; }
.breadcrumb a:hover { color: #a78bfa; }

.detail-header { padding: 1rem 0 2rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.order-title { font-size: 1.4rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.25rem; }
.order-meta { font-size: 0.8rem; color: #5a5a85; }
.status-badge { padding: 0.35rem 0.9rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
.status-delivered { background: rgba(52,211,153,0.12); color: #34d399; }
.status-shipped { background: rgba(56,139,253,0.12); color: #388bfd; }
.status-processing { background: rgba(210,153,34,0.12); color: #d29922; }
.status-cancelled { background: rgba(248,113,113,0.12); color: #f87171; }

.detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; }

.card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem; }
.card h3 { font-size: 0.875rem; font-weight: 700; color: #e8e8f5; margin: 0 0 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #1e1e35; }

.order-items-table { width: 100%; border-collapse: collapse; }
.order-items-table th { font-size: 0.72rem; color: #5a5a85; text-transform: uppercase; letter-spacing: 0.06em; padding: 0 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #1e1e35; }
.order-items-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #0e0e1a; font-size: 0.875rem; color: #e8e8f5; vertical-align: middle; }
.item-thumb { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; background: #15152a; }
.item-name-cell { font-weight: 600; }
.item-ref-cell { font-size: 0.75rem; color: #5a5a85; }
.price-cell { color: #f59e0b; font-weight: 600; }

.address-block p { font-size: 0.875rem; color: #8080b0; margin: 0.3rem 0; line-height: 1.6; }
.address-block strong { color: #e8e8f5; }

.summary-row { display: flex; justify-content: space-between; font-size: 0.875rem; padding: 0.4rem 0; }
.summary-row .label { color: #8080b0; }
.summary-row .val { color: #e8e8f5; }
.summary-row.total { font-weight: 700; border-top: 1px solid #1e1e35; margin-top: 0.5rem; padding-top: 0.75rem; }
.summary-row.total .val { color: #f59e0b; font-size: 1.05rem; }

.loading-state, .error-state { text-align: center; padding: 5rem 2rem; color: #5a5a85; }
.spinner { width: 36px; height: 36px; border: 2px solid #1e1e35; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }

</style>