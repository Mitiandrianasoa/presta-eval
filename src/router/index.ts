import { createRouter, createWebHistory } from 'vue-router';

// Frontoffice
import UserPickerView from '../views/frontoffice/auth/UserPickerView.vue'; // Nouvelle page d'accueil
import HomeView from '../views/frontoffice/HomeView.vue';
import ProductsView from '../views/frontoffice/product/ProductsView.vue';
import ProductDetailView from '../views/frontoffice/product/ProductDetailView.vue';
import LoginView from '../views/frontoffice/auth/LoginView.vue';
import RegisterView from '../views/frontoffice/auth/RegisterView.vue';
import CartView from '../views/frontoffice/order/CartView.vue';
import OrderFrontView from '../views/frontoffice/order/OrderFrontView.vue';
import CheckoutView from '../views/frontoffice/order/CheckoutView.vue';
import OrderConfirmView from '../views/frontoffice/order/OrderConfirmView.vue';
import OrderDetailView from '../views/frontoffice/order/OrderDetailView.vue';

// Backoffice
import CatalogView from '../views/backoffice/catalog/CatalogView.vue';
import ConfigView from '../views/backoffice/config/ConfigView.vue';
import CategoryImportView from '../views/backoffice/catalog/CategoryImportView.vue';
import OrderView from '../views/backoffice/order/OrderView.vue';
import DashboardView from '../views/backoffice/dashboard/DashboardView.vue';
import ImportView from '../views/backoffice/import/ImportView.vue';
import CartList from '../components/order/CartList.vue';
import PayementList from '../components/order/PayementList.vue';
import StockEntryView from '../views/backoffice/stock/StockEntryView.vue';
import StockEvolutionView from '../views/backoffice/stock/StockEvolutionView.vue';

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
    path: '/cart',
    name: 'cart',
    component: CartView,
  },
  {
    path: '/orders',
    name: 'orders-front',
    component: OrderFrontView,
  },
  {
    path: '/order/:id',
    name: 'order-detail',
    component: OrderDetailView,
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: CheckoutView,
  },
  {
    path: '/order-confirmation',
    name: 'order-confirmation',
    component: OrderConfirmView,
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
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: DashboardView,
  },
    {
    path: '/import',
    name: 'import',
    component: ImportView,
  },
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
    path: '/admin/orders',
    name: 'orders',
    component: OrderView,
  },
  {
    path: '/admin/carts',
    name: 'admin-carts',
    component: CartList,
  },
  {
    path: '/admin/payments',
    name: 'admin-payments',
    component: PayementList,
  },
  {
    path: '/admin/stock-entry',
    name: 'admin-stock-entry',
    component: StockEntryView,
  },
  {
    path: '/admin/stock-evolution',
    name: 'admin-stock-evolution',
    component: StockEvolutionView,
  },

  // ── Redirections ───────────────────────────────────────────────────────────
  { path: '/config', redirect: '/admin/config' },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});