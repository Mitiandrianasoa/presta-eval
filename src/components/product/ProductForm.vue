<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import { useManufacturerStore } from '../../stores/brand/manufacturerStore';
import { useProductStore } from '../../stores/product/productStore';
import { useFeatureStore } from '../../stores/feature/featureStore';
import { useLanguageStore } from '../../stores/language/languageStore';
import AddCategoryModal from './AddCategoryModal.vue';
import AddFileModal from './AddFileModal.vue';
import ProductSearch from './ProductSearch.vue';

// Props & Emits
const props = defineProps<{ product: any }>();
const emit = defineEmits(['save', 'cancel']);

// Stores
const categoryStore     = useCategoryStore();
const manufacturerStore = useManufacturerStore();
const productStore      = useProductStore();
const featureStore      = useFeatureStore();
const languageStore     = useLanguageStore();

// UI State
const tabs = ['Description', 'Detail', 'Stock', 'Livraison', 'Prix', 'Option'];
const activeTab = ref('Description');
const showCategoryModal = ref(false);
const showFileModal = ref(false);

// Search & Filters
const searchDocumentQuery = ref('');

// Data Collections
const documents       = ref<Array<any>>([]);
const characteristics = ref<Array<any>>([]);

// Images
const imageFiles = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

// Form Data - Correspond aux colonnes ps_product
const form = ref({
  // Informations de base
  name: '',
  description: '',
  descriptionShort: '',
  
  // Références
  reference: '',
  mpn: '',
  isbn: '',
  ean13: '',      // correspond à ean_jan dans l'ancien code
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
  
  // Statut et visibilité
  active: true,
  available_for_order: true,
  online_only: false,
  visibility: 'both',
  
  // Associations
  associated_products: [] as number[]
});

// Initialisation
const initForm = (product: any) => {
  form.value = {
    name: product?.name || '',
    description: product?.description || '',
    descriptionShort: product?.description_short || '',
    reference: product?.reference || '',
    mpn: product?.mpn || '',
    isbn: product?.isbn || '',
    ean13: product?.ean13 || product?.ean_jan || '',
    upc: product?.upc || '',
    id_category_default: product?.id_category_default || '',
    id_manufacturer: product?.id_manufacturer || '',
    quantity: product?.quantity || product?.stock || 0,
    minimal_quantity: product?.minimal_quantity || 0,
    weight: product?.weight || '0',
    width: product?.width || '0',
    height: product?.height || '0',
    depth: product?.depth || '0',
    additional_shipping_cost: product?.additional_shipping_cost || '0',
    price: product?.price || '0',
    wholesale_price: product?.wholesale_price || '0',
    unit_price_ratio: product?.unit_price_ratio || '0',
    active: product?.active == 1,
    available_for_order: product?.available_for_order ?? true,
    online_only: product?.online_only ?? false,
    visibility: product?.visibility || 'both',
    associated_products: product?.associated_products || []
  };
  
  imageFiles.value = [];
  imagePreviews.value = [];
  characteristics.value = product?.characteristics || [];
  documents.value = product?.documents || [];
};

// Lifecycle
onMounted(async () => {
  await Promise.all([
    categoryStore.fetchAll(),
    manufacturerStore.fetchAll(),
    productStore.fetchAll(),
    featureStore.fetchAll(),
    languageStore.fetchAll(),
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

// Image Management
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  
  if (!input.files || input.files.length === 0) {
    console.log('Aucun fichier sélectionné');
    return;
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  Array.from(input.files).forEach(file => {
    if (!allowedTypes.includes(file.type)) {
      console.warn(`Type non autorisé: ${file.type} pour ${file.name}`);
      alert(`Le fichier ${file.name} n'est pas au format JPEG ou PNG`);
      return;
    }
    
    imageFiles.value.push(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        imagePreviews.value.push(e.target.result as string);
      }
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
    language: ''
  });
};

const removeCharacteristic = (index: number) => {
  characteristics.value.splice(index, 1);
};

const availableFeatureValues = (row: any) => {
  const feature = featureStore.features.find(f => f.id === row.featureId);
  return feature?.values || [];
};

// Documents Management
const addDocument = (fileData: any) => {
  documents.value.push(fileData);
};

// Form Submission
const submit = () => {
  emit('save', {
    // Base info
    name: form.value.name,
    description: form.value.description,
    description_short: form.value.descriptionShort,
    
    // References
    reference: form.value.reference,
    mpn: form.value.mpn,
    isbn: form.value.isbn,
    ean13: form.value.ean13,
    upc: form.value.upc,
    
    // Foreign keys
    id_category_default: form.value.id_category_default,
    id_manufacturer: form.value.id_manufacturer,
    
    // Stock
    quantity: form.value.quantity,
    minimal_quantity: form.value.minimal_quantity,
    
    // Dimensions
    weight: form.value.weight,
    width: form.value.width,
    height: form.value.height,
    depth: form.value.depth,
    additional_shipping_cost: form.value.additional_shipping_cost,
    
    // Prices
    price: form.value.price,
    wholesale_price: form.value.wholesale_price,
    unit_price_ratio: form.value.unit_price_ratio,
    
    // Status
    active: form.value.active ? '1' : '0',
    available_for_order: form.value.available_for_order ? '1' : '0',
    online_only: form.value.online_only ? '1' : '0',
    visibility: form.value.visibility,
    
    // Associations
    associated_products: form.value.associated_products,
    
    // Additional data
    characteristics: characteristics.value,
    documents: documents.value,
    images: imageFiles.value
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
      
      <!-- Onglet Description -->
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
            <p class="upload-hint"> Cliquez pour ajouter une ou plusieurs images (JPEG, PNG)</p>
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

      <!-- Onglet Détail -->
      <section v-if="activeTab === 'Detail'" class="form-section">
        <div class="subsection">
          <h4> Références produit</h4>
          
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
          <h4> Caractéristiques</h4>
          
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
              <option v-for="lang in languageStore.languages" :key="lang.id" :value="lang.id">{{ lang.name }}</option>
            </select>

            <button type="button" @click="removeCharacteristic(index)" class="btn-remove">
              Supprimer
            </button>
          </div>
        </div>

        <div class="subsection">
          <h4> Documents joints</h4>
          
          <input 
            v-model="searchDocumentQuery" 
            placeholder=" Rechercher un document..." 
            class="search-input" 
          />
          
          <button type="button" @click="showFileModal = true" class="btn-add">
            + Ajouter un fichier
          </button>
          
          <div class="documents-list">
            <div v-for="(doc, index) in filteredDocuments" :key="index" class="document-item">
              <span> {{ doc.name }} ({{ doc.filename }})</span>
              <button type="button" @click="documents.splice(index, 1)" class="btn-remove">
                Supprimer
              </button>
            </div>
          </div>
        </div>

        <div class="subsection">
          <h4> Statut du produit</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label>Activé</label>
              <select v-model="form.active">
                <option :value="true"> Oui</option>
                <option :value="false"> Non</option>
              </select>
            </div>
          </div>

        </div>
      </section>

      <!-- Onglet Stock -->
      <section v-if="activeTab === 'Stock'" class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label>Quantité disponible</label>
            <input v-model="form.quantity" type="number" step="1" placeholder="0" />
          </div>
          
          <div class="form-group">
            <label>Quantité minimale</label>
            <input v-model="form.minimal_quantity" type="number" step="1" placeholder="1" />
          </div>
        </div>
      </section>

      <!-- Onglet Livraison -->
      <section v-if="activeTab === 'Livraison'" class="form-section">
        <div class="form-group">
          <label>Poids (kg)</label>
          <input v-model="form.weight" type="number" step="0.01" placeholder="0.00" />
        </div>
        
        <div class="form-group">
          <label>Dimensions (L x H x P)</label>
          <div class="dimensions">
            <input v-model="form.width" type="number" step="0.01" placeholder="Largeur" />
            <input v-model="form.height" type="number" step="0.01" placeholder="Hauteur" />
            <input v-model="form.depth" type="number" step="0.01" placeholder="Profondeur" />
          </div>
        </div>
        
        <div class="form-group">
          <label>Frais de livraison additionnels</label>
          <input v-model="form.additional_shipping_cost" type="number" step="0.01" placeholder="0.00" />
        </div>
      </section>

      <!-- Onglet Prix -->
      <section v-if="activeTab === 'Prix'" class="form-section">
        <div class="form-group">
          <label>Prix HT *</label>
          <input v-model="form.price" type="number" step="0.01" placeholder="0.00" required />
        </div>
        
        <div class="form-group">
          <label>Prix d'achat</label>
          <input v-model="form.wholesale_price" type="number" step="0.01" placeholder="0.00" />
        </div>
        
        <div class="form-group">
          <label>Ratio prix unitaire</label>
          <input v-model="form.unit_price_ratio" type="number" step="0.01" placeholder="0.00" />
        </div>
      </section>

      <!-- Onglet Option -->
      <section v-if="activeTab === 'Option'" class="form-section">
        <div class="form-group">
          <label>Activé</label>
          <select v-model="form.active">
            <option :value="true"> Actif</option>
            <option :value="false"> Inactif</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Disponible à la commande</label>
          <select v-model="form.available_for_order">
            <option :value="true"> Disponible</option>
            <option :value="false"> Indisponible</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>En ligne uniquement</label>
          <select v-model="form.online_only">
            <option :value="false"> Non</option>
            <option :value="true"> Oui</option>
          </select>
        </div>
      </section>
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button type="submit" class="btn-save"> Sauvegarder</button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel"> Annuler</button>
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
  max-width: 900px;
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



.subsection h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
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

/* Dimensions */
.dimensions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* Buttons */
.btn-add, .btn-remove {
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

.btn-save, .btn-cancel {
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

/* Responsive */
@media (max-width: 768px) {
  .product-form {
    padding: 16px;
  }
  
  .form-row,
  .characteristic-row,
  .dimensions {
    grid-template-columns: 1fr;
  }
  
  .category-selector {
    flex-direction: column;
  }
  
  .tabs {
    overflow-x: auto;
  }
}
</style>