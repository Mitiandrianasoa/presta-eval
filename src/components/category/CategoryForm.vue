<!-- components/CategoryForm.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{ category: any }>();
const emit = defineEmits(['save', 'cancel']);

const form = ref({ name: '', description: '', active: true, id_parent: 2 });

onMounted(() => {
  if (props.category) {
    form.value = {
      name: props.category.name || '',
      description: props.category.description || '',
      active: props.category.active == 1,
      id_parent: props.category.id_parent || 2
    };
  }
});
</script>

<template>
  <form @submit.prevent="() => emit('save', { ...form })" class="form">
    <h3>{{ category ? 'Modifier' : 'Nouvelle' }} catégorie</h3>
    <input v-model="form.name" placeholder="Nom" required />
    <textarea v-model="form.description" placeholder="Description" rows="4"></textarea>
    <select v-model="form.active">
      <option :value="true">Actif</option>
      <option :value="false">Inactif</option>
    </select>
    <div class="actions">
      <button type="submit" class="btn-save">Sauvegarder</button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel">Annuler</button>
    </div>
  </form>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 10px; max-width: 500px; }
.form input, .form select, .form textarea { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
.actions { display: flex; gap: 10px; margin-top: 10px; }
.btn-save, .btn-cancel { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn-save { background: #4CAF50; color: white; }
.btn-cancel { background: #999; color: white; }
</style>