<script setup lang="ts">
import { ref } from 'vue';
import Papa from 'papaparse';

const emit = defineEmits<{
  (e: 'fileParsed', columns: string[], data: any[]): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref('');

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  fileName.value = file.name;

  // Utilisation de PapaParse pour lire le fichier CSV
  Papa.parse(file, {
    header: true, // La première ligne contient les noms des colonnes
    skipEmptyLines: true,
    complete: (results) => {
      // results.meta.fields contient le nom des colonnes
      // results.data contient les lignes sous forme d'objets JSON
      const columns = results.meta.fields || [];
      const data = results.data;
      
      emit('fileParsed', columns, data);
    },
    error: (error: any) => {
      console.error('Erreur lors de la lecture du CSV:', error);
      alert('Impossible de lire le fichier CSV.');
    }
  });
};

const triggerFileInput = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="csv-uploader">
    <div 
      class="upload-box" 
      @click="triggerFileInput"
    >
      <i class="upload-icon">📁</i>
      <p v-if="!fileName">Cliquez ici pour sélectionner un fichier CSV</p>
      <p v-else class="file-name">Fichier sélectionné : <strong>{{ fileName }}</strong></p>
      <input 
        type="file" 
        accept=".csv" 
        ref="fileInput" 
        @change="handleFileUpload" 
        style="display: none;"
      />
    </div>
  </div>
</template>

<style scoped>
.csv-uploader {
  margin-bottom: 20px;
}
.upload-box {
  border: 2px dashed #4caf50;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  background-color: #f9fdf9;
  transition: all 0.3s ease;
}
.upload-box:hover {
  background-color: #f1f8f1;
  border-color: #388e3c;
}
.upload-icon {
  font-size: 2rem;
  margin-bottom: 10px;
  display: block;
}
.file-name {
  color: #2e7d32;
}
</style>
