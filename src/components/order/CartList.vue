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
/* ── Layout ──────────────────────────────────────────────────── */
.app-layout   { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 250px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header {
  display: flex; justify-content: space-between;
  align-items: flex-end; margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1a1a2e; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 8px; font-size: .9rem;
  font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s;
}
.btn:hover:not(:disabled) { opacity: .85; transform: translateY(-1px); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-outline { background: #fff; border: 2px solid #2196f3; color: #2196f3; }

/* ── Barre de recherche ─────────────────────────────────────── */
.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid #dde1e7;
  border-radius: 10px; padding: 0 14px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.search-icon { font-size: 1rem; color: #aaa; }
.search-input {
  flex: 1; border: none; outline: none;
  padding: 12px 0; font-size: .95rem; background: transparent; color: #333;
}
.search-clear {
  background: none; border: none; color: #aaa;
  cursor: pointer; font-size: 1rem; padding: 4px;
}
.search-clear:hover { color: #555; }

/* ── Alertes / Chargement ───────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem; }
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #666; }
.spinner {
  width: 20px; height: 20px; border: 3px solid #e0e0e0;
  border-top-color: #2196f3; border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Liste de cartes paniers ────────────────────────────────── */
.cart-list { display: flex; flex-direction: column; gap: 12px; }

.cart-card {
  background: #fff; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  border: 2px solid transparent;
  transition: border-color .2s, box-shadow .2s;
  overflow: hidden;
}
.cart-card:hover      { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.cart-card.expanded   { border-color: #2196f3; }

/* ── Ligne résumé ───────────────────────────────────────────── */
.cart-row {
  display: flex; align-items: center; gap: 20px;
  padding: 16px 20px; cursor: pointer;
  flex-wrap: wrap;
}
.cart-id {
  display: flex; align-items: center; gap: 10px;
  min-width: 130px;
}
.cart-icon { font-size: 1.4rem; }
.cart-id strong { font-size: 1rem; font-weight: 700; color: #1a1a2e; display: block; }
.cart-meta { font-size: .75rem; color: #aaa; }

.cart-info {
  display: flex; flex-direction: column; gap: 3px;
  min-width: 120px;
}
.info-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: #aaa; font-weight: 600; }

.customer-badge {
  background: #e3f2fd; color: #1565c0;
  padding: 2px 8px; border-radius: 20px;
  font-size: .82rem; font-weight: 700; width: fit-content;
}
.count-badge {
  background: #e8f5e9; color: #2e7d32;
  padding: 2px 8px; border-radius: 20px;
  font-size: .82rem; font-weight: 700; width: fit-content;
}
.col-date { font-size: .85rem; color: #888; }

.toggle-btn {
  margin-left: auto; background: none; border: none;
  font-size: .9rem; color: #aaa; cursor: pointer;
  transition: transform .25s, color .2s;
  padding: 4px 8px;
}
.toggle-btn.open { transform: rotate(180deg); color: #2196f3; }

/* ── Tableau produits (expandé) ─────────────────────────────── */
.cart-products {
  padding: 0 20px 20px;
  border-top: 1px solid #f0f2f5;
}
.no-products { color: #aaa; padding: 16px 0; font-size: .9rem; }

.products-table { width: 100%; border-collapse: collapse; font-size: .88rem; margin-top: 12px; }
.products-table thead { background: #f8f9fb; }
.products-table th {
  padding: 10px 14px; text-align: left;
  font-size: .75rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em; color: #666;
}
.products-table td { padding: 10px 14px; border-bottom: 1px solid #f0f2f5; color: #444; }
.products-table tbody tr:last-child td { border-bottom: none; }
.products-table tbody tr:hover { background: #f8f9fb; }
.col-ref  { font-family: monospace; color: #2196f3; font-weight: 700; }
.center   { text-align: center; }
.qty-badge {
  background: #fff3e0; color: #e65100;
  padding: 2px 10px; border-radius: 20px;
  font-weight: 700; font-size: .85rem;
}

/* ── Animation slide ────────────────────────────────────────── */
.slide-enter-active, .slide-leave-active { transition: max-height .3s ease, opacity .3s ease; max-height: 600px; overflow: hidden; }
.slide-enter-from, .slide-leave-to       { max-height: 0; opacity: 0; }

/* ── Vide ───────────────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 1rem; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
  .cart-row     { gap: 12px; }
  .cart-info    { min-width: 90px; }
}
</style>
