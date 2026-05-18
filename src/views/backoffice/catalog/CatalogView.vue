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
.layout {
  display: flex;
  min-height: 100vh;
  background: #0d0d14;
}

.main-content {
  margin-left: 240px;
  flex: 1;
  background: #0d0d14;
  min-height: 100vh;
}

.content-wrapper {
  padding: 32px 36px;
  max-width: 1400px;
}

/* Styles pour le login */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0d0d14;
  padding: 20px;
}

.login-card {
  background: #13131f;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 32px;
  width: 100%;
  max-width: 360px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  color: #f1f1f8;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.login-header p {
  color: #6b7280;
  font-size: 13px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: #a0a0b8;
  font-weight: 500;
  font-size: 13px;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  font-size: 14px;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
}

.error-message {
  background: rgba(239,68,68,0.10);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.18);
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.login-button {
  background: #f97316;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(249,115,22,0.35);
  font-family: inherit;
}

.login-button:hover:not(:disabled) {
  opacity: 0.88;
}

.login-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.login-info {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  text-align: center;
}

.login-info p {
  color: #6b7280;
  font-size: 12px;
  margin: 0 0 4px 0;
}

.login-info small {
  color: #4b5563;
  font-size: 11px;
}

/* Header utilisateur */
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #13131f;
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 24px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.welcome {
  font-size: 17px;
  font-weight: 600;
  color: #f1f1f8;
}

.user-email {
  font-size: 14px;
  color: #6b7280;
}

.user-role {
  font-size: 12px;
  color: #f97316;
  font-weight: 500;
}

.logout-btn {
  padding: 8px 16px;
  background: rgba(239,68,68,0.12);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  font-family: inherit;
}

.logout-btn:hover {
  background: rgba(239,68,68,0.22);
}
</style>