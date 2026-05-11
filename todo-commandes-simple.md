# TODO - Liste Commandes (Simple & Gérable)

## 📌 Vue d'ensemble
Afficher une liste de commandes PrestaShop avec:
- Liste simple des commandes
- Détails de chaque commande (état, paiement, client, articles)
- Modification de l'état
- Gestion de l'état de paiement

---

## ✅ ÉTAPE 1: Créer le Store Pinia pour les Commandes

**Fichier:** `src/stores/order/orderStore.ts`

**Code simple et gérable:**

```typescript
import { defineStore } from 'pinia';
import api from '../../api/api';
import { orderStateService, type OrderState } from '../../services/orderStateService';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const attr = (el: Element, attName: string) => el.getAttribute(attName) || '';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_reference: string;
  quantity: string;
  price: string;
}

export interface Order {
  id: string;
  reference: string;
  id_customer: string;
  customer_name: string;
  total_paid: string;
  payment: string;
  current_state: string;
  date_add: string;
  date_upd: string;
  items: OrderItem[];
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[],
    selectedOrder: null as Order | null,
    orderStates: [] as OrderState[], // Les statuts depuis l'API
    loading: false,
    statesLoading: false, // Chargement des statuts
    error: null as string | null,
  }),

  getters: {
    // État lisible en français depuis l'API
    getStateLabel: (state) => (stateId: string) => {
      return orderStateService.getStateName(state.orderStates, stateId);
    },

    // État de paiement lisible
    getPaymentLabel: (state) => (payment: string) => {
      return payment || 'Non précisé';
    },
  },

  actions: {
    // Charger les statuts de commandes depuis l'API
    async fetchOrderStates() {
      this.statesLoading = true;
      try {
        this.orderStates = await orderStateService.fetchOrderStates();
      } catch (e: any) {
        console.error('Erreur chargement statuts:', e);
      } finally {
        this.statesLoading = false;
      }
    },

    // Récupérer toutes les commandes
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/orders?output_format=XML&display=full&limit=5000');
        const xmlDoc = parse(res.data);
        
        this.orders = Array.from(xmlDoc.querySelectorAll('order')).map(orderEl => {
          const id = attr(orderEl, 'id');
          const items: OrderItem[] = Array.from(orderEl.querySelectorAll('associations order_row')).map(itemEl => ({
            id: text(itemEl, 'id'),
            product_id: text(itemEl, 'product_id'),
            product_name: text(itemEl, 'product_name'),
            product_reference: text(itemEl, 'product_reference'),
            quantity: text(itemEl, 'product_quantity'),
            price: text(itemEl, 'product_price'),
          }));

          return {
            id,
            reference: text(orderEl, 'reference'),
            id_customer: text(orderEl, 'id_customer'),
            customer_name: text(orderEl, 'customer_name'),
            total_paid: text(orderEl, 'total_paid'),
            payment: text(orderEl, 'payment'),
            current_state: text(orderEl, 'current_state'),
            date_add: text(orderEl, 'date_add'),
            date_upd: text(orderEl, 'date_upd'),
            items,
          };
        });
      } catch (e: any) {
        this.error = `Erreur chargement: ${e.message}`;
        console.error(e);
      } finally {
        this.loading = false;
      }
    },

    // Récupérer UNE commande par ID
    async fetchById(id: string) {
      try {
        const res = await api.get(`/orders/${id}?output_format=XML&display=full`);
        const xmlDoc = parse(res.data);
        const orderEl = xmlDoc.querySelector('order');

        if (orderEl) {
          const items: OrderItem[] = Array.from(orderEl.querySelectorAll('associations order_row')).map(itemEl => ({
            id: text(itemEl, 'id'),
            product_id: text(itemEl, 'product_id'),
            product_name: text(itemEl, 'product_name'),
            product_reference: text(itemEl, 'product_reference'),
            quantity: text(itemEl, 'product_quantity'),
            price: text(itemEl, 'product_price'),
          }));

          this.selectedOrder = {
            id: attr(orderEl, 'id'),
            reference: text(orderEl, 'reference'),
            id_customer: text(orderEl, 'id_customer'),
            customer_name: text(orderEl, 'customer_name'),
            total_paid: text(orderEl, 'total_paid'),
            payment: text(orderEl, 'payment'),
            current_state: text(orderEl, 'current_state'),
            date_add: text(orderEl, 'date_add'),
            date_upd: text(orderEl, 'date_upd'),
            items,
          };
        }
      } catch (e: any) {
        this.error = `Erreur chargement commande: ${e.message}`;
        console.error(e);
      }
    },

    // Modifier l'état de la commande
    async updateState(orderId: string, newState: string) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><order>
  <id>${orderId}</id>
  <current_state>${newState}</current_state>
</order></prestashop>`;

      try {
        await api.put(`/orders/${orderId}`, xml, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });
        // Recharger après mise à jour
        await this.fetchAll();
      } catch (e: any) {
        this.error = `Erreur mise à jour: ${e.message}`;
        console.error(e);
        throw e;
      }
    },

    // Modifier le paiement
    async updatePayment(orderId: string, paymentMethod: string) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><order>
  <id>${orderId}</id>
  <payment>${paymentMethod}</payment>
</order></prestashop>`;

      try {
        await api.put(`/orders/${orderId}`, xml, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });
        await this.fetchAll();
      } catch (e: any) {
        this.error = `Erreur mise à jour paiement: ${e.message}`;
        console.error(e);
        throw e;
      }
    },

    // Réinitialiser sélection
    clearSelection() {
      this.selectedOrder = null;
    },
  },
});
```

---

## ✅ ÉTAPE 2: Créer le Composant Liste Commandes

**Fichier:** `src/components/order/OrderList.vue`

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useOrderStore } from '../../stores/order/orderStore';

const orderStore = useOrderStore();
const selectedOrderId = ref<string | null>(null);

const stateOptions = [
  { id: '1', label: 'En attente de paiement' },
  { id: '2', label: 'Paiement accepté' },
  { id: '3', label: 'Paiement effectué' },
  { id: '4', label: 'Annulée' },
  { id: '5', label: 'Erreur de paiement' },
  { id: '6', label: 'Livrée' },
];

onMounted(() => {
  orderStore.fetchAll();
});

const selectOrder = (orderId: string) => {
  selectedOrderId.value = orderId;
};

const updateState = async (orderId: string, newState: string) => {
  try {
    await orderStore.updateState(orderId, newState);
    alert('État mis à jour ✅');
  } catch (e) {
    alert('Erreur lors de la mise à jour');
  }
};
</script>

<template>
  <div class="order-list-container">
    <h2>📋 Liste des Commandes</h2>

    <!-- Affichage des erreurs -->
    <div v-if="orderStore.error" class="error-box">
      ❌ {{ orderStore.error }}
    </div>

    <!-- Chargement -->
    <div v-if="orderStore.loading" class="loading">
      ⏳ Chargement des commandes...
    </div>

    <!-- Tableau des commandes -->
    <div v-if="!orderStore.loading && orderStore.orders.length > 0" class="table-wrapper">
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
          <tr v-for="order in orderStore.orders" :key="order.id" :class="{ active: selectedOrderId === order.id }">
            <td class="ref-col">{{ order.reference }}</td>
            <td>{{ order.customer_name }}</td>
            <td class="price-col">{{ order.total_paid }} €</td>
            <td>{{ order.payment || '—' }}</td>
            <td>
              <select 
                :value="order.current_state"
                @change="updateState(order.id, ($event.target as HTMLSelectElement).value)"
                class="state-select"
              >
                <option v-for="state in stateOptions" :key="state.id" :value="state.id">
                  {{ state.label }}
                </option>
              </select>
            </td>
            <td class="date-col">{{ new Date(order.date_add).toLocaleDateString('fr-FR') }}</td>
            <td class="actions-col">
              <button @click="selectOrder(order.id)" class="btn-details">
                Détails
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Si aucune commande -->
    <div v-if="!orderStore.loading && orderStore.orders.length === 0" class="no-data">
      Aucune commande trouvée
    </div>

    <!-- Détails commande sélectionnée -->
    <div v-if="selectedOrderId" class="details-panel">
      <OrderDetails :orderId="selectedOrderId" @close="selectedOrderId = null" />
    </div>
  </div>
</template>

<style scoped>
.order-list-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  color: #333;
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
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

.orders-table tbody tr {
  transition: background-color 0.2s;
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
</style>
```

---

## ✅ ÉTAPE 3: Créer le Composant Détails Commande

**Fichier:** `src/components/order/OrderDetails.vue`

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useOrderStore } from '../../stores/order/orderStore';

const props = defineProps<{
  orderId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const orderStore = useOrderStore();

const paymentMethods = [
  'Paiement à la livraison',
  'Carte bancaire',
  'Virement',
  'Chèque',
];

onMounted(() => {
  orderStore.fetchById(props.orderId);
});

const updatePayment = async (newPayment: string) => {
  try {
    await orderStore.updatePayment(props.orderId, newPayment);
    alert('Paiement mis à jour ✅');
  } catch (e) {
    alert('Erreur lors de la mise à jour');
  }
};
</script>

<template>
  <div class="order-details" v-if="orderStore.selectedOrder">
    <div class="details-header">
      <h3>Détails Commande #{{ orderStore.selectedOrder.reference }}</h3>
      <button @click="emit('close')" class="btn-close">✕</button>
    </div>

    <div class="details-grid">
      <!-- Section Client -->
      <div class="detail-section">
        <h4>👤 Client</h4>
        <p><strong>Nom:</strong> {{ orderStore.selectedOrder.customer_name }}</p>
        <p><strong>ID Client:</strong> {{ orderStore.selectedOrder.id_customer }}</p>
      </div>

      <!-- Section Commande -->
      <div class="detail-section">
        <h4>📦 Commande</h4>
        <p><strong>Référence:</strong> {{ orderStore.selectedOrder.reference }}</p>
        <p><strong>Total:</strong> {{ orderStore.selectedOrder.total_paid }} €</p>
        <p><strong>Date:</strong> {{ new Date(orderStore.selectedOrder.date_add).toLocaleDateString('fr-FR') }}</p>
      </div>

      <!-- Section Paiement -->
      <div class="detail-section">
        <h4>💳 Paiement</h4>
        <p><strong>Méthode actuelle:</strong></p>
        <select 
          :value="orderStore.selectedOrder.payment"
          @change="updatePayment(($event.target as HTMLSelectElement).value)"
          class="payment-select"
        >
          <option value="">-- Sélectionner --</option>
          <option v-for="method in paymentMethods" :key="method" :value="method">
            {{ method }}
          </option>
        </select>
      </div>

      <!-- Section État -->
      <div class="detail-section">
        <h4>🔄 État Courant</h4>
        <p>{{ orderStore.getStateLabel(orderStore.selectedOrder.current_state) }}</p>
      </div>
    </div>

    <!-- Items commandés -->
    <div class="items-section" v-if="orderStore.selectedOrder.items.length > 0">
      <h4>📋 Articles</h4>
      <table class="items-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Référence</th>
            <th>Quantité</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orderStore.selectedOrder.items" :key="item.id">
            <td>{{ item.product_name }}</td>
            <td>{{ item.product_reference }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.price }} €</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.order-details {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #999;
}

.btn-close:hover {
  color: #333;
}

h3 {
  color: #333;
  margin: 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.detail-section {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #2196f3;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.detail-section p {
  margin: 8px 0;
  color: #666;
}

.detail-section strong {
  color: #333;
}

.payment-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  cursor: pointer;
}

.items-section {
  margin-top: 30px;
}

.items-section h4 {
  color: #333;
  margin-bottom: 12px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  background: #f9f9f9;
}

.items-table thead {
  background-color: #e8e8e8;
}

.items-table th {
  padding: 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.items-table td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  color: #666;
}
</style>
```

---

## ✅ ÉTAPE 4: Ajouter la Route

**Fichier:** `src/router/index.ts`

Ajouter dans les routes:

```typescript
{
  path: '/orders',
  name: 'Orders',
  component: () => import('../views/OrderView.vue')
}
```

---

## ✅ ÉTAPE 5: Créer la Vue Principale

**Fichier:** `src/views/OrderView.vue`

```vue
<script setup lang="ts">
import OrderList from '../components/order/OrderList.vue';
</script>

<template>
  <div class="order-view">
    <OrderList />
  </div>
</template>

<style scoped>
.order-view {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
```

---

## 📝 Résumé des Fichiers à Créer

| Fichier | Type | Complexité |
|---------|------|-----------|
| `src/stores/order/orderStore.ts` | Store Pinia | ⭐ Simple |
| `src/components/order/OrderList.vue` | Composant | ⭐ Simple |
| `src/components/order/OrderDetails.vue` | Composant | ⭐ Simple |
| `src/views/OrderView.vue` | Vue | ⭐ Très simple |

---

## 🎯 Checklist d'Exécution

- [ ] Créer le dossier `src/stores/order/`
- [ ] Créer le fichier `orderStore.ts` (copier le code fourni)
- [ ] Créer le dossier `src/components/order/`
- [ ] Créer le fichier `OrderList.vue` (copier le code fourni)
- [ ] Créer le fichier `OrderDetails.vue` (copier le code fourni)
- [ ] Créer le fichier `OrderView.vue` (copier le code fourni)
- [ ] Ajouter la route dans `src/router/index.ts`
- [ ] Ajouter le lien dans le menu de navigation (Sidebar.vue)
- [ ] Tester l'affichage des commandes
- [ ] Tester la modification de l'état
- [ ] Tester la modification du paiement

---

## 💡 Points Clés du Code

✅ **Simple et gérable:**
- Pas de dépendances externes compliquées
- Structure standard Pinia
- Code Vue 3 simple et lisible
- Validation basique seulement

✅ **Prêt à évoluer:**
- Architecture modulaire (Store → Composants)
- Facile d'ajouter des filtres/recherches
- Facile d'ajouter des nouveaux champs

✅ **Erreurs gérées:**
- Messages d'erreur affichés
- Try/catch sur les appels API
- Feedback utilisateur (alert)

---

## 🚀 Comment Commencer

1. Créez les 4 fichiers en copiant le code fourni
2. Testez par aller sur: `/orders` 
3. Si erreur, vérifiez:
   - [ ] Dossiers créés correctement
   - [ ] Imports sont corrects
   - [ ] Route ajoutée dans router
   - [ ] API PrestaShop accessible

Vous êtes prêt à commencer? Ou vous avez des questions sur le code? 🤔
