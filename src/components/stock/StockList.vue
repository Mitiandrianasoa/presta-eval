<!-- components/stock/StockList.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useStockStore } from '../../stores/stock/stockStore';

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
            <th>Physique</th>
            <th>Réservé</th>
            <th>Disponible</th>
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
            <!-- Stock physique (quantity dans PS mode simplifié) -->
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

            <!-- Réservé : calculé depuis les commandes payées (état 2) -->
            <td>
              <span v-if="stock.reserved > 0" class="reserved-badge">
                {{ stock.reserved }}
              </span>
              <span v-else class="quantity-zero">—</span>
            </td>

            <!-- Disponible = quantity - reserved -->
            <td>
              <span class="quantity" :class="{ low: stock.available < 5, zero: stock.available === 0 }">
                {{ stock.available }}
              </span>
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
.stock-list {
  background: #13131f;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 24px;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.stock-header h2 {
  margin: 0;
  font-size: 20px;
  color: #f1f1f8;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  font-size: 14px;
  width: 250px;
  transition: border-color 0.2s;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: #f97316;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3);
  font-family: inherit;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.07);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: rgba(239,68,68,0.1);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.2);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stock-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat-item {
  background: rgba(16,185,129,0.10);
  padding: 16px 24px;
  border-radius: 10px;
  text-align: center;
  min-width: 140px;
  border: 1px solid rgba(16,185,129,0.15);
}

.stat-item.warning {
  background: rgba(245,158,11,0.10);
  border-color: rgba(245,158,11,0.15);
}

.stat-item.danger {
  background: rgba(239,68,68,0.10);
  border-color: rgba(239,68,68,0.15);
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #10b981;
}

.stat-item.warning .stat-value {
  color: #f59e0b;
}

.stat-item.danger .stat-value {
  color: #ef4444;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
}

.stock-table th,
.stock-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.stock-table th {
  background: rgba(255,255,255,0.03);
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stock-table tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.stock-table tbody tr.out-of-stock {
  background: rgba(239,68,68,0.06);
}

.stock-table tbody tr.low-stock {
  background: rgba(245,158,11,0.06);
}

.product-name {
  font-weight: 500;
  color: #e2e2f0;
}

.quantity {
  font-weight: 600;
  font-size: 15px;
  color: #f1f1f8;
}
.quantity.low  { color: #f59e0b; }
.quantity.zero { color: #ef4444; }

.reserved-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(168,85,247,0.15);
  color: #a855f7;
}
.quantity-zero { color: #4b5563; font-size: 14px; }

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.in-stock {
  background: rgba(16,185,129,0.15);
  color: #10b981;
}

.status-badge.low-stock {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
}

.status-badge.out-of-stock {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.edit-quantity {
  display: flex;
  align-items: center;
}

.quantity-input {
  width: 80px;
  padding: 6px 10px;
  border: 2px solid #f97316;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.quantity-input:focus {
  outline: none;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-save,
.btn-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: rgba(249,115,22,0.15);
  color: #f97316;
}

.btn-edit:hover {
  background: rgba(249,115,22,0.25);
}

.btn-save {
  background: rgba(16,185,129,0.15);
  color: #10b981;
}

.btn-save:hover {
  background: rgba(16,185,129,0.25);
}

.btn-cancel {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.btn-cancel:hover {
  background: rgba(239,68,68,0.25);
}

.btn-edit svg,
.btn-save svg,
.btn-cancel svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #4b5563;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.checkbox-col input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.15);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #f97316;
}

.btn-clear {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #a0a0b8;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-clear:hover {
  background: rgba(255,255,255,0.12);
  color: #f1f1f8;
}
</style>
