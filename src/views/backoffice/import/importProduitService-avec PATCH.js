/**
 * Service d'importation des Produits PrestaShop (Fichier 1)
 * Logique identique à ImportProduits.vue + gestion des erreurs CSV :
 *  1. Noms de colonnes non conformes
 *  2. Format de date différent de DD/MM/YYYY (validation calendaire complète)
 *  3. Montants négatifs / séparateurs quelconques
 *  4. Taxe obligatoire
 *  5. PATCH de la available_date après création/update du produit
 */

import { buildPrestashopXml } from '../../../utils/prestashopXmlBuilder';
import { fetchSchema } from '../../../api/schemaService';
import api from '../../../api/api';

// ─── Colonnes attendues dans le fichier Produits ──────────────────────────────
const COLONNES_REQUISES_PRODUITS = [
  'reference',
  'nom',
  'prix_ttc',
  'prix_achat',
  'Taxe',
  'date_availability_produit',
  'categorie',
];

// ─── Helpers de validation ────────────────────────────────────────────────────

/**
 * Vérifie que toutes les colonnes attendues sont présentes.
 * @param {string[]} colonnesDetectees - Tableau des noms de colonnes du CSV
 * @returns {string[]} Liste des erreurs (vide si tout est OK)
 */
export const validerColonnesProduits = (colonnesDetectees) => {
  const erreurs = [];
  for (const col of COLONNES_REQUISES_PRODUITS) {
    if (!colonnesDetectees.includes(col)) {
      erreurs.push(`Colonne manquante ou non conforme : "${col}"`);
    }
  }
  return erreurs;
};

/**
 * Vérifie qu'une date est au format DD<sep>MM<sep>YYYY (tout séparateur accepté)
 * ET qu'elle existe réellement dans le calendrier (jours max par mois,
 * années bissextiles pour février).
 * Exemples valides   : "01/01/2026"  "31-12-2025"  "29.02.2024"
 * Exemples invalides : "36/01/2026"  "29/02/2025"  "31/04/2026"
 * @param {string} dateStr
 * @returns {boolean}
 */
export const estDateValide = (dateStr) => {
  if (!dateStr) return true; // champ optionnel

  // 1. Accepter n'importe quel séparateur non-chiffre unique (/, -, ., espace…)
  const match = dateStr.trim().match(/^(\d{2})[^\d](\d{2})[^\d](\d{4})$/);
  if (!match) return false;

  const day   = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year  = parseInt(match[3], 10);

  // 2. Bornes basiques
  if (month < 1 || month > 12) return false;
  if (day   < 1)               return false;

  // 3. Validation calendaire réelle (gère bissextiles automatiquement) :
  //    JS reporte les jours débordants sur le mois suivant → la comparaison échoue
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year    &&
    date.getMonth()    === month - 1 &&
    date.getDate()     === day
  );
};

/**
 * Normalise un montant en supprimant les séparateurs de milliers
 * (espace, apostrophe) et en convertissant le séparateur décimal en point.
 * Gère tous les formats courants :
 *   "1234"       → 1234
 *   "1234,56"    → 1234.56   (virgule = décimal)
 *   "1234.56"    → 1234.56   (point = décimal)
 *   "1 234,56"   → 1234.56   (espace milliers + virgule décimal)
 *   "1.234,56"   → 1234.56   (point milliers + virgule décimal)
 *   "1,234.56"   → 1234.56   (virgule milliers + point décimal)
 *   "1'234.56"   → 1234.56   (apostrophe milliers + point décimal)
 * @param {string|number} valeur
 * @returns {number} float parsé (NaN si invalide)
 */
export const normaliserMontant = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return NaN;
  let s = String(valeur).trim();

  const hasComma = s.includes(',');
  const hasDot   = s.includes('.');

  if (hasComma && hasDot) {
    // Les deux présents : le DERNIER est le séparateur décimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // ex: "1.234,56" → virgule = décimal, point = milliers
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // ex: "1,234.56" → point = décimal, virgule = milliers
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Virgule seule → séparateur décimal
    s = s.replace(',', '.');
  }
  // Supprimer espaces et apostrophes (séparateurs de milliers restants)
  s = s.replace(/[\s']/g, '');

  return parseFloat(s);
};

/**
 * Vérifie qu'un montant est >= 0, quel que soit son format de saisie.
 * @param {string|number} valeur
 * @returns {boolean}
 */
export const estMontantPositif = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return true;
  const n = normaliserMontant(valeur);
  return !isNaN(n) && n >= 0;
};

/**
 * Valide une ligne CSV produit.
 * @param {Object} row   - Ligne brute du CSV
 * @param {number} index - Numéro de ligne (pour le message d'erreur)
 * @returns {string[]} Liste des erreurs sur cette ligne
 */
export const validerLigneProduit = (row, index) => {
  const erreurs = [];
  const ligne = `Ligne ${index + 1} (ref: ${row.reference || '?'})`;

  // Taxe obligatoire
  if (!row.Taxe || row.Taxe.toString().trim() === '') {
    erreurs.push(`${ligne} : la colonne "Taxe" est obligatoire et ne peut pas être vide`);
  }

  // Date optionnelle mais valide si renseignée
  if (!estDateValide(row.date_availability_produit)) {
    erreurs.push(
      `${ligne} : date_availability_produit "${row.date_availability_produit}" invalide ` +
      `(attendu DD/MM/YYYY avec une date calendaire réelle)`
    );
  }

  // Montants positifs (tout séparateur accepté)
  if (!estMontantPositif(row.prix_ttc)) {
    erreurs.push(`${ligne} : prix_ttc "${row.prix_ttc}" doit être un montant positif`);
  }
  if (!estMontantPositif(row.prix_achat)) {
    erreurs.push(`${ligne} : prix_achat "${row.prix_achat}" doit être un montant positif`);
  }

  return erreurs;
};

/**
 * Point d'entrée : valide l'intégralité du CSV produits.
 * Lance une Error si des erreurs sont détectées.
 * @param {Object[]} rows - Données brutes Papa.parse
 */
export const validerCSVProduits = (rows) => {
  if (!rows || rows.length === 0) throw new Error('Le fichier CSV Produits est vide.');

  const colonnes = Object.keys(rows[0]);
  const erreursColonnes = validerColonnesProduits(colonnes);
  if (erreursColonnes.length > 0) {
    throw new Error('Erreurs de colonnes :\n' + erreursColonnes.join('\n'));
  }

  const erreursLignes = [];
  rows.forEach((row, i) => {
    erreursLignes.push(...validerLigneProduit(row, i));
  });

  if (erreursLignes.length > 0) {
    throw new Error('Erreurs dans les données :\n' + erreursLignes.join('\n'));
  }
};

// ─── Logique métier ───────────────────────────────────────────────────────────

export const normaliserFormatTaxe = (taxeTxt) => {
  if (!taxeTxt) return { taux: '0', label: 'TVA 0%' };
  let taxeNettoyee = taxeTxt.trim();
  let tauxNumerique = taxeNettoyee
    .replace('%', '')
    .replace(',', '.')
    .replace(/\s/g, '')
    .match(/[\d]+\.?[\d]*/);
  if (!tauxNumerique) return { taux: '0', label: 'TVA 0%' };
  const taux = parseFloat(tauxNumerique[0]).toFixed(3);
  const label = `TVA ${parseFloat(taux).toString().replace('.', ',')}%`;
  return { taux, label };
};

/**
 * Convertit une date CSV (DD<sep>MM<sep>YYYY, tout séparateur) en format SQL (YYYY-MM-DD).
 * @param {string} dateStr
 * @returns {string|null}
 */
export const convertirDateCsvEnSql = (dateStr) => {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^(\d{2})[^\d](\d{2})[^\d](\d{4})$/);
  if (!match) {
    throw new Error(
      `Format de date invalide : "${dateStr}" (attendu DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY…)`
    );
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

export const preparerLigneProduit = (row) => {
  const taxeInfo  = normaliserFormatTaxe(row.Taxe);
  const prixTtc   = row.prix_ttc   ? normaliserMontant(row.prix_ttc)   : 0;
  const prixAchat = row.prix_achat ? normaliserMontant(row.prix_achat) : 0;
  const tauxDecimal = parseFloat(taxeInfo.taux);
  const prixHt = tauxDecimal > 0 && prixTtc > 0 ? prixTtc / (1 + tauxDecimal / 100) : prixTtc;

  const dateCsvBrute = row.date_availability_produit?.trim() || '';

  return {
    reference:      row.reference?.trim(),
    nom:            row.nom?.trim(),
    prix_ht:        prixHt.toFixed(6),
    prix_achat:     prixAchat.toFixed(6),
    date_csv_brute: dateCsvBrute,
    date_dispo:     null,
    categorie:      row.categorie?.trim() || 'Accueil',
    taxe_label:     taxeInfo.label,
    taxe_taux:      taxeInfo.taux,
    id_prestashop:  null,
    status:         'pending',
    erreur:         '',
    tables: { ps_product: 'En attente', ps_product_lang: 'En attente', ps_product_shop: 'En attente' },
  };
};

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

let categorySchema = null;
let taxSchema = null;

export const chargerSchemas = async () => {
  try {
    categorySchema = await fetchSchema('categories');
    taxSchema = await fetchSchema('tax_rule_groups');
  } catch (error) {
    console.error('❌ Erreur chargement schémas:', error);
  }
};

export const obtenirOuCreerCategorie = async (nomCat, cache, registreRollback) => {
  if (cache[nomCat]) return cache[nomCat];
  try {
    const res = await api.get(`/categories?filter[name]=${encodeURIComponent(nomCat)}&display=[id]`);
    if (res.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, 'application/xml');
      const categories = xmlDoc.getElementsByTagName('category');
      if (categories.length > 0) {
        const id = categories[0].getElementsByTagName('id')[0]?.textContent;
        if (id) { cache[nomCat] = id; return id; }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche catégorie "${nomCat}":`, error);
  }
  if (!categorySchema) throw new Error('❌ Schéma des catégories non chargé');
  const slug = slugify(nomCat);
  const mappedData = { id_parent: '1', active: '1', id_shop_default: '1', is_root_category: '0', name: nomCat, link_rewrite: slug, description: '', meta_title: nomCat, meta_description: '' };
  const xmlCategory = buildPrestashopXml('category', mappedData, categorySchema.fields);
  try {
    const response = await api.post('/categories', xmlCategory, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent;
    if (!newId) throw new Error(`ID non trouvé pour la catégorie: ${nomCat}`);
    cache[nomCat] = newId;
    registreRollback.push(newId);
    return newId;
  } catch (error) {
    console.error(`❌ Échec création catégorie "${nomCat}":`, error);
    throw error;
  }
};

export const obtenirOuCreerGroupeTaxe = async (labelTaxe, tauxTaxe, idPays, cache, registreRollback) => {
  if (cache[labelTaxe]) return cache[labelTaxe];
  try {
    const res = await api.get(`/tax_rule_groups?filter[name]=${encodeURIComponent(labelTaxe)}&display=[id]`);
    if (res.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, 'application/xml');
      const taxGroups = xmlDoc.getElementsByTagName('tax_rule_group');
      if (taxGroups.length > 0) {
        const id = taxGroups[0].getElementsByTagName('id')[0]?.textContent;
        if (id) { cache[labelTaxe] = id; return id; }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche taxe "${labelTaxe}":`, error);
  }
  let idTax = null;
  try {
    const resTax = await api.get(`/taxes?filter[rate]=${encodeURIComponent(tauxTaxe)}&display=[id]`);
    if (resTax.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(resTax.data, 'application/xml');
      const taxes = xmlDoc.getElementsByTagName('tax');
      if (taxes.length > 0) idTax = taxes[0].getElementsByTagName('id')[0]?.textContent;
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche taxe taux ${tauxTaxe}%:`, error);
  }
  if (!idTax) {
    try {
      const xmlTax = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <tax>\n    <rate>${tauxTaxe}</rate>\n    <active>1</active>\n    <name>\n      <language id="1"><![CDATA[${labelTaxe}]]></language>\n      <language id="2"><![CDATA[${labelTaxe}]]></language>\n    </name>\n  </tax>\n</prestashop>`;
      const responseTax = await api.post('/taxes', xmlTax, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseTax.data, 'application/xml');
      idTax = xmlDoc.getElementsByTagName('id')[0]?.textContent;
      if (!idTax) throw new Error(`ID non trouvé pour la taxe: ${labelTaxe}`);
      registreRollback.push({ type: 'tax', id: idTax });
    } catch (error) {
      console.error(`❌ Échec création taxe "${labelTaxe}":`, error);
      throw error;
    }
  }
  if (!taxSchema) throw new Error('❌ Schéma des taxes non chargé');
  const mappedData = { name: labelTaxe, active: '1' };
  const xmlTaxGroup = buildPrestashopXml('tax_rule_group', mappedData, taxSchema.fields);
  let idTaxRuleGroup = null;
  try {
    const response = await api.post('/tax_rule_groups', xmlTaxGroup, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    idTaxRuleGroup = xmlDoc.getElementsByTagName('id')[0]?.textContent;
    if (!idTaxRuleGroup) throw new Error(`ID non trouvé pour le groupe de taxe: ${labelTaxe}`);
    registreRollback.push({ type: 'tax_rule_group', id: idTaxRuleGroup });
  } catch (error) {
    console.error(`❌ Échec création groupe taxe "${labelTaxe}":`, error);
    throw error;
  }
  try {
    const xmlTaxRule = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <tax_rule>\n    <id_tax_rules_group>${idTaxRuleGroup}</id_tax_rules_group>\n    <id_country>8</id_country>\n    <id_state>0</id_state>\n    <zipcode_from>0</zipcode_from>\n    <zipcode_to>0</zipcode_to>\n    <id_tax>${idTax}</id_tax>\n    <behavior>0</behavior>\n  </tax_rule>\n</prestashop>`;
    const responseRule = await api.post('/tax_rules', xmlTaxRule, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseRule.data, 'application/xml');
    const idTaxRule = xmlDoc.getElementsByTagName('id')[0]?.textContent;
    registreRollback.push({ type: 'tax_rule', id: idTaxRule });
  } catch (error) {
    console.error(`❌ Échec création règle taxe pour groupe ${idTaxRuleGroup}:`, error);
  }
  cache[labelTaxe] = idTaxRuleGroup;
  return idTaxRuleGroup;
};

export const verifierExistenceReference = async (refProduct) => {
  try {
    const res = await api.get(`/products?filter[reference]=[${refProduct}]&display=[id]`);
    if (!res.data) return null;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, 'application/xml');
    const id = xmlDoc.getElementsByTagName('id')[0]?.textContent;
    return id || null;
  } catch (error) {
    return null;
  }
};

// ─── PATCH de la available_date ───────────────────────────────────────────────

/**
 * Met à jour UNIQUEMENT la available_date d'un produit existant.
 * @param {string} productId - ID du produit PrestaShop
 * @param {string} dateSql   - Date au format YYYY-MM-DD
 * @returns {Promise<void>}
 */
export const patcherAvailableDate = async (productId, dateSql) => {
  if (!productId || !dateSql) {
    console.warn(`⚠️ PATCH date ignoré : productId=${productId}, date=${dateSql}`);
    return;
  }

  const existingProductRes = await api.get(`/products/${productId}?output_format=XML`);
  const parser = new DOMParser();
  const existingDoc = parser.parseFromString(existingProductRes.data, 'application/xml');

  const price             = existingDoc.querySelector('product price')?.textContent?.trim()              || '0';
  const idCategoryDefault = existingDoc.querySelector('product id_category_default')?.textContent?.trim() || '2';
  const idTaxRulesGroup   = existingDoc.querySelector('product id_tax_rules_group')?.textContent?.trim()  || '1';
  const active            = existingDoc.querySelector('product active')?.textContent?.trim()              || '1';
  const state             = existingDoc.querySelector('product state')?.textContent?.trim()               || '1';

  console.log(`📅 PATCH available_date pour produit #${productId} : "${dateSql}"`);

  const xmlPatch = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id>${productId}</id>
    <price>${price}</price>
    <id_category_default>${idCategoryDefault}</id_category_default>
    <id_tax_rules_group>${idTaxRulesGroup}</id_tax_rules_group>
    <active>${active}</active>
    <state>${state}</state>
    <available_date>${dateSql}</available_date>
  </product>
</prestashop>`;

  await api.put(`/products/${productId}`, xmlPatch, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });

  console.log(`✅ PATCH available_date réussi pour produit #${productId} : ${dateSql}`);
};

// ─── Importation principale ───────────────────────────────────────────────────

/**
 * Lance l'importation des produits.
 * Étape 1 : Création/Mise à jour du produit (sans available_date)
 * Étape 2 : PATCH de la available_date si une date est fournie dans le CSV
 *
 * @param {Object[]} produitsTraites - Tableau réactif des produits préparés
 * @param {Function} onProgress      - Callback appelé après chaque ligne
 * @returns {{ success: boolean, message: string }}
 */
export const importerProduits = async (produitsTraites, onProgress) => {
  const produitsCreesIds   = [];
  const categoriesCreesIds = [];
  const taxesCreesIds      = [];
  const cacheCategories    = {};
  const cacheTaxes         = {};
  let transactionEnEchec   = false;

  for (let prod of produitsTraites) {
    if (transactionEnEchec) {
      prod.status = 'rolled_back';
      prod.tables = { ps_product: 'Annulé', ps_product_lang: 'Annulé', ps_product_shop: 'Annulé' };
      continue;
    }
    try {
      const idCategoryDefault = await obtenirOuCreerCategorie(prod.categorie, cacheCategories, categoriesCreesIds);
      const idTaxRulesGroup   = await obtenirOuCreerGroupeTaxe(
        prod.taxe_label || 'TVA 0%',
        prod.taxe_taux  || '0.000',
        3,
        cacheTaxes,
        taxesCreesIds
      );
      const existId = await verifierExistenceReference(prod.reference);

      // Étape 1 : créer/mettre à jour le produit SANS available_date
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    ${existId ? `<id>${existId}</id>` : ''}
    <reference><![CDATA[${prod.reference}]]></reference>
    <price>${prod.prix_ht}</price>
    <wholesale_price>${prod.prix_achat}</wholesale_price>
    <active>1</active>
    <state>1</state>
    <show_price>1</show_price>
    <available_for_order>1</available_for_order>
    <id_category_default>${idCategoryDefault}</id_category_default>
    <id_tax_rules_group>${idTaxRulesGroup}</id_tax_rules_group>
    <id_shop_default>1</id_shop_default>
    <name><language id="2">${prod.nom}</language></name>
    <associations>
      <categories><category><id>${idCategoryDefault}</id></category></categories>
    </associations>
  </product>
</prestashop>`;

      const url     = existId ? `/products/${existId}` : '/products';
      const methode = existId ? 'PUT' : 'POST';
      const response = methode === 'PUT'
        ? await api.put(url,  xmlPayload, { headers: { 'Content-Type': 'application/xml' } })
        : await api.post(url, xmlPayload, { headers: { 'Content-Type': 'application/xml' } });

      const parser     = new DOMParser();
      const xmlDoc     = parser.parseFromString(response.data, 'application/xml');
      const insertedId = xmlDoc.getElementsByTagName('id')[0]?.textContent;
      const productId  = insertedId || existId;

      prod.id_prestashop = productId;
      prod.status        = 'success';
      prod.tables        = { ps_product: 'Écrit ✔', ps_product_lang: 'Écrit ✔', ps_product_shop: 'Écrit ✔' };
      if (!existId && insertedId) produitsCreesIds.push(insertedId);

      // Étape 2 : PATCH de la available_date si une date est fournie
      if (prod.date_csv_brute && prod.date_csv_brute !== '') {
        try {
          const dateSql    = convertirDateCsvEnSql(prod.date_csv_brute);
          prod.date_dispo  = dateSql;
          await patcherAvailableDate(productId, dateSql);
          console.log(`📅 Date dispo patchée pour "${prod.reference}" : ${dateSql}`);
        } catch (dateErr) {
          console.error(`❌ Erreur PATCH date pour "${prod.reference}" : ${dateErr.message}`);
          prod.erreur          = `Produit créé mais date non appliquée : ${dateErr.message}`;
          prod.tables.ps_product = 'Écrit ✔ (date ✘)';
        }
      } else {
        console.log(`ℹ️ Aucune date dispo pour "${prod.reference}", PATCH ignoré`);
      }

    } catch (err) {
      transactionEnEchec = true;
      prod.status  = 'error';
      prod.erreur  = err.message;
      prod.tables  = { ps_product: 'ÉCHEC ✘', ps_product_lang: 'ÉCHEC ✘', ps_product_shop: 'ÉCHEC ✘' };
    }
    if (onProgress) onProgress(prod);
  }

  if (transactionEnEchec) {
    for (let id of produitsCreesIds)   await api.delete(`/products/${id}`);
    for (let id of categoriesCreesIds) await api.delete(`/categories/${id}`);
    for (let id of taxesCreesIds)      await api.delete(`/tax_rule_groups/${id}`);
    return { success: false, message: "Transaction annulée avec succès. Aucune donnée partielle n'a été conservée." };
  }
  return { success: true, message: 'Importation réussie ! Les produits, catégories et taxes ont été synchronisés.' };
};