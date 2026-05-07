<!-- views/CatalogView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import ProductList from '../components/productList.vue';
import CategoryList from '../components/CategoryList.vue';

const currentView = ref<'products' | 'categories'>('products');
const selectedCategory = ref<number | null>(null);
</script>

<template>
  <div class="layout">
    <Sidebar 
      @show-products="currentView = 'products'; selectedCategory = null"
      @show-categories="currentView = 'categories'"
      @select-category="currentView = 'products'; selectedCategory = $event"
    />
    
    <main class="main-content">
      <div class="content-wrapper">
        <ProductList 
          v-if="currentView === 'products'" 
          :category-id="selectedCategory" 
        />
        <CategoryList v-if="currentView === 'categories'" />
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