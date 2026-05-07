import { defineStore } from 'pinia';
import api from '../api/api';

export const useResetStore = defineStore('reset', {
  state: () => ({
    loading: false,
    progress: 0,
    total: 0,
    step: '' as string
  }),

  actions: {
    async resetAll() {
      this.loading = true;
      this.progress = 0;
      this.total = 0;

      try {
        // Helper function pour parser XML
        const parseXMLResponse = (xmlString: string, tagName: string) => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
          const elements = xmlDoc.getElementsByTagName(tagName);
          return Array.from(elements).map(el => ({
            id: el.getElementsByTagName('id')[0]?.textContent || ''
          }));
        };

        // 1. Récupérer tous les IDs produits en XML
        this.step = 'Récupération des produits...';
        const prodRes = await api.get('/products?output_format=XML&display=[id]&limit=1000');
        const productData = parseXMLResponse(prodRes.data, 'product');
        const productIds: number[] = productData.map(p => parseInt(p.id)).filter(id => !isNaN(id));

        // 2. Récupérer tous les IDs catégories en XML
        this.step = 'Récupération des catégories...';
        const catRes = await api.get('/categories?output_format=XML&display=[id]&limit=1000');
        const categoryData = parseXMLResponse(catRes.data, 'category');
        const categoryIds: number[] = categoryData
          .map(c => parseInt(c.id))
          .filter((id: number) => !isNaN(id) && id > 2);

        this.total = productIds.length + categoryIds.length;

        console.log(`Produits trouvés: ${productIds.length}`);
        console.log(`Catégories trouvées: ${categoryIds.length}`);

        // 3. Supprimer les produits un par un
        this.step = 'Suppression des produits...';
        for (const id of productIds) {
          await api.delete(`/products/${id}`);
          this.progress++;
        }

        // 4. Supprimer les catégories un par un (ordre décroissant)
        this.step = 'Suppression des catégories...';
        for (const id of [...categoryIds].sort((a, b) => b - a)) {
          await api.delete(`/categories/${id}`);
          this.progress++;
        }

        this.step = 'Terminé';
      } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        this.step = `Erreur: ${error}`;
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});