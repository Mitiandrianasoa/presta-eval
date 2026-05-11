<template>
  <div class="confirmation-page">
    <!-- Header -->
    <FrontHeader />

    <main class="confirmation-main">
      <div class="container">
        <!-- Loading State -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement de votre commande...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-message">
          <h2>Erreur</h2>
          <p>{{ error }}</p>
          <router-link to="/products" class="btn btn-primary">
            Retour aux produits
          </router-link>
        </div>

        <!-- Success State -->
        <div v-else-if="order" class="success-content">
          <!-- Success Icon -->
          <div class="success-icon">✓</div>

          <!-- Message -->
          <h1>Commande confirmée!</h1>
          <p class="message">
            Merci pour votre achat. Votre commande a été créée avec succès.
          </p>

          <!-- Order Details -->
          <div class="order-details-card">
            <h2>Détails de la commande</h2>

            <div class="detail-row">
              <span class="label">Numéro de commande:</span>
              <strong class="value">{{ order.reference }}</strong>
            </div>

            <div class="detail-row">
              <span class="label">ID commande:</span>
              <strong class="value">{{ order.id }}</strong>
            </div>

            <div class="detail-row">
              <span class="label">Date:</span>
              <strong class="value">{{ formatDate(order.date_add) }}</strong>
            </div>

            <div class="detail-row">
              <span class="label">Statut:</span>
              <strong class="value status">{{ getStatusLabel(order.current_state) }}</strong>
            </div>

            <!-- Items -->
            <div class="items-section">
              <h3>Articles commandés</h3>
              <div v-for="item in order.items" :key="`${item.id_product}-${item.product_name}`" class="item-row">
                <div class="item-info">
                  <strong>{{ item.product_name }}</strong>
                  <span class="item-qty">x{{ item.product_quantity }}</span>
                </div>
                <div class="item-price">
                  {{ formatPrice(item.total_price_tax_incl) }}
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="totals-section">
              <div class="total-row">
                <span>Sous-total:</span>
                <strong>{{ formatPrice(order.total_paid_tax_incl) }}</strong>
              </div>
              <div class="total-row">
                <span>Livraison:</span>
                <strong>{{ formatPrice(order.total_shipping) }}</strong>
              </div>
              <div class="total-row grand-total">
                <span>Total (TTC):</span>
                <strong>{{ formatPrice(order.total_paid_tax_incl) }}</strong>
              </div>
            </div>
          </div>

          <!-- What's Next -->
          <div class="what-next-card">
            <h2>Prochaines étapes</h2>
            <ul>
              <li>✓ Votre commande est confirmée</li>
              <li>📧 Un email de confirmation a été envoyé</li>
              <li>📦 Nous préparons votre colis</li>
              <li>🚚 Vous recevrez un numéro de suivi bientôt</li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <router-link to="/orders" class="btn btn-primary">
              Voir mes commandes
            </router-link>
            <router-link to="/products" class="btn btn-secondary">
              Continuer les achats
            </router-link>
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
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { frontOrderService } from '../../services/FrontorderService';
import FrontHeader from '../../components/FrontHeader.vue';

const route = useRoute();

const order = ref<any>(null);
const loading = ref(false);
const error = ref('');

// Lifecycle
onMounted(async () => {
  const orderId = route.params.orderId as string;

  if (!orderId) {
    error.value = 'Aucun numéro de commande fourni';
    return;
  }

  loading.value = true;
  try {
    const fetchedOrder = await frontOrderService.fetchOrder(orderId);
    if (fetchedOrder) {
      order.value = fetchedOrder;
    } else {
      error.value = 'Commande non trouvée';
    }
  } catch (err: any) {
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
});

// Methods
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-MG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatPrice(price: string | number): string {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount);
}

function getStatusLabel(stateId: string): string {
  const statusMap: Record<string, string> = {
    '1': 'En attente de paiement',
    '2': 'Paiement accepté',
    '3': 'En cours de préparation',
    '4': 'Expédiée',
    '5': 'Livrée',
    '6': 'Annulée',
    '7': 'Remboursée',
    '8': 'Erreur de paiement',
    '12': 'En attente de paiement (virement)',
  };
  return statusMap[stateId] || `État ${stateId}`;
}
</script>

<style scoped>
.confirmation-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #f9f9f9 100%);
}

.confirmation-main {
  flex: 1;
  padding: 40px 20px;
}

.container {
  max-width: 700px;
  margin: 0 auto;
}

/* Loading State */
.loading {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  display: inline-block;
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  margin-top: 20px;
  color: #666;
  font-size: 16px;
}

/* Error State */
.error-message {
  background-color: #f8d7da;
  border: 2px solid #f5c6cb;
  color: #721c24;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
}

.error-message h2 {
  margin-top: 0;
  font-size: 24px;
}

.error-message p {
  margin-bottom: 30px;
}

/* Success Content */
.success-content {
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 30px;
  background-color: #28a745;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

h1 {
  text-align: center;
  font-size: 32px;
  color: #333;
  margin: 0 0 15px 0;
}

.message {
  text-align: center;
  color: #666;
  font-size: 16px;
  margin-bottom: 40px;
}

/* Cards */
.order-details-card,
.what-next-card {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.order-details-card h2,
.what-next-card h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 15px;
  border-bottom: 2px solid #007bff;
}

/* Detail Rows */
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: #666;
}

.detail-row .value {
  color: #333;
  text-align: right;
}

.status {
  display: inline-block;
  background-color: #e7f3ff;
  color: #007bff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Items Section */
.items-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.items-section h3 {
  font-size: 14px;
  color: #333;
  margin: 0 0 15px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 14px;
  border-bottom: 1px solid #eee;
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  flex: 1;
}

.item-info strong {
  display: block;
  color: #333;
  margin-bottom: 3px;
}

.item-qty {
  display: inline-block;
  color: #999;
  font-size: 12px;
}

.item-price {
  text-align: right;
  color: #333;
  font-weight: 600;
  min-width: 100px;
}

/* Totals Section */
.totals-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
}

.total-row span {
  color: #666;
}

.total-row strong {
  color: #333;
}

.total-row.grand-total {
  padding-top: 15px;
  font-size: 16px;
  font-weight: bold;
}

.total-row.grand-total span {
  color: #333;
}

.total-row.grand-total strong {
  color: #28a745;
}

/* What's Next */
.what-next-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.what-next-card li {
  padding: 12px 0;
  color: #666;
  font-size: 14px;
  border-bottom: 1px solid #eee;
}

.what-next-card li:last-child {
  border-bottom: none;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 40px;
}

.btn {
  padding: 14px 32px;
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
  background-color: #28a745;
  color: white;
}

.btn-primary:hover {
  background-color: #218838;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
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
@media (max-width: 600px) {
  .confirmation-main {
    padding: 20px 10px;
  }

  .order-details-card,
  .what-next-card {
    padding: 20px;
    margin-bottom: 15px;
  }

  h1 {
    font-size: 24px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row .value {
    text-align: left;
    margin-top: 5px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
