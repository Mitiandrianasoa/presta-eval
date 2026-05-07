<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{ product: any }>();
const emit = defineEmits(['save', 'cancel']);

const form = ref({
  name: '',
  price: '',
  reference: '',
  categoryId: '',
  quantity: 0,
  active: true
});

onMounted(() => {
  if (props.product) {
    form.value = {
      name: props.product.name || '',
      price: props.product.price || '',
      reference: props.product.reference || '',
      categoryId: props.product.id_category_default || '',
      quantity: props.product.stock || 0,
      active: props.product.active == 1
    };
  }
});

const submit = () => {
  // ✅ Envoyer directement les données du formulaire
  emit('save', {
    name: form.value.name,
    price: form.value.price,
    reference: form.value.reference,
    id_category_default: form.value.categoryId,
    quantity: form.value.quantity,
    active: form.value.active ? '1' : '0'
  });
};
</script>

<template>
  <form @submit.prevent="submit" class="form">
    <h3>{{ product ? 'Modifier' : 'Nouveau' }} produit</h3>
    <input v-model="form.name" placeholder="Nom" required />
    <input v-model="form.reference" placeholder="Référence" />
    <input v-model="form.price" type="number" step="0.01" placeholder="Prix HT" required />
    <input v-model="form.categoryId" placeholder="ID Catégorie" />
    <input v-model="form.quantity" type="number" placeholder="Quantité" />
    <select v-model="form.active">
      <option :value="true">Actif</option>
      <option :value="false">Inactif</option>
    </select>
    <div class="actions">
      <button type="submit" class="btn-save"> Sauvegarder</button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel"> Annuler</button>
    </div>
  </form>
</template>

<style scoped>
.form { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px; max-width: 500px; }
.form input, .form select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
.actions { display: flex; gap: 10px; }
.btn-save, .btn-cancel { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-save { background: #4CAF50; color: white; }
.btn-cancel { background: #999; color: white; }
</style>