<template>
  <div class="stock-view">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content -->
    <main class="main-content">
      <div class="view-header">
        <h1>Gestion du Stock</h1>
        <p>Consultez et gérez les niveaux de stock de vos produits</p>
      </div>

      <!-- Stock Component -->
      <StockList />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '../../components/Sidebar.vue';
import StockList from '../../components/stock/StockList.vue';
</script>

<style scoped>
.stock-view {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  padding: 30px 40px;
  margin-left: 250px;
  transition: margin-left 0.3s ease;
}

.view-header {
  margin-bottom: 30px;
}

.view-header h1 {
  font-size: 28px;
  color: #333;
  margin: 0 0 10px 0;
}

.view-header p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 20px;
  }
}
</style>
