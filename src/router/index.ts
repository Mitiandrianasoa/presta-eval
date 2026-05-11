import { createRouter, createWebHistory } from 'vue-router';
import ProductList from '../views/CatalogView.vue';
import ConfigView from '../views/ConfigView.vue';
import CategoryImportView from '../views/CategoryImportView.vue';
import OrderView from '../views/OrderView.vue';

const routes = [
  { path: '/', component: ProductList },
  { path: '/config', component: ConfigView },
  {
    path: '/import-categories',
    name: 'import-categories',
    component: CategoryImportView
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrderView
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
