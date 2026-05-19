<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useCategoryStore } from '../../stores/category/CategoryStore';

const props = defineProps<{ product: any }>();
const emit = defineEmits(['save', 'cancel']);

const categoryStore = useCategoryStore();

const form = ref({
  name: '',
  reference: '',
  id_category_default: '',
  price: '0',
  tax_rule: '',
  active: true,
  quantity: 0,
});

// ── Images ──────────────────────────────────────────────────────
const imageFiles   = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const fileInputRef  = ref<HTMLInputElement | null>(null);

const existingImg = computed(() => props.product?.img || null);

const onFilesChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  const newFiles = Array.from(input.files);

  // Fusionner avec les fichiers déjà sélectionnés (éviter doublons par nom)
  const existing = new Set(imageFiles.value.map(f => f.name));
  const toAdd = newFiles.filter(f => !existing.has(f.name));

  imageFiles.value.push(...toAdd);
  toAdd.forEach(f => imagePreviews.value.push(URL.createObjectURL(f)));

  // Réinitialiser l'input pour permettre de re-sélectionner le même fichier
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const removePreview = (index: number) => {
  URL.revokeObjectURL(imagePreviews.value[index]);
  imagePreviews.value.splice(index, 1);
  imageFiles.value.splice(index, 1);
};

// ── Init / watch ─────────────────────────────────────────────────
const initForm = (product: any) => {
  form.value = {
    name:                product?.name || '',
    reference:           product?.reference || '',
    id_category_default: product?.id_category_default || '',
    price:               product?.price || '0',
    tax_rule:            product?.tax_rule || '',
    active:              product?.active == 1,
    quantity:            product?.stock || 0,
  };
  // Réinitialiser les images à chaque changement de produit
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url));
  imagePreviews.value = [];
  imageFiles.value    = [];
};

onMounted(async () => {
  await categoryStore.fetchAll();
  initForm(props.product);
});

watch(() => props.product, (p) => initForm(p));

// ── Prix TTC ─────────────────────────────────────────────────────
const priceTTC = computed(() => {
  const p    = parseFloat(form.value.price) || 0;
  const rate = form.value.tax_rule === 'MG_20' ? 0.20 : 0;
  return (p * (1 + rate)).toFixed(2);
});

// ── Submit ────────────────────────────────────────────────────────
const submit = () => {
  emit('save', {
    name:                form.value.name,
    reference:           form.value.reference,
    id_category_default: form.value.id_category_default,
    price:               form.value.price,
    active:              form.value.active ? '1' : '0',
    quantity:            form.value.quantity,
    stock_available_id:  props.product?.stock_available_id || '',
    imageFiles:          imageFiles.value.length ? imageFiles.value : undefined,
  });
};
</script>

<template>
  <form @submit.prevent="submit" class="pf">
    <!-- En-tête -->
    <div class="pf-header">
      <h3>{{ product?.id ? `Modifier #${product.id}` : 'Nouveau produit' }}</h3>
      <div class="pf-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">Annuler</button>
        <button type="submit" class="btn-save">Sauvegarder</button>
      </div>
    </div>

    <!-- Champs texte -->
    <div class="pf-fields">
      <div class="field">
        <label>Nom</label>
        <input v-model="form.name" placeholder="Nom du produit" required />
      </div>

      <div class="field">
        <label>Référence</label>
        <input v-model="form.reference" placeholder="Réf. interne" />
      </div>

      <div class="field">
        <label>Catégorie</label>
        <select v-model="form.id_category_default">
          <option value="">— Aucune —</option>
          <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="field">
        <label>Prix HT</label>
        <div class="input-unit">
          <input v-model="form.price" type="number" step="0.01" placeholder="0.00" required />
          <span>Ar</span>
        </div>
      </div>

      <div class="field">
        <label>Prix TTC</label>
        <div class="input-unit">
          <input :value="priceTTC" type="number" disabled />
          <span>Ar</span>
        </div>
      </div>

      <div class="field">
        <label>Stock</label>
        <input v-model.number="form.quantity" type="number" step="1" min="0" />
      </div>

      <div class="field">
        <label>Statut</label>
        <select v-model="form.active">
          <option :value="true">Actif</option>
          <option :value="false">Inactif</option>
        </select>
      </div>
    </div>

    <!-- Section images -->
    <div class="pf-images">
      <div class="images-header">
        <span class="images-label">Images du produit</span>
        <label class="btn-upload" tabindex="0">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Ajouter des images
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="file-hidden"
            @change="onFilesChange"
          />
        </label>
      </div>

      <div class="images-grid">
        <!-- Image existante (mode édition) -->
        <div v-if="existingImg && imageFiles.length === 0" class="img-card existing">
          <img :src="existingImg" alt="Image actuelle" />
          <span class="img-badge">Actuelle</span>
        </div>

        <!-- Nouvelles images sélectionnées -->
        <div
          v-for="(preview, i) in imagePreviews"
          :key="i"
          class="img-card"
        >
          <img :src="preview" :alt="`Image ${i + 1}`" />
          <button type="button" class="img-remove" @click="removePreview(i)" title="Supprimer">
            ✕
          </button>
          <span class="img-badge new">Nouvelle</span>
        </div>

        <!-- Placeholder vide -->
        <div v-if="!existingImg && imagePreviews.length === 0" class="img-placeholder">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ccc" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Aucune image</span>
        </div>
      </div>

      <p v-if="imageFiles.length > 0" class="upload-hint">
        {{ imageFiles.length }} image(s) seront envoyées lors de la sauvegarde
      </p>
    </div>
  </form>
</template>

<style scoped>

.product-form { }
.form-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1.75rem; margin-bottom: 1.25rem; }
.form-card h3 { font-size: 0.875rem; font-weight: 700; color: #e6edf3; margin: 0 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #21262d; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 0.8rem; color: #7d8590; font-weight: 500; }
.form-input, .form-select, .form-textarea {
  padding: 0.55rem 0.75rem; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s; font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #388bfd; }
.form-select option { background: #161b22; }
.form-textarea { min-height: 100px; resize: vertical; }
.submit-row { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-primary { padding: 0.6rem 1.5rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1f6feb; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-cancel { padding: 0.6rem 1.5rem; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #7d8590; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { border-color: #484f58; color: #e6edf3; }
.alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1.25rem; }
.alert.error { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.25); color: #f85149; }
.alert.success { background: rgba(63,185,80,0.1); border: 1px solid rgba(63,185,80,0.25); color: #3fb950; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

</style>