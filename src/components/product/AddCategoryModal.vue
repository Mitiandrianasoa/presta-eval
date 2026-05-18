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
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal {
  background: #13131f;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  min-width: 400px; max-width: 500px;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h3 { margin: 0; font-size: 18px; color: #f1f1f8; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; }
.close-btn:hover { color: #f1f1f8; }

.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.modal-body label { font-weight: 600; font-size: 13px; color: #a0a0b8; }
.modal-body input {
  padding: 10px 12px; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; background: #0d0d14; color: #e2e2f0; font-family: inherit; font-size: 14px;
}
.modal-body input:focus { outline: none; border-color: #f97316; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 18px; border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-save, .btn-cancel { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; font-family: inherit; transition: opacity 0.2s; }
.btn-save { background: #f97316; color: white; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
.btn-save:hover { opacity: 0.88; }
.btn-cancel { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #a0a0b8; }
.btn-cancel:hover { background: rgba(255,255,255,0.12); color: #f1f1f8; }
</style>
