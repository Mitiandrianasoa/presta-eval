import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

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

        const [pRes, cRes, sRes] = await Promise.all([
          api.get(url),
          api.get('/categories?output_format=XML&display=[id,name]&limit=1000'),
          api.get('/stock_availables?output_format=XML&display=full&limit=1000'),
        ]);

        const catMap: Record<string, string> = {};
        parse(cRes.data).querySelectorAll('category').forEach(el =>
          catMap[text(el, 'id')] = lang(el, 'name')
        );

        // stockMap: id_product → quantité  |  stockIdMap: id_product → id du stock_available
        const stockMap:   Record<string, number> = {};
        const stockIdMap: Record<string, string> = {};
        parse(sRes.data).querySelectorAll('stock_available').forEach(el => {
          const pid = text(el, 'id_product');
          // Ne garder que la ligne sans déclinaison (id_product_attribute = 0)
          if (text(el, 'id_product_attribute') === '0') {
            stockMap[pid]   = parseInt(text(el, 'quantity')) || 0;
            stockIdMap[pid] = text(el, 'id');
          }
        });

        this.products = Array.from(parse(pRes.data).querySelectorAll('product')).map(el => {
          const id    = text(el, 'id');
          const imgId = text(el, 'id_default_image')
                     || el.querySelector('associations images image id')?.textContent?.trim()
                     || '';
          return {
            id,
            name:                lang(el, 'name'),
            price:               text(el, 'price'),
            reference:           text(el, 'reference'),
            id_category_default: text(el, 'id_category_default'),
            active:              text(el, 'active'),
            category:            catMap[text(el, 'id_category_default')] || '—',
            stock:               stockMap[id] || 0,
            stock_available_id:  stockIdMap[id] || '',   // ← exposé pour le PUT stock
            price_ttc:           (parseFloat(text(el, 'price')) * 1.2).toFixed(2),
            img:                 imgId ? `/api/images/products/${id}/${imgId}/small_default` : null,
          };
        });
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },

    // Met à jour uniquement le stock via stock_availables
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
      const method = id ? api.put : api.post;
      const url    = id ? `/products/${id}` : '/products';
      const name   = data.name?.[0]?.value || data.name || '';

      // ⚠️ quantity n'est PAS dans ce XML — PrestaShop refuse ce champ sur /products
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><product>
  ${id ? `<id>${id}</id>` : ''}
  <name><language id="1">${name}</language></name>
  <description><language id="1">${data.description || ''}</language></description>
  <description_short><language id="1">${data.description_short || ''}</language></description_short>
  <price>${data.price || 0}</price>
  <wholesale_price>${data.wholesale_price || 0}</wholesale_price>
  <unit_price_ratio>${data.unit_price_ratio || 0}</unit_price_ratio>
  <reference>${data.reference || ''}</reference>
  <id_category_default>${data.id_category_default || 2}</id_category_default>
  <minimal_quantity>${data.minimal_quantity || 1}</minimal_quantity>
  <weight>${data.weight || 0}</weight>
  <width>${data.width || 0}</width>
  <height>${data.height || 0}</height>
  <depth>${data.depth || 0}</depth>
  <additional_shipping_cost>${data.additional_shipping_cost || 0}</additional_shipping_cost>
  <available_for_order>${data.available_for_order || '1'}</available_for_order>
  <online_only>${data.online_only || '0'}</online_only>
  <visibility>${data.visibility || 'both'}</visibility>
  <active>${data.active || '1'}</active>
</product></prestashop>`;

      try {
        await method(url, xml, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });

        // Stock mis à jour séparément
        if (data.quantity !== undefined && data.stock_available_id) {
          await this.updateStock(data.stock_available_id, data.quantity);
        }

        await this.fetchAll();
      } catch (error: any) {
        console.error('❌', error.response?.data);
        throw error;
      }
    },

    async remove(id: number) {
      await api.delete(`/products/${id}`);
      await this.fetchAll();
    }
  }
});