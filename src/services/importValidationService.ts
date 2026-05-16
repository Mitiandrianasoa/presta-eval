import { parseFlexiblePrice, parseTaxRate } from './csvParserUtils';
import { parseAchat } from './fichier3ImportService';

export interface ValidationError {
  file: string;
  line: number;       // 0 = en-tête, 1+ = ligne de données
  column: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Utilitaire : lecture robuste d'une colonne (insensible à la casse)
// ---------------------------------------------------------------------------
function getCol(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    const kNorm = k.toLowerCase().trim();
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().trim() === kNorm) {
        const val = row[rowKey];
        if (val !== undefined && val !== null && String(val).trim() !== '')
          return String(val).trim();
      }
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Colonnes obligatoires
// ---------------------------------------------------------------------------
interface RequiredCol { primary: string; aliases: string[] }

/** Vérifie que chaque colonne obligatoire est présente (insensible à la casse). */
function checkColumns(
  actual: string[],
  required: RequiredCol[],
  filename: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const normActual = actual.map(c => c.toLowerCase().trim());

  for (const col of required) {
    const allNames = [col.primary, ...col.aliases];
    const found = allNames.some(n => normActual.includes(n.toLowerCase().trim()));
    if (!found) {
      errors.push({
        file: filename, line: 0, column: col.primary, value: '—', severity: 'error',
        message: `Colonne obligatoire "${col.primary}" introuvable (attendu : ${allNames.map(n => `"${n}"`).join(', ')})`,
      });
    }
  }
  return errors;
}

/**
 * Avertit quand une colonne est présente mais sous un nom non standard
 * (mauvaise casse ou alias à la place du nom principal).
 */
function checkColumnConformity(
  actual: string[],
  required: RequiredCol[],
  filename: string
): ValidationError[] {
  const warnings: ValidationError[] = [];

  for (const col of required) {
    const allNames = [col.primary, ...col.aliases];

    // Cherche le nom réel utilisé dans le CSV
    const foundActual = actual.find(a =>
      allNames.some(n => n.toLowerCase().trim() === a.toLowerCase().trim())
    );
    if (!foundActual) continue; // absent → géré par checkColumns

    // Casse ou alias non conforme ?
    if (!allNames.includes(foundActual)) {
      const expectedPrimary = col.primary;
      warnings.push({
        file: filename, line: 0, column: expectedPrimary, value: foundActual, severity: 'warning',
        message: `Nom de colonne non conforme : "${foundActual}" accepté comme alias de "${expectedPrimary}". Renommez-la "${expectedPrimary}" pour supprimer cet avertissement.`,
      });
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Validation de date — format strict DD/MM/YYYY
// ---------------------------------------------------------------------------
function isStrictDdMmYyyy(raw: string): boolean {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [, d, mo, y] = m;
  const day = parseInt(d), month = parseInt(mo), year = parseInt(y);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Validation email
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Validation fichier1 : produits / catégories / taxes
// ---------------------------------------------------------------------------
export function validateFichier1(rows: Record<string, any>[], filename = 'Fichier 1'): ValidationError[] {
  const errors: ValidationError[] = [];
  if (rows.length === 0) {
    errors.push({ file: filename, line: 0, column: '—', value: '—', severity: 'error', message: 'Fichier vide' });
    return errors;
  }

  const REQUIRED: RequiredCol[] = [
    { primary: 'nom',                       aliases: ['name'] },
    { primary: 'reference',                 aliases: ['ref'] },
    { primary: 'prix_ttc',                  aliases: ['prix', 'price'] },
    { primary: 'taxe',                      aliases: ['taux', 'tva', 'tax'] },
    { primary: 'categorie',                 aliases: ['category', 'cat'] },
    { primary: 'date_availability_produit', aliases: ['date_produit', 'date'] },
  ];

  const actualCols = Object.keys(rows[0]);
  errors.push(...checkColumns(actualCols, REQUIRED, filename));
  errors.push(...checkColumnConformity(actualCols, REQUIRED, filename));

  // Stop row-level checks if required columns are missing
  if (errors.some(e => e.severity === 'error' && e.line === 0)) return errors;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const nom     = getCol(row, 'nom', 'name');
    const ref     = getCol(row, 'reference', 'ref');
    const prixRaw = getCol(row, 'prix_ttc', 'prix', 'price');
    const achatRaw = getCol(row, 'prix_achat', 'cout', 'cost', 'wholesale_price');
    const taxeRaw = getCol(row, 'Taxe', 'taxe', 'taux', 'TVA', 'tax');
    const cat     = getCol(row, 'categorie', 'Categorie', 'category');
    const dateRaw = getCol(row, 'date_availability_produit', 'date_produit', 'date');

    if (!nom)
      errors.push({ file: filename, line, column: 'nom', value: '', severity: 'error', message: 'Nom du produit manquant' });

    if (!ref)
      errors.push({ file: filename, line, column: 'reference', value: '', severity: 'error', message: 'Référence manquante' });

    if (!prixRaw) {
      errors.push({ file: filename, line, column: 'prix_ttc', value: '', severity: 'error', message: 'Prix TTC manquant' });
    } else {
      const prix = parseFlexiblePrice(prixRaw);
      if (prix <= 0)
        errors.push({ file: filename, line, column: 'prix_ttc', value: prixRaw, severity: 'error', message: `Le prix TTC doit être un montant positif (valeur lue : ${prix})` });
    }

    if (achatRaw) {
      const achat = parseFlexiblePrice(achatRaw);
      if (achat <= 0)
        errors.push({ file: filename, line, column: 'prix_achat', value: achatRaw, severity: 'error', message: `Le prix d'achat doit être un montant positif (valeur lue : ${achat})` });
    }

    if (!taxeRaw) {
      errors.push({ file: filename, line, column: 'taxe', value: '', severity: 'error', message: 'Taux de taxe manquant' });
    } else {
      const taxe = parseTaxRate(taxeRaw);
      if (taxe <= 0)
        errors.push({ file: filename, line, column: 'taxe', value: taxeRaw, severity: 'error', message: `Taux de taxe invalide (valeur lue : ${taxe})` });
    }

    if (!cat)
      errors.push({ file: filename, line, column: 'categorie', value: '', severity: 'error', message: 'Catégorie manquante' });

    if (!dateRaw) {
      errors.push({ file: filename, line, column: 'date_availability_produit', value: '', severity: 'error', message: 'Date manquante' });
    } else if (!isStrictDdMmYyyy(dateRaw)) {
      errors.push({ file: filename, line, column: 'date_availability_produit', value: dateRaw, severity: 'error', message: `Format de date invalide : "${dateRaw}". Attendu : JJ/MM/AAAA (ex : 01/12/2025)` });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validation fichier2 : stock + prix spécifiques
// ---------------------------------------------------------------------------
export function validateFichier2(rows: Record<string, any>[], filename = 'Fichier 2'): ValidationError[] {
  const errors: ValidationError[] = [];
  if (rows.length === 0) {
    errors.push({ file: filename, line: 0, column: '—', value: '—', severity: 'error', message: 'Fichier vide' });
    return errors;
  }

  const REQUIRED: RequiredCol[] = [
    { primary: 'reference',     aliases: ['ref'] },
    { primary: 'stock_initial', aliases: ['stock', 'qty', 'quantite'] },
  ];

  const actualCols = Object.keys(rows[0]);
  errors.push(...checkColumns(actualCols, REQUIRED, filename));
  errors.push(...checkColumnConformity(actualCols, REQUIRED, filename));

  if (errors.some(e => e.severity === 'error' && e.line === 0)) return errors;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const ref        = getCol(row, 'reference', 'Reference', 'ref');
    const stockRaw   = getCol(row, 'stock_initial', 'stock', 'Stock', 'qty');
    const priceRaw   = getCol(row, 'prix_vente_ttc', 'prix_vente', 'prix');
    const specificite = getCol(row, 'specificite', 'Specificite');
    const karazany   = getCol(row, 'karazany', 'Karazany');

    if (!ref)
      errors.push({ file: filename, line, column: 'reference', value: '', severity: 'error', message: 'Référence manquante' });

    if (stockRaw === '') {
      errors.push({ file: filename, line, column: 'stock_initial', value: '', severity: 'error', message: 'Stock initial manquant' });
    } else {
      const stock = parseInt(stockRaw);
      if (isNaN(stock) || stock < 0)
        errors.push({ file: filename, line, column: 'stock_initial', value: stockRaw, severity: 'error', message: `Valeur de stock invalide — doit être un entier ≥ 0 (valeur lue : "${stockRaw}")` });
    }

    if (priceRaw) {
      const prix = parseFlexiblePrice(priceRaw);
      if (prix <= 0)
        errors.push({ file: filename, line, column: 'prix_vente_ttc', value: priceRaw, severity: 'error', message: `Le prix de vente doit être un montant positif (valeur lue : ${prix})` });
    }

    if (specificite && !karazany)
      errors.push({ file: filename, line, column: 'karazany', value: '', severity: 'error', message: `"specificite" est renseigné mais "karazany" est vide` });
    if (karazany && !specificite)
      errors.push({ file: filename, line, column: 'specificite', value: '', severity: 'error', message: `"karazany" est renseigné mais "specificite" est vide` });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validation fichier3 : commandes / clients
// ---------------------------------------------------------------------------
export function validateFichier3(rows: Record<string, any>[], filename = 'Fichier 3'): ValidationError[] {
  const errors: ValidationError[] = [];
  if (rows.length === 0) {
    errors.push({ file: filename, line: 0, column: '—', value: '—', severity: 'error', message: 'Fichier vide' });
    return errors;
  }

  const REQUIRED: RequiredCol[] = [
    { primary: 'date',    aliases: ['date_add'] },
    { primary: 'nom',     aliases: ['name'] },
    { primary: 'email',   aliases: ['mail'] },
    { primary: 'pwd',     aliases: ['password', 'mot_de_passe', 'mdp'] },
    { primary: 'adresse', aliases: ['address', 'addr'] },
    { primary: 'achat',   aliases: ['commande', 'order'] },
  ];

  const actualCols = Object.keys(rows[0]);
  errors.push(...checkColumns(actualCols, REQUIRED, filename));
  errors.push(...checkColumnConformity(actualCols, REQUIRED, filename));

  if (errors.some(e => e.severity === 'error' && e.line === 0)) return errors;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const dateRaw = getCol(row, 'date', 'Date');
    const nom     = getCol(row, 'nom', 'Nom', 'name');
    const email   = getCol(row, 'email', 'Email');
    const pwd     = getCol(row, 'pwd', 'password', 'mdp');
    const adresse = getCol(row, 'adresse', 'Adresse', 'address');
    const achat   = getCol(row, 'achat', 'Achat', 'commande');

    if (!nom)
      errors.push({ file: filename, line, column: 'nom', value: '', severity: 'error', message: 'Nom du client manquant' });

    if (!email) {
      errors.push({ file: filename, line, column: 'email', value: '', severity: 'error', message: 'Email manquant' });
    } else if (!isValidEmail(email)) {
      errors.push({ file: filename, line, column: 'email', value: email, severity: 'error', message: `Format email invalide` });
    }

    if (!pwd)
      errors.push({ file: filename, line, column: 'pwd', value: '', severity: 'error', message: 'Mot de passe manquant' });

    if (!adresse)
      errors.push({ file: filename, line, column: 'adresse', value: '', severity: 'error', message: 'Adresse manquante' });

    if (!dateRaw) {
      errors.push({ file: filename, line, column: 'date', value: '', severity: 'error', message: 'Date manquante' });
    } else if (!isStrictDdMmYyyy(dateRaw)) {
      errors.push({ file: filename, line, column: 'date', value: dateRaw, severity: 'error', message: `Format de date invalide : "${dateRaw}". Attendu : JJ/MM/AAAA (ex : 15/05/2025)` });
    }

    if (!achat) {
      errors.push({ file: filename, line, column: 'achat', value: '', severity: 'error', message: 'Colonne achat vide' });
    } else {
      const items = parseAchat(achat);
      if (items.length === 0) {
        errors.push({ file: filename, line, column: 'achat', value: achat, severity: 'error', message: `Format achat invalide — aucun article parseable. Attendu : [("ref";qty;"déclinaison")]` });
      } else {
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (!item.ref)
            errors.push({ file: filename, line, column: `achat[${j + 1}].reference`, value: achat, severity: 'error', message: `Article ${j + 1} : référence manquante` });
          if (item.qty <= 0)
            errors.push({ file: filename, line, column: `achat[${j + 1}].quantite`, value: String(item.qty), severity: 'error', message: `Article ${j + 1} : la quantité doit être positive (valeur lue : ${item.qty})` });
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validation globale
// ---------------------------------------------------------------------------
export function validateAll(
  f1rows: Record<string, any>[],
  f2rows: Record<string, any>[],
  f3rows: Record<string, any>[],
  f1name = 'Fichier 1 (produits)',
  f2name = 'Fichier 2 (stock & prix)',
  f3name = 'Fichier 3 (commandes)'
): ValidationError[] {
  return [
    ...(f1rows.length > 0 ? validateFichier1(f1rows, f1name) : []),
    ...(f2rows.length > 0 ? validateFichier2(f2rows, f2name) : []),
    ...(f3rows.length > 0 ? validateFichier3(f3rows, f3name) : []),
  ];
}
