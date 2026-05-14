import { createRouter, createWebHistory } from 'vue-router';

// Frontoffice
import UserPickerView from '../views/frontoffice/auth/UserPickerView.vue'; // Nouvelle page d'accueil
import HomeView from '../views/frontoffice/HomeView.vue';
import ProductsView from '../views/frontoffice/product/ProductsView.vue';
import ProductDetailView from '../views/frontoffice/product/ProductDetailView.vue';
import LoginView from '../views/frontoffice/auth/LoginView.vue';
import RegisterView from '../views/frontoffice/auth/RegisterView.vue';

// Backoffice
import CatalogView from '../views/backoffice/catalog/CatalogView.vue';
import ConfigView from '../views/backoffice/config/ConfigView.vue';
import CategoryImportView from '../views/backoffice/catalog/CategoryImportView.vue';
import OrderView from '../views/backoffice/order/OrderView.vue';


const routes = [
  // ── Frontoffice Routes ─────────────────────────────────────────────────────

  // Page d'accueil : sélection de l'utilisateur (pré-sélection, pas encore logué)
  {
    path: '/',
    name: 'user-picker',
    component: UserPickerView,
  },

  // Boutique principale (ancienne HomeView)
  {
    path: '/home',
    name: 'home',
    component: HomeView,
  },

  {
    path: '/products',
    name: 'products',
    component: ProductsView,
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: ProductDetailView,
  },

  // Login : formulaire email (pré-rempli) + mot de passe → connexion complète
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
  },

  // ── Backoffice Routes ──────────────────────────────────────────────────────
  {
    path: '/admin',
    name: 'admin',
    component: CatalogView,
  },
  // {
  //   path: '/admin/dashboard',
  //   name: 'admin-dashboard',
  //   component: DashboardView,
  // },
  {
    path: '/admin/config',
    name: 'admin-config',
    component: ConfigView,
  },
  {
    path: '/admin/import-categories',
    name: 'import-categories',
    component: CategoryImportView,
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrderView,
  },

  // ── Redirections ───────────────────────────────────────────────────────────
  { path: '/config', redirect: '/admin/config' },
  { path: '/order', redirect: '/orders' },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});