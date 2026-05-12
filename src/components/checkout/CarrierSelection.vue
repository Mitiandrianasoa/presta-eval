<template>
  <section class="checkout-section">
    <div class="section-header">
      <span class="step-number">2</span>
      <h2>Mode de livraison</h2>
    </div>

    <div v-if="loading" class="loading-text">
      Chargement des transporteurs...
    </div>
    <div v-else-if="carriers.length === 0" class="empty-text">
      Aucun transporteur disponible.
    </div>
    <div v-else class="radio-group">
      <label v-for="carrier in carriers" :key="carrier.id" class="radio-item">
        <input 
          type="radio" 
          :value="carrier.id" 
          :checked="modelValue === carrier.id"
          @change="$emit('update:modelValue', carrier.id)"
        />
        <div class="carrier-display">
          <strong>{{ carrier.name }}</strong>
          <span v-if="carrier.price" class="carrier-price">
            ({{ formatPrice(carrier.price) }})
          </span>
          <p v-if="carrier.delay" class="carrier-delay">
            {{ carrier.delay }}
          </p>
        </div>
      </label>
    </div>

    <div class="form-actions">
      <button @click="$emit('back')" class="btn btn-secondary">
        ← Retour à l'adresse
      </button>
      <button
        @click="$emit('next')"
        :disabled="!isValid"
        class="btn btn-primary"
      >
        Continuer vers le paiement →
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  modelValue: String,
  carriers: Array,
  loading: Boolean
});

defineEmits(['update:modelValue', 'next', 'back']);

const isValid = computed(() => !!props.modelValue);

function formatPrice(price: number | string): string {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount);
}
</script>

<style scoped>
.checkout-section { padding-bottom: 20px; }
.section-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.step-number { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background-color: #007bff; color: white; border-radius: 50%; font-weight: bold; font-size: 18px; }
.loading-text, .empty-text { padding: 15px; color: #999; text-align: center; }
.radio-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;}
.radio-item { display: flex; gap: 15px; padding: 15px; border: 2px solid #eee; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.radio-item:hover { background-color: #f9f9f9; border-color: #007bff; }
.radio-item input[type='radio']:checked ~ div { font-weight: bold; color: #007bff; }
.carrier-display { flex: 1; line-height: 1.6; color: #333; }
.carrier-delay { margin: 5px 0 0 0; font-size: 12px; color: #999; }
.carrier-price { margin-left: 10px; color: #666; }
.form-actions { display: flex; gap: 10px; margin-top: 30px; }
.btn { flex: 1; padding: 14px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; text-align: center; display: inline-flex; align-items: center; justify-content: center;}
.btn-primary { background-color: #007bff; color: white; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background-color: #6c757d; color: white; }
</style>