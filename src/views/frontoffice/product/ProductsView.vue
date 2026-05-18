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
/* Styles identiques à votre version existante, je les garde ici */
.products-page { min-height: 100vh; background: var(--bg); }
.products-main { padding: 3rem 0 5rem; }
.page-header { margin-bottom: 2.5rem; }
.page-header h1 { font-size: 2rem; font-weight: 700; color: var(--navy); margin: 0 0 0.4rem; }
.page-header p { color: var(--muted); margin: 0; }
.filters-section { background: var(--surface); border: 1px solid var(--border); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; }
.search-bar-wrapper { position: relative; margin-bottom: 1.5rem; }
.search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--muted); }
.search-input { width: 100%; padding: 0.75rem 2.5rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; }
.clear-search-btn { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; }
.filter-controls { display: flex; gap: 1rem; flex-wrap: wrap; }
.filter-group { flex: 1; min-width: 180px; position: relative; }
.filter-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--muted); z-index: 1; }
.filter-select { width: 100%; padding: 0.65rem 1rem 0.65rem 2.25rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); font-family: inherit; }
.price-range { display: flex; align-items: center; gap: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.2rem 0.5rem 0.2rem 2.25rem; }
.price-input { width: 100px; padding: 0.45rem 0.5rem; border: none; background: transparent; font-family: inherit; }
.price-input:focus { outline: none; }
.price-separator { color: var(--muted); }
.reset-filters-btn { background: var(--primary); color: white; border: none; border-radius: 6px; padding: 0.65rem 1.25rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
.active-filters { margin-bottom: 1.5rem; padding: 0.75rem 1rem; background: var(--primary-light); border-radius: var(--radius); display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; border-left: 3px solid var(--primary); }
.filter-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.filter-tag { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.6rem; background: white; border: 1px solid #ddd6fe; border-radius: 20px; font-size: 0.8rem; }
.remove-filter { background: transparent; border: none; cursor: pointer; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
.results-info { margin-bottom: 1.5rem; font-size: 0.875rem; color: var(--muted); display: flex; align-items: center; gap: 0.5rem; }
.loading, .error { text-align: center; padding: 4rem; }
.loading i, .error i { font-size: 2rem; margin-bottom: 1rem; }
.error { color: var(--error); }
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.product-card { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; cursor: pointer; transition: all 0.2s ease; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-color: #c4b5fd; }
.product-image { position: relative; height: 200px; overflow: hidden; background: var(--bg); }
.product-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.product-card:hover .product-image img { transform: scale(1.05); }
.sale-badge, .hot-badge, .new-badge { position: absolute; right: 10px; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; z-index: 2; }
.sale-badge { top: 10px; background: var(--error); color: white; }
.hot-badge { top: 50px; background: #ff4757; color: white; }
.new-badge { top: 50px; background: #2ed573; color: white; }
.product-info { padding: 1.25rem 1.5rem 1.5rem; }
.product-info h3 { margin: 0 0 0.4rem; color: var(--navy); font-size: 1rem; font-weight: 600; }
.product-description { color: var(--muted); font-size: 0.825rem; margin-bottom: 0.875rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-price { margin-bottom: 0.875rem; display: flex; align-items: baseline; gap: 0.5rem; }
.price { font-size: 1.15rem; font-weight: 700; color: var(--success); }
.old-price { font-size: 0.875rem; color: #94a3b8; text-decoration: line-through; }
.product-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.775rem; }
.reference { color: var(--muted); display: flex; align-items: center; gap: 0.25rem; }
.stock { display: flex; align-items: center; gap: 0.25rem; }
.stock.available { color: var(--success); font-weight: 600; }
.stock.unavailable { color: var(--error); font-weight: 600; }
.add-to-cart-btn { width: 100%; background: var(--primary); color: white; border: none; padding: 0.7rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s; }
.add-to-cart-btn:hover:not(:disabled) { background: var(--primary-dark); }
.add-to-cart-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.no-results { text-align: center; padding: 5rem 2rem; }
.reset-btn { background: var(--primary); color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
.front-footer { background: var(--navy); color: white; padding: 3rem 0 1.5rem; margin-top: auto; }
.footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
.footer-bottom { text-align: center; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); }
.container { max-width: 1280px; margin: 0 auto; padding: 0 1rem; }
:root { --bg: #fafaf9; --surface: #ffffff; --border: #e7e5e4; --text: #292524; --muted: #78716c; --navy: #1c1917; --primary: #7c3aed; --primary-dark: #6d28d9; --primary-light: #f5f3ff; --success: #059669; --error: #dc2626; --radius: 8px; --radius-lg: 14px; }
@media (max-width: 768px) { .filter-controls { flex-direction: column; } .reset-filters-btn { width: 100%; justify-content: center; } .products-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .products-grid { grid-template-columns: 1fr; } }
</style>