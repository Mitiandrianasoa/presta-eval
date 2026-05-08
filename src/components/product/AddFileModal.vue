<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close', 'add']);

const form = ref({
  name: '',
  description: '',
  file: null as File | null
});

const submit = () => {
  if (!form.value.name.trim() || !form.value.file) {
    alert('Veuillez renseigner le nom et sélectionner un fichier.');
    return;
  }
  emit('add', {
    name: form.value.name,
    description: form.value.description,
    file: form.value.file,
    filename: form.value.file.name,
    size: form.value.file.size,
    type: form.value.file.type
  });
  form.value.name = '';
  form.value.description = '';
  form.value.file = null;
  emit('close');
};

const close = () => {
  form.value.name = '';
  form.value.description = '';
  form.value.file = null;
  emit('close');
};

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  form.value.file = input.files?.[0] || null;
};
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Ajouter un fichier joint</h3>
        <button class="close-btn" type="button" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <label>Nom du fichier</label>
        <input v-model="form.name" placeholder="Nom du document" />

        <label>Description</label>
        <textarea v-model="form.description" placeholder="Description du document"></textarea>

        <label>Fichier</label>
        <input type="file" @change="onFileChange" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="close">Annuler</button>
        <button type="button" class="btn-save" @click="submit">Ajouter</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  background: white;
  width: min(520px, 100%);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}
.modal-header,
.modal-footer {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.modal-footer {
  border-top: 1px solid #eee;
  border-bottom: none;
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-body label {
  font-weight: 600;
}
.modal-body input,
.modal-body textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}
.modal-body textarea {
  min-height: 100px;
}
.close-btn,
.btn-save,
.btn-cancel {
  border: none;
  cursor: pointer;
  border-radius: 6px;
  padding: 10px 16px;
}
.close-btn {
  background: transparent;
  font-size: 18px;
}
.btn-save {
  background: #4caf50;
  color: white;
}
.btn-cancel {
  background: #999;
  color: white;
}
</style>
