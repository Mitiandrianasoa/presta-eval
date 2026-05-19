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

.category-form { }
.form-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.form-group label { font-size: 0.8rem; color: #7d8590; font-weight: 500; }
.form-input, .form-select, .form-textarea {
  padding: 0.55rem 0.75rem; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s; font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #388bfd; }
.form-select option { background: #161b22; }
.form-textarea { min-height: 80px; resize: vertical; }
.submit-row { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
.btn-primary { padding: 0.55rem 1.25rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1f6feb; }
.btn-cancel { padding: 0.55rem 1.25rem; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #7d8590; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { border-color: #484f58; color: #e6edf3; }

</style>