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
th, td { padding: 10px; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; text-align: left; }
.on, .off { padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.on { background: #d4edda; }
.off { background: #f8d7da; }
.btn-add { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
button { cursor: pointer; border: none; background: none; font-size: 16px; }

.filters {
  margin-bottom: 20px;
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