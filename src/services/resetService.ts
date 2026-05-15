import api from '../api/api';

interface Resource {
  label: string;
  endpoint: string;
  tag: string;
  skip?: number[];
  soft?: boolean;
}

const RESOURCES: Resource[] = [
  { label: 'Valeurs options',     endpoint: 'product_option_values', tag: 'product_option_value' },
  { label: 'Combinaisons',        endpoint: 'combinations',          tag: 'combination' },
  { label: 'Prix spécifiques',    endpoint: 'specific_prices',       tag: 'specific_price' },
  { label: 'Règles panier',       endpoint: 'cart_rules',            tag: 'cart_rule' },
  { label: 'Commandes',           endpoint: 'orders',                tag: 'order',          soft: true },
  { label: 'Adresses',            endpoint: 'addresses',             tag: 'address' },
  { label: 'Produits',            endpoint: 'products',              tag: 'product' },
  { label: 'Catégories',         endpoint: 'categories',            tag: 'category',       skip: [1, 2] },
  { label: 'Options produits',    endpoint: 'product_options',       tag: 'product_option' },
  { label: 'Clients',             endpoint: 'customers',             tag: 'customer' },
  { label: 'Taxes',               endpoint: 'taxes',                 tag: 'tax',            soft: true },
  { label: 'Groupes de taxes',    endpoint: 'tax_rule_groups',       tag: 'tax_rule_group', soft: true },
  { label: 'Stocks disponibles',  endpoint: 'stock_availables',      tag: 'stock_available', soft: true },
];

function parseIds(xml: string, tag: string, skip: number[] = []): number[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.getElementsByTagName(tag))
    .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
    .filter(id => id > 0 && !skip.includes(id));
}

export async function resetAllData(onLog: (msg: string) => void): Promise<void> {
  onLog('Réinitialisation de la base en cours…');

  for (const res of RESOURCES) {
    try {
      const r = await api.get(`/${res.endpoint}?output_format=XML&display=[id]&limit=5000`, { validateStatus: () => true });
      const ids = parseIds(r.data, res.tag, res.skip);
      if (ids.length === 0) continue;

      onLog(`Suppression : ${res.label} (${ids.length})`);
      for (const id of [...ids].sort((a, b) => b - a)) {
        try {
          await api.delete(`/${res.endpoint}/${id}`, { validateStatus: () => true });
        } catch {
          if (!res.soft) throw new Error(`Échec suppression ${res.endpoint}/${id}`);
        }
      }
    } catch (e: any) {
      if (!res.soft) throw e;
    }
  }

  onLog('Base réinitialisée.');
}
