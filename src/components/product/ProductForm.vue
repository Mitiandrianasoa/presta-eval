<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import { useManufacturerStore } from '../../stores/brand/manufacturerStore';
import { useProductStore } from '../../stores/product/productStore';
import { useFeatureStore } from '../../stores/feature/featureStore';
import { useLanguageStore } from '../../stores/language/languageStore';
import { useStockStore } from '../../stores/stock/stockStore';
import { useCarrierStore } from '../../stores/carrier/carrierStore';
import AddCategoryModal from './AddCategoryModal.vue';
import AddFileModal from './AddFileModal.vue';
import AddSpecificPriceModal from './AddSpecificPriceModal.vue';
import ProductSearch from './ProductSearch.vue';
import api from '../../api/api';

// Props & Emits
const props = defineProps<{ product: any }>();
const emit = defineEmits(['save', 'cancel']);

// Stores
const categoryStore     = useCategoryStore();
const manufacturerStore = useManufacturerStore();
const productStore      = useProductStore();
const featureStore      = useFeatureStore();
const languageStore     = useLanguageStore();
const stockStore        = useStockStore();
const carrierStore      = useCarrierStore();

// UI State
const tabs = ['Description', 'Detail', 'Stock', 'Livraison', 'Prix', 'Option'];
const activeTab = ref('Description');
const showCategoryModal = ref(false);
const showFileModal = ref(false);
const showSpecificPriceModal = ref(false);

// Search & Filters
const searchDocumentQuery = ref('');

// Data Collections
const documents       = ref<Array<any>>([]);
const characteristics = ref<Array<any>>([]);

// Images
const imageFiles    = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const fileInput     = ref<HTMLInputElement | null>(null);

// Stock
const stockDelta = ref<number>(0);

// Form Data
const form = ref({
  id: '',

  // Informations de base
  name: '',
  description: '',
  descriptionShort: '',

  // Références
  reference: '',
  mpn: '',
  isbn: '',
  ean13: '',
  upc: '',

  // Catégorie et marque
  id_category_default: '',
  id_manufacturer: '',

  // Stock
  quantity: 0,
  minimal_quantity: 0,

  // Dimensions et poids
  weight: '0',
  width: '0',
  height: '0',
  depth: '0',

  // Prix
  price: '0',
  wholesale_price: '0',
  unit_price_ratio: '0',
  additional_shipping_cost: '0',
  tax_rule: '',
  price_ttc: '',
  show_unit_price: false,
  unit_price_ht: '',
  unit_price_ttc: '',
  unit_price_unit: '',
  specific_prices: [] as any[],
  priority_order: 'default',

  // Statut et visibilité
  active: true,
  available_for_order: true,
  online_only: false,
  visibility: 'both',

  // Associations
  associated_products: [] as number[],

  // Stock avancé
  out_of_stock: 2 as number,
  available_now: '',
  available_later: '',
  available_date: '',
  low_stock_alert: false,
  low_stock_threshold: 0 as number,

  // Livraison
  delivery_delay_type: 'default' as 'none' | 'default' | 'specific',
  delivery_delay_in_stock: '',
  delivery_delay_out_of_stock: '',
  id_carrier: '' as string,
});

// Initialisation
const initForm = (product: any) => {
  form.value = {
    id:                          product?.id || '',
    name:                        product?.name || '',
    description:                 product?.description || '',
    descriptionShort:            product?.description_short || '',
    reference:                   product?.reference || '',
    mpn:                         product?.mpn || '',
    isbn:                        product?.isbn || '',
    ean13:                       product?.ean13 || product?.ean_jan || '',
    upc:                         product?.upc || '',
    id_category_default:         product?.id_category_default || '',
    id_manufacturer:             product?.id_manufacturer || '',
    quantity:                    product?.quantity || product?.stock || 0,
    minimal_quantity:            product?.minimal_quantity || 0,
    weight:                      product?.weight || '0',
    width:                       product?.width || '0',
    height:                      product?.height || '0',
    depth:                       product?.depth || '0',
    additional_shipping_cost:    product?.additional_shipping_cost || '0',
    price:                       product?.price || '0',
    wholesale_price:             product?.wholesale_price || '0',
    unit_price_ratio:            product?.unit_price_ratio || '0',
    tax_rule:                    product?.tax_rule || '',
    price_ttc:                   product?.price_ttc || '',
    show_unit_price:             product?.show_unit_price || false,
    unit_price_ht:               product?.unit_price_ht || '',
    unit_price_ttc:              product?.unit_price_ttc || '',
    unit_price_unit:             product?.unit_price_unit || '',
    specific_prices:             product?.specific_prices || [],
    priority_order:              product?.priority_order || 'default',
    active:                      product?.active == 1,
    available_for_order:         product?.available_for_order ?? true,
    online_only:                 product?.online_only ?? false,
    visibility:                  product?.visibility || 'both',
    associated_products:         product?.associated_products || [],
    out_of_stock:                product?.out_of_stock ?? 2,
    available_now:               product?.available_now || '',
    available_later:             product?.available_later || '',
    available_date:              product?.available_date || '',
    low_stock_alert:             product?.low_stock_alert ?? false,
    low_stock_threshold:         product?.low_stock_threshold ?? 0,
    delivery_delay_type:         product?.delivery_delay_type || 'default',
    delivery_delay_in_stock:     product?.delivery_delay_in_stock || '',
    delivery_delay_out_of_stock: product?.delivery_delay_out_of_stock || '',
    id_carrier:                  product?.id_carrier || '',
  };

  stockDelta.value      = 0;
  imageFiles.value      = [];
  imagePreviews.value   = [];
  characteristics.value = product?.characteristics || [];
  documents.value       = product?.documents || [];

  fetchStockMovementsForProduct();
};

// Lifecycle
onMounted(async () => {
  await Promise.all([
    categoryStore.fetchAll(),
    manufacturerStore.fetchAll(),
    productStore.fetchAll(),
    featureStore.fetchAll(),
    languageStore.fetchAll(),
    stockStore.fetchAll(),
    carrierStore.fetchAll(),
  ]);
  initForm(props.product);
});

watch(() => props.product, (newProduct) => initForm(newProduct));

// Computed
const filteredDocuments = computed(() => {
  if (!searchDocumentQuery.value) return documents.value;
  return documents.value.filter((doc) =>
    doc.name?.toLowerCase().includes(searchDocumentQuery.value.toLowerCase()) ||
    doc.filename?.toLowerCase().includes(searchDocumentQuery.value.toLowerCase())
  );
});

const calculatedPriceTTC = computed(() => {
  const price = parseFloat(form.value.price) || 0;
  const taxRule = form.value.tax_rule;
  let taxRate = 0;
  if (taxRule === 'MG_20') taxRate = 0.20;
  else if (taxRule === 'FR_0') taxRate = 0;
  return (price * (1 + taxRate)).toFixed(2);
});

// Image Management
const triggerFileInput = () => fileInput.value?.click();

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  Array.from(input.files).forEach(file => {
    if (!allowedTypes.includes(file.type)) {
      alert(`Le fichier ${file.name} n'est pas au format JPEG ou PNG`);
      return;
    }
    imageFiles.value.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) imagePreviews.value.push(e.target.result as string);
    };
    reader.readAsDataURL(file);
  });

  input.value = '';
};

const removeImage = (index: number) => {
  imageFiles.value.splice(index, 1);
  imagePreviews.value.splice(index, 1);
};

// Characteristics Management
const addCharacteristic = () => {
  characteristics.value.push({
    featureId: '',
    valueMode: 'predefined',
    value: '',
    customValue: '',
    language: '',
  });
};

const removeCharacteristic = (index: number) => characteristics.value.splice(index, 1);

const availableFeatureValues = (row: any) => {
  const feature = featureStore.features.find(f => f.id === row.featureId);
  return feature?.values || [];
};

// Documents Management
const addDocument = (fileData: any) => documents.value.push(fileData);

const fetchStockMovementsForProduct = async () => {
  try {
    await stockStore.fetchAllStockMovements(100);
  } catch (error) {
    console.error('Erreur:', error);
    stockStore.stockMovements = [];
  }
};

const addSpecificPrice = () => {
  showSpecificPriceModal.value = true;
};

const handleSpecificPriceSave = (data: any) => {
  if (!form.value.specific_prices) {
    form.value.specific_prices = [];
  }
  form.value.specific_prices.push(data);
  showSpecificPriceModal.value = false;
};

const removeSpecificPrice = (index: number) => {
  if (form.value.specific_prices) {
    form.value.specific_prices.splice(index, 1);
  }
};

// Form Submission
const submit = () => {
  const newQty = form.value.quantity + stockDelta.value;
  emit('save', {
    name:                        form.value.name,
    description:                 form.value.description,
    description_short:           form.value.descriptionShort,
    reference:                   form.value.reference,
    mpn:                         form.value.mpn,
    isbn:                        form.value.isbn,
    ean13:                       form.value.ean13,
    upc:                         form.value.upc,
    id_category_default:         form.value.id_category_default,
    id_manufacturer:             form.value.id_manufacturer,
    quantity:                    newQty,
    minimal_quantity:            form.value.minimal_quantity,
    weight:                      form.value.weight,
    width:                       form.value.width,
    height:                      form.value.height,
    depth:                       form.value.depth,
    additional_shipping_cost:    form.value.additional_shipping_cost,
    price:                       form.value.price,
    wholesale_price:             form.value.wholesale_price,
    unit_price_ratio:            form.value.unit_price_ratio,
    active:                      form.value.active ? '1' : '0',
    available_for_order:         form.value.available_for_order ? '1' : '0',
    online_only:                 form.value.online_only ? '1' : '0',
    visibility:                  form.value.visibility,
    out_of_stock:                form.value.out_of_stock,
    available_now:               form.value.available_now,
    available_later:             form.value.available_later,
    available_date:              form.value.available_date,
    low_stock_alert:             form.value.low_stock_alert ? '1' : '0',
    low_stock_threshold:         form.value.low_stock_threshold,
    associated_products:         form.value.associated_products,
    characteristics:             characteristics.value,
    documents:                   documents.value,
    images:                      imageFiles.value,
    delivery_delay_type:         form.value.delivery_delay_type,
    delivery_delay_in_stock:     form.value.delivery_delay_in_stock,
    delivery_delay_out_of_stock: form.value.delivery_delay_out_of_stock,
    id_carrier:                  form.value.id_carrier,
  });



  
};
</script>

<template>
  <form @submit.prevent="submit" class="product-form">
    <h3 class="form-title">{{ product ? 'Modifier' : 'Nouveau' }} produit</h3>

    <!-- Tabs Navigation -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">

      <!-- ─── Onglet Description ────────────────────────────────────── -->
      <section v-if="activeTab === 'Description'" class="form-section">
        <div class="form-group">
          <label>Article *</label>
          <input v-model="form.name" placeholder="Nom du produit" required />
        </div>

        <div class="form-group">
          <label>Images</label>
          <div class="image-upload" @click="triggerFileInput">
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/jpeg, image/png, image/jpg"
              @change="handleImageUpload"
              class="file-input"
            />
            <p class="upload-hint">Cliquez pour ajouter une ou plusieurs images (JPEG, PNG)</p>
          </div>

          <div v-if="imagePreviews.length" class="image-previews">
            <div v-for="(preview, index) in imagePreviews" :key="index" class="image-preview">
              <img :src="preview" :alt="`Aperçu ${index + 1}`" />
              <button type="button" @click="removeImage(index)" class="remove-img-btn">✕</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Récapitulatif</label>
          <textarea v-model="form.descriptionShort" placeholder="Description courte" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>Description détaillée</label>
          <textarea v-model="form.description" placeholder="Description détaillée" rows="6"></textarea>
        </div>

        <div class="form-group">
          <label>Catégorie par défaut</label>
          <div class="category-selector">
            <select v-model="form.id_category_default">
              <option value="">Sélectionner une catégorie</option>
              <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <button type="button" @click="showCategoryModal = true" class="btn-add-category">
              + Ajouter
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Marque</label>
          <select v-model="form.id_manufacturer">
            <option value="">Sélectionner une marque</option>
            <option v-for="mfr in manufacturerStore.manufacturers" :key="mfr.id" :value="mfr.id">
              {{ mfr.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Produits associés</label>
          <ProductSearch
            :selectedIds="form.associated_products"
            @add="(p) => form.associated_products.push(p.id)"
            @remove="(id) => form.associated_products = form.associated_products.filter(pid => pid !== id)"
          />
        </div>
      </section>

      <!-- ─── Onglet Détail ─────────────────────────────────────────── -->
      <section v-if="activeTab === 'Detail'" class="form-section">
        <div class="subsection">
          <h4>Références produit</h4>

          <div class="form-row">
            <div class="form-group">
              <label>Référence</label>
              <input v-model="form.reference" placeholder="Référence produit" />
            </div>
            <div class="form-group">
              <label>MPN</label>
              <input v-model="form.mpn" placeholder="Manufacturer Part Number" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>ISBN</label>
              <input v-model="form.isbn" placeholder="ISBN" />
            </div>
            <div class="form-group">
              <label>UPC</label>
              <input v-model="form.upc" placeholder="Code UPC" />
            </div>
          </div>

          <div class="form-group">
            <label>EAN-13 / JAN</label>
            <input v-model="form.ean13" placeholder="Code EAN-13 ou JAN" />
          </div>
        </div>

        <div class="subsection">
          <h4>Caractéristiques</h4>

          <button type="button" @click="addCharacteristic" class="btn-add">
            + Ajouter une caractéristique
          </button>

          <div v-for="(char, index) in characteristics" :key="index" class="characteristic-row">
            <select v-model="char.featureId" class="feature-select">
              <option value="">Sélectionner</option>
              <option v-for="feature in featureStore.features" :key="feature.id" :value="feature.id">
                {{ feature.name }}
              </option>
            </select>

            <select v-model="char.valueMode">
              <option value="predefined">Valeur prédéfinie</option>
              <option value="custom">Valeur personnalisée</option>
            </select>

            <select v-model="char.language">
              <option value="">Langue</option>
              <option v-for="lang in languageStore.languages" :key="lang.id" :value="lang.id">
                {{ lang.name }}
              </option>
            </select>

            <button type="button" @click="removeCharacteristic(index)" class="btn-remove">
              Supprimer
            </button>
          </div>
        </div>

        <div class="subsection">
          <h4>Documents joints</h4>

          <input
            v-model="searchDocumentQuery"
            placeholder="Rechercher un document..."
            class="search-input"
          />

          <button type="button" @click="showFileModal = true" class="btn-add">
            + Ajouter un fichier
          </button>

          <div class="documents-list">
            <div v-for="(doc, index) in filteredDocuments" :key="index" class="document-item">
              <span>{{ doc.name }} ({{ doc.filename }})</span>
              <button type="button" @click="documents.splice(index, 1)" class="btn-remove">
                Supprimer
              </button>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h4>Statut du produit</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Activé</label>
              <select v-model="form.active">
                <option :value="true">Oui</option>
                <option :value="false">Non</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── Onglet Stock ──────────────────────────────────────────── -->
      <section v-if="activeTab === 'Stock'" class="form-section">

        <div class="subsection">
          <h4>Stock</h4>
          <div class="stock-qty-block">
            <div class="stock-current">
              <span class="stock-label">Quantité actuelle</span>
              <span class="stock-value">{{ form.quantity }}</span>
            </div>
            <div class="form-group">
              <label>Ajouter ou soustraire des éléments</label>
              <div class="stock-delta-row">
                <input
                  v-model.number="stockDelta"
                  type="number"
                  step="1"
                  placeholder="0"
                  class="stock-delta-input"
                />
                <span class="stock-preview">→ {{ form.quantity + stockDelta }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h4>Mouvements récents des stocks</h4>
          <div class="stock-table-wrapper">
            <table class="stock-table" v-if="stockStore.stockMovements.length">
              <thead>
                <tr>
                  <th>Date et heure</th>
                  <th>Employé</th>
                  <th>Quantité</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(mvt, i) in stockStore.stockMovements" :key="i">
                  <td>{{ mvt.date }}</td>
                  <td>{{ mvt.employee }}</td>
                  <td :class="mvt.quantity >= 0 ? 'qty-positive' : 'qty-negative'">
                    {{ mvt.quantity >= 0 ? '+' : '' }}{{ mvt.quantity }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="empty-hint">Aucun mouvement de stock enregistré.</p>
          </div>
        </div>

        <div class="form-group">
          <label>Quantité minimale pour la vente</label>
          <input v-model.number="form.minimal_quantity" type="number" step="1" min="1" placeholder="1" />
        </div>

        <div class="subsection">
          <div class="alert-toggle-row">
            <label class="toggle-label">
              <span>Recevoir une alerte par e-mail lorsque le stock est faible</span>
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: form.low_stock_alert }"
                @click="form.low_stock_alert = !form.low_stock_alert"
              >
                {{ form.low_stock_alert ? 'Activé' : 'Désactivé' }}
              </button>
            </label>
          </div>
          <div class="form-group" v-if="form.low_stock_alert">
            <label>Seuil d'alerte</label>
            <input v-model.number="form.low_stock_threshold" type="number" step="1" min="0" placeholder="0" />
          </div>
        </div>

        <div class="subsection">
          <h4>En cas de rupture de stock</h4>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model.number="form.out_of_stock" :value="0" />
              <span>Refuser les commandes</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model.number="form.out_of_stock" :value="1" />
              <span>Accepter les commandes</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model.number="form.out_of_stock" :value="2" />
              <span>Utiliser le comportement par défaut <em>(Refuser les commandes)</em></span>
            </label>
          </div>
        </div>

        <div class="subsection">
          <div class="form-group">
            <label>Libellé en stock</label>
            <input v-model="form.available_now" type="text" placeholder="Ex : En stock" />
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label>Libellé si en rupture de stock <em>(commandes en attente autorisées)</em></label>
            <input v-model="form.available_later" type="text" placeholder="Ex : Livraison sous 8 à 10 jours" />
          </div>
        </div>

        <div class="form-group">
          <label>Date de disponibilité</label>
          <input v-model="form.available_date" type="date" />
        </div>

      </section>

      <!-- ─── Onglet Livraison ──────────────────────────────────────── -->
      <section v-if="activeTab === 'Livraison'" class="form-section">

        <!-- Dimensions du paquet -->
        <div class="subsection">
          <h4>Dimensions du paquet</h4>
          <p class="subsection-hint">
            Ajustez vos frais de livraison en renseignant les dimensions du produit.
          </p>

          <div class="form-row dimensions-grid">
            <div class="form-group">
              <label>Largeur</label>
              <div class="input-unit-wrap">
                <input v-model="form.width" type="number" step="0.01" min="0" placeholder="0.00" />
                <span class="unit">cm</span>
              </div>
            </div>

            <div class="form-group">
              <label>Hauteur</label>
              <div class="input-unit-wrap">
                <input v-model="form.height" type="number" step="0.01" min="0" placeholder="0.00" />
                <span class="unit">cm</span>
              </div>
            </div>

            <div class="form-group">
              <label>Profondeur</label>
              <div class="input-unit-wrap">
                <input v-model="form.depth" type="number" step="0.01" min="0" placeholder="0.00" />
                <span class="unit">cm</span>
              </div>
            </div>

            <div class="form-group">
              <label>Poids</label>
              <div class="input-unit-wrap">
                <input v-model="form.weight" type="number" step="0.001" min="0" placeholder="0.000" />
                <span class="unit">kg</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Délai de livraison -->
        <div class="subsection">
          <h4>Délai de livraison</h4>

          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="form.delivery_delay_type" value="none" />
              <span>Aucun</span>
            </label>

            <label class="radio-option">
              <input type="radio" v-model="form.delivery_delay_type" value="default" />
              <span>
                Délai de livraison par défaut&nbsp;: <em>N/D - N/D</em>
              </span>
            </label>

            <label class="radio-option">
              <input type="radio" v-model="form.delivery_delay_type" value="specific" />
              <span>Délai de livraison spécifique pour ce produit</span>
            </label>
          </div>

          <Transition name="fade-slide">
            <div v-if="form.delivery_delay_type === 'specific'" class="specific-delays">
              <div class="form-group">
                <label>Délai de livraison pour les produits en stock</label>
                <input
                  v-model="form.delivery_delay_in_stock"
                  type="text"
                  placeholder="Ex : Livraison en 2-3 jours ouvrés"
                />
              </div>
              <div class="form-group" style="margin-top: 12px;">
                <label>Délai de livraison des produits épuisés avec commande autorisée</label>
                <input
                  v-model="form.delivery_delay_out_of_stock"
                  type="text"
                  placeholder="Ex : Livraison sous 8 à 10 jours"
                />
              </div>
            </div>
          </Transition>
        </div>

        <!-- Frais de livraison -->
        <div class="subsection">
          <h4>Frais de livraison</h4>

          <div class="form-group">
            <label>Frais de port supplémentaires</label>
            <div class="input-unit-wrap">
              <input
                v-model="form.additional_shipping_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <span class="unit">Ar</span>
            </div>
          </div>
        </div>

        <!-- Transporteurs disponibles -->
        <div class="subsection">
          <h4>Transporteurs disponibles</h4>

          <div class="form-group">
            <label>Transporteur</label>
            <select v-model="form.id_carrier" :disabled="carrierStore.loading">
              <option value="">
                {{ carrierStore.loading ? 'Chargement…' : 'Tous les transports' }}
              </option>
              <option
                v-for="carrier in carrierStore.carriers"
                :key="carrier.id"
                :value="carrier.id"
              >
                {{ carrier.name }}
              </option>
            </select>
          </div>
        </div>

      </section>

     <!-- ─── Onglet Prix ───────────────────────────────────────────── -->
<section v-if="activeTab === 'Prix'" class="form-section">
  <!-- Section Prix de vente -->
  <div class="subsection">
    <h4>Prix de vente</h4>
  </div>

  <div class="form-row price-sale-row">
    <div class="form-group price-ht-group">
      <label>Prix de vente (HT)</label>
      <div class="input-unit-wrap">
        <input v-model="form.price" type="number" step="0.01" placeholder="0.00" required />
        <span class="unit">Ar</span>
      </div>
    </div>

    <div class="price-operator">+</div>

    <div class="form-group tax-rule-group">
      <label>Règle de taxe</label>
      <select v-model="form.tax_rule">
        <option value="">Aucune taxe</option>
        <option value="MG_20">MG Standard Rate (20%)</option>
        <option value="FR_0">Taxe FR : 0 %</option>
      </select>
    </div>

    <div class="price-operator">=</div>

    <div class="form-group price-ttc-group">
      <label>Prix de vente (TTC)</label>
      <div class="input-unit-wrap">
        <input :value="calculatedPriceTTC" type="number" step="0.01" placeholder="0.00" disabled />
        <span class="unit">Ar</span>
      </div>
    </div>
  </div>

  <!-- Section Prix d'achat -->
  <div class="subsection">
    <h4>Prix d'achat</h4>
  </div>

  <div class="form-group">
    <label>Prix d'achat (HT)</label>
    <div class="input-unit-wrap">
      <input v-model="form.wholesale_price" type="number" step="0.01" placeholder="0.00" />
      <span class="unit">Ar</span>
    </div>
  </div>

  <!-- Section Prix de vente unitaire -->
  <div class="subsection">
    <div class="subsection-header">
      <h4>Afficher le prix de vente unitaire</h4>
      <label class="toggle-switch">
        <input type="checkbox" v-model="form.show_unit_price" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <div v-if="form.show_unit_price" class="unit-price-section">
    <div class="form-group">
      <label>Prix de vente unitaire (HT)</label>
      <div class="input-unit-wrap">
        <input v-model="form.unit_price_ht" type="number" step="0.01" placeholder="0.00" />
        <span class="unit">Ar</span>
      </div>
    </div>

    <div class="form-group">
      <label>Prix de vente unitaire (TTC)</label>
      <div class="input-unit-wrap">
        <input v-model="form.unit_price_ttc" type="number" step="0.01" placeholder="0.00" disabled />
        <span class="unit">Ar</span>
      </div>
    </div>

    <div class="form-group">
      <label>Unité</label>
      <input v-model="form.unit_price_unit" type="text" placeholder="Ex: kg, litre, pièce, mètre..." />
    </div>
  </div>

  <!-- Section Prix spécifique -->
  <div class="subsection">
    <div class="subsection-header">
      <h4>Prix spécifique</h4>
      <button type="button" class="btn-add" @click="addSpecificPrice">
        + Ajouter Prix spécifique
      </button>
    </div>
  </div>

  <AddSpecificPriceModal
    v-if="showSpecificPriceModal"
    :product-id="form.id?.toString()"
    @close="showSpecificPriceModal = false"
    @save="handleSpecificPriceSave"
  />

  <div v-if="form.specific_prices && form.specific_prices.length > 0" class="specific-prices-list">
    <div v-for="(price, index) in form.specific_prices" :key="index" class="specific-price-card">
      <div class="specific-price-header">
        <div class="price-info">
          <strong>Prix spécifique #{{ index + 1 }}</strong>
          <span v-if="price.id_customer === '0'" class="badge all-customers">Tous les clients</span>
          <span v-else class="badge specific-customer">Client spécifique</span>
        </div>
        <button type="button" class="btn-remove" @click="removeSpecificPrice(index)">✕</button>
      </div>
      <div class="specific-price-details">
        <div class="detail-row">
          <span class="detail-label">Conditions:</span>
          <span class="detail-value">
            {{ price.id_currency ? 'Devise: ' + price.id_currency : 'Toutes devises' }}
            {{ price.id_country ? ' | Pays: ' + price.id_country : ' | Tous pays' }}
            {{ price.id_group ? ' | Groupe: ' + price.id_group : ' | Tous groupes' }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Quantité min:</span>
          <span class="detail-value">{{ price.from_quantity || 1 }} unité(s)</span>
        </div>
        <div v-if="price.from || price.to" class="detail-row">
          <span class="detail-label">Période:</span>
          <span class="detail-value">{{ price.from || '...' }} au {{ price.to || '...' }}</span>
        </div>
        <div class="detail-row price-impact">
          <span class="detail-label">Impact:</span>
          <span class="detail-value">
            <span v-if="price.reduction && price.reduction !== '0'" class="impact-discount">
              Remise: {{ price.reduction }}{{ price.reduction_type === 'percentage' ? '%' : ' Ar' }} {{ price.reduction_tax === '1' ? 'TTC' : 'HT' }}
            </span>
            <span v-if="price.price && price.price !== '-1'" class="impact-price">
              Prix fixe: {{ price.price }} Ar HT
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Section Gestion des priorités -->
  <div class="subsection">
    <h4>Gestion des priorités</h4>
  </div>

  <div class="priority-options">
    <label class="radio-label">
      <input type="radio" value="default" v-model="form.priority_order" />
      <span>Utiliser l'ordre par défaut : Groupe - Devise - Pays - Magasin</span>
    </label>
    <label class="radio-label">
      <input type="radio" value="custom" v-model="form.priority_order" />
      <span>Saisir un prix spécifique pour ce produit</span>
    </label>
  </div>
</section>
      <!-- ─── Onglet Option ─────────────────────────────────────────── -->
      <section v-if="activeTab === 'Option'" class="form-section">
        <div class="form-group">
          <label>Activé</label>
          <select v-model="form.active">
            <option :value="true">Actif</option>
            <option :value="false">Inactif</option>
          </select>
        </div>

        <div class="form-group">
          <label>Disponible à la commande</label>
          <select v-model="form.available_for_order">
            <option :value="true">Disponible</option>
            <option :value="false">Indisponible</option>
          </select>
        </div>

        <div class="form-group">
          <label>En ligne uniquement</label>
          <select v-model="form.online_only">
            <option :value="false">Non</option>
            <option :value="true">Oui</option>
          </select>
        </div>
      </section>

    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button type="submit" class="btn-save">Sauvegarder</button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel">Annuler</button>
    </div>

    <!-- Modals -->
    <AddCategoryModal
      :open="showCategoryModal"
      @close="showCategoryModal = false"
      @add="(cat) => { form.id_category_default = cat.id; }"
    />

    <AddFileModal
      :open="showFileModal"
      @close="showFileModal = false"
      @add="addDocument"
    />
  </form>
</template>

<style scoped>
.product-form {
  background: #ffffff;
  padding: 24px;
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 2000px;
}

.form-title {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #2c3e50;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.subsection {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 16px;
}

.subsection h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.subsection-hint {
  margin: -8px 0 14px;
  font-size: 13px;
  color: #888;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Prix de vente row - 5 columns layout (HT + operator + Tax + operator + TTC) */
.price-sale-row {
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 12px;
  align-items: end;
}

.price-ht-group,
.tax-rule-group,
.price-ttc-group {
  display: flex;
  flex-direction: column;
}

.price-operator {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #666;
  padding-bottom: 8px;
  user-select: none;
}

.price-ttc-group input:disabled {
  background-color: #f5f5f5;
  color: #666;
}

@media (max-width: 768px) {
  .price-sale-row {
    grid-template-columns: 1fr;
  }

  .price-operator {
    display: none;
  }
}

.dimensions-grid {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 600px) {
  .dimensions-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

label {
  font-weight: 600;
  color: #34495e;
  font-size: 13px;
}

input, select, textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

textarea {
  resize: vertical;
  font-family: inherit;
}

/* Input with unit badge */
.input-unit-wrap {
  display: flex;
  align-items: stretch;
}

.input-unit-wrap input {
  flex: 1;
  border-right: none;
  border-radius: 6px 0 0 6px;
}

.input-unit-wrap .unit {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-left: none;
  border-radius: 0 6px 6px 0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
  user-select: none;
}

/* Délais spécifiques */
.specific-delays {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #ddd;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Tabs */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 12px;
}

.tab {
  background: transparent;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
}

.tab:hover {
  background: #f0f0f0;
  color: #333;
}

.tab.active {
  background: #4CAF50;
  color: white;
}

/* Image Upload */
.image-upload {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s ease;
}

.image-upload:hover {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.file-input {
  display: none;
}

.upload-hint {
  margin: 0;
  color: #999;
  font-size: 14px;
}

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.image-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #e74c3c;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-img-btn:hover {
  background: #c0392b;
  transform: scale(1.05);
}

/* Category Selector */
.category-selector {
  display: flex;
  gap: 10px;
}

.category-selector select {
  flex: 1;
}

.btn-add-category {
  padding: 10px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-add-category:hover {
  background: #1976D2;
}

/* Characteristic Row */
.characteristic-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr auto;
  gap: 12px;
  align-items: center;
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

/* Documents */
.documents-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.search-input {
  margin-bottom: 12px;
}

/* Buttons */
.btn-add,
.btn-remove {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-add {
  background: #4CAF50;
  color: white;
  margin-bottom: 12px;
}

.btn-add:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.btn-remove {
  background: #e74c3c;
  color: white;
}

.btn-remove:hover {
  background: #c0392b;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
}

.btn-save,
.btn-cancel {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.btn-cancel {
  background: #95a5a6;
  color: white;
}

.btn-cancel:hover {
  background: #7f8c8d;
}

/* Stock tab */
.stock-qty-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.stock-current {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stock-label {
  font-weight: 600;
  color: #34495e;
  font-size: 13px;
}

.stock-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2c3e50;
  background: #fff;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 4px 18px;
  min-width: 60px;
  text-align: center;
}

.stock-delta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stock-delta-input {
  width: 140px;
}

.stock-preview {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.stock-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.stock-table th {
  background: #f0f0f0;
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #34495e;
  border-bottom: 2px solid #ddd;
}

.stock-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #eee;
  color: #555;
}

.stock-table tbody tr:last-child td {
  border-bottom: none;
}

.qty-positive { color: #27ae60; font-weight: 600; }
.qty-negative { color: #e74c3c; font-weight: 600; }

.empty-hint {
  text-align: center;
  color: #aaa;
  padding: 20px;
  font-size: 13px;
  margin: 0;
}

/* Alert toggle */
.alert-toggle-row {
  margin-bottom: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-weight: 600;
  color: #34495e;
  font-size: 13px;
  cursor: default;
}

.toggle-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #ccc;
  color: #fff;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-btn.active {
  background: #4CAF50;
}

/* Radio group */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #444;
  cursor: pointer;
  font-weight: normal;
}

.radio-option input[type="radio"] {
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
}

.radio-option em {
  color: #888;
  font-size: 12px;
}

/* Specific Price Cards */
.specific-prices-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.specific-price-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.specific-price-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-info strong {
  color: #2c3e50;
  font-size: 14px;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.all-customers {
  background: #e3f2fd;
  color: #1976d2;
}

.badge.specific-customer {
  background: #fff3e0;
  color: #f57c00;
}

.specific-price-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
}

.detail-value {
  color: #444;
  flex: 1;
}

.price-impact .detail-value {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.impact-discount {
  background: #ffebee;
  color: #c62828;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
}

.impact-price {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .product-form {
    padding: 16px;
  }

  .form-row,
  .characteristic-row {
    grid-template-columns: 1fr;
  }

  .dimensions-grid {
    grid-template-columns: 1fr 1fr;
  }

  .category-selector {
    flex-direction: column;
  }

  .tabs {
    overflow-x: auto;
  }
}
</style>