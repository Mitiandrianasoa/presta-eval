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
import api from '../../api/api';

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

    localStorage.setItem('prestashop_token', token);
    localStorage.setItem('prestashop_user', JSON.stringify(newCustomer));

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
.register-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.register-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 460px;
  padding: 2.5rem;
}

.register-form {
  display: flex;
  flex-direction: column;
}

.register-header {
  text-align: center;
  margin-bottom: 2rem;
}

.register-header h1 {
  color: var(--navy);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.register-header p {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.form-input {
  padding: 0.7rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.form-input::placeholder { color: #94a3b8; }

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
  background: var(--surface);
}

.error-message {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid #fecaca;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: center;
}

.success-message {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid #bbf7d0;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: center;
}

.register-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
  font-family: inherit;
  margin-top: 0.25rem;
}

.register-btn:hover:not(:disabled) { background: var(--primary-dark); }
.register-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.register-footer {
  text-align: center;
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.register-footer p {
  color: var(--muted);
  margin: 0 0 0.4rem;
  font-size: 0.875rem;
}

.login-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}

.login-link:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .register-container { padding: 1.75rem 1.5rem; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
