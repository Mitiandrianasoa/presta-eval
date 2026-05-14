<!-- views/ImportView.vue -->
<template>
  <div class="import-layout">
    <Sidebar
      @show-products="handleNavigation"
      @show-categories="handleNavigation"
      @show-stock="handleNavigation"
      @show-customers="handleNavigation"
      @show-brands-suppliers="handleNavigation"
      @show-import="handleNavigation"
    />

    <div class="import-container">
      <div class="import-header">
        <h1>Import de données</h1>
        <p>Importez vos fichiers CSV ou une archive ZIP contenant les fichiers CSV</p>
      </div>

      <div class="import-grid">
        <!-- Input 1: Produits CSV (fichier1) -->
        <div class="import-card" :class="{ 'card-active': files.products }">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h3>Produits</h3>
            <span class="badge-entities">produits · catégories · taxes</span>
          </div>
          <div class="card-content">
            <div
              class="file-drop-zone"
              :class="{ 'drag-over': dragOver['products'] }"
              @dragover.prevent="dragOver['products'] = true"
              @dragleave.prevent="dragOver['products'] = false"
              @drop.prevent="handleDrop($event, 'products')"
            >
              <input
                type="file"
                ref="productsInput"
                accept=".csv"
                @change="handleFileChange($event, 'products')"
                style="display: none"
              />
              <button @click="triggerFileInput('products')" class="upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Choisir un fichier
              </button>
              <p class="file-info">CSV uniquement · colonnes : date, nom, référence, prix_ttc, Taxe, catégorie</p>
            </div>
            <div v-if="files.products" class="file-selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ files.products.name }}</span>
              <button @click="removeFile('products')" class="remove-btn">×</button>
            </div>
          </div>
        </div>

        <!-- Input 2: Stock + Prix spécifiques CSV (fichier2) -->
        <div class="import-card" :class="{ 'card-active': files.categories }">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <h3>Stock & Prix</h3>
            <span class="badge-entities">stock · prix spécifiques</span>
          </div>
          <div class="card-content">
            <div
              class="file-drop-zone"
              :class="{ 'drag-over': dragOver['categories'] }"
              @dragover.prevent="dragOver['categories'] = true"
              @dragleave.prevent="dragOver['categories'] = false"
              @drop.prevent="handleDrop($event, 'categories')"
            >
              <input
                type="file"
                ref="categoriesInput"
                accept=".csv"
                @change="handleFileChange($event, 'categories')"
                style="display: none"
              />
              <button @click="triggerFileInput('categories')" class="upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Choisir un fichier
              </button>
              <p class="file-info">CSV uniquement · colonnes : reference, stock_initial, prix_vente_ttc</p>
            </div>
            <div v-if="files.categories" class="file-selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ files.categories.name }}</span>
              <button @click="removeFile('categories')" class="remove-btn">×</button>
            </div>
          </div>
        </div>

        <!-- Input 3: Stock CSV (fichier2) -->
        <div class="import-card" :class="{ 'card-active': files.stock }">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                <line x1="8" y1="11" x2="16" y2="11"/>
                <line x1="8" y1="15" x2="16" y2="15"/>
              </svg>
            </div>
            <h3>Commandes</h3>
            <span class="badge-entities">clients · adresses · commandes</span>
          </div>
          <div class="card-content">
            <div
              class="file-drop-zone"
              :class="{ 'drag-over': dragOver['stock'] }"
              @dragover.prevent="dragOver['stock'] = true"
              @dragleave.prevent="dragOver['stock'] = false"
              @drop.prevent="handleDrop($event, 'stock')"
            >
              <input
                type="file"
                ref="stockInput"
                accept=".csv"
                @change="handleFileChange($event, 'stock')"
                style="display: none"
              />
              <button @click="triggerFileInput('stock')" class="upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Choisir un fichier
              </button>
              <p class="file-info">CSV uniquement · colonnes : date, nom, email, pwd, adresse, achat, etat</p>
            </div>
            <div v-if="files.stock" class="file-selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ files.stock.name }}</span>
              <button @click="removeFile('stock')" class="remove-btn">×</button>
            </div>
          </div>
        </div>

        <!-- Input 4: Archive ZIP -->
        <div class="import-card zip-card">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M12 18v-4"/>
                <path d="M12 9v.01"/>
                <path d="M9 15h6"/>
              </svg>
            </div>
            <h3>Archive ZIP</h3>
          </div>
          <div class="card-content">
            <div
              class="file-drop-zone zip-zone"
              :class="{ 'drag-over': dragOver['zip'] }"
              @dragover.prevent="dragOver['zip'] = true"
              @dragleave.prevent="dragOver['zip'] = false"
              @drop.prevent="handleDrop($event, 'zip')"
            >
              <input
                type="file"
                ref="zipInput"
                accept=".zip"
                @change="handleFileChange($event, 'zip')"
                style="display: none"
              />
              <button @click="triggerFileInput('zip')" class="upload-btn zip-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Choisir une archive ZIP
              </button>
              <p class="file-info">ZIP contenant les fichiers CSV (produits, catégories, stock)</p>
            </div>
            <div v-if="files.zip" class="file-selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ files.zip.name }}</span>
              <button @click="removeFile('zip')" class="remove-btn">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Aperçu fichier1 (produits) -->
      <div v-if="csvRows.length > 0" class="preview-section">
        <div class="preview-header">
          <h2>Aperçu — fichier1</h2>
          <span class="preview-count">{{ csvRows.length }} ligne(s)</span>
        </div>
        <div class="preview-pills">
          <div class="pill pill-col">
            <span class="pill-label">Colonnes</span>
            <span>{{ csvColumns.join(' · ') }}</span>
          </div>
          <div class="pill pill-cat">
            <span class="pill-label">Catégories à créer</span>
            <span>{{ uniqueCategories.join(', ') || '—' }}</span>
          </div>
          <div class="pill pill-tax">
            <span class="pill-label">Taux de taxe détectés</span>
            <span>{{ uniqueTaxRates.map(r => r + '%').join(', ') || '—' }}</span>
          </div>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th v-for="col in csvColumns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in csvRows.slice(0, 5)" :key="idx">
              <td v-for="col in csvColumns" :key="col">{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="csvRows.length > 5" class="preview-more">… et {{ csvRows.length - 5 }} ligne(s) supplémentaire(s)</p>
      </div>

      <!-- Aperçu fichier2 (stock) -->
      <div v-if="stockCsvRows.length > 0" class="preview-section">
        <div class="preview-header">
          <h2>Aperçu — fichier2 (stock)</h2>
          <span class="preview-count">{{ stockCsvRows.length }} ligne(s)</span>
        </div>
        <div class="preview-pills">
          <div class="pill pill-col">
            <span class="pill-label">Colonnes</span>
            <span>{{ stockCsvColumns.join(' · ') }}</span>
          </div>
          <div class="pill pill-cat">
            <span class="pill-label">Références</span>
            <span>{{ [...new Set(stockCsvRows.map(r => r['reference'] || r['Reference'] || '').filter(Boolean))].join(', ') || '—' }}</span>
          </div>
        </div>
        <table class="preview-table">
          <thead>
            <tr><th v-for="c in stockCsvColumns" :key="c">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in stockCsvRows.slice(0, 5)" :key="idx">
              <td v-for="c in stockCsvColumns" :key="c">{{ row[c] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="stockCsvRows.length > 5" class="preview-more">… et {{ stockCsvRows.length - 5 }} ligne(s) supplémentaire(s)</p>
      </div>

      <!-- Aperçu fichier3 (commandes) -->
      <div v-if="orderCsvRows.length > 0" class="preview-section">
        <div class="preview-header">
          <h2>Aperçu — fichier3 (commandes)</h2>
          <span class="preview-count">{{ orderCsvRows.length }} ligne(s)</span>
        </div>
        <div class="preview-pills">
          <div class="pill pill-col">
            <span class="pill-label">Colonnes</span>
            <span>{{ orderCsvColumns.join(' · ') }}</span>
          </div>
          <div class="pill pill-cat">
            <span class="pill-label">Clients</span>
            <span>{{ [...new Set(orderCsvRows.map(r => r['email'] || r['Email'] || '').filter(Boolean))].join(', ') || '—' }}</span>
          </div>
          <div class="pill pill-tax">
            <span class="pill-label">États</span>
            <span>{{ [...new Set(orderCsvRows.map(r => r['etat'] || r['Etat'] || '(panier)').filter(Boolean))].join(', ') || '—' }}</span>
          </div>
        </div>
        <table class="preview-table">
          <thead>
            <tr><th v-for="c in orderCsvColumns" :key="c">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in orderCsvRows.slice(0, 5)" :key="idx">
              <td v-for="c in orderCsvColumns" :key="c">{{ row[c] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="orderCsvRows.length > 5" class="preview-more">… et {{ orderCsvRows.length - 5 }} ligne(s) supplémentaire(s)</p>
      </div>

      <div class="import-actions">
        <button @click="resetAll" class="btn-reset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Tout réinitialiser
        </button>
        <button @click="importAll" class="btn-import" :disabled="!hasAnyFile || isImporting">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ isImporting ? 'Import en cours…' : 'Importer les fichiers sélectionnés' }}
        </button>
      </div>

      <!-- Aperçu fichier4 (images ZIP) -->
      <div v-if="zipImages.length > 0" class="preview-section">
        <div class="preview-header">
          <h2>Aperçu — fichier4 (images)</h2>
          <span class="preview-count">{{ zipImages.length }} image(s)</span>
        </div>
        <div class="preview-pills">
          <div class="pill pill-col">
            <span class="pill-label">Références détectées</span>
            <span>{{ zipImages.map(i => i.ref).join(' · ') }}</span>
          </div>
        </div>
        <table class="preview-table">
          <thead>
            <tr><th>Fichier</th><th>Référence produit</th><th>Taille</th></tr>
          </thead>
          <tbody>
            <tr v-for="img in zipImages" :key="img.filename">
              <td>{{ img.filename }}</td>
              <td><code>{{ img.ref }}</code></td>
              <td>{{ img.size > 0 ? (img.size / 1024).toFixed(1) + ' Ko' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Rapport de validation (erreurs avant import) -->
      <div v-if="validationErrors.length > 0" class="validation-section">
        <div class="validation-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="validation-icon">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Import bloqué — {{ validationErrors.length }} erreur(s) détectée(s)</h2>
          <button @click="validationErrors = []" class="btn-clear-logs">Fermer</button>
        </div>
        <p class="validation-subtitle">Corrigez les erreurs ci-dessous dans vos fichiers CSV et relancez l'import.</p>
        <div class="validation-table-wrap">
          <table class="validation-table">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Ligne</th>
                <th>Colonne</th>
                <th>Valeur</th>
                <th>Erreur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(err, idx) in validationErrors" :key="idx">
                <td class="val-file">{{ err.file }}</td>
                <td class="val-line">{{ err.line === 0 ? 'En-tête' : err.line }}</td>
                <td class="val-col">{{ err.column }}</td>
                <td class="val-val">{{ err.value }}</td>
                <td class="val-msg">{{ err.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Logs d'import -->
      <div v-if="importLogs.length > 0" class="logs-section">
        <div class="logs-header">
          <h2>Rapport d'importation</h2>
          <div class="logs-stats">
            <span class="stat-success">{{ importStats.success }} succès</span>
            <span class="stat-error">{{ importStats.error }} erreur(s)</span>
            <span class="stat-warn">{{ importStats.warning }} avertissement(s)</span>
          </div>
          <button @click="importLogs = []" class="btn-clear-logs">Effacer</button>
        </div>
        <div class="logs-list" ref="logsListEl">
          <div
            v-for="(log, idx) in importLogs"
            :key="idx"
            :class="['log-entry', `log-${log.level}`]"
          >
            <span class="log-icon">{{ logIcon(log.level) }}</span>
            <span class="log-msg">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- Modal de progression -->
      <div v-if="showProgress" class="modal-overlay">
        <div class="progress-box">
          <div class="spinner"></div>
          <h3>Import en cours…</h3>
          <p>{{ progressMessage }}</p>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <p class="progress-count">{{ progressPercent }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Papa from 'papaparse';
import Sidebar from '@/components/Sidebar.vue';
import { importFichier1, type ImportLog } from '@/services/fichier1ImportService';
import { importFichier2 } from '@/services/fichier2ImportService';
import { importFichier3 } from '@/services/fichier3ImportService';
import { importFichier4, readZipImages, type ZipImageEntry } from '@/services/fichier4ImportService';
import { validateAll, type ValidationError } from '@/services/importValidationService';
import { parseTaxRate } from '@/services/csvParserUtils';

const router = useRouter();

const files = ref({
  products: null as File | null,
  categories: null as File | null,
  stock: null as File | null,
  zip: null as File | null,
});

const dragOver = ref({ products: false, categories: false, stock: false, zip: false });

const productsInput = ref<HTMLInputElement | null>(null);
const categoriesInput = ref<HTMLInputElement | null>(null);
const stockInput = ref<HTMLInputElement | null>(null);
const zipInput = ref<HTMLInputElement | null>(null);
const logsListEl = ref<HTMLElement | null>(null);

// CSV fichier1
const csvRows = ref<Record<string, any>[]>([]);
const csvColumns = ref<string[]>([]);

// CSV fichier2 (stock)
const stockCsvRows = ref<Record<string, any>[]>([]);
const stockCsvColumns = ref<string[]>([]);

// CSV fichier3 (commandes)
const orderCsvRows = ref<Record<string, any>[]>([]);
const orderCsvColumns = ref<string[]>([]);

// ZIP fichier4 (images)
const zipImages = ref<ZipImageEntry[]>([]);

// Import
const isImporting = ref(false);
const importLogs = ref<ImportLog[]>([]);
const validationErrors = ref<ValidationError[]>([]);

// Progress modal
const showProgress = ref(false);
const progressMessage = ref('');
const progressPercent = ref(0);

const hasAnyFile = computed(() =>
  files.value.products || files.value.categories || files.value.stock || files.value.zip
);

const uniqueCategories = computed(() => [
  ...new Set(
    csvRows.value
      .map(r => (r['categorie'] || r['Categorie'] || r['category'] || '').trim())
      .filter(Boolean)
  ),
]);

const uniqueTaxRates = computed(() => [
  ...new Set(
    csvRows.value
      .map(r => parseTaxRate(String(r['Taxe'] || r['taxe'] || r['taux'] || '')))
      .filter(r => r > 0)
  ),
]);

const importStats = computed(() => ({
  success: importLogs.value.filter(l => l.level === 'success').length,
  error: importLogs.value.filter(l => l.level === 'error').length,
  warning: importLogs.value.filter(l => l.level === 'warning').length,
}));

function logIcon(level: ImportLog['level']): string {
  const icons: Record<string, string> = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  return icons[level] ?? 'ℹ';
}

const handleNavigation = (event: string) => {
  console.log('Navigation:', event);
};

const triggerFileInput = (type: string) => {
  const inputs = {
    products: productsInput.value,
    categories: categoriesInput.value,
    stock: stockInput.value,
    zip: zipInput.value,
  };
  inputs[type as keyof typeof inputs]?.click();
};

const handleFileChange = (event: Event, type: string) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.[0]) return;
  const file = input.files[0];

  if (type !== 'zip' && !isCsvFile(file)) {
    alert(`"${file.name}" n'est pas un fichier CSV.\n\nVeuillez sélectionner un fichier .csv (pas .xlsx, .xls, .ods, etc.).`);
    input.value = '';
    return;
  }

  files.value[type as keyof typeof files.value] = file;

  if (type === 'products') parseProductsCsv(file);
  if (type === 'categories') parseStockCsv(file);
  if (type === 'stock') parseOrderCsv(file);
  if (type === 'zip') parseZipFile(file);
};

function isCsvFile(file: File): boolean {
  // Vérification par extension ET par type MIME
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const validExt = name.endsWith('.csv') || name.endsWith('.txt');
  const validMime = mime === '' || mime.includes('csv') || mime.includes('text/plain') || mime.includes('text/');
  return validExt && validMime;
}

function detectDelimiter(firstLine: string): string {
  // Compter les occurrences de chaque séparateur candidat dans la 1ère ligne
  // (la ligne header ne contient jamais de valeurs entre guillemets → comptage fiable)
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const c of candidates) {
    const count = (firstLine.split(c).length - 1);
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best;
}

function parseProductsCsv(file: File) {
  csvRows.value = [];
  csvColumns.value = [];
  importLogs.value = [];

  const reader = new FileReader();

  reader.onload = (e) => {
    // Supprimer BOM UTF-8 (EF BB BF) ou UTF-16 (FF FE / FE FF) éventuellement ajouté par Excel
    let text = (e.target?.result as string) ?? '';
    text = text.replace(/^﻿/, '');

    // Détecter le séparateur à partir de la 1ère ligne (avant tout guillemet)
    const firstLine = text.split(/\r?\n/)[0];
    const delimiter = detectDelimiter(firstLine);

    // Détection d'un fichier binaire (Excel .xlsx ouvert par erreur)
    if (firstLine.startsWith('PK')) {
      alert(`"${file.name}" semble être un fichier binaire (Excel .xlsx), pas un CSV.\n\nVeuillez exporter en CSV depuis Excel ou LibreOffice.`);
      removeFile('products');
      return;
    }

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      transformHeader: (h: string) => h.trim().replace(/^﻿/, ''),
      complete: (results) => {
        const columns = results.meta.fields ?? [];
        const rows = results.data as Record<string, any>[];
        csvColumns.value = columns;
        csvRows.value = rows;
      },
      error: (err: any) => {
        alert(`Impossible de lire le CSV : ${err.message}`);
      },
    });
  };

  reader.onerror = () => alert(`Impossible de lire le fichier "${file.name}".`);
  reader.readAsText(file, 'UTF-8');
}

const handleDrop = (event: DragEvent, type: string) => {
  dragOver.value[type as keyof typeof dragOver.value] = false;
  const droppedFile = event.dataTransfer?.files[0];
  if (!droppedFile) return;
  if (type === 'zip' && !droppedFile.name.endsWith('.zip')) {
    alert('Veuillez déposer un fichier ZIP');
    return;
  }
  if (type !== 'zip' && !isCsvFile(droppedFile)) {
    alert(`"${droppedFile.name}" n'est pas un fichier CSV.\n\nVeuillez utiliser un fichier .csv (pas .xlsx, .xls, etc.).`);
    return;
  }
  files.value[type as keyof typeof files.value] = droppedFile;
  if (type === 'products') parseProductsCsv(droppedFile);
  if (type === 'categories') parseStockCsv(droppedFile);
  if (type === 'stock') parseOrderCsv(droppedFile);
  if (type === 'zip') parseZipFile(droppedFile);
};

const removeFile = (type: string) => {
  files.value[type as keyof typeof files.value] = null;
  if (type === 'products') {
    csvRows.value = [];
    csvColumns.value = [];
    importLogs.value = [];
  }
  if (type === 'categories') {
    stockCsvRows.value = [];
    stockCsvColumns.value = [];
  }
  if (type === 'stock') {
    orderCsvRows.value = [];
    orderCsvColumns.value = [];
  }
  if (type === 'zip') {
    zipImages.value = [];
  }
  const inputs = {
    products: productsInput.value,
    categories: categoriesInput.value,
    stock: stockInput.value,
    zip: zipInput.value,
  };
  const input = inputs[type as keyof typeof inputs];
  if (input) input.value = '';
};

const resetAll = () => {
  files.value = { products: null, categories: null, stock: null, zip: null };
  csvRows.value = [];
  csvColumns.value = [];
  importLogs.value = [];
  stockCsvRows.value = [];
  stockCsvColumns.value = [];
  orderCsvRows.value = [];
  orderCsvColumns.value = [];
  zipImages.value = [];
  if (productsInput.value) productsInput.value.value = '';
  if (categoriesInput.value) categoriesInput.value.value = '';
  if (stockInput.value) stockInput.value.value = '';
  if (zipInput.value) zipInput.value.value = '';
};

const importAll = async () => {
  // ── Étape 1 : Validation de tous les fichiers sélectionnés ──
  const errors = validateAll(
    csvRows.value,
    stockCsvRows.value,
    orderCsvRows.value,
    files.value.products?.name   ?? 'Fichier 1 (produits)',
    files.value.categories?.name ?? 'Fichier 2 (stock & prix)',
    files.value.stock?.name      ?? 'Fichier 3 (commandes)'
  );

  if (errors.length > 0) {
    validationErrors.value = errors;
    importLogs.value = [];
    return;
  }

  validationErrors.value = [];
  importLogs.value = [];

  // ── Étape 2 : Import séquentiel fichier1 → fichier2 → fichier3 ──
  isImporting.value = true;
  showProgress.value = true;
  progressPercent.value = 0;

  const totalOps = csvRows.value.length + stockCsvRows.value.length + orderCsvRows.value.length;
  let doneOps = 0;

  function onLog(log: ImportLog) {
    importLogs.value.push(log);
    if (log.level === 'success' || log.level === 'error') {
      doneOps++;
      progressPercent.value = Math.min(99, Math.round((doneOps / Math.max(totalOps, 1)) * 100));
    }
    progressMessage.value = log.message;
    nextTick(() => {
      if (logsListEl.value) logsListEl.value.scrollTop = logsListEl.value.scrollHeight;
    });
  }

  try {
    if (files.value.products && csvRows.value.length > 0) {
      progressMessage.value = 'Import fichier 1 (produits)…';
      await importFichier1(csvRows.value, onLog);
    }
    if (files.value.categories && stockCsvRows.value.length > 0) {
      progressMessage.value = 'Import fichier 2 (stock & prix)…';
      await importFichier2(stockCsvRows.value, onLog);
    }
    if (files.value.stock && orderCsvRows.value.length > 0) {
      progressMessage.value = 'Import fichier 3 (commandes)…';
      await importFichier3(orderCsvRows.value, onLog);
    }
    if (files.value.zip) {
      progressMessage.value = 'Import fichier 4 (images)…';
      await importFichier4(files.value.zip, onLog);
    }
    progressPercent.value = 100;
    progressMessage.value = 'Tous les imports terminés !';
    await delay(600);
  } catch (err: any) {
    importLogs.value.push({ level: 'error', message: `Erreur critique : ${err.message}` });
  } finally {
    showProgress.value = false;
    isImporting.value = false;
  }
};


function parseStockCsv(file: File) {
  stockCsvRows.value = [];
  stockCsvColumns.value = [];

  const reader = new FileReader();
  reader.onload = (e) => {
    let text = (e.target?.result as string) ?? '';
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0];
    if (firstLine.startsWith('PK')) {
      alert(`"${file.name}" semble être un fichier binaire, pas un CSV.`);
      removeFile('stock');
      return;
    }
    const delimiter = detectDelimiter(firstLine);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      transformHeader: (h: string) => h.trim().replace(/^﻿/, ''),
      complete: (results) => {
        stockCsvColumns.value = results.meta.fields ?? [];
        stockCsvRows.value = results.data as Record<string, any>[];
      },
      error: (err: any) => alert(`Impossible de lire le CSV stock : ${err.message}`),
    });
  };
  reader.onerror = () => alert(`Impossible de lire le fichier "${file.name}".`);
  reader.readAsText(file, 'UTF-8');
}


function parseOrderCsv(file: File) {
  orderCsvRows.value = [];
  orderCsvColumns.value = [];
  const reader = new FileReader();
  reader.onload = (e) => {
    let text = (e.target?.result as string) ?? '';
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0];
    if (firstLine.startsWith('PK')) {
      alert(`"${file.name}" semble être un fichier binaire, pas un CSV.`);
      removeFile('stock');
      return;
    }
    const delimiter = detectDelimiter(firstLine);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      transformHeader: (h: string) => h.trim().replace(/^﻿/, ''),
      complete: (results) => {
        orderCsvColumns.value = results.meta.fields ?? [];
        orderCsvRows.value = results.data as Record<string, any>[];
      },
      error: (err: any) => alert(`Impossible de lire le CSV commandes : ${err.message}`),
    });
  };
  reader.onerror = () => alert(`Impossible de lire le fichier "${file.name}".`);
  reader.readAsText(file, 'UTF-8');
}


async function parseZipFile(file: File) {
  zipImages.value = [];
  try {
    const images = await readZipImages(file);
    zipImages.value = images;
  } catch {
    alert(`Impossible de lire le ZIP "${file.name}".`);
    removeFile('zip');
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
</script>

<style scoped>
.import-layout {
  display: flex;
  min-height: 100vh;
}

.import-container {
  flex: 1;
  margin-left: 260px;
  padding: 24px;
  max-width: calc(100% - 260px);
  background: #f5f7fa;
  min-height: 100vh;
}

.import-header {
  margin-bottom: 32px;
}

.import-header h1 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.import-header p {
  color: #7f8c8d;
  font-size: 14px;
}

.import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.import-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.import-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.import-card.card-active {
  border: 2px solid #27ae60;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #ecf0f1;
}

.card-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3498db;
  border-radius: 8px;
}

.card-icon svg {
  width: 18px;
  height: 18px;
  color: white;
}

.card-header h3 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
}

.badge-entities {
  margin-left: auto;
  font-size: 11px;
  background: #e8f5e9;
  color: #27ae60;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.card-content {
  min-height: 120px;
}

.file-drop-zone {
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.2s;
  background: #fafbfc;
}

.file-drop-zone.drag-over {
  border-color: #3498db;
  background: #ebf5ff;
}

.zip-zone {
  border-color: #27ae60;
}

.zip-zone.drag-over {
  border-color: #27ae60;
  background: #e8f8f5;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.upload-btn:hover { background: #2980b9; }
.zip-btn { background: #27ae60; }
.zip-btn:hover { background: #229954; }

.upload-btn svg { width: 16px; height: 16px; }

.file-info {
  font-size: 12px;
  color: #95a5a6;
  margin-top: 12px;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 10px;
  background: #e8f5e9;
  border-radius: 6px;
  font-size: 13px;
}

.file-selected svg { width: 16px; height: 16px; color: #27ae60; flex-shrink: 0; }
.file-selected span { flex: 1; color: #2c3e50; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.remove-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #e74c3c;
  padding: 0 4px;
  font-weight: bold;
}
.remove-btn:hover { color: #c0392b; }

/* ── Aperçu fichier1 ── */
.preview-section {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-header h2 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
}

.preview-count {
  font-size: 13px;
  background: #eaf4fe;
  color: #2980b9;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 600;
}

.preview-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.pill {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 8px;
}

.pill-col { background: #f0f4ff; color: #3a4a7a; }
.pill-cat { background: #f0fff4; color: #276749; }
.pill-tax { background: #fffbee; color: #7a5c00; }

.pill-label {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table th {
  background: #f5f7fa;
  padding: 8px 12px;
  text-align: left;
  color: #555;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
}

.preview-table td {
  padding: 7px 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.preview-table tr:hover td { background: #fafafa; }

.preview-more {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  text-align: right;
}

/* ── Actions ── */
.import-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  margin-bottom: 32px;
}

.btn-reset,
.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset { background: #ecf0f1; color: #7f8c8d; }
.btn-reset:hover { background: #bdc3c7; color: #2c3e50; }

.btn-import { background: #27ae60; color: white; }
.btn-import:hover:not(:disabled) { background: #229954; transform: translateY(-1px); }
.btn-import:disabled { background: #bdc3c7; cursor: not-allowed; }

.btn-reset svg, .btn-import svg { width: 18px; height: 18px; }

/* ── Logs ── */
.logs-section {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 32px;
}

.logs-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.logs-header h2 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0;
  flex: 1;
}

.logs-stats {
  display: flex;
  gap: 12px;
  font-size: 13px;
  font-weight: 700;
}

.stat-success { color: #27ae60; }
.stat-error   { color: #e74c3c; }
.stat-warn    { color: #e67e22; }

.btn-clear-logs {
  background: #ecf0f1;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #7f8c8d;
}
.btn-clear-logs:hover { background: #bdc3c7; }

.logs-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  border-left: 4px solid transparent;
}

.log-icon { font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.log-msg  { color: #333; flex: 1; word-break: break-word; }

.log-success { background: #f0fdf4; border-color: #27ae60; }
.log-success .log-icon { color: #27ae60; }

.log-error { background: #fff5f5; border-color: #e74c3c; }
.log-error .log-icon { color: #e74c3c; }

.log-warning { background: #fffbee; border-color: #e67e22; }
.log-warning .log-icon { color: #e67e22; }

.log-info { background: #f0f4ff; border-color: #3498db; }
.log-info .log-icon { color: #3498db; }

/* ── Modal progression ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.progress-box {
  background: white;
  border-radius: 12px;
  padding: 36px;
  min-width: 340px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid #f0f0f0;
  border-top-color: #27ae60;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.progress-bar-wrap {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin: 20px 0 10px;
}

.progress-bar-fill {
  height: 100%;
  background: #27ae60;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

h3 { margin: 0 0 12px; color: #2c3e50; }
p { color: #7f8c8d; margin: 0; }

/* ── Validation errors ── */
.validation-section {
  background: #fff5f5;
  border: 2px solid #e74c3c;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.validation-header h2 {
  font-size: 17px;
  color: #c0392b;
  margin: 0;
  flex: 1;
}

.validation-icon {
  width: 22px;
  height: 22px;
  color: #e74c3c;
  flex-shrink: 0;
}

.validation-subtitle {
  font-size: 13px;
  color: #7f8c8d;
  margin: 0 0 16px !important;
}

.validation-table-wrap {
  overflow-x: auto;
}

.validation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.validation-table th {
  background: #fce4e4;
  padding: 8px 12px;
  text-align: left;
  color: #c0392b;
  font-weight: 700;
  border-bottom: 2px solid #e74c3c;
  white-space: nowrap;
}

.validation-table td {
  padding: 7px 12px;
  border-bottom: 1px solid #fce4e4;
  vertical-align: top;
}

.validation-table tr:hover td { background: #fff0f0; }

.val-file  { color: #2c3e50; font-weight: 600; white-space: nowrap; }
.val-line  { color: #e74c3c; font-weight: 700; text-align: center; white-space: nowrap; }
.val-col   { color: #8e44ad; font-family: monospace; white-space: nowrap; }
.val-val   { color: #7f8c8d; font-family: monospace; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.val-msg   { color: #c0392b; }
</style>
