import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export interface Customer {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  company?: string;
  active: string;
  newsletter?: string;
  optin?: string;
  date_add?: string;
  date_upd?: string;
}

export const useCustomerStore = defineStore('customer', {
  state: () => ({
    customers: [] as Customer[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/customers?output_format=XML&display=full&limit=5000');
        this.customers = Array.from(parse(res.data).querySelectorAll('customer')).map(el => ({
          id: text(el, 'id'),
          email: text(el, 'email'),
          firstname: text(el, 'firstname'),
          lastname: text(el, 'lastname'),
          company: text(el, 'company'),
          active: text(el, 'active'),
          newsletter: text(el, 'newsletter'),
          optin: text(el, 'optin'),
          date_add: text(el, 'date_add'),
          date_upd: text(el, 'date_upd'),
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
      const url = id ? `/customers/${id}` : '/customers';
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><customer>
  ${id ? `<id>${id}</id>` : ''}
  <email>${data.email}</email>
  <firstname>${data.firstname}</firstname>
  <lastname>${data.lastname}</lastname>
  <company>${data.company || ''}</company>
  <active>${data.active ? '1' : '0'}</active>
  <newsletter>${data.newsletter ? '1' : '0'}</newsletter>
  <optin>${data.optin ? '1' : '0'}</optin>
</customer></prestashop>`;

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
        await api.delete(`/customers/${id}`);
        this.customers = this.customers.filter(c => c.id !== id);
      } catch (error: any) {
        this.error = `Erreur suppression : ${error.response?.status}`;
        throw error;
      }
    },
  },
});
