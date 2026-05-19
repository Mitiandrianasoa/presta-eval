<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Sidebar from '../../components/Sidebar.vue';
import { cartService, type Cart } from '../../services/cartService';
import { paymentService } from '../../services/paymentService';

// ─── État ──────────────────────────────────────────────────────────────────────

const carts            = ref<Cart[]>([]);
const loading          = ref(false);
const error            = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const search           = ref('');
const expandedCartId   = ref<string | null>(null);

// ─── Filtrage ─────────────────────────────────────────────────────────────────

const filteredCarts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return carts.value;
  return carts.value.filter(c =>
    c.id.includes(q) || c.id_customer.includes(q)
  );
});

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    // Utilisez la nouvelle méthode pour ne récupérer que les paniers sans commande
    carts.value = await cartService.fetchCartsWithoutOrdersOptimized();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// ─── Toggle détail panier ─────────────────────────────────────────────────────

const toggleCart = (id: string) => {
  expandedCartId.value = expandedCartId.value === id ? null : id;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const totalProducts = (cart: Cart) =>
  cart.products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>


<template>
  <div class="app-layout">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
      <div class="page">

        <!-- En-tête -->
        <div class="page-header">
          <div>
            <h2> Paniers</h2>
            <p class="subtitle">{{ carts.length }} panier(s) actif(s)</p>
          </div>
          <button class="btn btn-outline" @click="loadData" :disabled="loading">
             Actualiser
          </button>
        </div>

        <!-- Barre de recherche -->
        <div class="search-bar">
          <!-- <span class="search-icon"></span> -->
          <input
            v-model="search"
            type="text"
            placeholder="Rechercher par ID panier ou ID client..."
            class="search-input"
          />
          <button v-if="search" class="search-clear" @click="search = ''">✕</button>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="alert alert-error"> {{ error }}</div>

        <!-- Chargement -->
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement des paniers...
        </div>

        <!-- Liste des paniers -->
        <div v-else-if="filteredCarts.length > 0" class="cart-list">
          <div
            v-for="cart in filteredCarts"
            :key="cart.id"
            class="cart-card"
            :class="{ expanded: expandedCartId === cart.id }"
          >
            <!-- Ligne résumé (toujours visible) -->
            <div class="cart-row" @click="toggleCart(cart.id)">

              <div class="cart-id">
                <!-- <span class="cart-icon"></span> -->
                <div>
                  <strong>#{{ cart.id }}</strong>
                  <span class="cart-meta">Panier</span>
                </div>
              </div>

              <div class="cart-info">
                <span class="info-label">Client</span>
                <span class="customer-badge">#{{ cart.id_customer }}</span>
              </div>

              <div class="cart-info">
                <span class="info-label">Articles</span>
                <span class="count-badge">{{ cart.products.length }} produit(s)</span>
              </div>

              <div class="cart-info">
                <span class="info-label">Quantité totale</span>
                <span>{{ totalProducts(cart) }} unité(s)</span>
              </div>

              <div class="cart-info">
                <span class="info-label">Créé le</span>
                <span class="col-date">{{ formatDate(cart.date_add) }}</span>
              </div>

              <div class="cart-info">
                <span class="info-label">Mis à jour</span>
                <span class="col-date">{{ formatDate(cart.date_upd) }}</span>
              </div>

              <button class="toggle-btn" :class="{ open: expandedCartId === cart.id }">
                ▼
              </button>
            </div>

            <!-- Détail produits (visible si expanded) -->
            <transition name="slide">
              <div v-if="expandedCartId === cart.id" class="cart-products">
                <div v-if="cart.products.length === 0" class="no-products">
                  Ce panier est vide.
                </div>
                <table v-else class="products-table">
                  <thead>
                    <tr>
                      <th>ID Produit</th>
                      <th>Variante (attribut)</th>
                      <th>Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(product, idx) in cart.products" :key="idx">
                      <td class="col-ref">#{{ product.id_product }}</td>
                      <td>{{ product.id_product_attribute || '—' }}</td>
                      <td class="center">
                        <span class="qty-badge">{{ product.quantity }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </transition>
          </div>
        </div>

        <!-- Aucun résultat -->
        <div v-else-if="!loading" class="empty-state">
          <span v-if="search">🔍 Aucun panier correspondant à « {{ search }} ».</span>
          <span v-else>📭 Aucun panier trouvé.</span>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>

.cart-list { }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.cart-id { color: #388bfd; font-weight: 600; }
.cart-total { font-weight: 600; color: #3fb950; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }
.empty-state { text-align: center; padding: 2rem; color: #7d8590; }

</style>