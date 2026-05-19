<template>

  <div class="home-page">

    <!-- Header -->

    <FrontHeader />



    <!-- Hero Section -->

    <section class="hero">

      <div class="hero-content">

        <h2>Bienvenue dans notre boutique</h2>

        <p>Découvrez nos produits de qualité à des prix imbattables</p>

      </div>

    </section>



    <!-- Featured Products -->

    <section class="featured-products">

      <div class="container">

        <div class="section-heading"><h2>Produits vedettes</h2></div>

        <div v-if="loading" class="loading">

          Chargement des produits...

        </div>

        <div v-else-if="error" class="error">

          {{ error }}

        </div>

        <div v-else class="products-grid">

          <div 

            v-for="product in featuredProducts" 

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

              <div v-if="getAvailabilityBadge(product.available_date) === 'HOT'" class="hot-badge">

                HOT

              </div>

              <div v-else-if="getAvailabilityBadge(product.available_date) === 'NEW'" class="new-badge">

                NEW

              </div>

            </div>

            <div class="product-info">

              <h3>{{ product.name }}</h3>

              <p class="product-description">{{ product.description_short || product.description }}</p>

              <div class="product-price">

                <span v-if="product.price" class="price">

                  {{ formatPrice(product.price) }}

                </span>

              </div>

              <span v-if="product.quantity > 0" class="stock-badge available">En stock</span>

              <span v-else class="stock-badge unavailable">Rupture de stock</span>

              <button

                class="add-to-cart-btn"

                @click.stop="addToCart(product)"

                :disabled="!product.quantity || product.quantity <= 0"

              >

                {{ product.quantity > 0 ? 'Ajouter au panier' : 'Indisponible' }}

              </button>

            </div>

          </div>

        </div>

        <div class="view-all">

          <router-link to="/products" class="view-all-btn">

            Voir tous les produits

          </router-link>

        </div>

      </div>

    </section>



    <!-- Categories -->

    <section class="categories">

      <div class="container">

        <div class="section-heading"><h2>Catégories</h2></div>

        <div v-if="categoriesLoading" class="loading">

          Chargement des catégories...

        </div>

        <div v-else class="categories-grid">

          <div 

            v-for="category in categories" 

            :key="category.id"

            class="category-card"

            @click="goToCategory(category.id)"

          >

            <h3>{{ category.name }}</h3>

            <p>{{ category.description }}</p>

          </div>

        </div>

      </div>

    </section>



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

import { useRouter } from 'vue-router';

import api from '../../api/api';

import FrontHeader from '../../components/FrontHeader.vue';



const router = useRouter();



const featuredProducts = ref<any[]>([]);

const categories = ref<any[]>([]);
const loading = ref(false);
const categoriesLoading = ref(false);
const error = ref('');



// Panier (stocké localement pour le frontoffice)

const cart = ref<any[]>([]);



const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0);

});



// Charger les produits vedettes

const loadFeaturedProducts = async () => {

  loading.value = true;

  error.value = '';



  try {

    const [pRes, sRes] = await Promise.all([

      api.get('/products?output_format=XML&display=full&limit=8'),

      api.get('/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute,quantity]&filter[id_product_attribute]=[0]&limit=1000'),

    ]);



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



    featuredProducts.value = Array.from(productElements).map(el => {

      const productId = el.querySelector('id')?.textContent?.trim() || '';

      const imageId = el.querySelector('associations images image id')?.textContent?.trim()

        || el.querySelector('image id')?.textContent?.trim();

      // Récupérer date_add (date de création du produit)

      const dateAdd = el.querySelector('date_add')?.textContent?.trim() || '';

      

      return {

        id: productId,

        name: el.querySelector('name')?.textContent?.trim() || '',

        description: el.querySelector('description')?.textContent?.trim() || '',

        description_short: el.querySelector('description_short')?.textContent?.trim() || '',

        price: el.querySelector('price')?.textContent?.trim() || '',

        reference: el.querySelector('reference')?.textContent?.trim() || '',

        quantity: stockMap[productId] ?? 0,

        on_sale: el.querySelector('on_sale')?.textContent?.trim() === '1',

        image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null,

        available_date: dateAdd,

        date_add: dateAdd

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

  categoriesLoading.value = true;

  

  try {

    const response = await api.get('/categories?output_format=XML&display=full&limit=10');

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

  } finally {

    categoriesLoading.value = false;

  }

};



// Charger le panier depuis localStorage

const loadCart = () => {

  const savedCart = localStorage.getItem('prestashop_cart');

  if (savedCart) {

    cart.value = JSON.parse(savedCart);

  }

};



// Sauvegarder le panier dans localStorage

const saveCart = () => {

  localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));

};



// Fonction pour déterminer le badge de disponibilité (HOT/NEW)

const getAvailabilityBadge = (available_date: string): 'HOT' | 'NEW' | null => {

  // Ignorer les dates invalides

  if (!available_date || available_date === '0000-00-00') return null;

  

  const cleanDate = available_date.split(' ')[0];

  const productDate = new Date(cleanDate);

  const now = new Date();

  

  // Vérifier si la date est valide

  if (isNaN(productDate.getTime())) return null;

  

  // Remettre à minuit pour comparer uniquement les jours

  const productDateMidnight = new Date(productDate);

  productDateMidnight.setHours(0, 0, 0, 0);

  

  const todayMidnight = new Date(now);

  todayMidnight.setHours(0, 0, 0, 0);

  

  // Calculer la différence en jours

  const diffTime = todayMidnight.getTime() - productDateMidnight.getTime();

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  

  // HOT : sorti aujourd'hui ou hier (0 ou 1 jour)

  if (diffDays <= 1 && diffDays >= 0) {

    return 'HOT';

  }

  // NEW : sorti entre 2 et 7 jours

  else if (diffDays <= 7 && diffDays > 1) {

    return 'NEW';

  }

  

  return null;

};



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

};



// Navigation

const goToProduct = (productId: string) => {

  router.push(`/product/${productId}`);

};



const goToCategory = (categoryId: string) => {

  router.push(`/category/${categoryId}`);

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

  loadFeaturedProducts();

  loadCategories();

  loadCart();

});

</script>



<style scoped>

.home-page { background: #07070e; min-height: 100vh; color: #e8e8f5; }

/* Hero */
.hero {
  position: relative;
  min-height: 72vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: linear-gradient(160deg, #0c0c18 0%, #0f0a1e 60%, #07070e 100%);
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.18) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content { position: relative; z-index: 1; max-width: 680px; padding: 4rem 2rem; }
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(167,139,250,0.1);
  border: 1px solid rgba(167,139,250,0.25);
  color: #a78bfa;
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 1.75rem;
}
.hero h1 {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 1.25rem;
  color: #e8e8f5;
}
.hero h1 span { color: #a78bfa; }
.hero p {
  font-size: 1.1rem;
  color: #8080b0;
  margin: 0 0 2.25rem;
  line-height: 1.7;
}
.hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.btn-primary {
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  color: white;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 4px 20px rgba(124,58,237,0.35);
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary {
  background: transparent;
  color: #a78bfa;
  border: 1.5px solid rgba(167,139,250,0.4);
  padding: 0.85rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.btn-secondary:hover { background: rgba(167,139,250,0.08); border-color: #a78bfa; }

/* Stats bar */
.stats-bar {
  background: #0e0e1a;
  border-top: 1px solid #1e1e35;
  border-bottom: 1px solid #1e1e35;
  padding: 1.5rem 0;
}
.stats-bar .container { display: flex; justify-content: center; gap: 4rem; flex-wrap: wrap; }
.stat-item { text-align: center; }
.stat-number { font-size: 1.5rem; font-weight: 800; color: #a78bfa; display: block; }
.stat-label { font-size: 0.8rem; color: #5a5a85; text-transform: uppercase; letter-spacing: 0.05em; }

/* Featured Products */
.featured-section { padding: 5rem 0; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
}
.section-header h2 { font-size: 1.5rem; font-weight: 700; color: #e8e8f5; margin: 0; }
.view-all-link { color: #a78bfa; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
.view-all-link:hover { text-decoration: underline; }

/* Loading / Error */
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #5a5a85;
}
.loading-spinner {
  width: 40px; height: 40px;
  border: 2px solid #1e1e35;
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state { color: #f87171; }
.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: transparent;
  border: 1px solid #f87171;
  color: #f87171;
  border-radius: 6px;
  cursor: pointer;
}

/* Product grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
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
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(167,139,250,0.15);
}
.product-image {
  aspect-ratio: 1;
  overflow: hidden;
  background: #15152a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.product-card:hover .product-image img { transform: scale(1.05); }
.product-placeholder {
  font-size: 2.5rem;
  opacity: 0.3;
}
.product-info { padding: 1.25rem; }
.product-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e8e8f5;
  margin: 0 0 0.35rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}
.product-ref { font-size: 0.75rem; color: #5a5a85; margin: 0 0 0.75rem; }
.product-price { font-size: 1.1rem; font-weight: 700; color: #f59e0b; margin: 0 0 0.75rem; }
.product-price .old-price { font-size: 0.8rem; color: #5a5a85; text-decoration: line-through; margin-left: 0.5rem; font-weight: 400; }
.product-footer { display: flex; align-items: center; justify-content: space-between; }
.stock-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
}
.stock-badge.in-stock { background: rgba(52,211,153,0.12); color: #34d399; }
.stock-badge.out-stock { background: rgba(248,113,113,0.12); color: #f87171; }
.add-to-cart-btn {
  width: 34px; height: 34px;
  border: none;
  background: rgba(167,139,250,0.12);
  color: #a78bfa;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  font-size: 1.1rem;
}
.add-to-cart-btn:hover { background: rgba(167,139,250,0.22); }

/* Category grid */
.categories-section { padding: 3rem 0 5rem; background: #0a0a14; }
.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.category-card {
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 10px;
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  display: block;
  transition: border-color 0.2s, background 0.2s;
}
.category-card:hover { border-color: rgba(167,139,250,0.35); background: #15152a; }
.category-icon { font-size: 2rem; margin-bottom: 0.75rem; }
.category-name { font-size: 0.875rem; font-weight: 600; color: #e8e8f5; }
.category-count { font-size: 0.75rem; color: #5a5a85; margin-top: 0.25rem; }

/* CTA banner */
.cta-section {
  padding: 5rem 0;
  text-align: center;
  background: linear-gradient(160deg, #0f0a1e, #0c0c18);
  border-top: 1px solid #1e1e35;
}
.cta-section h2 { font-size: 1.75rem; font-weight: 700; color: #e8e8f5; margin: 0 0 1rem; }
.cta-section p { color: #8080b0; margin: 0 0 2rem; }

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #0e0e1a;
  border: 1px solid #1e1e35;
  border-radius: 10px;
  padding: 0.9rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  z-index: 9999;
  font-size: 0.875rem;
  color: #e8e8f5;
  animation: slideUp 0.3s ease;
}
.toast.success { border-color: rgba(52,211,153,0.3); }
.toast.error { border-color: rgba(248,113,113,0.3); }
.toast-icon { font-size: 1.1rem; }
@keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

</style>