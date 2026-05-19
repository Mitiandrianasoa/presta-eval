<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useSpecificPriceStore } from '../../stores/specificPrice/specificPriceStore';

defineOptions({
  name: 'AddSpecificPriceModal'
});

const props = defineProps<{
  productId?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: any];
}>();

const specificPriceStore = useSpecificPriceStore();

// UI State
const loading = ref(false);
const customerSearchQuery = ref('');

// Form Data
const form = ref({
  // Conditions
  idCurrency: '',
  idCountry: '',
  idGroup: '',
  applyToAllCustomers: true,
  idCustomer: '',
  fromQuantity: 1,

  // Durée
  fromDate: '',
  toDate: '',

  // Impact sur le prix
  applyDiscount: true,
  discountAmount: '',
  discountUnit: 'Ar', // 'Ar' or '%'
  discountTax: 'HT', // 'HT' or 'TTC'

  setSpecificPrice: false,
  specificPrice: '',
});

// Computed
const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value) return [];
  return specificPriceStore.customers.filter(c =>
    c.firstname.toLowerCase().includes(customerSearchQuery.value.toLowerCase()) ||
    c.lastname.toLowerCase().includes(customerSearchQuery.value.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearchQuery.value.toLowerCase())
  ).slice(0, 10);
});

const canSubmit = computed(() => {
  // Au moins une action doit être activée
  if (!form.value.applyDiscount && !form.value.setSpecificPrice) return false;

  if (form.value.applyDiscount && !form.value.discountAmount) return false;
  if (form.value.setSpecificPrice && !form.value.specificPrice) return false;

  return true;
});

// Methods
const selectCustomer = (customer: any) => {
  form.value.idCustomer = customer.id;
  customerSearchQuery.value = `${customer.firstname} ${customer.lastname} (${customer.email})`;
};

const searchCustomers = async () => {
  if (customerSearchQuery.value.length >= 2) {
    await specificPriceStore.fetchCustomers(customerSearchQuery.value);
  }
};

const submit = () => {
  const data = {
    id_product: props.productId || '',
    id_currency: form.value.idCurrency,
    id_country: form.value.idCountry,
    id_group: form.value.idGroup,
    id_customer: form.value.applyToAllCustomers ? '0' : form.value.idCustomer,
    from_quantity: form.value.fromQuantity,
    from: form.value.fromDate,
    to: form.value.toDate,
    reduction_type: form.value.applyDiscount
      ? (form.value.discountUnit === '%' ? 'percentage' : 'amount')
      : '',
    reduction: form.value.applyDiscount ? form.value.discountAmount : '0',
    reduction_tax: form.value.applyDiscount
      ? (form.value.discountTax === 'TTC' ? '1' : '0')
      : '0',
    price: form.value.setSpecificPrice ? form.value.specificPrice : '-1',
  };

  emit('save', data);
};

// Lifecycle
onMounted(async () => {
  loading.value = true;
  await specificPriceStore.fetchAll();
  loading.value = false;
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Ajouter un prix spécifique</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <div v-if="loading" class="loading">
        Chargement...
      </div>

      <form v-else @submit.prevent="submit" class="modal-form">
        <!-- Section Conditions -->
        <div class="form-section">
          <h4>Conditions</h4>

          <div class="form-group">
            <label>Appliquer à</label>
            <div class="apply-to-row">
              <select v-model="form.idCurrency">
                <option value="">Toutes les devises</option>
                <option v-for="curr in specificPriceStore.currencies" :key="curr.id" :value="curr.id">
                  {{ curr.name }} ({{ curr.isoCode }})
                </option>
              </select>

              <select v-model="form.idCountry">
                <option value="">Tous les pays</option>
                <option v-for="country in specificPriceStore.countries" :key="country.id" :value="country.id">
                  {{ country.name }}
                </option>
              </select>

              <select v-model="form.idGroup">
                <option value="">Tous les groupes</option>
                <option v-for="group in specificPriceStore.groups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group toggle-group">
            <label class="toggle-label">
              <span>Appliquer à tous les clients</span>
              <button
                type="button"
                class="toggle-btn"
                :class="{ active: form.applyToAllCustomers }"
                @click="form.applyToAllCustomers = !form.applyToAllCustomers"
              >
                {{ form.applyToAllCustomers ? 'Oui' : 'Non' }}
              </button>
            </label>
          </div>

          <div v-if="!form.applyToAllCustomers" class="form-group customer-search">
            <label>Rechercher un client</label>
            <input
              v-model="customerSearchQuery"
              type="text"
              placeholder="Rechercher par nom, email..."
              @input="searchCustomers"
            />
            <div v-if="filteredCustomers.length > 0" class="customer-results">
              <div
                v-for="customer in filteredCustomers"
                :key="customer.id"
                class="customer-item"
                @click="selectCustomer(customer)"
              >
                {{ customer.firstname }} {{ customer.lastname }} - {{ customer.email }}
              </div>
            </div>
            <div v-if="form.idCustomer && !customerSearchQuery" class="selected-customer">
              Client sélectionné ID: {{ form.idCustomer }}
            </div>
          </div>

          <div class="form-group">
            <label>Nombre minimal d'unités achetées</label>
            <input
              v-model.number="form.fromQuantity"
              type="number"
              min="1"
              step="1"
              placeholder="1"
            />
          </div>

          <div class="form-group">
            <label>Durée</label>
            <div class="date-range-row">
              <div class="date-field">
                <span class="date-label">Du</span>
                <input v-model="form.fromDate" type="date" />
              </div>
              <div class="date-field">
                <span class="date-label">Au</span>
                <input v-model="form.toDate" type="date" />
              </div>
            </div>
          </div>
        </div>

        <!-- Section Impact sur le prix -->
        <div class="form-section">
          <h4>Impact sur le prix</h4>
          <p class="section-hint">Au moins l'un des éléments suivants doit être activé</p>

          <div class="impact-option">
            <div class="option-header">
              <label class="toggle-label">
                <span>Appliquer une remise sur le prix initial</span>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ active: form.applyDiscount }"
                  @click="form.applyDiscount = !form.applyDiscount"
                >
                  {{ form.applyDiscount ? 'Activé' : 'Désactivé' }}
                </button>
              </label>
            </div>

            <div v-if="form.applyDiscount" class="option-fields">
              <div class="discount-row">
                <input
                  v-model="form.discountAmount"
                  type="number"
                  step="0.01"
                  placeholder="Montant"
                  class="discount-input"
                />
                <select v-model="form.discountUnit" class="unit-select">
                  <option value="Ar">Ar</option>
                  <option value="%">%</option>
                </select>
                <select v-model="form.discountTax" class="tax-select">
                  <option value="HT">HT</option>
                  <option value="TTC">TTC</option>
                </select>
              </div>
            </div>
          </div>

          <div class="impact-option">
            <div class="option-header">
              <label class="toggle-label">
                <span>Saisir un prix spécifique</span>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ active: form.setSpecificPrice }"
                  @click="form.setSpecificPrice = !form.setSpecificPrice"
                >
                  {{ form.setSpecificPrice ? 'Activé' : 'Désactivé' }}
                </button>
              </label>
            </div>

            <div v-if="form.setSpecificPrice" class="option-fields">
              <div class="form-group">
                <label>Prix de vente (HT)</label>
                <div class="input-unit-wrap">
                  <input
                    v-model="form.specificPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <span class="unit">Ar</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">
            Annuler
          </button>
          <button
            type="submit"
            class="btn-save"
            :disabled="!canSubmit"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9000; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 1.75rem; width: 90%; max-width: 520px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.modal-header h3 { font-size: 1rem; font-weight: 700; color: #e6edf3; margin: 0; }
.close-btn { background: transparent; border: none; color: #7d8590; cursor: pointer; font-size: 1.25rem; padding: 0; line-height: 1; transition: color 0.2s; }
.close-btn:hover { color: #e6edf3; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 0.8rem; color: #7d8590; font-weight: 500; }
.form-input, .form-select {
  padding: 0.55rem 0.75rem; background: #0d1117; border: 1px solid #30363d;
  border-radius: 6px; color: #e6edf3; font-size: 0.875rem; transition: border-color 0.2s;
}
.form-input:focus, .form-select:focus { outline: none; border-color: #388bfd; }
.form-select option { background: #161b22; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
.btn-primary { padding: 0.55rem 1.25rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #1f6feb; }
.btn-cancel { padding: 0.55rem 1.25rem; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #7d8590; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { border-color: #484f58; color: #e6edf3; }
@media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }

</style>