<!-- components/ProductList.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useProductStore } from '../../stores/product/productStore';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import ProductForm from './ProductForm.vue';

const store = useProductStore();
const categoryStore = useCategoryStore();
const showForm = ref(false);
const editing = ref<any>(null);
const selectedCategory = ref('');
const selectedProducts = ref<string[]>([]);
const repairing = ref(false);
const repairResult = ref<{ fixed: number; failed: number } | null>(null);


const isAllSelected = computed(() => {
  return filteredProducts.value.length > 0 && selectedProducts.value.length === filteredProducts.value.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedProducts.value = [];
  } else {
    selectedProducts.value = filteredProducts.value.map(p => p.id);
  }
};

const toggleProduct = (id: string) => {
  const index = selectedProducts.value.indexOf(id);
  if (index === -1) {
    selectedProducts.value.push(id);
  } else {
    selectedProducts.value.splice(index, 1);
  }
};

onMounted(() => {
  store.fetchAll();
  categoryStore.fetchAll();
});

const f = (v: any) => Number(v || 0).toFixed(2);

const add = () => { editing.value = null; showForm.value = true; };
const edit = (p: any) => { editing.value = { ...p }; showForm.value = true; };
const close = () => { showForm.value = false; editing.value = null; };

const submit = async (data: any) => {
  await store.save(data, editing.value?.id);
  close();
};

const remove = async (id: number) => {
  if (confirm('Supprimer ?')) await store.remove(id);
};

// Filtrer les produits par catégorie
const filteredProducts = computed(() => {
  if (!selectedCategory.value) return store.products;
  return store.products.filter(p => p.id_category_default === selectedCategory.value);
});
</script>

<template>
  <div class="container">
    <h2>Produits</h2>
    <div class="filters" v-if="!showForm">
      <button @click="add" class="btn-add">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg> Ajouter
      </button>
      <select v-model="selectedCategory" class="category-filter">
        <option value="">Toutes les catégories</option>
        <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
          {{ cat.name || 'Catégorie ' + cat.id }}
        </option>
      </select>
    </div>

    <div v-if="repairResult" class="repair-banner" :class="repairResult.failed > 0 ? 'warn' : 'ok'">
      Réparation terminée : {{ repairResult.fixed }} produit(s) corrigé(s)
      <span v-if="repairResult.failed > 0">, {{ repairResult.failed }} échec(s)</span>
      <button class="close-banner" @click="repairResult = null">✕</button>
    </div>

    <div v-if="selectedProducts.length > 0 && !showForm" class="selection-bar">
      <span>{{ selectedProducts.length }} produit(s) sélectionné(s)</span>
      <button class="btn-clear" @click="selectedProducts = []">Désélectionner</button>
    </div>

    <ProductForm v-if="showForm" :product="editing" @save="submit" @cancel="close" />

    <table v-if="!showForm">
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              :disabled="filteredProducts.length === 0"
            />
          </th>
          <th>ID</th><th></th><th>Nom</th><th>Réf</th><th>Catégorie</th>
          <th>HT</th><th>TTC</th><th>Stock</th><th>Statut</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in filteredProducts" :key="p.id">
          <td class="checkbox-col">
            <input
              type="checkbox"
              :checked="selectedProducts.includes(p.id)"
              @change="toggleProduct(p.id)"
            />
          </td>
          <td>{{ p.id }}</td>
          <td><img v-if="p.img" :src="p.img" class="thumb" /></td>
          <td>{{ p.name }}</td>
          <td>{{ p.reference || '—' }}</td>
          <td>{{ p.category }}</td>
          <td>{{ f(p.price) }} €</td>
          <td>{{ f(p.price_ttc) }} €</td>
          <td :class="{ low: p.stock < 5 }">{{ p.stock }}</td>
          <td><span :class="p.active == 1 ? 'on' : 'off'">{{ p.active == 1 ? 'ON' : 'OFF' }}</span></td>
          <td>
            <button @click="edit(p)">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button @click="remove(p.id)">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>

.product-list { }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 0.75rem; flex-wrap: wrap; }
.search-box { padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 0.875rem; width: 220px; transition: border-color 0.2s; }
.search-box:focus { outline: none; border-color: #388bfd; }
.search-box::placeholder { color: #7d8590; }
.btn-add { padding: 0.5rem 1.1rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }
.btn-add:hover { background: #1f6feb; }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; vertical-align: middle; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.prod-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; background: #21262d; }
.prod-name { font-weight: 600; }
.prod-ref { font-size: 0.72rem; color: #7d8590; }
.price-cell { font-weight: 600; color: #3fb950; }
.stock-cell.ok { color: #3fb950; }
.stock-cell.low { color: #d29922; }
.stock-cell.zero { color: #f85149; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; }
.icon-btn:hover { color: #388bfd; }
.icon-btn.danger:hover { color: #f85149; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }
.spinner { width: 28px; height: 28px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 0.75rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>