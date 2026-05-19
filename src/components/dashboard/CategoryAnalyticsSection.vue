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
import { calculateCategoryBenefitStats, calculateCategoryStockStats } from '../../services/categoryStatsService';

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

const categoryBenefitStats = computed(() => {
  return calculateCategoryBenefitStats(activeOrders.value, props.productCache, props.categoryCache);
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

const categoryStockStats = computed(() => {
  return calculateCategoryStockStats(activeOrders.value, props.productCache, props.categoryCache, props.stockAvailables);
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
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.analytics-block {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.3);
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
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.section-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: #eff6ff;
  color: #2563eb;
  padding: 0.35rem 0.9rem;
  border-radius: 30px;
}

.formula-note {
  margin: 0;
  padding: 1rem 1.75rem 0;
  font-size: 0.8rem;
  color: #64748b;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
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

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f8fafc;
  font-size: 0.85rem;
  color: #334155;
}

.right {
  text-align: right;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.positive {
  color: #10b981;
  font-weight: 700;
}

.negative {
  color: #ef4444;
  font-weight: 700;
}

.reserved {
  color: #8b5cf6;
  font-weight: 700;
}

.available {
  color: #2563eb;
  font-weight: 700;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge-positive {
  background: #d1fae5;
  color: #065f46;
}

.badge-negative {
  background: #fee2e2;
  color: #991b1b;
}

.total-row td {
  background: #fefce8;
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 1.5rem !important;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>