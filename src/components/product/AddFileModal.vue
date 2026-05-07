<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close', 'add']);
 
const form = ref({
  name: '',
  description: '',
  file: null as File | null
});

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) {
    form.value.file = input.files[0];
  }
};

const submit = () => {
  if (!form.value.file || !form.value.name.trim()) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  emit('add', {
    name: form.value.name,
    description: form.value.description,
    file: form.value.file
  });
  form.value = { name: '', description: '', file: null };
  emit('close');
};

const close = () => {
  form.value = { name: '', description: '', file: null };
  emit('close');
};
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>Ajouter un fichier joint</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <label>Nom du fichier</label>
        <input v-model="form.name" placeholder="Nom du fichier" />
        
        <label>Description</label>
        <textarea v-model="form.description" placeholder="Description du fichier"></textarea>
        
        <label>Fichier</label>
        <input type="file" @change="handleFileSelect" />
        <p v-if="form.file" class="file-info">
          ✓ {{ form.file.name }}
        </p>
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 400px;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid #ddd;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-body label {
  font-weight: 600;
}

.modal-body input,
.modal-body textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

.file-info {
  margin: 0;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 4px;
  color: #2e7d32;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px;
  border-top: 1px solid #ddd;
}

.btn-save,
.btn-cancel {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-cancel {
  background: #999;
  color: white;
}
</style>
