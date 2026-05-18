<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import api from '../../../api/api';
import { fetchSchema, fetchResources, type FieldDefinition, type ResourceDefinition } from '../../../api/schemaService';
import { buildPrestashopXml } from '../../../utils/prestashopXmlBuilder';
import CsvUploader from '../../../components/CsvUploader.vue';
import SchemaMapper from '../../../components/SchemaMapper.vue';

// Listes dynamiques
const resources = ref<ResourceDefinition[]>([]);
const selectedEndpoint = ref<string>('');
const searchQuery = ref<string>('');

const filteredResources = computed(() => {
  if (!searchQuery.value) return resources.value;
  const lowerQuery = searchQuery.value.toLowerCase();
  return resources.value.filter(r => 
    r.endpoint.toLowerCase().includes(lowerQuery) || 
    r.description.toLowerCase().includes(lowerQuery)
  );
});

// Configuration de l'entité en cours
const entityName = ref<string>('');
const schema = ref<FieldDefinition[]>([]);

// Données d'import
const csvColumns = ref<string[]>([]);
const csvData = ref<any[]>([]);
const currentMapping = ref<Record<string, string>>({});
const isImporting = ref(false);

interface LogEntry {
  row: number;
  status: 'success' | 'error';
  message: string;
}
const logs = ref<LogEntry[]>([]);

// 1. Au chargement, récupérer toutes les ressources disponibles
onMounted(async () => {
  resources.value = await fetchResources();
});

// 2. Lorsqu'une ressource est sélectionnée, récupérer son schéma
watch(selectedEndpoint, async (newEndpoint) => {
  // Réinitialiser les données
  schema.value = [];
  entityName.value = '';
  csvColumns.value = [];
  csvData.value = [];
  logs.value = [];
  
  if (!newEndpoint) return;
  
  try {
    const result = await fetchSchema(newEndpoint);
    schema.value = result.fields;
    entityName.value = result.entityName; // Ex: 'category' récupéré du XML
  } catch (error) {
    alert(`Impossible de récupérer le schéma pour ${newEndpoint}`);
    selectedEndpoint.value = '';
  }
});

const handleFileParsed = (columns: string[], data: any[]) => {
  csvColumns.value = columns;
  csvData.value = data;
  logs.value = [];
};

const handleMappingChanged = (mapping: Record<string, string>) => {
  currentMapping.value = mapping;
};

const validateRow = (mappedRow: Record<string, any>): string | null => {
  for (const field of schema.value) {
    if (field.readOnly) continue;
    
    const value = mappedRow[field.name];
    
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
      return `Le champ obligatoire "${field.name}" est manquant.`;
    }
    
    if (value !== undefined && value !== '') {
      if (field.format === 'isBool' && value !== '0' && value !== '1') {
        return `Le champ "${field.name}" doit être '0' ou '1'. (Reçu: ${value})`;
      }
      if ((field.format === 'isUnsignedInt' || field.format === 'isUnsignedId') && isNaN(Number(value))) {
        return `Le champ "${field.name}" doit être un nombre valide.`;
      }
    }
  }
  return null;
};

const startImport = async () => {
  if (csvData.value.length === 0) return;

  isImporting.value = true;
  logs.value = [];

  for (let i = 0; i < csvData.value.length; i++) {
    const rawRow = csvData.value[i];
    const mappedRow: Record<string, any> = {};

    for (const [psField, csvCol] of Object.entries(currentMapping.value)) {
      if (csvCol) {
        let val = rawRow[csvCol];
        if (typeof val === 'string') {
          val = val.trim();
        }
        mappedRow[psField] = val;
      }
    }

    const validationError = validateRow(mappedRow);
    if (validationError) {
      logs.value.push({ row: i + 1, status: 'error', message: validationError });
      continue;
    }

    try {
      const xmlPayload = buildPrestashopXml(entityName.value, mappedRow, schema.value);
      
      await api.post(`/${selectedEndpoint.value}`, xmlPayload, {
        headers: { 'Content-Type': 'application/xml' }
      });
      
      logs.value.push({ row: i + 1, status: 'success', message: `${entityName.value} inséré(e) avec succès !` });
    } catch (error: any) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logs.value.push({ row: i + 1, status: 'error', message: `Erreur API : ${errorMsg}` });
    }
  }

  isImporting.value = false;
};
</script>

<template>
  <div class="import-view">
    <div class="header-title">
      <h1>Importateur Universel PrestaShop</h1>
      <span class="badge">API Dynamique</span>
    </div>

    <!-- SÉLECTEUR DE RESSOURCE -->
    <div class="resource-selector card">
      <label for="resourceSelect"><strong>1. Choisissez ce que vous souhaitez importer :</strong></label>
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Rechercher une ressource (ex: products, customers...)" 
        class="search-box"
      />
      <select id="resourceSelect" v-model="selectedEndpoint" class="select-box" size="6" v-if="filteredResources.length > 0">
        <option v-for="res in filteredResources" :key="res.endpoint" :value="res.endpoint">
          {{ res.endpoint }} - {{ res.description }}
        </option>
      </select>
      <p v-else class="no-results">Aucune ressource trouvée pour "{{ searchQuery }}"</p>
    </div>
    
    <div v-if="selectedEndpoint && schema.length === 0" class="loading-state">
      <p>Chargement du schéma pour {{ selectedEndpoint }}...</p>
    </div>
    
    <div v-if="schema.length > 0" class="import-process">
      <div class="card">
        <h3>2. Chargez votre fichier CSV</h3>
        <CsvUploader @fileParsed="handleFileParsed" />
      </div>

      <div v-if="csvColumns.length > 0" class="card">
        <SchemaMapper 
          :schema="schema" 
          :csvColumns="csvColumns" 
          @mappingChanged="handleMappingChanged" 
        />
        
        <div class="action-bar">
          <button 
            @click="startImport" 
            :disabled="isImporting" 
            class="btn-import"
          >
            {{ isImporting ? 'Importation en cours...' : 'Lancer l\'importation' }}
          </button>
        </div>
      </div>

      <!-- Logs -->
      <div v-if="logs.length > 0" class="logs-container card">
        <h3>Rapport d'importation</h3>
        <div class="stats">
          <span class="stat-success">{{ logs.filter(l => l.status === 'success').length }} Succès</span>
          <span class="stat-error">{{ logs.filter(l => l.status === 'error').length }} Erreurs</span>
        </div>
        <ul class="log-list">
          <li v-for="(log, index) in logs" :key="index" :class="['log-item', `log-${log.status}`]">
            <strong>Ligne {{ log.row }}:</strong> {{ log.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-view { padding: 20px; max-width: 1000px; margin: 0 auto; }
.header-title { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.header-title h1 { color: #f1f1f8; font-size: 1.5rem; margin: 0; }
.badge { background: rgba(249,115,22,0.15); color: #f97316; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.card { background: #13131f; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.card h3 { color: #f1f1f8; margin: 0 0 16px; font-size: 15px; }
.resource-selector { display: flex; flex-direction: column; gap: 10px; }
.resource-selector label { color: #a0a0b8; font-size: 14px; }
.search-box {
  width: 100%; padding: 10px 14px; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: 14px; margin-bottom: 10px;
  background: #0d0d14; color: #e2e2f0; font-family: inherit; outline: none; transition: border-color 0.2s;
}
.search-box:focus { border-color: #f97316; }
.select-box {
  width: 100%; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: 13px; background: #0d0d14; color: #e2e2f0;
  cursor: pointer; transition: border-color 0.2s; max-height: 300px; font-family: inherit;
}
.select-box:focus { outline: none; border-color: #f97316; }
.select-box option { padding: 6px 8px; background: #0d0d14; color: #e2e2f0; }
.no-results { color: #6b7280; font-style: italic; text-align: center; padding: 10px; }
.loading-state { text-align: center; padding: 50px; background: #13131f; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; color: #6b7280; }
.action-bar { display: flex; justify-content: flex-end; margin-top: 15px; }
.btn-import {
  background: #f97316; color: white; border: none;
  padding: 12px 24px; border-radius: 8px; font-size: 1rem; font-weight: 600;
  cursor: pointer; box-shadow: 0 2px 8px rgba(249,115,22,0.3); transition: all 0.2s; font-family: inherit;
}
.btn-import:hover:not(:disabled) { opacity: 0.88; transform: translateY(-2px); }
.btn-import:disabled { opacity: 0.4; cursor: not-allowed; }
.stats { display: flex; gap: 15px; margin-bottom: 15px; font-weight: bold; }
.stat-success { color: #10b981; }
.stat-error { color: #ef4444; }
.log-list { list-style: none; padding: 0; max-height: 300px; overflow-y: auto; }
.log-item { padding: 10px 12px; border-left: 4px solid transparent; margin-bottom: 5px; border-radius: 6px; font-size: 14px; }
.log-success { border-left-color: #10b981; background: rgba(16,185,129,0.08); color: #10b981; }
.log-error { border-left-color: #ef4444; background: rgba(239,68,68,0.08); color: #f87171; }
</style>
