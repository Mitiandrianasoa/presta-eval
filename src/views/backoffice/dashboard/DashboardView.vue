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

        <!-- STATS RAPIDES
        <div class="stats-mini-row">
          <div class="stat-mini">
            <span class="stat-mini-value">{{ totalOrders }}</span>
            <span class="stat-mini-label">Commandes</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-value">{{ formatCurrency(tvaTotale) }}</span>
            <span class="stat-mini-label">TVA Collectée</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-value">{{ totalProduitsVendus }}</span>
            <span class="stat-mini-label">Produits Vendus</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-value">{{ formatCurrency(panierMoyen) }}</span>
            <span class="stat-mini-label">Panier Moyen TTC</span>
          </div>
        </div> -->

        <!-- STATISTIQUES PAR CATÉGORIE -->
        <div class="stats-grid">
          <div class="stats-section">
            <div class="section-header">
              <h2>Bénéfice par catégorie</h2>
            </div>
            <div class="stats-table-wrapper">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th class="right">Ventes HT</th>
                    <th class="right">Achat HT</th>
                    <th class="right">Bénéfice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cat in beneficeParCategorie" :key="cat.catId">
                    <td class="cat-name-cell">{{ cat.nom }}</td>
                    <td class="right amount-cell">{{ formatCurrency(cat.ventesHT) }}</td>
                    <td class="right amount-cell achat">{{ formatCurrency(cat.achatHT) }}</td>
                    <td class="right amount-cell" :class="cat.benefice >= 0 ? 'benefice-positif' : 'benefice-negatif'">
                      {{ formatCurrency(cat.benefice) }}
                    </td>
                  </tr>
                  <tr v-if="beneficeParCategorie.length === 0">
                    <td colspan="4" class="empty-state">
                      <div class="empty-message"><p>Aucune donnée</p></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="stats-section">
            <div class="section-header">
              <h2>Stock par catégorie</h2>
            </div>
            <div class="stats-table-wrapper">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th class="right">Qté physique</th>
                    <th class="right">Qté réservé</th>
                    <th class="right">Qté disponible</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cat in stockParCategorie" :key="cat.catId">
                    <td class="cat-name-cell">{{ cat.nom }}</td>
                    <td class="right stock-physique">{{ cat.physique }}</td>
                    <td class="right stock-reserve">{{ cat.reserve }}</td>
                    <td class="right stock-disponible">{{ cat.disponible }}</td>
                  </tr>
                  <tr v-if="stockParCategorie.length === 0">
                    <td colspan="4" class="empty-state">
                      <div class="empty-message"><p>Aucune donnée de stock</p></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
  current_state: string;
  totalHT: number;
  totalTTC: number;
  totalAchat: number;
  benefice: number;
  marge: number;
  products: OrderProduct[];
}

// État
const loading = ref(false);
const error = ref('');
const dateDebut = ref('');
const dateFin = ref('');
const orders = ref<Order[]>([]);
const cacheProduits = ref<Record<string, { price: number; wholesale_price: number; id_category?: string }>>({});
const cacheCategories = ref<Record<string, string>>({});
const categorieParProduit = ref<Record<string, string>>({});
const stockDisponibles = ref<Array<{ id_product: string; physical: number; reserved: number; available: number }>>([]);

// Computed
const hasActiveFilter = computed(() => !!(dateDebut.value || dateFin.value));

const ordersFiltered = computed(() => {
  if (!hasActiveFilter.value) return orders.value;
  
  const debut = dateDebut.value ? new Date(dateDebut.value) : null;
  const fin = dateFin.value ? new Date(dateFin.value) : null;
  if (fin) fin.setHours(23, 59, 59, 999);
  
  return orders.value.filter(order => {
    const orderDate = new Date(order.date);
    let include = true;
    if (debut && orderDate < debut) include = false;
    if (fin && orderDate > fin) include = false;
    return include;
  });
});

const totalOrders = computed(() => ordersFiltered.value.length);

const totalHT = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalHT, 0)
);

const totalTTC = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalTTC, 0)
);

const totalAchat = computed(() => 
  ordersFiltered.value.reduce((sum, o) => sum + o.totalAchat, 0)
);

const benefice = computed(() => totalTTC.value - totalAchat.value);

const margePourcentage = computed(() => {
  if (totalTTC.value === 0) return 0;
  return (benefice.value / totalTTC.value) * 100;
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

const beneficeParCategorie = computed(() => {
  const map: Record<string, { nom: string; ventesHT: number; achatHT: number }> = {};

  for (const order of ordersFiltered.value) {
    for (const product of order.products) {
      const cached = cacheProduits.value[product.id];
      if (!cached) continue;
      const catId = cached.id_category || '';
      if (!catId) continue;
      const catNom = cacheCategories.value[catId] || `Catégorie ${catId}`;
      if (!map[catId]) map[catId] = { nom: catNom, ventesHT: 0, achatHT: 0 };
      map[catId].ventesHT += (cached.price || 0) * product.quantity;
      map[catId].achatHT += (cached.wholesale_price || 0) * product.quantity;
    }
  }

  return Object.entries(map).map(([catId, d]) => ({
    catId,
    nom: d.nom,
    ventesHT: d.ventesHT,
    achatHT: d.achatHT,
    benefice: d.ventesHT - d.achatHT,
    marge: d.ventesHT > 0 ? ((d.ventesHT - d.achatHT) / d.ventesHT) * 100 : 0
  })).sort((a, b) => b.ventesHT - a.ventesHT);
});

const stockParCategorie = computed(() => {
  // PS WebService n'expose pas physical_quantity ni reserved_quantity.
  // Formule PS : physical = available + reserved
  // réservé = qtés des commandes à l'état 2 (paiement accepté)
  const reservedByProduct: Record<string, number> = {};
  for (const order of orders.value) {
    if (order.current_state === '2') {
      for (const product of order.products) {
        reservedByProduct[product.id] = (reservedByProduct[product.id] || 0) + product.quantity;
      }
    }
  }

  const map: Record<string, { nom: string; physique: number; reserve: number; disponible: number }> = {};

  for (const stock of stockDisponibles.value) {
    const catId = cacheProduits.value[stock.id_product]?.id_category || '';
    if (!catId) continue;
    const catNom = cacheCategories.value[catId] || `Catégorie ${catId}`;
    if (!map[catId]) map[catId] = { nom: catNom, physique: 0, reserve: 0, disponible: 0 };

    const reserve    = reservedByProduct[stock.id_product] || 0;
    const disponible = stock.available;
    map[catId].reserve    += reserve;
    map[catId].disponible += disponible;
    map[catId].physique   += disponible + reserve;  // physical = available + reserved
  }

  return Object.entries(map).map(([catId, d]) => ({
    catId,
    nom: d.nom,
    physique:   d.physique,
    reserve:    d.reserve,
    disponible: d.disponible
  })).sort((a, b) => a.nom.localeCompare(b.nom));
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

    const ordersArray: Order[] = [];

    for (const orderEl of Array.from(orderElements)) {
      const orderId = orderEl.querySelector('id')?.textContent?.trim() || '';
      const dateAdd = orderEl.querySelector('date_add')?.textContent?.trim() || '';
      const customerId = orderEl.querySelector('id_customer')?.textContent?.trim() || '';
      const currentState = orderEl.querySelector('current_state')?.textContent?.trim() || '';
      const totalPaidTTC = parseFloat(orderEl.querySelector('total_paid_tax_incl')?.textContent?.trim() || '0');
      const totalProductsHT = parseFloat(orderEl.querySelector('total_products')?.textContent?.trim() || '0');

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

      const beneficeOrder = totalPaidTTC - totalAchat;
      const margeOrder = totalPaidTTC > 0 ? (beneficeOrder / totalPaidTTC) * 100 : 0;

      ordersArray.push({
        id: orderId,
        date: dateAdd,
        customer_id: customerId,
        current_state: currentState,
        totalHT: totalProductsHT,
        totalTTC: totalPaidTTC,
        totalAchat,
        benefice: beneficeOrder,
        marge: margeOrder,
        products
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

const loadProductCache = async () => {
  try {
    const [prodRes, catRes] = await Promise.all([
      api.get('/products?output_format=XML&display=[id,price,wholesale_price,id_category_default]&limit=5000'),
      api.get('/categories?output_format=XML&display=[id,name]&limit=5000')
    ]);

    const parser = new DOMParser();

    const catDoc = parser.parseFromString(catRes.data, 'text/xml');
    catDoc.querySelectorAll('category').forEach(cat => {
      const id = cat.querySelector('id')?.textContent?.trim() || '';
      const name = cat.querySelector('name language')?.textContent?.trim()
                || cat.querySelector('name')?.textContent?.trim()
                || '';
      if (id) cacheCategories.value[id] = name;
    });

    const xmlDoc = parser.parseFromString(prodRes.data, 'text/xml');
    xmlDoc.querySelectorAll('product').forEach(product => {
      const id = product.querySelector('id')?.textContent?.trim() || '';
      const price = parseFloat(product.querySelector('price')?.textContent?.trim() || '0');
      const wholesalePrice = parseFloat(product.querySelector('wholesale_price')?.textContent?.trim() || '0');
      const categoryId = product.querySelector('id_category_default')?.textContent?.trim() || '';

      if (id) {
        cacheProduits.value[id] = { price, wholesale_price: wholesalePrice, id_category: categoryId };
        categorieParProduit.value[id] = categoryId;
      }
    });

    await loadStock();

    console.log(`Produits chargés: ${Object.keys(cacheProduits.value).length}, Catégories: ${Object.keys(cacheCategories.value).length}`);
  } catch (e) {
    console.warn('Erreur chargement cache produits:', e);
  }
};

const loadStock = async () => {
  try {
    const res = await api.get('/stock_availables?output_format=XML&display=full&limit=5000');
    const doc = new DOMParser().parseFromString(res.data, 'text/xml');

    // Grouper par id_product — pour produits avec combinaisons, sommer les lignes attr>0
    const byProduct: Record<string, { hasCombinations: boolean; entries: { idAttr: string; physical: number; reserved: number; available: number }[] }> = {};

    Array.from(doc.querySelectorAll('stock_available')).forEach(s => {
      const idProduct = s.querySelector('id_product')?.textContent?.trim() || '';
      const idAttr   = s.querySelector('id_product_attribute')?.textContent?.trim() || '0';
      if (!idProduct) return;

      if (!byProduct[idProduct]) byProduct[idProduct] = { hasCombinations: false, entries: [] };
      if (idAttr !== '0') byProduct[idProduct].hasCombinations = true;

      byProduct[idProduct].entries.push({
        idAttr,
        physical:  0,
        reserved:  0,
        available: parseInt(s.querySelector('quantity')?.textContent?.trim() || '0'),
      });
    });

    stockDisponibles.value = Object.entries(byProduct).map(([id_product, data]) => {
      const rows = data.hasCombinations
        ? data.entries.filter(e => e.idAttr !== '0')
        : data.entries;

      return {
        id_product,
        physical:  rows.reduce((s, e) => s + e.physical,  0),
        reserved:  rows.reduce((s, e) => s + e.reserved,  0),
        available: rows.reduce((s, e) => s + e.available, 0),
      };
    });
  } catch (e) {
    console.warn('Erreur chargement stocks:', e);
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
  min-height: 100vh;
  background: #0d0d14;
}

.dashboard {
  margin-left: 240px;
  padding: 2rem 2.5rem;
  min-height: 100vh;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #f1f1f8;
  margin: 0 0 0.25rem;
  letter-spacing: -0.02em;
}

.dashboard-header p {
  color: #6b7280;
  margin: 0;
  font-size: 0.875rem;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-card {
  background: #13131f;
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255,255,255,0.06);
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
  color: #f97316;
}

.filter-title {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
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
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.date-input {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  font-size: 0.875rem;
  color: #e2e2f0;
  background: #0d0d14;
  transition: all 0.2s;
  font-family: inherit;
}

.date-input:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
}

.date-arrow {
  display: flex;
  align-items: center;
  padding-bottom: 0.65rem;
}

.date-arrow svg {
  width: 20px;
  height: 20px;
  color: #4b5563;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: rgba(239,68,68,0.12);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.22);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

.reset-btn:hover {
  background: rgba(239,68,68,0.22);
  border-color: rgba(239,68,68,0.38);
}

.filter-stats {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.filter-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #f97316;
  background: rgba(249,115,22,0.12);
  padding: 0.35rem 1rem;
  border-radius: 30px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  background: #13131f;
  border-radius: 20px;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(255,255,255,0.07);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: #13131f;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  border: 1px solid rgba(239,68,68,0.18);
}

.error-message h3 {
  color: #f87171;
  margin: 0 0 0.5rem;
}

.error-message p {
  color: #6b7280;
}

.retry-btn {
  background: #f97316;
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  transition: opacity 0.15s;
}

.retry-btn:hover { opacity: 0.88; }

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: #13131f;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.2s;
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

.summary-card.accent-blue::before   { background: #f97316; }
.summary-card.accent-indigo::before { background: #a855f7; }
.summary-card.accent-amber::before  { background: #f59e0b; }
.summary-card.accent-green::before  { background: #10b981; }
.summary-card.accent-red::before    { background: #ef4444; }

.summary-card:hover {
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-2px);
}

.summary-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255,255,255,0.05);
  color: #6b7280;
}

.summary-card.accent-blue .summary-icon   { background: rgba(249,115,22,0.12);  color: #f97316; }
.summary-card.accent-indigo .summary-icon { background: rgba(168,85,247,0.12);  color: #a855f7; }
.summary-card.accent-amber .summary-icon  { background: rgba(245,158,11,0.12);  color: #f59e0b; }
.summary-card.accent-green .summary-icon  { background: rgba(16,185,129,0.12);  color: #10b981; }
.summary-card.accent-red .summary-icon    { background: rgba(239,68,68,0.12);   color: #ef4444; }

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
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f1f1f8;
}

.summary-sub {
  font-size: 0.75rem;
  font-weight: 600;
}

.text-green { color: #10b981; }
.text-red   { color: #ef4444; }

.stats-mini-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-mini {
  background: #13131f;
  border-radius: 14px;
  padding: 1rem;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.06);
}

.stat-mini-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f1f8;
}

.stat-mini-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 0.25rem;
}

.orders-section {
  background: #13131f;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.section-header h2 {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f1f8;
  margin: 0;
}

.section-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(249,115,22,0.12);
  color: #f97316;
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
  background: rgba(255,255,255,0.03);
}

th {
  padding: 0.85rem 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  white-space: nowrap;
}

th.right { text-align: right; }

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 0.85rem;
  color: #a0a0b8;
}

td.right { text-align: right; }

tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.order-id-cell {
  font-weight: 700;
  color: #f97316;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.date-cell {
  font-weight: 600;
  color: #d4d4e0;
  white-space: nowrap;
}

.customer-id-cell {
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.products-cell {
  text-align: center;
}

.product-count-badge {
  display: inline-block;
  background: rgba(168,85,247,0.14);
  color: #a855f7;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 30px;
}

.amount-cell {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.amount-cell.ttc   { color: #f97316; }
.amount-cell.achat { color: #f59e0b; }

.benefice-positif { color: #10b981; font-weight: 700; }
.benefice-negatif { color: #ef4444; font-weight: 700; }

.marge-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.marge-positive {
  background: rgba(16,185,129,0.12);
  color: #10b981;
}

.marge-negative {
  background: rgba(239,68,68,0.12);
  color: #f87171;
}

.marge-badge.total {
  padding: 0.35rem 0.9rem;
  font-size: 0.82rem;
}

tfoot .total-row td {
  background: rgba(249,115,22,0.06);
  border-top: 1px solid rgba(249,115,22,0.15);
  font-weight: 700;
  padding: 1rem;
  color: #f1f1f8;
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
  color: #4b5563;
}

.empty-message svg {
  width: 48px;
  height: 48px;
  opacity: 0.3;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stats-section {
  background: #13131f;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}

.stats-table-wrapper {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 0;
}

.cat-name-cell {
  font-weight: 600;
  color: #d4d4e0;
}

.stock-physique  { color: #a855f7; font-weight: 600; font-variant-numeric: tabular-nums; }
.stock-reserve   { color: #f59e0b; font-weight: 600; font-variant-numeric: tabular-nums; }
.stock-disponible { color: #10b981; font-weight: 600; font-variant-numeric: tabular-nums; }

@media (max-width: 1200px) {
  .stats-grid         { grid-template-columns: 1fr; }
  .summary-row        { grid-template-columns: repeat(2, 1fr); }
  .stats-mini-row     { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .dashboard {
    margin-left: 0;
    padding: 1rem;
    max-width: 100%;
  }
  .summary-row    { grid-template-columns: 1fr; }
  .stats-mini-row { grid-template-columns: 1fr 1fr; }
  .summary-value  { font-size: 1.2rem; }
}
</style>
