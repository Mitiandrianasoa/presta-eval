// src/composables/useAuth.ts
import { ref, computed } from 'vue';

interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phone?: string;
}

// État partagé (singleton)
const currentUser = ref<User | null>(null);
const token = ref<string | null>(null);
const isInitialized = ref(false);

// Initialiser depuis sessionStorage
const init = () => {
  const savedToken = sessionStorage.getItem('prestashop_token');
  const savedUser = sessionStorage.getItem('prestashop_user');
  
  if (savedToken && savedUser) {
    try {
      token.value = savedToken;
      currentUser.value = JSON.parse(savedUser);
    } catch (err) {
      console.error('Erreur parsing user:', err);
      clear();
    }
  }
  isInitialized.value = true;
};

// Connexion
const login = (user: User, userToken: string) => {
  sessionStorage.setItem('prestashop_token', userToken);
  sessionStorage.setItem('prestashop_user', JSON.stringify(user));
  token.value = userToken;
  currentUser.value = user;
};

// Déconnexion
const logout = () => {
  clear();
};

// Nettoyage
const clear = () => {
  sessionStorage.removeItem('prestashop_token');
  sessionStorage.removeItem('prestashop_user');
  token.value = null;
  currentUser.value = null;
};

// Getters
const isLoggedIn = computed(() => !!(token.value && currentUser.value));

const getCustomerId = (): string => {
  return currentUser.value?.id || '1';
};

const getCustomerToken = (): string => {
  return token.value || '';
};

const getUser = (): User | null => {
  return currentUser.value;
};

// Initialiser automatiquement
init();

export function useAuth() {
  return {
    // État
    currentUser,
    token,
    isLoggedIn,
    isInitialized,
    
    // Méthodes
    login,
    logout,
    init,
    
    // Getters
    getCustomerId,
    getCustomerToken,
    getUser
  };
}