// stores/categoryStore.ts
import { defineStore } from 'pinia';
import api from '../api/api';

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [] as any[],
    loading: false
  }),
  
  actions: {
    // Helper multilingue
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
      const method = id ? api.put : api.post;
      const url = id ? `/categories/${id}` : '/categories';
      await method(`${url}?output_format=JSON`, { category: data });
      await this.fetchAll();
    },

    async remove(id: number) {
      await api.delete(`/categories/${id}?output_format=JSON`);
      await this.fetchAll();
    }
  }
});