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
.search-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

label {
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: #4CAF50;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dropdown-list {
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.product-name {
  flex: 1;
  font-size: 13px;
}

.product-ref {
  color: #999;
  font-size: 11px;
  margin-left: 10px;
}

.no-results {
  padding: 10px;
  color: #999;
  text-align: center;
  font-size: 13px;
}

.selected-products {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f0f0;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.product-tag span {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.remove-btn:hover {
  color: #e74c3c;
}
</style>