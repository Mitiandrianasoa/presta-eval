import { defineStore } from 'pinia';
import api from '../api/api';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as any[],
    productDetails: {} as any
  }),
  actions: {
    async fetchProducts() {
      const res = await api.get('/products?output_format=JSON&display=full');
      this.products = res.data.products;
    },
    async fetchProductDetails(id: number) {
      const res = await api.get(`/products/${id}?output_format=JSON`);
      this.productDetails = res.data.product;
    },
    async createProduct(productData: any) {
      const res = await api.post('/products?output_format=JSON', productData);
      this.fetchProducts(); // Refresh the list
      return res.data.product;
    },
    async updateProduct(id: number, productData: any) {
      const res = await api.put(`/products/${id}?output_format=JSON`, productData);
      this.fetchProducts(); // Refresh the list
      return res.data.product;
    },
    async deleteProduct(id: number) {
      await api.delete(`/products/${id}?output_format=JSON`);
      this.fetchProducts(); // Refresh the list
    }
  }
});
