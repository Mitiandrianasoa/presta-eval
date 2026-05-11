<!-- views/CatalogView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchSchema } from '../../api/schemaService';
import api from '../../api/api';
import Sidebar from '../../components/Sidebar.vue';
import ProductList from '../../components/product/productList.vue';
import CategoryList from '../../components/category/CategoryList.vue';
import StockList from '../../components/stock/StockList.vue';
import CustomerList from '../../components/customer/CustomerList.vue';

const currentView = ref<'products' | 'categories' | 'stock' | 'customers'>('products');
const selectedCategory = ref<number | null>(null);
const isAuthenticated = ref(false);
const currentUser = ref<any>(null);
const userProfile = ref<any>(null);
const profiles = ref<any[]>([]);
const accesses = ref<any[]>([]);
const authorizationRoles = ref<any[]>([]);
const email = ref('tsantarakotoarisoa620@gmail.com');
const password = ref('tsanta12./');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    // Utiliser schemaService pour récupérer le schéma customers
    const schema = await fetchSchema('customers');
    
    // Rechercher le client par email via l'API customers
    const response = await api.get(`/customers?filter[email]=[${email.value}]&output_format=XML&display=full`);
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const customers = xmlDoc.querySelectorAll('customer');
    
    if (customers.length === 0) {
      error.value = 'Email non trouvé';
      return;
    }
    
    const customerEl = customers[0];
    if (!customerEl) {
      error.value = 'Client introuvable';
      return;
    }
    
    const user = {
      id: customerEl.querySelector('id')?.textContent?.trim() || '',
      email: customerEl.querySelector('email')?.textContent?.trim() || '',
      firstname: customerEl.querySelector('firstname')?.textContent?.trim() || '',
      lastname: customerEl.querySelector('lastname')?.textContent?.trim() || '',
      active: customerEl.querySelector('active')?.textContent?.trim() || '0',
    };
    
    // Vérifier si le compte est actif
    if (user.active !== '1') {
      error.value = 'Compte désactivé';
      return;
    }
    
    // Vérifier les identifiants
    if (email.value === 'tsantarakotoarisoa620@gmail.com' && password.value === 'tsanta12./') {
      // Charger les rôles et permissions via schemaService
      await loadAllRoles();
      
      // Pour les clients, utiliser un profil par défaut
      // En production, vous devriez récupérer le profil depuis la table employee si c'est un employé
      userProfile.value = {
        id: '1', // Profil par défaut (SuperAdmin)
        name: 'Administrateur'
      };
      
      isAuthenticated.value = true;
      currentUser.value = user;
      return;
    }
    
    error.value = 'Identifiants incorrects';
    
  } catch (err: any) {
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  isAuthenticated.value = false;
  currentUser.value = null;
  userProfile.value = null;
};

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin();
  }
};

// Fonctions pour charger les rôles et permissions via schemaService
const loadProfiles = async () => {
  try {
    const response = await api.get('/profiles?output_format=XML&display=full');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const profileElements = xmlDoc.querySelectorAll('profile');

    profiles.value = Array.from(profileElements).map(el => ({
      id: el.querySelector('id')?.textContent?.trim() || '',
      name: el.querySelector('name')?.textContent?.trim() || ''
    }));

    return profiles.value;
  } catch (error) {
    console.error('Erreur lors du chargement des profils:', error);
    return [];
  }
};

const loadAccesses = async () => {
  try {
    const response = await api.get('/accesses?output_format=XML&display=full');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const accessElements = xmlDoc.querySelectorAll('access');

    accesses.value = Array.from(accessElements).map(el => ({
      id: el.querySelector('id')?.textContent?.trim() || '',
      id_profile: el.querySelector('id_profile')?.textContent?.trim() || '',
      id_authorization_role: el.querySelector('id_authorization_role')?.textContent?.trim() || '',
      view: el.querySelector('view')?.textContent?.trim() || '0',
      add: el.querySelector('add')?.textContent?.trim() || '0',
      edit: el.querySelector('edit')?.textContent?.trim() || '0',
      delete: el.querySelector('delete')?.textContent?.trim() || '0'
    }));

    return accesses.value;
  } catch (error) {
    console.error('Erreur lors du chargement des accès:', error);
    return [];
  }
};

const loadAuthorizationRoles = async () => {
  try {
    const response = await api.get('/authorization_roles?output_format=XML&display=full');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const roleElements = xmlDoc.querySelectorAll('authorization_role');

    authorizationRoles.value = Array.from(roleElements).map(el => ({
      id: el.querySelector('id')?.textContent?.trim() || '',
      name: el.querySelector('name')?.textContent?.trim() || ''
    }));

    return authorizationRoles.value;
  } catch (error) {
    console.error('Erreur lors du chargement des rôles d\'autorisation:', error);
    return [];
  }
};

const loadAllRoles = async () => {
  await Promise.all([
    loadProfiles(),
    loadAccesses(),
    loadAuthorizationRoles()
  ]);
};

// Fonctions de vérification des permissions
const hasPermission = (profileId: string, permission: string, action: 'view' | 'add' | 'edit' | 'delete') => {
  const authRole = authorizationRoles.value.find(role => 
    role.name.toLowerCase().includes(permission.toLowerCase())
  );

  if (!authRole) return false;

  const access = accesses.value.find(acc => 
    acc.id_profile === profileId && acc.id_authorization_role === authRole.id
  );

  if (!access) return false;

  return access[action] === '1';
};

const canAccessProducts = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'product', 'view');
};

const canAccessCategories = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'category', 'view');
};

const canAccessStock = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'stock', 'view');
};

const canAccessCustomers = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'customer', 'view');
};

const canManageProducts = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'product', 'edit') || hasPermission(userProfile.value.id, 'product', 'add');
};

const canManageCategories = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'category', 'edit') || hasPermission(userProfile.value.id, 'category', 'add');
};

const canManageStock = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'stock', 'edit') || hasPermission(userProfile.value.id, 'stock', 'add');
};

const canManageCustomers = () => {
  if (!userProfile.value) return false;
  return hasPermission(userProfile.value.id, 'customer', 'edit') || hasPermission(userProfile.value.id, 'customer', 'add');
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
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Entrez votre email"
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
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="loading"
        >
          {{ loading ? 'Connexion...' : 'Se connecter' }}
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
            <span class="welcome">Bienvenue, {{ currentUser?.firstname }} {{ currentUser?.lastname }}</span>
            <span class="user-email">{{ currentUser?.email }}</span>
            <span class="user-role">Profil: {{ userProfile?.name || 'Non défini' }}</span>
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