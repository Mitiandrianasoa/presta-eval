/**
 * Service d'importation des Photos Produits PrestaShop (Fichier 4 - ZIP)
 * Logique identique à ImportPhoto.vue
 * Pas de CSV à valider ici (entrée = ZIP), mais on vérifie :
 *  - Que le fichier est bien un ZIP
 *  - Que le ZIP contient des images
 */

import JSZip from 'jszip';
import api from '../../../api/api';

// ─── Extensions d'images supportées ─────────────────────────────────────────
const EXTENSIONS_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// ─── Cache des IDs produits ──────────────────────────────────────────────────
const cacheProduits = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formate une taille en octets en chaîne lisible.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1048576).toFixed(1) + ' Mo';
};

/**
 * Vérifie si un nom de fichier correspond à une image supportée.
 * @param {string} filename
 * @returns {boolean}
 */
export const estImage = (filename) => {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return EXTENSIONS_IMAGES.includes(ext);
};

/**
 * Extrait la référence produit à partir du nom de fichier (sans extension).
 * @param {string} filename
 * @returns {string}
 */
export const extraireReference = (filename) => {
  const nomSansExtension = filename.replace(/\.[^/.]+$/, '');
  return nomSansExtension.trim();
};

// ─── Validation du fichier ZIP ────────────────────────────────────────────────

/**
 * Valide que le fichier fourni est bien un ZIP.
 * @param {File} file
 */
export const validerFichierZip = (file) => {
  if (!file) throw new Error('Aucun fichier sélectionné.');
  if (!file.name.endsWith('.zip')) {
    throw new Error('Le fichier doit être un fichier ZIP (.zip).');
  }
};

/**
 * Extrait les informations des images d'un fichier ZIP sans les uploader.
 * @param {File} zipFile
 * @returns {Promise<Array<{filename: string, reference: string, size: string, status: string}>>}
 */
export const extrairePhotosDuZip = async (zipFile) => {
  validerFichierZip(zipFile);

  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipFile);

  const photos = [];
  for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
    if (zipEntry.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) continue;

    const nomFichier = filename.split('/').pop();
    if (nomFichier && estImage(nomFichier)) {
      const reference = extraireReference(nomFichier);
      photos.push({
        filename: nomFichier,
        reference: reference,
        size: formatFileSize(zipEntry._data?.uncompressedSize || 0),
        status: 'pending', // Statut initial avant import
      });
    }
  }

  if (photos.length === 0) {
    throw new Error('Aucune image valide (.jpg, .png, etc.) trouvée dans le fichier ZIP.');
  }

  return photos;
};

// ─── Logique métier (identique à ImportPhoto.vue) ────────────────────────────


/**
 * Récupère l'ID PrestaShop d'un produit par sa référence.
 * @param {string} reference
 * @returns {string|null}
 */
export const obtenirIdProduit = async (reference) => {
  if (cacheProduits[reference]) return cacheProduits[reference];
  try {
    const res = await api.get(`/products?filter[reference]=[${encodeURIComponent(reference)}]&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, 'application/xml');
    const products = xmlDoc.getElementsByTagName('product');
    if (products.length > 0) {
      const id = products[0].getElementsByTagName('id')[0]?.textContent?.trim();
      if (id) { cacheProduits[reference] = id; return id; }
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Produit "${reference}" non trouvé`);
    return null;
  }
};

/**
 * Upload une image pour un produit PrestaShop.
 * @param {string} idProduct
 * @param {Blob} imageBlob
 * @param {string} filename
 * @returns {string} ID de l'image créée
 */
export const uploaderImage = async (idProduct, imageBlob, filename) => {
  try {
    const formData = new FormData();
    formData.append('image', imageBlob, filename);
    const url = `/images/products/${idProduct}`;
    const response = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const imageId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    return imageId;
  } catch (error) {
    console.error(`❌ Échec upload image ${filename}:`, error);
    throw error;
  }
};

/**
 * Lance l'importation des photos sélectionnées depuis un ZIP.
 * @param {File} zipFile - Fichier ZIP contenant les images.
 * @param {Array<Object>} photosAImporter - Tableau des objets photos à importer (celles qui ont été cochées).
 * @param {Function} onPhotoProcessed - Callback appelé après chaque photo traitée pour mettre à jour l'UI.
 * @returns {Promise<{ success: boolean, message: string, photosTraitees: Array<Object> }>}
 */
export const importerPhotos = async (
  zipFile,
  photosAImporter,
  onPhotoProcessed
) => {
  if (!zipFile || photosAImporter.length === 0) {
    return {
      success: true,
      message: 'Aucune photo sélectionnée pour importation.',
      photosTraitees: [],
    };
  }

  // Extraction du ZIP
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipFile);

  // Créer une map pour un accès rapide aux entrées du ZIP
  const zipEntries = {};
  for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
     const nomFichier = filename.split('/').pop();
    if (nomFichier && estImage(nomFichier)) {
      zipEntries[nomFichier] = zipEntry;
    }
  }

  // Traiter chaque image à importer
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const photosResultats = [];

  for (const photo of photosAImporter) {
    const photoEntry = { ...photo }; // Copie pour ne pas muter l'original directement
    const zipEntry = zipEntries[photo.filename];

    if (!zipEntry) {
      photoEntry.status = 'error';
      photoEntry.erreur = 'Fichier non trouvé dans le ZIP.';
      errorCount++;
      console.error(`❌ Fichier ${photo.filename} non trouvé dans le ZIP.`);
      photosResultats.push(photoEntry);
      if (onPhotoProcessed) onPhotoProcessed(photosResultats);
      continue;
    }

    try {
      const idProduct = await obtenirIdProduit(photo.reference);
      if (!idProduct) {
        photoEntry.status = 'not_found';
        photoEntry.erreur = `Produit non trouvé`;
        notFoundCount++;
        console.warn(`⚠️ Produit "${photo.reference}" non trouvé pour l'image ${photo.filename}`);
      } else {
        photoEntry.id_product = idProduct;
        const imageBlob = await zipEntry.async('blob');
        const imageId = await uploaderImage(idProduct, imageBlob, photo.filename);
        photoEntry.id_image = imageId;
        photoEntry.status = 'success';
        successCount++;
      }
    } catch (error) {
      photoEntry.status = 'error';
      photoEntry.erreur = error.message || 'Erreur inconnue';
      errorCount++;
      console.error(`❌ Erreur pour ${photo.filename}:`, error);
    }
    
    photosResultats.push(photoEntry);
    if (onPhotoProcessed) onPhotoProcessed(photosResultats);
  }

  // Marquer les photos non sélectionnées comme "skipped"
  // Cette logique est maintenant gérée dans le composant Vue, cette fonction ne voit que les photos à importer.

  // Résumé
  const summary = [];
  if (successCount > 0) summary.push(`${successCount} uploadées`);
  if (notFoundCount > 0) summary.push(`${notFoundCount} produits non trouvés`);
  if (errorCount > 0) summary.push(`${errorCount} erreurs`);

  return {
    success: errorCount === 0,
    message: summary.length > 0 ? `Importation terminée : ${summary.join(', ')}.` : 'Aucune action effectuée.',
    photosTraitees: photosResultats,
  };
};
