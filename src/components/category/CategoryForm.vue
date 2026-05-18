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
.form { display: flex; flex-direction: column; gap: 12px; max-width: 500px; }
.form h3 { color: #f1f1f8; margin: 0 0 8px; font-size: 16px; }
.form input, .form select, .form textarea {
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  background: #0d0d14;
  color: #e2e2f0;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s;
}
.form input:focus, .form select:focus, .form textarea:focus {
  outline: none; border-color: #f97316;
}
.form textarea { resize: vertical; }
.actions { display: flex; gap: 10px; margin-top: 4px; }
.btn-save, .btn-cancel { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; font-family: inherit; transition: opacity 0.2s; }
.btn-save { background: #f97316; color: white; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
.btn-save:hover { opacity: 0.88; }
.btn-cancel { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #a0a0b8; }
.btn-cancel:hover { background: rgba(255,255,255,0.12); color: #f1f1f8; }
</style>