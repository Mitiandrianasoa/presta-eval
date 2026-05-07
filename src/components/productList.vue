<!-- components/ProductList.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProductStore } from '../stores/productStore';
import ProductForm from './ProductForm.vue';

const store = useProductStore();
const showForm = ref(false);
const editing = ref<any>(null);

onMounted(() => store.fetchAll());

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


</script>

<template>
  <div class="container">
    <h2>Produits</h2>
    <button v-if="!showForm" @click="add" class="btn-add"><!-- Icône Ajouter (+) -->
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg> Ajouter
    </button>

    <ProductForm v-if="showForm" :product="editing" @save="submit" @cancel="close" />

    <table v-if="!showForm">
      <thead>
        <tr>
          <th>ID</th><th></th><th>Nom</th><th>Réf</th><th>Catégorie</th>
          <th>HT</th><th>TTC</th><th>Stock</th><th>Statut</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in store.products" :key="p.id">
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
            <button @click="edit(p)"><!-- Icône Modifier (crayon) -->
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button @click="remove(p.id)">
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
/* .container { max-width: 1380px; margin: auto; padding: 0px; } */
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; text-align: left; }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.low { color: red; font-weight: bold; }
.on { background: #d4edda; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.off { background: #f8d7da; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
.btn-add { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
button { cursor: pointer; border: none; background: none; font-size: 16px; padding: 5px; }
button:hover { transform: scale(1.2); }
</style>