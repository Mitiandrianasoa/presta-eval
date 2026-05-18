<template>
  <div class="dashboard-layout">
    <Sidebar
      @show-products="goToAdmin('products')"
      @show-categories="goToAdmin('categories')"
      @show-stock="goToAdmin('stock')"
      @show-customers="goToAdmin('customers')"
    />
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="header-text">
          <h1>Dashboard</h1>
          <p>Vue d'ensemble des commandes</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Chargement des données...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-message">
        <h3>Erreur</h3>
        <p>{{ error }}</p>
        <button @click="loadOrders" class="retry-btn">Réessayer</button>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="dashboard-content">

        <!-- Date Filter Section -->
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

        <!-- ============================================ -->
        <!-- SUMMARY CARDS - AVEC HT, TTC, ACHAT, BÉNÉFICE -->
        <!-- ============================================ -->
        <div class="summary-row">
          <!-- Chiffre d'affaires TTC -->
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

          <!-- Chiffre d'affaires HT -->
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

          <!-- Prix d'achat total (Wholesale) -->
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

          <!-- Bénéfice -->
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

        <!-- ============================================ -->
        <!-- STATS RAPIDES -->
        <!-- ============================================ -->
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
        </div>

        <!-- ============================================ -->
        <!-- TABLEAU DÉTAILLÉ PAR JOUR -->
        <!-- ============================================ -->
        <div class="orders-section">
          <div class="section-header">
            <h2>Commandes par jour</h2>
            <span class="section-badge">{{ totalOrders }} commandes</span>
          </div>

          <div class="orders-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="center">Nb Cdes</th>
                  <th class="right">CA HT</th>
                  <th class="right">CA TTC</th>
                  <th class="right">Prix Achat</th>
                  <th class="right">Bénéfice</th>
                  <th class="right">Marge</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(data, date) in ordersByDayFiltered" :key="date">
                  <td class="date-cell">{{ formatDate(date) }}</td>
                  <td class="center">
                    <span class="count-badge">{{ data.count }}</span>
                  </td>
                  <td class="right amount-cell">{{ formatCurrency(data.totalHT) }}</td>
                  <td class="right amount-cell ttc">{{ formatCurrency(data.totalTTC) }}</td>
                  <td class="right amount-cell achat">{{ formatCurrency(data.totalAchat) }}</td>
                  <td class="right amount-cell" :class="data.benefice >= 0 ? 'benefice-positif' : 'benefice-negatif'">
                    {{ formatCurrency(data.benefice) }}
                  </td>
                  <td class="right">
                    <span class="marge-badge" :class="data.marge >= 0 ? 'marge-positive' : 'marge-negative'">
                      {{ data.marge >= 0 ? '+' : '' }}{{ data.marge.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
                <tr v-if="Object.keys(ordersByDayFiltered).length === 0">
                  <td colspan="7" class="empty-state">
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
              <tfoot v-if="Object.keys(ordersByDayFiltered).length > 0">
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="center">
                    <span class="count-badge total">{{ totalOrders }}</span>
                  </td>
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
const goToAdmin = (view: string) => router.push(`/admin?view=${view}`);

// ============================================
// ÉTAT
// ============================================
const loading = ref(false);
const error = ref('');
const dateDebut = ref('');
const dateFin = ref('');

interface DayData {
  count: number;
  totalHT: number;
  totalTTC: number;
  totalAchat: number;
  benefice: number;
  marge: number;
}

const ordersByDay = ref<Record<string, DayData>>({});
const cacheProduits = ref<Record<string, { price: number; wholesale_price: number }>>({});

// ============================================
// COMPUTED
// ============================================
const hasActiveFilter = computed(() => !!(dateDebut.value || dateFin.value));

const ordersByDayFiltered = computed(() => {
  if (!hasActiveFilter.value) return ordersByDay.value;
  
  const debut = dateDebut.value ? new Date(dateDebut.value) : null;
  const fin = dateFin.value ? new Date(dateFin.value) : null;
  if (fin) fin.setHours(23, 59, 59, 999);
  
  const filtered: Record<string, DayData> = {};
  Object.entries(ordersByDay.value).forEach(([date, data]) => {
    const currentDate = new Date(date);
    let include = true;
    if (debut && currentDate < debut) include = false;
    if (fin && currentDate > fin) include = false;
    if (include) filtered[date] = data;
  });
  return filtered;
});

const totalOrders = computed(() => 
  Object.values(ordersByDayFiltered.value).reduce((sum, d) => sum + d.count, 0)
);

const totalHT = computed(() => 
  Object.values(ordersByDayFiltered.value).reduce((sum, d) => sum + d.totalHT, 0)
);

const totalTTC = computed(() => 
  Object.values(ordersByDayFiltered.value).reduce((sum, d) => sum + d.totalTTC, 0)
);

const totalAchat = computed(() => 
  Object.values(ordersByDayFiltered.value).reduce((sum, d) => sum + d.totalAchat, 0)
);

const benefice = computed(() => totalTTC.value - totalAchat.value);

const margePourcentage = computed(() => {
  if (totalTTC.value === 0) return 0;
  return (benefice.value / totalTTC.value) * 100;
});

const tvaTotale = computed(() => totalTTC.value - totalHT.value);

const totalProduitsVendus = ref(0);

const panierMoyen = computed(() => {
  if (totalOrders.value === 0) return 0;
  return totalTTC.value / totalOrders.value;
});

// ============================================
// LOAD ORDERS
// ============================================
const loadOrders = async () => {
  loading.value = true;
  error.value = '';

  try {
    // Charger les commandes
    const response = await api.get('/orders?output_format=XML&display=full&limit=5000');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const orderElements = xmlDoc.querySelectorAll('order');

    // Précharger les produits pour avoir les prix wholesale
    await loadProductCache();

    const dayData: Record<string, DayData> = {};
    let produitsVendusCount = 0;

    for (const orderEl of Array.from(orderElements)) {
      const dateAdd = orderEl.querySelector('date_add')?.textContent?.trim() || '';
      const totalPaidTTC = parseFloat(orderEl.querySelector('total_paid_tax_incl')?.textContent?.trim() || '0');
      const totalProductsHT = parseFloat(orderEl.querySelector('total_products')?.textContent?.trim() || '0');
      const orderId = orderEl.querySelector('id')?.textContent?.trim() || '';

      if (!dateAdd) continue;
      
      const date = dateAdd.split(' ')[0];
      if (!dayData[date]) {
        dayData[date] = { count: 0, totalHT: 0, totalTTC: 0, totalAchat: 0, benefice: 0, marge: 0 };
      }

      dayData[date].count++;
      dayData[date].totalHT += totalProductsHT;
      dayData[date].totalTTC += totalPaidTTC;

      // Calculer le prix d'achat depuis les détails de la commande
      try {
        const orderDetailRes = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
        const orderDetailDoc = parser.parseFromString(orderDetailRes.data, 'text/xml');
        const orderRows = orderDetailDoc.querySelectorAll('order_row');

        let achatCommande = 0;
        
        for (const row of Array.from(orderRows)) {
          const productId = row.querySelector('product_id')?.textContent?.trim() || '';
          const quantity = parseInt(row.querySelector('product_quantity')?.textContent?.trim() || '1');
          
          produitsVendusCount += quantity;

          if (productId && cacheProduits.value[productId]) {
            const wholesalePrice = cacheProduits.value[productId].wholesale_price || 0;
            achatCommande += wholesalePrice * quantity;
          }
        }

        dayData[date].totalAchat += achatCommande;
      } catch (e) {
        console.warn(`⚠️ Impossible de récupérer les détails de la commande ${orderId}`);
      }
    }

    // Calculer le bénéfice et la marge pour chaque jour
    Object.values(dayData).forEach(data => {
      data.benefice = data.totalTTC - data.totalAchat;
      data.marge = data.totalTTC > 0 ? (data.benefice / data.totalTTC) * 100 : 0;
    });

    // Trier par date décroissante
    const sortedDays = Object.keys(dayData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const sortedData: Record<string, DayData> = {};
    sortedDays.forEach(day => { sortedData[day] = dayData[day]; });

    ordersByDay.value = sortedData;
    totalProduitsVendus.value = produitsVendusCount;

  } catch (err: any) {
    error.value = `Erreur lors du chargement: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

// ============================================
// CACHE PRODUITS
// ============================================
const loadProductCache = async () => {
  try {
    const response = await api.get('/products?output_format=XML&display=[id,price,wholesale_price]&limit=5000');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const products = xmlDoc.querySelectorAll('product');

    products.forEach(product => {
      const id = product.querySelector('id')?.textContent?.trim() || '';
      const price = parseFloat(product.querySelector('price')?.textContent?.trim() || '0');
      const wholesalePrice = parseFloat(product.querySelector('wholesale_price')?.textContent?.trim() || '0');
      
      if (id) {
        cacheProduits.value[id] = { price, wholesale_price: wholesalePrice };
      }
    });

    console.log(`📦 ${Object.keys(cacheProduits.value).length} produits en cache`);
  } catch (e) {
    console.warn('⚠️ Erreur chargement cache produits:', e);
  }
};

// ============================================
// HELPERS
// ============================================
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
/* === LAYOUT === */
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

/* === FILTER === */
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
  cursor: pointer;
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

/* === LOADING / ERROR === */
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

/* === SUMMARY CARDS === */
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

/* === STATS MINI === */
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

/* === TABLE === */
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
  min-width: 900px;
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

th.center { text-align: center; }
th.right { text-align: right; }

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f8fafc;
  font-size: 0.85rem;
  color: #334155;
}

td.center { text-align: center; }
td.right { text-align: right; }

tbody tr:hover {
  background: #f8fafc;
}

.date-cell {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.count-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.7rem;
  border-radius: 30px;
  min-width: 36px;
  text-align: center;
}

.count-badge.total {
  background: #3b82f6;
  color: white;
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

/* === TOTAL ROW === */
tfoot .total-row td {
  background: #fefce8;
  border-top: 2px solid #e2e8f0;
  font-weight: 700;
  padding: 1rem;
}

/* === EMPTY === */
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

/* === RESPONSIVE === */
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