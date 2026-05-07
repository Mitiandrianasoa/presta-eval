<!-- components/Sidebar.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useCategoryStore } from '../stores/categoryStore';

const categoryStore = useCategoryStore();
const emit = defineEmits(['select-category', 'show-categories', 'show-products']);

onMounted(() => categoryStore.fetchAll());
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3> Catalogue</h3>
    </div>
    
    <div class="sidebar-menu">
      <button 
        @click="$emit('show-products')" 
        class="menu-item main-item"
      >
        <span></span> Tous les produits
      </button>
      
      <button 
        @click="$emit('show-categories')" 
        class="menu-item main-item"
      >
        <span></span> Gérer les catégories
      </button>
    </div>
    
    <div class="divider"></div>
    
    <!-- <div class="categories-section">
      <h4>Catégories</h4>
      <div class="categories-list">
        <button 
          v-for="cat in categoryStore.categories" 
          :key="cat.id"
          @click="$emit('select-category', cat.id)"
          class="menu-item category-item"
        >
          {{ cat.name }}
        </button>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: #2c3e50;
  color: #ecf0f1;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 1000;
}

.sidebar-header {
  padding: 25px 20px 20px;
  border-bottom: 1px solid #34495e;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 20px;
  color: white;
}

.sidebar-menu {
  padding: 15px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 5px;
  background: transparent;
  border: none;
  color: #bdc3c7;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;
  font-size: 14px;
}

.menu-item:hover {
  background: #34495e;
  color: white;
  transform: translateX(5px);
}

.menu-item span {
  font-size: 18px;
}

.main-item {
  font-weight: 500;
}

.divider {
  height: 1px;
  background: #34495e;
  margin: 10px 20px;
}

.categories-section {
  padding: 0 15px 15px;
}

.categories-section h4 {
  padding: 10px 15px;
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #7f8c8d;
}

.categories-list {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.category-item {
  padding: 8px 15px 8px 30px;
  font-size: 13px;
  position: relative;
}

.category-item::before {
  content: '›';
  position: absolute;
  left: 15px;
  color: #7f8c8d;
  font-size: 18px;
}

.category-item:hover::before {
  color: white;
}
</style>