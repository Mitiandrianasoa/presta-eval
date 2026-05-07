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

        const stockMap: Record<string, number> = {};
        parse(sRes.data).querySelectorAll('stock_available').forEach(el =>
          stockMap[text(el, 'id_product')] = parseInt(text(el, 'quantity')) || 0
        );

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
            price_ttc:           (parseFloat(text(el, 'price')) * 1.2).toFixed(2),
            img:                 imgId ? `/api/images/products/${id}/${imgId}/small_default` : null,
          };
        });
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },

    async save(data: any, id?: number) {
      const method = id ? api.put : api.post;
      const url    = id ? `/products/${id}` : '/products';
      const name   = data.name?.[0]?.value || data.name || '';

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
  <quantity>${data.quantity || 0}</quantity>
  <minimal_quantity>${data.minimal_quantity || 0}</minimal_quantity>
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
