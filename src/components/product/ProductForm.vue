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
};

onMounted(async () => {
  await categoryStore.fetchAll();
  initForm(props.product);
});

watch(() => props.product, (p) => initForm(p));

const priceTTC = computed(() => {
  const p = parseFloat(form.value.price) || 0;
  const rate = form.value.tax_rule === 'MG_20' ? 0.20 : 0;
  return (p * (1 + rate)).toFixed(2);
});

const submit = () => {
  emit('save', {
    name:                form.value.name,
    reference:           form.value.reference,
    id_category_default: form.value.id_category_default,
    price:               form.value.price,
    active:              form.value.active ? '1' : '0',
    // stock géré séparément — on passe quantity + stock_available_id
    quantity:            form.value.quantity,
    stock_available_id:  props.product?.stock_available_id || '',
  });
};
</script>

<template>
  <form @submit.prevent="submit" class="pf">
    <div class="pf-header">
      <h3>{{ product?.id ? `Modifier #${product.id}` : 'Nouveau produit' }}</h3>
      <div class="pf-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">Annuler</button>
        <button type="submit" class="btn-save">Sauvegarder</button>
      </div>
    </div>

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

.pf-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px;
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