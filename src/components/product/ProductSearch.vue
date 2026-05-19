<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProductStore } from '../../stores/product/productStore';

const props = defineProps<{ selectedIds?: number[] }>();
const emit = defineEmits(['add', 'remove']);

const productStore = useProductStore();
const searchQuery = ref('');
const isOpen = ref(false);

// Timer pour gérer la fermeture
let closeTimeout: number | null = null;

const filteredProducts = computed(() => {
  if (!searchQuery.value) return [];
  const query = searchQuery.value.toLowerCase();
  return productStore.products.filter(p => 
    (p.name.toLowerCase().includes(query) || p.reference.toLowerCase().includes(query)) &&
    !(props.selectedIds || []).includes(p.id)
  );
});

const handleFocus = () => {
  // Annuler le timeout si l'utilisateur revient rapidement
  if (closeTimeout) {
    window.clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  isOpen.value = true;
};

const handleBlur = () => {
  // Permet de cliquer sur un élément du dropdown avant qu'il ne se ferme
  closeTimeout = window.setTimeout(() => {
    isOpen.value = false;
  }, 200);
};

const selectProduct = (product: any) => {
  emit('add', product);
  searchQuery.value = '';
  isOpen.value = false;
  
  // Annuler le timeout si nécessaire
  if (closeTimeout) {
    window.clearTimeout(closeTimeout);
    closeTimeout = null;
  }
};

const removeProduct = (productId: number) => {
  emit('remove', productId);
};
</script>

<template>
  <div class="search-container">
    <label>Produits associés</label>
    <div class="search-box">
      <input
        v-model="searchQuery"
        placeholder="Rechercher un produit..."
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <div v-if="isOpen && searchQuery" class="dropdown">
        <div v-if="filteredProducts.length" class="dropdown-list">
          <button
            v-for="product in filteredProducts.slice(0, 10)"
            :key="product.id"
            @click="selectProduct(product)"
            type="button"
            class="dropdown-item"
          >
            <span class="product-name">{{ product.name }}</span>
            <span class="product-ref">{{ product.reference }}</span>
          </button>
        </div>
        <div v-else class="no-results">Aucun produit trouvé</div>
      </div>
    </div>

    <div v-if="selectedIds?.length" class="selected-products">
      <div v-for="productId in selectedIds" :key="productId" class="product-tag">
        <span>{{ productStore.products.find(p => p.id === productId)?.name }}</span>
        <button @click="removeProduct(productId)" class="remove-btn">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.product-search { position: relative; }
.search-input { width: 100%; padding: 0.55rem 0.75rem 0.55rem 2.25rem; background: #0d1117; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s; box-sizing: border-box; }
.search-input:focus { outline: none; border-color: #388bfd; }
.search-input::placeholder { color: #7d8590; }
.search-icon { position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); color: #7d8590; pointer-events: none; }
.search-results { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #161b22; border: 1px solid #30363d; border-radius: 8px; max-height: 300px; overflow-y: auto; z-index: 200; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.result-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.875rem; cursor: pointer; border-bottom: 1px solid #21262d; transition: background 0.15s; }
.result-item:last-child { border-bottom: none; }
.result-item:hover { background: rgba(255,255,255,0.03); }
.result-img { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; background: #21262d; flex-shrink: 0; }
.result-name { font-size: 0.875rem; font-weight: 500; color: #e6edf3; }
.result-ref { font-size: 0.72rem; color: #7d8590; }
.result-price { font-size: 0.875rem; font-weight: 600; color: #3fb950; margin-left: auto; }
.no-results { padding: 1rem; text-align: center; color: #7d8590; font-size: 0.875rem; }

</style>