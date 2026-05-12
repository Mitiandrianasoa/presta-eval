<template>
  <section class="checkout-section">
    <div class="section-header">
      <span class="step-number">3</span>
      <h2>Mode de paiement</h2>
    </div>

    <div v-if="loading" class="loading-text">
      Chargement des modes de paiement...
    </div>
    <div v-else-if="payments.length === 0" class="empty-text">
      Aucun mode de paiement disponible.
    </div>
    <div v-else class="radio-group">
      <label v-for="payment in payments" :key="payment.id" class="radio-item">
        <input 
          type="radio" 
          :value="payment.id" 
          :checked="modelValue === payment.id"
          @change="$emit('update:modelValue', payment.id)"
        />
        <div class="payment-display">
          <strong>{{ payment.name }}</strong>
          <p v-if="payment.description" class="payment-description">
            {{ payment.description }}
          </p>
        </div>
      </label>
    </div>

    <div class="form-actions">
      <button @click="$emit('back')" class="btn btn-secondary">
        ← Retour à la livraison
      </button>
      <button
        @click="$emit('submit')"
        :disabled="!isValid || isSubmitting"
        class="btn btn-primary"
      >
        <span v-if="isSubmitting" class="spinner-small"></span>
        {{ isSubmitting ? 'Création en cours...' : 'Confirmer la commande' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  modelValue: String,
  payments: Array,
  loading: Boolean,
  isSubmitting: Boolean
});

defineEmits(['update:modelValue', 'submit', 'back']);

const isValid = computed(() => !!props.modelValue);
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
.payment-display { flex: 1; line-height: 1.6; color: #333; }
.payment-description { margin: 5px 0 0 0; font-size: 12px; color: #999; }
.form-actions { display: flex; gap: 10px; margin-top: 30px; }
.btn { flex: 1; padding: 14px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; text-align: center; display: inline-flex; align-items: center; justify-content: center;}
.btn-primary { background-color: #007bff; color: white; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background-color: #6c757d; color: white; }
.spinner-small { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>