// stores/productStore.ts
import { defineStore } from 'pinia';
import api from '../api/api';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as any[],
    loading: false
  }),
  
  actions: {
    t(field: any, langId = 2): string {
      return Array.isArray(field) 
        ? (field.find((f: any) => f.id == langId)?.value || field[0]?.value || '')
        : (field || '');
    },

    // ✅ GET = JSON (pas de problème)
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

  // stores/productStore.ts - save()
async save(data: any, id?: number) {
  try {
    const method = id ? api.put : api.post;
    const url = id ? `/products/${id}` : '/products';
    const name = data.name?.[0]?.value || data.name || '';
    
    let xmlPayload;
    
    if (id) {
      // ✅ MODIFICATION : ajouter <id> dans le XML
      xmlPayload = `<?xml version="1.0" encoding="UTF-8"?><prestashop><product><id>${id}</id><name><language id="1">${name}</language></name><price>${data.price || 0}</price><reference>${data.reference || ''}</reference><id_category_default>${data.id_category_default || 2}</id_category_default><active>${data.active || '1'}</active></product></prestashop>`;
    } else {
      // ✅ CRÉATION : pas d'id
      xmlPayload = `<?xml version="1.0" encoding="UTF-8"?><prestashop><product><name><language id="1">${name}</language></name><price>${data.price || 0}</price><reference>${data.reference || ''}</reference><id_category_default>${data.id_category_default || 2}</id_category_default><active>${data.active || '1'}</active></product></prestashop>`;
    }

    console.log('📤 URL:', url);
    console.log('📤 XML:', xmlPayload);

    const response = await method(url, xmlPayload, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' }
    });
    
    console.log('✅ Succès:', response.data);
    await this.fetchAll();
    
  } catch (error: any) {
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Data:', error.response?.data);
    throw error;
  }
},
    // ✅ DELETE = pas besoin de body
    async remove(id: number) {
      await api.delete(`/products/${id}?output_format=JSON`);
      await this.fetchAll();
    }
  }
});