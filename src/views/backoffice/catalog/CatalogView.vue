<!-- views/CatalogView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
    <Sidebar 
      @show-products="currentView = 'products'; selectedCategory = null"
      @show-categories="currentView = 'categories'"
      @show-stock="currentView = 'stock'"
      @show-customers="currentView = 'customers'"
      @select-category="currentView = 'products'; selectedCategory = $event"
    />
    
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
}

.main-content {
  margin-left: 260px; /* Même largeur que la sidebar + un peu d'espace */
  flex: 1;
  background: #f5f6fa;
  min-height: 100vh;
}

.content-wrapper {
  padding: 30px;
  max-width: 1400px;
}

/* Styles pour le login */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f6fa;
  padding: 20px;
}

.login-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 30px;
  width: 100%;
  max-width: 350px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.login-header p {
  color: #7f8c8d;
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
  color: #34495e;
  font-weight: 500;
  font-size: 13px;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.login-button {
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.login-button:hover:not(:disabled) {
  background: #2980b9;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-info {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.login-info p {
  color: #666;
  font-size: 12px;
  margin: 0 0 4px 0;
}

.login-info small {
  color: #95a5a6;
  font-size: 11px;
}

/* Header utilisateur */
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.welcome {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.user-email {
  font-size: 14px;
  color: #7f8c8d;
}

.user-role {
  font-size: 12px;
  color: #3498db;
  font-weight: 500;
}

.logout-btn {
  padding: 8px 16px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #c0392b;
}
</style>