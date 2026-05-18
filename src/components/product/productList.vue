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
.container h2 { color: #f1f1f8; margin: 0 0 16px; font-size: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a0a0b8; }
th { background: rgba(255,255,255,0.03); text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
tbody tr:hover { background: rgba(255,255,255,0.03); }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.low { color: #ef4444; font-weight: bold; }
.on { background: rgba(16,185,129,0.15); color: #10b981; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.off { background: rgba(239,68,68,0.15); color: #ef4444; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.btn-add {
  display: inline-flex; align-items: center; gap: 6px;
  background: #f97316; color: white; border: none;
  padding: 10px 20px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3);
  transition: opacity 0.2s; font-family: inherit;
}
.btn-add:hover { opacity: 0.88; }

.btn-repair {
  background: rgba(245,158,11,0.12); color: #f59e0b;
  border: 1px solid rgba(245,158,11,0.2);
  padding: 10px 16px; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-weight: 500; transition: background 0.2s; font-family: inherit;
}
.btn-repair:hover:not(:disabled) { background: rgba(245,158,11,0.22); }
.btn-repair:disabled { opacity: 0.5; cursor: not-allowed; }

.repair-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 14px; font-weight: 500;
}
.repair-banner.ok   { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
.repair-banner.warn { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
.close-banner { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 14px; color: inherit; padding: 0 4px; }

button { cursor: pointer; border: none; background: none; font-size: 16px; padding: 5px; color: #6b7280; }
button:hover { color: #f97316; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }

.category-filter {
  padding: 10px 16px; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: 14px;
  background: #0d0d14; color: #e2e2f0;
  min-width: 250px; cursor: pointer; font-family: inherit;
}
.category-filter:focus { outline: none; border-color: #f97316; }

.checkbox-col { width: 40px; text-align: center; }
.checkbox-col input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

.selection-bar {
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.15);
  padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
  font-size: 14px; color: #f97316;
}

.btn-clear {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #a0a0b8; padding: 6px 12px; border-radius: 6px; cursor: pointer;
  font-size: 13px; font-weight: 500; transition: all 0.2s; font-family: inherit;
}
.btn-clear:hover { background: rgba(255,255,255,0.12); color: #f1f1f8; }
</style>
