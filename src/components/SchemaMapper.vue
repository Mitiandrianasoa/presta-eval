<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FieldDefinition } from '../api/schemaService';

const props = defineProps<{
  schema: FieldDefinition[];
  csvColumns: string[];
}>();

const emit = defineEmits<{
  (e: 'mappingChanged', mapping: Record<string, string>): void;
}>();

// Objet qui stocke le choix de l'utilisateur : { champPrestashop: colonneCSV }
const mapping = ref<Record<string, string>>({});

// Met à jour le parent à chaque modification
watch(mapping, (newVal) => {
  emit('mappingChanged', newVal);
}, { deep: true });

// Fonction utilitaire pour deviner automatiquement les colonnes
const autoMap = () => {
  const newMapping: Record<string, string> = {};
  
  for (const field of props.schema) {
    if (field.readOnly) continue;
    
    // Cherche une colonne CSV qui ressemble au nom du champ PrestaShop (ex: "Name" = "name", "id_parent" = "Parent ID")
    const match = props.csvColumns.find(col => 
      col.toLowerCase().replace(/[^a-z0-9]/g, '') === field.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    
    if (match) {
      newMapping[field.name] = match;
    }
  }
  
  mapping.value = newMapping;
};
</script>

<template>
  <div class="schema-mapper">
    <div class="header">
      <h3>Correspondance des Champs (Mapping)</h3>
      <button @click="autoMap" class="btn-auto">Auto-Associer</button>
    </div>

    <table class="mapper-table">
      <thead>
        <tr>
          <th>Champ PrestaShop attendu</th>
          <th>Type / Format</th>
          <th>Colonne CSV correspondante</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="field in schema.filter(f => !f.readOnly)" :key="field.name">
          <td>
            <span class="field-name">{{ field.name }}</span>
            <span v-if="field.required" class="required-star" title="Ce champ est obligatoire">*</span>
            <span v-if="field.isMultilingual" class="badge lang-badge">Multilingue</span>
          </td>
          <td>
            <span class="badge format-badge">{{ field.format }}</span>
          </td>
          <td>
            <select v-model="mapping[field.name]" class="col-select">
              <option value="">-- Ignorer ce champ --</option>
              <option v-for="col in csvColumns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.schema-mapper {
  background: #13131f; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.header h3 { color: #f1f1f8; margin: 0; font-size: 16px; }
.btn-auto {
  background: #f97316; color: white; border: none;
  padding: 8px 16px; border-radius: 8px; cursor: pointer;
  font-weight: 600; font-size: 13px; font-family: inherit;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3); transition: opacity 0.2s;
}
.btn-auto:hover { opacity: 0.88; }
.mapper-table { width: 100%; border-collapse: collapse; }
.mapper-table th, .mapper-table td {
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding: 12px; text-align: left; color: #a0a0b8;
}
.mapper-table th { background: rgba(255,255,255,0.03); font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.field-name { font-weight: 500; color: #e2e2f0; }
.required-star { color: #ef4444; font-weight: bold; margin-left: 4px; }
.badge { font-size: 0.75rem; padding: 3px 6px; border-radius: 12px; margin-left: 8px; }
.lang-badge { background: rgba(249,115,22,0.12); color: #f97316; }
.format-badge { background: rgba(255,255,255,0.06); color: #a0a0b8; font-family: monospace; }
.col-select {
  width: 100%; padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.10); border-radius: 8px;
  background: #0d0d14; color: #e2e2f0; font-family: inherit; font-size: 13px;
}
.col-select:focus { outline: none; border-color: #f97316; }
</style>
