import api from '../api/api';
import { parseFlexibleDate, parseFlexiblePrice, parseTaxRate, slugify } from './csvParserUtils';

export interface ImportLog {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ImportResult {
  logs: ImportLog[];
  successCount: number;
  errorCount: number;
}

// En-têtes pour les requêtes POST XML vers PrestaShop
const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

// ---------------------------------------------------------------------------
// Extraction de l'ID depuis les données brutes PrestaShop (JSON ou XML)
// ---------------------------------------------------------------------------
function tryExtractId(data: any, entityName: string): number {
  if (!data) return 0;

  // JSON : { category: { id: "5" } }
  if (typeof data === 'object') {
    const entity = data[entityName];
    if (entity?.id) return parseInt(String(entity.id));
  }

  // XML en chaîne : id="5" ou <id>5</id>
  if (typeof data === 'string') {
    const attrMatch = data.match(/\bid="(\d+)"/);
    if (attrMatch) return parseInt(attrMatch[1]);
    const tagMatch = data.match(/<id>(\d+)<\/id>/);
    if (tagMatch) return parseInt(tagMatch[1]);
  }

  return 0;
}

/**
 * POST vers PrestaShop en acceptant tous les codes HTTP.
 * PrestaShop retourne parfois HTTP 400/500 avec des warnings PHP même quand
 * l'entité a bien été créée (ex: langue 2 non configurée → "Undefined array key 2").
 * Si l'entité est présente dans la réponse (id > 0), on la considère comme créée.
 */
async function postEntity(url: string, xml: string, entityName: string): Promise<number> {
  const res = await api.post(url, xml, {
    headers: XML_HEADERS,
    validateStatus: () => true, // ne pas lever d'erreur Axios sur les codes non-2xx
  });

  const id = tryExtractId(res.data, entityName);
  if (id > 0) return id;

  // Aucun ID trouvé → vraie erreur
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  throw new Error(body.slice(0, 300));
}

// ---------------------------------------------------------------------------
// Constructeurs XML pour chaque entité
// ---------------------------------------------------------------------------
function xmlCategory(name: string): string {
  const slug = slugify(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <category>
    <id_parent><![CDATA[2]]></id_parent>
    <active><![CDATA[1]]></active>
    <name><language id="1"><![CDATA[${name}]]></language></name>
    <link_rewrite><language id="1"><![CDATA[${slug}]]></language></link_rewrite>
  </category>
</prestashop>`;
}

function xmlTaxRuleGroup(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax_rule_group>
    <name><![CDATA[${name}]]></name>
    <active><![CDATA[1]]></active>
  </tax_rule_group>
</prestashop>`;
}

function xmlTax(rate: number): string {
  const name = `TVA ${rate}%`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax>
    <rate><![CDATA[${rate}]]></rate>
    <active><![CDATA[1]]></active>
    <name><language id="1"><![CDATA[${name}]]></language></name>
  </tax>
</prestashop>`;
}

function xmlTaxRule(idGroup: number, idTax: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax_rule>
    <id_tax_rules_group><![CDATA[${idGroup}]]></id_tax_rules_group>
    <id_country><![CDATA[0]]></id_country>
    <id_state><![CDATA[0]]></id_state>
    <id_tax><![CDATA[${idTax}]]></id_tax>
    <behavior><![CDATA[1]]></behavior>
    <description><![CDATA[]]></description>
  </tax_rule>
</prestashop>`;
}

function xmlProduct(
  name: string,
  reference: string,
  price: number,
  wholesalePrice: number,
  idCategory: number,
  idTaxGroup: number,
  availableDate: string
): string {
  const slug = slugify(name);
  const wholesale = wholesalePrice > 0 ? `\n    <wholesale_price><![CDATA[${wholesalePrice.toFixed(6)}]]></wholesale_price>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_category_default><![CDATA[${idCategory}]]></id_category_default>
    <id_tax_rules_group><![CDATA[${idTaxGroup}]]></id_tax_rules_group>
    <reference><![CDATA[${reference}]]></reference>
    <price><![CDATA[${price.toFixed(6)}]]></price>${wholesale}
    <available_date><![CDATA[${availableDate}]]></available_date>
    <active><![CDATA[1]]></active>
    <state><![CDATA[1]]></state>
    <product_type><![CDATA[standard]]></product_type>
    <visibility><![CDATA[both]]></visibility>
    <available_for_order><![CDATA[1]]></available_for_order>
    <online_only><![CDATA[0]]></online_only>
    <minimal_quantity><![CDATA[1]]></minimal_quantity>
    <name><language id="1"><![CDATA[${name}]]></language></name>
    <link_rewrite><language id="1"><![CDATA[${slug}]]></language></link_rewrite>
    <description><language id="1"><![CDATA[]]></language></description>
    <description_short><language id="1"><![CDATA[]]></language></description_short>
    <meta_title><language id="1"><![CDATA[${name}]]></language></meta_title>
    <meta_description><language id="1"><![CDATA[]]></language></meta_description>
    <associations>
      <categories>
        <category><id><![CDATA[${idCategory}]]></id></category>
      </categories>
    </associations>
  </product>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Appels API individuels
// ---------------------------------------------------------------------------
async function createCategory(name: string): Promise<number> {
  return postEntity('/categories?output_format=JSON', xmlCategory(name), 'category');
}

async function createTaxRuleGroup(name: string): Promise<number> {
  return postEntity('/tax_rule_groups?output_format=JSON', xmlTaxRuleGroup(name), 'tax_rule_group');
}

async function createTax(rate: number): Promise<number> {
  return postEntity('/taxes?output_format=JSON', xmlTax(rate), 'tax');
}

async function createTaxRule(idGroup: number, idTax: number): Promise<void> {
  await api.post('/tax_rules?output_format=JSON', xmlTaxRule(idGroup, idTax), {
    headers: XML_HEADERS,
    validateStatus: () => true,
  });
}

async function createProduct(
  name: string,
  reference: string,
  price: number,
  wholesalePrice: number,
  idCategory: number,
  idTaxGroup: number,
  availableDate: string
): Promise<number> {
  return postEntity(
    '/products?output_format=JSON',
    xmlProduct(name, reference, price, wholesalePrice, idCategory, idTaxGroup, availableDate),
    'product'
  );
}

// ---------------------------------------------------------------------------
// Lecture robuste des colonnes
// Gère : casse différente, espaces autour du nom, BOM (﻿)
// ---------------------------------------------------------------------------
function col(row: Record<string, any>, ...keys: string[]): string {
  const rowKeys = Object.keys(row);

  for (const k of keys) {
    const kNorm = k.toLowerCase().trim();

    // 1. Correspondance exacte rapide
    const val0 = row[k];
    if (val0 !== undefined && val0 !== null && String(val0).trim() !== '') {
      return String(val0).trim();
    }

    // 2. Recherche insensible à la casse et aux espaces parmi toutes les clés
    const matchKey = rowKeys.find(rk => rk.toLowerCase().trim() === kNorm);
    if (matchKey) {
      const val = row[matchKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Orchestrateur principal
// ---------------------------------------------------------------------------
export async function importFichier1(
  rows: Record<string, any>[],
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

  function apiError(err: any): string {
    if (err.response?.data) {
      const d = err.response.data;
      if (typeof d === 'string') return d.slice(0, 200);
      return JSON.stringify(d).slice(0, 200);
    }
    return err.message || 'Erreur inconnue';
  }

  log('info', `Début de l'import — ${rows.length} ligne(s) détectée(s)`);

  // Log de diagnostic : colonnes reçues
  if (rows.length > 0) {
    log('info', `Colonnes détectées : ${Object.keys(rows[0]).join(' | ')}`);
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 1 : Catégories
  // -------------------------------------------------------------------------
  const uniqueCategories = [
    ...new Set(rows.map(r => col(r, 'categorie', 'Categorie', 'category', 'Category')).filter(Boolean)),
  ];

  log('info', `Étape 1/3 — Catégories : ${uniqueCategories.length} unique(s)`);
  const categoryMap = new Map<string, number>(); // nom → id

  for (const name of uniqueCategories) {
    try {
      const id = await createCategory(name);
      categoryMap.set(name, id);
      log('success', `Catégorie "${name}" créée → ID ${id}`);
    } catch (err: any) {
      log('error', `Catégorie "${name}" : ${apiError(err)}`);
      errorCount++;
    }
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 2 : Taxes
  // -------------------------------------------------------------------------
  const uniqueRates = [
    ...new Set(
      rows
        .map(r => parseTaxRate(col(r, 'Taxe', 'taxe', 'taux', 'TVA', 'tax')))
        .filter(r => r > 0)
    ),
  ];

  log('info', `Étape 2/3 — Taxes : ${uniqueRates.length} taux unique(s)`);
  const taxGroupMap = new Map<number, number>(); // taux → id_tax_rules_group

  for (const rate of uniqueRates) {
    const groupName = `TVA ${rate}%`;
    try {
      const groupId = await createTaxRuleGroup(groupName);
      log('success', `Groupe de taxe "${groupName}" → ID ${groupId}`);

      const taxId = await createTax(rate);
      log('success', `Taxe ${rate}% → ID ${taxId}`);

      await createTaxRule(groupId, taxId);
      log('success', `Règle de taxe liée (groupe ${groupId} ↔ taxe ${taxId})`);

      taxGroupMap.set(rate, groupId);
    } catch (err: any) {
      log('error', `Taxe ${rate}% : ${apiError(err)}`);
      errorCount++;
    }
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 3 : Produits
  // -------------------------------------------------------------------------
  log('info', `Étape 3/3 — Produits : ${rows.length} à créer`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const name = col(row, 'nom', 'Nom', 'name', 'Name');
    const reference = col(row, 'reference', 'Reference', 'ref', 'Ref');
    const priceRaw = col(row, 'prix_ttc', 'prix', 'price', 'Prix_ttc', 'Prix');
    const purchaseRaw = col(row, 'prix_achat', 'prix_achat', 'wholesale_price', 'cout', 'cost');
    const taxRaw = col(row, 'Taxe', 'taxe', 'taux', 'TVA', 'tax');
    const catName = col(row, 'categorie', 'Categorie', 'category', 'Category');
    const dateRaw = col(row, 'date_availability_produit', 'date_produit', 'date', 'Date');

    if (!name) {
      log('error', `Ligne ${rowNum} : nom manquant — ligne ignorée`);
      errorCount++;
      continue;
    }

    const priceTTC = parseFlexiblePrice(priceRaw);
    const wholesalePrice = purchaseRaw ? parseFlexiblePrice(purchaseRaw) : 0;
    const taxRate = parseTaxRate(taxRaw);
    // HT = prix_ttc × (1 − taxe/100)
    const priceHT = taxRate > 0 ? priceTTC * (1 - taxRate / 100) : priceTTC;
    const availableDate = parseFlexibleDate(dateRaw);
    const idCategory = categoryMap.get(catName) ?? 0;
    const idTaxGroup = taxGroupMap.get(taxRate) ?? 0;

    if (!idCategory && catName) {
      log('warning', `Ligne ${rowNum} ("${name}") : catégorie "${catName}" introuvable, id_category_default = 0`);
    }
    if (!idTaxGroup && taxRate > 0) {
      log('warning', `Ligne ${rowNum} ("${name}") : taux ${taxRate}% introuvable, id_tax_rules_group = 0`);
    }

    try {
      const pid = await createProduct(name, reference, priceHT, wholesalePrice, idCategory, idTaxGroup, availableDate);
      log('success', `Ligne ${rowNum} : "${name}" (réf. ${reference || '—'}, HT ${priceHT.toFixed(4)}, TTC ${priceTTC}) → ID ${pid}`);
      successCount++;
    } catch (err: any) {
      log('error', `Ligne ${rowNum} ("${name}") : ${apiError(err)}`);
      errorCount++;
    }
  }

  log(
    errorCount === 0 ? 'success' : 'warning',
    `Import terminé — ${successCount} produit(s) créé(s), ${errorCount} erreur(s)`
  );

  return { logs, successCount, errorCount };
}
