<script setup lang="ts">
import { ref } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close', 'add']);

const categoryStore = useCategoryStore();
const form = ref({ name: '' });

const submit = async () => {
  if (!form.value.name.trim()) return;
  await categoryStore.save({ name: form.value.name, active: '1' });
  emit('add', categoryStore.categories[categoryStore.categories.length - 1]);
  form.value.name = '';
  emit('close');
};

const close = () => {
  form.value.name = '';
  emit('close');
};
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Ajouter une catégorie</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <label>Nom de la catégorie</label>
        <input v-model="form.name" placeholder="Nom" @keyup.enter="submit" />
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Annuler</button>
        <button class="btn-save" @click="submit">Ajouter</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9000; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 1.75rem; width: 90%; max-width: 480px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.modal-header h3 { font-size: 1rem; font-weight: 700; color: #e6edf3; margin: 0; }
.close-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; font-size: 1.25rem; padding: 0; line-height: 1; transition: color 0.2s; }
.close-btn:hover { color: #e6edf3; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.form-group label { font-size: 0.8rem; color: #7d8590; font-weight: 500; }
.form-input, .form-select {
  padding: 0.55rem 0.75rem; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s;
}
.form-input:focus, .form-select:focus { outline: none; border-color: #388bfd; }
.form-select option { background: #161b22; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-primary { padding: 0.55rem 1.25rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1f6feb; }
.btn-cancel { padding: 0.55rem 1.25rem; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #7d8590; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { border-color: #484f58; color: #e6edf3; }

</style>