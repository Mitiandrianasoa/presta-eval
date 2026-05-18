<!-- components/CategoryList.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import CategoryForm from './CategoryForm.vue';

const store = useCategoryStore();
const showForm = ref(false);
const editing = ref<any>(null);
const selectedCategories = ref<string[]>([]);

const isAllSelected = computed(() => {
  return store.categories.length > 0 && selectedCategories.value.length === store.categories.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCategories.value = [];
  } else {
    selectedCategories.value = store.categories.map(c => c.id);
  }
};

const toggleCategory = (id: string) => {
  const index = selectedCategories.value.indexOf(id);
  if (index === -1) {
    selectedCategories.value.push(id);
  } else {
    selectedCategories.value.splice(index, 1);
  }
};

onMounted(() => store.fetchAll());

const add = () => { editing.value = null; showForm.value = true; };
const edit = (cat: any) => { editing.value = { ...cat }; showForm.value = true; };
const close = () => { showForm.value = false; editing.value = null; };

const submit = async (data: any) => {
  await store.save(data, editing.value?.id);
  close();
};

const remove = async (id: number) => {
  if (confirm('Supprimer cette catégorie ?')) await store.remove(id);
};
</script>

<template>
  <div>
    <h2>Gestion des Catégories</h2>
    <div class="filters" v-if="!showForm">
      <button @click="add" class="btn-add">+ Nouvelle catégorie</button>
    </div>

    <div v-if="selectedCategories.length > 0 && !showForm" class="selection-bar">
      <span>{{ selectedCategories.length }} catégorie(s) sélectionnée(s)</span>
      <button class="btn-clear" @click="selectedCategories = []">Désélectionner</button>
    </div>

    <CategoryForm v-if="showForm" :category="editing" @save="submit" @cancel="close" />

    <table v-if="!showForm">
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              :disabled="store.categories.length === 0"
            />
          </th>
          <th>ID</th><th>Nom</th><th>Description</th><th>Actif</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cat in store.categories" :key="cat.id">
          <td class="checkbox-col">
            <input
              type="checkbox"
              :checked="selectedCategories.includes(cat.id)"
              @change="toggleCategory(cat.id)"
            />
          </td>
          <td>{{ cat.id }}</td>
          <td>{{ cat.name }}</td>
          <td>{{ cat.description?.substring(0, 100) }}...</td>
          <td><span :class="cat.active == 1 ? 'on' : 'off'">{{ cat.active == 1 ? 'ON' : 'OFF' }}</span></td>
          <td>
            <button @click="edit(cat)">
               <!-- Icône Modifier (crayon) -->
                <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg> 
            </button>
            <button @click="remove(cat.id)">
                <!-- Icône Supprimer (poubelle) -->
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
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a0a0b8; }
th { background: rgba(255,255,255,0.03); text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
tbody tr:hover { background: rgba(255,255,255,0.03); }
.on, .off { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.on { background: rgba(16,185,129,0.15); color: #10b981; }
.off { background: rgba(239,68,68,0.15); color: #ef4444; }
.btn-add {
  display: inline-flex; align-items: center; gap: 8px;
  background: #f97316; color: white; border: none;
  padding: 10px 20px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 500;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3);
  transition: opacity 0.2s; font-family: inherit;
}
.btn-add:hover { opacity: 0.88; }
button { cursor: pointer; border: none; background: none; font-size: 16px; color: #a0a0b8; }
button:hover { color: #f97316; }
h2 { color: #f1f1f8; margin: 0 0 16px; font-size: 20px; }

.filters { margin-bottom: 20px; }

.checkbox-col { width: 40px; text-align: center; }
.checkbox-col input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

.selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.15);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #f97316;
}

.btn-clear {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #a0a0b8;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-clear:hover { background: rgba(255,255,255,0.12); color: #f1f1f8; }
</style>