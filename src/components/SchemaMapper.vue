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
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.btn-auto {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-auto:hover {
  background-color: #1976d2;
}
.mapper-table {
  width: 100%;
  border-collapse: collapse;
}
.mapper-table th, .mapper-table td {
  border-bottom: 1px solid #eee;
  padding: 12px;
  text-align: left;
}
.mapper-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}
.field-name {
  font-weight: 500;
}
.required-star {
  color: red;
  font-weight: bold;
  margin-left: 4px;
}
.badge {
  font-size: 0.75rem;
  padding: 3px 6px;
  border-radius: 12px;
  margin-left: 8px;
}
.lang-badge {
  background-color: #e3f2fd;
  color: #1565c0;
}
.format-badge {
  background-color: #f5f5f5;
  color: #616161;
  font-family: monospace;
}
.col-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
