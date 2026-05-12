<script setup lang="ts">
import OrderList from '../../components/order/OrderList.vue';
</script>

<template>
  <div class="order-view">
    <OrderList />
  </div>
</template>

<style scoped>
.order-view {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
