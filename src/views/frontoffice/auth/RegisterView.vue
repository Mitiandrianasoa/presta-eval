<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-form">
        <div class="register-header">
          <h1>Inscription</h1>
          <p>Créez votre compte</p>
        </div>

        <form @submit.prevent="handleRegister" class="form">
          <div class="form-row">
            <div class="form-group">
              <label for="firstname">Prénom</label>
              <input
                id="firstname"
                v-model="form.firstname"
                type="text"
                placeholder="Prénom"
                required
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="lastname">Nom</label>
              <input
                id="lastname"
                v-model="form.lastname"
                type="text"
                placeholder="Nom"
                required
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="votre@email.com"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Mot de passe"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirmer</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              placeholder="Confirmer le mot de passe"
              required
              class="form-input"
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div v-if="success" class="success-message">
            {{ success }}
          </div>

          <button type="submit" class="register-btn" :disabled="loading">
            <span v-if="loading">Création...</span>
            <span v-else>S'inscrire</span>
          </button>
        </form>

        <div class="register-footer">
          <p>Déjà un compte ?</p>
          <router-link to="/login" class="login-link">
            Se connecter
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';

const router = useRouter();

const form = reactive({
  firstname: '',
  lastname: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  newsletter: false
});

const loading = ref(false);
const error = ref('');
const success = ref('');

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  success.value = '';

  // Validation
  if (form.password !== form.confirmPassword) {
    error.value = 'Les mots de passe ne correspondent pas';
    loading.value = false;
    return;
  }

  if (form.password.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères';
    loading.value = false;
    return;
  }

  try {
    // Vérifier si l'email existe déjà
    const checkResponse = await api.get(`/customers?output_format=XML&display=full&filter[email]=[${form.email}]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(checkResponse.data, 'text/xml');
    const existingCustomers = xmlDoc.querySelectorAll('customer');

    if (existingCustomers.length > 0) {
      error.value = 'Un compte avec cet email existe déjà';
      loading.value = false;
      return;
    }

    // Créer le client via l'API PrestaShop
    const customerData = {
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      phone: form.phone || '',
      passwd: form.password, // PrestaShop gérera le hashage
      active: '1',
      id_default_group: '3', // Groupe client par défaut
      id_lang: '1', // Français
      id_shop: '1',
      newsletter: form.newsletter ? '1' : '0',
      optin: '0'
    };

    // Pour la démo, on simule la création
    // En production, vous utiliserez l'API POST /customers
    const newCustomer = {
      id: Date.now().toString(),
      ...customerData,
      date_add: new Date().toISOString(),
      date_upd: new Date().toISOString()
    };

    // Simuler la création réussie
    success.value = 'Compte créé avec succès ! Redirection...';

    // Créer la session automatiquement
    const token = btoa(JSON.stringify({ 
      customer: newCustomer, 
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
    }));

    sessionStorage.setItem('prestashop_token', token);
    sessionStorage.setItem('prestashop_user', JSON.stringify(newCustomer));

    // Rediriger après 2 secondes
    setTimeout(() => {
      router.push('/');
    }, 2000);

  } catch (err: any) {
    error.value = `Erreur lors de la création du compte: ${err.message}`;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>

.register-page { background: #07070e; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; color: #e8e8f5; }
.register-card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 440px; }
.brand { text-align: center; margin-bottom: 2rem; }
.brand-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem; }
.brand h2 { font-size: 1.25rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.25rem; }
.brand p { font-size: 0.875rem; color: #5a5a85; margin: 0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.8rem; color: #8080b0; font-weight: 500; margin-bottom: 0.4rem; }
.form-input {
  width: 100%; padding: 0.65rem 0.875rem;
  background: #07070e; border: 1px solid #1e1e35;
  border-radius: 8px; color: #e8e8f5; font-size: 0.875rem;
  transition: border-color 0.2s; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #a78bfa; }
.form-input::placeholder { color: #2a2a4a; }
.submit-btn {
  width: 100%; padding: 0.85rem;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border: none; border-radius: 8px;
  color: white; font-weight: 700; font-size: 0.95rem;
  cursor: pointer; transition: opacity 0.2s; margin-top: 0.25rem;
}
.submit-btn:hover { opacity: 0.88; }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.form-footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #5a5a85; }
.form-footer a { color: #a78bfa; text-decoration: none; }
.alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1.25rem; }
.alert.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #f87171; }
.alert.success { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #34d399; }
@media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }

</style>