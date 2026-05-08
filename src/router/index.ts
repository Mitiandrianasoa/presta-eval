import { createRouter, createWebHistory } from 'vue-router';
import ProductList from '../views/CatalogView.vue';
import TestSimple from '../components/Test/TestSimple.vue';
import TestSimple_categories from '../components/Test/TestSimple_categories.vue';

const routes = [
  { path: '/', component: ProductList },
  { path: '/test', component: TestSimple },
  { path: '/test-categories', component: TestSimple_categories }
  // { path: '/orders', component: OrderList }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
