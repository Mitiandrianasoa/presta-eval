<template>
  <div class="cart-page">
    <!-- Header -->
    <FrontHeader />

    <main class="cart-main">
      <div class="container">
        <!-- Page Title -->
        <div class="page-header">
          <h1>Mon Panier</h1>
        </div>

        <!-- Loading State -->
        <div v-if="store.loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement du panier...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="store.error" class="error-message">
          {{ store.error }}
          <button @click="store.error = null" class="close-btn">✕</button>
        </div>

        <!-- Empty Cart -->
        <div v-else-if="!store.cart || store.cart.items.length === 0" class="empty-cart">
          <div class="empty-icon">🛒</div>
          <h2>Votre panier est vide</h2>
          <p>Commencez vos achats et remplissez votre panier</p>
          <router-link to="/products" class="btn btn-primary">
            Continuer vos achats
          </router-link>
        </div>

        <!-- Cart Content -->
        <div v-else class="cart-content">
          <!-- Cart Items Table -->
          <div class="cart-table-wrapper">
            <table class="cart-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th class="text-center">Quantité</th>
                  <th class="text-right">Prix unitaire</th>
                  <th class="text-right">Total</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in store.cart.items" :key="getItemKey(item)" class="cart-item-row">
                  <!-- Product Info -->
                  <td class="product-info">
                    <div class="product-details">
                      <strong>{{ item.product_name || `Produit ${item.id_product}` }}</strong>
                      <small v-if="item.product_price" class="price-per-unit">
                        {{ formatPrice(item.product_price) }} / unité
                      </small>
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td class="quantity-cell">
                    <div class="quantity-control">
                      <button 
                        @click="decrementQty(item)" 
                        class="qty-btn"
                        :disabled="item.quantity <= 1"
                      >−</button>
                      <input
                        type="number"
                        :value="item.quantity"
                        @change="updateQty(item, $event)"
                        min="1"
                        max="999"
                        class="qty-input"
                      />
                      <button 
                        @click="incrementQty(item)" 
                        class="qty-btn"
                      >+</button>
                    </div>
                  </td>

                  <!-- Price -->
                  <td class="price-cell text-right">
                    {{ formatPrice(item.product_price ?? 0) }}
                  </td>

                  <!-- Subtotal -->
                  <td class="subtotal-cell text-right">
                    {{ formatPrice((item.product_price ?? 0) * item.quantity) }}
                  </td>

                  <!-- Remove -->
                  <td class="actions-cell text-center">
                    <button 
                      @click="removeItem(item)" 
                      class="btn-remove"
                      title="Supprimer du panier"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cart Summary -->
          <div class="cart-summary-wrapper">
            <div class="summary-box">
              <div class="summary-row">
                <span>Sous-total:</span>
                <strong>{{ formatPrice(store.cart.total_products) }}</strong>
              </div>
              <div class="summary-row">
                <span>Livraison:</span>
                <strong>{{ formatPrice(store.cart.total_shipping) }}</strong>
              </div>
              <div class="summary-row total">
                <span>Total:</span>
                <strong>{{ formatPrice(store.cart.total) }}</strong>
              </div>

              <!-- Action Buttons -->
              <div class="button-actions">
                <router-link to="/products" class="btn btn-secondary">
                  ← Continuer les achats
                </router-link>
                <button @click="clearCart" class="btn btn-light">
                  Vider le panier
                </button>
                <router-link to="/checkout" class="btn btn-primary">
                  Passer la commande →
                </router-link>
              </div>
            </div>
          </div>
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
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../../stores/cart/cartStore';
import FrontHeader from '../../components/FrontHeader.vue';

const router = useRouter();
const store = useCartStore();

// Cycle de vie
onMounted(async () => {
  // Charger le cart ID depuis localStorage
  const cartId = store.loadSavedCartId();
  if (cartId) {
    await store.fetchCart(cartId);
  }
});

// Méthodes
function getItemKey(item: any): string {
  return `${item.id_product}-${item.id_product_attribute}`;
}

function formatPrice(price: number | string): string {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount);
}

async function updateQty(item: any, event: Event) {
  const input = event.target as HTMLInputElement;
  const newQty = parseInt(input.value) || item.quantity;
  await store.updateItemQty(
    item.id_product,
    newQty,
    item.id_product_attribute
  );
}

async function incrementQty(item: any) {
  await store.updateItemQty(
    item.id_product,
    item.quantity + 1,
    item.id_product_attribute
  );
}

async function decrementQty(item: any) {
  if (item.quantity > 1) {
    await store.updateItemQty(
      item.id_product,
      item.quantity - 1,
      item.id_product_attribute
    );
  }
}

async function removeItem(item: any) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
    await store.removeItem(item.id_product, item.id_product_attribute);
  }
}

function clearCart() {
  if (confirm('Êtes-vous sûr de vouloir vider votre panier?')) {
    store.clearLocalCart();
  }
}
</script>

<style scoped>
.cart-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f9f9f9;
}

.cart-main {
  flex: 1;
  padding: 40px 20px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  font-size: 32px;
  color: #333;
  margin-bottom: 10px;
}

.page-header p {
  color: #666;
  font-size: 16px;
}

/* Loading State */
.loading {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  margin-top: 15px;
  color: #666;
}

/* Error State */
.error-message {
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
}

/* Empty Cart */
.empty-cart {
  text-align: center;
  padding: 80px 20px;
  background-color: white;
  border-radius: 4px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-cart h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 10px;
}

.empty-cart p {
  color: #666;
  margin-bottom: 30px;
}

/* Cart Content */
.cart-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
}

/* Cart Table */
.cart-table-wrapper {
  background-color: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
}

.cart-table thead {
  background-color: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.cart-table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.cart-table tbody tr {
  border-bottom: 1px solid #eee;
}

.cart-table tbody tr:hover {
  background-color: #fafafa;
}

.cart-table td {
  padding: 15px;
  vertical-align: middle;
}

.product-info {
  text-align: left;
}

.product-details strong {
  display: block;
  color: #333;
  margin-bottom: 5px;
}

.price-per-unit {
  color: #999;
  font-size: 12px;
}

/* Quantity Control */
.quantity-cell {
  text-align: center;
}

.quantity-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.qty-btn:hover:not(:disabled) {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qty-input {
  width: 50px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 6px;
  font-size: 14px;
}

/* Price Cells */
.price-cell,
.subtotal-cell {
  font-weight: 500;
  color: #333;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

/* Actions */
.actions-cell {
  text-align: center;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.btn-remove:hover {
  background-color: #ffe0e0;
}

/* Cart Summary */
.cart-summary-wrapper {
  position: sticky;
  top: 20px;
  height: fit-content;
}

.summary-box {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.summary-row.total {
  border-bottom: none;
  padding-top: 15px;
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
}

.summary-row span {
  color: #666;
}

.summary-row strong {
  color: #333;
}

.summary-row.total strong {
  color: #007bff;
}

/* Buttons */
.button-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-light {
  background-color: #e9ecef;
  color: #333;
}

.btn-light:hover {
  background-color: #dee2e6;
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
  .cart-content {
    grid-template-columns: 1fr;
  }

  .cart-summary-wrapper {
    position: static;
  }

  .cart-table {
    font-size: 12px;
  }

  .cart-table td,
  .cart-table th {
    padding: 10px;
  }

  .quantity-control {
    gap: 4px;
  }

  .qty-btn {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .qty-input {
    width: 40px;
  }
}
</style>