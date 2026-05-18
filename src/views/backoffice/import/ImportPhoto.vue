<template>
  <div class="import-container">
    <h2>Importateur PrestaShop - Photos Produits (ZIP)</h2>
    
    <div class="upload-zone">
      <input 
        type="file" 
        accept=".zip" 
        @change="handleZipUpload" 
        ref="zipInput"
      />
      <button 
        :disabled="!zipFile || isImporting" 
        @click="lancerImportation" 
        class="btn-import"
      >
        {{ isImporting ? 'Importation en cours...' : "Lancer l'importation des photos" }}
      </button>
    </div>

    <div v-if="statusMessage" :class="['status-box', importSuccess ? 'success' : 'error']">
      <strong>Statut :</strong> {{ statusMessage }}
    </div>

    <!-- Barre de progression -->
    <div v-if="isImporting && totalPhotos > 0" class="progress-section">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: (photosTraitees.length / totalPhotos * 100) + '%' }"
        ></div>
      </div>
      <p class="progress-text">
        {{ photosTraitees.length }} / {{ totalPhotos }} photos traitées 
        ({{ Math.round(photosTraitees.length / totalPhotos * 100) }}%)
      </p>
    </div>

    <div v-if="photosTraitees.length" class="report-section">
      <h3>Suivi de l'Importation des Photos</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Fichier</th>
            <th>Référence</th>
            <th>ID Produit</th>
            <th>ID Image</th>
            <th>Taille</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="photo in photosTraitees" :key="photo.filename" :class="photo.status">
            <td>{{ photo.filename }}</td>
            <td>{{ photo.reference }}</td>
            <td class="center">{{ photo.id_product || '-' }}</td>
            <td class="center">{{ photo.id_image || '-' }}</td>
            <td class="center">{{ photo.size || '-' }}</td>
            <td>
              <span v-if="photo.status === 'pending'" class="txt-pending">En attente...</span>
              <span v-if="photo.status === 'success'" class="txt-success">✔ Uploadé</span>
              <span v-if="photo.status === 'not_found'" class="txt-warning">⚠ Réf. introuvable</span>
              <span v-if="photo.status === 'skipped'" class="txt-skip">⏭ Ignoré (non image)</span>
              <span v-if="photo.status === 'error'" class="txt-error">✘ {{ photo.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import JSZip from 'jszip';
import api from '../../../api/api';

const zipFile = ref(null);
const photosTraitees = ref([]);
const totalPhotos = ref(0);
const isImporting = ref(false);
const statusMessage = ref('');
const importSuccess = ref(true);
const zipInput = ref(null);

// Extensions d'images supportées
const EXTENSIONS_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// Cache des IDs produits
const cacheProduits = {};

// 1. Gestion du chargement du ZIP
const handleZipUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.zip')) {
    statusMessage.value = '❌ Veuillez sélectionner un fichier ZIP.';
    importSuccess.value = false;
    return;
  }

  zipFile.value = file;
  photosTraitees.value = [];
  totalPhotos.value = 0;
  
  statusMessage.value = `✅ Fichier ZIP "${file.name}" chargé (${formatFileSize(file.size)}). Prêt à lancer l'importation.`;
  importSuccess.value = true;
};

// 2. Formater la taille du fichier
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1048576).toFixed(1) + ' Mo';
};

// 3. Vérifier si un fichier est une image
const estImage = (filename) => {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return EXTENSIONS_IMAGES.includes(ext);
};

// 4. Extraire la référence du nom de fichier
const extraireReference = (filename) => {
  // Enlever l'extension
  const nomSansExtension = filename.replace(/\.[^/.]+$/, '');
  return nomSansExtension.trim();
};

// 5. Récupérer l'ID du produit par référence
const obtenirIdProduit = async (reference) => {
  if (cacheProduits[reference]) return cacheProduits[reference];

  try {
    const res = await api.get(`/products?filter[reference]=[${encodeURIComponent(reference)}]&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, "application/xml");
    const products = xmlDoc.getElementsByTagName("product");
    
    if (products.length > 0) {
      const id = products[0].getElementsByTagName("id")[0]?.textContent?.trim();
      if (id) {
        cacheProduits[reference] = id;
        return id;
      }
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Produit "${reference}" non trouvé`);
    return null;
  }
};

// 6. Uploader une image pour un produit
const uploaderImage = async (idProduct, imageBlob, filename) => {
  try {
    // Créer un FormData pour l'upload
    const formData = new FormData();
    formData.append('image', imageBlob, filename);

    // Endpoint spécial pour les images
    const url = `/images/products/${idProduct}`;
    
    console.log(`📤 Upload image: ${filename} → produit ${idProduct}`);
    
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // Extraire l'ID de l'image de la réponse
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "application/xml");
    const imageId = xmlDoc.getElementsByTagName("id")[0]?.textContent?.trim();

    console.log(`✅ Image uploadée (ID: ${imageId})`);
    return imageId;

  } catch (error) {
    console.error(`❌ Échec upload image ${filename}:`, error);
    throw error;
  }
};

// 7. Fonction Principale d'Importation
const lancerImportation = async () => {
  if (!zipFile.value) {
    statusMessage.value = '❌ Veuillez d\'abord sélectionner un fichier ZIP.';
    return;
  }

  isImporting.value = true;
  photosTraitees.value = [];
  statusMessage.value = "📦 Extraction du ZIP et analyse des fichiers...";

  try {
    // ÉTAPE 1 : Extraire le ZIP
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile.value);
    
    // Filtrer les fichiers images
    const fichiersImages = [];
    
    for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
      // Ignorer les dossiers et les fichiers cachés
      if (zipEntry.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) {
        continue;
      }
      
      // Extraire le nom du fichier sans le chemin
      const nomFichier = filename.split('/').pop();
      
      if (nomFichier && estImage(nomFichier)) {
        const reference = extraireReference(nomFichier);
        fichiersImages.push({
          filename: nomFichier,
          fullPath: filename,
          reference: reference,
          zipEntry: zipEntry
        });
      }
    }
    
    totalPhotos.value = fichiersImages.length;
    
    if (fichiersImages.length === 0) {
      statusMessage.value = '❌ Aucune image trouvée dans le ZIP.';
      importSuccess.value = false;
      isImporting.value = false;
      return;
    }
    
    console.log(`📊 ${fichiersImages.length} images trouvées dans le ZIP`);
    
    // Initialiser la liste de suivi
    photosTraitees.value = fichiersImages.map(f => ({
      filename: f.filename,
      reference: f.reference,
      id_product: null,
      id_image: null,
      size: formatFileSize(f.zipEntry._data?.uncompressedSize || 0),
      status: 'pending',
      erreur: ''
    }));
    
    // ÉTAPE 2 : Traiter chaque image
    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < fichiersImages.length; i++) {
      const fichier = fichiersImages[i];
      const photoEntry = photosTraitees.value[i];
      
      statusMessage.value = `📤 Upload: ${i + 1}/${fichiersImages.length} - ${fichier.filename}`;
      
      try {
        // Vérifier si le produit existe
        const idProduct = await obtenirIdProduit(fichier.reference);
        
        if (!idProduct) {
          photoEntry.status = 'not_found';
          photoEntry.erreur = `Produit "${fichier.reference}" non trouvé dans PrestaShop`;
          notFoundCount++;
          console.warn(`⚠️ ${photoEntry.erreur}`);
          continue;
        }
        
        photoEntry.id_product = idProduct;
        
        // Extraire le blob de l'image
        const imageBlob = await fichier.zipEntry.async('blob');
        
        // Uploader l'image
        const imageId = await uploaderImage(idProduct, imageBlob, fichier.filename);
        
        photoEntry.id_image = imageId;
        photoEntry.status = 'success';
        successCount++;
        
      } catch (error) {
        photoEntry.status = 'error';
        photoEntry.erreur = error.message || 'Erreur inconnue';
        errorCount++;
        console.error(`❌ Erreur pour ${fichier.filename}:`, error);
      }
      
      // Mettre à jour la progression
      photosTraitees.value = [...photosTraitees.value];
    }
    
    // Résultat final
    const summary = [];
    if (successCount > 0) summary.push(`${successCount} uploadées`);
    if (notFoundCount > 0) summary.push(`${notFoundCount} références non trouvées`);
    if (errorCount > 0) summary.push(`${errorCount} erreurs`);
    
    statusMessage.value = `✅ Importation terminée : ${summary.join(', ')}.`;
    importSuccess.value = (errorCount === 0);
    
  } catch (error) {
    statusMessage.value = `❌ Erreur lors de l'importation : ${error.message}`;
    importSuccess.value = false;
    console.error('Erreur globale:', error);
  } finally {
    isImporting.value = false;
  }
};
</script>

<style scoped>
.import-container {
  max-width: 1000px; margin: 20px auto; padding: 20px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; background: #13131f; color: #a0a0b8;
}
.import-container h2 { color: #f1f1f8; font-size: 18px; margin: 0 0 20px; }
.upload-zone { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; }
.btn-import {
  padding: 10px 20px; background: #f97316; border: none; color: white;
  font-weight: 600; cursor: pointer; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(249,115,22,0.3); transition: opacity 0.2s; font-family: inherit;
}
.btn-import:hover:not(:disabled) { opacity: 0.88; }
.btn-import:disabled { opacity: 0.4; cursor: not-allowed; }
.status-box { padding: 15px; margin-bottom: 20px; border-left: 4px solid; border-radius: 8px; }
.status-box.success { background: rgba(16,185,129,0.10); border-left-color: #10b981; color: #10b981; }
.status-box.error { background: rgba(239,68,68,0.10); border-left-color: #ef4444; color: #f87171; }
.progress-section { margin-bottom: 20px; }
.progress-bar { width: 100%; height: 24px; background: rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #fb923c); transition: width 0.3s ease; border-radius: 12px; }
.progress-text { text-align: center; color: #6b7280; font-size: 14px; margin: 0; }
.report-section { margin-top: 20px; }
.report-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
.report-table th, .report-table td { border: 1px solid rgba(255,255,255,0.06); padding: 10px 12px; text-align: left; }
.report-table th { background: rgba(255,255,255,0.03); font-size: 12px; color: #6b7280; font-weight: 600; }
.report-table td { color: #a0a0b8; }
.center { text-align: center; }
.success td { background: rgba(16,185,129,0.06); }
.not_found td { background: rgba(245,158,11,0.06); }
.error td { background: rgba(239,68,68,0.06); }
.txt-success { color: #10b981; font-weight: bold; }
.txt-warning { color: #f59e0b; font-weight: bold; }
.txt-error { color: #ef4444; font-weight: bold; }
.txt-skip { color: #6b7280; font-style: italic; }
.txt-pending { color: #6b7280; }
</style>