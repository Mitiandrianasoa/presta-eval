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

.customer-list { }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 0.75rem; flex-wrap: wrap; }
.search-box { padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 0.875rem; width: 240px; transition: border-color 0.2s; }
.search-box:focus { outline: none; border-color: #388bfd; }
.search-box::placeholder { color: #7d8590; }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.customer-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(56,139,253,0.12); color: #388bfd; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.7rem; }
.customer-name { font-weight: 600; }
.customer-email { font-size: 0.75rem; color: #7d8590; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.badge-active { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-inactive { background: rgba(125,133,144,0.12); color: #7d8590; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; }
.icon-btn:hover { color: #388bfd; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }
.pagination { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.page-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 5px; color: #7d8590; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
.page-btn.active, .page-btn:hover { background: rgba(56,139,253,0.12); border-color: rgba(56,139,253,0.3); color: #388bfd; }

</style>