<!-- components/CategoryList.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import CategoryForm from './CategoryForm.vue';

const store = useCategoryStore();
const showForm = ref(false);
const editing = ref<any>(null);

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
    <button v-if="!showForm" @click="add" class="btn-add">+ Nouvelle catégorie</button>

    <CategoryForm v-if="showForm" :category="editing" @save="submit" @cancel="close" />

    <table v-if="!showForm">
      <thead>
        <tr><th>ID</th><th>Nom</th><th>Description</th><th>Actif</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="cat in store.categories" :key="cat.id">
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
.btn-add { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
button { cursor: pointer; border: none; background: none; font-size: 16px; }
</style>