<template>
  <aside class="order-summary">
    <div class="summary-card">
      <h3>Résumé de commande</h3>

      <!-- Items -->
      <div class="summary-items">
        <div
          v-for="item in cart?.items || []"
          :key="`${item.id_product}-${item.id_product_attribute}`"
          class="summary-item"
        >
          <div class="item-name">
            {{ item.product_name || `Produit ${item.id_product}` }}
            <span class="item-qty">x{{ item.quantity }}</span>
          </div>
          <div class="item-price">
            {{ formatPrice((item.product_price ?? 0) * item.quantity) }}
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="summary-totals">
        <div class="total-row">
          <span>Sous-total:</span>
          <strong>{{ formatPrice(cart?.total_products ?? 0) }}</strong>
        </div>
        <div class="total-row">
          <span>Livraison:</span>
          <strong>{{ formatPrice(cart?.total_shipping ?? 0) }}</strong>
        </div>
        <div class="total-row grand-total">
          <span>Total (TTC):</span>
          <strong>{{ formatPrice(cart?.total ?? 0) }}</strong>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps({
  cart: Object
});

function formatPrice(price: number | string): string {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount);
}
</script>

<style scoped>
.order-summary { position: sticky; top: 20px; height: fit-content; }
.summary-card { background-color: white; border-radius: 4px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.summary-card h3 { margin: 0 0 20px 0; font-size: 16px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
.summary-items { margin-bottom: 20px; max-height: 300px; overflow-y: auto; }
.summary-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; }
.summary-item:last-child { border-bottom: none; }
.item-name { flex: 1; color: #666; }
.item-qty { display: inline-block; margin-left: 8px; color: #999; font-size: 12px; }
.item-price { text-align: right; color: #333; font-weight: 500; }
.summary-totals { padding-top: 15px; border-top: 2px solid #eee; }
.total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
.total-row span { color: #666; }
.total-row strong { color: #333; }
.total-row.grand-total { padding-top: 12px; font-size: 16px; font-weight: bold; }
.total-row.grand-total span { color: #333; }
.total-row.grand-total strong { color: #007bff; }
</style>