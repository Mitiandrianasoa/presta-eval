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
 * Lance l'importation des photos depuis un ZIP.
 * @param {File} zipFile - Fichier ZIP sélectionné
 * @param {Function} onPhotoInitialized - Appelé avec le tableau initial des entrées (status: 'pending')
 * @param {Function} onPhotoUpdated    - Appelé après chaque photo traitée
 * @param {Function} onTotalKnown      - Appelé avec le nombre total de photos trouvées
 * @returns {{ success: boolean, message: string }}
 */
export const importerPhotos = async (
  zipFile,
  onPhotoInitialized,
  onPhotoUpdated,
  onTotalKnown
) => {
  // Validation du ZIP
  validerFichierZip(zipFile);

  // Extraction du ZIP
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipFile);

  // Filtrer les images
  const fichiersImages = [];
  for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
    if (zipEntry.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) continue;
    const nomFichier = filename.split('/').pop();
    if (nomFichier && estImage(nomFichier)) {
      const reference = extraireReference(nomFichier);
      fichiersImages.push({ filename: nomFichier, fullPath: filename, reference, zipEntry });
    }
  }

  if (fichiersImages.length === 0) {
    throw new Error('Aucune image trouvée dans le ZIP.');
  }

  if (onTotalKnown) onTotalKnown(fichiersImages.length);

  // Initialiser la liste de suivi
  const photosTraitees = fichiersImages.map(f => ({
    filename: f.filename,
    reference: f.reference,
    id_product: null,
    id_image: null,
    size: formatFileSize(f.zipEntry._data?.uncompressedSize || 0),
    status: 'pending',
    erreur: '',
  }));

  if (onPhotoInitialized) onPhotoInitialized([...photosTraitees]);

  // Traiter chaque image
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (let i = 0; i < fichiersImages.length; i++) {
    const fichier = fichiersImages[i];
    const photoEntry = photosTraitees[i];

    try {
      const idProduct = await obtenirIdProduit(fichier.reference);
      if (!idProduct) {
        photoEntry.status = 'not_found';
        photoEntry.erreur = `Produit "${fichier.reference}" non trouvé dans PrestaShop`;
        notFoundCount++;
        console.warn(`⚠️ ${photoEntry.erreur}`);
      } else {
        photoEntry.id_product = idProduct;
        const imageBlob = await fichier.zipEntry.async('blob');
        const imageId = await uploaderImage(idProduct, imageBlob, fichier.filename);
        photoEntry.id_image = imageId;
        photoEntry.status = 'success';
        successCount++;
      }
    } catch (error) {
      photoEntry.status = 'error';
      photoEntry.erreur = error.message || 'Erreur inconnue';
      errorCount++;
      console.error(`❌ Erreur pour ${fichier.filename}:`, error);
    }

    if (onPhotoUpdated) onPhotoUpdated([...photosTraitees], i);
  }

  // Résumé
  const summary = [];
  if (successCount > 0) summary.push(`${successCount} uploadées`);
  if (notFoundCount > 0) summary.push(`${notFoundCount} références non trouvées`);
  if (errorCount > 0) summary.push(`${errorCount} erreurs`);

  return {
    success: errorCount === 0,
    message: `✅ Importation terminée : ${summary.join(', ')}.`,
    photosTraitees,
  };
};
