import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const lang  = (el: Element, tag: string) => el.querySelector(`${tag} language`)?.textContent?.trim() || '';

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [] as any[],
    loading: false
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const res = await api.get('/categories?output_format=XML&display=full&limit=1000');

        console.log('📡 [fetchAll] Type de res.data     :', typeof res.data);
        console.log('📡 [fetchAll] Content-Type reçu    :', res.headers?.['content-type']);
        console.log('📡 [fetchAll] Aperçu brut res.data :', String(res.data).slice(0, 300));

        const parsed = parse(res.data);
        console.log('🔍 [fetchAll] Résultat du parsing  :', parsed);

        this.categories = Array.from(parsed.querySelectorAll('category')).map(el => ({
          id:          text(el, 'id'),
          name:        lang(el, 'name'),
          description: lang(el, 'description'),
          active:      text(el, 'active'),
          id_parent:   text(el, 'id_parent'),
          level_depth: text(el, 'level_depth'),
        }));

        console.log('✅ [fetchAll] Nb catégories parsées :', this.categories.length);
        console.log('✅ [fetchAll] Première catégorie    :', this.categories[0]);

      } catch (e) {
        console.error('❌ [fetchAll] Erreur :', e);
      } finally {
        this.loading = false;
      }
    },

    async save(data: any, id?: number) {
      const method      = id ? api.put : api.post;
      const url         = id ? `/categories/${id}` : '/categories';
      const name        = data.name || 'Nouvelle categorie';
      const linkRewrite = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'categorie';
      const active      = data.active === '1' || data.active === true ? '1' : '0';

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><category>
  ${id ? `<id>${id}</id>` : ''}
  <name>
    <language id="1">${name}</language>
    <language id="2">${name}</language>
  </name>
  <link_rewrite>
    <language id="1">${linkRewrite}</language>
    <language id="2">${linkRewrite}</language>
  </link_rewrite>
  <active>${active}</active>
  <id_parent>2</id_parent>
</category></prestashop>`;

      console.log('📤 [save] Mode         :', id ? `UPDATE (id=${id})` : 'CREATE');
      console.log('📤 [save] URL          :', url);
      console.log('📤 [save] XML envoyé   :', xml);

      try {
        const saveRes = await method(url, xml, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
        console.log('✅ [save] Réponse status    :', saveRes.status);
        console.log('✅ [save] Réponse data type :', typeof saveRes.data);
        console.log('✅ [save] Aperçu réponse    :', String(saveRes.data).slice(0, 300));
        await this.fetchAll();
      } catch (error: any) {
        console.error('❌ [save] Erreur            :', error.response?.data);
        throw error;
      }
    },

    async remove(id: number) {
      console.log('🗑️ [remove] Suppression catégorie id :', id);
      await api.delete(`/categories/${id}`);
      console.log('✅ [remove] Suppression OK, rechargement...');
      await this.fetchAll();
    }
  }
});