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
    <button v-if="!showForm" @click="add" class="btn-add">+ Ajouter</button>

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
            <button @click="edit(p)">edit</button>
            <button @click="remove(p.id)">delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: auto; padding: 20px; }
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