<script setup lang="ts">
import OrderList from '../../../components/order/OrderList.vue';
</script>

<template>
  <div class="order-view">
    <OrderList />
  </div>
</template>

<style scoped>


.bo-page { background: #0d1117; min-height: 100vh; margin-left: 240px; padding: 2rem; color: #e6edf3; }
.bo-page-header { margin-bottom: 2rem; }
.bo-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.3rem; }
.bo-page-header p { color: #7d8590; margin: 0; font-size: 0.875rem; }

.filters-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.filter-input, .filter-select {
  padding: 0.5rem 0.75rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 7px;
  color: #e6edf3;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}
.filter-input:focus, .filter-select:focus { outline: none; border-color: #388bfd; }
.filter-input::placeholder { color: #7d8590; }
.filter-select option { background: #161b22; }
.table-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; white-space: nowrap; }
.bo-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.order-id { color: #388bfd; font-weight: 600; font-size: 0.8rem; }
.customer-name { font-weight: 500; }
.amount { font-weight: 600; color: #e6edf3; }
.status-badge { display: inline-block; padding: 0.22rem 0.7rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.s-paid { background: rgba(63,185,80,0.12); color: #3fb950; }
.s-pending { background: rgba(210,153,34,0.12); color: #d29922; }
.s-shipped { background: rgba(56,139,253,0.12); color: #388bfd; }
.s-cancelled { background: rgba(248,81,73,0.12); color: #f85149; }
.s-default { background: rgba(125,133,144,0.12); color: #7d8590; }
.action-icon { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; font-size: 1rem; }
.action-icon:hover { color: #388bfd; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; margin-top: 1.25rem; }
.page-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 6px; color: #7d8590; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
.page-btn:hover, .page-btn.active { background: rgba(56,139,253,0.12); border-color: rgba(56,139,253,0.4); color: #388bfd; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.loading-state { text-align: center; padding: 3rem; color: #7d8590; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>