import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export interface Carrier {
  id: string;
  name: string;
  active: string;
  deleted: string;
  shippingHandling: string;
  freeShippingStartsAtPrice: string;
  freeShippingStartsAtWeight: string;
}

export const useCarrierStore = defineStore('carrier', {
  state: () => ({
    carriers: [] as Carrier[],
    loading: false,
  }),

  getters: {
    activeCarriers: (state) =>
      state.carriers.filter(c => c.active),
  },

  actions: {
    async fetchAll() {
      if (this.carriers.length) return;
      this.loading = true;
      try {
        const res = await api.get('/carriers?output_format=XML&display=full');
        this.carriers = Array.from(parse(res.data).querySelectorAll('carrier')).map(el => ({
          id:                             text(el, 'id'),
          name:                           text(el, 'name'),
          active:                         text(el, 'active'),
          deleted:                        text(el, 'deleted'),
          shippingHandling:               text(el, 'shipping_handling'),
          freeShippingStartsAtPrice:      text(el, 'free_shipping_starts_at_price'),
          freeShippingStartsAtWeight:     text(el, 'free_shipping_starts_at_weight'),
        }));
      } catch (e) {
        console.error('Erreur lors du chargement des transporteurs :', e);
      } finally {
        this.loading = false;
      }
    },
  },
});