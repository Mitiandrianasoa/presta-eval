<template>
  <div class="dashboard-layout">
    <Sidebar />
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="header-text">
          <h1>Dashboard</h1>
          <p>Vue d'ensemble des commandes</p>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Chargement des données...</p>
      </div>

      <div v-else-if="error" class="error-message">
        <h3>Erreur</h3>
        <p>{{ error }}</p>
        <button @click="loadOrders" class="retry-btn">Réessayer</button>
      </div>

      <div v-else class="dashboard-content">

        <div class="filter-section">
          <div class="filter-card">
            <div class="filter-header">
              <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M12 14v4M9 17h6"/>
              </svg>
              <span class="filter-title">Filtrer par période</span>
            </div>
            <div class="filter-controls">
              <div class="date-input-group">
                <label>Date de début</label>
                <input 
                  type="date" 
                  v-model="dateDebut" 
                  class="date-input"
                />
              </div>
              <div class="date-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <div class="date-input-group">
                <label>Date de fin</label>
                <input 
                  type="date" 
                  v-model="dateFin" 
                  class="date-input"
                />
              </div>
              <button @click="resetFilter" class="reset-btn" v-if="hasActiveFilter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 6h6m-6 4h6"/>
                </svg>
                Réinitialiser
              </button>
            </div>
            <div class="filter-stats" v-if="hasActiveFilter">
              <span class="filter-badge">
                Période: {{ formatDateRange(dateDebut, dateFin) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- SUMMARY CARDS -->
        <div class="summary-row">
          <div class="summary-card accent-blue">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">CA Total TTC</span>
              <span class="summary-value">{{ formatCurrency(totalTTC) }}</span>
            </div>
          </div>

          <div class="summary-card accent-indigo">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">CA Total HT</span>
              <span class="summary-value">{{ formatCurrency(totalHT) }}</span>
            </div>
          </div>

          <div class="summary-card accent-amber">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">Prix d'Achat Total</span>
              <span class="summary-value">{{ formatCurrency(totalAchat) }}</span>
            </div>
          </div>

          <div class="summary-card" :class="benefice >= 0 ? 'accent-green' : 'accent-red'">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">Bénéfice Net</span>
              <span class="summary-value">{{ formatCurrency(benefice) }}</span>
              <span class="summary-sub" :class="margePourcentage >= 0 ? 'text-green' : 'text-red'">
                {{ margePourcentage >= 0 ? '+' : '' }}{{ margePourcentage.toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- STATS RAPIDES -->
        <div class="stats-mini-row">
          <div class="stat-mini">
            <span class="stat-mini-value">{{ totalOrders }}</span>
            <span class="stat-mini-label">Commandes Valides</span>
          </div>
          <div class="stat-mini stat-mini-cancelled">
            <span class="stat-mini-value cancelled">{{ totalCancelledOrders }}</span>
            <span class="stat-mini-label">Commandes Annulées</span>
          </div>
          <!-- <div class="stat-mini">
            <span class="stat-mini-value">{{ formatCurrency(tvaTotale) }}</span>
            <span class="stat-mini-label">TVA Collectée</span>
          </div> -->
          <div class="stat-mini">
            <span class="stat-mini-value">{{ totalProduitsVendus }}</span>
            <span class="stat-mini-label">Produits Vendus</span>
          </div>
          <!-- <div class="stat-mini">
            <span class="stat-mini-value">{{ formatCurrency(panierMoyen) }}</span>
            <span class="stat-mini-label">Panier Moyen TTC</span>
          </div> -->
        </div>

        <!-- TABLEAU DÉTAILLÉ DES COMMANDES -->
        <div class="orders-section">
          <div class="section-header">
            <h2>Détail des commandes</h2>
            <span class="section-badge">{{ totalOrders }} commandes</span>
          </div>

          <div class="orders-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Produits</th>
                  <th class="right">CA HT</th>
                  <th class="right">CA TTC</th>
                  <th class="right">Prix Achat</th>
                  <th class="right">Bénéfice</th>
                  <th class="right">Marge</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in ordersFiltered" :key="order.id">
                  <td class="order-id-cell">#{{ order.id }}</td>
                  <td class="date-cell">{{ formatDate(order.date) }}</td>
                  <td class="customer-id-cell">{{ order.customer_id }}</td>
                  <td class="products-cell">
                    <span class="product-count-badge">{{ order.products.length }} produit(s)</span>
                  </td>
                  <td class="right amount-cell">{{ formatCurrency(order.totalHT) }}</td>
                  <td class="right amount-cell ttc">{{ formatCurrency(order.totalTTC) }}</td>
                  <td class="right amount-cell achat">{{ formatCurrency(order.totalAchat) }}</td> 
                   <td class="right amount-cell" :class="order.benefice >= 0 ? 'benefice-positif' : 'benefice-negatif'">
                    {{ formatCurrency(order.benefice) }}
                  </td> 
                   <td class="right">
                    <span class="marge-badge" :class="order.marge >= 0 ? 'marge-positive' : 'marge-negative'">
                      {{ order.marge >= 0 ? '+' : '' }}{{ order.marge.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
                <tr v-if="ordersFiltered.length === 0">
                  <td colspan="9" class="empty-state">
                    <div class="empty-message">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p>Aucune commande trouvée pour cette période</p>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="ordersFiltered.length > 0">
                <tr class="total-row">
                  <td colspan="4"><strong>TOTAL</strong></td>
                  <td class="right amount-cell"><strong>{{ formatCurrency(totalHT) }}</strong></td>
                  <td class="right amount-cell ttc"><strong>{{ formatCurrency(totalTTC) }}</strong></td>
                  <td class="right amount-cell achat"><strong>{{ formatCurrency(totalAchat) }}</strong></td>
                 <td class="right amount-cell" :class="benefice >= 0 ? 'benefice-positif' : 'benefice-negatif'">
                    <strong>{{ formatCurrency(benefice) }}</strong>
                  </td>
                  <td class="right">
                    <span class="marge-badge total" :class="margePourcentage >= 0 ? 'marge-positive' : 'marge-negative'">
                      {{ margePourcentage >= 0 ? '+' : '' }}{{ margePourcentage.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';
import Sidebar from '../../../components/Sidebar.vue';

const router = useRouter();

// Types
interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  customer_id: string;
  totalHT: number;
  totalTTC: number;
  totalAchat: number;
  benefice: number;
  marge: number;
  products: OrderProduct[];
  order_state?: string;
  isCancelled?: boolean;
}

// État
const loading = ref(false);
const error = ref('');
const dateDebut = ref('');
const dateFin = ref('');
const orders = ref<Order[]>([]);
const currentTab = ref('orders');
// const cacheProduits = ref<Record<string, { price: number; wholesale_price: number }>>({});
const cacheProduits = ref<Record<string, { price: number; wholesale_price: number, category_id: string }>>({});
const cacheCategories = ref<Record<string, string>>({});


// Computed
const hasActiveFilter = computed(() => !!(dateDebut.value || dateFin.value));

const ordersFiltered = computed(() => {
  let result = orders.value;
  
  // Exclure les commandes annulées
  result = result.filter(order => !order.isCancelled);
  
  if (!hasActiveFilter.value) return result;
  
  const debut = dateDebut.value ? new Date(dateDebut.value) : null;
  const fin = dateFin.value ? new Date(dateFin.value) : null;
  if (fin) fin.setHours(23, 59, 59, 999);
  
  return result.filter(order => {
    const orderDate = new Date(order.date);
    let include = true;
    if (debut && orderDate < debut) include = false;
    if (fin && orderDate > fin) include = false;
    return include;
  });
});

const totalOrders = computed(() => ordersFiltered.value.length);

const totalCancelledOrders = computed(() => 
  orders.value.filter(order => order.isCancelled).length
);

const totalHT = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalHT, 0)
);

const totalTTC = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalTTC, 0)
);

const totalAchat = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalAchat, 0)
);

// const benefice = computed(() => totalTTC.value - totalAchat.value);

// const margePourcentage = computed(() => {
//   if (totalTTC.value === 0) return 0;
//   return (benefice.value / totalTTC.value) * 100;
// });


const benefice = computed(() => totalHT.value - totalAchat.value);

const margePourcentage = computed(() => {
  // On calcule désormais la marge par rapport au CA HT
  if (totalHT.value === 0) return 0;
  return (benefice.value / totalHT.value) * 100;
});

const tvaTotale = computed(() => totalTTC.value - totalHT.value);

const totalProduitsVendus = computed(() => {
  return ordersFiltered.value.reduce((sum, order) => 
    sum + order.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
  );
});

const panierMoyen = computed(() => {
  if (totalOrders.value === 0) return 0;
  return totalTTC.value / totalOrders.value;
});

interface CategoryStat {
  id: string;
  name: string;
  totalVentesHT: number;
  totalAchat: number;
  benefice: number;
  marge: number;
}

const statsParCategorie = computed(() => {
  const statsMap: Record<string, { ventesHT: number; achat: number }> = {};

  // 1. Parcourir toutes les commandes filtrées
  ordersFiltered.value.forEach(order => {
    order.products.forEach(product => {
      const productInfo = cacheProduits.value[product.id];
      if (productInfo) {
        const catId = productInfo.category_id;
        const qte = product.quantity;
        
        // Approximation du prix de vente HT au prorata ou prix du cache si l'API de la commande ne donne pas le HT unitaire précis
        // Ici on prend le prix de base HT du produit * quantité
        const totalProduitHT = productInfo.price * qte; 
        const totalProduitAchat = productInfo.wholesale_price * qte;

        if (!statsMap[catId]) {
          statsMap[catId] = { ventesHT: 0, achat: 0 };
        }

        statsMap[catId].ventesHT += totalProduitHT;
        statsMap[catId].achat += totalProduitAchat;
      }
    });
  }); 

  // 2. Transformer la Map en tableau trié par bénéfice décroissant
  return Object.keys(statsMap).map(catId => {
    const ventesHT = statsMap[catId].ventesHT;
    const achat = statsMap[catId].achat;
    const beneficeCat = ventesHT - achat;
    const margeCat = ventesHT > 0 ? (beneficeCat / ventesHT) * 100 : 0;

    return {
      id: catId,
      name: cacheCategories.value[catId] || `Catégorie #${catId}`,
      totalVentesHT: ventesHT,
      totalAchat: achat,
      benefice: beneficeCat,
      marge: margeCat
    };
  }).sort((a, b) => b.benefice - a.benefice);
});

// Méthodes
const loadOrders = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await api.get('/orders?output_format=XML&display=full&limit=5000');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const orderElements = xmlDoc.querySelectorAll('order');

    await loadProductCache();
    await loadCategoryCache();

    const ordersArray: Order[] = [];

    for (const orderEl of Array.from(orderElements)) {
      const orderId = orderEl.querySelector('id')?.textContent?.trim() || '';
      const dateAdd = orderEl.querySelector('date_add')?.textContent?.trim() || '';
      const customerId = orderEl.querySelector('id_customer')?.textContent?.trim() || '';
      const totalPaidTTC = parseFloat(orderEl.querySelector('total_paid_tax_incl')?.textContent?.trim() || '0');
      const totalProductsHT = parseFloat(orderEl.querySelector('total_products')?.textContent?.trim() || '0');
      const orderState = orderEl.querySelector('current_state')?.textContent?.trim() || '';
      const isCancelled = orderState === '6'; // 6 = cancelled state in PrestaShop

      if (!dateAdd || !orderId) continue;

      let totalAchat = 0;
      const products: OrderProduct[] = [];
      
      try {
        const orderDetailRes = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
        const orderDetailDoc = parser.parseFromString(orderDetailRes.data, 'text/xml');
        const orderRows = orderDetailDoc.querySelectorAll('order_row');

        for (const row of Array.from(orderRows)) {
          const productId = row.querySelector('product_id')?.textContent?.trim() || '';
          const productName = row.querySelector('product_name')?.textContent?.trim() || '';
          const quantity = parseInt(row.querySelector('product_quantity')?.textContent?.trim() || '1');
          
          products.push({ id: productId, name: productName, quantity });

          if (productId && cacheProduits.value[productId]) {
            const wholesalePrice = cacheProduits.value[productId].wholesale_price || 0;
            totalAchat += wholesalePrice * quantity;
          }
        }
      } catch (e) {
        console.warn(`Impossible de récupérer les détails de la commande ${orderId}`);
      }

      // const beneficeOrder = totalPaidTTC - totalAchat;
      // const margeOrder = totalPaidTTC > 0 ? (beneficeOrder / totalPaidTTC) * 100 : 0;

      // On utilise totalProductsHT (le montant HT récupéré plus haut dans ton code)
      const beneficeOrder = totalProductsHT - totalAchat;
      const margeOrder = totalProductsHT > 0 ? (beneficeOrder / totalProductsHT) * 100 : 0;

      ordersArray.push({
        id: orderId,
        date: dateAdd,
        customer_id: customerId,
        totalHT: totalProductsHT,
        totalTTC: totalPaidTTC,
        totalAchat,
        benefice: beneficeOrder,
        marge: margeOrder,
        products,
        order_state: orderState,
        isCancelled
      });
    }

    ordersArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    orders.value = ordersArray;

  } catch (err: any) {
    error.value = `Erreur lors du chargement: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const loadCategoryCache = async () => {
  try {
    const response = await api.get('/categories?output_format=XML&display=[id,name]&limit=500');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const categories = xmlDoc.querySelectorAll('category');

    categories.forEach(cat => {
      const id = cat.querySelector('id')?.textContent?.trim() || '';
      // Prestashop peut renvoyer le nom en plusieurs langues, on prend le premier trouvé
      const name = cat.querySelector('name')?.textContent?.trim() || 'Inconnu';
      if (id) cacheCategories.value[id] = name;
    });
  } catch (e) {
    console.warn('Erreur chargement cache catégories:', e);
  }
};

// const loadProductCache = async () => {
//   try {
//     const response = await api.get('/products?output_format=XML&display=[id,price,wholesale_price]&limit=5000');
//     const parser = new DOMParser();
//     const xmlDoc = parser.parseFromString(response.data, 'text/xml');
//     const products = xmlDoc.querySelectorAll('product');

//     products.forEach(product => {
//       const id = product.querySelector('id')?.textContent?.trim() || '';
//       const price = parseFloat(product.querySelector('price')?.textContent?.trim() || '0');
//       const wholesalePrice = parseFloat(product.querySelector('wholesale_price')?.textContent?.trim() || '0');
      
//       if (id) {
//         cacheProduits.value[id] = { price, wholesale_price: wholesalePrice };
//       }
//     });

//     console.log(`Produits chargés: ${Object.keys(cacheProduits.value).length}`);
//   } catch (e) {
//     console.warn('Erreur chargement cache produits:', e);
//   }
// };


// 2. Modifie la fonction :

const loadProductCache = async () => {
  try {
    // AJOUT de id_category_default dans le display de l'URL API
    const response = await api.get('/products?output_format=XML&display=[id,price,wholesale_price,id_category_default]&limit=5000');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const products = xmlDoc.querySelectorAll('product');

    products.forEach(product => {
      const id = product.querySelector('id')?.textContent?.trim() || '';
      const price = parseFloat(product.querySelector('price')?.textContent?.trim() || '0');
      const wholesalePrice = parseFloat(product.querySelector('wholesale_price')?.textContent?.trim() || '0');
      const categoryId = product.querySelector('id_category_default')?.textContent?.trim() || 'Non classé';
      
      if (id) {
        // On stocke la catégorie dans le cache
        cacheProduits.value[id] = { price, wholesale_price: wholesalePrice, category_id: categoryId };
      }
    });

    console.log(`Produits chargés: ${Object.keys(cacheProduits.value).length}`);
  } catch (e) {
    console.warn('Erreur chargement cache produits:', e);
  }
};

const resetFilter = () => {
  dateDebut.value = '';
  dateFin.value = '';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const formatDateRange = (debut: string, fin: string) => {
  const format = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };
  if (debut && fin) return `${format(debut)} - ${format(fin)}`;
  if (debut) return `À partir du ${format(debut)}`;
  if (fin) return `Jusqu'au ${format(fin)}`;
  return '';
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
}

.dashboard {
  flex: 1;
  margin-left: 260px;
  padding: 2rem 2.5rem;
  max-width: calc(100% - 260px);
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #2d3a4f 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.25rem;
}

.dashboard-header p {
  color: #6c86a3;
  margin: 0;
  font-size: 0.9rem;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-card {
  background: white;
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(203, 213, 225, 0.3);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.filter-icon {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.filter-title {
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.filter-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.date-input-group {
  flex: 1;
  min-width: 180px;
}

.date-input-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.date-input {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #1e293b;
  background: white;
  transition: all 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.date-arrow {
  display: flex;
  align-items: center;
  padding-bottom: 0.65rem;
}

.date-arrow svg {
  width: 20px;
  height: 20px;
  color: #94a3b8;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

.reset-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239,68,68,0.3);
}

.filter-stats {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f2f5;
}

.filter-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3b82f6;
  background: #eff6ff;
  padding: 0.35rem 1rem;
  border-radius: 30px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  background: white;
  border-radius: 24px;
  gap: 1rem;
  color: #6c86a3;
}

.spinner {
  width: 45px;
  height: 45px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  border: 1px solid #fee2e2;
}

.error-message h3 {
  color: #dc2626;
  margin: 0 0 0.5rem;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 20px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(203,213,225,0.3);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.summary-card.accent-blue::before { background: #3b82f6; }
.summary-card.accent-indigo::before { background: #6366f1; }
.summary-card.accent-amber::before { background: #f59e0b; }
.summary-card.accent-green::before { background: #10b981; }
.summary-card.accent-red::before { background: #ef4444; }

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f1f5f9;
  color: #64748b;
}

.summary-card.accent-blue .summary-icon { background: rgba(59,130,246,0.1); color: #3b82f6; }
.summary-card.accent-indigo .summary-icon { background: rgba(99,102,241,0.1); color: #6366f1; }
.summary-card.accent-amber .summary-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
.summary-card.accent-green .summary-icon { background: rgba(16,185,129,0.1); color: #10b981; }
.summary-card.accent-red .summary-icon { background: rgba(239,68,68,0.1); color: #ef4444; }

.summary-icon svg {
  width: 22px;
  height: 22px;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
}

.summary-sub {
  font-size: 0.75rem;
  font-weight: 600;
}

.text-green { color: #10b981; }
.text-red { color: #ef4444; }

.stats-mini-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-mini {
  background: white;
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(203,213,225,0.3);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.stat-mini-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-mini-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

.stat-mini-cancelled {
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.stat-mini-value.cancelled {
  color: #ef4444;
  font-weight: 900;
}

.orders-section {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(203,213,225,0.3);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid #f0f2f5;
}

.section-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.section-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: #eff6ff;
  color: #2563eb;
  padding: 0.35rem 0.9rem;
  border-radius: 30px;
}

.orders-table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

thead {
  background: #f8fafc;
}

th {
  padding: 0.85rem 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

th.right { text-align: right; }

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f8fafc;
  font-size: 0.85rem;
  color: #334155;
}

td.right { text-align: right; }

tbody tr:hover {
  background: #f8fafc;
}

.order-id-cell {
  font-weight: 700;
  color: #2563eb;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.date-cell {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.customer-id-cell {
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.products-cell {
  text-align: center;
}

.product-count-badge {
  display: inline-block;
  background: #e0e7ff;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.7rem;
  border-radius: 30px;
}

.amount-cell {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.amount-cell.ttc { color: #2563eb; }
.amount-cell.achat { color: #f59e0b; }

.benefice-positif { color: #10b981; font-weight: 700; }
.benefice-negatif { color: #ef4444; font-weight: 700; }

.marge-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.marge-positive {
  background: #d1fae5;
  color: #065f46;
}

.marge-negative {
  background: #fee2e2;
  color: #991b1b;
}

.marge-badge.total {
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
}

tfoot .total-row td {
  background: #fefce8;
  border-top: 2px solid #e2e8f0;
  font-weight: 700;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem !important;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: #94a3b8;
}

.empty-message svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

@media (max-width: 1200px) {
  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .stats-mini-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard {
    margin-left: 0;
    padding: 1rem;
    max-width: 100%;
  }
  .summary-row {
    grid-template-columns: 1fr;
  }
  .stats-mini-row {
    grid-template-columns: 1fr 1fr;
  }
  .summary-value {
    font-size: 1.2rem;
  }
}
</style>
