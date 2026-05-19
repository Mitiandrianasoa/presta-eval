<template>
  <div class="products-page">
    <FrontHeader />

    <main class="products-main">
      <div class="container">
        <div class="page-header">
          <h1>Nos Produits</h1>
          <p>Découvrez notre sélection de produits de qualité</p>
        </div>

        <!-- Filtres multicritères -->
        <div class="filters-section">
          <div class="search-bar-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un produit par nom..."
              class="search-input"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="filter-controls">
            <div class="filter-group">
              <i class="fas fa-tags filter-icon"></i>
              <select v-model="selectedCategory" class="filter-select">
                <option value="">Toutes les catégories</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            
            <div class="filter-group">
              <i class="fas fa-money-bill-wave filter-icon"></i>
              <div class="price-range">
                <input v-model.number="priceMin" type="number" placeholder="Min" class="price-input" min="0" step="100" />
                <span class="price-separator">-</span>
                <input v-model.number="priceMax" type="number" placeholder="Max" class="price-input" min="0" step="100" />
              </div>
            </div>
            
            <div class="filter-group">
              <i class="fas fa-sort-amount-down-alt filter-icon"></i>
              <select v-model="sortBy" class="filter-select">
                <option value="name-asc">Nom (A-Z)</option>
                <option value="name-desc">Nom (Z-A)</option>
                <option value="price-asc">Prix (croissant)</option>
                <option value="price-desc">Prix (décroissant)</option>
              </select>
            </div>

            <button @click="resetFilters" class="reset-filters-btn">
              <i class="fas fa-undo-alt"></i>
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        <!-- Filtres actifs -->
        <div v-if="hasActiveFilters" class="active-filters">
          <i class="fas fa-filter active-filters-icon"></i>
          <span class="active-filters-label">Filtres actifs :</span>
          <div class="filter-tags">
            <span v-if="searchQuery" class="filter-tag">
              <i class="fas fa-search"></i>"{{ searchQuery }}"
              <button @click="searchQuery = ''" class="remove-filter"><i class="fas fa-times"></i></button>
            </span>
            <span v-if="selectedCategory" class="filter-tag">
              <i class="fas fa-tag"></i>{{ getCategoryName(selectedCategory) }}
              <button @click="selectedCategory = ''" class="remove-filter"><i class="fas fa-times"></i></button>
            </span>
            <span v-if="priceMin !== null || priceMax !== null" class="filter-tag">
              <i class="fas fa-money-bill-wave"></i>{{ formatPriceRange() }}
              <button @click="clearPriceRange" class="remove-filter"><i class="fas fa-times"></i></button>
            </span>
          </div>
        </div>
 
        <!-- Résultats -->
        <div class="results-info">
          <i class="fas fa-chart-line"></i>
          <span v-if="!loading">{{ filteredProducts.length }} produit(s) trouvé(s)</span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Chargement des produits...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ error }}</p>
        </div>

        <!-- Grille des produits -->
        <div v-else-if="filteredProducts.length > 0" class="products-grid">
          <div v-for="product in filteredProducts" :key="product.id" class="product-card" @click="goToProduct(product.id)">
            <div class="product-image">
              <img :src="product.image_url || '/placeholder-product.jpg'" :alt="product.name" @error="handleImageError" />
              <div v-if="product.on_sale" class="sale-badge"><i class="fas fa-tag"></i> Promo</div>
              <div v-if="getAvailabilityBadge(product.date_add) === 'HOT'" class="hot-badge"><i class="fas fa-fire"></i> HOT</div>
              <div v-else-if="getAvailabilityBadge(product.date_add) === 'NEW'" class="new-badge"><i class="fas fa-star"></i> NEW</div>
            </div>
            
            <div class="product-info">
              <h3>{{ product.name }}</h3>
              <p class="product-description">{{ product.description_short || product.description }}</p>
              <div class="product-price">
                <span class="price">{{ formatPrice(product.price) }}</span>
                <span v-if="product.wholesale_price && product.wholesale_price !== product.price" class="old-price">
                  {{ formatPrice(product.wholesale_price) }}
                </span>
              </div>
              <div class="product-meta">
                <span class="reference"><i class="fas fa-barcode"></i> Ref: {{ product.reference }}</span>
                <span v-if="product.totalStock > 0" class="stock available">
                  <i class="fas fa-check-circle"></i> Stock: {{ product.totalStock }}
                </span>
                <span v-else class="stock unavailable">
                  <i class="fas fa-times-circle"></i> Rupture
                </span>
              </div>
              <!-- <button class="add-to-cart-btn" @click.stop="addToCart(product)" :disabled="product.totalStock <= 0">
                <i class="fas fa-shopping-cart"></i>
                {{ product.totalStock > 0 ? 'Ajouter' : 'Indisponible' }}
              </button> -->
            </div>
          </div>
        </div>

        <!-- Aucun résultat -->
        <div v-else class="no-results">
          <i class="fas fa-search fa-3x"></i>
          <h3>Aucun produit trouvé</h3>
          <p>Aucun produit ne correspond à vos critères de recherche</p>
          <button @click="resetFilters" class="reset-btn"><i class="fas fa-undo-alt"></i> Réinitialiser</button>
        </div>
      </div>
    </main>

    <footer class="front-footer">
      <div class="container">
        <div class="footer-grid">
          <div><h3>PrestaShop</h3><p>Votre boutique de confiance</p></div>
          <div>
            <h4>Liens utiles</h4>
            <ul>
              <li><router-link to="/"><i class="fas fa-home"></i> Accueil</router-link></li>
              <li><router-link to="/products"><i class="fas fa-box"></i> Produits</router-link></li>
              <li><router-link to="/cart"><i class="fas fa-shopping-cart"></i> Panier</router-link></li>
              <li><router-link to="/orders"><i class="fas fa-truck"></i> Commandes</router-link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <p><i class="fas fa-envelope"></i> contact@prestashop.com</p>
            <p><i class="fas fa-phone"></i> +261 00 000 000</p>
          </div>
        </div>
        <div class="footer-bottom"><p>&copy; 2025 PrestaShop. Tous droits réservés.</p></div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';
import FrontHeader from '../../../components/FrontHeader.vue';

const router = useRouter();

const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

// Filtres
const searchQuery = ref('');
const selectedCategory = ref('');
const priceMin = ref<number | null>(null);
const priceMax = ref<number | null>(null);
const sortBy = ref('name-asc');

const hasActiveFilters = computed(() => !!(searchQuery.value || selectedCategory.value || priceMin.value !== null || priceMax.value !== null));

const getCategoryName = (categoryId: string) => categories.value.find(c => c.id === categoryId)?.name || categoryId;

const formatPriceRange = () => {
  if (priceMin.value !== null && priceMax.value !== null) return `${formatPriceNumber(priceMin.value)} - ${formatPriceNumber(priceMax.value)}`;
  if (priceMin.value !== null) return `≥ ${formatPriceNumber(priceMin.value)}`;
  if (priceMax.value !== null) return `≤ ${formatPriceNumber(priceMax.value)}`;
  return '';
};

const clearPriceRange = () => { priceMin.value = null; priceMax.value = null; };

const filteredProducts = computed(() => {
  let filtered = products.value;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
  }
  if (selectedCategory.value) filtered = filtered.filter(p => p.id_category_default === selectedCategory.value);
  if (priceMin.value !== null || priceMax.value !== null) {
    filtered = filtered.filter(p => {
      const price = parseFloat(p.price);
      if (isNaN(price)) return false;
      if (priceMin.value !== null && price < priceMin.value) return false;
      if (priceMax.value !== null && price > priceMax.value) return false;
      return true;
    });
  }
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'price-asc': return parseFloat(a.price || '0') - parseFloat(b.price || '0');
      case 'price-desc': return parseFloat(b.price || '0') - parseFloat(a.price || '0');
      default: return 0;
    }
  });
  return filtered;
});

const loadProducts = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [pRes, stockRes] = await Promise.all([
      api.get('/products?output_format=XML&display=full&limit=100'),
      api.get('/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute,quantity]&limit=1000'),
    ]);

    const parser = new DOMParser();
    const stockXml = parser.parseFromString(stockRes.data, 'text/xml');
    const stockMap: Record<string, number> = {};
    stockXml.querySelectorAll('stock_available').forEach(el => {
      const pid = el.querySelector('id_product')?.textContent?.trim() || '';
      const attrId = el.querySelector('id_product_attribute')?.textContent?.trim() || '0';
      const qty = parseInt(el.querySelector('quantity')?.textContent?.trim() || '0');
      const key = `${pid}_${attrId}`;
      stockMap[key] = qty;
    });

    const xmlDoc = parser.parseFromString(pRes.data, 'text/xml');
    const productElements = xmlDoc.querySelectorAll('product');

    products.value = Array.from(productElements).map(el => {
      const productId = el.querySelector('id')?.textContent?.trim() || '';
      const imageId = el.querySelector('associations images image id')?.textContent?.trim() || el.querySelector('image id')?.textContent?.trim();
      let price = el.querySelector('price')?.textContent?.trim() || '0';
      price = price.replace(',', '.');
      
      // Calculer le stock total (produit simple + combinaisons)
      let totalStock = stockMap[`${productId}_0`] || 0;
      // Ajouter les stocks des combinaisons
      for (const [key, qty] of Object.entries(stockMap)) {
        if (key.startsWith(`${productId}_`) && key !== `${productId}_0`) {
          totalStock += qty;
        }
      }

      return {
        id: productId,
        name: el.querySelector('name')?.textContent?.trim() || '',
        description: el.querySelector('description')?.textContent?.trim() || '',
        description_short: el.querySelector('description_short')?.textContent?.trim() || '',
        price: price,
        wholesale_price: el.querySelector('wholesale_price')?.textContent?.trim() || '',
        reference: el.querySelector('reference')?.textContent?.trim() || '',
        totalStock: totalStock,
        id_category_default: el.querySelector('id_category_default')?.textContent?.trim() || '',
        on_sale: el.querySelector('on_sale')?.textContent?.trim() === '1',
        image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null,
        date_add: el.querySelector('available_date')?.textContent?.trim() || '',  
      };
    });
  } catch (err: any) {
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  try {
    const response = await api.get('/categories?output_format=XML&display=full&limit=50');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const categoryElements = xmlDoc.querySelectorAll('category');
    categories.value = Array.from(categoryElements)
      .filter(el => { const id = el.querySelector('id')?.textContent?.trim(); return id && id !== '1' && id !== '2'; })
      .map(el => ({ id: el.querySelector('id')?.textContent?.trim() || '', name: el.querySelector('name')?.textContent?.trim() || '' }));
  } catch (err) { console.error('Erreur catégories:', err); }
};

// const getAvailabilityBadge = (date: string): 'HOT' | 'NEW' | null => {
//   if (!date || date === '0000-00-00') return null;
//   const productDate = new Date(date.split(' ')[0]);
//   const now = new Date();
//   const diffDays = Math.floor((now.setHours(0,0,0,0) - productDate.setHours(0,0,0,0)) / (1000*60*60*24));
//   if (diffDays <= 1 && diffDays >= 0) return 'HOT';
//   if (diffDays <= 7 && diffDays > 1) return 'NEW';
//   return null;
// };
// Remplace ta fonction actuelle par celle-ci
const getAvailabilityBadge = (availableDate: string): 'HOT' | 'NEW' | null => {
  if (!availableDate || availableDate === '0000-00-00') return null;
  
  // Nettoyer la date
  let cleanDate = availableDate.split(' ')[0];
  
  // Convertir la date (supporte DD/MM/YYYY et YYYY-MM-DD)
  let productDate;
  if (cleanDate.includes('/')) {
    const [day, month, year] = cleanDate.split('/');
    productDate = new Date(`${year}-${month}-${day}`);
  } else {
    productDate = new Date(cleanDate);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  productDate.setHours(0, 0, 0, 0);
  
  // Calculer la différence en jours
  const diffTime = today.getTime() - productDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  console.log(`📅 Produit: date=${cleanDate}, diff=${diffDays} jours`);
  
  // ✅ NOUVELLE RÈGLE: HOT = 1 jour ou moins
  if (diffDays <= 1) {
    return 'HOT';
  } else if (diffDays >= 2 && diffDays <= 7) {
    return 'NEW';
  }
  
  return null;
};

const cart = ref<any[]>([]);

const loadCart = () => {
  const savedCart = localStorage.getItem('prestashop_cart');
  if (savedCart) cart.value = JSON.parse(savedCart);
};

const saveCart = () => localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));

const addToCart = (product: any) => {
  const productToAdd = {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.image_url,
    quantity: 1,
    reference: product.reference,
    id_product_attribute: '0',
    combination_name: null,
    combination_reference: null
  };
  const existingIndex = cart.value.findIndex(item => item.id === productToAdd.id && String(item.id_product_attribute) === String(productToAdd.id_product_attribute));
  if (existingIndex !== -1) cart.value[existingIndex].quantity++;
  else cart.value.push(productToAdd);
  saveCart();
};

const goToProduct = (id: string) => router.push(`/product/${id}`);

const resetFilters = () => { searchQuery.value = ''; selectedCategory.value = ''; priceMin.value = null; priceMax.value = null; sortBy.value = 'name-asc'; };

const formatPrice = (price: string) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(price));
const formatPriceNumber = (price: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);

const handleImageError = (e: Event) => { (e.target as HTMLImageElement).src = '/placeholder-product.jpg'; };

onMounted(() => { loadProducts(); loadCategories(); loadCart(); });
</script>

<style scoped>

.products-page { background: #07070e; min-height: 100vh; color: #e8e8f5; padding-bottom: 4rem; }

.page-header {
  background: linear-gradient(160deg, #0c0c18, #07070e);
  border-bottom: 1px solid #1e1e35;
  padding: 3rem 0 2rem;
}
.page-header h1 { font-size: 1.75rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.5rem; }
.page-header p { color: #5a5a85; margin: 0; }

.page-body { padding: 2rem 0; }
.page-layout { display: flex; gap: 2rem; align-items: flex-start; }

/* Filters sidebar */
.filters-panel {
  width: 240px;
  flex-shrink: 0;
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 12px;
  padding: 1.5rem;
}
.filters-panel h3 { font-size: 0.8rem; font-weight: 700; color: #5a5a85; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 1rem; }
.filter-group { margin-bottom: 1.5rem; }
.filter-group label { display: block; font-size: 0.8rem; color: #8080b0; margin-bottom: 0.5rem; }
.filter-input, .filter-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #07070e;
  border: 1px solid #1e1e35;
  border-radius: 6px;
  color: #e8e8f5;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}
.filter-input:focus, .filter-select:focus { outline: none; border-color: #a78bfa; }
.filter-select option { background: #0e0e1a; }
.reset-btn {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid #1e1e35;
  border-radius: 6px;
  color: #5a5a85;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}
.reset-btn:hover { border-color: #a78bfa; color: #a78bfa; }

/* Main content */
.products-main { flex: 1; min-width: 0; }
.results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.results-count { font-size: 0.875rem; color: #5a5a85; }
.sort-select {
  padding: 0.4rem 0.75rem;
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 6px;
  color: #e8e8f5;
  font-size: 0.875rem;
}
.sort-select option { background: #0e0e1a; }

/* Grid */
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
.product-card {
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.product-card:hover {
  border-color: rgba(167,139,250,0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.product-img-wrap { aspect-ratio: 1; background: #15152a; overflow: hidden; position: relative; }
.product-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.product-card:hover .product-img-wrap img { transform: scale(1.04); }
.img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; opacity: 0.25; }
.product-body { padding: 1rem; }
.product-name { font-size: 0.875rem; font-weight: 600; color: #e8e8f5; margin: 0 0 0.3rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-ref { font-size: 0.72rem; color: #5a5a85; margin: 0 0 0.6rem; }
.product-price { font-size: 1.05rem; font-weight: 700; color: #f59e0b; margin: 0 0 0.75rem; }
.product-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.stock-tag { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 10px; }
.stock-tag.in { background: rgba(52,211,153,0.12); color: #34d399; }
.stock-tag.out { background: rgba(248,113,113,0.1); color: #f87171; }
.cart-btn {
  padding: 0.4rem 0.75rem;
  background: rgba(167,139,250,0.12);
  border: none;
  border-radius: 6px;
  color: #a78bfa;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}
.cart-btn:hover { background: rgba(167,139,250,0.22); }

/* States */
.loading-state, .empty-state { text-align: center; padding: 4rem 2rem; color: #5a5a85; }
.spinner { width: 36px; height: 36px; border: 2px solid #1e1e35; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.pagination { display: flex; justify-content: center; gap: 0.5rem; margin-top: 2.5rem; }
.page-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 6px;
  color: #8080b0;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover, .page-btn.active { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.3); color: #a78bfa; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* Toast */
.toast {
  position: fixed; bottom: 2rem; right: 2rem;
  background: #0e0e1a; border: 1px solid #1e1e35;
  border-radius: 10px; padding: 0.85rem 1.2rem;
  display: flex; align-items: center; gap: 0.75rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  z-index: 9999; font-size: 0.875rem; color: #e8e8f5;
  animation: slideUp 0.3s ease;
}
@keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

</style>