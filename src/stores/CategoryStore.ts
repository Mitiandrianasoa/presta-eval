// stores/categoryStore.ts
import { defineStore } from 'pinia';
import api from '../api/api';

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [] as any[],
    loading: false
  }),
  
  actions: {
    t(field: any, langId = 2): string {
      return Array.isArray(field) 
        ? (field.find((f: any) => f.id == langId)?.value || field[0]?.value || '')
        : (field || '');
    },

    async fetchAll() {
      this.loading = true;
      try {
        const res = await api.get('/categories?output_format=JSON&display=full&limit=1000');
        this.categories = (res.data.categories || []).map((cat: any) => ({
          ...cat,
          name: this.t(cat.name),
          description: this.t(cat.description)
        }));
      } catch (e) { console.error(e) } 
      finally { this.loading = false; }
    },

    async save(data: any, id?: number) {
      try {
        const method = id ? api.put : api.post;
        const url = id ? `/categories/${id}` : '/categories';
        
        const name = data.name || 'Nouvelle catégorie';
        // ✅ Générer link_rewrite automatiquement
        const linkRewrite = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'categorie';
        
        const active = data.active || '1';
        
        let xmlPayload;
        if (id) {
          xmlPayload = `<?xml version="1.0" encoding="UTF-8"?><prestashop><category><id>${id}</id><name><language id="1"><![CDATA[${name}]]></language></name><link_rewrite><language id="1"><![CDATA[${linkRewrite}]]></language></link_rewrite><active>${active}</active><id_parent>2</id_parent></category></prestashop>`;
        } else {
          xmlPayload = `<?xml version="1.0" encoding="UTF-8"?><prestashop><category><name><language id="1"><![CDATA[${name}]]></language></name><link_rewrite><language id="1"><![CDATA[${linkRewrite}]]></language></link_rewrite><active>${active}</active><id_parent>2</id_parent></category></prestashop>`;
        }

        console.log('📤 URL:', url);
        console.log('📤 XML:', xmlPayload);

        const response = await method(url, xmlPayload, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });
        
        console.log('✅ Catégorie créée/modifiée');
        await this.fetchAll();
        
      } catch (error: any) {
        console.error('❌', error.response?.data);
        throw error;
      }
    },

    async remove(id: number) {
      await api.delete(`/categories/${id}`);
      await this.fetchAll();
    }
  }
});