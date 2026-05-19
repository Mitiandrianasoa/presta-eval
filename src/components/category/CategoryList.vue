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

.category-list { }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 0.75rem; }
.search-box { padding: 0.5rem 0.75rem; background: #161b22; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 0.875rem; width: 220px; transition: border-color 0.2s; }
.search-box:focus { outline: none; border-color: #388bfd; }
.search-box::placeholder { color: #7d8590; }
.btn-add { padding: 0.5rem 1rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }
.btn-add:hover { background: #1f6feb; }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.cat-name { font-weight: 600; }
.cat-parent { font-size: 0.8rem; color: #7d8590; }
.icon-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: color 0.2s; }
.icon-btn:hover { color: #388bfd; }
.icon-btn.danger:hover { color: #f85149; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }

</style>