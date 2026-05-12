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
.pf {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}

/* ── En-tête ───────────────────────────────────────── */
.pf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.pf-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
}

.pf-actions { display: flex; gap: 8px; }

/* ── Champs ────────────────────────────────────────── */
.pf-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.field { display: flex; flex-direction: column; gap: 5px; }

label { font-size: 12px; font-weight: 600; color: #666; }

input, select {
  padding: 8px 10px;
  border: 1px solid #dde1e7;
  border-radius: 6px;
  font-size: 14px;
  color: #1a1a2e;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}

input:focus, select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76,175,80,.12);
}

input:disabled { background: #f5f5f5; color: #888; }

.input-unit { display: flex; }

.input-unit input {
  flex: 1;
  border-right: none;
  border-radius: 6px 0 0 6px;
}

.input-unit span {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background: #f5f6fa;
  border: 1px solid #dde1e7;
  border-left: none;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  font-weight: 600;
  color: #888;
}

/* ── Section images ────────────────────────────────── */
.pf-images {
  padding: 20px;
}

.images-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.images-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
  user-select: none;
}

.btn-upload:hover { background: #c8e6c9; }

.file-hidden {
  display: none;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

.img-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  aspect-ratio: 1;
  background: #f8f8f8;
}

.img-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.img-card.existing {
  border-color: #90caf9;
}

.img-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(0,0,0,.55);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: background .15s;
}

.img-remove:hover { background: rgba(200,0,0,.8); }

.img-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0,0,0,.5);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.img-badge.new { background: rgba(46,125,50,.8); }

.img-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px 10px;
  color: #bbb;
  font-size: 11px;
  grid-column: 1 / -1;
}

.upload-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #2e7d32;
  font-style: italic;
}

/* ── Boutons ────────────────────────────────────────── */
.btn-save, .btn-cancel {
  padding: 7px 18px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}

.btn-save { background: #4CAF50; color: white; }
.btn-save:hover { background: #43a047; }

.btn-cancel { background: #f0f0f0; color: #555; }
.btn-cancel:hover { background: #e0e0e0; }
</style>
