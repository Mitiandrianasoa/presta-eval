<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-form">
        <div class="login-header">
          <h1>Connexion</h1>
          <p>Accédez à votre compte</p>
        </div>

        <form @submit.prevent="handleLogin" class="form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
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
              v-model="password"
              type="password"
              placeholder="Votre mot de passe"
              required
              class="form-input"
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading">Connexion...</span>
            <span v-else>Se connecter</span>
          </button>
        </form>

        <div class="login-footer">
          <p>Pas encore de compte ?</p>
          <router-link to="/register" class="register-link">
            S'inscrire
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';

const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// Vérifier si l'utilisateur est déjà connecté
onMounted(() => {
  if (sessionStorage.getItem('prestashop_token') && sessionStorage.getItem('prestashop_user')) {
    router.push('/admin/dashboard');
  }
});

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    // 1. Chercher le customer par email dans PrestaShop
    const response = await api.get(
      `/customers?output_format=XML&display=full&filter[email]=[${email.value}]`
    );
    const parser = new DOMParser();
    const xmlDoc  = parser.parseFromString(response.data, 'text/xml');
    const customerEl = xmlDoc.querySelector('customer');

    if (!customerEl) {
      error.value = 'Email non trouvé';
      return;
    }

    // 2. Vérifier que le compte est actif
    const active = customerEl.querySelector('active')?.textContent?.trim();
    if (active !== '1') {
      error.value = 'Compte désactivé';
      return;
    }

    // 3. Récupérer le secure_key PrestaShop — c'est le vrai token du customer
    const secureKey = customerEl.querySelector('secure_key')?.textContent?.trim() || '';
    if (!secureKey) {
      error.value = 'Impossible de récupérer le token PrestaShop';
      return;
    }

    // 4. Construire l'objet utilisateur
    const user = {
      id:        customerEl.querySelector('id')?.textContent?.trim()        || '',
      email:     customerEl.querySelector('email')?.textContent?.trim()     || '',
      firstname: customerEl.querySelector('firstname')?.textContent?.trim() || '',
      lastname:  customerEl.querySelector('lastname')?.textContent?.trim()  || '',
      phone:     customerEl.querySelector('phone')?.textContent?.trim()     || '',
    };

    // 5. Stocker le secure_key comme token de session + données utilisateur
    sessionStorage.setItem('prestashop_token', secureKey);
    sessionStorage.setItem('prestashop_user', JSON.stringify(user));

    router.push('/admin/dashboard');

  } catch (err: any) {
    error.value = `Erreur: ${err.message}`;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.login-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  color: var(--navy);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.login-header p {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.login-btn {
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

.login-btn:hover:not(:disabled) { background: var(--primary-dark); }

.login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.login-footer {
  text-align: center;
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.login-footer p {
  color: var(--muted);
  margin: 0 0 0.4rem;
  font-size: 0.875rem;
}

.register-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}

.register-link:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .login-container { padding: 1.75rem 1.5rem; }
}
</style>
