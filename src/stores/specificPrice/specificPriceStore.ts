import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export interface Currency {
  id: string;
  name: string;
  isoCode: string;
  conversionRate: string;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  idDefaultGroup: string;
}

export interface SpecificPrice {
  id: string;
  idProduct: string;
  idShop: string;
  idCurrency: string;
  idCountry: string;
  idGroup: string;
  idCustomer: string;
  price: string;
  fromQuantity: string;
  reduction: string;
  reductionType: string; // 'amount' or 'percentage'
  reductionTax: string; // '0' = HT, '1' = TTC
  from: string;
  to: string;
}

export const useSpecificPriceStore = defineStore('specificPrice', {
  state: () => ({
    currencies: [] as Currency[],
    countries: [] as Country[],
    groups: [] as Group[],
    customers: [] as Customer[],
    loading: false,
  }),

  actions: {
    async fetchCurrencies() {
      if (this.currencies.length) return;
      this.loading = true;
      try {
        const res = await api.get('/currencies?output_format=XML&display=full&filter[active]=1');
        this.currencies = Array.from(parse(res.data).querySelectorAll('currency')).map(el => ({
          id: text(el, 'id'),
          name: text(el, 'name'),
          isoCode: text(el, 'iso_code'),
          conversionRate: text(el, 'conversion_rate'),
        }));
      } catch (e) { console.error('Erreur currencies:', e); }
      finally { this.loading = false; }
    },

    async fetchCountries() {
      if (this.countries.length) return;
      this.loading = true;
      try {
        const res = await api.get('/countries?output_format=XML&display=full&filter[active]=1');
        this.countries = Array.from(parse(res.data).querySelectorAll('country')).map(el => ({
          id: text(el, 'id'),
          name: lang(el, 'name'),
          isoCode: text(el, 'iso_code'),
        }));
      } catch (e) { console.error('Erreur countries:', e); }
      finally { this.loading = false; }
    },

    async fetchGroups() {
      if (this.groups.length) return;
      this.loading = true;
      try {
        const res = await api.get('/groups?output_format=XML&display=full');
        this.groups = Array.from(parse(res.data).querySelectorAll('group')).map(el => ({
          id: text(el, 'id'),
          name: lang(el, 'name'),
        }));
      } catch (e) { console.error('Erreur groups:', e); }
      finally { this.loading = false; }
    },

    async fetchCustomers(search: string = '') {
      this.loading = true;
      try {
        let url = '/customers?output_format=XML&display=full';
        if (search) {
          url += `&filter[firstname]=%[${search}]%`;
        }
        const res = await api.get(url);
        this.customers = Array.from(parse(res.data).querySelectorAll('customer')).map(el => ({
          id: text(el, 'id'),
          firstname: text(el, 'firstname'),
          lastname: text(el, 'lastname'),
          email: text(el, 'email'),
          idDefaultGroup: text(el, 'id_default_group'),
        }));
      } catch (e) { console.error('Erreur customers:', e); }
      finally { this.loading = false; }
    },

    async fetchAll() {
      await Promise.all([
        this.fetchCurrencies(),
        this.fetchCountries(),
        this.fetchGroups(),
      ]);
    },
  },
});
