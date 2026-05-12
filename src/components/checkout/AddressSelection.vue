<template>
  <section class="checkout-section">
    <div class="section-header">
      <span class="step-number">1</span>
      <h2>Adresse de livraison</h2>
    </div>

    <!-- ── Chargement ──────────────────────────────────────────── -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Vérification des adresses enregistrées…</p>
    </div>

    <template v-else>
      <!-- ── Mode : liste des adresses sauvegardées ──────────── -->
      <div v-if="showList" class="radio-group">
        <label
          v-for="addr in addresses"
          :key="addr.id"
          class="radio-item"
          :class="{ 'radio-item--selected': modelValue === addr.id }"
        >
          <input
            type="radio"
            :value="addr.id"
            :checked="modelValue === addr.id"
            @change="$emit('update:modelValue', addr.id)"
          />
          <div class="address-display">
            <strong class="address-alias">{{ addr.alias || 'Adresse' }}</strong>
            <span class="address-name">{{ addr.firstname }} {{ addr.lastname }}</span>
            <span class="address-line">{{ addr.address1 }}<span v-if="addr.address2">, {{ addr.address2 }}</span></span>
            <span class="address-city">{{ addr.postcode }} {{ addr.city }}</span>
          </div>
          <span v-if="modelValue === addr.id" class="check-icon">✓</span>
        </label>

        <!-- Bouton pour créer une nouvelle adresse -->
        <button class="btn-new-address" @click="openForm">
          <span class="plus-icon">＋</span> Utiliser une nouvelle adresse
        </button>
      </div>

      <!-- ── Mode : formulaire nouvelle adresse ──────────────── -->
      <div v-else class="address-form-wrapper">
        <div v-if="hasSavedAddresses" class="back-to-list" @click="cancelForm">
          ← Utiliser une adresse enregistrée
        </div>

        <div class="address-form-grid">
          <div class="field-group">
            <label for="addr-alias">Alias <span class="hint">(ex: Maison, Bureau)</span></label>
            <input id="addr-alias" v-model="form.alias" type="text" placeholder="Maison" autocomplete="off" />
          </div>

          <div class="field-group">
            <label for="addr-firstname">Prénom <span class="required">*</span></label>
            <input
              id="addr-firstname"
              v-model="form.firstname"
              type="text"
              placeholder="Jean"
              :class="{ 'input-error': touched.firstname && !form.firstname.trim() }"
              @blur="touched.firstname = true"
            />
            <span v-if="touched.firstname && !form.firstname.trim()" class="error-msg">Prénom requis</span>
          </div>

          <div class="field-group">
            <label for="addr-lastname">Nom <span class="required">*</span></label>
            <input
              id="addr-lastname"
              v-model="form.lastname"
              type="text"
              placeholder="Dupont"
              :class="{ 'input-error': touched.lastname && !form.lastname.trim() }"
              @blur="touched.lastname = true"
            />
            <span v-if="touched.lastname && !form.lastname.trim()" class="error-msg">Nom requis</span>
          </div>

          <div class="field-group field-full">
            <label for="addr-address1">Adresse <span class="required">*</span></label>
            <input
              id="addr-address1"
              v-model="form.address1"
              type="text"
              placeholder="Rue, quartier, numéro"
              :class="{ 'input-error': touched.address1 && !form.address1.trim() }"
              @blur="touched.address1 = true"
            />
            <span v-if="touched.address1 && !form.address1.trim()" class="error-msg">Adresse requise</span>
          </div>

          <div class="field-group field-full">
            <label for="addr-address2">Complément d'adresse</label>
            <input id="addr-address2" v-model="form.address2" type="text" placeholder="Appartement, étage…" />
          </div>

          <div class="field-group">
            <label for="addr-postcode">Code postal <span class="required">*</span></label>
            <input
              id="addr-postcode"
              v-model="form.postcode"
              type="text"
              placeholder="101"
              :class="{ 'input-error': touched.postcode && !form.postcode.trim() }"
              @blur="touched.postcode = true"
            />
            <span v-if="touched.postcode && !form.postcode.trim()" class="error-msg">Code postal requis</span>
          </div>

          <div class="field-group">
            <label for="addr-city">Ville <span class="required">*</span></label>
            <input
              id="addr-city"
              v-model="form.city"
              type="text"
              placeholder="Antananarivo"
              :class="{ 'input-error': touched.city && !form.city.trim() }"
              @blur="touched.city = true"
            />
            <span v-if="touched.city && !form.city.trim()" class="error-msg">Ville requise</span>
          </div>

          <div class="field-group">
            <label for="addr-phone">Téléphone</label>
            <input id="addr-phone" v-model="form.phone" type="tel" placeholder="+261 34 00 000 00" />
          </div>

          <div class="field-group">
            <label for="addr-phone-mobile">Mobile</label>
            <input id="addr-phone-mobile" v-model="form.phone_mobile" type="tel" placeholder="+261 32 00 000 00" />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Actions ─────────────────────────────────────────────── -->
    <div class="form-actions" v-if="!loading">
      <router-link to="/cart" class="btn btn-secondary">← Retour au panier</router-link>
      <button
        class="btn btn-primary"
        :disabled="!isValid"
        @click="handleNext"
      >
        Continuer →
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Address {
  id: string;
  alias?: string;
  firstname: string;
  lastname: string;
  address1: string;
  address2?: string;
  postcode: string;
  city: string;
}

interface AddressForm {
  alias: string;
  firstname: string;
  lastname: string;
  address1: string;
  address2: string;
  postcode: string;
  city: string;
  phone: string;
  phone_mobile: string;
}

const props = defineProps<{
  modelValue?: string;
  addresses: Address[];
  loading: boolean;
  hasSavedAddresses: boolean;
  form: AddressForm;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'next'): void;
}>();

// ── État interne ───────────────────────────────────────────────
// showList = true  → affiche la liste des adresses enregistrées
// showList = false → affiche le formulaire de nouvelle adresse
const showList = ref(props.hasSavedAddresses);

// Champs touchés pour la validation progressive
const touched = ref({
  firstname: false,
  lastname: false,
  address1: false,
  postcode: false,
  city: false,
});

// Réagir si hasSavedAddresses change après le chargement
watch(() => props.hasSavedAddresses, (has) => {
  showList.value = has;
});

// ── Actions ────────────────────────────────────────────────────
function openForm() {
  // Réinitialise la sélection radio
  emit('update:modelValue', '');
  showList.value = false;
}

function cancelForm() {
  showList.value = true;
  // Remet la sélection sur la 1ère adresse si disponible
  if (props.addresses.length > 0) {
    emit('update:modelValue', props.addresses[0].id);
  }
}

function handleNext() {
  if (!isValid.value) {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(touched.value).forEach(k => (touched.value as any)[k] = true);
    return;
  }
  emit('next');
}

// ── Validation ─────────────────────────────────────────────────
const isValid = computed(() => {
  if (showList.value) {
    return !!props.modelValue;
  }
  const f = props.form;
  return (
    !!f.firstname?.trim() &&
    !!f.lastname?.trim() &&
    !!f.address1?.trim() &&
    !!f.city?.trim() &&
    !!f.postcode?.trim()
  );
});
</script>

<style scoped>
.checkout-section { padding-bottom: 24px; }

/* Header */
.section-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.step-number {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; border-radius: 50%;
  font-weight: 700; font-size: 16px; flex-shrink: 0;
}
.section-header h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #1e293b; }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px; color: #64748b; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid #e2e8f0; border-top-color: #4f46e5;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Liste adresses */
.radio-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.radio-item {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 16px; border: 2px solid #e2e8f0; border-radius: 10px;
  cursor: pointer; transition: all 0.2s ease; position: relative;
}
.radio-item:hover { border-color: #6366f1; background: #f8f7ff; }
.radio-item--selected { border-color: #4f46e5; background: #f5f3ff; }

.radio-item input[type="radio"] { margin-top: 3px; accent-color: #4f46e5; flex-shrink: 0; }

.address-display { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.address-alias { font-size: 14px; font-weight: 700; color: #1e293b; }
.address-name { font-size: 13px; color: #475569; }
.address-line, .address-city { font-size: 13px; color: #64748b; }

.check-icon { color: #4f46e5; font-size: 18px; font-weight: 700; align-self: center; }

/* Bouton nouvelle adresse */
.btn-new-address {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 18px; border: 2px dashed #c7d2fe; border-radius: 10px;
  background: transparent; color: #4f46e5;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease;
}
.btn-new-address:hover { background: #eff6ff; border-color: #4f46e5; }
.plus-icon { font-size: 18px; line-height: 1; }

/* Retour liste */
.back-to-list {
  display: inline-flex; align-items: center; gap: 6px;
  color: #4f46e5; font-size: 13px; font-weight: 600;
  cursor: pointer; margin-bottom: 20px;
  padding: 6px 12px; border-radius: 6px;
  transition: background 0.15s;
}
.back-to-list:hover { background: #f5f3ff; }

/* Formulaire */
.address-form-wrapper { margin-bottom: 16px; }
.address-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-group label { font-size: 13px; font-weight: 600; color: #374151; }
.hint { font-weight: 400; color: #9ca3af; font-size: 12px; }
.required { color: #ef4444; }

.field-group input {
  padding: 11px 14px;
  border: 1.5px solid #d1d5db; border-radius: 8px;
  font-size: 14px; color: #1e293b;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  background: #fff;
}
.field-group input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
.input-error { border-color: #ef4444 !important; }
.error-msg { font-size: 12px; color: #ef4444; }
.field-full { grid-column: 1 / -1; }

/* Actions */
.form-actions { display: flex; gap: 12px; margin-top: 28px; }
.btn {
  flex: 1; padding: 13px 20px; border: none; border-radius: 8px;
  cursor: pointer; font-size: 14px; font-weight: 600;
  text-align: center; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-primary { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: #475569; border: 1.5px solid #e2e8f0; }
.btn-secondary:hover { background: #e2e8f0; }
</style>