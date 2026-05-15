import api from '../api/api';
import { parseFlexibleDate, parseFlexiblePrice } from './csvParserUtils';
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
// Parsing de la colonne achat
// ---------------------------------------------------------------------------
export interface AchatItem {
  ref: string;
  qty: number;
  karazany: string;
}

export function parseAchat(raw: string): AchatItem[] {
  const items: AchatItem[] = [];
  const regex = /\(\s*"?([^";)\s][^";)]*?)"?\s*;\s*(\d+)\s*;\s*"?([^";)]*?)"?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    items.push({ ref: m[1].trim(), qty: parseInt(m[2]) || 1, karazany: m[3].trim() });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Pays
// ---------------------------------------------------------------------------
let cachedCountryId: number | null = null;

async function getCountryId(): Promise<number> {
  if (cachedCountryId !== null) return cachedCountryId;
  const mgRes = await api.get('/countries?filter[iso_code]=MG&output_format=XML&display=[id]', { validateStatus: () => true });
  const mgEl = parseXml(mgRes.data).querySelector('country');
  if (mgEl) { cachedCountryId = parseInt(xtext(mgEl, 'id')); return cachedCountryId; }

  const frRes = await api.get('/countries?filter[iso_code]=FR&output_format=XML&display=[id]', { validateStatus: () => true });
  const frEl = parseXml(frRes.data).querySelector('country');
  if (frEl) { cachedCountryId = parseInt(xtext(frEl, 'id')); return cachedCountryId; }

  const allRes = await api.get('/countries?filter[active]=1&output_format=XML&display=[id]', { validateStatus: () => true });
  const allEl = parseXml(allRes.data).querySelector('country');
  cachedCountryId = allEl ? parseInt(xtext(allEl, 'id')) : 8;
  return cachedCountryId;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
async function findCustomerByEmail(email: string): Promise<number> {
  const res = await api.get(
    `/customers?filter[email]=${encodeURIComponent(email)}&output_format=XML&display=[id]`,
    { validateStatus: () => true }
  );
  const el = parseXml(res.data).querySelector('customer');
  return el ? parseInt(xtext(el, 'id')) : 0;
}

function splitNom(nom: string): { firstname: string; lastname: string } {
  const parts = nom.trim().split(/\s+/);
  if (parts.length >= 2) return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
  return { firstname: 'Client', lastname: nom.trim() || 'Inconnu' };
}

function xmlCustomer(firstname: string, lastname: string, email: string, pwd: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer>
    <id_gender><![CDATA[0]]></id_gender>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <email><![CDATA[${email}]]></email>
    <passwd><![CDATA[${pwd}]]></passwd>
    <active><![CDATA[1]]></active>
    <newsletter><![CDATA[0]]></newsletter>
    <optin><![CDATA[0]]></optin>
  </customer>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Adresse
// ---------------------------------------------------------------------------
async function createAddress(idCustomer: number, adresse: string, firstname: string, lastname: string): Promise<number> {
  const idCountry = await getCountryId();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_country><![CDATA[${idCountry}]]></id_country>
    <alias><![CDATA[Domicile]]></alias>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <address1><![CDATA[${adresse}]]></address1>
    <city><![CDATA[${adresse}]]></city>
    <postcode><![CDATA[00000]]></postcode>
  </address>
</prestashop>`;
  return postEntity('/addresses?output_format=XML', xml, 'address');
}

// ---------------------------------------------------------------------------
// Produit + prix effectif
// ---------------------------------------------------------------------------
interface ProductInfo {
  id: number;
  name: string;
  priceHT: number;
  idTaxGroup: number;
}

async function findProductByRef(reference: string): Promise<ProductInfo | null> {
  const listRes = await api.get(
    `/products?filter[reference]=${encodeURIComponent(reference)}&output_format=XML&display=[id]`,
    { validateStatus: () => true }
  );
  const listEl = parseXml(listRes.data).querySelector('product');
  if (!listEl) return null;
  const id = parseInt(xtext(listEl, 'id'));
  if (!id) return null;

  const detailRes = await api.get(`/products/${id}?output_format=XML`, { validateStatus: () => true });
  const p = parseXml(detailRes.data).querySelector('product');
  if (!p) return null;
  const name = p.querySelector('name language')?.textContent?.trim() || reference;
  return { id, name, priceHT: parseFloat(xtext(p, 'price')) || 0, idTaxGroup: parseInt(xtext(p, 'id_tax_rules_group')) || 0 };
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

async function findCombinationId(idProduct: number, karazany: string): Promise<number> {
  if (!karazany) return 0;
  const res = await api.get(
    `/combinations?filter[id_product]=${idProduct}&display=full&output_format=XML`,
    { validateStatus: () => true }
  );
  const combos = Array.from(parseXml(res.data).querySelectorAll('combination'));
  for (const c of combos) {
    const valIds = Array.from(c.querySelectorAll('product_option_values product_option_value id'));
    for (const v of valIds) {
      const vid = v.textContent?.trim() || '';
      if (!vid) continue;
      const vRes = await api.get(`/product_option_values/${vid}?output_format=XML`, { validateStatus: () => true });
      const name = parseXml(vRes.data).querySelector('product_option_value name language')?.textContent?.trim() || '';
      if (name.toLowerCase() === karazany.toLowerCase()) return parseInt(xtext(c, 'id'));
    }
  }
  return 0;
}

async function getEffectivePrice(idProduct: number, idProductAttribute: number, idTaxGroup: number): Promise<{ ht: number; ttc: number }> {
  const spRes = await api.get(
    `/specific_prices?filter[id_product]=${idProduct}&filter[id_product_attribute]=${idProductAttribute}&output_format=XML`,
    { validateStatus: () => true }
  );
  const spEl = parseXml(spRes.data).querySelector('specific_price');
  if (spEl) {
    const ht = parseFloat(xtext(spEl, 'price')) || 0;
    if (ht > 0) {
      const rate = await getTaxRate(idTaxGroup);
      return { ht, ttc: ht * (1 + rate / 100) };
    }
  }
  const detailRes = await api.get(`/products/${idProduct}?output_format=XML`, { validateStatus: () => true });
  const ht = parseFloat(xtext(parseXml(detailRes.data), 'price')) || 0;
  const rate = await getTaxRate(idTaxGroup);
  return { ht, ttc: ht * (1 + rate / 100) };
}

// ---------------------------------------------------------------------------
// Transporteur par défaut
// ---------------------------------------------------------------------------
let cachedCarrierId: number | null = null;

async function getDefaultCarrierId(): Promise<number> {
  if (cachedCarrierId !== null) return cachedCarrierId;
  const res = await api.get('/carriers?filter[active]=1&display=full&output_format=XML', { validateStatus: () => true });
  const el = parseXml(res.data).querySelector('carrier');
  if (el) {
    cachedCarrierId = parseInt(xtext(el, 'id'));
    return cachedCarrierId;
  }
  cachedCarrierId = 1;
  return cachedCarrierId;
}

// ---------------------------------------------------------------------------
// États de commande
// ---------------------------------------------------------------------------
let cachedOrderStates: Array<{ id: number; name: string }> | null = null;

async function loadOrderStates(): Promise<Array<{ id: number; name: string }>> {
  if (cachedOrderStates) return cachedOrderStates;
  const res = await api.get('/order_states?display=full&output_format=XML', { validateStatus: () => true });
  cachedOrderStates = Array.from(parseXml(res.data).querySelectorAll('order_state')).map(s => ({
    id: parseInt(xtext(s, 'id')),
    name: s.querySelector('name language')?.textContent?.trim() || '',
  }));
  return cachedOrderStates;
}

async function findOrderStateId(etat: string): Promise<number> {
  if (!etat) return 0;
  const states = await loadOrderStates();
  const norm = etat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  let found = states.find(s =>
    s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === norm
  );
  if (found) return found.id;

  found = states.find(s => {
    const sNorm = s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sNorm.includes(norm) || norm.includes(sNorm);
  });
  if (found) return found.id;

  if (norm.includes('accept') || norm.includes('pay')) return states.find(s => s.name.toLowerCase().includes('accept'))?.id ?? 2;
  if (norm.includes('erreur') || norm.includes('error')) return states.find(s => s.name.toLowerCase().includes('err'))?.id ?? 8;
  if (norm.includes('attente') || norm.includes('wait')) return states.find(s => s.name.toLowerCase().includes('attente'))?.id ?? 1;

  return 1;
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
async function decreaseStock(idProduct: number, idProductAttribute: number, qty: number, log: (msg: string) => void): Promise<void> {
  const res = await api.get(
    `/stock_availables?filter[id_product]=[${idProduct}]&filter[id_product_attribute]=[${idProductAttribute}]&display=full&output_format=XML`,
    { validateStatus: () => true }
  );
  const el = parseXml(res.data).querySelector('stock_available');
  if (!el) {
    log(`Stock introuvable pour produit ID ${idProduct} (attr ${idProductAttribute})`);
    return;
  }
  const stockId = parseInt(xtext(el, 'id'));
  const currentQty = parseInt(xtext(el, 'quantity')) || 0;
  const newQty = Math.max(0, currentQty - qty);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id><![CDATA[${stockId}]]></id>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute}]]></id_product_attribute>
    <id_shop><![CDATA[${xtext(el, 'id_shop') || '1'}]]></id_shop>
    <id_shop_group><![CDATA[${xtext(el, 'id_shop_group') || '0'}]]></id_shop_group>
    <quantity><![CDATA[${newQty}]]></quantity>
    <depends_on_stock><![CDATA[${xtext(el, 'depends_on_stock') || '0'}]]></depends_on_stock>
    <out_of_stock><![CDATA[${xtext(el, 'out_of_stock') || '2'}]]></out_of_stock>
    <location><![CDATA[${xtext(el, 'location') || ''}]]></location>
  </stock_available>
</prestashop>`;
  await api.put(`/stock_availables/${stockId}?output_format=XML`, xml, { headers: XML_HEADERS, validateStatus: () => true });
  log(`Stock produit ID ${idProduct}${idProductAttribute ? ` (combo ${idProductAttribute})` : ''} : ${currentQty} → ${newQty}`);
}

// ---------------------------------------------------------------------------
// Paiement
// ---------------------------------------------------------------------------
async function createOrderPayment(orderId: number, amount: number, dateAdd: string): Promise<void> {
  const orderRes = await api.get(`/orders/${orderId}?output_format=XML`, { validateStatus: () => true });
  const reference = xtext(parseXml(orderRes.data), 'reference');
  if (!reference) return;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_payment>
    <order_reference><![CDATA[${reference}]]></order_reference>
    <id_currency><![CDATA[1]]></id_currency>
    <amount><![CDATA[${amount.toFixed(6)}]]></amount>
    <payment_method><![CDATA[Paiement à la livraison]]></payment_method>
    <conversion_rate><![CDATA[1.000000]]></conversion_rate>
    <date_add><![CDATA[${dateAdd} 00:00:00]]></date_add>
  </order_payment>
</prestashop>`;
  await api.post('/order_payments?output_format=XML', xml, { headers: XML_HEADERS, validateStatus: () => true });
}

// ---------------------------------------------------------------------------
// Panier
// ---------------------------------------------------------------------------
interface CartRow {
  idProduct: number;
  idProductAttribute: number;
  qty: number;
  idAddress: number;
}

function xmlCart(idCustomer: number, idAddress: number, dateAdd: string, rows: CartRow[]): string {
  const rowsXml = rows.map(r => `
        <cart_row>
          <id_product><![CDATA[${r.idProduct}]]></id_product>
          <id_product_attribute><![CDATA[${r.idProductAttribute}]]></id_product_attribute>
          <id_address_delivery><![CDATA[${r.idAddress}]]></id_address_delivery>
          <quantity><![CDATA[${r.qty}]]></quantity>
        </cart_row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency><![CDATA[1]]></id_currency>
    <id_lang><![CDATA[1]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_address_delivery><![CDATA[${idAddress}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddress}]]></id_address_invoice>
    <date_add><![CDATA[${dateAdd}]]></date_add>
    <associations>
      <cart_rows>${rowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`;
}

// ---------------------------------------------------------------------------
// Commande
// ---------------------------------------------------------------------------
interface OrderLine {
  idProduct: number;
  idProductAttribute: number;
  name: string;
  qty: number;
  priceHT: number;
  priceTTC: number;
}

function xmlOrder(
  idCustomer: number,
  idAddress: number,
  idCart: number,
  idCarrier: number,
  stateId: number,
  dateAdd: string,
  lines: OrderLine[]
): string {
  const totalHT  = lines.reduce((s, l) => s + l.priceHT  * l.qty, 0);
  const totalTTC = lines.reduce((s, l) => s + l.priceTTC * l.qty, 0);

  const rowsXml = lines.map(l => `
        <order_row>
          <id_product><![CDATA[${l.idProduct}]]></id_product>
          <id_product_attribute><![CDATA[${l.idProductAttribute}]]></id_product_attribute>
          <product_name><![CDATA[${l.name}]]></product_name>
          <product_quantity><![CDATA[${l.qty}]]></product_quantity>
          <product_price><![CDATA[${l.priceHT.toFixed(6)}]]></product_price>
          <unit_price_tax_incl><![CDATA[${l.priceTTC.toFixed(6)}]]></unit_price_tax_incl>
          <unit_price_tax_excl><![CDATA[${l.priceHT.toFixed(6)}]]></unit_price_tax_excl>
        </order_row>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery><![CDATA[${idAddress}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddress}]]></id_address_invoice>
    <id_cart><![CDATA[${idCart}]]></id_cart>
    <id_currency><![CDATA[1]]></id_currency>
    <id_lang><![CDATA[1]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[${idCarrier}]]></id_carrier>
    <current_state><![CDATA[${stateId}]]></current_state>
    <payment><![CDATA[Paiement à la livraison]]></payment>
    <module><![CDATA[ps_cashondelivery]]></module>
    <conversion_rate><![CDATA[1.000000]]></conversion_rate>
    <date_add><![CDATA[${dateAdd} 00:00:00]]></date_add>
    <total_discounts><![CDATA[0.000000]]></total_discounts>
    <total_discounts_tax_incl><![CDATA[0.000000]]></total_discounts_tax_incl>
    <total_discounts_tax_excl><![CDATA[0.000000]]></total_discounts_tax_excl>
    <total_paid><![CDATA[${totalTTC.toFixed(6)}]]></total_paid>
    <total_paid_tax_incl><![CDATA[${totalTTC.toFixed(6)}]]></total_paid_tax_incl>
    <total_paid_tax_excl><![CDATA[${totalHT.toFixed(6)}]]></total_paid_tax_excl>
    <total_paid_real><![CDATA[${totalTTC.toFixed(6)}]]></total_paid_real>
    <total_products><![CDATA[${totalHT.toFixed(6)}]]></total_products>
    <total_products_wt><![CDATA[${totalTTC.toFixed(6)}]]></total_products_wt>
    <total_shipping><![CDATA[0.000000]]></total_shipping>
    <total_shipping_tax_incl><![CDATA[0.000000]]></total_shipping_tax_incl>
    <total_shipping_tax_excl><![CDATA[0.000000]]></total_shipping_tax_excl>
    <total_wrapping><![CDATA[0.000000]]></total_wrapping>
    <total_wrapping_tax_incl><![CDATA[0.000000]]></total_wrapping_tax_incl>
    <total_wrapping_tax_excl><![CDATA[0.000000]]></total_wrapping_tax_excl>
    <associations>
      <order_rows>${rowsXml}
      </order_rows>
    </associations>
  </order>
</prestashop>`;
}

async function createOrder(
  idCustomer: number,
  idAddress: number,
  idCart: number,
  idCarrier: number,
  stateId: number,
  dateAdd: string,
  lines: OrderLine[]
): Promise<number> {
  const xml = xmlOrder(idCustomer, idAddress, idCart, idCarrier, stateId, dateAdd, lines);
  const res = await api.post('/orders?output_format=XML', xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    validateStatus: () => true,
  });

  const id = tryExtractId(res.data, 'order');
  if (id > 0) return id;

  // Warnings PHP (code 15) : hook déprécié du module gamification — la commande est créée quand même
  if (typeof res.data === 'string') {
    const errEls = Array.from(parseXml(res.data).querySelectorAll('error'));
    const onlyWarnings = errEls.length > 0 && errEls.every(e => xtext(e, 'code') === '15');
    if (onlyWarnings) {
      const findRes = await api.get(
        `/orders?filter[id_cart]=${idCart}&output_format=XML&display=[id]`,
        { validateStatus: () => true }
      );
      const orderEl = parseXml(findRes.data).querySelector('order');
      if (orderEl) return parseInt(xtext(orderEl, 'id'));
    }
  }

  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  throw new Error(body.slice(0, 300));
}

// ---------------------------------------------------------------------------
// Orchestrateur principal
// ---------------------------------------------------------------------------
export async function importFichier3(
  rows: Record<string, any>[],
  onLog: (log: ImportLog) => void
): Promise<ImportResult> {
  const logs: ImportLog[] = [];
  let successCount = 0;
  let errorCount = 0;

  cachedCountryId  = null;
  cachedOrderStates = null;
  cachedCarrierId  = null;

  function log(level: ImportLog['level'], message: string) {
    const entry: ImportLog = { level, message };
    logs.push(entry);
    onLog(entry);
  }

  log('info', `Début de l'import fichier3 — ${rows.length} ligne(s) détectée(s)`);
  if (rows.length > 0) log('info', `Colonnes : ${Object.keys(rows[0]).join(' | ')}`);

  log('info', 'Chargement des états de commande et du transporteur…');
  const states    = await loadOrderStates();
  const idCarrier = await getDefaultCarrierId();
  log('info', `${states.length} état(s) disponible(s) — transporteur par défaut ID ${idCarrier}`);

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 1;

    const dateRaw  = col(row, 'date', 'Date');
    const nom      = col(row, 'nom', 'Nom', 'name');
    const email    = col(row, 'email', 'Email');
    const pwd      = col(row, 'pwd', 'password', 'mot_de_passe', 'mdp');
    const adresse  = col(row, 'adresse', 'Adresse', 'address');
    const achatRaw = col(row, 'achat', 'Achat', 'commande');
    const etat     = col(row, 'etat', 'Etat', 'état', 'statut');

    if (!email) {
      log('error', `Ligne ${rowNum} : email manquant — ignorée`);
      errorCount++;
      continue;
    }

    const dateAdd = parseFlexibleDate(dateRaw) || new Date().toISOString().slice(0, 10);
    const { firstname, lastname } = splitNom(nom);
    const items = parseAchat(achatRaw);

    if (items.length === 0) {
      log('warning', `Ligne ${rowNum} (${email}) : colonne achat vide ou non parseable — ignorée`);
      errorCount++;
      continue;
    }

    try {
      // ── 1. Client ──
      let idCustomer = await findCustomerByEmail(email);
      if (idCustomer > 0) {
        log('info', `Ligne ${rowNum} : client "${email}" déjà existant → ID ${idCustomer}`);
      } else {
        idCustomer = await postEntity(
          '/customers?output_format=XML',
          xmlCustomer(firstname, lastname, email, pwd),
          'customer'
        );
        log('success', `Ligne ${rowNum} : client "${email}" créé → ID ${idCustomer}`);
      }

      // ── 2. Adresse ──
      const idAddress = await createAddress(idCustomer, adresse, firstname, lastname);
      log('success', `Ligne ${rowNum} : adresse "${adresse}" créée → ID ${idAddress}`);

      // ── 3. Résoudre les produits ──
      const cartRows: CartRow[]     = [];
      const orderLines: OrderLine[] = [];

      for (const item of items) {
        const product = await findProductByRef(item.ref);
        if (!product) {
          log('warning', `Ligne ${rowNum} : référence "${item.ref}" introuvable — ligne ignorée dans le panier`);
          continue;
        }

        const idProductAttribute = await findCombinationId(product.id, item.karazany);
        const { ht, ttc } = await getEffectivePrice(product.id, idProductAttribute, product.idTaxGroup);

        cartRows.push({ idProduct: product.id, idProductAttribute, qty: item.qty, idAddress });
        orderLines.push({ idProduct: product.id, idProductAttribute, name: product.name, qty: item.qty, priceHT: ht, priceTTC: ttc });
        log('info', `  → "${item.ref}"${item.karazany ? ` (${item.karazany})` : ''} × ${item.qty} — ${ttc.toFixed(2)} TTC/u`);
      }

      if (cartRows.length === 0) {
        log('error', `Ligne ${rowNum} : aucun produit valide dans le panier — ignorée`);
        errorCount++;
        log('error', `Ligne ${rowNum} : aucun produit valide — import annulé`);
        await resetAllData((msg) => log('warning', msg));
        return { logs, successCount: 0, errorCount: 1 };
      }

      // ── 4. Panier ──
      const idCart = await postEntity(
        '/carts?output_format=XML',
        xmlCart(idCustomer, idAddress, dateAdd, cartRows),
        'cart'
      );
      rollbackCartId = idCart;
      log('success', `Ligne ${rowNum} : panier créé → ID ${idCart}`);

      // ── 5. Commande ou panier uniquement ──
      if (!etat) {
        log('info', `Ligne ${rowNum} (${email}) : état vide → panier conservé sans commande`);
      } else {
        const stateId  = await findOrderStateId(etat);
        const totalTTC = orderLines.reduce((s, l) => s + l.priceTTC * l.qty, 0);
        const idOrder  = await createOrder(idCustomer, idAddress, idCart, idCarrier, stateId, dateAdd, orderLines);

        log('success', `Ligne ${rowNum} (${email}) : commande créée → ID ${idOrder} (état "${etat}" → ID état ${stateId})`);

        // ── 6. Décrémenter le stock ──
        for (const line of orderLines) {
          await decreaseStock(line.idProduct, line.idProductAttribute, line.qty, (msg) => log('info', `  ↓ ${msg}`));
        }

        // ── 7. Enregistrer le paiement ──
        try {
          await createOrderPayment(idOrder, totalTTC, dateAdd);
          log('success', `Ligne ${rowNum} : paiement enregistré (${totalTTC.toFixed(2)} TTC)`);
        } catch (payErr: any) {
          log('warning', `Ligne ${rowNum} : paiement non enregistré — ${payErr.message}`);
        }
      }

      successCount++;
    } catch (err: any) {
      log('error', `Ligne ${rowNum} (${email}) : ${err.message || 'Erreur inconnue'} — import annulé`);
      await resetAllData((msg) => log('warning', msg));
      return { logs, successCount: 0, errorCount: 1 };
    }
  }

  log(
    errorCount === 0 ? 'success' : 'warning',
    `Import fichier3 terminé — ${successCount} ligne(s) traitée(s), ${errorCount} erreur(s)`
  );

  return { logs, successCount, errorCount };
}
