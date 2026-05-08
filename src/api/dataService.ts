// api/dataService.ts
import { simpleApi } from "./SimpleApi";

class DataService {
  products: any[] = [];
  categories: any[] = [];
  stocks: any[] = [];
  loading = false;
  error: string | null = null;

  async loadAll() {
    this.loading = true;
    this.error = null;
    
    try {
      console.log('📡 Chargement de toutes les données...');
      
      const [products, categories, stocks] = await Promise.all([
        simpleApi.getAllData('/products?display=full&limit=1000'),
        simpleApi.getAllData('/categories?display=[id,name]&limit=1000'),
        simpleApi.getAllData('/stock_availables?display=full&limit=1000')
      ]);
      
      this.products = products;
      this.categories = categories;
      this.stocks = stocks;
      
      console.log('✅ Données chargées avec succès :');
      console.log(`   📦 ${products.length} produits`);
      console.log(`   📁 ${categories.length} catégories`);
      console.log(`   📊 ${stocks.length} stocks`);
      
      // ✅ DÉBOGAGE : Comprendre la structure des données
      if (products.length > 0) {
        console.log('🔍 PREMIER PRODUIT BRUT :');
        console.dir(products[0]);
        console.log('🔍 STRUCTURE DE NAME :');
        console.log(JSON.stringify(products[0].name, null, 2));
      }
      
      if (categories.length > 0) {
        console.log('🔍 PREMIÈRE CATÉGORIE BRUTE :');
        console.dir(categories[0]);
        console.log('🔍 STRUCTURE DE NAME :');
        console.log(JSON.stringify(categories[0].name, null, 2));
      }
      
    } catch (e: any) {
      this.error = e.message;
      console.error('❌ Erreur chargement :', e);
    } finally {
      this.loading = false;
    }
  }

  // ✅ FONCTION UNIVERSELLE pour extraire un nom (gère TOUS les formats)
  private extractName(field: any): string {
    if (!field) return 'Sans nom';
    
    // Cas 1 : Chaîne simple
    if (typeof field === 'string') return field;
    
    // Cas 2 : Objet avec langues { "1": "texte", "2": "texte" }
    if (field['2'] && typeof field['2'] === 'string') return field['2']; // Français
    if (field['1'] && typeof field['1'] === 'string') return field['1']; // Anglais
    
    // Cas 3 : Objet avec language { language: { "1": "texte", "2": "texte" } }
    if (field.language) {
      const lang = field.language;
      if (typeof lang === 'string') return lang;
      if (lang['2'] && typeof lang['2'] === 'string') return lang['2'];
      if (lang['1'] && typeof lang['1'] === 'string') return lang['1'];
      // Chercher la première valeur string
      const found = Object.values(lang).find(v => typeof v === 'string');
      if (found) return found;
    }
    
    // Cas 4 : Tableau [{ id: "1", "#text": "..." }]
    if (Array.isArray(field)) {
      const lang2 = field.find(item => 
        item?.id === '2' || item?.['@_id'] === '2'
      );
      if (lang2?.['#text']) return lang2['#text'];
      if (lang2?.value) return lang2.value;
      
      // Fallback : première langue trouvée
      if (field[0]?.['#text']) return field[0]['#text'];
      if (field[0]?.value) return field[0].value;
    }
    
    // Cas 5 : Objet avec #text
    if (field['#text']) return field['#text'];
    
    // Fallback : première valeur string trouvée
    const firstString = Object.values(field).find(v => typeof v === 'string');
    return firstString || 'Sans nom';
  }

  getProductName(product: any): string {
    return this.extractName(product?.name);
  }

  getCategoryName(categoryId: string | number): string {
    if (!categoryId) return 'Sans catégorie';
    
    const category = this.categories.find(
      c => String(c.id) === String(categoryId)
    );
    
    if (!category) return `ID: ${categoryId}`;
    
    return this.extractName(category.name);
  }

  getCategoryDisplayName(categoryId: string | number): string {
    return this.getCategoryName(categoryId); // Même chose, alias
  }

  getProductStock(productId: string | number): number {
    const stock = this.stocks.find(
      s => String(s.id_product) === String(productId)
    );
    return stock ? parseInt(stock.quantity || '0') : 0;
  }

  // ✅ Pour avoir des produits complets avec noms résolus
  getCompleteProduct(product: any) {
    return {
      ...product,
      displayName: this.getProductName(product),
      categoryName: this.getCategoryName(product.id_category_default),
      stock: this.getProductStock(product.id),
      priceTTC: (parseFloat(product.price || '0') * 1.2).toFixed(2)
    };
  }

  getProductsByCategory(categoryId: string | number): any[] {
    return this.products.filter(
      p => String(p.id_category_default) === String(categoryId)
    );
  }

  searchProducts(query: string): any[] {
    const searchTerm = query.toLowerCase();
    return this.products.filter(p => {
      const name = this.getProductName(p).toLowerCase();
      const reference = (p.reference || '').toLowerCase();
      return name.includes(searchTerm) || reference.includes(searchTerm);
    });
  }

  getAllProductsComplete(): any[] {
    return this.products.map(product => this.getCompleteProduct(product));
  }

   // ✅ CES MÉTHODES SONT DÉJÀ PRÊTES
  async createProduct(data: any) {
    const productData = {
      id_category_default: data.categoryId || 2,
      price: data.price || 0,
      active: data.active ? '1' : '0',
      name: {
        language: {
          '1': data.name || '',
          '2': data.name || ''
        }
      },
      reference: data.reference || ''
    };
    
    await simpleApi.create('/products', productData);
    await this.loadAll(); // Recharger les données
  }

  async updateProduct(id: string | number, data: any) {
    const productData = {
      id_category_default: data.categoryId || data.id_category_default || 2,
      price: data.price || 0,
      active: data.active ? '1' : '0',
      name: data.name || '',  // SimpleApi.buildXml() gère l'imbrication
      reference: data.reference || ''
    };
    
    await simpleApi.update('/products', id, productData);
    await this.loadAll(); // Recharger les données
  }

  async deleteProduct(id: string | number) {
    await simpleApi.remove('/products', id);
    await this.loadAll(); // Recharger les données
  }
}

export const dataService = new DataService();