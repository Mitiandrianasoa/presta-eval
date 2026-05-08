// stores/productStore.ts
import { defineStore } from 'pinia';
import { simpleApi } from '../../api/SimpleApi'; // Assurez-vous que le chemin est correct

export const useProductStore = defineStore('product', {
  state: () => ({
    produits: [],    // Vos données en objets JavaScript simples
    loading: false,
    erreur: null
  }),

  actions: {
    async chargerProduits() {
      try {
        this.loading = true;
        
        // UNE SEULE LIGNE pour tout charger !
        this.produits = await simpleApi.getProducts();
        
        console.log('✅ Produits chargés:', this.produits);
        console.log('Exemple 1er produit:', this.produits[0]);
        // Vous verrez : { id: "1", nom: "T-shirt", prix: "19.99", ... }
        
      } catch (e) {
        this.erreur = e.message;
      } finally {
        this.loading = false;
      }
    },

    // Pour DEBUG - comprendre ce que vous recevez
    debugPremierProduit() {
      // Appelez ceci depuis la console du navigateur
      simpleApi.getProducts().then(produits => {
        console.table(produits); // Affiche un joli tableau
        produits[0]?.debug();    // Montre le XML brut du premier produit
      });
    }
  }
});