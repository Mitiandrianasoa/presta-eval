import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

const slugify = (str: string) =>
  str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'produit';

const buildXml = (id: number | string | undefined, f: Record<string, string>) => `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product>
  ${id ? `<id>${id}</id>` : ''}
  <name><language id="1">${f.name}</language></name>
  <description><language id="1">${f.description}</language></description>
  <description_short><language id="1">${f.description_short}</language></description_short>
  <link_rewrite><language id="1">${f.link_rewrite}</language></link_rewrite>
  <meta_title><language id="1">${f.name}</language></meta_title>
  <meta_description><language id="1"></language></meta_description>
  <meta_keywords><language id="1"></language></meta_keywords>
  <price>${f.price}</price>
  <wholesale_price>${f.wholesale_price}</wholesale_price>
  <unit_price_ratio>${f.unit_price_ratio}</unit_price_ratio>
  <reference>${f.reference}</reference>
  <id_category_default>${f.id_category_default}</id_category_default>
  <id_tax_rules_group>${f.id_tax_rules_group}</id_tax_rules_group>
  <minimal_quantity>${f.minimal_quantity}</minimal_quantity>
  <weight>${f.weight}</weight>
  <width>${f.width}</width>
  <height>${f.height}</height>
  <depth>${f.depth}</depth>
  <additional_shipping_cost>${f.additional_shipping_cost}</additional_shipping_cost>
  <available_for_order>${f.available_for_order}</available_for_order>
  <online_only>${f.online_only}</online_only>
  <visibility>${f.visibility}</visibility>
  <active>${f.active}</active>
  <associations>
    <categories>
      <category><id>${f.id_category_default}</id></category>
    </categories>
  </associations>
</product></prestashop>`;

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as any[],
    loading: false
  }),

  actions: {
    async fetchAll(categoryId?: number) {
      this.loading = true;
      try {
        let url = '/products?output_format=XML&display=full&limit=1000';
        if (categoryId) url += `&filter[id_category_default]=${categoryId}`;

        const [pRes, cRes, sRes, trRes, tRes] = await Promise.all([
          api.get(url,                                                                    { validateStatus: () => true }),
          api.get('/categories?output_format=XML&display=[id,name]&limit=1000',          { validateStatus: () => true }),
          api.get('/stock_availables?output_format=XML&display=full&limit=1000',         { validateStatus: () => true }),
          api.get('/tax_rules?display=full&output_format=XML&limit=1000',                { validateStatus: () => true }),
          api.get('/taxes?display=full&output_format=XML&limit=1000',                    { validateStatus: () => true }),
        ]);

        const catMap: Record<string, string> = {};
        parse(cRes.data).querySelectorAll('category').forEach(el =>
          catMap[text(el, 'id')] = lang(el, 'name')
        );

        const stockMap:   Record<string, number> = {};
        const stockIdMap: Record<string, string> = {};
        parse(sRes.data).querySelectorAll('stock_available').forEach(el => {
          const pid = text(el, 'id_product');
          if (text(el, 'id_product_attribute') === '0') {
            stockMap[pid]   = parseInt(text(el, 'quantity')) || 0;
            stockIdMap[pid] = text(el, 'id');
          }
        });

        // id_tax → taux réel
        const idTaxToRate: Record<string, number> = {};
        parse(tRes.data).querySelectorAll('tax').forEach(el => {
          const id   = text(el, 'id');
          const rate = parseFloat(text(el, 'rate')) || 0;
          if (id && rate > 0) idTaxToRate[id] = rate;
        });

        // id_tax_rules_group → taux réel
        const taxRateMap: Record<string, number> = {};
        parse(trRes.data).querySelectorAll('tax_rule').forEach(el => {
          const groupId = text(el, 'id_tax_rules_group');
          const idTax   = text(el, 'id_tax');
          if (groupId && idTax && idTaxToRate[idTax]) {
            taxRateMap[groupId] = idTaxToRate[idTax];
          }
        });

        const productEls = Array.from(parse(pRes.data).querySelectorAll('product'));
        this.products = productEls.map(el => {
          const id    = text(el, 'id');
          const imgId = text(el, 'id_default_image')
                     || el.querySelector('associations images image id')?.textContent?.trim()
                     || '';
          const priceHT    = parseFloat(text(el, 'price')) || 0;
          const idTaxGroup = text(el, 'id_tax_rules_group');
          const taxRate    = taxRateMap[idTaxGroup] || 0;
          // TTC = HT / (1 − taxe/100) — inverse de la formule d'import
          const priceTTC   = taxRate > 0 ? priceHT * (1 + taxRate / 100) : priceHT;

          return {
            id,
            name:                lang(el, 'name'),
            price:               priceHT.toFixed(2),
            reference:           text(el, 'reference'),
            id_category_default: text(el, 'id_category_default'),
            id_tax_rules_group:  idTaxGroup,
            active:              text(el, 'active'),
            category:            catMap[text(el, 'id_category_default')] || '—',
            stock:               stockMap[id] ?? 0,
            stock_available_id:  stockIdMap[id] || '',
            price_ttc:           priceTTC.toFixed(2),
            img:                 imgId ? `/api/images/products/${id}/${imgId}/small_default` : null,
          };
        });
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },

    async updateStock(stockAvailableId: string, quantity: number) {
      const res = await api.get(`/stock_availables/${stockAvailableId}?output_format=XML`);
      const doc = parse(res.data);
      const el  = doc.querySelector('stock_available');
      if (!el) return;

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><stock_available>
  <id>${text(el, 'id')}</id>
  <id_product>${text(el, 'id_product')}</id_product>
  <id_product_attribute>${text(el, 'id_product_attribute')}</id_product_attribute>
  <id_shop>${text(el, 'id_shop') || '1'}</id_shop>
  <id_shop_group>${text(el, 'id_shop_group') || '0'}</id_shop_group>
  <quantity>${quantity}</quantity>
  <depends_on_stock>${text(el, 'depends_on_stock') || '0'}</depends_on_stock>
  <out_of_stock>${text(el, 'out_of_stock') || '2'}</out_of_stock>
  <location>${text(el, 'location') || ''}</location>
</stock_available></prestashop>`;

      await api.put(`/stock_availables/${stockAvailableId}`, xml, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8' }
      });
    },

    async save(data: any, id?: number) {
      const name  = data.name?.[0]?.value || data.name || '';
      const catId = String(data.id_category_default || 2);

      try {
        if (id) {
          // ── PUT: fetch existing product to preserve all fields ──────────
          const existing = await api.get(`/products/${id}?output_format=XML`);
          const el = parse(existing.data).querySelector('product');
          if (!el) throw new Error('Produit introuvable');

          const xml = buildXml(id, {
            name,
            description:               data.description       || lang(el, 'description'),
            description_short:         data.description_short || lang(el, 'description_short'),
            link_rewrite:              lang(el, 'link_rewrite') || slugify(name),
            price:                     data.price             ?? text(el, 'price'),
            wholesale_price:           data.wholesale_price   ?? (text(el, 'wholesale_price') || '0'),
            unit_price_ratio:          text(el, 'unit_price_ratio')          || '0',
            reference:                 data.reference         ?? text(el, 'reference'),
            id_category_default:       catId,
            id_tax_rules_group:        text(el, 'id_tax_rules_group')        || '1',
            minimal_quantity:          text(el, 'minimal_quantity')          || '1',
            weight:                    text(el, 'weight')                    || '0',
            width:                     text(el, 'width')                     || '0',
            height:                    text(el, 'height')                    || '0',
            depth:                     text(el, 'depth')                     || '0',
            additional_shipping_cost:  text(el, 'additional_shipping_cost')  || '0',
            available_for_order:       text(el, 'available_for_order')       || '1',
            online_only:               text(el, 'online_only')               || '0',
            visibility:                text(el, 'visibility')                || 'both',
            active:                    data.active             ?? text(el, 'active') ?? '1',
          });

          await api.put(`/products/${id}`, xml, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8' }
          });

          if (data.imageFiles?.length) {
            await this.uploadImages(String(id), data.imageFiles);
          }
          if (data.quantity !== undefined && data.stock_available_id) {
            await this.updateStock(data.stock_available_id, data.quantity);
          }

        } else {
          // ── POST: new product ───────────────────────────────────────────
          const xml = buildXml(undefined, {
            name,
            description:              data.description       || '',
            description_short:        data.description_short || '',
            link_rewrite:             slugify(name),
            price:                    data.price             || '0',
            wholesale_price:          data.wholesale_price   || '0',
            unit_price_ratio:         '0',
            reference:                data.reference         || '',
            id_category_default:      catId,
            id_tax_rules_group:       '1',
            minimal_quantity:         '1',
            weight:                   '0',
            width:                    '0',
            height:                   '0',
            depth:                    '0',
            additional_shipping_cost: '0',
            available_for_order:      '1',
            online_only:              '0',
            visibility:               'both',
            active:                   data.active || '1',
          });

          const response  = await api.post('/products', xml, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8' }
          });
          const productId = parse(response.data).querySelector('product id')?.textContent?.trim() || '';

          if (data.imageFiles?.length && productId) {
            await this.uploadImages(productId, data.imageFiles);
          }

          // Trouver le stock_available auto-créé et mettre à jour la quantité
          if (data.quantity !== undefined && productId) {
            try {
              const sRes = await api.get(
                `/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute]` +
                `&filter[id_product]=[${productId}]&filter[id_product_attribute]=[0]&limit=1`
              );
              const saId = parse(sRes.data).querySelector('stock_available id')?.textContent?.trim();
              if (saId) await this.updateStock(saId, Number(data.quantity));
            } catch (e) {
              console.warn('Stock initial non défini:', e);
            }
          }
        }

        await this.fetchAll();
      } catch (error: any) {
        console.error('❌ save produit:', error.response?.data || error.message);
        throw error;
      }
    },

    async uploadImages(productId: string, files: File[]) {
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          await api.post(`/images/products/${productId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (e: any) {
          console.warn(`Upload image échoué (${file.name}):`, e.response?.data || e.message);
        }
      }
    },

    async remove(id: number) {
      await api.delete(`/products/${id}`);
      await this.fetchAll();
    },
  }
});
