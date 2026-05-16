import api from '../api/api';
import { parseFlexibleDate, parseFlexiblePrice } from './csvParserUtils';

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
    const m = data.match(/\bid="(\d+)"/) || data.match(/<id>(\d+)<\/id>/);
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
// Format : [("T_01";3;"ngoza"),("M_03";1;"")]
// ---------------------------------------------------------------------------
export interface AchatItem {
  ref: string;
  qty: number;
  karazany: string;
}

export function parseAchat(raw: string): AchatItem[] {
  const items: AchatItem[] = [];
  // Matches (ref ; qty ; karazany) avec ou sans guillemets
  const regex = /\(\s*"?([^";)\s][^";)]*?)"?\s*;\s*(\d+)\s*;\s*"?([^";)]*?)"?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    items.push({ ref: m[1].trim(), qty: parseInt(m[2]) || 1, karazany: m[3].trim() });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Pays (récupéré une seule fois)
// ---------------------------------------------------------------------------
let cachedCountryId: number | null = null;

async function getCountryId(): Promise<number> {
  if (cachedCountryId !== null) return cachedCountryId;
  // Essayer Madagascar (MG) en premier
  const mgRes = await api.get('/countries?filter[iso_code]=MG&output_format=JSON', { validateStatus: () => true });
  const mg = mgRes.data?.countries;
  if (Array.isArray(mg) && mg.length > 0) {
    cachedCountryId = parseInt(String(mg[0].id));
    return cachedCountryId;
  }
  // Sinon France (FR)
  const frRes = await api.get('/countries?filter[iso_code]=FR&output_format=JSON', { validateStatus: () => true });
  const fr = frRes.data?.countries;
  if (Array.isArray(fr) && fr.length > 0) {
    cachedCountryId = parseInt(String(fr[0].id));
    return cachedCountryId;
  }
  // Dernier recours : premier pays actif
  const allRes = await api.get('/countries?filter[active]=1&output_format=JSON', { validateStatus: () => true });
  const all = allRes.data?.countries;
  cachedCountryId = Array.isArray(all) && all.length > 0 ? parseInt(String(all[0].id)) : 8;
  return cachedCountryId;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
async function findCustomerByEmail(email: string): Promise<number> {
  const res = await api.get(
    `/customers?filter[email]=${encodeURIComponent(email)}&output_format=JSON`,
    { validateStatus: () => true }
  );
  const customers = res.data?.customers;
  if (Array.isArray(customers) && customers.length > 0) {
    return parseInt(String(customers[0].id));
  }
  return 0;
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
  return postEntity('/addresses?output_format=JSON', xml, 'address');
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
    `/products?filter[reference]=${encodeURIComponent(reference)}&output_format=JSON`,
    { validateStatus: () => true }
  );
  const products = listRes.data?.products;
  if (!Array.isArray(products) || products.length === 0) return null;
  const id = parseInt(String(products[0].id));
  const detailRes = await api.get(`/products/${id}?output_format=JSON`, { validateStatus: () => true });
  const p = detailRes.data?.product;
  if (!p) return null;
  const name = Array.isArray(p.name) ? (p.name.find((n: any) => String(n.id) === '1')?.value || p.name[0]?.value || reference) : String(p.name || reference);
  return { id, name, priceHT: parseFloat(p.price) || 0, idTaxGroup: parseInt(String(p.id_tax_rules_group)) || 0 };
}

async function getTaxRate(idTaxGroup: number): Promise<number> {
  if (!idTaxGroup) return 0;
  const r = await api.get(`/tax_rules?filter[id_tax_rules_group]=${idTaxGroup}&output_format=JSON`, { validateStatus: () => true });
  const rules = r.data?.tax_rules;
  if (!Array.isArray(rules) || rules.length === 0) return 0;
  const idTax = parseInt(String(rules[0].id_tax));
  if (!idTax) return 0;
  const t = await api.get(`/taxes/${idTax}?output_format=JSON`, { validateStatus: () => true });
  return parseFloat(t.data?.tax?.rate) || 0;
}

async function findCombinationId(idProduct: number, karazany: string): Promise<number> {
  if (!karazany) return 0;
  const res = await api.get(
    `/combinations?filter[id_product]=${idProduct}&display=full&output_format=JSON`,
    { validateStatus: () => true }
  );
  const combos = res.data?.combinations;
  if (!Array.isArray(combos)) return 0;
  for (const c of combos) {
    // Vérifier si une des valeurs d'attribut correspond à karazany
    const vals = c.associations?.product_option_values;
    if (!Array.isArray(vals)) continue;
    for (const v of vals) {
      const vRes = await api.get(`/product_option_values/${v.id}?output_format=JSON`, { validateStatus: () => true });
      const vName = vRes.data?.product_option_value?.name;
      const name = Array.isArray(vName)
        ? (vName.find((n: any) => String(n.id) === '1')?.value || vName[0]?.value || '')
        : String(vName || '');
      if (name.toLowerCase() === karazany.toLowerCase()) return parseInt(String(c.id));
    }
  }
  return 0;
}

async function getEffectivePrice(idProduct: number, idProductAttribute: number, idTaxGroup: number): Promise<{ ht: number; ttc: number }> {
  // Chercher un specific_price pour ce produit+combinaison
  const spRes = await api.get(
    `/specific_prices?filter[id_product]=${idProduct}&filter[id_product_attribute]=${idProductAttribute}&output_format=JSON`,
    { validateStatus: () => true }
  );
  const sps = spRes.data?.specific_prices;
  if (Array.isArray(sps) && sps.length > 0) {
    const ht = parseFloat(sps[0].price) || 0;
    if (ht > 0) {
      const rate = await getTaxRate(idTaxGroup);
      return { ht, ttc: ht * (1 + rate / 100) };
    }
  }
  // Prix de base du produit
  const detailRes = await api.get(`/products/${idProduct}?output_format=JSON`, { validateStatus: () => true });
  const ht = parseFloat(detailRes.data?.product?.price) || 0;
  const rate = await getTaxRate(idTaxGroup);
  return { ht, ttc: ht * (1 + rate / 100) };
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
async function decreaseStock(idProduct: number, idProductAttribute: number, qty: number, log: (msg: string) => void): Promise<void> {
  const res = await api.get(
    `/stock_availables?filter[id_product]=[${idProduct}]&filter[id_product_attribute]=[${idProductAttribute}]&display=full&output_format=JSON`,
    { validateStatus: () => true }
  );
  const items = res.data?.stock_availables;
  if (!Array.isArray(items) || items.length === 0) {
    log(`Stock introuvable pour produit ID ${idProduct} (attr ${idProductAttribute})`);
    return;
  }
  const sa = items[0];
  const stockId = parseInt(String(sa.id));
  const currentQty = parseInt(String(sa.quantity)) || 0;
  const newQty = Math.max(0, currentQty - qty);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id><![CDATA[${stockId}]]></id>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute}]]></id_product_attribute>
    <id_shop><![CDATA[${sa.id_shop || '1'}]]></id_shop>
    <id_shop_group><![CDATA[${sa.id_shop_group || '0'}]]></id_shop_group>
    <quantity><![CDATA[${newQty}]]></quantity>
    <depends_on_stock><![CDATA[${sa.depends_on_stock || '0'}]]></depends_on_stock>
    <out_of_stock><![CDATA[${sa.out_of_stock || '2'}]]></out_of_stock>
    <location><![CDATA[${sa.location || ''}]]></location>
  </stock_available>
</prestashop>`;
  await api.put(`/stock_availables/${stockId}?output_format=JSON`, xml, { headers: XML_HEADERS, validateStatus: () => true });
  log(`Stock produit ID ${idProduct}${idProductAttribute ? ` (combo ${idProductAttribute})` : ''} : ${currentQty} → ${newQty}`);
}

// ---------------------------------------------------------------------------
// Paiement
// ---------------------------------------------------------------------------
async function createOrderPayment(orderId: number, amount: number, dateAdd: string): Promise<void> {
  const orderRes = await api.get(`/orders/${orderId}?output_format=JSON`, { validateStatus: () => true });
  const reference = orderRes.data?.order?.reference;
  if (!reference) return;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_payment>
    <order_reference><![CDATA[${reference}]]></order_reference>
    <id_currency><![CDATA[2]]></id_currency>
    <amount><![CDATA[${amount.toFixed(6)}]]></amount>
    <payment_method><![CDATA[Paiement à la livraison]]></payment_method>
    <conversion_rate><![CDATA[1.000000]]></conversion_rate>
    <date_add><![CDATA[${dateAdd} 00:00:00]]></date_add>
  </order_payment>
</prestashop>`;
  await api.post('/order_payments?output_format=JSON', xml, { headers: XML_HEADERS, validateStatus: () => true });
}

// ---------------------------------------------------------------------------
// Transporteur par défaut
// ---------------------------------------------------------------------------
let cachedCarrierId: number | null = null;

async function getDefaultCarrierId(): Promise<number> {
  if (cachedCarrierId !== null) return cachedCarrierId;
  const res = await api.get('/carriers?filter[active]=1&display=full&output_format=JSON', { validateStatus: () => true });
  const carriers = res.data?.carriers;
  if (Array.isArray(carriers) && carriers.length > 0) {
    cachedCarrierId = parseInt(String(carriers[0].id));
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
  const res = await api.get('/order_states?display=full&output_format=JSON', { validateStatus: () => true });
  const states = res.data?.order_states;
  if (!Array.isArray(states)) { cachedOrderStates = []; return []; }
  cachedOrderStates = states.map((s: any) => {
    const nameField = s.name;
    const name = Array.isArray(nameField)
      ? (nameField.find((n: any) => String(n.id) === '1')?.value || nameField[0]?.value || '')
      : String(nameField || '');
    return { id: parseInt(String(s.id)), name };
  });
  return cachedOrderStates;
}

async function findOrderStateId(etat: string): Promise<number> {
  if (!etat) return 0;
  const states = await loadOrderStates();
  const norm = etat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Correspondance exacte
  let found = states.find(s =>
    s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === norm
  );
  if (found) return found.id;

  // Correspondance partielle
  found = states.find(s => {
    const sNorm = s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sNorm.includes(norm) || norm.includes(sNorm);
  });
  if (found) return found.id;

  // Mots-clés
  if (norm.includes('accept') || norm.includes('pay')) return states.find(s => s.name.toLowerCase().includes('accept'))?.id ?? 2;
  if (norm.includes('erreur') || norm.includes('error')) return states.find(s => s.name.toLowerCase().includes('err'))?.id ?? 8;
  if (norm.includes('attente') || norm.includes('wait')) return states.find(s => s.name.toLowerCase().includes('attente'))?.id ?? 1;

  return 1; // défaut
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
  const totalHT = lines.reduce((s, l) => s + l.priceHT * l.qty, 0);
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

// ---------------------------------------------------------------------------
// Création de commande — tolère les warnings PHP (code 15) du module gamification
// ---------------------------------------------------------------------------
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
  const res = await api.post('/orders?output_format=JSON', xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    validateStatus: () => true,
  });

  // Succès normal
  const id = tryExtractId(res.data, 'order');
  if (id > 0) return id;

  // PrestaShop retourne parfois des warnings PHP (code 15) même quand la commande
  // est créée (ex: hook déprécié dans le module gamification).
  // Dans ce cas on cherche la commande via l'ID du panier.
  const errors = res.data?.errors;
  const onlyPhpWarnings = Array.isArray(errors) && errors.every((e: any) => e.code === 15);
  if (onlyPhpWarnings) {
    const findRes = await api.get(
      `/orders?filter[id_cart]=${idCart}&output_format=JSON`,
      { validateStatus: () => true }
    );
    const orders = findRes.data?.orders;
    if (Array.isArray(orders) && orders.length > 0) {
      return parseInt(String(orders[0].id));
    }
  }

  // Vraie erreur
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

  // Réinitialiser les caches entre les imports
  cachedCountryId = null;
  cachedOrderStates = null;
  cachedCarrierId = null;

  function log(level: ImportLog['level'], message: string) {
    const entry: ImportLog = { level, message };
    logs.push(entry);
    onLog(entry);
  }

  log('info', `Début de l'import fichier3 — ${rows.length} ligne(s) détectée(s)`);
  if (rows.length > 0) log('info', `Colonnes : ${Object.keys(rows[0]).join(' | ')}`);

  log('info', 'Chargement des états de commande et du transporteur…');
  const states = await loadOrderStates();
  const idCarrier = await getDefaultCarrierId();
  log('info', `${states.length} état(s) disponible(s) — transporteur par défaut ID ${idCarrier}`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
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
      // ── 1. Client (email unique) ──
      let idCustomer = await findCustomerByEmail(email);
      if (idCustomer > 0) {
        log('info', `Ligne ${rowNum} : client "${email}" déjà existant → ID ${idCustomer}`);
      } else {
        idCustomer = await postEntity(
          '/customers?output_format=JSON',
          xmlCustomer(firstname, lastname, email, pwd),
          'customer'
        );
        log('success', `Ligne ${rowNum} : client "${email}" créé → ID ${idCustomer}`);
      }

      // ── 2. Adresse ──
      const idAddress = await createAddress(idCustomer, adresse, firstname, lastname);
      log('success', `Ligne ${rowNum} : adresse "${adresse}" créée → ID ${idAddress}`);

      // ── 3. Résoudre les produits ──
      const cartRows: CartRow[] = [];
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
        continue;
      }

      // ── 4. Panier ──
      const idCart = await postEntity(
        '/carts?output_format=JSON',
        xmlCart(idCustomer, idAddress, dateAdd, cartRows),
        'cart'
      );
      log('success', `Ligne ${rowNum} : panier créé → ID ${idCart}`);

      // ── 5. Commande ou panier uniquement ──
      if (!etat) {
        // État vide = dans le panier, pas encore commandé
        log('info', `Ligne ${rowNum} (${email}) : état vide → panier conservé sans commande`);
      } else {
        const stateId = await findOrderStateId(etat);
        const totalTTC = orderLines.reduce((s, l) => s + l.priceTTC * l.qty, 0);
        const idOrder = await createOrder(idCustomer, idAddress, idCart, idCarrier, stateId, dateAdd, orderLines);
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
      log('error', `Ligne ${rowNum} (${email}) : ${err.message || 'Erreur inconnue'}`);
      errorCount++;
    }
  }

  log(
    errorCount === 0 ? 'success' : 'warning',
    `Import fichier3 terminé — ${successCount} ligne(s) traitée(s), ${errorCount} erreur(s)`
  );

  return { logs, successCount, errorCount };
}
