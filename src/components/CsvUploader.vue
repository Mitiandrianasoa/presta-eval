<script setup lang="ts">
import { ref } from 'vue';
import Papa from 'papaparse';

export interface ParsedCsvFile {
  fileName: string;
  columns: string[];
  data: any[];
}

const emit = defineEmits<{
  (e: 'filesParsed', parsedFiles: ParsedCsvFile[]): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const fileNames = ref<string[]>([]);

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) return;

  fileNames.value = Array.from(files).map(f => f.name);
  const parsedFiles: ParsedCsvFile[] = [];

  // Lecture asynchrone de chaque fichier sélectionné
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await new Promise<void>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const columns = results.meta.fields || [];
          const data = results.data;
          
          parsedFiles.push({
            fileName: file.name,
            columns,
            data
          });
          resolve();
        },
        error: (error: any) => {
          console.error(`Erreur lors de la lecture du CSV ${file.name}:`, error);
          alert(`Impossible de lire le fichier ${file.name}.`);
          resolve();
        }
      });
    });
  }

  emit('filesParsed', parsedFiles);
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
      <p v-if="fileNames.length === 0">Cliquez ici pour sélectionner vos fichiers CSV (vous pouvez en sélectionner plusieurs)</p>
      <div v-else class="file-names-list">
        <p><strong>Fichiers sélectionnés :</strong></p>
        <ul>
          <li v-for="name in fileNames" :key="name">{{ name }}</li>
        </ul>
      </div>
      <input 
        type="file" 
        accept=".csv" 
        multiple
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
.file-names-list {
  text-align: left;
  color: #2e7d32;
  margin-top: 10px;
  display: inline-block;
}
.file-names-list ul {
  padding-left: 20px;
  margin-top: 5px;
}
</style>
