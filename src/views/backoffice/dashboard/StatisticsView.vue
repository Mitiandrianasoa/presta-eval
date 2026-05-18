<template>
  <div class="stats-layout">
    <Sidebar />

    <main class="stats-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Backoffice</p>
          <h1>Statistiques par catégorie</h1>
          <p class="subtitle">
            Montant total des ventes, montant total d'achat et bénéfice par catégorie de produit.
          </p>
        </div>
      </header>

      <section v-if="loading" class="state-card">
        <div class="spinner"></div>
        <p>Chargement des statistiques...</p>
      </section>

      <section v-else-if="error" class="state-card state-error">
        <h2>Erreur</h2>
        <p>{{ error }}</p>
        <button class="action-btn" @click="loadStatistics">Réessayer</button>
      </section>

      <section v-else class="content">
        <div class="summary-grid">
          <article class="summary-card blue">
            <span class="summary-label">Ventes HT</span>
            <strong>{{ formatCurrency(totalSalesHT) }}</strong>
            <small>{{ totalOrders }} commande(s) analysée(s)</small>
          </article>

          <article class="summary-card amber">
            <span class="summary-label">Achat total</span>
            <strong>{{ formatCurrency(totalPurchase) }}</strong>
            <small>Basé sur le prix d'achat des produits</small>
          </article>

          <article class="summary-card green">
            <span class="summary-label">Bénéfice total</span>
            <strong>{{ formatCurrency(totalProfit) }}</strong>
            <small>{{ margin.toFixed(1) }}% de marge</small>
          </article>
        </div>

        <section class="table-card">
          <div class="section-header">
            <h2>Détail par catégorie</h2>
            <span class="badge">{{ categoryStats.length }} catégorie(s)</span>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th class="right">Commandes</th>
                  <th class="right">Produits vendus</th>
                  <th class="right">Ventes HT</th>
                  <th class="right">Achat</th>
                  <th class="right">Bénéfice</th>
                  <th class="right">Marge</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in categoryStats" :key="category.id">
                  <td class="category-name">
                    {{ category.name }}
                  </td>
                  <td class="right">{{ category.orderCount }}</td>
                  <td class="right">{{ category.quantitySold }}</td>
                  <td class="right amount">{{ formatCurrency(category.salesHT) }}</td>
                  <td class="right amount">{{ formatCurrency(category.purchase) }}</td>
                  <td class="right amount" :class="category.profit >= 0 ? 'positive' : 'negative'">
                    {{ formatCurrency(category.profit) }}
                  </td>
                  <td class="right">
                    <span class="margin-pill" :class="category.margin >= 0 ? 'positive' : 'negative'">
                      {{ category.margin >= 0 ? '+' : '' }}{{ category.margin.toFixed(1) }}%
                    </span>
                  </td>
                </tr>

                <tr v-if="categoryStats.length === 0">
                  <td colspan="7" class="empty-cell">
                    Aucune donnée de catégorie disponible.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="categoryStats.length > 0">
                <tr>
                  <td><strong>TOTAL</strong></td>
                  <td class="right"><strong>{{ totalOrders }}</strong></td>
                  <td class="right"><strong>{{ totalProductsSold }}</strong></td>
                  <td class="right amount"><strong>{{ formatCurrency(totalSalesHT) }}</strong></td>
                  <td class="right amount"><strong>{{ formatCurrency(totalPurchase) }}</strong></td>
                  <td class="right amount" :class="totalProfit >= 0 ? 'positive' : 'negative'">
                    <strong>{{ formatCurrency(totalProfit) }}</strong>
                  </td>
                  <td class="right">
                    <span class="margin-pill total" :class="margin >= 0 ? 'positive' : 'negative'">
                      {{ margin >= 0 ? '+' : '' }}{{ margin.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <p class="note">
          Les ventes sont calculées en HT. La catégorie retenue est la catégorie par défaut du produit.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Sidebar from '../../../components/Sidebar.vue';
import api from '../../../api/api';

interface OrderLine {
  product_id: string;
  product_name: string;
  quantity: number;
  saleHT: number;
}

interface OrderRecord {
  id: string;
  date: string;
  lines: OrderLine[];
}

interface CategoryStat {
  id: string;
  name: string;
  salesHT: number;
  purchase: number;
  profit: number;
  margin: number;
  quantitySold: number;
  orderCount: number;
}

const loading = ref(false);
const error = ref('');
const orders = ref<OrderRecord[]>([]);
const productCache = ref<Record<string, { price: number; wholesale_price: number; category_id: string }>>({});
const categoryCache = ref<Record<string, string>>({});

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const totalProductsSold = computed(() =>
  categoryStats.value.reduce((sum, category) => sum + category.quantitySold, 0)
);

const categoryStats = computed<CategoryStat[]>(() => {
  const statsMap: Record<
    string,
    {
      name: string;
      salesHT: number;
      purchase: number;
      quantitySold: number;
      orders: Set<string>;
    }
  > = {};

  for (const order of orders.value) {
    for (const line of order.lines) {
      const productInfo = productCache.value[line.product_id];
      const categoryId = productInfo?.category_id || '0';
      const categoryName = categoryCache.value[categoryId] || 'Non classé';
      const salesHT = line.saleHT * line.quantity;
      const purchase = (productInfo?.wholesale_price || 0) * line.quantity;

      if (!statsMap[categoryId]) {
        statsMap[categoryId] = {
          name: categoryName,
          salesHT: 0,
          purchase: 0,
          quantitySold: 0,
          orders: new Set<string>(),
        };
      }

      statsMap[categoryId].salesHT += salesHT;
      statsMap[categoryId].purchase += purchase;
      statsMap[categoryId].quantitySold += line.quantity;
      statsMap[categoryId].orders.add(order.id);
    }
  }

  return Object.entries(statsMap)
    .map(([id, value]) => {
      const profit = value.salesHT - value.purchase;
      const margin = value.salesHT > 0 ? (profit / value.salesHT) * 100 : 0;

      return {
        id,
        name: value.name,
        salesHT: value.salesHT,
        purchase: value.purchase,
        profit,
        margin,
        quantitySold: value.quantitySold,
        orderCount: value.orders.size,
      };
    })
    .sort((a, b) => b.salesHT - a.salesHT);
});

const totalOrders = computed(() => orders.value.length);
const totalSalesHT = computed(() => categoryStats.value.reduce((sum, item) => sum + item.salesHT, 0));
const totalPurchase = computed(() => categoryStats.value.reduce((sum, item) => sum + item.purchase, 0));
const totalProfit = computed(() => totalSalesHT.value - totalPurchase.value);
const margin = computed(() => (totalSalesHT.value > 0 ? (totalProfit.value / totalSalesHT.value) * 100 : 0));

const loadCategoryCache = async () => {
  const response = await api.get('/categories?output_format=XML&display=[id,name]&limit=500');
  const xmlDoc = parseXml(response.data);
  const categories = xmlDoc.querySelectorAll('category');

  categories.forEach((category) => {
    const id = category.querySelector('id')?.textContent?.trim() || '';
    const name = category.querySelector('name')?.textContent?.trim() || '';

    if (id && id !== '1' && id !== '2') {
      categoryCache.value[id] = name || `Catégorie #${id}`;
    }
  });
};

const loadProductCache = async () => {
  const response = await api.get('/products?output_format=XML&display=[id,price,wholesale_price,id_category_default]&limit=5000');
  const xmlDoc = parseXml(response.data);
  const products = xmlDoc.querySelectorAll('product');

  products.forEach((product) => {
    const id = product.querySelector('id')?.textContent?.trim() || '';
    const price = parseFloat(product.querySelector('price')?.textContent?.trim() || '0');
    const wholesalePrice = parseFloat(product.querySelector('wholesale_price')?.textContent?.trim() || '0');
    const categoryId = product.querySelector('id_category_default')?.textContent?.trim() || '0';

    if (id) {
      productCache.value[id] = {
        price,
        wholesale_price: wholesalePrice,
        category_id: categoryId,
      };
    }
  });
};

const loadOrders = async () => {
  const response = await api.get('/orders?output_format=XML&display=full&limit=5000');
  const xmlDoc = parseXml(response.data);
  const orderElements = xmlDoc.querySelectorAll('order');
  const parser = new DOMParser();
  const records: OrderRecord[] = [];

  for (const orderEl of Array.from(orderElements)) {
    const orderId = orderEl.querySelector('id')?.textContent?.trim() || '';
    const date = orderEl.querySelector('date_add')?.textContent?.trim() || '';

    if (!orderId || !date) continue;

    try {
      const detailResponse = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
      const detailDoc = parser.parseFromString(detailResponse.data, 'text/xml');
      const orderRows = detailDoc.querySelectorAll('associations order_rows order_row');

      const lines: OrderLine[] = Array.from(orderRows).map((row) => ({
        product_id: row.querySelector('product_id')?.textContent?.trim() || '',
        product_name: row.querySelector('product_name')?.textContent?.trim() || 'Produit',
        quantity: parseInt(row.querySelector('product_quantity')?.textContent?.trim() || '0', 10),
        saleHT: parseFloat(
          row.querySelector('product_price')?.textContent?.trim() ||
          row.querySelector('unit_price_tax_excl')?.textContent?.trim() || '0'
        ),
      }));

      records.push({ id: orderId, date, lines });
    } catch (detailError) {
      console.warn(`Impossible de lire la commande #${orderId}`, detailError);
    }
  }

  orders.value = records;
};

const loadStatistics = async () => {
  loading.value = true;
  error.value = '';

  try {
    await Promise.all([loadCategoryCache(), loadProductCache()]);
    await loadOrders();
  } catch (err: any) {
    error.value = `Erreur lors du chargement des statistiques: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStatistics();
});
</script>

<style scoped>
.stats-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
}

.stats-page {
  flex: 1;
  margin-left: 260px;
  padding: 2rem 2.5rem;
  max-width: calc(100% - 260px);
}

.page-header {
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
}

.page-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
}

.subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.state-card,
.table-card,
.summary-card {
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(203, 213, 225, 0.35);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.state-card {
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.state-error h2 {
  margin-top: 0;
  color: #b91c1c;
}

.spinner {
  width: 42px;
  height: 42px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content {
  display: grid;
  gap: 1.25rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1.25rem 1.35rem;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
}

.summary-card.blue::before { background: #2563eb; }
.summary-card.amber::before { background: #f59e0b; }
.summary-card.green::before { background: #10b981; }

.summary-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card strong {
  display: block;
  margin-top: 0.4rem;
  font-size: 1.5rem;
  color: #0f172a;
}

.summary-card small {
  display: block;
  margin-top: 0.3rem;
  color: #64748b;
}

.table-card {
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eef2f7;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

thead {
  background: #f8fafc;
}

th, td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

th {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  color: #64748b;
  text-align: left;
}

.right { text-align: right; }

.category-name {
  font-weight: 700;
  color: #1e293b;
}

.amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.positive {
  color: #10b981;
}

.negative {
  color: #ef4444;
}

.margin-pill {
  display: inline-block;
  padding: 0.22rem 0.65rem;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 0.8rem;
  font-weight: 700;
}

.margin-pill.positive {
  background: #d1fae5;
  color: #065f46;
}

.margin-pill.negative {
  background: #fee2e2;
  color: #991b1b;
}

.margin-pill.total {
  font-size: 0.85rem;
}

.empty-cell {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
}

.note {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.action-btn {
  margin-top: 1rem;
  border: none;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  padding: 0.75rem 1.1rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .stats-page {
    margin-left: 0;
    max-width: 100%;
    padding: 1rem;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>