<template>
  <div class="import-container">
    <h1>Gestionnaire d'Importation PrestaShop</h1>
    
    <!-- Zone d'upload des 4 fichiers -->
    <div class="uploads-grid">
      <!-- Fichier 1 : Produits -->
      <div class="upload-card">
        <h3>📦 Fichier 1 - Produits</h3>
        <input type="file" accept=".csv" @change="handleFileUpload1" ref="fileInput1" />
        <div v-if="fileStatus1" class="file-status" :class="fileStatus1.type">
          {{ fileStatus1.message }}
        </div>
      </div>

      <!-- Fichier 2 : Déclinaisons -->
      <div class="upload-card">
        <h3>🏷️ Fichier 2 - Déclinaisons & Stocks</h3>
        <input type="file" accept=".csv" @change="handleFileUpload2" ref="fileInput2" />
        <div v-if="fileStatus2" class="file-status" :class="fileStatus2.type">
          {{ fileStatus2.message }}
        </div>
      </div>

      <!-- Fichier 3 : Commandes -->
      <div class="upload-card">
        <h3>🛒 Fichier 3 - Commandes</h3>
        <input type="file" accept=".csv" @change="handleFileUpload3" ref="fileInput3" />
        <div v-if="fileStatus3" class="file-status" :class="fileStatus3.type">
          {{ fileStatus3.message }}
        </div>
      </div>

      <!-- Fichier 4 : Photos -->
      <div class="upload-card">
        <h3>🖼️ Fichier 4 - Photos (ZIP)</h3>
        <input type="file" accept=".zip" @change="handleFileUpload4" ref="fileInput4" />
        <div v-if="fileStatus4" class="file-status" :class="fileStatus4.type">
          {{ fileStatus4.message }}
        </div>
      </div>
    </div>

    <!-- Bouton unique -->
    <div class="import-action">
      <button 
        :disabled="!allFilesLoaded || isImporting" 
        @click="lancerTousLesImports" 
        class="btn-import-all"
      >
        <span v-if="!isImporting">🚀 Lancer tous les imports</span>
        <span v-else>⏳ Importation en cours... {{ importStep }}</span>
      </button>
    </div>

    <!-- Message global -->
    <div v-if="globalStatusMessage" :class="['status-box', globalSuccess ? 'success' : 'error']">
      <strong>Statut global :</strong> {{ globalStatusMessage }}
    </div>

    <!-- Barre de progression globale -->
    <div v-if="isImporting" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: globalProgress + '%' }"></div>
      </div>
      <p class="progress-text">{{ globalProgress }}% - {{ importStep }}</p>
    </div>

    <!-- Tableaux de suivi -->
    <div v-if="produitsTraites.length" class="report-section">
      <h3>📦 Produits</h3>
      <table class="report-table">
        <thead><tr><th>Référence</th><th>Nom</th><th>Prix HT</th><th>ID Produit</th><th>État</th></tr></thead>
        <tbody>
          <tr v-for="prod in produitsTraites" :key="prod.reference" :class="prod.status">
            <td>{{ prod.reference }}</td><td>{{ prod.nom }}</td><td>{{ prod.prix_ht }} €</td>
            <td class="center">{{ prod.id_prestashop || '-' }}</td>
            <td><span :class="getStatusClass(prod.status)">{{ getStatusText(prod.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="declinaisonsTraitees.length" class="report-section">
      <h3>🏷️ Déclinaisons</h3>
      <table class="report-table">
        <thead><tr><th>Référence</th><th>Spécificité</th><th>Karazany</th><th>Stock</th><th>ID Produit</th><th>ID Déclinaison</th><th>État</th></tr></thead>
        <tbody>
          <tr v-for="decl in declinaisonsTraitees" :key="`${decl.reference}_${decl.specificite}`" :class="decl.status">
            <td>{{ decl.reference }}</td><td>{{ decl.specificite || 'N/A' }}</td><td>{{ decl.karazany || 'N/A' }}</td>
            <td class="center">{{ decl.stock_initial }}</td><td class="center">{{ decl.id_product || '-' }}</td>
            <td class="center">{{ decl.id_product_attribute || '-' }}</td>
            <td><span :class="getStatusClass(decl.status)">{{ getStatusText(decl.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="commandesTraitees.length" class="report-section">
      <h3>🛒 Commandes</h3>
      <table class="report-table">
        <thead><tr><th>Client</th><th>Email</th><th>Date</th><th>ID Client</th><th>ID Commande</th><th>État</th></tr></thead>
        <tbody>
          <tr v-for="cmd in commandesTraitees" :key="`${cmd.email}_${cmd.date}`" :class="cmd.status">
            <td>{{ cmd.nom }}</td><td>{{ cmd.email }}</td><td>{{ cmd.date }}</td>
            <td class="center">{{ cmd.id_customer || '-' }}</td><td class="center">{{ cmd.id_order || '-' }}</td>
            <td><span :class="getStatusClass(cmd.status)">{{ getStatusText(cmd.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="photosTraitees.length" class="report-section">
      <h3>🖼️ Photos</h3>
      <table class="report-table">
        <thead><tr><th>Fichier</th><th>Référence</th><th>ID Produit</th><th>ID Image</th><th>État</th></tr></thead>
        <tbody>
          <tr v-for="photo in photosTraitees" :key="photo.filename" :class="photo.status">
            <td>{{ photo.filename }}</td><td>{{ photo.reference }}</td>
            <td class="center">{{ photo.id_product || '-' }}</td><td class="center">{{ photo.id_image || '-' }}</td>
            <td><span :class="getStatusClass(photo.status)">{{ getStatusText(photo.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Papa from 'papaparse';
import Sidebar from '@/components/Sidebar.vue';

// États des fichiers
const fileInput1 = ref(null);
const fileInput2 = ref(null);
const fileInput3 = ref(null);
const fileInput4 = ref(null);

const fileStatus1 = ref(null);
const fileStatus2 = ref(null);
const fileStatus3 = ref(null);
const fileStatus4 = ref(null);

// Données
const csvData1 = ref([]);
const csvData2 = ref([]);
const csvData3 = ref([]);
const zipFile = ref(null);

const produitsTraites = ref([]);
const declinaisonsTraitees = ref([]);
const commandesTraitees = ref([]);
const photosTraitees = ref([]);

// États d'import
const isImporting = ref(false);
const importStep = ref('');
const globalProgress = ref(0);
const globalStatusMessage = ref('');
const globalSuccess = ref(true);

// Vérification que tous les fichiers sont chargés
const allFilesLoaded = computed(() => {
  return csvData1.value.length > 0 && 
         csvData2.value.length > 0 && 
         csvData3.value.length > 0 && 
         zipFile.value !== null;
});

// Gestionnaires d'upload
const handleFileUpload1 = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData1.value = results.data;
      produitsTraites.value = results.data.map(row => ({
        reference: row.reference?.trim(),
        nom: row.nom?.trim(),
        prix_ht: row.prix_ttc ? (parseFloat(row.prix_ttc) / 1.2).toFixed(2) : '0',
        id_prestashop: null,
        status: 'pending',
        erreur: ''
      }));
      fileStatus1.value = { type: 'success', message: `✅ ${produitsTraites.value.length} produits chargés` };
    }
  });
};

const handleFileUpload2 = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData2.value = results.data;
      declinaisonsTraitees.value = results.data.map(row => ({
        reference: row.reference?.trim(),
        specificite: row.specificité?.trim() || row.specificite?.trim() || '',
        karazany: row.karazany?.trim() || '',
        stock_initial: parseInt(row.stock_initial) || 0,
        id_product: null,
        id_product_attribute: null,
        status: 'pending',
        erreur: ''
      }));
      fileStatus2.value = { type: 'success', message: `✅ ${declinaisonsTraitees.value.length} déclinaisons chargées` };
    }
  });
};

const handleFileUpload3 = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData3.value = results.data;
      commandesTraitees.value = results.data.map(row => ({
        date: row.date?.trim(),
        nom: row.nom?.trim(),
        email: row.email?.trim(),
        id_customer: null,
        id_order: null,
        status: 'pending',
        erreur: ''
      }));
      fileStatus3.value = { type: 'success', message: `✅ ${commandesTraitees.value.length} commandes chargées` };
    }
  });
};

const handleFileUpload4 = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  zipFile.value = file;
  fileStatus4.value = { type: 'success', message: `✅ ZIP "${file.name}" chargé` };
};

// Simulation d'import (remplacez par vos vraies fonctions)
const importerProduits = async () => {
  importStep.value = 'Import des produits...';
  for (let i = 0; i < produitsTraites.value.length; i++) {
    const prod = produitsTraites.value[i];
    await new Promise(r => setTimeout(r, 10));
    prod.id_prestashop = Math.floor(Math.random() * 10000);
    prod.status = 'success';
  }
  globalProgress.value = 25;
};

const importerDeclinaisons = async () => {
  importStep.value = 'Import des déclinaisons...';
  for (let i = 0; i < declinaisonsTraitees.value.length; i++) {
    const decl = declinaisonsTraitees.value[i];
    await new Promise(r => setTimeout(r, 10));
    decl.id_product = Math.floor(Math.random() * 10000);
    decl.id_product_attribute = Math.floor(Math.random() * 10000);
    decl.status = 'success';
  }
  globalProgress.value = 50;
};

const importerCommandes = async () => {
  importStep.value = 'Import des commandes...';
  for (let i = 0; i < commandesTraitees.value.length; i++) {
    const cmd = commandesTraitees.value[i];
    await new Promise(r => setTimeout(r, 10));
    cmd.id_customer = Math.floor(Math.random() * 10000);
    cmd.id_order = Math.floor(Math.random() * 10000);
    cmd.status = 'success';
  }
  globalProgress.value = 75;
};

const importerPhotos = async () => {
  importStep.value = 'Import des photos...';
  const fichiersSimules = [
    { filename: 'REF001.jpg', reference: 'REF001', id_product: 1, id_image: 100, status: 'success', erreur: '' },
    { filename: 'REF002.jpg', reference: 'REF002', id_product: 2, id_image: 101, status: 'success', erreur: '' },
    { filename: 'REF003.jpg', reference: 'REF003', id_product: 3, id_image: 102, status: 'success', erreur: '' }
  ];
  for (let i = 0; i < fichiersSimules.length; i++) {
    await new Promise(r => setTimeout(r, 10));
    photosTraitees.value.push(fichiersSimules[i]);
  }
  globalProgress.value = 100;
};

// Lancement de tous les imports
const lancerTousLesImports = async () => {
  if (!allFilesLoaded.value) {
    globalStatusMessage.value = '❌ Veuillez charger les 4 fichiers avant de lancer l\'import.';
    globalSuccess.value = false;
    return;
  }

  isImporting.value = true;
  globalProgress.value = 0;
  globalStatusMessage.value = '';
  globalSuccess.value = true;

  try {
    await importerProduits();
    await importerDeclinaisons();
    await importerCommandes();
    await importerPhotos();
    
    globalStatusMessage.value = '✅ Tous les imports ont été réalisés avec succès !';
    globalSuccess.value = true;
  } catch (error) {
    globalStatusMessage.value = `❌ Erreur lors de l'import : ${error.message}`;
    globalSuccess.value = false;
  } finally {
    isImporting.value = false;
    importStep.value = '';
  }
};

// Helpers
const getStatusClass = (status) => {
  const classes = { pending: 'txt-pending', success: 'txt-success', error: 'txt-error' };
  return classes[status] || 'txt-pending';
};

const getStatusText = (status) => {
  const texts = { pending: 'En attente...', success: '✔ Succès', error: '✘ Erreur' };
  return texts[status] || status;
};
</script>

<style scoped>
.import-container { max-width: 1400px; margin: 20px auto; padding: 20px; background: #13131f; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); color: #a0a0b8; }
.import-container h2 { color: #f1f1f8; margin: 0 0 20px; }

.uploads-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
.upload-card { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); text-align: center; }
.upload-card h3 { margin: 0 0 15px; font-size: 1.1em; color: #f1f1f8; }
.upload-card input { margin: 10px 0; }
.file-status { margin-top: 10px; padding: 8px; border-radius: 6px; font-size: 12px; }
.file-status.success { background: rgba(16,185,129,0.12); color: #10b981; }
.file-status.error { background: rgba(239,68,68,0.12); color: #ef4444; }

.import-action { text-align: center; margin: 20px 0; }
.btn-import-all { padding: 15px 40px; font-size: 18px; background: #f97316; border: none; color: white; font-weight: 600; cursor: pointer; border-radius: 10px; box-shadow: 0 4px 16px rgba(249,115,22,0.4); transition: all 0.2s; font-family: inherit; }
.btn-import-all:hover:not(:disabled) { opacity: 0.88; transform: scale(1.02); }
.btn-import-all:disabled { opacity: 0.4; cursor: not-allowed; }

.status-box { padding: 15px; margin: 20px 0; border-left: 4px solid; border-radius: 8px; }
.status-box.success { background: rgba(16,185,129,0.10); border-left-color: #10b981; color: #10b981; }
.status-box.error { background: rgba(239,68,68,0.10); border-left-color: #ef4444; color: #f87171; }

.progress-section { margin: 20px 0; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); }
.progress-bar { width: 100%; height: 30px; background: rgba(255,255,255,0.06); border-radius: 15px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #fb923c); transition: width 0.3s ease; border-radius: 15px; }
.progress-text { text-align: center; margin-top: 10px; font-weight: bold; color: #f97316; }

.report-section { margin-top: 30px; background: rgba(255,255,255,0.02); border-radius: 10px; padding: 15px; border: 1px solid rgba(255,255,255,0.06); }
.report-section h3 { margin: 0 0 15px; padding-bottom: 10px; border-bottom: 2px solid #f97316; color: #f1f1f8; }
.report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.report-table th, .report-table td { border: 1px solid rgba(255,255,255,0.06); padding: 8px 12px; text-align: left; }
.report-table th { background: rgba(255,255,255,0.03); color: #6b7280; font-weight: 600; text-transform: uppercase; }
.report-table td { color: #a0a0b8; }
.center { text-align: center; }
.success td { background: rgba(16,185,129,0.06); }
.error td { background: rgba(239,68,68,0.06); }
.txt-success { color: #10b981; font-weight: bold; }
.txt-error { color: #ef4444; font-weight: bold; }
.txt-pending { color: #6b7280; }
</style>