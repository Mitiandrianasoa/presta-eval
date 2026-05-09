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
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; text-align: left; }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.low { color: red; font-weight: bold; }
.on { background: #d4edda; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.off { background: #f8d7da; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.btn-add { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
button { cursor: pointer; border: none; background: none; font-size: 16px; padding: 5px; }
button:hover { transform: scale(1.2); }

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.category-filter {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  min-width: 250px;
  cursor: pointer;
}

.category-filter:focus {
  outline: none;
  border-color: #4CAF50;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.checkbox-col input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #e3f2fd;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1976d2;
}

.btn-clear {
  background: #fff;
  border: 1px solid #1976d2;
  color: #1976d2;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #1976d2;
  color: white;
}
</style>
