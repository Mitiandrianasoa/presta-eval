import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export interface Manufacturer {
  id: string;
  name: string;
  description?: string;
  short_description?: string;
  active: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export const useManufacturerStore = defineStore('manufacturer', {
  state: () => ({
    manufacturers: [] as Manufacturer[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/manufacturers?output_format=XML&display=full&limit=5000');
        this.manufacturers = Array.from(parse(res.data).querySelectorAll('manufacturer')).map(el => ({
          id: text(el, 'id'),
          name: lang(el, 'name'),
          description: lang(el, 'description'),
          short_description: lang(el, 'short_description'),
          active: text(el, 'active'),
          meta_title: lang(el, 'meta_title'),
          meta_description: lang(el, 'meta_description'),
          meta_keywords: lang(el, 'meta_keywords'),
        }));
      } catch (e: any) {
        this.error = `Erreur : ${e.message}`;
        console.error(e);
      } finally {
        this.loading = false;
      }
    },

    async save(data: any, id?: string) {
      const method = id ? api.put : api.post;
      const url = id ? `/manufacturers/${id}` : '/manufacturers';
      
      const name = data.name || 'Nouvelle marque';
      const linkRewrite = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'marque';
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><manufacturer>
  ${id ? `<id>${id}</id>` : ''}
  <name>
    <language id="1">${name}</language>
  </name>
  <active>${data.active ? '1' : '0'}</active>
  <link_rewrite>
    <language id="1">${linkRewrite}</language>
  </link_rewrite>
</manufacturer></prestashop>`;

      try {
        await method(url, xml, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
        await this.fetchAll();
      } catch (error: any) {
        this.error = `Erreur sauvegarde : ${error.response?.status}`;
        throw error;
      }
    },

    async remove(id: string) {
      try {
        await api.delete(`/manufacturers/${id}`);
        this.manufacturers = this.manufacturers.filter(m => m.id !== id);
      } catch (error: any) {
        this.error = `Erreur suppression : ${error.response?.status}`;
        throw error;
      }
    },
  },
});
