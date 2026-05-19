/**
 * Service d'importation des Déclinaisons & Stocks PrestaShop (Fichier 2)
 * Logique identique à ImportDeclinaison.vue + gestion des erreurs CSV :
 *  1. Noms de colonnes non conformes
 *  2. Format de date différent de DD/MM/YYYY  (non applicable ici, conservé par cohérence)
 *  3. Montants négatifs
 */

import api from '../../../api/api';
import { updateResource } from '../../../api/schemaService';
import { useStockStore } from '../../../stores/stock/stockStore';

// ─── Colonnes attendues dans le fichier Déclinaisons ─────────────────────────
const COLONNES_REQUISES_DECLINAISONS = [
  'reference',
  'stock_initial',
  'prix_vente_ttc',
];
// Note : 'specificite' / 'specificité' et 'karazany' sont optionnelles selon le type de produit.

// ─── Helpers de validation ────────────────────────────────────────────────────

/**
 * Vérifie que toutes les colonnes attendues sont présentes.
 * Gère la variante avec/sans accent pour "specificite".
 * @param {string[]} colonnesDetectees
 * @returns {string[]}
 */
export const validerColonnesDeclinaisons = (colonnesDetectees) => {
  const erreurs = [];
  for (const col of COLONNES_REQUISES_DECLINAISONS) {
    if (!colonnesDetectees.includes(col)) {
      erreurs.push(`Colonne manquante ou non conforme : "${col}"`);
    }
  }
  // Vérification tolérante pour specificite / specificité
  const hasSpecificite =
    colonnesDetectees.includes('specificite') ||
    colonnesDetectees.includes('specificité');
  if (!hasSpecificite) {
    erreurs.push('Colonne manquante ou non conforme : "specificite" (ou "specificité")');
  }
  if (!colonnesDetectees.includes('karazany')) {
    erreurs.push('Colonne manquante ou non conforme : "karazany"');
  }
  return erreurs;
};

/**
 * Vérifie qu'un montant est positif (>= 0).
 * @param {string|number} valeur
 * @returns {boolean}
 */
export const estMontantPositif = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return true;
  const n = parseFloat(String(valeur).replace(',', '.'));
  return !isNaN(n) && n >= 0;
};

/**
 * Valide une ligne CSV déclinaison.
 * @param {Object} row
 * @param {number} index
 * @returns {string[]}
 */
export const validerLigneDeclinaison = (row, index) => {
  const erreurs = [];
  const ligne = `Ligne ${index + 1} (ref: ${row.reference || '?'})`;

  if (!estMontantPositif(row.prix_vente_ttc)) {
    erreurs.push(`${ligne} : prix_vente_ttc "${row.prix_vente_ttc}" doit être un montant positif`);
  }
  if (!estMontantPositif(row.stock_initial)) {
    erreurs.push(`${ligne} : stock_initial "${row.stock_initial}" doit être un montant positif`);
  }

  return erreurs;
};

export const patcherDateStock = async (idProduct, idProductAttribute) => {
  try {
    const parser = new DOMParser();

    const productRes = await api.get(
      `/products/${idProduct}?output_format=XML&display=[id,available_date]`
    );
    const productDoc = parser.parseFromString(productRes.data, 'text/xml');
    const availableDate = productDoc
      .querySelector('product available_date')
      ?.textContent?.trim();

    console.log(`[DEBUG] produit #${idProduct} → available_date = "${availableDate}"`);

    if (!availableDate || availableDate === '0000-00-00') {
      console.log(`[StockImport] Pas de available_date pour produit #${idProduct}, date ignorée.`);
      return;
    }

    const dateSql = `${availableDate} 00:00:00`;

    const filterAttr = idProductAttribute && idProductAttribute !== '0'
      ? `&filter[id_product_attribute]=${idProductAttribute}`
      : '&filter[id_product_attribute]=0';

    const urlMvt = `/stock_movements?output_format=XML&display=full&filter[id_product]=${idProduct}${filterAttr}&sort=[id_DESC]&limit=1`;
    console.log(`[DEBUG] GET mouvements → ${urlMvt}`);

    const mvtRes = await api.get(urlMvt);
    const mvtDoc = parser.parseFromString(mvtRes.data, 'text/xml');
    const lastMvt = mvtDoc.querySelector('stock_mvt');

    console.log(`[DEBUG] lastMvt trouvé =`, lastMvt ? 'OUI' : 'NON');
    console.log(`[DEBUG] XML réponse mouvements =`, mvtRes.data?.substring(0, 500));

    if (!lastMvt) return;

    const idMouvement = lastMvt.querySelector('id')?.textContent?.trim();
    console.log(`[DEBUG] idMouvement = "${idMouvement}"`);

    const urlPut = `/stock_movements/${idMouvement}?output_format=XML`;
    console.log(`[DEBUG] PUT → ${urlPut} avec date_add = "${dateSql}"`);

    const currentSign     = lastMvt.querySelector('sign')?.textContent?.trim() || '1';
    const currentQty      = lastMvt.querySelector('physical_quantity')?.textContent?.trim() || '0';
    const currentReason   = lastMvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || '1';
    const currentEmployee = lastMvt.querySelector('id_employee')?.textContent?.trim() || '1';
    const currentStock    = lastMvt.querySelector('id_stock')?.textContent?.trim() || '0';
    const currentPriceTe  = lastMvt.querySelector('price_te')?.textContent?.trim() || '0.000000';

    const xmlPatch = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_mvt>
    <id><![CDATA[${idMouvement}]]></id>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute || '0'}]]></id_product_attribute>
    <id_warehouse><![CDATA[0]]></id_warehouse>
    <id_currency><![CDATA[2]]></id_currency>
    <id_employee><![CDATA[${currentEmployee}]]></id_employee>
    <id_stock><![CDATA[${currentStock}]]></id_stock>
    <id_stock_mvt_reason><![CDATA[${currentReason}]]></id_stock_mvt_reason>
    <physical_quantity><![CDATA[${currentQty}]]></physical_quantity>
    <sign><![CDATA[${currentSign}]]></sign>
    <price_te><![CDATA[${currentPriceTe}]]></price_te>
    <date_add><![CDATA[${dateSql}]]></date_add>
  </stock_mvt>
</prestashop>`;

    const putRes = await api.put(urlPut, xmlPatch, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/xml',
      },
    });

    console.log(`[DEBUG] PUT status = ${putRes.status}`);
    console.log(`[DEBUG] PUT réponse = ${putRes.data?.substring(0, 300)}`);
    console.log(`[StockImport] ✅ Date mouvement #${idMouvement} mise à jour : ${dateSql}`);

  } catch (error) {
    console.warn(`⚠️ Impossible de patcher la date du mouvement (produit #${idProduct}):`, error);
  }
};

// export const patcherDateStock = async (idProduct, idProductAttribute) => {
//   try {
//     const parser = new DOMParser();

//     // 1. Récupérer available_date depuis le produit
//     const productRes = await api.get(
//       `/products/${idProduct}?output_format=XML&display=[id,available_date]`
//     );
//     const productDoc = parser.parseFromString(productRes.data, 'text/xml');
//     const availableDate = productDoc
//       .querySelector('product available_date')
//       ?.textContent?.trim();

//     if (!availableDate || availableDate === '0000-00-00') {
//       console.log(`[StockImport] Pas de available_date pour produit #${idProduct}, date ignorée.`);
//       return;
//     }

//     const dateSql = `${availableDate} 00:00:00`;

//     // 2. Trouver le dernier mouvement de stock pour ce produit/déclinaison
//     const filterAttr = idProductAttribute && idProductAttribute !== '0'
//       ? `&filter[id_product_attribute]=${idProductAttribute}`
//       : '&filter[id_product_attribute]=0';

//     const mvtRes = await api.get(
//       `/stock_movements?output_format=XML&display=full&filter[id_product]=${idProduct}${filterAttr}&sort=[id_DESC]&limit=1`
//     );
//     const mvtDoc = parser.parseFromString(mvtRes.data, 'text/xml');
//     const lastMvt = mvtDoc.querySelector('stock_mvt');

//     if (!lastMvt) {
//       console.warn(`[StockImport] Aucun mouvement trouvé pour produit #${idProduct}`);
//       return;
//     }

//     const idMouvement = lastMvt.querySelector('id')?.textContent?.trim();
//     if (!idMouvement) {
//       console.warn(`[StockImport] ID mouvement introuvable pour produit #${idProduct}`);
//       return;
//     }

//     // 3. Patcher directement via l'API PrestaShop avec le bon XML <stock_mvt>
//     const currentSign     = lastMvt.querySelector('sign')?.textContent?.trim() || '1';
//     const currentQty      = lastMvt.querySelector('physical_quantity')?.textContent?.trim() || '0';
//     const currentReason   = lastMvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || '1';
//     const currentEmployee = lastMvt.querySelector('id_employee')?.textContent?.trim() || '1';
//     const currentStock    = lastMvt.querySelector('id_stock')?.textContent?.trim() || '0';
//     const currentPriceTe  = lastMvt.querySelector('price_te')?.textContent?.trim() || '0.000000';

//     const xmlPatch = `<?xml version="1.0" encoding="UTF-8"?>
// <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
//   <stock_mvt>
//     <id><![CDATA[${idMouvement}]]></id>
//     <id_product><![CDATA[${idProduct}]]></id_product>
//     <id_product_attribute><![CDATA[${idProductAttribute || '0'}]]></id_product_attribute>
//     <id_warehouse><![CDATA[0]]></id_warehouse>
//     <id_currency><![CDATA[2]]></id_currency>
//     <id_employee><![CDATA[${currentEmployee}]]></id_employee>
//     <id_stock><![CDATA[${currentStock}]]></id_stock>
//     <id_stock_mvt_reason><![CDATA[${currentReason}]]></id_stock_mvt_reason>
//     <physical_quantity><![CDATA[${currentQty}]]></physical_quantity>
//     <sign><![CDATA[${currentSign}]]></sign>
//     <price_te><![CDATA[${currentPriceTe}]]></price_te>
//     <date_add><![CDATA[${dateSql}]]></date_add>
//   </stock_mvt>
// </prestashop>`;

//     await api.put(`/stock_movements/${idMouvement}?output_format=XML`, xmlPatch, {
//       headers: {
//         'Content-Type': 'text/xml; charset=utf-8',
//         'Accept': 'application/xml',
//       },
//     });

//     console.log(`[StockImport] Date mouvement #${idMouvement} mise à jour : ${dateSql}`);

//   } catch (error) {
//     console.warn(`⚠️ Impossible de patcher la date du mouvement (produit #${idProduct}):`, error);
//   }
// };


// export const patcherDateStock = async (idMouvement, idProduct) => {
//   try {
//     const parser = new DOMParser();

//     const productRes = await api.get(
//       `/products/${idProduct}?output_format=XML&display=[id,available_date]`
//     );
//     const productDoc = parser.parseFromString(productRes.data, 'text/xml');
//     const availableDate = productDoc
//       .querySelector('product available_date')
//       ?.textContent?.trim();

//     if (!availableDate || availableDate === '0000-00-00') {
//       console.log(`[StockImport] Pas de available_date pour produit #${idProduct}, date ignorée.`);
//       return;
//     }

//     const dateSql = `${availableDate} 00:00:00`;

//     // ✅ idMouvement est maintenant bien l'ID du stock_movement, pas du stock_available
//     await updateResource('stock_movements', idMouvement, {
//       date_add: dateSql
//     });

//     console.log(`[StockImport] Date mouvement #${idMouvement} mise à jour : ${dateSql}`);
//   } catch (error) {
//     console.warn(`⚠️ Impossible de patcher la date du mouvement #${idMouvement}:`, error);
//   }
// };

/**
 * Point d'entrée : valide l'intégralité du CSV déclinaisons.
 * @param {Object[]} rows
 */
export const validerCSVDeclinaisons = (rows) => {
  if (!rows || rows.length === 0) throw new Error('Le fichier CSV Déclinaisons est vide.');

  const colonnes = Object.keys(rows[0]);
  const erreursColonnes = validerColonnesDeclinaisons(colonnes);
  if (erreursColonnes.length > 0) {
    throw new Error('Erreurs de colonnes :\n' + erreursColonnes.join('\n'));
  }

  const erreursLignes = [];
  rows.forEach((row, i) => {
    erreursLignes.push(...validerLigneDeclinaison(row, i));
  });

  if (erreursLignes.length > 0) {
    throw new Error('Erreurs dans les données :\n' + erreursLignes.join('\n'));
  }
};

// ─── Préparation des données ──────────────────────────────────────────────────

export const preparerLigneDeclinaison = (row) => {
  const specificite = row.specificité?.trim() || row.specificite?.trim() || '';
  const karazany = row.karazany?.trim() || '';
  const stock = parseInt(row.stock_initial) || 0;
  const prixTtc = row.prix_vente_ttc?.trim() || '';
  return {
    reference: row.reference?.trim() || '',
    specificite,
    karazany,
    stock_initial: stock,
    prix_vente_ttc: prixTtc,
    id_product: null,
    id_groupe: null,
    id_valeur: null,
    id_product_attribute: null,
    status: 'pending',
    erreur: '',
  };
};

// ─── Logique métier (identique à ImportDeclinaison.vue) ──────────────────────

const cacheProduits = {};
const cacheGroupesAttributs = {};
const cacheAttributs = {};

export const obtenirIdProduit = async (reference) => {
  if (cacheProduits[reference]) return cacheProduits[reference];
  const res = await api.get(`/products?filter[reference]=[${encodeURIComponent(reference)}]&display=[id]`);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, 'application/xml');
  const products = xmlDoc.getElementsByTagName('product');
  if (products.length > 0) {
    const id = products[0].getElementsByTagName('id')[0]?.textContent?.trim();
    if (id) { cacheProduits[reference] = id; return id; }
  }
  throw new Error(`Produit "${reference}" introuvable. Importez d'abord le Fichier 1.`);
};

export const obtenirOuCreerGroupeAttribut = async (nomGroupe, registreRollback) => {
  if (!nomGroupe) return null;
  const cacheKey = nomGroupe.toLowerCase();
  if (cacheGroupesAttributs[cacheKey]) return cacheGroupesAttributs[cacheKey];
  try {
    const res = await api.get(`/product_options?filter[name]=${encodeURIComponent(nomGroupe)}&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, 'application/xml');
    const groups = xmlDoc.getElementsByTagName('product_option');
    if (groups.length > 0) {
      const id = groups[0].getElementsByTagName('id')[0]?.textContent?.trim();
      if (id) { cacheGroupesAttributs[cacheKey] = id; return id; }
    }
  } catch (e) {
    console.warn(`⚠️ Recherche groupe "${nomGroupe}":`, e);
  }
  try {
    const xmlGroupe = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <product_option>\n    <is_color_group><![CDATA[0]]></is_color_group>\n    <group_type><![CDATA[select]]></group_type>\n    <name>\n      <language id="1"><![CDATA[${nomGroupe}]]></language>\n      <language id="2"><![CDATA[${nomGroupe}]]></language>\n    </name>\n    <public_name>\n      <language id="1"><![CDATA[${nomGroupe}]]></language>\n      <language id="2"><![CDATA[${nomGroupe}]]></language>\n    </public_name>\n  </product_option>\n</prestashop>`;
    const response = await api.post('/product_options', xmlGroupe, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    if (!newId) throw new Error(`ID non trouvé pour le groupe: ${nomGroupe}`);
    cacheGroupesAttributs[cacheKey] = newId;
    registreRollback.push({ type: 'product_option', id: newId });
    return newId;
  } catch (error) {
    console.error(`❌ Échec création groupe "${nomGroupe}":`, error);
    throw error;
  }
};

export const obtenirOuCreerValeurAttribut = async (idGroupe, nomValeur, registreRollback) => {
  if (!idGroupe || !nomValeur) return null;
  const cacheKey = `${idGroupe}_${nomValeur.toLowerCase()}`;
  if (cacheAttributs[cacheKey]) return cacheAttributs[cacheKey];
  try {
    const res = await api.get(`/product_option_values?filter[id_attribute_group]=${idGroupe}&filter[name]=${encodeURIComponent(nomValeur)}&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, 'application/xml');
    const values = xmlDoc.getElementsByTagName('product_option_value');
    if (values.length > 0) {
      const id = values[0].getElementsByTagName('id')[0]?.textContent?.trim();
      if (id) { cacheAttributs[cacheKey] = id; return id; }
    }
  } catch (e) {
    console.warn(`⚠️ Recherche valeur "${nomValeur}":`, e);
  }
  try {
    const xmlValeur = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <product_option_value>\n    <id_attribute_group><![CDATA[${idGroupe}]]></id_attribute_group>\n    <name>\n      <language id="1"><![CDATA[${nomValeur}]]></language>\n      <language id="2"><![CDATA[${nomValeur}]]></language>\n    </name>\n  </product_option_value>\n</prestashop>`;
    const response = await api.post('/product_option_values', xmlValeur, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    if (!newId) throw new Error(`ID non trouvé pour la valeur: ${nomValeur}`);
    cacheAttributs[cacheKey] = newId;
    registreRollback.push({ type: 'product_option_value', id: newId });
    return newId;
  } catch (error) {
    console.error(`❌ Échec création valeur "${nomValeur}":`, error);
    throw error;
  }
};

export const creerCombinaison = async (idProduct, idAttribute, reference, prixTtcDeclinaison, registreRollback) => {
  try {
    let prixBaseHt = 0;
    try {
      const res = await api.get(`/products/${idProduct}?display=[price]`);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, 'application/xml');
      prixBaseHt = parseFloat(xmlDoc.getElementsByTagName('price')[0]?.textContent?.trim() || '0');
    } catch (e) {
      console.warn(`⚠️ Prix de base introuvable pour produit ${idProduct}`);
    }
    let tauxTaxe = 20;
    try {
      const resProduct = await api.get(`/products/${idProduct}?display=[id_tax_rules_group]`);
      const parser = new DOMParser();
      const xmlProduct = parser.parseFromString(resProduct.data, 'application/xml');
      const idTaxRulesGroup = xmlProduct.getElementsByTagName('id_tax_rules_group')[0]?.textContent?.trim();
      if (idTaxRulesGroup && idTaxRulesGroup !== '0') {
        const resTaxRules = await api.get(`/tax_rules?filter[id_tax_rules_group]=${idTaxRulesGroup}&display=[id_tax]`);
        const xmlTaxRules = parser.parseFromString(resTaxRules.data, 'application/xml');
        const taxRules = xmlTaxRules.getElementsByTagName('tax_rule');
        if (taxRules.length > 0) {
          const idTax = taxRules[0].getElementsByTagName('id_tax')[0]?.textContent?.trim();
          if (idTax) {
            const resTax = await api.get(`/taxes/${idTax}?display=[rate]`);
            const xmlTax = parser.parseFromString(resTax.data, 'application/xml');
            const rate = xmlTax.getElementsByTagName('rate')[0]?.textContent?.trim();
            if (rate) tauxTaxe = parseFloat(rate);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Taux de taxe par défaut: ${tauxTaxe}%`);
    }
    let priceImpact = '0.000000';
    if (prixTtcDeclinaison && prixTtcDeclinaison !== '') {
      const prixTtcFloat = parseFloat(prixTtcDeclinaison.toString().replace(',', '.'));
      if (!isNaN(prixTtcFloat) && prixTtcFloat > 0) {
        const prixHtDeclinaison = prixTtcFloat / (1 + tauxTaxe / 100);
        const impact = prixHtDeclinaison - prixBaseHt;
        priceImpact = parseFloat(impact.toFixed(6)).toFixed(6);
        if (Math.abs(parseFloat(priceImpact)) < 0.000001) priceImpact = '0.000000';
      }
    }
    const xmlCombination = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <combination>\n    <id_product><![CDATA[${idProduct}]]></id_product>\n    <reference><![CDATA[${reference}_${idAttribute}]]></reference>\n    <price><![CDATA[${priceImpact}]]></price>\n    <default_on><![CDATA[0]]></default_on>\n    <minimal_quantity><![CDATA[1]]></minimal_quantity>\n    <associations>\n      <product_option_values>\n        <product_option_value><id><![CDATA[${idAttribute}]]></id></product_option_value>\n      </product_option_values>\n    </associations>\n  </combination>\n</prestashop>`;
    const response = await api.post('/combinations', xmlCombination, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    if (response.status !== 200 && response.status !== 201) throw new Error(`Erreur API: ${response.status}`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    let newId = null;
    const combinations = xmlDoc.getElementsByTagName('combination');
    if (combinations.length > 0) newId = combinations[0].getElementsByTagName('id')[0]?.textContent?.trim();
    if (!newId) {
      const allIds = xmlDoc.getElementsByTagName('id');
      if (allIds.length > 0) newId = allIds[0].textContent?.trim();
    }
    if (!newId) throw new Error('ID non trouvé dans la réponse');
    registreRollback.push({ type: 'combination', id: newId });
    return newId;
  } catch (error) {
    console.error('❌ Échec création combinaison:', error);
    throw error;
  }
};

// export const mettreAJourStock = async (idProduct, idProductAttribute, quantite) => {
//   const filterAttr = idProductAttribute ? `&filter[id_product_attribute]=${idProductAttribute}` : '';
//   const res = await api.get(`/stock_availables?filter[id_product]=${idProduct}${filterAttr}&display=full`);
//   const parser = new DOMParser();
//   const xmlDoc = parser.parseFromString(res.data, 'application/xml');
//   const stocks = xmlDoc.getElementsByTagName('stock_available');
//   if (stocks.length === 0) throw new Error(`Stock non trouvé pour produit ${idProduct}`);

//   const stockEl = stocks[0];
//   const idStockAvailable = stockEl.getElementsByTagName('id')[0]?.textContent?.trim();
//   const oldQuantity = parseInt(stockEl.getElementsByTagName('quantity')[0]?.textContent?.trim() || '0', 10);

//   await updateResource('stock_availables', idStockAvailable, { quantity: String(quantite) });
//   await patcherDateStock(idStockAvailable, idProduct);
//   // Enregistrer un mouvement de stock via le store
//   try {
//     const stockStore = useStockStore();

//     const stock = {
//       id: idStockAvailable,
//       id_product: String(idProduct),
//       id_product_attribute: String(idProductAttribute || '0'),
//       quantity: oldQuantity,
//       price_te: 0
//     };

//     await stockStore.createStockMovement({
//       stock,
//       oldQuantity,
//       newQuantity: Number(quantite),
//       employeeId: 1
//     });
//   } catch (e) {
//     console.warn('⚠️ Impossible d\'enregistrer le mouvement de stock :', e);
//   }
// };

export const mettreAJourStock = async (idProduct, idProductAttribute, quantite) => {
  const filterAttr = idProductAttribute ? `&filter[id_product_attribute]=${idProductAttribute}` : '';
  const res = await api.get(`/stock_availables?filter[id_product]=${idProduct}${filterAttr}&display=full`);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, 'application/xml');
  const stocks = xmlDoc.getElementsByTagName('stock_available');
  if (stocks.length === 0) throw new Error(`Stock non trouvé pour produit ${idProduct}`);

  const stockEl = stocks[0];
  const idStockAvailable = stockEl.getElementsByTagName('id')[0]?.textContent?.trim();
  const oldQuantity = parseInt(stockEl.getElementsByTagName('quantity')[0]?.textContent?.trim() || '0', 10);

  await updateResource('stock_availables', idStockAvailable, { quantity: String(quantite) });
  try {
    const stockStore = useStockStore();

    const stock = {
      id: idStockAvailable,
      id_product: String(idProduct),
      id_product_attribute: String(idProductAttribute || '0'),
      quantity: oldQuantity,
      price_te: 0
    };

    // createStockMovement retourne le mouvement créé avec son propre ID
    const mouvement = await stockStore.createStockMovement({
      stock,
      oldQuantity,
      newQuantity: Number(quantite),
      employeeId: 1
    });
    await patcherDateStock(idProduct, idProductAttribute, id);
    // // ✅ On patche la date du mouvement avec l'ID retourné par createStockMovement
    // if (mouvement?.id) {
    //   await patcherDateStock(idProduct,id_product_attribute);
    // }

  } catch (e) {
    console.warn('⚠️ Impossible d\'enregistrer le mouvement de stock :', e);
  }
};

/**
 * Lance l'importation des déclinaisons.
 * @param {Object[]} declinaisonsTraitees
 * @param {Function} [onProgress]
 * @returns {{ success: boolean, message: string }}
 */
export const importerDeclinaisons = async (declinaisonsTraitees, onProgress) => {
  const registreRollback = [];
  let transactionEnEchec = false;

  for (let decl of declinaisonsTraitees) {
    if (transactionEnEchec) {
      decl.status = 'rolled_back';
      continue;
    }
    try {
      const idProduct = await obtenirIdProduit(decl.reference);
      decl.id_product = idProduct;

      if (decl.specificite && decl.karazany && decl.specificite !== '' && decl.karazany !== '') {
        const idGroupe = await obtenirOuCreerGroupeAttribut(decl.specificite, registreRollback);
        decl.id_groupe = idGroupe;
        const idValeur = await obtenirOuCreerValeurAttribut(idGroupe, decl.karazany, registreRollback);
        decl.id_valeur = idValeur;
        const idCombination = await creerCombinaison(idProduct, idValeur, decl.reference, decl.prix_vente_ttc, registreRollback);
        decl.id_product_attribute = idCombination;
        await mettreAJourStock(idProduct, idCombination, decl.stock_initial);
        decl.status = 'success';
      } else {
        await mettreAJourStock(idProduct, 0, decl.stock_initial);
        decl.id_product_attribute = 0;
        decl.status = 'success_simple';
      }
    } catch (err) {
      transactionEnEchec = true;
      decl.status = 'error';
      decl.erreur = err.message;
      console.error(`❌ Erreur pour ${decl.reference}:`, err);
    }
    if (onProgress) onProgress(decl);
  }

  if (transactionEnEchec) {
    const endpoints = { combination: 'combinations', product_option_value: 'product_option_values', product_option: 'product_options' };
    for (let i = registreRollback.length - 1; i >= 0; i--) {
      const item = registreRollback[i];
      try { await api.delete(`/${endpoints[item.type]}/${item.id}`); } catch (err) { console.warn(`⚠️ Rollback ${item.type} ${item.id}:`, err); }
    }
    return { success: false, message: 'Transaction annulée.' };
  }
  return { success: true, message: '✅ Importation des déclinaisons réussie !' };
};
