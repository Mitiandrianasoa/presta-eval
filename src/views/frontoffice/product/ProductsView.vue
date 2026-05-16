<template>
  <div class="products-page">
    <!-- Header -->
    <FrontHeader />

    <main class="products-main">
      <div class="container">
        <!-- En-tête de la page -->
        <div class="page-header">
          <h1>Nos Produits</h1>
          <p>Découvrez notre sélection de produits de qualité</p>
        </div>

        <!-- Filtres multicritères -->
        <div class="filters-section">
          <!-- Barre de recherche par nom -->
          <div class="search-bar-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un produit par nom..."
              class="search-input"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="clear-search-btn"
              title="Effacer la recherche"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="filter-controls">
            <!-- Filtre par catégorie -->
            <div class="filter-group">
              <i class="fas fa-tags filter-icon"></i>
              <select v-model="selectedCategory" class="filter-select">
                <option value="">Toutes les catégories</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            
            <!-- Intervalle de prix -->
            <div class="filter-group">
              <i class="fas fa-money-bill-wave filter-icon"></i>
              <div class="price-range">
                <input
                  v-model.number="priceMin"
                  type="number"
                  placeholder="Min"
                  class="price-input"
                  min="0"
                  step="100"
                />
                <span class="price-separator">-</span>
                <input
                  v-model.number="priceMax"
                  type="number"
                  placeholder="Max"
                  class="price-input"
                  min="0"
                  step="100"
                />
              </div>
            </div>
            
            <!-- Tri -->
            <div class="filter-group">
              <i class="fas fa-sort-amount-down-alt filter-icon"></i>
              <select v-model="sortBy" class="filter-select">
                <option value="name-asc">Nom (A-Z)</option>
                <option value="name-desc">Nom (Z-A)</option>
                <option value="price-asc">Prix (croissant)</option>
                <option value="price-desc">Prix (décroissant)</option>
              </select>
            </div>

            <!-- Bouton réinitialisation -->
            <button @click="resetFilters" class="reset-filters-btn" title="Réinitialiser tous les filtres">
              <i class="fas fa-undo-alt"></i>
              <span>Réinitialiser</span>
            </button>
          </div>

          <!-- Filtres attributs (couleur / taille) -->
          <div v-if="colorOptions.length > 0 || sizeOptions.length > 0" class="attribute-filters">
            <div v-if="colorOptions.length > 0" class="attr-filter-row">
              <span class="attr-label"><i class="fas fa-palette"></i> Couleur :</span>
              <div class="attr-chips">
                <button
                  v-for="opt in colorOptions"
                  :key="opt.id"
                  class="attr-chip"
                  :class="{ active: selectedColors.includes(opt.id) }"
                  @click="toggleColor(opt.id)"
                >{{ opt.name }}</button>
              </div>
            </div>
            <div v-if="sizeOptions.length > 0" class="attr-filter-row">
              <span class="attr-label"><i class="fas fa-ruler-combined"></i> Taille :</span>
              <div class="attr-chips">
                <button
                  v-for="opt in sizeOptions"
                  :key="opt.id"
                  class="attr-chip size-chip"
                  :class="{ active: selectedSizes.includes(opt.id) }"
                  @click="toggleSize(opt.id)"
                >{{ opt.name }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Filtres actifs -->
        <div v-if="hasActiveFilters" class="active-filters">
          <i class="fas fa-filter active-filters-icon"></i>
          <span class="active-filters-label">Filtres actifs :</span>
          <div class="filter-tags">
            <span v-if="searchQuery" class="filter-tag">
              <i class="fas fa-search"></i>
              "{{ searchQuery }}"
              <button @click="searchQuery = ''" class="remove-filter">
                <i class="fas fa-times"></i>
              </button>
            </span>
            <span v-if="selectedCategory" class="filter-tag">
              <i class="fas fa-tag"></i>
              {{ getCategoryName(selectedCategory) }}
              <button @click="selectedCategory = ''" class="remove-filter">
                <i class="fas fa-times"></i>
              </button>
            </span>
            <span v-if="priceMin !== null || priceMax !== null" class="filter-tag">
              <i class="fas fa-money-bill-wave"></i>
              {{ formatPriceRange() }}
              <button @click="clearPriceRange" class="remove-filter">
                <i class="fas fa-times"></i>
              </button>
            </span>
            <span v-for="colorId in selectedColors" :key="'c' + colorId" class="filter-tag">
              <i class="fas fa-palette"></i>
              {{ getColorName(colorId) }}
              <button @click="toggleColor(colorId)" class="remove-filter">
                <i class="fas fa-times"></i>
              </button>
            </span>
            <span v-for="sizeId in selectedSizes" :key="'s' + sizeId" class="filter-tag">
              <i class="fas fa-ruler-combined"></i>
              {{ getSizeName(sizeId) }}
              <button @click="toggleSize(sizeId)" class="remove-filter">
                <i class="fas fa-times"></i>
              </button>
            </span>
          </div>
        </div>

        <!-- Résultats -->
        <div class="results-info">
          <i class="fas fa-chart-line"></i>
          <span v-if="!loading">
            {{ filteredProducts.length }} produit(s) trouvé(s)
          </span>
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
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            class="product-card"
            @click="goToProduct(product.id)"
          >
            <div class="product-image">
              <img 
                :src="product.image_url || '/placeholder-product.jpg'" 
                :alt="product.name"
                @error="handleImageError"
              />
              <div v-if="product.on_sale" class="sale-badge">
                <i class="fas fa-tag"></i> Promo
              </div>
              <div v-if="getAvailabilityBadge(product.available_date) === 'HOT'" class="hot-badge">
                <i class="fas fa-fire"></i> HOT
              </div>
              <div v-else-if="getAvailabilityBadge(product.available_date) === 'NEW'" class="new-badge">
                <i class="fas fa-star"></i> NEW
              </div>
            </div>
            
            <div class="product-info">
              <h3>{{ product.name }}</h3>
              <p class="product-description">
                {{ product.description_short || product.description }}
              </p>
              <div class="product-price">
                <span v-if="product.price" class="price">
                  {{ formatPrice(product.price) }}
                </span>
                <span v-if="product.wholesale_price && product.wholesale_price !== product.price" class="old-price">
                  {{ formatPrice(product.wholesale_price) }}
                </span>
              </div>
              <div class="product-meta">
                <span v-if="product.reference" class="reference">
                  <i class="fas fa-barcode"></i> Ref: {{ product.reference }}
                </span>
                <span v-if="product.quantity && product.quantity > 0" class="stock available">
                  <i class="fas fa-check-circle"></i> En stock
                </span>
                <span v-else class="stock unavailable">
                  <i class="fas fa-times-circle"></i> Rupture de stock
                </span>
              </div>
              <button 
                class="add-to-cart-btn" 
                @click.stop="addToCart(product)"
                :disabled="!product.quantity || product.quantity <= 0"
              >
                <i class="fas fa-shopping-cart"></i>
                {{ product.quantity && product.quantity > 0 ? 'Ajouter au panier' : 'Indisponible' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Aucun résultat -->
        <div v-else class="no-results">
          <i class="fas fa-search fa-3x"></i>
          <h3>Aucun produit trouvé</h3>
          <p>Aucun produit ne correspond à vos critères de recherche</p>
          <button @click="resetFilters" class="reset-btn">
            <i class="fas fa-undo-alt"></i>
            Réinitialiser tous les filtres
          </button>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="front-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h3>PrestaShop</h3>
            <p>Votre boutique de confiance</p>
          </div>
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
        <div class="footer-bottom">
          <p>&copy; 2025 PrestaShop. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';
import FrontHeader from '../../../components/FrontHeader.vue';
import { useAuth } from '../../../services/useAuth';
import { guestCartService } from '../../../services/guestCartService';

const router = useRouter();

const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

// Filtres multicritères
const searchQuery = ref('');
const selectedCategory = ref('');
const priceMin = ref<number | null>(null);
const priceMax = ref<number | null>(null);
const sortBy = ref('name-asc');

// Filtres par attributs (couleur, taille)
const selectedColors = ref<string[]>([]);
const selectedSizes = ref<string[]>([]);
const colorOptions = ref<{ id: string; name: string }[]>([]);
const sizeOptions = ref<{ id: string; name: string }[]>([]);
const productOptionsMap = ref<Record<string, string[]>>({});

// Vérifier si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return !!(
    searchQuery.value ||
    selectedCategory.value ||
    priceMin.value !== null ||
    priceMax.value !== null ||
    selectedColors.value.length > 0 ||
    selectedSizes.value.length > 0
  );
});

// Panier
const cart = ref<any[]>([]);

// Obtenir le nom d'une catégorie
const getCategoryName = (categoryId: string) => {
  const category = categories.value.find(c => c.id === categoryId);
  return category ? category.name : categoryId;
};

// Formater l'affichage de l'intervalle de prix
const formatPriceRange = () => {
  if (priceMin.value !== null && priceMax.value !== null) {
    return `${formatPriceNumber(priceMin.value)} - ${formatPriceNumber(priceMax.value)}`;
  } else if (priceMin.value !== null) {
    return `�?� ${formatPriceNumber(priceMin.value)}`;
  } else if (priceMax.value !== null) {
    return `�?� ${formatPriceNumber(priceMax.value)}`;
  }
  return '';
};

// Effacer l'intervalle de prix
const clearPriceRange = () => {
  priceMin.value = null;
  priceMax.value = null;
};

// Produits filtrés et triés
const filteredProducts = computed(() => {
  let filtered = products.value;

  // 1. Filtrer par nom (recherche)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(query)
    );
  }

  // 2. Filtrer par catégorie
  if (selectedCategory.value) {
    filtered = filtered.filter(product => 
      product.id_category_default === selectedCategory.value
    );
  }

  // 3. Filtrer par intervalle de prix
  filtered = filtered.filter(product => {
    const price = parseFloat(product.price);
    
    // Vérifier si le prix est valide
    if (isNaN(price)) return false;
    
    // Appliquer les bornes min et max
    if (priceMin.value !== null && price < priceMin.value) return false;
    if (priceMax.value !== null && price > priceMax.value) return false;
    
    return true;
  });

  // 4. Filtrer par couleur
  if (selectedColors.value.length > 0) {
    filtered = filtered.filter(product => {
      const opts = productOptionsMap.value[product.id] || [];
      return selectedColors.value.some(id => opts.includes(id));
    });
  }

  // 5. Filtrer par taille
  if (selectedSizes.value.length > 0) {
    filtered = filtered.filter(product => {
      const opts = productOptionsMap.value[product.id] || [];
      return selectedSizes.value.some(id => opts.includes(id));
    });
  }

  // 6. Trier les résultats
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-asc':
        return parseFloat(a.price || '0') - parseFloat(b.price || '0');
      case 'price-desc':
        return parseFloat(b.price || '0') - parseFloat(a.price || '0');
      default:
        return 0;
    }
  });

  return filtered;
});

// Charger les produits + stock depuis stock_availables
const loadProducts = async () => {
  loading.value = true;
  error.value = '';

  try {
    const [pRes, sRes] = await Promise.all([
      api.get('/products?output_format=XML&display=full&limit=100'),
      api.get('/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute,quantity]&filter[id_product_attribute]=[0]&limit=1000'),
    ]);

    // Construire une map produitId �?' quantité depuis stock_availables
    const parser = new DOMParser();
    const stockXml = parser.parseFromString(sRes.data, 'text/xml');
    const stockMap: Record<string, number> = {};
    stockXml.querySelectorAll('stock_available').forEach(el => {
      const pid = el.querySelector('id_product')?.textContent?.trim() || '';
      const qty = parseInt(el.querySelector('quantity')?.textContent?.trim() || '0');
      stockMap[pid] = qty;
    });

    const xmlDoc = parser.parseFromString(pRes.data, 'text/xml');
    const productElements = xmlDoc.querySelectorAll('product');

    products.value = Array.from(productElements).map(el => {
      const productId = el.querySelector('id')?.textContent?.trim() || '';
      const imageId = el.querySelector('associations images image id')?.textContent?.trim()
        || el.querySelector('image id')?.textContent?.trim();

      const dateAdd = el.querySelector('date_add')?.textContent?.trim() || '';
      
      // Récupérer le prix
      let price = el.querySelector('price')?.textContent?.trim() || '0';
      // Nettoyer le prix (remplacer virgule par point)
      price = price.replace(',', '.');

      return {
        id: productId,
        name: el.querySelector('name')?.textContent?.trim() || '',
        description: el.querySelector('description')?.textContent?.trim() || '',
        description_short: el.querySelector('description_short')?.textContent?.trim() || '',
        price: price,
        wholesale_price: el.querySelector('wholesale_price')?.textContent?.trim() || '',
        reference: el.querySelector('reference')?.textContent?.trim() || '',
        quantity: stockMap[productId] ?? 0,
        id_category_default: el.querySelector('id_category_default')?.textContent?.trim() || '',
        on_sale: el.querySelector('on_sale')?.textContent?.trim() === '1',
        image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null,
        available_date: dateAdd,
        date_add: dateAdd,
      };
    });
  } catch (err: any) {
    error.value = `Erreur lors du chargement des produits: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const getAvailabilityBadge = (available_date: string): 'HOT' | 'NEW' | null => {
  if (!available_date || available_date === '0000-00-00') return null;
  
  const cleanDate = available_date.split(' ')[0];
  const productDate = new Date(cleanDate);
  const now = new Date();
  
  if (isNaN(productDate.getTime())) return null;
  
  const productDateMidnight = new Date(productDate);
  productDateMidnight.setHours(0, 0, 0, 0);
  
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  
  const diffTime = todayMidnight.getTime() - productDateMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1 && diffDays >= 0) {
    return 'HOT';
  } else if (diffDays <= 7 && diffDays > 1) {
    return 'NEW';
  }
  
  return null;
};

// Charger les catégories
const loadCategories = async () => {
  try {
    const response = await api.get('/categories?output_format=XML&display=full&limit=50');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const categoryElements = xmlDoc.querySelectorAll('category');

    categories.value = Array.from(categoryElements)
      .filter(el => {
        const id = el.querySelector('id')?.textContent?.trim();
        return id && id !== '1' && id !== '2';
      })
      .map(el => ({
        id: el.querySelector('id')?.textContent?.trim() || '',
        name: el.querySelector('name')?.textContent?.trim() || '',
        description: el.querySelector('description')?.textContent?.trim() || ''
      }));
  } catch (err: any) {
    console.error('Erreur lors du chargement des catégories:', err);
  }
};

// Charger le panier
const loadCart = () => {
  const savedCart = localStorage.getItem('prestashop_cart');
  if (savedCart) {
    cart.value = JSON.parse(savedCart);
  }
};

// Sauvegarder le panier
const saveCart = () => {
  localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));
};

const { isLoggedIn } = useAuth();

// Ajouter au panier
const addToCart = (product: any) => {
  const existingItem = cart.value.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.value.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: 1
    });
  }

  saveCart();

  if (!isLoggedIn.value) {
    guestCartService.sync(cart.value.map(i => ({ id: i.id, quantity: i.quantity })));
  }
  
  // Animation feedback
  const button = event?.target as HTMLButtonElement;
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Ajouté !';
    button.classList.add('added');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('added');
    }, 1000);
  }
};

// Navigation
const goToProduct = (productId: string) => {
  router.push(`/product/${productId}`);
};

// Réinitialiser tous les filtres
const resetFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = '';
  priceMin.value = null;
  priceMax.value = null;
  sortBy.value = 'name-asc';
  selectedColors.value = [];
  selectedSizes.value = [];
};

const toggleColor = (id: string) => {
  const idx = selectedColors.value.indexOf(id);
  if (idx === -1) selectedColors.value = [...selectedColors.value, id];
  else selectedColors.value = selectedColors.value.filter(c => c !== id);
};

const toggleSize = (id: string) => {
  const idx = selectedSizes.value.indexOf(id);
  if (idx === -1) selectedSizes.value = [...selectedSizes.value, id];
  else selectedSizes.value = selectedSizes.value.filter(s => s !== id);
};

const getColorName = (id: string) => colorOptions.value.find(c => c.id === id)?.name || id;
const getSizeName  = (id: string) => sizeOptions.value.find(s => s.id === id)?.name || id;

const loadAttributeFilters = async () => {
  try {
    const parser = new DOMParser();

    const ogRes = await api.get('/product_options?output_format=XML&display=full');
    const ogDoc = parser.parseFromString(ogRes.data, 'text/xml');

    let colorGroupId = '';
    let sizeGroupId  = '';

    ogDoc.querySelectorAll('product_option').forEach(el => {
      const id   = el.querySelector('id')?.textContent?.trim() || '';
      const name = (
        el.querySelector('name language')?.textContent?.trim() ||
        el.querySelector('name')?.textContent?.trim() || ''
      ).toLowerCase();
      if (name.includes('couleur') || name.includes('color')) colorGroupId = id;
      if (name.includes('taille') || name.includes('size'))   sizeGroupId  = id;
    });

    if (!colorGroupId && !sizeGroupId) return;

    const ovRes = await api.get('/product_option_values?output_format=XML&display=full&limit=500');
    const ovDoc = parser.parseFromString(ovRes.data, 'text/xml');

    const colors: { id: string; name: string }[] = [];
    const sizes:  { id: string; name: string }[] = [];

    ovDoc.querySelectorAll('product_option_value').forEach(el => {
      const id      = el.querySelector('id')?.textContent?.trim() || '';
      const groupId = el.querySelector('id_product_option')?.textContent?.trim() || '';
      const name    = el.querySelector('name language')?.textContent?.trim()
                   || el.querySelector('name')?.textContent?.trim() || '';
      if (!id || !name) return;
      if (groupId === colorGroupId) colors.push({ id, name });
      else if (groupId === sizeGroupId) sizes.push({ id, name });
    });

    colorOptions.value = colors;
    sizeOptions.value  = sizes;

    if (colors.length === 0 && sizes.length === 0) return;

    const combRes = await api.get('/combinations?output_format=XML&display=full&limit=1000');
    const combDoc = parser.parseFromString(combRes.data, 'text/xml');

    const map: Record<string, string[]> = {};
    combDoc.querySelectorAll('combination').forEach(el => {
      const productId = el.querySelector('id_product')?.textContent?.trim() || '';
      if (!productId) return;
      const optValIds = Array.from(
        el.querySelectorAll('associations product_option_values product_option_value id')
      ).map(e => e.textContent?.trim() || '').filter(Boolean);
      if (!map[productId]) map[productId] = [];
      map[productId].push(...optValIds);
    });

    productOptionsMap.value = map;
  } catch {
    // attribute filters silently unavailable
  }
};

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(numPrice);
};

const formatPriceNumber = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(price);
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-product.jpg';
};

onMounted(() => {
  loadProducts();
  loadCategories();
  loadCart();
  loadAttributeFilters();
});
</script>

<style scoped>
/* Import Font Awesome */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

.products-page {
  min-height: 100vh;
  background: var(--bg);
}

/* �"?�"? Main �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.products-main {
  padding: 3rem 0 5rem;
}

.page-header {
  margin-bottom: 2.5rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.page-header p {
  color: var(--muted);
  font-size: 1rem;
  margin: 0;
}

/* �"?�"? Filters �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.filters-section {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.search-bar-wrapper {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--text);
  background: var(--bg);
  transition: all var(--transition);
  font-family: inherit;
}

.search-input::placeholder { 
  color: #94a3b8;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
  background: var(--surface);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all var(--transition);
}

.clear-search-btn:hover {
  color: var(--error);
  background: var(--bg-hover);
}

.filter-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.filter-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.875rem;
  z-index: 1;
}

.filter-select {
  width: 100%;
  padding: 0.65rem 1rem 0.65rem 2.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  font-size: 0.875rem;
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition);
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.2rem 0.5rem 0.2rem 2.25rem;
}

.price-input {
  width: 100px;
  padding: 0.45rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  color: var(--text);
  font-family: inherit;
}

.price-input:focus {
  outline: none;
}

.price-input::placeholder {
  color: #94a3b8;
  font-size: 0.75rem;
}

.price-separator {
  color: var(--muted);
  font-weight: 600;
}

.reset-filters-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition);
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.reset-filters-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

/* �"?�"? Active filters �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.active-filters {
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f0f9ff;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-left: 3px solid var(--primary);
}

.active-filters-icon {
  color: var(--primary);
  font-size: 0.875rem;
}

.active-filters-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--navy);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: white;
  border: 1px solid #bae6fd;
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--navy);
}

.remove-filter {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #64748b;
  transition: all var(--transition);
}

.remove-filter:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* �"?�"? Results info �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.results-info {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* �"?�"? Loading / Error �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.loading, .error {
  text-align: center;
  padding: 4rem;
}

.loading {
  color: var(--muted);
}

.loading i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error {
  color: var(--error);
}

.error i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

/* �"?�"? Products grid �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: #93c5fd;
}

.product-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: var(--bg);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.sale-badge,
.hot-badge,
.new-badge {
  position: absolute;
  right: 10px;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sale-badge {
  top: 10px;
  background: var(--error);
  color: white;
}

.hot-badge {
  top: 50px;
  background: #ff4757;
  color: white;
}

.new-badge {
  top: 50px;
  background: #2ed573;
  color: white;
}

.product-info {
  padding: 1.25rem 1.5rem 1.5rem;
}

.product-info h3 {
  margin: 0 0 0.4rem;
  color: var(--navy);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
}

.product-description {
  color: var(--muted);
  font-size: 0.825rem;
  margin-bottom: 0.875rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.product-price {
  margin-bottom: 0.875rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.price {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--success);
}

.old-price {
  font-size: 0.875rem;
  color: #94a3b8;
  text-decoration: line-through;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.775rem;
}

.reference {
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stock {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stock.available {
  color: var(--success);
  font-weight: 600;
}

.stock.unavailable {
  color: var(--error);
  font-weight: 600;
}

.add-to-cart-btn {
  width: 100%;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.7rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.add-to-cart-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.add-to-cart-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.add-to-cart-btn.added {
  background: var(--success);
}

/* �"?�"? No results �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.no-results {
  text-align: center;
  padding: 5rem 2rem;
}

.no-results i {
  font-size: 3rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.no-results h3 {
  color: var(--navy);
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.no-results p {
  color: var(--muted);
  margin-bottom: 2rem;
}

.reset-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background var(--transition);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.reset-btn:hover {
  background: var(--primary-dark);
}

/* �"?�"? Footer �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.front-footer {
  background: var(--navy);
  color: white;
  padding: 3rem 0 1.5rem;
  margin-top: auto;
}

.front-footer a {
  color: #e2e8f0;
  text-decoration: none;
  transition: color var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.front-footer a:hover {
  color: white;
}

.front-footer h3, 
.front-footer h4 {
  margin-bottom: 1rem;
  color: white;
}

.front-footer ul {
  list-style: none;
  padding: 0;
}

.front-footer li {
  margin-bottom: 0.5rem;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-bottom {
  text-align: center;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
  color: #cbd5e1;
}

/* �"?�"? Container �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* �"?�"? CSS Variables �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --muted: #64748b;
  --navy: #0f172a;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --success: #10b981;
  --error: #ef4444;
  --bg-hover: #f1f5f9;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 25px -5px rgba(0,0,0,0.1);
  --transition: 0.2s ease;
}

/* ── Attribute filters ─────────────────────────────────── */
.attribute-filters {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px solid var(--border);
  padding-top: 0.85rem;
}

.attr-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.attr-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--navy);
  white-space: nowrap;
  min-width: 80px;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.attr-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.attr-chip {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.attr-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.attr-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.attr-chip.size-chip.active {
  background: #7c3aed;
  border-color: #7c3aed;
}

.attr-chip.size-chip:hover:not(.active) {
  border-color: #7c3aed;
  color: #7c3aed;
}

/* �"?�"? Responsive �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"? */
@media (max-width: 768px) {
  .page-header h1 { 
    font-size: 1.6rem; 
  }

  .filters-section {
    padding: 1rem;
  }

  .filter-controls {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .reset-filters-btn {
    width: 100%;
    justify-content: center;
  }

  .products-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
