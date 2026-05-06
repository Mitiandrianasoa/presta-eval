import { createRouter, createWebHistory } from 'vue-router';
import ProductList from '../components/ProductList.vue';
import OrderList from '../components/OrderList.vue';

const routes = [
  { path: '/', component: ProductList },
  { path: '/orders', component: OrderList }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
