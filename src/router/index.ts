import { createRouter, createWebHistory } from 'vue-router';
import ProductList from '../views/CatalogView.vue';
import TestSimple from '../components/Test/TestSimple.vue';

const routes = [
  { path: '/', component: ProductList },
  { path: '/test', component: TestSimple }
  // { path: '/orders', component: OrderList }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
