<!-- views/CatalogView.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '../../../components/Sidebar.vue';
import ProductList from '../../../components/product/productList.vue';
import CategoryList from '../../../components/category/CategoryList.vue';
import StockList from '../../../components/stock/StockList.vue';
import CustomerList from '../../../components/customer/CustomerList.vue';

const route = useRoute();
const currentView = ref<'products' | 'categories' | 'stock' | 'customers'>('products');
const selectedCategory = ref<number | null>(null);
const isAuthenticated = ref(!!sessionStorage.getItem('admin_auth'));
const currentUser = ref<{ name: string; username: string } | null>(null);
const username = ref('admin');
const password = ref('admin123');
const error = ref('');

const CREDENTIALS = [
  { username: 'admin', password: 'admin123', name: 'Administrateur' },
];

const handleLogin = () => {
  error.value = '';
  const match = CREDENTIALS.find(
    c => c.username === username.value && c.password === password.value
  );
  if (match) {
    isAuthenticated.value = true;
    currentUser.value = { name: match.name, username: match.username };
    sessionStorage.setItem('admin_auth', match.username);
    sessionStorage.setItem('admin_user', JSON.stringify({ name: match.name, username: match.username }));
  } else {
    error.value = 'Identifiants incorrects';
  }
};

const handleLogout = () => {
  isAuthenticated.value = false;
  currentUser.value = null;
  sessionStorage.removeItem('admin_auth');
  sessionStorage.removeItem('admin_user');
};

onMounted(() => {
  // Restaurer l'utilisateur depuis sessionStorage
  const savedUser = sessionStorage.getItem('admin_user');
  if (savedUser) {
    try { currentUser.value = JSON.parse(savedUser); } catch { /* ignore */ }
  }
  // Appliquer le query param ?view=
  const view = route.query.view as string;
  if (view && ['products', 'categories', 'stock', 'customers'].includes(view)) {
    currentView.value = view as typeof currentView.value;
  }
});

// Watch pour mettre à jour la vue quand le query parameter change
watch(() => route.query.view, (newView) => {
  if (newView && ['products', 'categories', 'stock', 'customers'].includes(newView as string)) {
    currentView.value = newView as typeof currentView.value;
    selectedCategory.value = null;
  }
});

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin();
  }
};

</script>

<template>
  <!-- Afficher le formulaire de login si non authentifié -->
  <div v-if="!isAuthenticated" class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>Connexion PrestaShop</h2>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Nom d'utilisateur</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Nom d'utilisateur"
            class="form-input"
            required
            @keypress="handleKeyPress"
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Entrez votre mot de passe"
            class="form-input"
            required
            @keypress="handleKeyPress"
            value="admin123"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="login-button"
        >
          Se connecter
        </button>
      </form>
    </div>
  </div>

  <!-- Afficher l'application si authentifié -->
  <div v-else class="layout">
    <Sidebar />
    
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Header utilisateur -->
        <div class="user-header">
          <div class="user-info">
            <span class="welcome">Bienvenue, {{ currentUser?.name }}</span>
          </div>
          <button @click="handleLogout" class="logout-btn">
            Déconnexion
          </button>
        </div>
        
        <ProductList 
          v-if="currentView === 'products'" 
          :category-id="selectedCategory" 
        />
        <CategoryList v-if="currentView === 'categories'" />
        <StockList v-if="currentView === 'stock'" />
        <CustomerList v-if="currentView === 'customers'" />
      </div>
    </main>
  </div>
</template>

<style scoped>


.bo-page { background: #0d1117; min-height: 100vh; margin-left: 240px; padding: 2rem; color: #e6edf3; }
.bo-page-header { margin-bottom: 2rem; }
.bo-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.3rem; }
.bo-page-header p { color: #7d8590; margin: 0; font-size: 0.875rem; }

.catalog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.search-input {
  padding: 0.5rem 0.875rem; background: #161b22; border: 1px solid #30363d;
  border-radius: 7px; color: #e6edf3; font-size: 0.875rem;
  width: 280px; transition: border-color 0.2s;
}
.search-input:focus { outline: none; border-color: #388bfd; }
.search-input::placeholder { color: #7d8590; }
.btn-primary { padding: 0.55rem 1.25rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1f6feb; }
.btn-secondary { padding: 0.55rem 1.25rem; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.btn-secondary:hover { border-color: #388bfd; color: #388bfd; }
.table-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; vertical-align: middle; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.product-img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; background: #21262d; }
.product-name { font-weight: 600; }
.product-ref { font-size: 0.75rem; color: #7d8590; }
.price-cell { font-weight: 600; }
.stock-cell { font-size: 0.8rem; }
.stock-ok { color: #3fb950; }
.stock-low { color: #d29922; }
.stock-zero { color: #f85149; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.badge-active { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-inactive { background: rgba(125,133,144,0.12); color: #7d8590; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; font-size: 1rem; }
.icon-btn:hover { color: #388bfd; }
.icon-btn.danger:hover { color: #f85149; }
.loading-state { text-align: center; padding: 3rem; color: #7d8590; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>