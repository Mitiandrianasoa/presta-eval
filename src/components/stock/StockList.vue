<!-- components/stock/StockList.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useStockStore } from '../../stores/stock/stockStore';
import Sidebar from '../Sidebar.vue';

const stockStore = useStockStore();
const searchQuery = ref('');
const editingStock = ref<string | null>(null);
const newQuantity = ref<number>(0);
const selectedStocks = ref<string[]>([]);

const isAllSelected = computed(() => {
  return filteredStocks.value.length > 0 && selectedStocks.value.length === filteredStocks.value.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedStocks.value = [];
  } else {
    selectedStocks.value = filteredStocks.value.map(s => s.id);
  }
};

const toggleStock = (id: string) => {
  const index = selectedStocks.value.indexOf(id);
  if (index === -1) {
    selectedStocks.value.push(id);
  } else {
    selectedStocks.value.splice(index, 1);
  }
};

onMounted(() => {
  stockStore.fetchAll();
});

const filteredStocks = computed(() => {
  if (!searchQuery.value) return stockStore.stocks;
  const query = searchQuery.value.toLowerCase();
  return stockStore.stocks.filter(s => 
    s.product_name?.toLowerCase().includes(query) || 
    s.id_product?.toLowerCase().includes(query) ||
    s.id?.toLowerCase().includes(query)
  );
});

export interface Stock {
  id: string;
  id_product: string;
  id_product_attribute: string;
  quantity: number;

  id_warehouse?: string;
  id_currency?: string;

  product_name?: string;
  combination_name?: string;
};
const startEdit = (stock: any) => {
  editingStock.value = stock.id;
  newQuantity.value = stock.quantity;
};

const cancelEdit = () => {
  editingStock.value = null;
  newQuantity.value = 0;
};

const goToListMvt = () => {
  window.location.href = '/stocks/movements';
};

const saveQuantity = async (id: string) => {
  await stockStore.updateQuantity(id, newQuantity.value);
  editingStock.value = null;
};

const getStockClass = (quantity: number) => {
  if (quantity === 0) return 'out-of-stock';
  if (quantity < 5) return 'low-stock';
  return 'in-stock';
};
</script>

<template>
  <Sidebar> </Sidebar>
  <div class="stock-list">
    <div class="stock-header">
      <h2>Gestion des Stocks</h2>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un produit..."
          class="search-input"
        />
        <button class="refresh-btn" @click="goToListMvt()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Voir les mouvements de stock
        </button>
      </div>
    </div>

    <div v-if="stockStore.loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des stocks...</p>
    </div>

    <div v-else-if="stockStore.error" class="error-message">
      {{ stockStore.error }}
    </div>

    <div v-else class="stock-content">
      <div v-if="selectedStocks.length > 0" class="selection-bar">
        <span>{{ selectedStocks.length }} stock(s) sélectionné(s)</span>
        <button class="btn-clear" @click="selectedStocks = []">Désélectionner</button>
      </div>

      <div class="stock-stats">
        <div class="stat-item">
          <span class="stat-value">{{ stockStore.stocks.length }}</span>
          <span class="stat-label">Produits en stock</span>
        </div>
        <div class="stat-item warning">
          <span class="stat-value">{{ stockStore.stocks.filter(s => s.quantity < 5 && s.quantity > 0).length }}</span>
          <span class="stat-label">Stock faible</span>
        </div>
        <div class="stat-item danger">
          <span class="stat-value">{{ stockStore.stocks.filter(s => s.quantity === 0).length }}</span>
          <span class="stat-label">Rupture de stock</span>
        </div>
      </div>

      <table class="stock-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                :disabled="filteredStocks.length === 0"
              />
            </th>
            <th>ID</th>
            <th>ID Produit</th>
            <th>Nom du produit</th>
            <th>Déclinaison</th>
            <th>Quantité</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in filteredStocks" :key="stock.id" :class="getStockClass(stock.quantity)">
            <td class="checkbox-col">
              <input
                type="checkbox"
                :checked="selectedStocks.includes(stock.id)"
                @change="toggleStock(stock.id)"
              />
            </td>
            <td>{{ stock.id }}</td>
            <td>{{ stock.id_product }}</td>
            <td class="product-name">{{ stock.product_name || 'Produit inconnu' }}</td>
            <td>{{ stock.combination_name || (stock.id_product_attribute !== '0' ? `#${stock.id_product_attribute}` : '-') }}</td>
            <td>
              <div v-if="editingStock === stock.id" class="edit-quantity">
                <input
                  v-model.number="newQuantity"
                  type="number"
                  min="0"
                  class="quantity-input"
                />
              </div>
              <span v-else class="quantity">{{ stock.quantity }}</span>
            </td>
            <td>
              <span class="status-badge" :class="getStockClass(stock.quantity)">
                {{ stock.quantity === 0 ? 'Épuisé' : stock.quantity < 5 ? 'Faible' : 'OK' }}
              </span>
            </td>
            <td>
              <div v-if="editingStock === stock.id" class="action-buttons">
                <button class="btn-save" @click="saveQuantity(stock.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button class="btn-cancel" @click="cancelEdit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <button v-else class="btn-edit" @click="startEdit(stock)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredStocks.length === 0" class="empty-state">
        <p>Aucun stock trouvé</p>
      </div>
    </div>
  </div>
</template>

<style scoped>

.stock-list { }
.filters-row { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.filter-input, .filter-select {
  padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d;
  border-radius: 7px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s;
}
.filter-input:focus, .filter-select:focus { outline: none; border-color: #388bfd; }
.filter-input::placeholder { color: #7d8590; }
.filter-select option { background: #161b22; }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.stock-qty { font-weight: 600; }
.stock-qty.ok { color: #3fb950; }
.stock-qty.low { color: #d29922; }
.stock-qty.zero { color: #f85149; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.badge-ok { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-low { background: rgba(210,153,34,0.12); color: #d29922; }
.badge-zero { background: rgba(248,81,73,0.12); color: #f85149; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; }
.icon-btn:hover { color: #388bfd; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }

</style>