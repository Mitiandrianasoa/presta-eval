import JSZip from 'jszip';
import api from '../api/api';

export interface ImportLog {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ImportResult {
  logs: ImportLog[];
  successCount: number;
  errorCount: number;
}

export interface ZipImageEntry {
  ref: string;
  filename: string;
  ext: string;
  size: number;
  blob?: Blob;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

// ---------------------------------------------------------------------------
// Lecture du ZIP et extraction des images
// ---------------------------------------------------------------------------
export async function readZipImages(file: File): Promise<ZipImageEntry[]> {
  const zip = await JSZip.loadAsync(file);
  const entries: ZipImageEntry[] = [];

  zip.forEach((relativePath, zipEntry) => {
    // Ignorer dossiers et fichiers macOS
    if (zipEntry.dir) return;
    if (relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) return;

    const basename = relativePath.split('/').pop() || relativePath;
    const parts = basename.split('.');
    const ext = parts.pop()?.toLowerCase() || '';
    const ref = parts.join('.');

    if (!IMAGE_EXTS.includes(ext) || !ref) return;

    entries.push({ ref, filename: basename, ext, size: 0 });
  });

  // Charger les blobs avec MIME type correct
  const withBlobs: ZipImageEntry[] = [];
  for (const entry of entries) {
    const zipEntry = zip.file(entry.filename) || zip.file(`__MACOSX/._${entry.filename}`) || findEntry(zip, entry.filename);
    if (!zipEntry) continue;
    const buffer = await zipEntry.async('arraybuffer');
    const mime = MIME_TYPES[entry.ext] || 'image/jpeg';
    const blob = new Blob([buffer], { type: mime });
    withBlobs.push({ ...entry, blob, size: blob.size });
  }

  return withBlobs;
}

function findEntry(zip: JSZip, filename: string): JSZip.JSZipObject | null {
  let found: JSZip.JSZipObject | null = null;
  zip.forEach((path, entry) => {
    if (!entry.dir && (path.endsWith('/' + filename) || path === filename)) {
      found = entry;
    }
  });
  return found;
}

// ---------------------------------------------------------------------------
// Recherche produit par référence
// ---------------------------------------------------------------------------
async function findProductIdByRef(reference: string): Promise<number> {
  const res = await api.get(
    `/products?filter[reference]=${encodeURIComponent(reference)}&output_format=JSON`,
    { validateStatus: () => true }
  );
  const products = res.data?.products;
  if (!Array.isArray(products) || products.length === 0) return 0;
  return parseInt(String(products[0].id));
}

// ---------------------------------------------------------------------------
// Upload d'image vers PrestaShop
// POST /api/images/products/{id_product}
// multipart/form-data, champ : image
// ---------------------------------------------------------------------------
async function uploadProductImage(productId: number, blob: Blob, filename: string): Promise<number> {
  const formData = new FormData();
  formData.append('image', blob, filename);

  const res = await api.post(
    `/images/products/${productId}`,
    formData,
    { validateStatus: () => true }
  );

  const data = res.data;
  const body = typeof data === 'string' ? data : JSON.stringify(data);

  // Extraire l'ID de l'image depuis la réponse (XML ou JSON)
  if (typeof data === 'object' && data?.image?.id) return parseInt(String(data.image.id));
  if (typeof data === 'string') {
    const m = data.match(/\bid="(\d+)"/) || data.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/) || data.match(/<id>(\d+)<\/id>/);
    if (m) return parseInt(m[1]);
  }

  throw new Error(`HTTP ${res.status} — ${body.slice(0, 400)}`);
}

// ---------------------------------------------------------------------------
// Orchestrateur principal
// ---------------------------------------------------------------------------
export async function importFichier4(
  file: File,
  onLog: (log: ImportLog) => void
): Promise<ImportResult> {
  const logs: ImportLog[] = [];
  let successCount = 0;
  let errorCount = 0;

  function log(level: ImportLog['level'], message: string) {
    const entry: ImportLog = { level, message };
    logs.push(entry);
    onLog(entry);
  }

  log('info', `Lecture du ZIP "${file.name}"…`);

  let images: ZipImageEntry[];
  try {
    images = await readZipImages(file);
  } catch (err: any) {
    log('error', `Impossible de lire le ZIP : ${err.message}`);
    return { logs, successCount: 0, errorCount: 1 };
  }

  if (images.length === 0) {
    log('error', 'Aucune image valide trouvée dans le ZIP (formats acceptés : jpg, jpeg, png, gif, webp)');
    return { logs, successCount: 0, errorCount: 1 };
  }

  log('info', `${images.length} image(s) détectée(s) : ${images.map(i => i.filename).join(', ')}`);

  for (const img of images) {
    if (!img.blob) {
      log('warning', `"${img.filename}" : blob vide — ignoré`);
      errorCount++;
      continue;
    }

    try {
      // Trouver le produit par référence
      const productId = await findProductIdByRef(img.ref);
      if (!productId) {
        log('error', `"${img.filename}" : référence "${img.ref}" introuvable dans PrestaShop — ignorée`);
        errorCount++;
        continue;
      }

      // Uploader l'image
      const imageId = await uploadProductImage(productId, img.blob, img.filename);
      log('success', `"${img.filename}" → produit ID ${productId}, image ID ${imageId} (${(img.size / 1024).toFixed(1)} Ko)`);
      successCount++;
    } catch (err: any) {
      log('error', `"${img.filename}" : ${err.message || 'Erreur inconnue'}`);
      errorCount++;
    }
  }

  log(
    errorCount === 0 ? 'success' : 'warning',
    `Import images terminé — ${successCount} image(s) uploadée(s), ${errorCount} erreur(s)`
  );

  return { logs, successCount, errorCount };
}
