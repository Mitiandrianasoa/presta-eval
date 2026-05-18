<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStockStore } from '../../../stores/stock/stockStore';
import Sidebar from '../../../components/Sidebar.vue';

const stockStore = useStockStore();

// ============================================
// FILTRES
// ============================================
const searchQuery = ref('');
const dateDebut = ref('');
const dateFin = ref('');
const filterReason = ref('');
const filterProduct = ref('');

// ============================================
// ÉTAT
// ============================================
const loading = ref(false);
const allMovements = ref<any[]>([]);
const currentPage = ref(1);
const itemsPerPage = 50;

onMounted(async () => {
  await loadAllMovements();
});

// ============================================
// CHARGER TOUS LES MOUVEMENTS
// ============================================
const loadAllMovements = async () => {
  loading.value = true;
  
  try {
    // D'abord charger les stocks pour avoir les noms des produits
    await stockStore.fetchAll();
    
    // Récupérer tous les mouvements
    const allMvts: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const url = `/stock_movements?output_format=XML&display=full`;
      
      const response = await (await import('../../../api/api')).default.get(url);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const movements = xmlDoc.querySelectorAll('stock_mvt');
      
      if (movements.length === 0) {
        hasMore = false;
        break;
      }
      
      movements.forEach(mvt => {
        const idStock = mvt.querySelector('id_stock')?.textContent?.trim() || '';
        const physicalQuantity = parseInt(mvt.querySelector('physical_quantity')?.textContent?.trim() || '0');
        const sign = parseInt(mvt.querySelector('sign')?.textContent?.trim() || '1');
        const quantity = physicalQuantity * sign;
        
        // Trouver le stock correspondant
        const stock = stockStore.stocks.find(s => s.id === idStock);
        
        allMvts.push({
          id: mvt.querySelector('id_stock_mvt')?.textContent?.trim() || '',
          id_stock: idStock,
          date: (mvt.querySelector('date_add')?.textContent?.trim() || '').split(' ')[0],
          employee: [
            mvt.querySelector('employee_firstname')?.textContent?.trim(),
            mvt.querySelector('employee_lastname')?.textContent?.trim()
          ].filter(Boolean).join(' ') || '—',
          quantity,
          reason_id: mvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || '',
          reason: getReasonLabel(mvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || ''),
          product_name: stock?.product_name || `Produit #${stock?.id_product || '?'}`,
          combination_name: stock?.combination_name || '-',
          price_te: mvt.querySelector('price_te')?.textContent?.trim() || '0',
        });
      });
      
      if (movements.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    
    allMovements.value = allMvts;
    console.log(`✅ ${allMvts.length} mouvements chargés`);
    
  } catch (error) {
    console.error('❌ Erreur chargement mouvements:', error);
  } finally {
    loading.value = false;
  }
};

// ============================================
// LABEL RAISON
// ============================================
const getReasonLabel = (id: string): string => {
  const reasonMap: Record<string, string> = {
    '1': 'Augmentation',
    '2': 'Diminution',
    '3': 'Commande client',
    '4': 'Régularisation',
    '5': 'Retour produit',
    '6': 'Ajout fournisseur',
  };
  return reasonMap[id] || `Raison #${id}`;
};

// ============================================
// FILTRAGE
// ============================================
const filteredMovements = computed(() => {
  let result = allMovements.value;
  
  // Filtre par recherche
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(m => 
      m.product_name.toLowerCase().includes(q) ||
      m.employee.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      m.id_stock.includes(q)
    );
  }
  
  // Filtre par date début
  if (dateDebut.value) {
    result = result.filter(m => m.date >= dateDebut.value);
  }
  
  // Filtre par date fin
  if (dateFin.value) {
    result = result.filter(m => m.date <= dateFin.value);
  }
  
  // Filtre par raison
  if (filterReason.value) {
    result = result.filter(m => m.reason_id === filterReason.value);
  }
  
  // Filtre par produit (recherche exacte)
  if (filterProduct.value) {
    const q = filterProduct.value.toLowerCase();
    result = result.filter(m => m.product_name.toLowerCase().includes(q));
  }
  
  return result;
});

// ============================================
// PAGINATION
// ============================================
const totalPages = computed(() => Math.ceil(filteredMovements.value.length / itemsPerPage));

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredMovements.value.slice(start, end);
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// ============================================
// STATISTIQUES
// ============================================
const stats = computed(() => {
  const total = filteredMovements.value.length;
  const entrees = filteredMovements.value.filter(m => m.quantity > 0).length;
  const sorties = filteredMovements.value.filter(m => m.quantity < 0).length;
  const quantiteTotale = filteredMovements.value.reduce((sum, m) => sum + m.quantity, 0);
  
  return { total, entrees, sorties, quantiteTotale };
});

// ============================================
// RÉINITIALISER LES FILTRES
// ============================================
const resetFilters = () => {
  searchQuery.value = '';
  dateDebut.value = '';
  dateFin.value = '';
  filterReason.value = '';
  filterProduct.value = '';
  currentPage.value = 1;
};

const goToStockList = () => {
  window.location.href = '/stocks/movements';
};
</script>

<template>
  <Sidebar />
  <div class="movements-page">
    
    <!-- ======================================== -->
    <!-- EN-TÊTE -->
    <!-- ======================================== -->
    <div class="page-header">
      <div>
        <h2> Historique des Mouvements de Stock</h2>
        <p class="subtitle">Toutes les entrées et sorties de stock</p>
      </div>
       <button class="refresh-btn" @click="goToStockList">
         Revenir à la liste des stocks
      </button>
    </div>

    <!-- ======================================== -->
    <!-- STATISTIQUES -->
    <!-- ======================================== -->
    <div class="stats-bar">
      
      <div class="stat-card">
        <span class="stat-number">{{ stats.total }}</span>
        <span class="stat-label">Mouvements</span>
      </div>
      <div class="stat-card stat-green">
        <span class="stat-number">{{ stats.entrees }}</span>
        <span class="stat-label">Entrées</span>
      </div>
      <div class="stat-card stat-red">
        <span class="stat-number">{{ stats.sorties }}</span>
        <span class="stat-label">Sorties</span>
      </div>
      <!-- <div class="stat-card" :class="stats.quantiteTotale >= 0 ? 'stat-green' : 'stat-red'">
        <span class="stat-number">{{ stats.quantiteTotale > 0 ? '+' : '' }}{{ stats.quantiteTotale }}</span>
        <span class="stat-label">Quantité nette</span>
      </div> -->
    </div>

    <!-- ======================================== -->
    <!-- FILTRES -->
    <!-- ======================================== -->
    <div class="filters-bar">
      <div class="filter-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 Rechercher (produit, employé, raison...)"
          class="search-input"
        />
      </div>
      
      <div class="filter-group">
        <label>Du</label>
        <input v-model="dateDebut" type="date" class="date-input" />
      </div>
      
      <div class="filter-group">
        <label>Au</label>
        <input v-model="dateFin" type="date" class="date-input" />
      </div>
      
      <div class="filter-group">
        <select v-model="filterReason" class="select-input">
          <option value="">Toutes les raisons</option>
          <option value="1">Augmentation</option>
          <option value="2">Diminution</option>
          <option value="3">Commande client</option>
          <option value="4">Régularisation</option>
          <option value="5">Retour produit</option>
          <option value="6">Ajout fournisseur</option>
        </select>
      </div>
      
      <button class="btn-reset" @click="resetFilters">
        ✖ Réinitialiser
      </button>
    </div>

    <!-- ======================================== -->
    <!-- LOADING / ERROR -->
    <!-- ======================================== -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des mouvements...</p>
    </div>

    <div v-else-if="allMovements.length === 0" class="empty-state">
      <p>📭 Aucun mouvement de stock trouvé</p>
    </div>

    <!-- ======================================== -->
    <!-- TABLEAU -->
    <!-- ======================================== -->
    <div v-else class="table-container">
      <table class="movements-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Produit</th>
            <th>Déclinaison</th>
            <th>Employé</th>
            <th>Quantité</th>
            <th>Raison</th>
            <!-- <th>Prix unitaire</th> -->
          </tr>
        </thead>
        
        <tbody>
          <tr
            v-for="(mvt, index) in paginatedMovements"
            :key="index"
            :class="mvt.quantity > 0 ? 'row-positive' : 'row-negative'"
          >
            <td class="date-cell">{{ mvt.date }}</td>
            <td class="product-cell">{{ mvt.product_name }}</td>
            <td>{{ mvt.combination_name }}</td>
            <td>{{ mvt.employee }}</td>
            <td>
              <span :class="mvt.quantity > 0 ? 'qty-positive' : 'qty-negative'">
                {{ mvt.quantity > 0 ? '+' : '' }}{{ mvt.quantity }}
              </span>
            </td>
            <td>
              <span class="reason-badge" :class="'reason-' + mvt.reason_id">
                {{ mvt.reason }}
              </span>
            </td>
            <!-- <td>{{ parseFloat(mvt.price_te).toFixed(2) }} €</td> -->
          </tr>
        </tbody>
      </table>

      <!-- ======================================== -->
      <!-- PAGINATION -->
      <!-- ======================================== -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          :disabled="currentPage === 1"
          @click="goToPage(1)"
          class="page-btn"
        >
          ⏮
        </button>
        <button
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
          class="page-btn"
        >
          ◀
        </button>
        
        <span class="page-info">
          Page {{ currentPage }} / {{ totalPages }}
          ({{ filteredMovements.length }} résultats)
        </span>
        
        <button
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
          class="page-btn"
        >
          ▶
        </button>
        <button
          :disabled="currentPage === totalPages"
          @click="goToPage(totalPages)"
          class="page-btn"
        >
          ⏭
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.movements-page {
  background: #0d0d14;
  padding: 32px 40px;
  min-height: 100vh;
  margin-left: 240px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #f1f1f8;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.refresh-btn {
  padding: 10px 20px;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3);
  font-family: inherit;
}

.refresh-btn:hover {
  opacity: 0.88;
}

/* ============================================ */
/* STATISTIQUES */
/* ============================================ */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #13131f;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.06);
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #f1f1f8;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  text-transform: uppercase;
}

.stat-green .stat-number {
  color: #10b981;
}

.stat-red .stat-number {
  color: #ef4444;
}

/* ============================================ */
/* FILTRES */
/* ============================================ */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 16px;
  background: #13131f;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.search-input {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 6px;
  width: 300px;
  font-size: 14px;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.date-input {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 6px;
  font-size: 14px;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.select-input {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 6px;
  font-size: 14px;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.btn-reset {
  padding: 10px 16px;
  background: rgba(239,68,68,0.15);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.22);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  font-family: inherit;
}

.btn-reset:hover {
  background: rgba(239,68,68,0.25);
}

/* ============================================ */
/* TABLEAU */
/* ============================================ */
.table-container {
  overflow-x: auto;
}

.movements-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.movements-table th,
.movements-table td {
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  text-align: left;
}

.movements-table th {
  background: rgba(255,255,255,0.03);
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  z-index: 1;
}

.movements-table tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.row-positive {
  border-left: 3px solid #10b981;
}

.row-negative {
  border-left: 3px solid #ef4444;
}

.date-cell {
  white-space: nowrap;
  color: #6b7280;
}

.product-cell {
  font-weight: 500;
  color: #e2e2f0;
}

.qty-positive {
  color: #10b981;
  font-weight: bold;
  font-size: 16px;
}

.qty-negative {
  color: #ef4444;
  font-weight: bold;
  font-size: 16px;
}

/* ============================================ */
/* BADGES RAISON */
/* ============================================ */
.reason-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.reason-1 { background: rgba(16,185,129,0.15);  color: #10b981; }
.reason-2 { background: rgba(239,68,68,0.15);   color: #f87171; }
.reason-3 { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.reason-4 { background: rgba(249,115,22,0.15);  color: #f97316; }
.reason-5 { background: rgba(168,85,247,0.15);  color: #a855f7; }
.reason-6 { background: rgba(6,182,212,0.15);   color: #22d3ee; }

/* ============================================ */
/* PAGINATION */
/* ============================================ */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding: 16px 0;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: #13131f;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #a0a0b8;
  transition: all 0.2s;
  font-family: inherit;
}

.page-btn:hover:not(:disabled) {
  background: #f97316;
  color: white;
  border-color: #f97316;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  padding: 0 16px;
  color: #6b7280;
  font-size: 14px;
}

/* ============================================ */
/* ÉTATS */
/* ============================================ */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.07);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #4b5563;
  font-size: 16px;
}

.error-message {
  background: rgba(239,68,68,0.10);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.18);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}
</style>