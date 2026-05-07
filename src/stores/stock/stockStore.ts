import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export interface Stock {
  id: string;
  id_product: string;
  id_product_attribute: string;
  quantity: number;
  product_name?: string;
}

export const useStockStore = defineStore('stock', {
  state: () => ({
    stocks: [] as Stock[],
    products: [] as any[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    // Récupérer tous les stocks avec info produits
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const [sRes, pRes] = await Promise.all([
          api.get('/stock_availables?output_format=XML&display=full&limit=5000'),
          api.get('/products?output_format=XML&display=[id,name]&limit=5000'),
        ]);

        // Parser les produits
        const productMap: Record<string, string> = {};
        parse(pRes.data).querySelectorAll('product').forEach(el => {
          const id = text(el, 'id');
          const name = el.querySelector('name language')?.textContent?.trim() || '';
          productMap[id] = name;
        });

        // Parser les stocks
        this.stocks = Array.from(parse(sRes.data).querySelectorAll('stock_available')).map(el => ({
          id: text(el, 'id'),
          id_product: text(el, 'id_product'),
          id_product_attribute: text(el, 'id_product_attribute'),
          quantity: parseInt(text(el, 'quantity')) || 0,
          product_name: productMap[text(el, 'id_product')] || 'Produit inconnu',
        }));
      } catch (e: any) {
        this.error = `Erreur : ${e.message}`;
        console.error(e);
      } finally {
        this.loading = false;
      }
    },

    // Mettre à jour la quantité d'un stock
    async updateQuantity(id: string, quantity: number) {
      try {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><stock_available>
  <id>${id}</id>
  <quantity>${quantity}</quantity>
</stock_available></prestashop>`;

        await api.put(`/stock_availables/${id}`, xml, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });

        // Mettre à jour localement
        const stock = this.stocks.find(s => s.id === id);
        if (stock) stock.quantity = quantity;
      } catch (error: any) {
        this.error = `Erreur mise à jour : ${error.response?.status}`;
        throw error;
      }
    },

    // Supprimer un stock (rarissime, généralement non permis)
    async removeStock(id: string) {
      try {
        await api.delete(`/stock_availables/${id}`);
        this.stocks = this.stocks.filter(s => s.id !== id);
      } catch (error: any) {
        this.error = `Erreur suppression : ${error.response?.status}`;
        throw error;
      }
    },

    // Augmenter le stock
    async increaseStock(id: string, amount: number) {
      const stock = this.stocks.find(s => s.id === id);
      if (stock) {
        await this.updateQuantity(id, stock.quantity + amount);
      }
    },

    // Réduire le stock
    async decreaseStock(id: string, amount: number) {
      const stock = this.stocks.find(s => s.id === id);
      if (stock) {
        const newQty = Math.max(0, stock.quantity - amount);
        await this.updateQuantity(id, newQty);
      }
    },

    // Réinitialiser un stock à 0
    async resetStock(id: string) {
      await this.updateQuantity(id, 0);
    },

    // Importer des stocks (générique)
    async bulkUpdateQuantities(updates: Array<{ id: string; quantity: number }>) {
      let success = 0;
      let failed = 0;

      for (const { id, quantity } of updates) {
        try {
          await this.updateQuantity(id, quantity);
          success++;
        } catch {
          failed++;
        }
      }

      this.error = failed > 0 ? `${success} succès, ${failed} erreurs` : null;
    }
  }
});
