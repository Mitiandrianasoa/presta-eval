import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export const useLanguageStore = defineStore('language', {
  state: () => ({
    languages: [] as { id: string; name: string; isoCode: string }[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      if (this.languages.length) return;
      this.loading = true;
      try {
        const res = await api.get('/languages?output_format=XML&display=full');
        this.languages = Array.from(parse(res.data).querySelectorAll('language')).map(el => ({
          id:      text(el, 'id'),
          name:    text(el, 'name'),
          isoCode: text(el, 'iso_code'),
        }));
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },
  },
});
