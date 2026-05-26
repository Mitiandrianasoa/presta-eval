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
// import StockUpdate from '@/views/frontoffice/stock/formStock.vue';
import StockReduction from '../views/frontoffice/stock/StockReduction.vue';

// Backoffice
import CatalogView from '../views/backoffice/catalog/CatalogView.vue';
import ConfigView from '../views/backoffice/config/ConfigView.vue';
import CategoryImportView from '../views/backoffice/catalog/CategoryImportView.vue';
import OrderView from '../views/backoffice/order/OrderView.vue';
import DashboardView from '../views/backoffice/dashboard/DashboardView.vue';
import StatisticsView from '../views/backoffice/dashboard/StatisticsView.vue';
import ImportView from '../views/backoffice/import/ImportView.vue';
import CanceledOrders from '@/components/order/CanceledOrders.vue';
import CartList from '@/components/order/CartList.vue';
import PaymentList from '@/components/order/PaymentList.vue';
import OrderInvoiceList from '@/components/order/OrderInvoiceList.vue';
import ImportProduits from '@/views/backoffice/import/ImportProduits.vue';
import ImportDeclinaison from '@/views/backoffice/import/ImportDeclinaison.vue';
import ImportOrder from '@/views/backoffice/import/ImportOrder.vue';
import ImportPhoto from '@/views/backoffice/import/ImportPhoto.vue';
import StockMvt from '@/views/backoffice/stock/StockMvt.vue';
import StockList from '@/components/stock/StockList.vue'; 
import ProductList from '@/components/product/productList.vue';

const routes = [
  // ── Frontoffice Routes ─────────────────────────────────────────────────────

  // Page d'accueil : sélection de l'utilisateur (pré-sélection, pas encore logué)
  {
    path: '/',
    name: 'user-picker',
    component: UserPickerView,
  },
{
    path: '/update-stock',
    name: 'update-stock',
    component: StockReduction,
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
  // Dans votre fichier de routes


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
    component: DashboardView,
  },
  {
    path: '/admin/products',
    name: 'admin-products',
    component: ProductList,
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: DashboardView,
  },
  {
    path: '/admin/statistics',
    name: 'admin-statistics',
    component: StatisticsView,
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
  path: '/stocks/movements',
  name: 'StockMovements',
  component: StockMvt,
},
{
 path: '/admin/stock',
  name: 'Stock',
  component: StockList,
},
  {
    path: '/stock-reduction',
    name: 'StockReduction',
    component: StockReduction,
  },
  //IMPORT 
   {
    path: '/admin/import',
    name: 'admin-import',
    component: ImportProduits
  },
  {
    path: '/admin/import/declinaisons',
    name: 'import-declinaisons',
    component: ImportDeclinaison
  },
  {
    path: '/admin/import/order',
    name: 'import-order',
    component: ImportOrder
  },
   {
    path: '/admin/import/photos',
    name: 'import-photos',
    component: ImportPhoto
  },
  {
    path: '/admin/orders',
    name: 'orders',
    component: OrderView,
  },
  {
    path: '/admin/orders/canceled',
    name: 'canceled-orders',
    component: CanceledOrders
  },
  {
    path: '/admin/cart',
    name: 'admin-cart',
    component: CartList
  },

  // Redirect old routes
  { 
    path: '/config', 
    redirect: '/admin/config' 
  },
  {
  path: '/admin/payments',
  name: 'payment-list',
  component: PaymentList}
,
  {
    path: '/admin/orders/invoices',
    name: 'order-invoice-list',
    component: OrderInvoiceList
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;