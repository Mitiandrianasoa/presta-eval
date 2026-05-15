import { parseFlexibleDate, parseFlexiblePrice, parseTaxRate } from './csvParserUtils';
import { parseAchat } from './fichier3ImportService';

export interface ValidationError {
  file: string;
  line: number;     // 0 = en-tête, 1+ = ligne de données
  column: string;
  value: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Utilitaire : lecture robuste d'une colonne
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
// Vérification des colonnes obligatoires — accepte les alias (insensible à la casse)
// ---------------------------------------------------------------------------
interface RequiredCol { primary: string; aliases: string[] }

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
      errors.push({ file: filename, line: 0, column: col.primary, value: '—', message: `Colonne obligatoire "${col.primary}" manquante` });
    }
  }
  return errors;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Validation fichier1 : produits / catégories / taxes
// ---------------------------------------------------------------------------
export function validateFichier1(rows: Record<string, any>[], filename = 'Fichier 1'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (rows.length === 0) {
    errors.push({ file: filename, line: 0, column: '—', value: '—', message: 'Fichier vide' });
    return errors;
  }

  const REQUIRED: RequiredCol[] = [
    { primary: 'nom',                      aliases: ['name'] },
    { primary: 'reference',                aliases: ['ref'] },
    { primary: 'prix_ttc',                 aliases: ['prix', 'price'] },
    { primary: 'taxe',                     aliases: ['taux', 'tva', 'tax'] },
    { primary: 'categorie',                aliases: ['category', 'cat'] },
    { primary: 'date_availability_produit', aliases: ['date_produit', 'date'] },
  ];
  errors.push(...checkColumns(Object.keys(rows[0]), REQUIRED, filename));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const nom      = getCol(row, 'nom', 'Nom', 'name');
    const ref      = getCol(row, 'reference', 'Reference', 'ref');
    const prixRaw  = getCol(row, 'prix_ttc', 'prix', 'price');
    const taxeRaw  = getCol(row, 'Taxe', 'taxe', 'taux', 'TVA');
    const cat      = getCol(row, 'categorie', 'Categorie', 'category');
    const dateRaw  = getCol(row, 'date_availability_produit', 'date_produit', 'date');

    if (!nom)
      errors.push({ file: filename, line, column: 'nom', value: nom, message: 'Nom du produit manquant' });

    if (!ref)
      errors.push({ file: filename, line, column: 'reference', value: ref, message: 'Référence manquante' });

    const prix = parseFlexiblePrice(prixRaw);
    if (!prixRaw)
      errors.push({ file: filename, line, column: 'prix_ttc', value: prixRaw, message: 'Prix TTC manquant' });
    else if (prix <= 0)
      errors.push({ file: filename, line, column: 'prix_ttc', value: prixRaw, message: `Prix invalide ou nul (valeur parsée : ${prix})` });

    const taxe = parseTaxRate(taxeRaw);
    if (!taxeRaw)
      errors.push({ file: filename, line, column: 'Taxe', value: taxeRaw, message: 'Taux de taxe manquant' });
    else if (taxe <= 0)
      errors.push({ file: filename, line, column: 'Taxe', value: taxeRaw, message: `Taux de taxe invalide (valeur parsée : ${taxe})` });

    if (!cat)
      errors.push({ file: filename, line, column: 'categorie', value: cat, message: 'Catégorie manquante' });

    if (!dateRaw) {
      errors.push({ file: filename, line, column: 'date_availability_produit', value: dateRaw, message: 'Date manquante' });
    } else {
      const dateParsed = parseFlexibleDate(dateRaw);
      if (!dateParsed || dateParsed === dateRaw)
        errors.push({ file: filename, line, column: 'date_availability_produit', value: dateRaw, message: `Format de date non reconnu` });
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
    errors.push({ file: filename, line: 0, column: '—', value: '—', message: 'Fichier vide' });
    return errors;
  }

  const REQUIRED: RequiredCol[] = [
    { primary: 'reference',    aliases: ['ref'] },
    { primary: 'stock_initial', aliases: ['stock', 'qty', 'quantite'] },
  ];
  errors.push(...checkColumns(Object.keys(rows[0]), REQUIRED, filename));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    const ref        = getCol(row, 'reference', 'Reference', 'ref');
    const stockRaw   = getCol(row, 'stock_initial', 'stock', 'Stock', 'qty');
    const priceRaw   = getCol(row, 'prix_vente_ttc', 'prix_vente', 'prix');
    const specificite = getCol(row, 'specificite', 'Specificite');
    const karazany   = getCol(row, 'karazany', 'Karazany');

    if (!ref)
      errors.push({ file: filename, line, column: 'reference', value: ref, message: 'Référence manquante' });

    if (stockRaw === '') {
      errors.push({ file: filename, line, column: 'stock_initial', value: stockRaw, message: 'Stock initial manquant' });
    } else {
      const stock = parseInt(stockRaw);
      if (isNaN(stock) || stock < 0)
        errors.push({ file: filename, line, column: 'stock_initial', value: stockRaw, message: `Valeur de stock invalide (doit être un entier ≥ 0)` });
    }

    if (priceRaw) {
      const prix = parseFlexiblePrice(priceRaw);
      if (prix <= 0)
        errors.push({ file: filename, line, column: 'prix_vente_ttc', value: priceRaw, message: `Prix de vente invalide (valeur parsée : ${prix})` });
    }

    if (specificite && !karazany)
      errors.push({ file: filename, line, column: 'karazany', value: karazany, message: `"specificite" est renseigné mais "karazany" est vide` });

    if (karazany && !specificite)
      errors.push({ file: filename, line, column: 'specificite', value: specificite, message: `"karazany" est renseigné mais "specificite" est vide` });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validation fichier3 : commandes / clients
// ---------------------------------------------------------------------------
export function validateFichier3(rows: Record<string, any>[], filename = 'Fichier 3'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (rows.length === 0) {
    errors.push({ file: filename, line: 0, column: '—', value: '—', message: 'Fichier vide' });
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
  errors.push(...checkColumns(Object.keys(rows[0]), REQUIRED, filename));

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
      errors.push({ file: filename, line, column: 'nom', value: nom, message: 'Nom du client manquant' });

    if (!email) {
      errors.push({ file: filename, line, column: 'email', value: email, message: 'Email manquant' });
    } else if (!isValidEmail(email)) {
      errors.push({ file: filename, line, column: 'email', value: email, message: `Format email invalide` });
    }

    if (!pwd)
      errors.push({ file: filename, line, column: 'pwd', value: pwd, message: 'Mot de passe manquant' });

    if (!adresse)
      errors.push({ file: filename, line, column: 'adresse', value: adresse, message: 'Adresse manquante' });

    if (!dateRaw) {
      errors.push({ file: filename, line, column: 'date', value: dateRaw, message: 'Date manquante' });
    } else {
      const dateParsed = parseFlexibleDate(dateRaw);
      if (!dateParsed || dateParsed === dateRaw)
        errors.push({ file: filename, line, column: 'date', value: dateRaw, message: `Format de date non reconnu` });
    }

    if (!achat) {
      errors.push({ file: filename, line, column: 'achat', value: achat, message: 'Colonne achat vide' });
    } else {
      const items = parseAchat(achat);
      if (items.length === 0) {
        errors.push({ file: filename, line, column: 'achat', value: achat, message: `Format achat invalide — aucun article parseable. Attendu : [(\"ref\";qty;\"déclinaison\")]` });
      } else {
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          if (!item.ref)
            errors.push({ file: filename, line, column: `achat[${j + 1}].reference`, value: achat, message: `Article ${j + 1} : référence manquante` });
          if (item.qty <= 0)
            errors.push({ file: filename, line, column: `achat[${j + 1}].quantite`, value: String(item.qty), message: `Article ${j + 1} : quantité invalide (${item.qty})` });
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validation globale des 3 fichiers
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
