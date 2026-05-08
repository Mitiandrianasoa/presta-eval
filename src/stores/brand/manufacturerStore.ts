import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export const useManufacturerStore = defineStore('manufacturer', {
  state: () => ({
    manufacturers: [] as any[],
    loading: false
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const res = await api.get('/manufacturers?output_format=XML&display=full&limit=1000');
        this.manufacturers = Array.from(parse(res.data).querySelectorAll('manufacturer')).map(el => ({
          id:     text(el, 'id'),
          name:   text(el, 'name'),
          active: text(el, 'active'),
        }));
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },

    async save(data: any, id?: number) {
      const method = id ? api.put : api.post;
      const url    = id ? `/manufacturers/${id}` : '/manufacturers';
      const name   = data.name || 'Nouvelle marque';

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><manufacturer>
  ${id ? `<id>${id}</id>` : ''}
  <name>${name}</name>
  <active>1</active>
</manufacturer></prestashop>`;

      try {
        await method(url, xml, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
        await this.fetchAll();
      } catch (error: any) {
        console.error('❌', error.response?.data);
        throw error;
      }
    },

    async remove(id: number) {
      await api.delete(`/manufacturers/${id}`);
      await this.fetchAll();
    }
  }
});
