import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export const useFeatureStore = defineStore('feature', {
  state: () => ({
    features: [] as { id: string; name: string; values: { id: string; value: string }[] }[],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const [fRes, vRes] = await Promise.all([
          api.get('/product_features?output_format=XML&display=full&limit=1000'),
          api.get('/product_feature_values?output_format=XML&display=full&limit=1000'),
        ]);

        // Regrouper les valeurs par id_feature
        const valuesMap: Record<string, { id: string; value: string }[]> = {};
        parse(vRes.data).querySelectorAll('product_feature_value').forEach(el => {
          const idFeature = text(el, 'id_feature');
          if (!valuesMap[idFeature]) valuesMap[idFeature] = [];
          valuesMap[idFeature].push({ id: text(el, 'id'), value: lang(el, 'value') });
        });

        this.features = Array.from(parse(fRes.data).querySelectorAll('product_feature')).map(el => ({
          id:     text(el, 'id'),
          name:   lang(el, 'name'),
          values: valuesMap[text(el, 'id')] || [],
        }));
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },
  },
});
