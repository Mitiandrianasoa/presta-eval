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
import api from '../../api/api';

const router = useRouter();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');

// Vérifier si l'utilisateur est déjà connecté
onMounted(() => {
  const token = localStorage.getItem('prestashop_token');
  const user = localStorage.getItem('prestashop_user');
  
  if (token && user) {
    router.push('/');
  }
});

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    // Pour le frontoffice, on utilise une authentification simplifiée
    // On simule la connexion avec des identifiants de test
    if (email.value === 'client@prestashop.com' && password.value === 'client123') {
      const user = {
        id: '1',
        email: 'client@prestashop.com',
        firstname: 'Client',
        lastname: 'Test',
        phone: '+261 00 000 000'
      };

      // Simuler un token JWT
      const token = btoa(JSON.stringify({ 
        user, 
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
      }));

      // Sauvegarder la session
      localStorage.setItem('prestashop_token', token);
      localStorage.setItem('prestashop_user', JSON.stringify(user));

      if (rememberMe.value) {
        localStorage.setItem('prestashop_remember', 'true');
      }

      // Rediriger vers la page d'accueil
      router.push('/');
      return;
    }

    // Essayer de se connecter via l'API PrestaShop (customers)
    const response = await api.get(`/customers?output_format=XML&display=full&filter[email]=[${email.value}]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const customers = xmlDoc.querySelectorAll('customer');

    if (customers.length === 0) {
      error.value = 'Email non trouvé';
      return;
    }

    const customerEl = customers[0];
    if (!customerEl) {
      error.value = 'Client introuvable';
      return;
    }

    const customer = {
      id: customerEl.querySelector('id')?.textContent?.trim() || '',
      email: customerEl.querySelector('email')?.textContent?.trim() || '',
      firstname: customerEl.querySelector('firstname')?.textContent?.trim() || '',
      lastname: customerEl.querySelector('lastname')?.textContent?.trim() || '',
      phone: customerEl.querySelector('phone')?.textContent?.trim() || '',
      active: customerEl.querySelector('active')?.textContent?.trim() || '0',
    };

    if (customer.active !== '1') {
      error.value = 'Compte désactivé';
      return;
    }

    // Pour la démo, on accepte un mot de passe fixe
    if (password.value === 'prestashop123') {
      const token = btoa(JSON.stringify({ 
        customer, 
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
      }));

      localStorage.setItem('prestashop_token', token);
      localStorage.setItem('prestashop_user', JSON.stringify(customer));

      if (rememberMe.value) {
        localStorage.setItem('prestashop_remember', 'true');
      }

      router.push('/');
    } else {
      error.value = 'Mot de passe incorrect. Utilisez "prestashop123" pour tester';
    }

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
