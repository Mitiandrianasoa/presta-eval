<template>
  <div class="product-detail-page">
    <!-- Header -->
    <FrontHeader />

    <main class="product-main">
      <div class="container">
        <!-- Loading -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement du produit...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error">
          {{ error }}
          <div class="back-actions">
            <router-link to="/products" class="back-btn">Retour aux produits</router-link>
          </div>
        </div>

        <!-- Product Detail -->
        <div v-else-if="product" class="product-detail">
          <!-- Breadcrumb -->
          <nav class="breadcrumb">
            <router-link to="/">Accueil</router-link>
            <span class="separator">/</span>
            <router-link to="/products">Produits</router-link>
            <span class="separator">/</span>
            <span class="current">{{ product.name }}</span>
          </nav>

          <div class="product-content">
            <!-- Product Images -->
            <div class="product-images">
              <div class="main-image">
                <img 
                  :src="currentImage || '/placeholder-product.jpg'" 
                  :alt="product.name"
                  @error="handleImageError"
                />
              </div>
              <div v-if="productImages.length > 1" class="image-thumbnails">
                <div 
                  v-for="(image, index) in productImages" 
                  :key="index"
                  class="thumbnail"
                  :class="{ active: currentImage === image }"
                  @click="currentImage = image"
                >
                  <img :src="image" :alt="`${product.name} - Image ${index + 1}`" />
                </div>
              </div>
            </div>

            <!-- Product Info -->
            <div class="product-info">
              <h1>{{ product.name }}</h1>
              
              <div class="product-meta">
                <span v-if="product.reference" class="reference">
                  Référence: {{ product.reference }}
                </span>
                <span v-if="product.ean13" class="ean">
                  EAN: {{ product.ean13 }}
                </span>
              </div>

              <div class="product-price">
                <span v-if="product.price" class="current-price">
                  {{ formatPrice(product.price) }}
                </span>
                <span v-if="product.wholesale_price && product.wholesale_price !== product.price" class="old-price">
                  {{ formatPrice(product.wholesale_price) }}
                </span>
                <span v-if="product.on_sale" class="sale-badge">Promotion</span>
              </div>

              <div class="product-description">
                <h3>Description</h3>
                <div v-html="product.description"></div>
              </div>

              <div v-if="product.features && product.features.length > 0" class="product-features">
                <h3>Caractéristiques</h3>
                <div class="features-list">
                  <div v-for="feature in product.features" :key="feature.id" class="feature-item">
                    <span class="feature-name">{{ feature.name }}:</span>
                    <span class="feature-value">{{ feature.value }}</span>
                  </div>
                </div>
              </div>

              <div class="stock-info">
                <span v-if="product.quantity && product.quantity > 0" class="stock available">
                  ✓ En stock 
                </span>
                <span v-else class="stock unavailable">
                  ✗ Rupture de stock
                </span>
              </div>

              <div class="add-to-cart-section">
                <div class="quantity-selector">
                  <label for="quantity">Quantité:</label>
                  <div class="quantity-controls">
                    <button 
                      @click="decreaseQuantity" 
                      :disabled="quantity <= 1"
                      class="quantity-btn"
                    >
                      -
                    </button>
                    <input 
                      id="quantity"
                      v-model.number="quantity" 
                      type="number" 
                      min="1" 
                      :max="product.quantity || 999"
                      class="quantity-input"
                    />
                    <button 
                      @click="increaseQuantity" 
                      :disabled="quantity >= (product.quantity || 999)"
                      class="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  class="add-to-cart-btn" 
                  @click="addToCart"
                  :disabled="!product.quantity || product.quantity <= 0 || loading"
                >
                  {{ loading ? 'Ajout en cours...' : 'Ajouter au panier' }}
                </button>
              </div>

              <div class="product-actions">
                <button @click="goBack" class="secondary-btn">
                  ← Retour aux produits
                </button>
              </div>
            </div>
          </div>

          <!-- Related Products -->
          <div v-if="relatedProducts.length > 0" class="related-products">
            <h2>Produits similaires</h2>
            <div class="related-grid">
              <div 
                v-for="relatedProduct in relatedProducts" 
                :key="relatedProduct.id"
                class="related-product-card"
                @click="goToProduct(relatedProduct.id)"
              >
                <div class="related-image">
                  <img 
                    :src="relatedProduct.image_url || '/placeholder-product.jpg'" 
                    :alt="relatedProduct.name"
                    @error="handleImageError"
                  />
                </div>
                <div class="related-info">
                  <h4>{{ relatedProduct.name }}</h4>
                  <span class="related-price">
                    {{ formatPrice(relatedProduct.price) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../api/api';
import FrontHeader from '../../../components/FrontHeader.vue';

const route = useRoute();
const router = useRouter();

const product = ref<any>(null);
const relatedProducts = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const quantity = ref(1);
const currentImage = ref('');

// Panier
const cart = ref<any[]>([]);

const productImages = computed(() => {
  if (!product.value) return [];
  const productId = product.value.id;
  const ids: string[] = product.value.imageIds || [];
  if (ids.length === 0 && product.value.image_url) return [product.value.image_url];
  return ids.map((imgId: string) => `/api/images/products/${productId}/${imgId}`);
});

// Charger le produit
const loadProduct = async () => {
  const productId = route.params.id as string;
  if (!productId) {
    error.value = 'ID de produit non spécifié';
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    const [pRes, sRes] = await Promise.all([
      api.get(`/products/${productId}?output_format=XML&display=full`),
      api.get(`/stock_availables?output_format=XML&display=[id,id_product,quantity]&filter[id_product]=[${productId}]&filter[id_product_attribute]=[0]&limit=1`),
    ]);

    const parser = new DOMParser();
    const productElement = parser.parseFromString(pRes.data, 'text/xml').querySelector('product');

    if (!productElement) {
      error.value = 'Produit non trouvé';
      return;
    }

    // Stock depuis stock_availables (source de vérité)
    const stockEl = parser.parseFromString(sRes.data, 'text/xml').querySelector('stock_available');
    const realQuantity = parseInt(stockEl?.querySelector('quantity')?.textContent?.trim() || '0');

    const imageId = productElement.querySelector('associations images image id')?.textContent?.trim()
      || productElement.querySelector('image id')?.textContent?.trim();
    product.value = {
      id: productId,
      name: productElement.querySelector('name')?.textContent?.trim() || '',
      description: productElement.querySelector('description')?.textContent?.trim() || '',
      description_short: productElement.querySelector('description_short')?.textContent?.trim() || '',
      price: productElement.querySelector('price')?.textContent?.trim() || '',
      wholesale_price: productElement.querySelector('wholesale_price')?.textContent?.trim() || '',
      reference: productElement.querySelector('reference')?.textContent?.trim() || '',
      ean13: productElement.querySelector('ean13')?.textContent?.trim() || '',
      quantity: realQuantity,
      id_category_default: productElement.querySelector('id_category_default')?.textContent?.trim() || '',
      on_sale: productElement.querySelector('on_sale')?.textContent?.trim() === '1',
      image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null,
      imageIds: Array.from(productElement.querySelectorAll('associations images image id'))
        .map(n => n.textContent?.trim()).filter(Boolean)
    };

    // Charger les caractéristiques
    await loadProductFeatures(productId);
    
    // Charger les produits similaires
    await loadRelatedProducts(product.value.id_category_default, productId);
    
    // Définir l'image par défaut
    if (productImages.value.length > 0) {
      currentImage.value = productImages.value[0];
    }

  } catch (err: any) {
    error.value = `Erreur lors du chargement du produit: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

// Charger les caractéristiques du produit
const loadProductFeatures = async (productId: string) => {
  try {
    const response = await api.get(`/product_features?output_format=XML&display=full&filter[id_product]=[${productId}]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const featureElements = xmlDoc.querySelectorAll('product_feature');

    const features = [];
    for (const featureEl of Array.from(featureElements)) {
      const featureId = featureEl.querySelector('id_feature')?.textContent?.trim();
      const featureValueId = featureEl.querySelector('id_feature_value')?.textContent?.trim();
      
      if (featureId && featureValueId) {
        // Récupérer le nom de la caractéristique
        const featureResponse = await api.get(`/product_features/${featureId}?output_format=XML&display=full`);
        const featureDoc = new DOMParser().parseFromString(featureResponse.data, 'text/xml');
        const featureName = featureDoc.querySelector('name')?.textContent?.trim();
        
        // Récupérer la valeur de la caractéristique
        const valueResponse = await api.get(`/product_feature_values/${featureValueId}?output_format=XML&display=full`);
        const valueDoc = new DOMParser().parseFromString(valueResponse.data, 'text/xml');
        const featureValue = valueDoc.querySelector('value')?.textContent?.trim();
        
        if (featureName && featureValue) {
          features.push({
            id: featureId,
            name: featureName,
            value: featureValue
          });
        }
      }
    }

    if (product.value) {
      product.value.features = features;
    }
  } catch (err) {
    console.error('Erreur lors du chargement des caractéristiques:', err);
  }
};

// Charger les produits similaires
const loadRelatedProducts = async (categoryId: string, currentProductId: string) => {
  try {
    const response = await api.get(`/products?output_format=XML&display=full&filter[id_category_default]=[${categoryId}]&limit=4`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const productElements = xmlDoc.querySelectorAll('product');

    relatedProducts.value = Array.from(productElements)
      .filter(el => el.querySelector('id')?.textContent?.trim() !== currentProductId)
      .slice(0, 3)
      .map(el => {
        const pid = el.querySelector('id')?.textContent?.trim() || '';
        const imgId = el.querySelector('associations images image id')?.textContent?.trim()
          || el.querySelector('image id')?.textContent?.trim();
        return {
          id: pid,
          name: el.querySelector('name')?.textContent?.trim() || '',
          price: el.querySelector('price')?.textContent?.trim() || '',
          image_url: imgId ? `/api/images/products/${pid}/${imgId}` : null
        };
      });
  } catch (err) {
    console.error('Erreur lors du chargement des produits similaires:', err);
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

// Gestion de la quantité
const increaseQuantity = () => {
  const maxQuantity = product.value?.quantity || 999;
  if (quantity.value < maxQuantity) {
    quantity.value++;
  }
};

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

// Ajouter au panier
const addToCart = async () => {
  if (!product.value) return;

  loading.value = true;
  
  try {
    const existingItem = cart.value.find(item => item.id === product.value.id);
    
    if (existingItem) {
      existingItem.quantity += quantity.value;
    } else {
      cart.value.push({
        id: product.value.id,
        name: product.value.name,
        price: product.value.price,
        image_url: product.value.image_url,
        quantity: quantity.value
      });
    }
    
    saveCart();
    
    // Feedback visuel
    const button = document.querySelector('.add-to-cart-btn') as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Ajouté !';
      button.classList.add('added');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('added');
      }, 2000);
    }
    
    // Réinitialiser la quantité
    quantity.value = 1;
    
  } catch (err) {
    console.error('Erreur lors de l\'ajout au panier:', err);
  } finally {
    loading.value = false;
  }
};

// Navigation
const goToProduct = (productId: string) => {
  router.push(`/product/${productId}`);
};

const goBack = () => {
  router.push('/products');
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

onMounted(() => {
  loadProduct();
  loadCart();
});
</script>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  background: var(--bg);
}

/* ── Main ─────────────────────────────────────────────── */
.product-main {
  padding: 2.5rem 0 5rem;
}

/* ── Loading / Error ──────────────────────────────────── */
.loading {
  text-align: center;
  padding: 5rem;
  color: var(--muted);
}

.error {
  text-align: center;
  padding: 5rem;
  color: var(--error);
}

.back-actions { margin-top: 2rem; }

.back-btn {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.75rem 1.75rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background var(--transition);
}

.back-btn:hover { background: var(--primary-dark); }

/* ── Product detail card ──────────────────────────────── */
.product-detail {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 2rem 2.5rem;
  box-shadow: var(--shadow-sm);
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 2rem;
  font-size: 0.85rem;
}

.breadcrumb a {
  color: var(--primary);
  text-decoration: none;
}

.breadcrumb a:hover { text-decoration: underline; }

.separator { color: var(--border); }

.current { color: var(--text); font-weight: 500; }

/* Grid */
.product-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.5rem;
  margin-bottom: 3rem;
}

/* Images */
.product-images {
  position: sticky;
  top: 80px;
  height: fit-content;
}

.main-image {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg);
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
}

.main-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
}

.image-thumbnails {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.thumbnail {
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border);
  transition: border-color var(--transition);
}

.thumbnail:hover,
.thumbnail.active { border-color: var(--primary); }

.thumbnail img {
  width: 100%;
  height: 72px;
  object-fit: cover;
  display: block;
}

/* Info */
.product-info h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
  line-height: 1.2;
}

.product-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.825rem;
  color: var(--muted);
}

.product-price {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.75rem;
  padding: 1rem 1.25rem;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.current-price {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--success);
}

.old-price {
  font-size: 1.1rem;
  color: #94a3b8;
  text-decoration: line-through;
}

.sale-badge {
  background: var(--error);
  color: white;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: auto;
}

.product-description {
  margin-bottom: 1.75rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--border);
}

.product-description h3,
.product-features h3 {
  color: var(--navy);
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.product-features {
  margin-bottom: 1.75rem;
}

.features-list { display: grid; gap: 0; }

.feature-item {
  display: flex;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}

.feature-name {
  font-weight: 500;
  color: var(--text);
  min-width: 160px;
}

.feature-value { color: var(--muted); }

.stock-info { margin-bottom: 1.5rem; font-size: 0.9rem; font-weight: 600; }

.stock.available { color: var(--success); }
.stock.unavailable { color: var(--error); }

/* Add to cart */
.add-to-cart-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-selector label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text);
  min-width: 70px;
}

.quantity-controls {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.quantity-btn {
  background: var(--bg);
  border: none;
  width: 38px;
  height: 38px;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text);
  transition: background var(--transition);
  font-family: inherit;
}

.quantity-btn:hover:not(:disabled) { background: #e2e8f0; }
.quantity-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.quantity-input {
  width: 56px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  height: 38px;
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--text);
  background: var(--surface);
}

.quantity-input:focus { outline: none; }

.add-to-cart-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.9rem 2rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
  font-family: inherit;
}

.add-to-cart-btn:hover:not(:disabled) { background: var(--primary-dark); }

.add-to-cart-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

.add-to-cart-btn.added { background: var(--success); }

.product-actions { display: flex; }

.secondary-btn {
  background: transparent;
  color: var(--primary);
  border: 1.5px solid var(--primary);
  padding: 0.7rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  font-family: inherit;
}

.secondary-btn:hover {
  background: var(--primary-light);
}

/* ── Related Products ─────────────────────────────────── */
.related-products {
  border-top: 1px solid var(--border);
  padding-top: 2.5rem;
}

.related-products h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 1.5rem;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
}

.related-product-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
}

.related-product-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: #93c5fd;
}

.related-image {
  height: 140px;
  overflow: hidden;
  background: var(--surface);
}

.related-image img { width: 100%; height: 100%; object-fit: cover; }

.related-info { padding: 0.875rem 1rem; }

.related-info h4 {
  margin: 0 0 0.35rem;
  color: var(--navy);
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.35;
}

.related-price { color: var(--success); font-weight: 600; font-size: 0.9rem; }

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 768px) {
  .product-detail { padding: 1.25rem; }

  .product-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .product-images { position: static; }

  .main-image img { height: 280px; }

  .product-info h1 { font-size: 1.4rem; }
  .current-price { font-size: 1.4rem; }
}
</style>
