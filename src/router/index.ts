import { createRouter, createWebHistory } from 'vue-router';

// Frontoffice
import HomeView from '../views/frontoffice/HomeView.vue';
import ProductsView from '../views/frontoffice/product/ProductsView.vue';
import ProductDetailView from '../views/frontoffice/product/ProductDetailView.vue';
import LoginView from '../views/frontoffice/auth/LoginView.vue';
import RegisterView from '../views/frontoffice/auth/RegisterView.vue';
import OrderConfirmationView from '../views/frontoffice/order/OrderConfirmView.vue';
import OrdersView from '../views/frontoffice/order/OrderView.vue';
import CartView from '@/views/frontoffice/order/CartView.vue';
import CheckoutView from '../views/frontoffice/order/CheckoutView.vue';
import OrderDetailView from '../views/frontoffice/order/OrderDetailView.vue';

// Backoffice
import CatalogView from '../views/backoffice/catalog/CatalogView.vue';
import ConfigView from '../views/backoffice/config/ConfigView.vue';
import CategoryImportView from '../views/backoffice/catalog/CategoryImportView.vue';
import OrderView from '../views/backoffice/order/OrderView.vue';
import CanceledOrders from '@/components/order/CanceledOrders.vue';
import CartList from '@/components/order/CartList.vue';
import PaymentList from '@/components/order/PaymentList.vue';
import ImportProduits from '@/views/backoffice/import/ImportProduits.vue';


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
    path: '/order-confirmation',
    name: 'OrderConfirmation',
    component: OrderConfirmationView,
    // meta: { requiresAuth: true }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: OrdersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/order/:id',
    name: 'OrderDetail',
    component: OrderDetailView,
    meta: { requiresAuth: true }
  },

  // Backoffice Routes
  { 
    path: '/admin', 
    name: 'admin',
    component: CatalogView 
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: CheckoutView
  },
  { 
    path: '/admin/config', 
    name: 'admin-config',
    component: ConfigView 
  },
  { 
    path: '/cart', 
    name: 'admin-cart',
    component: CartView 
  },
  {
    path: '/admin/import-categories',
    name: 'import-categories',
    component: CategoryImportView
  },
   {
    path: '/admin/import',
    name: 'import',
    component: ImportProduits
  },
  {
    path: '/admin/orders',
    name: 'orders',
    component: OrderView
  },
  {
    path: '/admin/orders/canceled',
    name: 'canceled-orders',
    component: CanceledOrders
  },
  {
    path: '/admin/cart',
    name: 'cart',
    component: CartList
  },

  // Redirect old routes
  { 
    path: '/config', 
    redirect: '/admin/config' 
  },
  {
  path: '/admin/payments',
  name: 'PaymentList',
  component: PaymentList}
];

export default createRouter({
  history: createWebHistory(),
  routes
});
