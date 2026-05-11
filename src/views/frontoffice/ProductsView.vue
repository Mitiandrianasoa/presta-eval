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

        <!-- Filtres -->
        <div class="filters-section">
          <div class="search-bar">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un produit..."
              class="search-input"
            />
          </div>
          
          <div class="filter-controls">
            <select v-model="selectedCategory" class="filter-select">
              <option value="">Toutes les catégories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            
            <select v-model="sortBy" class="filter-select">
              <option value="name-asc">Nom (A-Z)</option>
              <option value="name-desc">Nom (Z-A)</option>
              <option value="price-asc">Prix (croissant)</option>
              <option value="price-desc">Prix (décroissant)</option>
            </select>
          </div>
        </div>

        <!-- Résultats -->
        <div class="results-info">
          <span v-if="!loading">
            {{ filteredProducts.length }} produit(s) trouvé(s)
          </span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement des produits...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error">
          {{ error }}
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
              <div v-if="product.on_sale" class="sale-badge">Promo</div>
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
                  Ref: {{ product.reference }}
                </span>
                <span v-if="product.quantity && product.quantity > 0" class="stock available">
                  En stock
                </span>
                <span v-else class="stock unavailable">
                  Rupture de stock
                </span>
              </div>
              <button 
                class="add-to-cart-btn" 
                @click.stop="addToCart(product)"
                :disabled="!product.quantity || product.quantity <= 0"
              >
                {{ product.quantity && product.quantity > 0 ? 'Ajouter au panier' : 'Indisponible' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Aucun résultat -->
        <div v-else class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>Aucun produit trouvé</h3>
          <p>Essayez de modifier vos filtres ou votre recherche</p>
          <button @click="resetFilters" class="reset-btn">
            Réinitialiser les filtres
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
              <li><router-link to="/">Accueil</router-link></li>
              <li><router-link to="/products">Produits</router-link></li>
              <li><router-link to="/cart">Panier</router-link></li>
              <li><router-link to="/orders">Commandes</router-link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <p>contact@prestashop.com</p>
            <p>+261 00 000 000</p>
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
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/api';
import FrontHeader from '../../components/FrontHeader.vue';
import { useCartStore } from '../../stores/cart/cartStore';

const router = useRouter();
const cartStore = useCartStore();

const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

// Filtres
const searchQuery = ref('');
const selectedCategory = ref('');
const sortBy = ref('name-asc');

const cartItemCount = computed(() => {
  return cartStore.itemCount;
});

// Produits filtrés et triés
const filteredProducts = computed(() => {
  let filtered = products.value;

  // Filtrer par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.reference.toLowerCase().includes(query)
    );
  }

  // Filtrer par catégorie
  if (selectedCategory.value) {
    filtered = filtered.filter(product => 
      product.id_category_default === selectedCategory.value
    );
  }

  // Trier
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

// Charger les produits
const loadProducts = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await api.get('/products?output_format=XML&display=full&limit=100');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const productElements = xmlDoc.querySelectorAll('product');

    products.value = Array.from(productElements).map(el => {
      const productId = el.querySelector('id')?.textContent?.trim() || '';
      const imageId = el.querySelector('associations images image id')?.textContent?.trim()
        || el.querySelector('image id')?.textContent?.trim();
      return {
        id: productId,
        name: el.querySelector('name')?.textContent?.trim() || '',
        description: el.querySelector('description')?.textContent?.trim() || '',
        description_short: el.querySelector('description_short')?.textContent?.trim() || '',
        price: el.querySelector('price')?.textContent?.trim() || '',
        wholesale_price: el.querySelector('wholesale_price')?.textContent?.trim() || '',
        reference: el.querySelector('reference')?.textContent?.trim() || '',
        quantity: parseInt(el.querySelector('quantity')?.textContent?.trim() || '0'),
        id_category_default: el.querySelector('id_category_default')?.textContent?.trim() || '',
        on_sale: el.querySelector('on_sale')?.textContent?.trim() === '1',
        image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null
      };
    });
  } catch (err: any) {
    error.value = `Erreur lors du chargement des produits: ${err.message}`;
  } finally {
    loading.value = false;
  }
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
        return id && id !== '1' && id !== '2'; // Exclure "Accueil" et "Racine"
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

// Ajouter au panier via cartStore Pinia
const addToCart = async (product: any) => {
  try {
    // Créer un panier s'il n'existe pas
    if (!cartStore.cartId) {
      const customerId = localStorage.getItem('customerId') || '1';
      await cartStore.createCart(customerId);
    }

    // Ajouter le produit au panier
    await cartStore.addItem(product.id, 1, '0');

    // Animation feedback
    const button = event?.target as HTMLButtonElement;
    if (button) {
      button.textContent = 'Ajouté !';
      button.classList.add('added');
      setTimeout(() => {
        button.textContent = 'Ajouter au panier';
        button.classList.remove('added');
      }, 1000);
    }
  } catch (err: any) {
    console.error('❌ Erreur ajout panier:', err);
    alert('Erreur: ' + err.message);
  }
};

// Navigation
const goToProduct = (productId: string) => {
  router.push(`/product/${productId}`);
};

// Réinitialiser les filtres
const resetFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = '';
  sortBy.value = 'name-asc';
};

// Utilitaires
const formatPrice = (price: string) => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(numPrice);
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = '/placeholder-product.jpg';
};

// Watchers
watch([searchQuery, selectedCategory, sortBy], () => {
  // Les produits sont déjà réactifs via computed
});

onMounted(async () => {
  await loadProducts();
  await loadCategories();
  
  // Charger le panier existant s'il y a un cartId sauvegardé
  const savedCartId = cartStore.loadSavedCartId();
  if (savedCartId) {
    try {
      await cartStore.fetchCart(savedCartId);
    } catch (err) {
      console.warn('Panier existant inaccessible, un nouveau sera créé', err);
    }
  }
});
</script>

<style scoped>
.products-page {
  min-height: 100vh;
  background: var(--bg);
}

/* ── Main ─────────────────────────────────────────────── */
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

/* ── Filters ──────────────────────────────────────────── */
.filters-section {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1.25rem 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-bar {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--bg);
  transition: border-color var(--transition), box-shadow var(--transition);
  font-family: inherit;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
  background: var(--surface);
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.65rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  font-size: 0.875rem;
  color: var(--text);
  min-width: 160px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

/* ── Results info ─────────────────────────────────────── */
.results-info {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

/* ── Loading / Error ──────────────────────────────────── */
.loading {
  text-align: center;
  padding: 4rem;
  color: var(--muted);
}

.error {
  text-align: center;
  padding: 4rem;
  color: var(--error);
}

/* ── Products grid ────────────────────────────────────── */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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
  transform: scale(1.04);
}

.sale-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--error);
  color: white;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-info {
  padding: 1.25rem 1.5rem 1.5rem;
}

.product-info h3 {
  margin: 0 0 0.4rem;
  color: var(--navy);
  font-size: 0.975rem;
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

/* ── No results ───────────────────────────────────────── */
.no-results {
  text-align: center;
  padding: 5rem 2rem;
}

.no-results-icon {
  font-size: 3.5rem;
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
}

.reset-btn:hover {
  background: var(--primary-dark);
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 768px) {
  .page-header h1 { font-size: 1.6rem; }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-controls {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
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
