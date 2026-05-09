<!-- views/CatalogView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import ProductList from '../components/product/productList.vue';
import CategoryList from '../components/category/CategoryList.vue';
import StockList from '../components/stock/StockList.vue';
import CustomerList from '../components/customer/CustomerList.vue';

const currentView = ref<'products' | 'categories' | 'stock' | 'customers'>('products');
const selectedCategory = ref<number | null>(null);
</script>

<template>
  <div class="layout">
    <Sidebar 
      @show-products="currentView = 'products'; selectedCategory = null"
      @show-categories="currentView = 'categories'"
      @show-stock="currentView = 'stock'"
      @show-customers="currentView = 'customers'"
      @select-category="currentView = 'products'; selectedCategory = $event"
    />
    
    <main class="main-content">
      <div class="content-wrapper">
        <ProductList 
          v-if="currentView === 'products'" 
          :category-id="selectedCategory" 
        />
        <CategoryList v-if="currentView === 'categories'" />
        <StockList v-if="currentView === 'stock'" />
        <CustomerList v-if="currentView === 'customers'" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  margin-left: 260px; /* Même largeur que la sidebar + un peu d'espace */
  flex: 1;
  background: #f5f6fa;
  min-height: 100vh;
}

.content-wrapper {
  padding: 30px;
  max-width: 1400px;
}
</style>