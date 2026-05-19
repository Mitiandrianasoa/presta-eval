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


.bo-page { background: #0d1117; min-height: 100vh; margin-left: 240px; padding: 2rem; color: #e6edf3; }
.bo-page-header { margin-bottom: 2rem; }
.bo-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.3rem; }
.bo-page-header p { color: #7d8590; margin: 0; font-size: 0.875rem; }

.filters-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.filter-input, .filter-select {
  padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d;
  border-radius: 7px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s;
}
.filter-input:focus, .filter-select:focus { outline: none; border-color: #388bfd; }
.filter-input::placeholder { color: #7d8590; }
.filter-select option { background: #161b22; }
.table-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.mvt-type { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; }
.mvt-in { color: #3fb950; }
.mvt-out { color: #f85149; }
.qty-in { color: #3fb950; font-weight: 600; }
.qty-out { color: #f85149; font-weight: 600; }
.product-link { color: #388bfd; text-decoration: none; font-weight: 500; }
.product-link:hover { text-decoration: underline; }
.loading-state { text-align: center; padding: 3rem; color: #7d8590; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>