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

// Nouvelle interface pour les mouvements de stock
export interface StockMovement {
  date: string;
  employee: string;
  quantity: number;
  reason?: string;
}

export const useStockStore = defineStore('stock', {
  state: () => ({
    stocks: [] as Stock[],
    products: [] as any[],
    stockMovements: [] as StockMovement[],
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
    },

    // Récupérer les mouvements de stock pour un stock spécifique
    async fetchStockMovements(idStock: string, limit: number = 50) {
      try {
        const response = await api.get(
          `/stock_movements?output_format=XML&display=full&filter[id_stock]=${idStock}&sort=date_add_DESC&limit=${limit}`
        );
        
        const xmlDoc = parse(response.data);
        const movements = xmlDoc.querySelectorAll('stock_mvt');
        
        this.stockMovements = Array.from(movements).map(mvt => {
          const physicalQuantity = parseInt(text(mvt, 'physical_quantity')) || 0;
          const sign = parseInt(text(mvt, 'sign')) || 1;
          const quantity = physicalQuantity * sign;
          
          const dateAdd = text(mvt, 'date_add');
          const formattedDate = new Date(dateAdd).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          return {
            date: formattedDate,
            employee: `${text(mvt, 'employee_firstname')} ${text(mvt, 'employee_lastname')}`.trim() || '—',
            quantity: quantity,
            reason: text(mvt, 'id_stock_mvt_reason'),
          };
        });
      } catch (error: any) {
        this.error = `Erreur récupération mouvements : ${error.message}`;
        console.error('Erreur fetchStockMovements:', error);
        this.stockMovements = [];
        throw error;
      }
    },

    // Dans le store stock.ts, modifiez fetchAllStockMovements

async fetchAllStockMovements(limit: number = 100) {
  try {
    const response = await api.get('/stock_movements', {
      params: {
        output_format: 'XML',
        display: 'full',
        sort: 'date_add_DESC',
        limit: limit
      }
    });

    const xmlDoc = parse(response.data);
    const movements = xmlDoc.querySelectorAll('stock_mvt');
    
    this.stockMovements = Array.from(movements).map(mvt => {
      const physicalQuantity = parseInt(text(mvt, 'physical_quantity')) || 0;
      const sign = parseInt(text(mvt, 'sign')) || 1;
      const quantity = physicalQuantity * sign;
      
      const dateAdd = text(mvt, 'date_add');
      
      return {
        date: dateAdd,  // Format brut: "2026-05-07 20:42:54"
        employee: `${text(mvt, 'employee_firstname')} ${text(mvt, 'employee_lastname')}`.trim(),
        quantity: quantity,
        reason: text(mvt, 'id_stock_mvt_reason'),
      };
    });
    
  } catch (error: any) {
    console.error('Erreur fetchAllStockMovements:', error);
    this.stockMovements = [];
    throw error;
  }
    }
  }
});