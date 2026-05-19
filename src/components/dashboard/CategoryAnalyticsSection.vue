<template>
  <section class="category-analytics">
    <div class="analytics-block">
      <div class="section-header">
        <h2>Bénéfice par catégories</h2>
        <span class="section-badge">{{ categoryBenefitStats.length }} catégories</span>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="right">CA HT</th>
              <th class="right">Achat</th>
              <th class="right">Bénéfice</th>
              <th class="right">Marge</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in categoryBenefitStats" :key="row.id">
              <td>{{ row.name }}</td>
              <td class="right amount-cell">{{ formatCurrency(row.totalVentesHT) }}</td>
              <td class="right amount-cell">{{ formatCurrency(row.totalAchat) }}</td>
              <td class="right amount-cell" :class="row.benefice >= 0 ? 'positive' : 'negative'">
                {{ formatCurrency(row.benefice) }}</td>
              <td class="right">
                <span class="badge" :class="row.marge >= 0 ? 'badge-positive' : 'badge-negative'">
                  {{ row.marge >= 0 ? '+' : '' }}{{ row.marge.toFixed(1) }}%
                </span>
              </td>
            </tr>
            <tr v-if="categoryBenefitStats.length === 0">
              <td colspan="5" class="empty-state">Aucune statistique disponible</td>
            </tr>
          </tbody>
          <tfoot v-if="categoryBenefitStats.length > 0">
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td class="right"><strong>{{ formatCurrency(benefitTotals.ventesHT) }}</strong></td>
              <td class="right"><strong>{{ formatCurrency(benefitTotals.achat) }}</strong></td>
              <td class="right" :class="benefitTotals.benefice >= 0 ? 'positive' : 'negative'">
                <strong>{{ formatCurrency(benefitTotals.benefice) }}</strong>
              </td>
              <td class="right">
                <span class="badge" :class="benefitTotals.marge >= 0 ? 'badge-positive' : 'badge-negative'">
                  {{ benefitTotals.marge >= 0 ? '+' : '' }}{{ benefitTotals.marge.toFixed(1) }}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="analytics-block">
      <div class="section-header">
        <h2>Tableau de stock par catégorie</h2>
        <span class="section-badge">{{ categoryStockStats.length }} catégories</span>
      </div>

      <p class="formula-note">
        Qtt physique = Qtt disponible + Qtt réservée
      </p>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="right">Qtt physique</th>
              <th class="right">Qtt réservée</th>
              <th class="right">Qtt disponible</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in categoryStockStats" :key="row.id">
              <td>{{ row.name }}</td>
              <td class="right amount-cell">{{ row.physicalQuantity }}</td>
              <td class="right amount-cell reserved">{{ row.reservedQuantity }}</td>
              <td class="right amount-cell available">{{ row.availableQuantity }}</td>
            </tr>
            <tr v-if="categoryStockStats.length === 0">
              <td colspan="4" class="empty-state">Aucun stock disponible</td>
            </tr>
          </tbody>
          <tfoot v-if="categoryStockStats.length > 0">
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td class="right"><strong>{{ stockTotals.physicalQuantity }}</strong></td>
              <td class="right"><strong>{{ stockTotals.reservedQuantity }}</strong></td>
              <td class="right"><strong>{{ stockTotals.availableQuantity }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface OrderProduct {
  id: string;
  attribute_id?: string;
  quantity: number;
}

interface Order {
  isCancelled?: boolean;
  products: OrderProduct[];
}

interface StockAvailable {
  id: string;
  id_product: string;
  id_product_attribute: string;
  quantity: number;
}

interface ProductCacheItem {
  price: number;
  wholesale_price: number;
  category_id: string;
}

interface CategoryStat {
  id: string;
  name: string;
  totalVentesHT: number;
  totalAchat: number;
  benefice: number;
  marge: number;
}

interface CategoryStockStat {
  id: string;
  name: string;
  availableQuantity: number;
  reservedQuantity: number;
  physicalQuantity: number;
}

const props = defineProps<{
  orders: Order[];
  productCache: Record<string, ProductCacheItem>;
  categoryCache: Record<string, string>;
  stockAvailables: StockAvailable[];
}>();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const activeOrders = computed(() => props.orders.filter(order => !order.isCancelled));

const categoryBenefitStats = computed<CategoryStat[]>(() => {
  const statsMap: Record<string, { ventesHT: number; achat: number }> = {};

  activeOrders.value.forEach(order => {
    order.products.forEach(product => {
      const productInfo = props.productCache[product.id];
      if (!productInfo) return;

      const catId = productInfo.category_id || 'Non classé';
      const quantity = product.quantity;

      if (!statsMap[catId]) {
        statsMap[catId] = { ventesHT: 0, achat: 0 };
      }

      statsMap[catId].ventesHT += productInfo.price * quantity;
      statsMap[catId].achat += productInfo.wholesale_price * quantity;
    });
  });

  return Object.keys(statsMap)
    .map(catId => {
      const row = statsMap[catId];
      if (!row) {
        return {
          id: catId,
          name: props.categoryCache[catId] || `Catégorie #${catId}`,
          totalVentesHT: 0,
          totalAchat: 0,
          benefice: 0,
          marge: 0
        };
      }
      const benefice = row.ventesHT - row.achat;
      const marge = row.ventesHT > 0 ? (benefice / row.ventesHT) * 100 : 0;

      return {
        id: catId,
        name: props.categoryCache[catId] || `Catégorie #${catId}`,
        totalVentesHT: row.ventesHT,
        totalAchat: row.achat,
        benefice,
        marge
      };
    })
    .sort((a, b) => b.benefice - a.benefice);
});

const benefitTotals = computed(() => {
  const totals = categoryBenefitStats.value.reduce(
    (totals, row) => {
      totals.ventesHT += row.totalVentesHT;
      totals.achat += row.totalAchat;
      totals.benefice += row.benefice;
      return totals;
    },
    { ventesHT: 0, achat: 0, benefice: 0, marge: 0 }
  );
  totals.marge = totals.ventesHT > 0
    ? (totals.benefice / totals.ventesHT) * 100
    : 0;
  return totals;
});

const categoryStockStats = computed<CategoryStockStat[]>(() => {
  const statsMap: Record<string, { availableQuantity: number; reservedQuantity: number }> = {};

  props.stockAvailables.forEach(stock => {
    const productInfo = props.productCache[stock.id_product];
    if (!productInfo) return;

    const catId = productInfo.category_id || 'Non classé';
    if (!statsMap[catId]) {
      statsMap[catId] = { availableQuantity: 0, reservedQuantity: 0 };
    }

    statsMap[catId].availableQuantity += stock.quantity;
  });

  activeOrders.value.forEach(order => {
    order.products.forEach(product => {
      const productInfo = props.productCache[product.id];
      if (!productInfo) return;

      const catId = productInfo.category_id || 'Non classé';
      if (!statsMap[catId]) {
        statsMap[catId] = { availableQuantity: 0, reservedQuantity: 0 };
      }

      statsMap[catId].reservedQuantity += product.quantity;
    });
  });

  return Object.keys(statsMap)
    .map(catId => {
      const row = statsMap[catId];
      if (!row) {
        return {
          id: catId,
          name: props.categoryCache[catId] || `Catégorie #${catId}`,
          availableQuantity: 0,
          reservedQuantity: 0,
          physicalQuantity: 0
        };
      }
      const physicalQuantity = row.availableQuantity + row.reservedQuantity;

      return {
        id: catId,
        name: props.categoryCache[catId] || `Catégorie #${catId}`,
        availableQuantity: row.availableQuantity,
        reservedQuantity: row.reservedQuantity,
        physicalQuantity
      };
    })
    .sort((a, b) => b.physicalQuantity - a.physicalQuantity);
});

const stockTotals = computed(() => {
  return categoryStockStats.value.reduce(
    (totals, row) => {
      totals.availableQuantity += row.availableQuantity;
      totals.reservedQuantity += row.reservedQuantity;
      totals.physicalQuantity += row.physicalQuantity;
      return totals;
    },
    { availableQuantity: 0, reservedQuantity: 0, physicalQuantity: 0 }
  );
});
</script>

<style scoped>
.category-analytics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.analytics-block {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #21262d;
}

.section-header h2 {
  font-size: 0.9rem;
  font-weight: 700;
  color: #e6edf3;
  margin: 0;
}

.section-badge {
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(56,139,253,0.1);
  color: #388bfd;
  padding: 0.25rem 0.7rem;
  border-radius: 20px;
}

.formula-note {
  font-size: 0.75rem;
  color: #484f58;
  padding: 0.5rem 1.25rem 0;
  margin: 0;
  font-style: italic;
}

.table-wrapper { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
}

thead { background: #0d1117; }

th {
  padding: 0.65rem 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid #21262d;
  white-space: nowrap;
  text-align: left;
}
th.right { text-align: right; }

td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid #1a1f27;
  font-size: 0.825rem;
  color: #8b949e;
}
td.right { text-align: right; }

tbody tr:hover td { background: rgba(255,255,255,0.02); color: #c9d1d9; }

.amount-cell {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #c9d1d9;
}

.positive { color: #3fb950 !important; font-weight: 700; }
.negative { color: #f85149 !important; font-weight: 700; }

.reserved { color: #d29922; font-weight: 600; }
.available { color: #3fb950; font-weight: 600; }

.badge {
  display: inline-block;
  padding: 0.18rem 0.55rem;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge-positive { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-negative { background: rgba(248,81,73,0.12); color: #f85149; }

tfoot .total-row td {
  background: #0d1117;
  border-top: 1px solid #30363d;
  font-weight: 700;
  color: #e6edf3;
}

.empty-state {
  text-align: center;
  padding: 2rem !important;
  color: #484f58;
  font-style: italic;
}

@media (max-width: 1100px) {
  .category-analytics { grid-template-columns: 1fr; }
}
</style>