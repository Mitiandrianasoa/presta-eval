<template>
  <div class="product-detail-page">
    <FrontHeader />

    <main class="product-main">
      <div class="container">
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Chargement du produit...</p>
        </div>

        <div v-else-if="error" class="error">
          {{ error }}
          <div class="back-actions"><router-link to="/products" class="back-btn">Retour aux produits</router-link></div>
        </div>

        <div v-else-if="product" class="product-detail">
          <nav class="breadcrumb">
            <router-link to="/">Accueil</router-link><span class="separator">/</span>
            <router-link to="/products">Produits</router-link><span class="separator">/</span>
            <span class="current">{{ product.name }}</span>
          </nav>

          <div class="product-content">
            <!-- Images -->
            <div class="product-images">
              <div class="main-image">
                <img :src="currentImage || '/placeholder-product.jpg'" :alt="product.name" @error="handleImageError" />
              </div>
              <div v-if="productImages.length > 1" class="image-thumbnails">
                <div v-for="(image, index) in productImages" :key="index" class="thumbnail" :class="{ active: currentImage === image }" @click="currentImage = image">
                  <img :src="image" :alt="`${product.name} - Image ${index + 1}`" />
                </div>
              </div>
            </div>

            <!-- Infos produit -->
            <div class="product-info">
              <h1>{{ product.name }}</h1>
              <div class="product-meta">
                <span v-if="product.reference" class="reference">Référence: {{ product.reference }}</span>
              </div>

              <!-- AFFICHAGE DES COMBINAISONS -->
              <div v-if="combinationsList.length > 0" class="product-combinations">
                <div v-for="(attrGroup, groupName) in groupedAttributes" :key="groupName" class="combination-group">
                  <label class="combination-label">{{ groupName }} :</label>
                  <div class="combination-options">
                    <button
                      v-for="option in attrGroup"
                      :key="option.id"
                      @click="selectAttribute(groupName, option)"
                      :class="['combination-option', { 
                        active: selectedAttributes[groupName]?.id === option.id,
                        'in-stock': getCombinationStockForOption(groupName, option) > 0,
                        'out-of-stock': getCombinationStockForOption(groupName, option) <= 0
                      }]"
                      :disabled="getCombinationStockForOption(groupName, option) <= 0"
                    >
                      {{ option.name }}
                      <span v-if="getCombinationStockForOption(groupName, option) <= 0" class="out-stock-label">(Rupture)</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Prix dynamique -->
              <div class="product-price">
                <span class="current-price">{{ formatPrice(selectedPrice) }}</span>
                <span v-if="showOldPrice" class="old-price">{{ formatPrice(product.wholesale_price) }}</span>
                <span v-if="product.on_sale" class="sale-badge">Promotion</span>
              </div>

              <!-- Stock dynamique -->
              <div class="stock-info">
                <span v-if="selectedStock > 0" class="stock available">
                  <i class="fas fa-check-circle"></i> En stock ({{ selectedStock }} disponible{{ selectedStock > 1 ? 's' : '' }})
                </span>
                <span v-else class="stock unavailable">
                  <i class="fas fa-times-circle"></i> Rupture de stock
                </span>
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

              <!-- Ajout au panier -->
              <div class="add-to-cart-section">
                <div class="quantity-selector">
                  <label for="quantity">Quantité:</label>
                  <div class="quantity-controls">
                    <button @click="decreaseQuantity" :disabled="quantity <= 1" class="quantity-btn">-</button>
                    <input id="quantity" v-model.number="quantity" type="number" min="1" :max="selectedStock" class="quantity-input" />
                    <button @click="increaseQuantity" :disabled="quantity >= selectedStock" class="quantity-btn">+</button>
                  </div>
                </div>
                <button class="add-to-cart-btn" @click="addToCart" :disabled="selectedStock <= 0 || addingToCart">
                  <i class="fas fa-shopping-cart"></i>
                  {{ addingToCart ? 'Ajout en cours...' : 'Ajouter au panier' }}
                </button>
              </div>

              <div class="product-actions">
                <button @click="goBack" class="secondary-btn"><i class="fas fa-arrow-left"></i> Retour aux produits</button>
              </div>
            </div>
          </div>

          <!-- Produits similaires -->
          <div v-if="relatedProducts.length > 0" class="related-products">
            <h2>Produits similaires</h2>
            <div class="related-grid">
              <div v-for="related in relatedProducts" :key="related.id" class="related-product-card" @click="goToProduct(related.id)">
                <div class="related-image"><img :src="related.image_url || '/placeholder-product.jpg'" :alt="related.name" @error="handleImageError" /></div>
                <div class="related-info"><h4>{{ related.name }}</h4><span class="related-price">{{ formatPrice(related.price) }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="front-footer">
      <div class="container">
        <div class="footer-grid"><div><h3>PrestaShop</h3><p>Votre boutique de confiance</p></div></div>
        <div class="footer-bottom"><p>&copy; 2025 PrestaShop. Tous droits réservés.</p></div>
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
const addingToCart = ref(false);
const quantity = ref(1);
const currentImage = ref('');

// Stockage des combinaisons
const combinationsList = ref<any[]>([]);
const combinationMap = ref<Map<string, any>>(new Map());
const selectedAttributes = ref<Record<string, any>>({});
const selectedCombinationId = ref<string | null>(null);
const selectedPrice = ref<string>('');
const selectedStock = ref<number>(0);
const basePriceHT = ref<number>(0);
const taxRate = ref<number>(0);

// Structure pour les attributs groupés
const groupedAttributes = computed(() => {
  const groups: Record<string, any[]> = {};
  
  for (const combo of combinationsList.value) {
    for (const attr of combo.attributes) {
      if (!groups[attr.groupName]) {
        groups[attr.groupName] = [];
      }
      const exists = groups[attr.groupName].some(a => a.id === attr.attributeId);
      if (!exists) {
        groups[attr.groupName].push({
          id: attr.attributeId,
          name: attr.attributeName
        });
      }
    }
  }
  
  return groups;
});

const productImages = computed(() => {
  if (!product.value) return [];
  const ids: string[] = product.value.imageIds || [];
  if (ids.length === 0 && product.value.image_url) return [product.value.image_url];
  return ids.map((imgId: string) => `/api/images/products/${product.value.id}/${imgId}`);
});

const showOldPrice = computed(() => {
  if (!product.value) return false;
  return product.value.wholesale_price && parseFloat(product.value.wholesale_price) > parseFloat(selectedPrice.value);
});

// Trouver le stock pour une option
const getCombinationStockForOption = (groupName: string, option: any) => {
  // Trouver la combinaison qui a cet attribut
  const matchingCombos = combinationsList.value.filter(combo =>
    combo.attributes.some(attr => attr.groupName === groupName && attr.attributeId === option.id)
  );
  
  if (matchingCombos.length === 0) return 0;
  
  // Si tous les attributs sont sélectionnés, trouver la combinaison exacte
  const selectedValues = Object.values(selectedAttributes.value);
  if (selectedValues.length === Object.keys(groupedAttributes.value).length) {
    const exactCombo = combinationsList.value.find(combo =>
      combo.attributes.length === selectedValues.length &&
      selectedValues.every((sel: any) => 
        combo.attributes.some(attr => attr.attributeId === sel.id)
      )
    );
    return exactCombo?.stock || 0;
  }
  
  // Sinon, retourner le stock maximum parmi les combinaisons possibles
  return Math.max(...matchingCombos.map(c => c.stock), 0);
};

// Sélectionner un attribut
const selectAttribute = (groupName: string, option: any) => {
  selectedAttributes.value[groupName] = option;
  updateSelectedCombination();
};

// Mettre à jour la combinaison sélectionnée
const updateSelectedCombination = () => {
  const selectedValues = Object.values(selectedAttributes.value);
  const expectedAttrCount = Object.keys(groupedAttributes.value).length;
  
  if (selectedValues.length === expectedAttrCount) {
    // Trouver la combinaison exacte
    const matchingCombo = combinationsList.value.find(combo =>
      combo.attributes.length === selectedValues.length &&
      selectedValues.every((sel: any) => 
        combo.attributes.some(attr => attr.attributeId === sel.id)
      )
    );
    
    if (matchingCombo) {
      selectedCombinationId.value = matchingCombo.id;
      const finalPriceHT = basePriceHT.value + matchingCombo.priceImpact;
      const finalPriceTTC = finalPriceHT * (1 + taxRate.value / 100);
      selectedPrice.value = finalPriceTTC.toFixed(6);
      selectedStock.value = matchingCombo.stock;
      return;
    }
  }
  
  // Pas toutes les combinaisons sélectionnées
  selectedCombinationId.value = null;
  const finalPriceTTC = basePriceHT.value * (1 + taxRate.value / 100);
  selectedPrice.value = finalPriceTTC.toFixed(6);
  selectedStock.value = 0;
};

// Charger le produit
const loadProduct = async () => {
  const productId = route.params.id as string;
  if (!productId) { error.value = 'ID non spécifié'; return; }
  loading.value = true;
  error.value = '';
  try {
    const [pRes, stockRes, comboRes] = await Promise.all([
      api.get(`/products/${productId}?output_format=XML&display=full`),
      api.get(`/stock_availables?output_format=XML&filter[id_product]=[${productId}]&display=[id,id_product,id_product_attribute,quantity]`),
      api.get(`/combinations?output_format=XML&display=full&filter[id_product]=[${productId}]`)
    ]);

    const parser = new DOMParser();
    const productEl = parser.parseFromString(pRes.data, 'text/xml').querySelector('product');
    if (!productEl) throw new Error('Produit non trouvé');

    const imageId = productEl.querySelector('associations images image id')?.textContent?.trim() || productEl.querySelector('image id')?.textContent?.trim();
    let price = productEl.querySelector('price')?.textContent?.trim() || '0';
    price = price.replace(',', '.');
    basePriceHT.value = parseFloat(price);
    
    // Récupérer le taux de taxe
    const idTaxRulesGroup = productEl.querySelector('id_tax_rules_group')?.textContent?.trim();
    if (idTaxRulesGroup && idTaxRulesGroup !== '0') {
      try {
        const taxRulesRes = await api.get(`/tax_rules?filter[id_tax_rules_group]=${idTaxRulesGroup}&display=[id_tax]`);
        const taxRulesDoc = parser.parseFromString(taxRulesRes.data, 'text/xml');
        const idTax = taxRulesDoc.querySelector('tax_rule id_tax')?.textContent?.trim();
        if (idTax) {
          const taxRes = await api.get(`/taxes/${idTax}?output_format=XML`);
          const taxDoc = parser.parseFromString(taxRes.data, 'text/xml');
          taxRate.value = parseFloat(taxDoc.querySelector('tax rate')?.textContent?.trim() || '0');
        }
      } catch (e) { console.warn('Erreur récupération taxe:', e); }
    }

    // Stock
    const stockMap: Record<string, number> = {};
    const stockXml = parser.parseFromString(stockRes.data, 'text/xml');
    stockXml.querySelectorAll('stock_available').forEach(el => {
      const attrId = el.querySelector('id_product_attribute')?.textContent?.trim() || '0';
      const qty = parseInt(el.querySelector('quantity')?.textContent?.trim() || '0');
      stockMap[attrId] = qty;
    });

    product.value = {
      id: productId,
      name: productEl.querySelector('name')?.textContent?.trim() || '',
      description: productEl.querySelector('description')?.textContent?.trim() || '',
      description_short: productEl.querySelector('description_short')?.textContent?.trim() || '',
      price: price,
      wholesale_price: productEl.querySelector('wholesale_price')?.textContent?.trim() || '',
      reference: productEl.querySelector('reference')?.textContent?.trim() || '',
      id_category_default: productEl.querySelector('id_category_default')?.textContent?.trim() || '',
      on_sale: productEl.querySelector('on_sale')?.textContent?.trim() === '1',
      image_url: imageId ? `/api/images/products/${productId}/${imageId}` : null,
      imageIds: Array.from(productEl.querySelectorAll('associations images image id')).map(n => n.textContent?.trim()).filter(Boolean)
    };

    // Charger les combinaisons
    await loadCombinations(productId, stockMap, comboRes.data);
    
    // Stock simple (sans combinaison)
    if (combinationsList.value.length === 0) {
      selectedStock.value = stockMap['0'] || 0;
    }
    
    const finalPriceTTC = basePriceHT.value * (1 + taxRate.value / 100);
    selectedPrice.value = finalPriceTTC.toFixed(6);
    
    await loadRelatedProducts();
    
    if (productImages.value.length > 0) currentImage.value = productImages.value[0];
    
  } catch (err: any) {
    console.error('Erreur chargement produit:', err);
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

// Charger les combinaisons avec leurs attributs
const loadCombinations = async (productId: string, stockMap: Record<string, number>, comboXmlData: string) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(comboXmlData, 'text/xml');
    const comboElements = xmlDoc.querySelectorAll('combination');
    
    const combos = [];
    
    for (const el of comboElements) {
      const id = el.querySelector('id')?.textContent?.trim();
      const priceImpact = parseFloat(el.querySelector('price')?.textContent?.trim() || '0');
      const quantity = stockMap[id || ''] || 0;
      
      // Récupérer les valeurs d'attributs de cette combinaison
      const attrValueIds = Array.from(el.querySelectorAll('associations product_option_values product_option_value id'))
        .map(v => v.textContent?.trim())
        .filter(Boolean);
      
      // Pour chaque attribut, récupérer le groupe et le nom
      const attributes = [];
      for (const attrId of attrValueIds) {
        try {
          const attrRes = await api.get(`/product_option_values/${attrId}?output_format=XML`);
          const attrDoc = parser.parseFromString(attrRes.data, 'text/xml');
          const attrValueName = attrDoc.querySelector('product_option_value name language[id="2"]')?.textContent?.trim() ||
                                attrDoc.querySelector('product_option_value name language[id="1"]')?.textContent?.trim();
          
          const groupId = attrDoc.querySelector('product_option_value id_attribute_group')?.textContent?.trim();
          
          let groupName = '';
          if (groupId) {
            const groupRes = await api.get(`/product_options/${groupId}?output_format=XML`);
            const groupDoc = parser.parseFromString(groupRes.data, 'text/xml');
            groupName = groupDoc.querySelector('product_option name language[id="2"]')?.textContent?.trim() ||
                        groupDoc.querySelector('product_option name language[id="1"]')?.textContent?.trim() ||
                        `Attribut ${groupId}`;
          }
          
          attributes.push({
            attributeId: attrId,
            attributeName: attrValueName || `Option ${attrId}`,
            groupId: groupId,
            groupName: groupName
          });
        } catch (e) {
          console.warn(`Erreur chargement attribut ${attrId}:`, e);
        }
      }
      
      if (id) {
        combos.push({
          id: id,
          priceImpact: priceImpact,
          stock: quantity,
          attributes: attributes
        });
      }
    }
    
    combinationsList.value = combos;
    console.log('Combinaisons chargées:', combos);
    
  } catch (err) { 
    console.error('Erreur chargement combinaisons:', err); 
  }
};

// Charger produits similaires
const loadRelatedProducts = async () => {
  if (!product.value?.id_category_default) return;
  try {
    const response = await api.get(`/products?output_format=XML&display=full&filter[id_category_default]=[${product.value.id_category_default}]&limit=5`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const products = xmlDoc.querySelectorAll('product');
    relatedProducts.value = Array.from(products)
      .filter(el => el.querySelector('id')?.textContent?.trim() !== product.value.id)
      .slice(0, 4)
      .map(el => {
        const pid = el.querySelector('id')?.textContent?.trim() || '';
        const imgId = el.querySelector('associations images image id')?.textContent?.trim() || el.querySelector('image id')?.textContent?.trim();
        let price = el.querySelector('price')?.textContent?.trim() || '0';
        price = price.replace(',', '.');
        return { 
          id: pid, 
          name: el.querySelector('name')?.textContent?.trim() || '', 
          price: price, 
          image_url: imgId ? `/api/images/products/${pid}/${imgId}` : null 
        };
      });
  } catch (err) { console.error('Erreur produits similaires:', err); }
};

// Ajouter au panier
const addToCart = async () => {
  if (selectedStock <= 0) return;
  addingToCart.value = true;
  
  // Construire le nom de la combinaison
  let combinationName = '';
  for (const [groupName, option] of Object.entries(selectedAttributes.value)) {
    combinationName += `${groupName}: ${(option as any).name}, `;
  }
  combinationName = combinationName.slice(0, -2);
  
  const cartItem = {
    id: product.value.id,
    name: product.value.name,
    price: selectedPrice.value,
    image_url: product.value.image_url,
    quantity: quantity.value,
    reference: product.value.reference,
    id_product_attribute: selectedCombinationId.value || '0',
    combination_name: combinationName || null,
    combination_reference: selectedCombinationId.value ? `${product.value.reference}_${selectedCombinationId.value}` : null
  };
  
  const savedCart = localStorage.getItem('prestashop_cart');
  const cartItems = savedCart ? JSON.parse(savedCart) : [];
  const existingIndex = cartItems.findIndex((item: any) => 
    item.id === cartItem.id && 
    String(item.id_product_attribute) === String(cartItem.id_product_attribute)
  );
  
  if (existingIndex !== -1) {
    cartItems[existingIndex].quantity += cartItem.quantity;
  } else {
    cartItems.push(cartItem);
  }
  
  localStorage.setItem('prestashop_cart', JSON.stringify(cartItems));
  window.dispatchEvent(new Event('prestashop:cart-updated'));

  quantity.value = 1;
  setTimeout(() => { addingToCart.value = false; }, 500);
};

const increaseQuantity = () => { if (quantity.value < selectedStock.value) quantity.value++; };
const decreaseQuantity = () => { if (quantity.value > 1) quantity.value--; };
const goToProduct = (id: string) => router.push(`/product/${id}`);
const goBack = () => router.push('/products');
const formatPrice = (price: string) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(price));
const handleImageError = (e: Event) => { (e.target as HTMLImageElement).src = '/placeholder-product.jpg'; };

onMounted(() => { loadProduct(); });
</script>

<style scoped>
/* Styles existants - garder les mêmes */
.product-detail-page { min-height: 100vh; background: var(--bg); }
.product-main { padding: 2.5rem 0 5rem; }
.loading, .error { text-align: center; padding: 5rem; }
.spinner { border: 3px solid var(--border); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.error { color: var(--error); }
.back-actions { margin-top: 2rem; }
.back-btn, .secondary-btn { display: inline-block; background: var(--primary); color: white; padding: 0.75rem 1.75rem; border-radius: 6px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; font-family: inherit; }
.secondary-btn { background: transparent; color: var(--primary); border: 1.5px solid var(--primary); }
.product-detail { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 2rem 2.5rem; }
.breadcrumb { display: flex; align-items: center; gap: 0.25rem; margin-bottom: 2rem; font-size: 0.85rem; }
.breadcrumb a { color: var(--primary); text-decoration: none; }
.current { color: var(--text); font-weight: 500; }
.product-content { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; margin-bottom: 3rem; }
.product-images { position: sticky; top: 80px; height: fit-content; }
.main-image { border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); margin-bottom: 0.75rem; }
.main-image img { width: 100%; height: 400px; object-fit: cover; }
.image-thumbnails { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.thumbnail { border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid var(--border); }
.thumbnail.active, .thumbnail:hover { border-color: var(--primary); }
.thumbnail img { width: 100%; height: 72px; object-fit: cover; }
.product-info h1 { font-size: 1.75rem; font-weight: 700; color: var(--navy); margin: 0 0 0.75rem; }
.product-meta { margin-bottom: 1.5rem; font-size: 0.825rem; color: var(--muted); }
.product-combinations { margin-bottom: 1.5rem; padding: 1rem; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
.combination-group { margin-bottom: 1rem; }
.combination-group:last-child { margin-bottom: 0; }
.combination-label { display: block; font-weight: 600; font-size: 0.85rem; color: var(--navy); margin-bottom: 0.5rem; }
.combination-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.combination-option { padding: 0.4rem 1rem; border: 1.5px solid var(--border); border-radius: 30px; background: var(--surface); font-size: 0.85rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.combination-option:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-light); }
.combination-option.active { border-color: var(--primary); background: var(--primary); color: white; }
.combination-option.out-of-stock { opacity: 0.5; cursor: not-allowed; text-decoration: line-through; }
.out-stock-label { font-size: 0.7rem; margin-left: 0.25rem; }
.product-price { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; padding: 1rem 1.25rem; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
.current-price { font-size: 1.75rem; font-weight: 700; color: var(--success); }
.old-price { font-size: 1.1rem; color: #94a3b8; text-decoration: line-through; }
.sale-badge { background: var(--error); color: white; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.75rem; margin-left: auto; }
.stock-info { margin-bottom: 1.5rem; font-size: 0.9rem; font-weight: 600; }
.stock.available { color: var(--success); }
.stock.unavailable { color: var(--error); }
.product-description, .product-features { margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
.product-description h3, .product-features h3 { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; margin: 0 0 0.75rem; }
.feature-item { display: flex; padding: 0.55rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
.feature-name { font-weight: 500; min-width: 160px; }
.add-to-cart-section { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
.quantity-selector { display: flex; align-items: center; gap: 1rem; }
.quantity-selector label { font-weight: 500; min-width: 70px; }
.quantity-controls { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.quantity-btn { background: var(--bg); border: none; width: 38px; height: 38px; cursor: pointer; font-size: 1.1rem; }
.quantity-input { width: 56px; text-align: center; border: none; border-left: 1px solid var(--border); border-right: 1px solid var(--border); height: 38px; font-family: inherit; }
.add-to-cart-btn { background: var(--primary); color: white; border: none; padding: 0.9rem 2rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.add-to-cart-btn:hover:not(:disabled) { background: var(--primary-dark); }
.add-to-cart-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.related-products { border-top: 1px solid var(--border); padding-top: 2.5rem; }
.related-products h2 { font-size: 1.15rem; margin: 0 0 1.5rem; }
.related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.25rem; }
.related-product-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: all 0.2s; }
.related-product-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.related-image { height: 140px; overflow: hidden; }
.related-image img { width: 100%; height: 100%; object-fit: cover; }
.related-info { padding: 0.875rem 1rem; }
.related-info h4 { margin: 0 0 0.35rem; font-size: 0.85rem; }
.related-price { color: var(--success); font-weight: 600; font-size: 0.9rem; }
.front-footer { background: var(--navy); color: white; padding: 2rem 0; margin-top: auto; }
.footer-bottom { text-align: center; font-size: 0.875rem; }
.container { max-width: 1280px; margin: 0 auto; padding: 0 1rem; }
:root { --bg: #fafaf9; --surface: #ffffff; --border: #e7e5e4; --text: #292524; --muted: #78716c; --navy: #1c1917; --primary: #7c3aed; --primary-dark: #6d28d9; --primary-light: #f5f3ff; --success: #059669; --error: #dc2626; --radius: 8px; --radius-lg: 14px; }
@media (max-width: 768px) { .product-content { grid-template-columns: 1fr; gap: 2rem; } .main-image img { height: 280px; } .product-info h1 { font-size: 1.4rem; } .current-price { font-size: 1.4rem; } }
</style>