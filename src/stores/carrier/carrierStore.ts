import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export interface Carrier {
  id: string;
  name: string;
  delay: string;
  active: boolean;
  isFree: boolean;
  maxWeight: string;
  maxWidth: string;
  maxHeight: string;
  maxDepth: string;
  grade: string;
  url: string;
}

export const useCarrierStore = defineStore('carrier', {
  state: () => ({
    carriers: [] as Carrier[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      if (this.carriers.length) return;
      this.loading = true;
      try {
        const res = await api.get('/carriers?output_format=XML&display=full&filter[deleted]=0');
        this.carriers = Array.from(parse(res.data).querySelectorAll('carrier'))
          .map(el => ({
            id:        text(el, 'id'),
            name:      text(el, 'name'),
            delay:     lang(el, 'delay'),
            active:    text(el, 'active') === '1',
            isFree:    text(el, 'is_free') === '1',
            maxWeight: text(el, 'max_weight'),
            maxWidth:  text(el, 'max_width'),
            maxHeight: text(el, 'max_height'),
            maxDepth:  text(el, 'max_depth'),
            grade:     text(el, 'grade'),
            url:       text(el, 'url'),
          }))
          .filter(c => c.active);
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },
  },
});
