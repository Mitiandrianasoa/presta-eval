<!-- components/customer/CustomerList.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useCustomerStore } from '../../stores/customer/customerStore';

const store = useCustomerStore();
const searchQuery = ref('');
const selectedCustomers = ref<string[]>([]);

onMounted(() => store.fetchAll());

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return store.customers;
  const query = searchQuery.value.toLowerCase();
  return store.customers.filter(c => 
    c.email?.toLowerCase().includes(query) || 
    c.firstname?.toLowerCase().includes(query) ||
    c.lastname?.toLowerCase().includes(query) ||
    c.company?.toLowerCase().includes(query)
  );
});

const isAllSelected = computed(() => {
  return filteredCustomers.value.length > 0 && selectedCustomers.value.length === filteredCustomers.value.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCustomers.value = [];
  } else {
    selectedCustomers.value = filteredCustomers.value.map(c => c.id);
  }
};

const toggleCustomer = (id: string) => {
  const index = selectedCustomers.value.indexOf(id);
  if (index === -1) {
    selectedCustomers.value.push(id);
  } else {
    selectedCustomers.value.splice(index, 1);
  }
};

const remove = async (id: string) => {
  if (confirm('Supprimer ce client ?')) await store.remove(id);
};
</script>

<template>
  <div class="customer-list">
    <div class="customer-header">
      <h2>Gestion des Clients</h2>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un client..."
          class="search-input"
        />
        <button class="refresh-btn" @click="store.fetchAll" :disabled="store.loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Rafraîchir
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading">
      <div class="spinner"></div>
      <p>Chargement des clients...</p>
    </div>

    <div v-else-if="store.error" class="error-message">
      {{ store.error }}
    </div>

    <div v-else class="customer-content">
      <div v-if="selectedCustomers.length > 0" class="selection-bar">
        <span>{{ selectedCustomers.length }} client(s) sélectionné(s)</span>
        <button class="btn-clear" @click="selectedCustomers = []">Désélectionner</button>
      </div>

      <div class="customer-stats">
        <div class="stat-item">
          <span class="stat-value">{{ store.customers.length }}</span>
          <span class="stat-label">Total clients</span>
        </div>
        <div class="stat-item active">
          <span class="stat-value">{{ store.customers.filter(c => c.active === '1').length }}</span>
          <span class="stat-label">Actifs</span>
        </div>
        <div class="stat-item inactive">
          <span class="stat-value">{{ store.customers.filter(c => c.active === '0').length }}</span>
          <span class="stat-label">Inactifs</span>
        </div>
      </div>

      <table class="customer-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                :disabled="filteredCustomers.length === 0"
              />
            </th>
            <th>ID</th>
            <th>Email</th>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Société</th>
            <th>Statut</th>
            <th>Newsletter</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in filteredCustomers" :key="customer.id" :class="{ inactive: customer.active === '0' }">
            <td class="checkbox-col">
              <input
                type="checkbox"
                :checked="selectedCustomers.includes(customer.id)"
                @change="toggleCustomer(customer.id)"
              />
            </td>
            <td>{{ customer.id }}</td>
            <td class="email">{{ customer.email }}</td>
            <td>{{ customer.firstname }}</td>
            <td>{{ customer.lastname }}</td>
            <td>{{ customer.company || '-' }}</td>
            <td>
              <span class="status-badge" :class="customer.active === '1' ? 'active' : 'inactive'">
                {{ customer.active === '1' ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <span class="newsletter-badge" :class="customer.newsletter === '1' ? 'subscribed' : ''">
                {{ customer.newsletter === '1' ? '✓' : '-' }}
              </span>
            </td>
            <td>
              <button @click="remove(customer.id)" class="btn-delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredCustomers.length === 0" class="empty-state">
        <p>Aucun client trouvé</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.customer-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  width: 250px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #2980b9;
}

.refresh-btn:disabled {
  opacity: 0.6;
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
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #e3f2fd;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1976d2;
}

.btn-clear {
  background: #fff;
  border: 1px solid #1976d2;
  color: #1976d2;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #1976d2;
  color: white;
}

.customer-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat-item {
  background: #e8f5e9;
  padding: 16px 24px;
  border-radius: 8px;
  text-align: center;
  min-width: 120px;
}

.stat-item.active {
  background: #e3f2fd;
}

.stat-item.inactive {
  background: #ffebee;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #2e7d32;
}

.stat-item.active .stat-value {
  color: #1976d2;
}

.stat-item.inactive .stat-value {
  color: #c62828;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.customer-table {
  width: 100%;
  border-collapse: collapse;
}

.customer-table th,
.customer-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.customer-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #34495e;
  font-size: 13px;
}

.customer-table tbody tr:hover {
  background: #f5f5f5;
}

.customer-table tbody tr.inactive {
  background: #fafafa;
  opacity: 0.7;
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

.email {
  font-weight: 500;
  color: #1976d2;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background: #ffebee;
  color: #c62828;
}

.newsletter-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  font-size: 14px;
  color: #999;
}

.newsletter-badge.subscribed {
  background: #e8f5e9;
  color: #2e7d32;
}

.btn-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #ffebee;
  color: #c62828;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #ffcdd2;
}

.btn-delete svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
