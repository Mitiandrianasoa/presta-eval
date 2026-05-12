<script setup lang="ts">
import Sidebar from '../../components/Sidebar.vue';
import { onMounted, ref, computed } from 'vue';
import { orderService, type Order, type OrderState } from '../../services/orderService';
import OrderDetails from './OrderDetails.vue';

const orders = ref<Order[]>([]);
const orderStates = ref<OrderState[]>([]);
const selectedOrderId = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const sidebarCollapsed = ref(false); // Ajouté pour contrôler l'état du sidebar

// Fonction pour gérer le toggle du sidebar
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

// Fonction pour ajouter l'état actuel à la liste si absent
const getStatesWithCurrentState = (currentState: string): OrderState[] => {
  const exists = orderStates.value.find(s => s.id === currentState);
  
  //  Log every state to see which has empty ID
  console.log(' All states:', orderStates.value.map((s, i) => `[${i}] id="${s.id}" name="${s.name}"`));
  console.log(' Current state:', currentState, '| Type:', typeof currentState);
  
  if (exists) {
    console.log('✅ Current state found in list');
    return orderStates.value;
  }
  
  // Ajouter l'état actuel même s'il n'existe pas
  const customState: OrderState = { id: currentState, name: `État ${currentState} (personnalisé)` };
  console.log('➕ Adding custom state:', customState);
  return [
    ...orderStates.value,
    customState
  ];
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Charger les statuts et les commandes en parallèle
    const [states, ordersData] = await Promise.all([
      orderService.fetchOrderStates(),
      orderService.fetchAll(),
    ]);
    
    console.log('✅ Statuts chargés:', states.length);
    console.log('📊 State IDs:', states.map((s, i) => `[${i}] id="${s.id}" (type: ${typeof s.id})`));
    console.log('📊 First order:', { 
      id: ordersData[0]?.id,
      current_state: ordersData[0]?.current_state,
      current_state_type: typeof ordersData[0]?.current_state
    });
    
    orderStates.value = states;
    orders.value = ordersData;
  } catch (e: any) {
    error.value = e.message;
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const updateState = async (orderId: string, newState: string) => {
  console.log('📝 updateState appelé desde OrderList:', { orderId, newState, type: typeof orderId });
  
  if (!orderId || orderId.trim() === '') {
    alert('❌ Erreur: ID de commande manquant!');
    return;
  }
  
  try {
    await orderService.updateState(orderId, newState);
    // Recharger les données
    await loadData();
    alert('État mis à jour ✅');
  } catch (e: any) {
    console.error('Erreur complète:', e);
    alert(`Erreur: ${e.message}`);
  }
};

const selectOrder = (orderId: string) => {
  console.log('📍 selectOrder called with:', orderId);
  selectedOrderId.value = orderId;
};

// Handler pour le changement de select avec logging robuste
const handleSelectChange = (event: any, orderId: string) => {
  try {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value;
    
    console.log('✅ handleSelectChange CALLED');
    console.log('Event:', event.type);
    console.log('Target:', target.tagName);
    console.log('Options:', target.options.length);
    
    // 🔍 Log ALL option values to find which is empty
    console.log('🔍 All option values:');
    Array.from(target.options).forEach((opt, i) => {
      console.log(`  [${i}] value="${opt.value}" text="${opt.text}" selected=${opt.selected}`);
    });
    
    console.log('SelectedIndex:', target.selectedIndex);
    console.log('Selected option value:', newValue);
    console.log('Calling updateState with:', { orderId, newValue });
    
    if (newValue && newValue.trim() !== '') {
      updateState(orderId, newValue);
    } else {
      console.warn('⚠️ Value is empty, skipping update');
    }
  } catch (err) {
    console.error('❌ Error in handleSelectChange:', err);
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    
    <!-- Contenu principal -->
    <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="order-list-container">
        <h2>Liste des Commandes</h2>

        <!-- Erreurs -->
        <div v-if="error" class="error-box">
          ❌ {{ error }}
        </div>

        <!-- Chargement -->
        <div v-if="loading" class="loading">
           Chargement...
        </div>

        <!-- Tableau -->
        <div v-if="!loading && orders.length > 0" class="table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Total</th>
                <th>Paiement</th>
                <th>État</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id" :class="{ active: selectedOrderId === order.id }">
                <td class="ref-col">{{ order.reference }}</td>
                <td>{{ order.customer_name }}</td>
                <td class="price-col">{{ order.total_paid }} €</td>
                <td>{{ order.payment || '—' }}</td>
                <td>
                  <select 
                    :value="order.current_state"
                    @change="handleSelectChange($event, order.id)"
                    class="state-select"
                  >
                    <option v-for="state in getStatesWithCurrentState(order.current_state)" 
                      :key="state.id" 
                      :value="state.id"
                      :selected="order.current_state === state.id"
                    >
                      {{ state.name }}
                    </option>
                  </select>
                </td>
                <td class="date-col">{{ new Date(order.date_add).toLocaleDateString('fr-FR') }}</td>
                <td class="actions-col">
                  <button @click="selectOrder(order.id)" class="btn-details">Détails</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pas de données -->
        <div v-if="!loading && orders.length === 0" class="no-data">
          Aucune commande trouvée
        </div>

        <!-- Détails -->
        <div v-if="selectedOrderId" class="details-panel">
          <OrderDetails :orderId="selectedOrderId" :orderStates="orderStates" @close="selectedOrderId = null" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout principal avec sidebar */
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-content {
  flex: 1;
  margin-left: 250px; /* Largeur du sidebar déployé */
  transition: margin-left 0.3s ease;
  padding: 20px;
}

.main-content.sidebar-collapsed {
  margin-left: 70px; /* Largeur du sidebar réduit */
}

/* Styles existants */
.order-list-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

.error-box {
  background-color: #fee;
  border: 1px solid #f99;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 30px;
  color: #666;
}

.table-wrapper {
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.orders-table thead {
  background-color: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.orders-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.orders-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.orders-table tbody tr:hover {
  background-color: #f9f9f9;
}

.orders-table tbody tr.active {
  background-color: #e3f2fd;
}

.ref-col {
  font-weight: 600;
  color: #2196f3;
}

.price-col {
  font-weight: 600;
  color: #4caf50;
}

.date-col {
  font-size: 0.9em;
  color: #666;
}

.state-select {
  padding: 6px 8px;
  border: 1px solid #ddd; 
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  background-color: white;
  width: 100%;
  max-width: 200px;
}

.state-select:hover {
  border-color: #2196f3;
}

.actions-col {
  text-align: center;
}

.btn-details {
  padding: 6px 12px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn-details:hover {
  background-color: #1976d2;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

.details-panel {
  margin-top: 30px;
  border-top: 2px solid #ddd;
  padding-top: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 70px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px;
    font-size: 0.9rem;
  }
}
</style>