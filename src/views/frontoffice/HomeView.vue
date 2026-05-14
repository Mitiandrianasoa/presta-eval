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

.home-page {

  min-height: 100vh;

  background: var(--bg);

}



/* ── Hero ─────────────────────────────────────────────── */

.hero {

  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);

  color: white;

  padding: 5rem 2rem 5.5rem;

  text-align: center;

  position: relative;

  overflow: hidden;

}



.hero::before {

  content: '';

  position: absolute;

  inset: 0;

  background: radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.06) 0%, transparent 55%);

  pointer-events: none;

}



.hero-content {

  position: relative;

  max-width: 640px;

  margin: 0 auto;

}



.hero-content h2 {

  font-size: 2.5rem;

  font-weight: 700;

  letter-spacing: -0.03em;

  margin: 0 0 1rem;

  line-height: 1.15;

}



.hero-content p {

  font-size: 1.1rem;

  opacity: 0.8;

  margin: 0 0 2.5rem;

  line-height: 1.6;

}



.cta-button {

  display: inline-block;

  background: white;

  color: var(--primary);

  padding: 0.85rem 2rem;

  border-radius: 6px;

  text-decoration: none;

  font-weight: 600;

  font-size: 0.95rem;

  transition: transform var(--transition), box-shadow var(--transition);

  box-shadow: 0 4px 14px rgba(0,0,0,0.2);

}



.cta-button:hover {

  transform: translateY(-2px);

  box-shadow: 0 8px 20px rgba(0,0,0,0.25);

}



/* ── Featured Products ────────────────────────────────── */

.featured-products {

  padding: 5rem 0;

}



.products-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));

  gap: 1.5rem;

  margin-bottom: 3rem;

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

  height: 200px;

  overflow: visible;

  background: var(--bg);

  position: relative;

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



/* Badges pour produits */

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

  z-index: 3;

}



.hot-badge {

  position: absolute;

  top: 35px;

  right: 10px;

  background: #ff4757;

  color: white;

  padding: 0.2rem 0.65rem;

  border-radius: 20px;

  font-size: 0.75rem;

  font-weight: 600;

  z-index: 2;

}



.new-badge {

  position: absolute;

  top: 35px;

  right: 10px;

  background: #2ed573;

  color: white;

  padding: 0.2rem 0.65rem;

  border-radius: 20px;

  font-size: 0.75rem;

  font-weight: 600;

  z-index: 2;

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

  font-size: 0.85rem;

  margin-bottom: 0.875rem;

  display: -webkit-box;

  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  overflow: hidden;

  line-height: 1.5;

}



.product-price .price {

  font-size: 1.2rem;

  font-weight: 700;

  color: var(--success);

  display: block;

  margin-bottom: 1rem;

}



.stock-badge {

  display: inline-block;

  font-size: 0.75rem;

  font-weight: 600;

  padding: 0.2rem 0.6rem;

  border-radius: 999px;

  margin-bottom: 0.75rem;

}



.stock-badge.available {

  background: #dcfce7;

  color: #15803d;

}



.stock-badge.unavailable {

  background: #fee2e2;

  color: #dc2626;

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

}



.add-to-cart-btn:hover:not(:disabled) {

  background: var(--primary-dark);

}



.add-to-cart-btn:disabled {

  background: #94a3b8;

  cursor: not-allowed;

  opacity: 0.7;

}



.add-to-cart-btn.added {

  background: var(--success);

}



.view-all {

  text-align: center;

}



.view-all-btn {

  display: inline-block;

  background: var(--navy);

  color: white;

  padding: 0.75rem 2rem;

  border-radius: 6px;

  text-decoration: none;

  font-weight: 600;

  font-size: 0.9rem;

  transition: background var(--transition);

}



.view-all-btn:hover {

  background: #1e293b;

}



/* ── Categories ───────────────────────────────────────── */

.categories {

  padding: 5rem 0;

  background: var(--surface);

  border-top: 1px solid var(--border);

  border-bottom: 1px solid var(--border);

}



.categories-grid {

  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));

  gap: 1.25rem;

}



.category-card {

  background: var(--bg);

  border: 1px solid var(--border);

  padding: 1.75rem 1.5rem;

  border-radius: var(--radius-lg);

  text-align: center;

  cursor: pointer;

  transition: background var(--transition), border-color var(--transition), transform var(--transition), box-shadow var(--transition);

}



.category-card:hover {

  background: var(--primary-light);

  border-color: #93c5fd;

  transform: translateY(-3px);

  box-shadow: var(--shadow-md);

}



.category-card h3 {

  margin: 0 0 0.6rem;

  color: var(--navy);

  font-size: 1rem;

  font-weight: 600;

}



.category-card p {

  color: var(--muted);

  margin: 0;

  font-size: 0.85rem;

  line-height: 1.5;

}



/* ── Loading / Error ──────────────────────────────────── */

.loading,

.error {

  text-align: center;

  padding: 3rem;

  font-size: 1rem;

  color: var(--muted);

}



.error {

  color: var(--error);

}



/* ── Responsive ───────────────────────────────────────── */

@media (max-width: 768px) {

  .hero-content h2 {

    font-size: 1.875rem;

  }



  .products-grid,

  .categories-grid {

    grid-template-columns: 1fr 1fr;

  }

}



@media (max-width: 480px) {

  .products-grid,

  .categories-grid {

    grid-template-columns: 1fr;

  }

}

</style>

