import { createRouter, createWebHistory } from 'vue-router';

// Frontoffice
import HomeView from '../views/frontoffice/HomeView.vue';
import ProductsView from '../views/frontoffice/ProductsView.vue';
import ProductDetailView from '../views/frontoffice/ProductDetailView.vue';
import LoginView from '../views/frontoffice/LoginView.vue';
import RegisterView from '../views/frontoffice/RegisterView.vue';
import CartView from '../views/frontoffice/CartView.vue';
import CheckoutView from '../views/frontoffice/CheckoutView.vue';
import ConfirmationView from '../views/frontoffice/ConfirmationView.vue';

// Backoffice
import CatalogView from '../views/backoffice/CatalogView.vue';
import ConfigView from '../views/backoffice/ConfigView.vue';
import CategoryImportView from '../views/backoffice/CategoryImportView.vue';
import OrderView from '../views/OrderView.vue';
import StockListView from '../views/backoffice/StockListView.vue';

const routes = [
  // Frontoffice Routes
  { 
    path: '/', 
    name: 'home',
    component: HomeView 
  },
  { 
    path: '/products', 
    name: 'products',
    component: ProductsView 
  },
  { 
    path: '/product/:id', 
    name: 'product-detail',
    component: ProductDetailView 
  },
  { 
    path: '/login', 
    name: 'login',
    component: LoginView 
  },
  { 
    path: '/register', 
    name: 'register',
    component: RegisterView 
  },
  { 
    path: '/cart', 
    name: 'cart',
    component: CartView 
  },
  { 
    path: '/checkout', 
    name: 'checkout',
    component: CheckoutView 
  },
  { 
    path: '/confirmation/:orderId', 
    name: 'confirmation',
    component: ConfirmationView 
  },

  // Backoffice Routes
  { 
    path: '/admin', 
    name: 'admin',
    component: CatalogView 
  },
  { 
    path: '/admin/config', 
    name: 'admin-config',
    component: ConfigView 
  },
  {
    path: '/admin/import-categories',
    name: 'import-categories',
    component: CategoryImportView
  },
  {
    path: '/admin/stock',
    name: 'admin-stock',
    component: StockListView
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrderView
  },

  // Redirect old routes
  { 
    path: '/config', 
    redirect: '/admin/config' 
  },
  { 
    path: '/order', 
    redirect: '/orders' 
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
