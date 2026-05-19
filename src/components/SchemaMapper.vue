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

.schema-mapper { }
.mapper-title { font-size: 0.875rem; font-weight: 700; color: #e6edf3; margin: 0 0 1.25rem; }
.mapper-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.75rem; align-items: center; }
.mapper-header { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.arrow { color: #7d8590; text-align: center; }
.mapper-row { display: contents; }
.csv-col {
  padding: 0.5rem 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
}
.field-select {
  padding: 0.5rem 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.8rem;
  transition: border-color 0.2s;
  width: 100%;
}
.field-select:focus { outline: none; border-color: #388bfd; }
.field-select option { background: #161b22; }
.field-select.mapped { border-color: rgba(63,185,80,0.3); }
.preview-table { width: 100%; border-collapse: collapse; margin-top: 1.25rem; }
.preview-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #21262d; }
.preview-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #21262d; font-size: 0.8rem; color: #e6edf3; }
.preview-table tr:last-child td { border-bottom: none; }

</style>