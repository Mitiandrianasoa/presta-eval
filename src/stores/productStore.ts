// stores/productStore.ts
import { defineStore } from 'pinia';
import api from '../api/api';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as any[],
    loading: false
  }),
  
  actions: {
    t(field: any, langId = 1): string {
      return Array.isArray(field) 
        ? (field.find((f: any) => f.id == langId)?.value || field[0]?.value || '')
        : (field || '');
    },

    async fetchAll(categoryId?: number) {
      this.loading = true;
      try {
        let url = '/products?output_format=JSON&display=full&limit=1000';
        if (categoryId) url += `&filter[id_category_default]=${categoryId}`;
        
        const [p, c, s] = await Promise.all([
          api.get(url),
          api.get('/categories?output_format=JSON&display=[id,name]&limit=1000'),
          api.get('/stock_availables?output_format=JSON&display=full&limit=1000')
        ]);

        const catMap: any = {};
        c.data.categories?.forEach((cat: any) => catMap[cat.id] = this.t(cat.name));

        const stockMap: any = {};
        s.data.stock_availables?.forEach((st: any) => stockMap[st.id_product] = parseInt(st.quantity) || 0);

        this.products = (p.data.products || []).map((prod: any) => ({
          ...prod,
          name: this.t(prod.name),
          category: catMap[prod.id_category_default] || '—',
          stock: stockMap[prod.id] || prod.quantity || 0,
          price_ttc: (parseFloat(prod.price) * 1.2).toFixed(2),
          img: prod.default_image ? `/api/images/products/${prod.id}/${prod.default_image}/small_default` : null
        }));

      } catch (e) { console.error(e) } 
      finally { this.loading = false; }
    },

    async save(data: any, id?: number) {
      const method = id ? api.put : api.post;
      const url = id ? `/products/${id}` : '/products';
      await method(`${url}?output_format=JSON`, { product: data });
      await this.fetchAll();
    },

    async remove(id: number) {
      await api.delete(`/products/${id}?output_format=JSON`);
      await this.fetchAll();
    }
  }
});