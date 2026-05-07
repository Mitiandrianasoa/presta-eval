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
        // 1. Récupérer tous les IDs produits
        this.step = 'Récupération des produits...';
        const prodRes = await api.get('/products?output_format=JSON&display=[id]&limit=1000');
        const productIds: number[] = (prodRes.data.products || []).map((p: any) => parseInt(p.id));

        // 2. Récupérer tous les IDs catégories (hors root id=1 et home id=2)
        this.step = 'Récupération des catégories...';
        const catRes = await api.get('/categories?output_format=JSON&display=[id]&limit=1000');
        const categoryIds: number[] = (catRes.data.categories || [])
          .map((c: any) => parseInt(c.id))
          .filter((id: number) => id > 2);

        this.total = productIds.length + categoryIds.length;

        // 3. Supprimer les produits un par un
        this.step = 'Suppression des produits...';
        for (const id of productIds) {
          await api.delete(`/products/${id}`);
          this.progress++;
        }

        // 4. Supprimer les catégories un par un (ordre décroissant pour éviter les conflits parent/enfant)
        this.step = 'Suppression des catégories...';
        for (const id of [...categoryIds].sort((a, b) => b - a)) {
          await api.delete(`/categories/${id}`);
          this.progress++;
        }

        this.step = 'Terminé';
      } finally {
        this.loading = false;
      }
    }
  }
});
