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
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
}
.modal-content {
  background: #13131f; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; width: 100%; max-width: 700px; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h3 { margin: 0; color: #f1f1f8; font-size: 18px; }
.close-btn {
  background: none; border: none; font-size: 24px; color: #6b7280; cursor: pointer;
  padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; transition: all 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.06); color: #f1f1f8; }

.loading { padding: 40px; text-align: center; color: #6b7280; }
.modal-form { padding: 24px; }

.form-section { margin-bottom: 28px; }
.form-section h4 {
  margin: 0 0 16px; color: #a0a0b8; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.5px;
  border-bottom: 2px solid #f97316; padding-bottom: 8px;
}
.section-hint { margin: -8px 0 16px; color: #6b7280; font-size: 13px; font-style: italic; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; color: #6b7280; font-size: 13px; margin-bottom: 6px; }

input, select {
  width: 100%; padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: 14px;
  background: #0d0d14; color: #e2e2f0; font-family: inherit;
  transition: border-color 0.2s;
}
input:focus, select:focus { outline: none; border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,0.12); }

.apply-to-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

.toggle-group { background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
.toggle-label { display: flex; align-items: center; justify-content: space-between; cursor: pointer; color: #a0a0b8; font-size: 14px; }

.toggle-btn {
  padding: 6px 16px; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  background: rgba(255,255,255,0.08); color: #6b7280; transition: background 0.2s;
}
.toggle-btn.active { background: #f97316; color: white; }

.customer-search { position: relative; }
.customer-results {
  position: absolute; top: 100%; left: 0; right: 0;
  background: #1a1a2e; border: 1px solid rgba(255,255,255,0.10); border-top: none;
  border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; z-index: 10;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.customer-item { padding: 10px 12px; cursor: pointer; font-size: 13px; color: #a0a0b8; border-bottom: 1px solid rgba(255,255,255,0.05); }
.customer-item:hover { background: rgba(249,115,22,0.08); color: #f1f1f8; }
.customer-item:last-child { border-bottom: none; }
.selected-customer { margin-top: 8px; padding: 8px 12px; background: rgba(249,115,22,0.10); border-radius: 6px; font-size: 13px; color: #f97316; }

.date-range-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.date-field { display: flex; align-items: center; gap: 8px; }
.date-label { font-size: 13px; color: #6b7280; white-space: nowrap; }
.date-field input { flex: 1; }

.impact-option { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.option-header { margin-bottom: 12px; }
.option-header .toggle-label { width: 100%; }
.option-fields { padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.08); }

.discount-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
.discount-input { min-width: 0; }
.unit-select, .tax-select { width: auto; min-width: 70px; }

.input-unit-wrap { display: flex; align-items: stretch; }
.input-unit-wrap input { flex: 1; border-right: none; border-radius: 8px 0 0 8px; }
.input-unit-wrap .unit {
  display: flex; align-items: center; padding: 0 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10);
  border-left: none; border-radius: 0 8px 8px 0; font-size: 13px; font-weight: 600; color: #6b7280;
}

.modal-actions {
  display: flex; justify-content: flex-end; gap: 12px;
  padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 8px;
}
.btn-cancel, .btn-save {
  padding: 10px 24px; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-cancel { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #a0a0b8; }
.btn-cancel:hover { background: rgba(255,255,255,0.12); color: #f1f1f8; }
.btn-save { background: #f97316; color: white; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
.btn-save:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 600px) {
  .apply-to-row, .date-range-row { grid-template-columns: 1fr; }
  .discount-row { grid-template-columns: 1fr; }
  .unit-select, .tax-select { width: 100%; }
}
</style>
