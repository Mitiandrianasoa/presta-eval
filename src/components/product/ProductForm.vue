<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';
import { useManufacturerStore } from '../../stores/brand/manufacturerStore';
import { useProductStore } from '../../stores/product/productStore';
import AddCategoryModal from './AddCategoryModal.vue';
import ProductSearch from './ProductSearch.vue';

const props = defineProps<{ product: any }>();
const emit = defineEmits(['save', 'cancel']);

const tabs = ['Description', 'Detail', 'Stock', 'Livraison', 'Prix', 'Option'];
const activeTab = ref('Description');

const categoryStore = useCategoryStore();
const manufacturerStore = useManufacturerStore();
const productStore = useProductStore();

const showCategoryModal = ref(false);
const imageFiles = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

const form = ref({
  name: '',
  description: '',
  descriptionShort: '',
  reference: '',
  id_category_default: '',
  id_manufacturer: '',
  quantity: 0,
  minimal_quantity: 0,
  weight: '0',
  width: '0',
  height: '0',
  depth: '0',
  additional_shipping_cost: '0',
  price: '0',
  wholesale_price: '0',
  unit_price_ratio: '0',
  active: true,
  available_for_order: true,
  online_only: false,
  visibility: 'both',
  associated_products: [] as number[]
});

const initForm = (product: any) => {
  form.value = {
    name: product?.name || '',
    description: product?.description || '',
    descriptionShort: product?.description_short || '',
    reference: product?.reference || '',
    id_category_default: product?.id_category_default || '',
    id_manufacturer: product?.id_manufacturer || '',
    quantity: product?.stock || 0,
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
};

onMounted(async () => {
  await Promise.all([
    categoryStore.fetchAll(),
    manufacturerStore.fetchAll(),
    productStore.fetchAll()
  ]);
  initForm(props.product);
});

watch(() => props.product, (newProduct) => initForm(newProduct));

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  
  if (!input.files || input.files.length === 0) {
    console.log('Aucun fichier sélectionné');
    return;
  }
  
  console.log('Fichiers sélectionnés:', input.files.length);
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  Array.from(input.files).forEach(file => {
    if (!allowedTypes.includes(file.type)) {
      console.warn(`Type non autorisé: ${file.type} pour ${file.name}`);
      alert(`Le fichier ${file.name} n'est pas au format JPEG ou PNG`);
      return;
    }
    
    console.log('Traitement du fichier:', file.name);
    imageFiles.value.push(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        imagePreviews.value.push(e.target.result as string);
        console.log('Aperçu ajouté pour:', file.name);
      }
    };
    reader.onerror = (error) => {
      console.error('Erreur de lecture du fichier:', error);
    };
    reader.readAsDataURL(file);
  });
  
  // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers à nouveau
  input.value = '';
};

const removeImage = (index: number) => {
  imageFiles.value.splice(index, 1);
  imagePreviews.value.splice(index, 1);
};

const submit = () => {
  emit('save', {
    name: form.value.name,
    description: form.value.description,
    description_short: form.value.descriptionShort,
    price: form.value.price,
    wholesale_price: form.value.wholesale_price,
    unit_price_ratio: form.value.unit_price_ratio,
    reference: form.value.reference,
    id_category_default: form.value.id_category_default,
    id_manufacturer: form.value.id_manufacturer,
    quantity: form.value.quantity,
    minimal_quantity: form.value.minimal_quantity,
    weight: form.value.weight,
    width: form.value.width,
    height: form.value.height,
    depth: form.value.depth,
    additional_shipping_cost: form.value.additional_shipping_cost,
    active: form.value.active ? '1' : '0',
    available_for_order: form.value.available_for_order ? '1' : '0',
    online_only: form.value.online_only ? '1' : '0',
    visibility: form.value.visibility,
    associated_products: form.value.associated_products,
    images: imageFiles.value
  });
};
</script>

<template>
  <form @submit.prevent="submit" class="form">
    <h3>{{ product ? 'Modifier' : 'Nouveau' }} produit</h3>

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

    <div class="tab-content">
      <section v-if="activeTab === 'Description'">
        <label>Article</label>
        <input v-model="form.name" placeholder="Nom du produit" required />

        <label>Images</label>
        <div class="image-upload" @click="triggerFileInput">
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/jpeg, image/png, image/jpg, .jpeg, .jpg, .png"
            @change="handleImageUpload"
            class="file-input"
          />
          <p class="upload-hint">Cliquez pour ajouter une ou plusieurs images (JPEG, PNG)</p>
        </div>
        <div v-if="imagePreviews.length" class="image-previews">
          <div v-for="(preview, index) in imagePreviews" :key="index" class="image-preview">
            <img :src="preview" />
            <button type="button" @click="removeImage(index)" class="remove-img-btn">✕</button>
          </div>
        </div>

        <label>Récapitulatif</label>
        <textarea v-model="form.descriptionShort" placeholder="Description courte"></textarea>

        <label>Description</label>
        <textarea v-model="form.description" placeholder="Description détaillée" style="min-height: 150px;"></textarea>

        <label>Catégorie par défaut</label>
        <div class="category-selector">
          <select v-model="form.id_category_default">
            <option value="">Sélectionner une catégorie</option>
            <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <button type="button" @click="showCategoryModal = true" class="btn-add-category">
            + Ajouter catégorie
          </button>
        </div>

        <label>Marque</label>
        <select v-model="form.id_manufacturer">
          <option value="">Sélectionner une marque</option>
          <option v-for="mfr in manufacturerStore.manufacturers" :key="mfr.id" :value="mfr.id">
            {{ mfr.name }}
          </option>
        </select>

        <ProductSearch
          :selectedIds="form.associated_products"
          @add="(p) => form.associated_products.push(p.id)"
          @remove="(id) => form.associated_products = form.associated_products.filter(pid => pid !== id)"
        />
      </section>

      <section v-if="activeTab === 'Detail'">
        <label>Référence</label>
        <input v-model="form.reference" placeholder="Référence produit" />
        <label>ID Catégorie</label>
        <input v-model="form.id_category_default" placeholder="ID de la catégorie par défaut" />
        <label>Visibilité</label>
        <select v-model="form.visibility">
          <option value="both">Catalogue et recherche</option>
          <option value="catalog">Catalogue uniquement</option>
          <option value="search">Recherche uniquement</option>
          <option value="none">Masqué</option>
        </select>
      </section>

      <section v-if="activeTab === 'Stock'">
        <label>Quantité</label>
        <input v-model="form.quantity" type="number" placeholder="Quantité disponible" />
        <label>Quantité minimale</label>
        <input v-model="form.minimal_quantity" type="number" placeholder="Quantité minimale" />
      </section>

      <section v-if="activeTab === 'Livraison'">
        <label>Poids</label>
        <input v-model="form.weight" type="number" step="0.01" placeholder="Poids (kg)" />
        <label>Dimensions (L x H x P)</label>
        <div class="dimensions">
          <input v-model="form.width" type="number" step="0.01" placeholder="Largeur" />
          <input v-model="form.height" type="number" step="0.01" placeholder="Hauteur" />
          <input v-model="form.depth" type="number" step="0.01" placeholder="Profondeur" />
        </div>
        <label>Frais de livraison additionnels</label>
        <input v-model="form.additional_shipping_cost" type="number" step="0.01" placeholder="Coût livraison" />
      </section>

      <section v-if="activeTab === 'Prix'">
        <label>Prix HT</label>
        <input v-model="form.price" type="number" step="0.01" placeholder="Prix HT" required />
        <label>Prix d'achat</label>
        <input v-model="form.wholesale_price" type="number" step="0.01" placeholder="Prix d'achat" />
        <label>Prix unitaire</label>
        <input v-model="form.unit_price_ratio" type="number" step="0.01" placeholder="Prix par unité" />
      </section>

      <section v-if="activeTab === 'Option'">
        <label>Activé</label>
        <select v-model="form.active">
          <option :value="true">Oui</option>
          <option :value="false">Non</option>
        </select>
        <label>Disponible à la commande</label>
        <select v-model="form.available_for_order">
          <option :value="true">Oui</option>
          <option :value="false">Non</option>
        </select>
        <label>En ligne uniquement</label>
        <select v-model="form.online_only">
          <option :value="false">Non</option>
          <option :value="true">Oui</option>
        </select>
      </section>
    </div>

    <div class="actions">
      <button type="submit" class="btn-save">Sauvegarder</button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel">Annuler</button>
    </div>

    <AddCategoryModal
      :open="showCategoryModal"
      @close="showCategoryModal = false"
      @add="(cat) => { form.id_category_default = cat.id; }"
    />
  </form>
</template>

<style scoped>
.form { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px; max-width: 800px; }
.form label { font-weight: 600; margin-top: 12px; }
.form input, .form select, .form textarea { padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 100%; font-size: 14px; }
.form textarea { min-height: 100px; resize: vertical; }
.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.tab { background: #ececec; border: 1px solid #d5d5d5; color: #333; padding: 10px 14px; border-radius: 999px; cursor: pointer; transition: background 0.2s ease; }
.tab.active { background: #4CAF50; color: white; border-color: #4CAF50; }
.tab:hover { background: #d9d9d9; }
.tab-content { display: flex; flex-direction: column; gap: 12px; }
.dimensions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.actions { display: flex; gap: 10px; margin-top: 18px; }
.btn-save, .btn-cancel { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-save { background: #4CAF50; color: white; }
.btn-cancel { background: #999; color: white; }

.image-upload {
  border: 2px dashed #ddd;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: #f9f9f9;
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
  font-size: 13px;
  pointer-events: none;
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
  border-radius: 6px;
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
}

.category-selector {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.category-selector select {
  flex: 1;
}

.btn-add-category {
  padding: 10px 14px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.btn-add-category:hover {
  background: #1976D2;
}
</style>