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
    if (cartStr) {
      cart.value = JSON.parse(cartStr);
    }
  } catch {
    // silently ignore
  }
};

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
    sessionStorage.removeItem('prestashop_cart');
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
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.home-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
}

.logo h1 span {
  color: var(--primary);
}

.logo > span {
  font-size: 0.72rem;
  color: var(--muted);
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
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: color var(--transition), background var(--transition);
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg);
}

.nav-link.router-link-active {
  color: var(--primary);
  background: var(--primary-light);
}

.cart-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cart-count {
  background: var(--error);
  color: white;
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.user-dropdown {
  position: relative;
}

.user-name {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  transition: background var(--transition), border-color var(--transition);
}

.user-name:hover {
  background: var(--bg);
  border-color: #cbd5e1;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
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
  color: var(--text);
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background var(--transition);
}

.dropdown-item:hover {
  background: var(--bg);
}

.dropdown-item.logout {
  color: var(--error);
  border-top: 1px solid var(--border);
}

/* Auth Buttons */
.auth-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-login {
  color: var(--primary);
  border: 1.5px solid var(--primary);
  background: transparent;
  padding: 0.45rem 1.25rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background var(--transition), color var(--transition);
}

.btn-login:hover {
  background: var(--primary-light);
}

.btn-register {
  background: var(--primary);
  color: white;
  border: 1.5px solid var(--primary);
  padding: 0.45rem 1.25rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background var(--transition);
}

.btn-register:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
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
