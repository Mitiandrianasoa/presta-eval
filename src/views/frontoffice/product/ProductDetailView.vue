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
          <div class="back-actions">
            <router-link to="/products" class="back-btn">Retour aux produits</router-link>
          </div>
        </div>

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
            <!-- Images -->
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

            <!-- Info -->
            <div class="product-info">
              <h1>{{ product.name }}</h1>

              <div class="product-meta">
                <span v-if="product.reference" class="reference">Référence: {{ product.reference }}</span>
                <span v-if="product.ean13" class="ean">EAN: {{ product.ean13 }}</span>
              </div>

              <div class="product-price">
                <span v-if="product.price" class="current-price">{{ formatPrice(product.price) }}</span>
                <span
                  v-if="product.wholesale_price && product.wholesale_price !== product.price"
                  class="old-price"
                >{{ formatPrice(product.wholesale_price) }}</span>
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
                    <span class="feature-name">{{ feature.name }} :</span>
                    <span class="feature-value">{{ feature.value }}</span>
                  </div>
                </div>
              </div>

              <!-- ── Déclinaisons ── -->
              <div v-if="attributeGroups.length > 0" class="combinations-section">
                <div v-for="group in attributeGroups" :key="group.id" class="attribute-group">
                  <div class="group-label">
                    {{ group.name }}
                    <span v-if="selectedAttributes[group.id]" class="selected-hint">
                      : {{ valueNameById(selectedAttributes[group.id]) }}
                    </span>
                  </div>

                  <div class="attribute-chips">
                    <!-- Swatches couleur -->
                    <template v-if="group.isColor">
                      <button
                        v-for="val in group.values"
                        :key="val.id"
                        :title="val.name"
                        :class="['color-swatch', {
                          selected:    selectedAttributes[group.id] === val.id,
                          unavailable: !isValueAvailable(group.id, val.id),
                        }]"
                        :style="val.color ? { background: val.color } : {}"
                        @click="selectAttribute(group.id, val.id)"
                      >
                        <span v-if="!val.color" class="swatch-label">{{ val.name }}</span>
                      </button>
                    </template>

                    <!-- Chips taille / autre -->
                    <template v-else>
                      <button
                        v-for="val in group.values"
                        :key="val.id"
                        :class="['size-chip', {
                          selected:    selectedAttributes[group.id] === val.id,
                          unavailable: !isValueAvailable(group.id, val.id),
                        }]"
                        @click="selectAttribute(group.id, val.id)"
                      >
                        {{ val.name }}
                      </button>
                    </template>
                  </div>
                </div>

                <p v-if="!allAttributesSelected" class="combo-hint">
                  Sélectionnez toutes les options pour voir la disponibilité
                </p>
              </div>

              <!-- ── Stock ── -->
              <div class="stock-info">
                <!-- Produit simple (pas de déclinaisons) -->
                <template v-if="attributeGroups.length === 0">
                  <span v-if="product.quantity > 0" class="stock available">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    En stock — <strong>{{ product.quantity }}</strong> disponible(s)
                  </span>
                  <span v-else class="stock unavailable">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Rupture de stock
                  </span>
                </template>

                <!-- Produit avec déclinaisons -->
                <template v-else-if="allAttributesSelected">
                  <span v-if="(selectedCombination?.stock ?? 0) > 0" class="stock available">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    En stock — <strong>{{ selectedCombination!.stock }}</strong> disponible(s)
                  </span>
                  <span v-else class="stock unavailable">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Épuisé pour cette déclinaison
                  </span>
                </template>
              </div>

              <!-- ── Ajout au panier ── -->
              <div class="add-to-cart-section">
                <div class="quantity-selector">
                  <label for="quantity">Quantité :</label>
                  <div class="quantity-controls">
                    <button @click="decreaseQuantity" :disabled="quantity <= 1" class="quantity-btn">−</button>
                    <input
                      id="quantity"
                      v-model.number="quantity"
                      type="number"
                      min="1"
                      :max="effectiveStock ?? 999"
                      class="quantity-input"
                    />
                    <button @click="increaseQuantity" :disabled="quantity >= (effectiveStock ?? 999)" class="quantity-btn">+</button>
                  </div>
                </div>

                <button
                  class="add-to-cart-btn"
                  @click="addToCart"
                  :disabled="isAddToCartDisabled"
                >
                  {{ loading ? 'Ajout en cours...' : 'Ajouter au panier' }}
                </button>
              </div>

              <div class="product-actions">
                <button @click="goBack" class="secondary-btn">← Retour aux produits</button>
              </div>
            </div>
          </div>

          <!-- Produits similaires -->
          <div v-if="relatedProducts.length > 0" class="related-products">
            <h2>Produits similaires</h2>
            <div class="related-grid">
              <div
                v-for="rp in relatedProducts"
                :key="rp.id"
                class="related-product-card"
                @click="goToProduct(rp.id)"
              >
                <div class="related-image">
                  <img :src="rp.image_url || '/placeholder-product.jpg'" :alt="rp.name" @error="handleImageError" />
                </div>
                <div class="related-info">
                  <h4>{{ rp.name }}</h4>
                  <span class="related-price">{{ formatPrice(rp.price) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

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
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../../api/api';
import FrontHeader from '../../../components/FrontHeader.vue';
import { useAuth } from '../../../services/useAuth';
import { guestCartService } from '../../../services/guestCartService';

const route  = useRoute();
const router = useRouter();

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const txt   = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() ?? '';

// ── State ──────────────────────────────────────────────────────────────────────
const product        = ref<any>(null);
const relatedProducts = ref<any[]>([]);
const loading        = ref(false);
const error          = ref('');
const quantity       = ref(1);
const currentImage   = ref('');
const cart           = ref<any[]>([]);

// Combinaisons
interface AttrValue  { id: string; name: string; color: string }
interface AttrGroup  { id: string; name: string; isColor: boolean; values: AttrValue[] }
interface Combination { id: string; attributeValues: Array<{ groupId: string; valueId: string }>; stock: number }

const attributeGroups   = ref<AttrGroup[]>([]);
const combinations      = ref<Combination[]>([]);
const selectedAttributes = reactive<Record<string, string>>({});

// ── Computed ───────────────────────────────────────────────────────────────────
const productImages = computed(() => {
  if (!product.value) return [];
  const ids: string[] = product.value.imageIds || [];
  if (ids.length === 0 && product.value.image_url) return [product.value.image_url];
  return ids.map((imgId: string) => `/api/images/products/${product.value.id}/${imgId}`);
});

const allAttributesSelected = computed(() =>
  attributeGroups.value.length > 0 &&
  attributeGroups.value.every(g => selectedAttributes[g.id] !== undefined)
);

const selectedCombination = computed<Combination | null>(() => {
  if (!allAttributesSelected.value) return null;
  return combinations.value.find(combo =>
    Object.entries(selectedAttributes).every(([gid, vid]) =>
      combo.attributeValues.some(av => av.groupId === gid && av.valueId === vid)
    )
  ) ?? null;
});

const effectiveStock = computed<number | null>(() => {
  if (attributeGroups.value.length === 0) return product.value?.quantity ?? 0;
  if (!allAttributesSelected.value) return null;
  return selectedCombination.value?.stock ?? 0;
});

const isAddToCartDisabled = computed(() => {
  if (loading.value) return true;
  if (effectiveStock.value === null) return true; // combinaisons non toutes sélectionnées
  return effectiveStock.value <= 0;
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function valueNameById(vid: string): string {
  for (const g of attributeGroups.value) {
    const v = g.values.find(v => v.id === vid);
    if (v) return v.name;
  }
  return '';
}

function isValueAvailable(groupId: string, valueId: string): boolean {
  return combinations.value.some(combo =>
    combo.attributeValues.some(av => av.groupId === groupId && av.valueId === valueId) &&
    combo.stock > 0
  );
}

function selectAttribute(groupId: string, valueId: string) {
  if (selectedAttributes[groupId] === valueId) {
    delete selectedAttributes[groupId];
  } else {
    selectedAttributes[groupId] = valueId;
  }
}

// ── Data loading ───────────────────────────────────────────────────────────────
const loadProduct = async () => {
  const productId = route.params.id as string;
  if (!productId) { error.value = 'ID de produit non spécifié'; return; }

  loading.value = true;
  error.value   = '';

  try {
    const [pRes, sRes] = await Promise.all([
      api.get(`/products/${productId}?output_format=XML&display=full`),
      api.get(`/stock_availables?output_format=XML&display=full&filter[id_product]=[${productId}]&limit=200`),
    ]);

    const productEl = parse(pRes.data).querySelector('product');
    if (!productEl) { error.value = 'Produit non trouvé'; return; }

    // Cherche l'entrée de stock de base (id_product_attribute=0)
    // Fallback : somme des stocks de combinaisons si pas d'entrée de base
    const stockEls = Array.from(parse(sRes.data).querySelectorAll('stock_available'));
    const baseEl   = stockEls.find(el => txt(el, 'id_product_attribute') === '0');
    const baseQty  = baseEl ? (parseInt(txt(baseEl, 'quantity')) || 0) : 0;
    const combQty  = stockEls
      .filter(el => txt(el, 'id_product_attribute') !== '0')
      .reduce((s, el) => s + (parseInt(txt(el, 'quantity')) || 0), 0);
    const realQty  = baseEl ? baseQty : combQty;
    const imageId     = productEl.querySelector('associations images image id')?.textContent?.trim()
                     || productEl.querySelector('image id')?.textContent?.trim();

    product.value = {
      id:                  productId,
      name:                txt(productEl, 'name'),
      description:         txt(productEl, 'description'),
      description_short:   txt(productEl, 'description_short'),
      price:               txt(productEl, 'price'),
      wholesale_price:     txt(productEl, 'wholesale_price'),
      reference:           txt(productEl, 'reference'),
      ean13:               txt(productEl, 'ean13'),
      quantity:            realQty,
      id_category_default: txt(productEl, 'id_category_default'),
      on_sale:             txt(productEl, 'on_sale') === '1',
      image_url:           imageId ? `/api/images/products/${productId}/${imageId}` : null,
      imageIds:            Array.from(productEl.querySelectorAll('associations images image id'))
                             .map(n => n.textContent?.trim()).filter(Boolean),
    };

    if (productImages.value.length > 0) currentImage.value = productImages.value[0];

    await Promise.all([
      loadProductFeatures(productId),
      loadCombinations(productId),
      loadRelatedProducts(product.value.id_category_default, productId),
    ]);

  } catch (err: any) {
    error.value = `Erreur lors du chargement : ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const loadCombinations = async (productId: string) => {
  try {
    const combRes = await api.get(
      `/combinations?output_format=XML&display=full&filter[id_product]=[${productId}]&limit=200`
    );
    const combEls = Array.from(parse(combRes.data).querySelectorAll('combination'));
    if (combEls.length === 0) return;

    // Collecter tous les IDs de valeurs d'attribut
    const allValueIds = [...new Set(
      combEls.flatMap(el =>
        Array.from(el.querySelectorAll('product_option_values product_option_value id'))
          .map(n => n.textContent?.trim()).filter(Boolean) as string[]
      )
    )];
    if (allValueIds.length === 0) return;

    // Charger les valeurs et groupes en parallèle avec tous les stocks
    const [ovRes, stockRes] = await Promise.all([
      api.get(`/product_option_values?output_format=XML&display=full&filter[id]=[${allValueIds.join('|')}]&limit=500`),
      api.get(`/stock_availables?output_format=XML&display=full&filter[id_product]=[${productId}]&limit=500`),
    ]);

    // Carte optionValue id → { name, groupId, color }
    const ovMap: Record<string, { name: string; groupId: string; color: string }> = {};
    const groupIds = new Set<string>();

    parse(ovRes.data).querySelectorAll('product_option_value').forEach(el => {
      const id    = txt(el, 'id');
      const gid   = txt(el, 'id_attribute_group');
      const name  = el.querySelector('name language')?.textContent?.trim() || txt(el, 'name');
      const color = txt(el, 'color');
      ovMap[id] = { name, groupId: gid, color };
      if (gid) groupIds.add(gid);
    });

    // Charger les groupes (product_options)
    const groupRes = await api.get(
      `/product_options?output_format=XML&display=full&filter[id]=[${[...groupIds].join('|')}]&limit=100`
    );
    const groupMap: Record<string, { name: string; type: string }> = {};
    parse(groupRes.data).querySelectorAll('product_option').forEach(el => {
      const id   = txt(el, 'id');
      const name = el.querySelector('name language')?.textContent?.trim() || txt(el, 'name');
      const type = txt(el, 'group_type');
      groupMap[id] = { name, type };
    });

    // Stock par id_product_attribute
    const stockMap: Record<string, number> = {};
    parse(stockRes.data).querySelectorAll('stock_available').forEach(el => {
      const idAttr = txt(el, 'id_product_attribute');
      stockMap[idAttr] = parseInt(txt(el, 'quantity')) || 0;
    });

    // Construire les combinaisons
    combinations.value = combEls.map(el => {
      const id = txt(el, 'id');
      const valueIds = Array.from(el.querySelectorAll('product_option_values product_option_value id'))
        .map(n => n.textContent?.trim()).filter(Boolean) as string[];

      return {
        id,
        attributeValues: valueIds
          .filter(vid => ovMap[vid])
          .map(vid => ({ groupId: ovMap[vid].groupId, valueId: vid })),
        stock: stockMap[id] ?? 0,
      };
    });

    // Construire les groupes pour l'affichage
    const groupsMap: Record<string, AttrGroup> = {};
    for (const [vid, ov] of Object.entries(ovMap)) {
      if (!ov.groupId) continue;
      if (!groupsMap[ov.groupId]) {
        const g = groupMap[ov.groupId];
        groupsMap[ov.groupId] = {
          id:      ov.groupId,
          name:    g?.name || `Groupe ${ov.groupId}`,
          isColor: g?.type === 'color' || false,
          values:  [],
        };
      }
      if (!groupsMap[ov.groupId].values.find(v => v.id === vid)) {
        groupsMap[ov.groupId].values.push({ id: vid, name: ov.name, color: ov.color });
        // Détecter couleur par présence d'un code hex
        if (ov.color && ov.color.startsWith('#') && ov.color.length >= 4) {
          groupsMap[ov.groupId].isColor = true;
        }
      }
    }

    attributeGroups.value = Object.values(groupsMap);

    // Pré-sélectionner la première valeur disponible (stock > 0) pour chaque groupe
    for (const group of attributeGroups.value) {
      const first = group.values.find(v =>
        combinations.value.some(c =>
          c.attributeValues.some(av => av.groupId === group.id && av.valueId === v.id) &&
          c.stock > 0
        )
      ) ?? group.values[0]; // fallback sur la première valeur même sans stock
      if (first) selectedAttributes[group.id] = first.id;
    }

  } catch (err) {
    console.error('Erreur chargement combinaisons:', err);
  }
};

const loadProductFeatures = async (productId: string) => {
  try {
    const res  = await api.get(`/product_features?output_format=XML&display=full&filter[id_product]=[${productId}]`);
    const fEls = Array.from(parse(res.data).querySelectorAll('product_feature'));
    const features = [];

    for (const featureEl of fEls) {
      const fid = txt(featureEl, 'id_feature');
      const vid = txt(featureEl, 'id_feature_value');
      if (!fid || !vid) continue;

      const [fRes, vRes] = await Promise.all([
        api.get(`/product_features/${fid}?output_format=XML&display=full`),
        api.get(`/product_feature_values/${vid}?output_format=XML&display=full`),
      ]);

      const fname = parse(fRes.data).querySelector('name')?.textContent?.trim();
      const fval  = parse(vRes.data).querySelector('value')?.textContent?.trim();
      if (fname && fval) features.push({ id: fid, name: fname, value: fval });
    }

    if (product.value) product.value.features = features;
  } catch (err) {
    console.error('Erreur caractéristiques:', err);
  }
};

const loadRelatedProducts = async (categoryId: string, currentId: string) => {
  try {
    const res  = await api.get(`/products?output_format=XML&display=full&filter[id_category_default]=[${categoryId}]&limit=4`);
    relatedProducts.value = Array.from(parse(res.data).querySelectorAll('product'))
      .filter(el => txt(el, 'id') !== currentId)
      .slice(0, 3)
      .map(el => {
        const pid   = txt(el, 'id');
        const imgId = el.querySelector('associations images image id')?.textContent?.trim() || txt(el, 'image id');
        return {
          id:        pid,
          name:      el.querySelector('name')?.textContent?.trim() || '',
          price:     txt(el, 'price'),
          image_url: imgId ? `/api/images/products/${pid}/${imgId}` : null,
        };
      });
  } catch (err) {
    console.error('Erreur produits similaires:', err);
  }
};

const { isLoggedIn } = useAuth();

// ── Panier ─────────────────────────────────────────────────────────────────────
const loadCart  = () => { const s = localStorage.getItem('prestashop_cart'); if (s) cart.value = JSON.parse(s); };
const saveCart  = () => { localStorage.setItem('prestashop_cart', JSON.stringify(cart.value)); };

const increaseQuantity = () => { if (quantity.value < (effectiveStock.value ?? 999)) quantity.value++; };
const decreaseQuantity = () => { if (quantity.value > 1) quantity.value--; };

const addToCart = async () => {
  if (!product.value || isAddToCartDisabled.value) return;
  loading.value = true;

  try {
    const comboLabel = attributeGroups.value.length > 0
      ? attributeGroups.value
          .map(g => `${g.name}: ${valueNameById(selectedAttributes[g.id] ?? '')}`)
          .join(', ')
      : undefined;

    const itemKey = selectedCombination.value
      ? `${product.value.id}-${selectedCombination.value.id}`
      : product.value.id;

    const existing = cart.value.find(item => item.key === itemKey);
    if (existing) {
      existing.quantity += quantity.value;
    } else {
      cart.value.push({
        key:             itemKey,
        id:              product.value.id,
        combination_id:  selectedCombination.value?.id,
        combination_label: comboLabel,
        name:            product.value.name,
        price:           product.value.price,
        image_url:       product.value.image_url,
        quantity:        quantity.value,
      });
    }

    saveCart();

    if (!isLoggedIn.value) {
      guestCartService.sync(cart.value.map(i => ({ id: i.id, quantity: i.quantity })));
    }

    const btn = document.querySelector('.add-to-cart-btn') as HTMLButtonElement | null;
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Ajouté !';
      btn.classList.add('added');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); }, 2000);
    }

    quantity.value = 1;
  } catch (err) {
    console.error('Erreur ajout panier:', err);
  } finally {
    loading.value = false;
  }
};

// ── Navigation / utils ─────────────────────────────────────────────────────────
const goToProduct = (id: string) => router.push(`/product/${id}`);
const goBack      = () => router.push('/products');

const formatPrice = (price: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 5, maximumFractionDigits: 5,
  }).format(parseFloat(price));

const handleImageError = (e: Event) => { (e.target as HTMLImageElement).src = '/placeholder-product.jpg'; };

onMounted(() => { loadProduct(); loadCart(); });
</script>

<style scoped>
.product-detail-page { min-height: 100vh; background: var(--bg); }

/* ── Main ── */
.product-main { padding: 2.5rem 0 5rem; }

.loading { text-align: center; padding: 5rem; color: var(--muted); }
.loading .spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 4px solid #e2e8f0; border-top-color: var(--primary);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error { text-align: center; padding: 5rem; color: var(--error); }
.back-actions { margin-top: 2rem; }
.back-btn {
  display: inline-block; background: var(--primary); color: white;
  padding: 0.75rem 1.75rem; border-radius: 6px; text-decoration: none;
  font-weight: 600; font-size: 0.9rem; transition: background var(--transition);
}
.back-btn:hover { background: var(--primary-dark); }

/* ── Detail card ── */
.product-detail {
  background: var(--surface); border-radius: var(--radius-lg);
  border: 1px solid var(--border); padding: 2rem 2.5rem;
  box-shadow: var(--shadow-sm);
}

.breadcrumb {
  display: flex; align-items: center; gap: 0.25rem;
  margin-bottom: 2rem; font-size: 0.85rem;
}
.breadcrumb a { color: var(--primary); text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.separator { color: var(--border); }
.current { color: var(--text); font-weight: 500; }

.product-content {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; margin-bottom: 3rem;
}

/* Images */
.product-images { position: sticky; top: 80px; height: fit-content; }
.main-image {
  border-radius: var(--radius-lg); overflow: hidden;
  background: var(--bg); margin-bottom: 0.75rem; border: 1px solid var(--border);
}
.main-image img { width: 100%; height: 400px; object-fit: cover; }
.image-thumbnails { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.thumbnail { border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid var(--border); transition: border-color var(--transition); }
.thumbnail:hover, .thumbnail.active { border-color: var(--primary); }
.thumbnail img { width: 100%; height: 72px; object-fit: cover; display: block; }

/* Info */
.product-info h1 {
  font-size: 1.75rem; font-weight: 700; color: var(--navy);
  letter-spacing: -0.02em; margin: 0 0 0.75rem; line-height: 1.2;
}
.product-meta { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; font-size: 0.825rem; color: var(--muted); }
.product-price {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 1.75rem; padding: 1rem 1.25rem;
  background: var(--bg); border-radius: 8px; border: 1px solid var(--border);
}
.current-price { font-size: 1.75rem; font-weight: 700; color: var(--success); }
.old-price { font-size: 1.1rem; color: #94a3b8; text-decoration: line-through; }
.sale-badge { background: var(--error); color: white; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-left: auto; }

.product-description { margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
.product-description h3, .product-features h3 {
  color: var(--navy); font-size: 0.85rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.75rem;
}
.product-features { margin-bottom: 1.75rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--border); }
.features-list { display: grid; }
.feature-item { display: flex; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
.feature-name { font-weight: 500; color: var(--text); min-width: 160px; }
.feature-value { color: var(--muted); }

/* ── Déclinaisons ── */
.combinations-section {
  margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);
}

.attribute-group { margin-bottom: 1.25rem; }

.group-label {
  font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--navy); margin-bottom: 0.6rem;
}
.selected-hint { font-weight: 400; text-transform: none; color: var(--muted); letter-spacing: 0; }

.attribute-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }

/* Swatches couleur */
.color-swatch {
  width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid var(--border);
  cursor: pointer; transition: border-color 0.18s, transform 0.18s;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; background: #ddd;
}
.color-swatch:hover { transform: scale(1.12); border-color: var(--primary); }
.color-swatch.selected { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59,130,246,0.25); }
.color-swatch.unavailable { opacity: 0.35; cursor: not-allowed; }
.color-swatch.unavailable:hover { transform: none; border-color: var(--border); }
.swatch-label { font-size: 9px; font-weight: 700; color: #fff; text-align: center; line-height: 1.1; }

/* Chips taille / texte */
.size-chip {
  padding: 0.4rem 0.9rem; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: 0.85rem; font-weight: 500; color: var(--text); background: var(--surface);
  cursor: pointer; transition: border-color 0.18s, background 0.18s, color 0.18s;
}
.size-chip:hover { border-color: var(--primary); color: var(--primary); }
.size-chip.selected { background: var(--primary); border-color: var(--primary); color: white; }
.size-chip.unavailable { opacity: 0.38; cursor: not-allowed; text-decoration: line-through; }
.size-chip.unavailable:hover { border-color: var(--border); color: var(--text); background: var(--surface); }

.combo-hint { font-size: 0.8rem; color: var(--muted); margin: 0.5rem 0 0; font-style: italic; }

/* ── Stock ── */
.stock-info { margin-bottom: 1.5rem; }

.stock {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.9rem; font-weight: 600; padding: 0.5rem 1rem;
  border-radius: 20px;
}
.stock svg { width: 16px; height: 16px; flex-shrink: 0; }
.stock.available  { color: #16a34a; background: #dcfce7; }
.stock.unavailable { color: #dc2626; background: #fee2e2; }

/* ── Add to cart ── */
.add-to-cart-section { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
.quantity-selector { display: flex; align-items: center; gap: 1rem; }
.quantity-selector label { font-weight: 500; font-size: 0.9rem; color: var(--text); min-width: 80px; }
.quantity-controls { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.quantity-btn {
  background: var(--bg); border: none; width: 38px; height: 38px;
  font-size: 1.2rem; cursor: pointer; color: var(--text);
  transition: background var(--transition); font-family: inherit;
}
.quantity-btn:hover:not(:disabled) { background: #e2e8f0; }
.quantity-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.quantity-input {
  width: 56px; text-align: center; border: none;
  border-left: 1px solid var(--border); border-right: 1px solid var(--border);
  height: 38px; font-size: 0.95rem; font-family: inherit;
  color: var(--text); background: var(--surface);
}
.quantity-input:focus { outline: none; }
.add-to-cart-btn {
  background: var(--primary); color: white; border: none;
  padding: 0.9rem 2rem; border-radius: 6px; font-size: 1rem;
  font-weight: 600; cursor: pointer; transition: background var(--transition); font-family: inherit;
}
.add-to-cart-btn:hover:not(:disabled) { background: var(--primary-dark); }
.add-to-cart-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.add-to-cart-btn.added { background: var(--success); }

.product-actions { display: flex; }
.secondary-btn {
  background: transparent; color: var(--primary); border: 1.5px solid var(--primary);
  padding: 0.7rem 1.5rem; border-radius: 6px; font-size: 0.875rem;
  font-weight: 600; cursor: pointer; transition: background var(--transition), color var(--transition); font-family: inherit;
}
.secondary-btn:hover { background: var(--primary-light); }

/* ── Related ── */
.related-products { border-top: 1px solid var(--border); padding-top: 2.5rem; }
.related-products h2 { font-size: 1.15rem; font-weight: 700; color: var(--navy); margin: 0 0 1.5rem; }
.related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.25rem; }
.related-product-card {
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg);
  overflow: hidden; cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
}
.related-product-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: #93c5fd; }
.related-image { height: 140px; overflow: hidden; background: var(--surface); }
.related-image img { width: 100%; height: 100%; object-fit: cover; }
.related-info { padding: 0.875rem 1rem; }
.related-info h4 { margin: 0 0 0.35rem; color: var(--navy); font-size: 0.85rem; font-weight: 500; line-height: 1.35; }
.related-price { color: var(--success); font-weight: 600; font-size: 0.9rem; }

/* ── Footer ── */
.front-footer { background: #1e293b; color: #94a3b8; padding: 3rem 0 1.5rem; }
.footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 2rem; }
.front-footer h3, .front-footer h4 { color: white; margin: 0 0 0.75rem; font-size: 0.95rem; }
.front-footer p, .front-footer li { font-size: 0.85rem; margin: 0 0 0.35rem; }
.front-footer ul { list-style: none; padding: 0; margin: 0; }
.front-footer a { color: #94a3b8; text-decoration: none; }
.front-footer a:hover { color: white; }
.footer-bottom { border-top: 1px solid #334155; padding-top: 1rem; font-size: 0.8rem; text-align: center; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .product-detail { padding: 1.25rem; }
  .product-content { grid-template-columns: 1fr; gap: 2rem; }
  .product-images { position: static; }
  .main-image img { height: 280px; }
  .product-info h1 { font-size: 1.4rem; }
  .current-price { font-size: 1.4rem; }
  .footer-grid { grid-template-columns: 1fr; }
}
</style>
