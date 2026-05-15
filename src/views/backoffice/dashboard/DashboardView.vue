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
                  @change="applyFilter"
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
                  @change="applyFilter"
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

        <!-- Summary Cards -->
        <div class="summary-row">
          <div class="summary-card accent">
            <div class="summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">Total Général</span>
              <span class="summary-value">{{ formatCurrency(totalGeneralFiltre) }}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon neutral">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/>
              </svg>
            </div>
            <div class="summary-info">
              <span class="summary-label">Commandes totales</span>
              <span class="summary-value neutral-text">{{ totalOrdersFiltre }}</span>
            </div>
          </div>
        </div>

        <!-- Orders by Day -->
        <div class="orders-section">
          <div class="section-header">
            <h2>Commandes par jour</h2>
            <span class="section-badge">{{ totalOrdersFiltre }} commandes</span>
          </div>

          <div class="orders-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="center">Nb de commandes</th>
                  <th class="right">Montant total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(data, date) in ordersByDayFiltre" :key="date">
                  <td class="date-cell">{{ formatDate(date) }}</td>
                  <td class="center">
                    <span class="count-badge">{{ data.count }}</span>
                  </td>
                  <td class="right amount-cell">{{ formatCurrency(data.total) }}</td>
                </tr>
                <tr v-if="Object.keys(ordersByDayFiltre).length === 0">
                  <td colspan="3" class="empty-state">
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
              <tfoot v-if="Object.keys(ordersByDayFiltre).length > 0">
                <tr class="total-row">
                  <td>Total</td>
                  <td class="center">
                    <span class="count-badge total">{{ totalOrdersFiltre }}</span>
                  </td>
                  <td class="right amount-cell total-amount">{{ formatCurrency(totalGeneralFiltre) }}</td>
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

const loading = ref(false);
const error = ref('');
const ordersByDay = ref<Record<string, { count: number; total: number }>>({});
const dateDebut = ref('');
const dateFin = ref('');
const hasActiveFilter = computed(() => !!(dateDebut.value || dateFin.value));

// Données filtrées
const ordersByDayFiltre = computed(() => {
  if (!hasActiveFilter.value) {
    return ordersByDay.value;
  }

  const debut = dateDebut.value ? new Date(dateDebut.value) : null;
  const fin = dateFin.value ? new Date(dateFin.value) : null;
  
  // Ajuster la date de fin pour inclure toute la journée
  if (fin) {
    fin.setHours(23, 59, 59, 999);
  }

  const filtered: Record<string, { count: number; total: number }> = {};
  
  Object.entries(ordersByDay.value).forEach(([date, data]) => {
    const currentDate = new Date(date);
    
    let include = true;
    if (debut && currentDate < debut) include = false;
    if (fin && currentDate > fin) include = false;
    
    if (include) {
      filtered[date] = data;
    }
  });
  
  return filtered;
});

const totalGeneralFiltre = computed(() => {
  return Object.values(ordersByDayFiltre.value).reduce((sum, day) => sum + day.total, 0);
});

const totalOrdersFiltre = computed(() => {
  return Object.values(ordersByDayFiltre.value).reduce((sum, day) => sum + day.count, 0);
});

const loadOrders = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await api.get('/orders?output_format=XML&display=full');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const orderElements = xmlDoc.querySelectorAll('order');

    const dayData: Record<string, { count: number; total: number }> = {};

    orderElements.forEach((orderEl) => {
      const dateAdd = orderEl.querySelector('date_add')?.textContent?.trim() || '';
      const totalPaid = parseFloat(orderEl.querySelector('total_paid')?.textContent?.trim() || '0');

      if (dateAdd) {
        const date = dateAdd.split(' ')[0];

        if (!dayData[date]) {
          dayData[date] = { count: 0, total: 0 };
        }

        dayData[date].count++;
        dayData[date].total += totalPaid;
      }
    });

    const sortedDays = Object.keys(dayData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const sortedData: Record<string, { count: number; total: number }> = {};
    sortedDays.forEach(day => {
      sortedData[day] = dayData[day];
    });

    ordersByDay.value = sortedData;

  } catch (err: any) {
    error.value = `Erreur lors du chargement des commandes: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const applyFilter = () => {
  // Le filtre s'applique automatiquement via les computed properties
};

const resetFilter = () => {
  dateDebut.value = '';
  dateFin.value = '';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
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
/* ─── Layout ─────────────────────────────── */
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

/* ─── Header ─────────────────────────────── */
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
  letter-spacing: -0.02em;
}

.dashboard-header p {
  color: #6c86a3;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

/* ─── Filter Section ─────────────────────── */
.filter-section {
  margin-bottom: 1.5rem;
}

.filter-card {
  background: white;
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(203, 213, 225, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.filter-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  border-color: rgba(59, 130, 246, 0.2);
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
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
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
  margin-bottom: 0px;
  height: fit-content;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

.reset-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 0.35rem 1rem;
  border-radius: 30px;
}

/* ─── Loading ────────────────────────────── */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
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
  animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Error ──────────────────────────────── */
.error-message {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  border: 1px solid #fee2e2;
}

.error-message h3 {
  color: #dc2626;
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.error-message p {
  color: #6b7280;
  margin: 0 0 1.25rem;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.retry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* ─── Dashboard Content ──────────────────── */
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ─── Summary Cards ──────────────────────── */
.summary-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.25rem;
  align-items: start;
}

.summary-card {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(203, 213, 225, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.summary-card.accent {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  max-width: 320px;
  width: auto;
}

.summary-card:not(.accent) {
  max-width: 280px;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.summary-icon {
  width: 52px;
  height: 52px;
  background: rgba(79, 70, 229, 0.1);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #3b82f6;
}

.summary-icon svg {
  width: 26px;
  height: 26px;
}

.summary-card.accent .summary-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.summary-icon.neutral {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.summary-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.summary-card.accent .summary-label {
  color: rgba(255, 255, 255, 0.8);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: white;
  white-space: nowrap;
  overflow-x: auto;
  max-width: 100%;
  display: inline-block;
}

.summary-value.neutral-text {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: normal;
}

/* ─── Orders Section ─────────────────────── */
.orders-section {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.orders-section:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background: linear-gradient(135deg, #fefefe 0%, #fafbfc 100%);
  border-bottom: 1px solid #f0f2f5;
}

.section-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.section-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #2563eb;
  padding: 0.35rem 0.9rem;
  border-radius: 30px;
  letter-spacing: -0.01em;
}

/* ─── Table ──────────────────────────────── */
.orders-table-wrapper {
  overflow-x: auto;
  scroll-behavior: smooth;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

th {
  padding: 1rem 1.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

th.center { text-align: center; }
th.right { text-align: right; }

td {
  padding: 1rem 1.75rem;
  border-bottom: 1px solid #f8fafc;
  font-size: 0.9rem;
  color: #334155;
  transition: all 0.2s;
}

td.center { text-align: center; }
td.right { text-align: right; }

tbody tr {
  transition: all 0.2s ease;
}

tbody tr:hover {
  background: linear-gradient(90deg, #f8fafc 0%, #ffffff 100%);
  transform: scale(1.002);
}

.date-cell {
  font-weight: 600;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.count-badge {
  display: inline-block;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.8rem;
  border-radius: 30px;
  min-width: 42px;
  text-align: center;
  transition: all 0.2s;
}

.count-badge.total {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #0f172a;
}

/* ─── Empty State ────────────────────────── */
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

.empty-message p {
  margin: 0;
  font-size: 0.9rem;
}

/* ─── Footer / Total Row ─────────────────── */
tfoot .total-row td {
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border-top: 2px solid #e2e8f0;
  font-weight: 700;
  padding: 1rem 1.75rem;
}

.total-amount {
  color: #2563eb;
  font-size: 1rem;
  font-weight: 800;
}

/* ─── Responsive ─────────────────────────── */
@media (max-width: 1024px) {
  .dashboard {
    padding: 1.5rem;
  }
  .summary-row {
    grid-template-columns: 1fr;
  }
  .summary-card.accent,
  .summary-card:not(.accent) {
    max-width: 100%;
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
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .date-arrow {
    display: none;
  }
  .reset-btn {
    justify-content: center;
  }
  th, td {
    padding: 0.75rem 1rem;
  }
  .section-header {
    padding: 1rem 1.25rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .summary-value {
    font-size: 1.3rem;
  }
  .summary-icon {
    width: 44px;
    height: 44px;
  }
  .summary-icon svg {
    width: 22px;
    height: 22px;
  }
}
</style>