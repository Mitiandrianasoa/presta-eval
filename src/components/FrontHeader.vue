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

// Charger le panier depuis localStorage (source de vérité du panier)
const loadCart = () => {
  try {
    const cartStr = localStorage.getItem('prestashop_cart');
    cart.value = cartStr ? JSON.parse(cartStr) : [];
  } catch (err) {
    cart.value = [];
  }
};

// Mettre à jour le compteur depuis un autre onglet
const onStorageChange = (e: StorageEvent) => {
  if (e.key === 'prestashop_cart') loadCart();
};

// Mettre à jour le compteur depuis le même onglet (ajout/suppression panier)
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
  if (!sessionStorage.getItem('prestashop_remember')) {
    localStorage.removeItem('prestashop_cart');
  }
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
  background: #1c1917;
  border-bottom: 1px solid rgba(255,255,255,0.07);
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

/* Logo */
.logo {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  text-decoration: none;
}

.logo h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fafaf9;
  letter-spacing: -0.02em;
}

.logo h1 span {
  color: #a78bfa;
}

.logo > span {
  font-size: 0.7rem;
  color: #57534e;
  font-weight: 400;
  letter-spacing: 0.02em;
}

/* Nav */
.main-nav {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  text-decoration: none;
  color: rgba(255,255,255,0.5);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: color 0.2s ease, background 0.2s ease;
}

.nav-link:hover {
  color: #fafaf9;
  background: rgba(255,255,255,0.07);
}

.nav-link.router-link-active {
  color: #a78bfa;
  background: rgba(124,58,237,0.15);
}

.cart-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cart-count {
  background: #7c3aed;
  color: white;
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 1.25rem;
  text-align: center;
  line-height: 1.4;
}

/* User Menu */
.user-menu {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.78rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(124,58,237,0.4);
}

.user-dropdown {
  position: relative;
}

.user-name {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.8);
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  font-family: inherit;
}

.user-name:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.2);
  color: #fafaf9;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #292524;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  box-shadow: 0 16px 32px rgba(0,0,0,0.4);
  min-width: 168px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  background: none;
  text-align: left;
  color: #d6d3d1;
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  font-family: inherit;
}

.dropdown-item:hover {
  background: rgba(255,255,255,0.06);
  color: #fafaf9;
}

.dropdown-item.logout {
  color: #f87171;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.dropdown-item.logout:hover {
  background: rgba(239,68,68,0.1);
}

/* Auth Buttons */
.auth-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-login {
  color: rgba(255,255,255,0.75);
  border: 1.5px solid rgba(255,255,255,0.18);
  background: transparent;
  padding: 0.45rem 1.25rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.btn-login:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.32);
  color: #fafaf9;
}

.btn-register {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
  border: 1.5px solid transparent;
  padding: 0.45rem 1.25rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(124,58,237,0.35);
}

.btn-register:hover {
  opacity: 0.88;
  box-shadow: 0 4px 14px rgba(124,58,237,0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    height: auto;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .auth-buttons {
    gap: 0.5rem;
  }
}
</style>
