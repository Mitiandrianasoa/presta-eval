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


.bo-page { background: #0d1117; min-height: 100vh; margin-left: 240px; padding: 2rem; color: #e6edf3; }
.bo-page-header { margin-bottom: 2rem; }
.bo-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.3rem; }
.bo-page-header p { color: #7d8590; margin: 0; font-size: 0.875rem; }

.import-section { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1.75rem; margin-bottom: 1.5rem; }
.section-title { font-size: 0.95rem; font-weight: 700; color: #e6edf3; margin: 0 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #21262d; }
.action-btn { padding: 0.6rem 1.5rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.action-btn:hover { background: #1f6feb; }
.action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-error { background: rgba(248,81,73,0.12); color: #f85149; }
.badge-warn { background: rgba(210,153,34,0.12); color: #d29922; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>