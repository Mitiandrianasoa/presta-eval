<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api/api';
import { fetchSchema, type FieldDefinition } from '../api/schemaService';
import { buildPrestashopXml } from '../utils/prestashopXmlBuilder';
import CsvUploader from '../components/CsvUploader.vue';
import SchemaMapper from '../components/SchemaMapper.vue';

// Configuration pour cette vue spécifique
const entityName = 'category'; // Pour construire la balise XML <category>
const endpoint = 'categories'; // Pour l'URL de l'API /api/categories

// États
const schema = ref<FieldDefinition[]>([]);
const csvColumns = ref<string[]>([]);
const csvData = ref<any[]>([]);
const currentMapping = ref<Record<string, string>>({});
const isImporting = ref(false);

// Logs
interface LogEntry {
  row: number;
  status: 'success' | 'error';
  message: string;
}
const logs = ref<LogEntry[]>([]);

// 1. Au chargement, on récupère le schéma dynamique de PrestaShop
onMounted(async () => {
  try {
    schema.value = await fetchSchema(endpoint);
  } catch (error) {
    alert("Erreur lors du chargement du schéma PrestaShop. Vérifiez votre connexion API.");
  }
});

// 2. Gestion de l'upload CSV
const handleFileParsed = (columns: string[], data: any[]) => {
  csvColumns.value = columns;
  csvData.value = data;
  logs.value = []; // Reset des logs
};

// 3. Gestion du changement de mapping
const handleMappingChanged = (mapping: Record<string, string>) => {
  currentMapping.value = mapping;
};

// 4. Validation d'une ligne basée sur les règles du Schéma
const validateRow = (mappedRow: Record<string, any>): string | null => {
  for (const field of schema.value) {
    if (field.readOnly) continue;
    
    const value = mappedRow[field.name];
    
    // A. Validation du champ obligatoire
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
      return `Le champ obligatoire "${field.name}" est manquant.`;
    }
    
    // B. Validation de format spécifique (exemples courants PrestaShop)
    if (value !== undefined && value !== '') {
      if (field.format === 'isBool' && value !== '0' && value !== '1') {
        return `Le champ "${field.name}" doit être '0' ou '1'. (Reçu: ${value})`;
      }
      if ((field.format === 'isUnsignedInt' || field.format === 'isUnsignedId') && isNaN(Number(value))) {
        return `Le champ "${field.name}" doit être un nombre valide.`;
      }
    }
  }
  return null; // Tout est valide !
};

// 5. Lancer l'importation complète
const startImport = async () => {
  if (csvData.value.length === 0) {
    alert("Veuillez d'abord uploader un fichier CSV.");
    return;
  }

  isImporting.value = true;
  logs.value = [];

  // On traite le CSV ligne par ligne
  for (let i = 0; i < csvData.value.length; i++) {
    const rawRow = csvData.value[i];
    const mappedRow: Record<string, any> = {};

    // Appliquer le mapping choisi par l'utilisateur
    for (const [psField, csvCol] of Object.entries(currentMapping.value)) {
      if (csvCol) {
        let val = rawRow[csvCol];
        if (typeof val === 'string') {
          val = val.trim();
        }
        mappedRow[psField] = val;
      }
    }

    // Valider la ligne
    const validationError = validateRow(mappedRow);
    if (validationError) {
      logs.value.push({ row: i + 1, status: 'error', message: validationError });
      continue; // On saute l'envoi à l'API et on passe à la ligne suivante
    }

    // Génération et Envoi API
    try {
      const xmlPayload = buildPrestashopXml(entityName, mappedRow, schema.value);
      
      const response = await api.post(`/${endpoint}`, xmlPayload, {
        headers: {
          'Content-Type': 'application/xml',
        }
      });
      
      logs.value.push({ row: i + 1, status: 'success', message: `Catégorie importée avec succès !` });
    } catch (error: any) {
      // Extraction du message d'erreur de PrestaShop si possible
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logs.value.push({ row: i + 1, status: 'error', message: `Erreur API PrestaShop : ${errorMsg}` });
    }
  }

  isImporting.value = false;
};
</script>

<template>
  <div class="import-view">
    <div class="header-title">
      <h1>Importation de Catégories</h1>
      <span class="badge">PrestaShop API</span>
    </div>
    
    <div v-if="schema.length === 0" class="loading-state">
      <p>Chargement du schéma depuis PrestaShop...</p>
    </div>
    
    <div v-else>
      <!-- ÉTAPE A : Upload -->
      <CsvUploader @fileParsed="handleFileParsed" />

      <!-- ÉTAPE B : Mapping (affiché si le CSV est chargé) -->
      <div v-if="csvColumns.length > 0">
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

      <!-- ÉTAPE C : Logs (affichés s'il y en a) -->
      <div v-if="logs.length > 0" class="logs-container">
        <h3>Rapport d'importation</h3>
        <div class="stats">
          <span class="stat-success">{{ logs.filter(l => l.status === 'success').length }} Succès</span>
          <span class="stat-error">{{ logs.filter(l => l.status === 'error').length }} Erreurs</span>
        </div>
        
        <ul class="log-list">
          <li 
            v-for="(log, index) in logs" 
            :key="index" 
            :class="['log-item', `log-${log.status}`]"
          >
            <strong>Ligne {{ log.row }}:</strong> {{ log.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}
.badge {
  background-color: #673ab7;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}
.loading-state {
  text-align: center;
  padding: 50px;
  background: #f9f9f9;
  border-radius: 8px;
  color: #666;
}
.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}
.btn-import {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 0.3s;
}
.btn-import:hover:not(:disabled) {
  background-color: #43a047;
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(0,0,0,0.15);
}
.btn-import:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
  box-shadow: none;
}

.logs-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}
.stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  font-weight: bold;
}
.stat-success { color: #2e7d32; }
.stat-error { color: #c62828; }

.log-list {
  list-style: none;
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}
.log-item {
  padding: 12px;
  border-left: 4px solid transparent;
  margin-bottom: 8px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.log-success {
  border-left-color: #4caf50;
  color: #2e7d32;
}
.log-error {
  border-left-color: #f44336;
  color: #c62828;
}
</style>
