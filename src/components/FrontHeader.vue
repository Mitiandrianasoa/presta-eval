<template>
  <header class="home-header">
    <div class="header-content">
      <div class="logo">
        <h1>PrestaShop</h1>
        <span>Boutique en ligne</span>
      </div>
      
      <nav class="main-nav">
        <router-link to="/" class="nav-link">Accueil</router-link>
        <router-link to="/products" class="nav-link">Produits</router-link>
        <router-link to="/cart" class="nav-link cart-link">
          Panier
          <span v-if="cartItemCount" class="cart-count">{{ cartItemCount }}</span>
        </router-link>
        <router-link v-if="isAuthenticated" to="/orders" class="nav-link">Mes commandes</router-link>
      </nav>

      <div class="user-menu">
        <div v-if="isAuthenticated" class="user-info">
          <div class="user-avatar">
            {{ getUserInitials() }}
          </div>
          <div class="user-dropdown">
            <button @click="toggleDropdown" class="user-name">
              {{ currentUser?.firstname }} {{ currentUser?.lastname }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div v-if="showDropdown" class="dropdown-menu">
              <router-link to="/profile" class="dropdown-item">
                Mon profil
              </router-link>
              <router-link to="/orders" class="dropdown-item">
                Mes commandes
              </router-link>
              <button @click="handleLogout" class="dropdown-item logout">
                Déconnexion
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="auth-buttons">
          <router-link to="/login" class="btn-login">Connexion</router-link>
          <router-link to="/register" class="btn-register">Inscription</router-link>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineOptions } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({
  name: 'FrontHeader'
});

const router = useRouter();
const showDropdown = ref(false);
const currentUser = ref<any>(null);
const cart = ref<any[]>([]);

const isAuthenticated = computed(() => {
  const token = sessionStorage.getItem('prestashop_token');
  const user = sessionStorage.getItem('prestashop_user');
  return !!(token && user);
});

const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0);
});

// Charger les informations utilisateur
const loadUser = () => {
  try {
    const userStr = sessionStorage.getItem('prestashop_user');
    if (userStr) {
      currentUser.value = JSON.parse(userStr);
    }
  } catch (err) {
    console.error('Erreur lors du chargement de l\'utilisateur:', err);
  }
};

// Charger le panier
const loadCart = () => {
  try {
    const cartStr = localStorage.getItem('prestashop_cart');
    cart.value = cartStr ? JSON.parse(cartStr) : [];
  } catch (err) {
    cart.value = [];
  }
};

const onStorageChange = (e: StorageEvent) => {
  if (e.key === 'prestashop_cart') loadCart();
};

const onCartUpdate = () => loadCart();

// Basculer le menu déroulant
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

// Obtenir les initiales de l'utilisateur
const getUserInitials = () => {
  if (!currentUser.value) return 'U';
  const first = currentUser.value.firstname?.charAt(0) || '';
  const last = currentUser.value.lastname?.charAt(0) || '';
  return (first + last).toUpperCase() || 'U';
};

// Déconnexion
const handleLogout = () => {
  sessionStorage.removeItem('prestashop_token');
  sessionStorage.removeItem('prestashop_user');
  localStorage.removeItem('prestashop_cart');
  cart.value = [];
  currentUser.value = null;
  showDropdown.value = false;
  router.push('/');
};

// Fermer le dropdown quand on clique ailleurs
const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.user-dropdown')) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  loadUser();
  loadCart();
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('storage', onStorageChange);
  window.addEventListener('prestashop:cart-updated', onCartUpdate);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('storage', onStorageChange);
  window.removeEventListener('prestashop:cart-updated', onCartUpdate);
});
</script>

<style scoped>

.home-header {
  background: #0e0e1a;
  border-bottom: 1px solid #1e1e35;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}
.logo { display: flex; flex-direction: column; line-height: 1.2; text-decoration: none; }
.logo h1 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #e8e8f5; letter-spacing: -0.02em; }
.logo h1 span { color: #a78bfa; }
.logo > span { font-size: 0.7rem; color: #5a5a85; font-weight: 400; letter-spacing: 0.02em; }

.main-nav { display: flex; gap: 0.25rem; }
.nav-link { text-decoration: none; color: #5a5a85; font-size: 0.875rem; font-weight: 500; padding: 0.4rem 0.75rem; border-radius: 6px; transition: color 0.2s, background 0.2s; }
.nav-link:hover { color: #e8e8f5; background: rgba(255,255,255,0.04); }
.nav-link.router-link-active { color: #a78bfa; background: rgba(167,139,250,0.08); }
.cart-link { display: flex; align-items: center; gap: 0.4rem; }
.cart-count { background: #a78bfa; color: white; border-radius: 10px; padding: 0.1rem 0.45rem; font-size: 0.72rem; font-weight: 700; min-width: 1.2rem; text-align: center; }

.user-menu { display: flex; align-items: center; }
.user-info { display: flex; align-items: center; gap: 0.75rem; }
.user-avatar { width: 34px; height: 34px; border-radius: 50%; background: rgba(167,139,250,0.15); color: #a78bfa; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; border: 1px solid rgba(167,139,250,0.25); }
.user-dropdown { position: relative; }
.user-name { background: none; border: 1px solid #1e1e35; color: #e8e8f5; font-weight: 500; font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 6px; transition: background 0.2s, border-color 0.2s; }
.user-name:hover { background: rgba(255,255,255,0.04); border-color: #2a2a4a; }
.dropdown-menu { position: absolute; top: calc(100% + 8px); right: 0; background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); min-width: 168px; z-index: 1000; overflow: hidden; }
.dropdown-item { display: block; width: 100%; padding: 0.65rem 1rem; border: none; background: none; text-align: left; color: #e8e8f5; text-decoration: none; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.dropdown-item:hover { background: rgba(255,255,255,0.04); }
.dropdown-item.logout { color: #f87171; border-top: 1px solid #1e1e35; }

.auth-buttons { display: flex; gap: 0.75rem; }
.btn-login { color: #a78bfa; border: 1.5px solid rgba(167,139,250,0.4); background: transparent; padding: 0.4rem 1.1rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: background 0.2s, border-color 0.2s; }
.btn-login:hover { background: rgba(167,139,250,0.08); border-color: #a78bfa; }
.btn-register { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; border: none; padding: 0.4rem 1.1rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: opacity 0.2s; }
.btn-register:hover { opacity: 0.88; }

@media (max-width: 768px) {
  .header-content { height: auto; flex-wrap: wrap; padding: 0.75rem 1rem; gap: 0.75rem; }
  .main-nav { order: 3; width: 100%; justify-content: center; flex-wrap: wrap; }
  .auth-buttons { gap: 0.5rem; }
}

</style>