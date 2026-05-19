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

.csv-uploader { }
.drop-zone {
  border: 2px dashed #30363d;
  border-radius: 10px;
  padding: 2.5rem;
  text-align: center;
  color: #7d8590;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.drop-zone:hover, .drop-zone.drag-over { border-color: rgba(56,139,253,0.5); background: rgba(56,139,253,0.03); color: #388bfd; }
.drop-icon { font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.6; }
.drop-zone h4 { font-size: 0.95rem; font-weight: 600; color: #e6edf3; margin: 0 0 0.35rem; }
.drop-zone p { font-size: 0.8rem; margin: 0; }
.file-input { display: none; }
.file-selected { display: flex; align-items: center; gap: 0.75rem; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 0.875rem 1rem; }
.file-icon { font-size: 1.25rem; }
.file-name { font-size: 0.875rem; font-weight: 500; color: #e6edf3; flex: 1; }
.file-size { font-size: 0.75rem; color: #7d8590; }
.remove-file { background: transparent; border: none; color: #7d8590; cursor: pointer; padding: 0.25rem; border-radius: 4px; transition: color 0.2s; font-size: 1rem; }
.remove-file:hover { color: #f85149; }
.upload-btn { margin-top: 1rem; padding: 0.6rem 1.5rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.upload-btn:hover { background: #1f6feb; }
.upload-btn:disabled { opacity: 0.45; cursor: not-allowed; }

</style>