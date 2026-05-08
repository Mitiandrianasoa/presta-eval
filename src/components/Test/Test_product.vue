<!-- components/ProductTable.vue -->
<template>
  <div>
    <h2>📦 Produits</h2>
    
    <div class="toolbar">
      <input 
        v-model="searchQuery" 
        @input="doSearch" 
        placeholder="🔍 Rechercher un produit..."
      />
      <select v-model="filterCategory" @change="doFilter">
        <option value="">Toutes les catégories</option>
        <!-- ✅ getCategoryName fonctionne maintenant -->
        <option v-for="cat in data.categories" :key="cat.id" :value="cat.id">
          {{ data.getCategoryName(cat.id) }}
        </option>
      </select>
    </div>

    <div v-if="data.loading" class="loading">⏳ Chargement...</div>
    <div v-else-if="data.error" class="error">❌ {{ data.error }}</div>
    
    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Référence</th>
          <th>Catégorie</th>
          <th>Prix HT</th>
          <th>Prix TTC</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in displayedProducts" :key="product.id">
          <td>{{ product.id }}</td>
          
          <!-- ✅ UTILISEZ DIRECTEMENT dataService -->
          <td>{{ data.getProductName(product) }}</td>
          
          <td>{{ product.reference || '—' }}</td>
          
          <!-- ✅ UTILISEZ DIRECTEMENT dataService -->
          <td>
            <span class="category-badge">
              {{ data.getCategoryName(product.id_category_default) }}
            </span>
          </td>
          
          <td>{{ product.price }} €</td>
          <td>{{product.price }} €</td>
          
          <!-- ✅ UTILISEZ DIRECTEMENT dataService -->
          <td :class="{ 'low-stock': data.getProductStock(product.id) < 5 }">
            {{ data.getProductStock(product.id) }}
          </td>
          
          <td>
            <button @click="editProduct(product)">✏️</button>
            <button @click="deleteProduct(product.id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="summary">
      {{ displayedProducts.length }} produit(s) affiché(s)
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { dataService } from '../../api/dataService';

// ✅ Juste ça !
const data = dataService;

const searchQuery = ref('');
const filterCategory = ref('');
const displayedProducts = ref([]);


// function formatPriceTTC(price: any): string {
//   return (parseFloat(price || '0') * 1.2).toFixed(2);
// }

function refreshDisplay() {
  let products = data.products;
  
  if (searchQuery.value) {
    products = data.searchProducts(searchQuery.value);
  }
  
  if (filterCategory.value) {
    products = products.filter(p => 
      String(p.id_category_default) === String(filterCategory.value)
    );
  }
  
  displayedProducts.value = products;
}

function doSearch() { refreshDisplay(); }
function doFilter() { refreshDisplay(); }

// function editProduct(product: any) {
//   console.log('✏️ Modifier :', data.getProductName(product));
// }

// function deleteProduct(productId: string | number) {
//   if (confirm('Supprimer ce produit ?')) {
//     console.log('🗑️ Supprimer ID :', productId);
//   }
// }

onMounted(async () => {
  await data.loadAll();
  refreshDisplay();
});
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 20px; }
.toolbar input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.toolbar select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
th { background: #f8f9fa; font-weight: bold; }
.category-badge { background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
.low-stock { color: red; font-weight: bold; }
.loading, .error { padding: 20px; text-align: center; font-size: 18px; }
.error { color: red; background: #ffebee; border-radius: 4px; }
.summary { margin-top: 10px; color: #666; font-size: 14px; }
button { cursor: pointer; border: none; background: none; font-size: 16px; padding: 5px; }
button:hover { transform: scale(1.2); }
</style>