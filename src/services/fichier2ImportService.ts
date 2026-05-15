import api from '../api/api';
import { parseFlexiblePrice } from './csvParserUtils';
import { resetAllData } from './resetService';

export interface ImportLog {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ImportResult {
  logs: ImportLog[];
  successCount: number;
  errorCount: number;
}

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };
const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const xtext = (node: Element | Document, tag: string) => node.querySelector(tag)?.textContent?.trim() || '';

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
function col(row: Record<string, any>, ...keys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const kNorm = k.toLowerCase().trim();
    const val0 = row[k];
    if (val0 !== undefined && val0 !== null && String(val0).trim() !== '') return String(val0).trim();
    const matchKey = rowKeys.find(rk => rk.toLowerCase().trim() === kNorm);
    if (matchKey) {
      const val = row[matchKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
    }
  }
  return '';
}

function tryExtractId(data: any, entityName: string): number {
  if (!data) return 0;
  if (typeof data === 'object') {
    const entity = data[entityName];
    if (entity?.id) return parseInt(String(entity.id));
  }
  if (typeof data === 'string') {
    const m = data.match(/\bid="(\d+)"/)
           || data.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/)
           || data.match(/<id>(\d+)<\/id>/);
    if (m) return parseInt(m[1]);
  }
  return 0;
}

async function postEntity(url: string, xml: string, entityName: string): Promise<number> {
  const res = await api.post(url, xml, { headers: XML_HEADERS, validateStatus: () => true });
  const id = tryExtractId(res.data, entityName);
  if (id > 0) return id;
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  throw new Error(body.slice(0, 300));
}

// ---------------------------------------------------------------------------
// Produit
// ---------------------------------------------------------------------------
async function findProductByRef(reference: string): Promise<{ id: number; price: number; idTaxGroup: number } | null> {
  const listRes = await api.get(
    `/products?filter[reference]=${encodeURIComponent(reference)}&output_format=XML&display=[id]`,
    { validateStatus: () => true }
  );
  const productEl = parseXml(listRes.data).querySelector('product');
  if (!productEl) return null;
  const id = parseInt(xtext(productEl, 'id'));
  if (!id) return null;

  const detailRes = await api.get(`/products/${id}?output_format=XML`, { validateStatus: () => true });
  const p = parseXml(detailRes.data).querySelector('product');
  if (!p) return null;
  return { id, price: parseFloat(xtext(p, 'price')) || 0, idTaxGroup: parseInt(xtext(p, 'id_tax_rules_group')) || 0 };
}

async function getTaxRate(idTaxGroup: number): Promise<number> {
  if (!idTaxGroup) return 0;
  const r = await api.get(
    `/tax_rules?filter[id_tax_rules_group]=${idTaxGroup}&output_format=XML&display=[id,id_tax]`,
    { validateStatus: () => true }
  );
  const ruleEl = parseXml(r.data).querySelector('tax_rule');
  if (!ruleEl) return 0;
  const idTax = parseInt(xtext(ruleEl, 'id_tax'));
  if (!idTax) return 0;
  const t = await api.get(`/taxes/${idTax}?output_format=XML`, { validateStatus: () => true });
  return parseFloat(xtext(parseXml(t.data), 'rate')) || 0;
}

// ---------------------------------------------------------------------------
// Groupes d'attributs
// ---------------------------------------------------------------------------
async function loadAttrGroups(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const res = await api.get('/product_options?display=full&output_format=XML', { validateStatus: () => true });
  parseXml(res.data).querySelectorAll('product_option').forEach(el => {
    const id = parseInt(xtext(el, 'id'));
    const name = el.querySelector('name language')?.textContent?.trim() || '';
    if (name && id) map.set(name.toLowerCase(), id);
  });
  return map;
}

function xmlAttrGroup(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option>
    <group_type><![CDATA[select]]></group_type>
    <is_color_group><![CDATA[0]]></is_color_group>
    <name><language id="1"><![CDATA[${name}]]></language></name>
    <public_name><language id="1"><![CDATA[${name}]]></language></public_name>
  </product_option>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Valeurs d'attributs
// ---------------------------------------------------------------------------
async function loadAttrValues(idGroup: number): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const res = await api.get(
    `/product_option_values?filter[id_attribute_group]=${idGroup}&display=full&output_format=XML`,
    { validateStatus: () => true }
  );
  parseXml(res.data).querySelectorAll('product_option_value').forEach(el => {
    const id = parseInt(xtext(el, 'id'));
    const name = el.querySelector('name language')?.textContent?.trim() || '';
    if (name && id) map.set(name.toLowerCase(), id);
  });
  return map;
}

function xmlAttrValue(name: string, idGroup: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option_value>
    <id_attribute_group><![CDATA[${idGroup}]]></id_attribute_group>
    <name><language id="1"><![CDATA[${name}]]></language></name>
    <position><![CDATA[0]]></position>
  </product_option_value>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Combinaisons
// ---------------------------------------------------------------------------
async function loadCombinations(idProduct: number): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  const res = await api.get(
    `/combinations?filter[id_product]=${idProduct}&display=full&output_format=XML`,
    { validateStatus: () => true }
  );
  parseXml(res.data).querySelectorAll('combination').forEach(el => {
    const comboId = parseInt(xtext(el, 'id'));
    const valIdEl = el.querySelector('product_option_values product_option_value id');
    if (valIdEl) {
      const valId = parseInt(valIdEl.textContent?.trim() || '0');
      if (valId && comboId) map.set(valId, comboId);
    }
  });
  return map;
}

function xmlCombination(idProduct: number, reference: string, karazany: string, idAttrValue: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <combination>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <reference><![CDATA[${reference}-${karazany}]]></reference>
    <price><![CDATA[0]]></price>
    <minimal_quantity><![CDATA[1]]></minimal_quantity>
    <quantity><![CDATA[0]]></quantity>
    <associations>
      <product_option_values>
        <product_option_value><id><![CDATA[${idAttrValue}]]></id></product_option_value>
      </product_option_values>
    </associations>
  </combination>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Stock available
// ---------------------------------------------------------------------------
async function getStockAvailableId(idProduct: number, idProductAttribute: number): Promise<number> {
  const res = await api.get(
    `/stock_availables?filter[id_product]=[${idProduct}]&filter[id_product_attribute]=[${idProductAttribute}]&output_format=XML`,
    { validateStatus: () => true }
  );
  const el = parseXml(res.data).querySelector('stock_available');
  return el ? parseInt(xtext(el, 'id')) : 0;
}

async function updateStock(id: number, idProduct: number, idProductAttribute: number, qty: number): Promise<void> {
  const getRes = await api.get(`/stock_availables/${id}?output_format=XML`, { validateStatus: () => true });
  const sa = parseXml(getRes.data).querySelector('stock_available');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id><![CDATA[${id}]]></id>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute}]]></id_product_attribute>
    <id_shop><![CDATA[${sa ? xtext(sa, 'id_shop') || '1' : '1'}]]></id_shop>
    <id_shop_group><![CDATA[${sa ? xtext(sa, 'id_shop_group') || '0' : '0'}]]></id_shop_group>
    <quantity><![CDATA[${qty}]]></quantity>
    <depends_on_stock><![CDATA[${sa ? xtext(sa, 'depends_on_stock') || '0' : '0'}]]></depends_on_stock>
    <out_of_stock><![CDATA[${sa ? xtext(sa, 'out_of_stock') || '2' : '2'}]]></out_of_stock>
    <location><![CDATA[${sa ? xtext(sa, 'location') || '' : ''}]]></location>
  </stock_available>
</prestashop>`;
  await api.put(`/stock_availables/${id}?output_format=XML`, xml, { headers: XML_HEADERS, validateStatus: () => true });
}

// ---------------------------------------------------------------------------
// Prix spécifique
// ---------------------------------------------------------------------------
function xmlSpecificPrice(idProduct: number, idProductAttribute: number, priceHT: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <specific_price>
    <id_shop><![CDATA[1]]></id_shop>
    <id_currency><![CDATA[0]]></id_currency>
    <id_country><![CDATA[0]]></id_country>
    <id_group><![CDATA[0]]></id_group>
    <id_customer><![CDATA[0]]></id_customer>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute}]]></id_product_attribute>
    <price><![CDATA[${priceHT.toFixed(6)}]]></price>
    <from_quantity><![CDATA[1]]></from_quantity>
    <reduction><![CDATA[0]]></reduction>
    <reduction_tax><![CDATA[1]]></reduction_tax>
    <reduction_type><![CDATA[amount]]></reduction_type>
    <from><![CDATA[0000-00-00 00:00:00]]></from>
    <to><![CDATA[0000-00-00 00:00:00]]></to>
  </specific_price>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Orchestrateur principal
// ---------------------------------------------------------------------------
export async function importFichier2(
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

  log('info', `Début de l'import fichier2 — ${rows.length} ligne(s) détectée(s)`);
  if (rows.length > 0) log('info', `Colonnes : ${Object.keys(rows[0]).join(' | ')}`);

  log('info', 'Chargement des groupes d\'attributs existants…');
  const attrGroupMap = await loadAttrGroups();
  const attrValueCache = new Map<number, Map<string, number>>();
  const comboCache = new Map<number, Map<number, number>>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const ref        = col(row, 'reference', 'Reference', 'ref');
    const specificite = col(row, 'specificite', 'Specificite', 'attribut', 'groupe');
    const karazany   = col(row, 'karazany', 'Karazany', 'valeur', 'value');
    const stockRaw   = col(row, 'stock_initial', 'stock', 'Stock', 'quantite', 'qty');
    const priceRaw   = col(row, 'prix_vente_ttc', 'prix_vente', 'prix', 'price');

    if (!ref) {
      log('error', `Ligne ${rowNum} : référence manquante — ignorée`);
      errorCount++;
      continue;
    }

    const stock    = parseInt(stockRaw) || 0;
    const priceTTC = priceRaw ? parseFlexiblePrice(priceRaw) : null;
    const label    = karazany ? `"${ref}" (${karazany})` : `"${ref}"`;

    try {
      // ── 1. Trouver le produit ──
      const product = await findProductByRef(ref);
      if (!product) {
        log('error', `Ligne ${rowNum} : référence "${ref}" introuvable dans PrestaShop — ignorée`);
        errorCount++;
        continue;
      }

      let idProductAttribute = 0;

      if (specificite && karazany) {
        // ── 2. Groupe d'attribut ──
        let idGroup = attrGroupMap.get(specificite.toLowerCase());
        if (!idGroup) {
          idGroup = await postEntity('/product_options?output_format=XML', xmlAttrGroup(specificite), 'product_option');
          attrGroupMap.set(specificite.toLowerCase(), idGroup);
          log('success', `Groupe d'attribut "${specificite}" créé → ID ${idGroup}`);
        }

        // ── 3. Valeur d'attribut ──
        if (!attrValueCache.has(idGroup)) {
          attrValueCache.set(idGroup, await loadAttrValues(idGroup));
        }
        const valueMap = attrValueCache.get(idGroup)!;
        let idAttrValue = valueMap.get(karazany.toLowerCase());
        if (!idAttrValue) {
          idAttrValue = await postEntity(
            '/product_option_values?output_format=XML',
            xmlAttrValue(karazany, idGroup),
            'product_option_value'
          );
          valueMap.set(karazany.toLowerCase(), idAttrValue);
          log('success', `Valeur d'attribut "${karazany}" (groupe "${specificite}") → ID ${idAttrValue}`);
        }

        // ── 4. Combinaison ──
        if (!comboCache.has(product.id)) {
          comboCache.set(product.id, await loadCombinations(product.id));
        }
        const combMap = comboCache.get(product.id)!;
        let idCombo = combMap.get(idAttrValue);
        if (!idCombo) {
          idCombo = await postEntity(
            '/combinations?output_format=XML',
            xmlCombination(product.id, ref, karazany, idAttrValue),
            'combination'
          );
          combMap.set(idAttrValue, idCombo);
          log('success', `Combinaison "${ref} - ${karazany}" → ID ${idCombo}`);
        }

        idProductAttribute = idCombo;
      }

      // ── 5. Mise à jour du stock ──
      const stockId = await getStockAvailableId(product.id, idProductAttribute);
      if (!stockId) {
        log('warning', `${label} : stock_available introuvable — stock non mis à jour`);
      } else {
        await updateStock(stockId, product.id, idProductAttribute, stock);
        log('success', `${label} : stock → ${stock} unité(s)`);
      }

      // ── 6. Prix spécifique ──
      if (priceTTC && priceTTC > 0) {
        const taxRate = await getTaxRate(product.idTaxGroup);
        const priceHT = taxRate > 0 ? priceTTC / (1 + taxRate / 100) : priceTTC;
        await api.post(
          '/specific_prices?output_format=XML',
          xmlSpecificPrice(product.id, idProductAttribute, priceHT),
          { headers: XML_HEADERS, validateStatus: () => true }
        );
        log('success', `${label} : prix spécifique → ${priceTTC} TTC (${priceHT.toFixed(4)} HT)`);
      } else {
        log('info', `${label} : pas de prix_vente_ttc → prix de base conservé`);
      }

      successCount++;
    } catch (err: any) {
      log('error', `Ligne ${rowNum} ${label} : ${err.message || 'Erreur inconnue'} — import annulé`);
      await resetAllData((msg) => log('warning', msg));
      return { logs, successCount: 0, errorCount: 1 };
    }
  }

  log(
    errorCount === 0 ? 'success' : 'warning',
    `Import fichier2 terminé — ${successCount} ligne(s) traitée(s), ${errorCount} erreur(s)`
  );

  return { logs, successCount, errorCount };
}
