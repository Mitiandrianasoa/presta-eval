<template>
  <div class="login-page">
    <FrontHeader />

    <div class="login-wrap">
      <div class="login-container">

        <!-- Header -->
        <div class="login-header">
          <div class="user-avatar" v-if="preselectedUser && preselectedUser.id !== 'anon'">
            {{ initials(preselectedUser.firstname, preselectedUser.lastname) }}
          </div>
          <h1>Connexion</h1>
          <p v-if="preselectedUser && preselectedUser.id !== 'anon'">
            Entrez votre mot de passe pour continuer en tant que
            <strong>{{ preselectedUser.firstname }} {{ preselectedUser.lastname }}</strong>
          </p>
          <p v-else>Connectez-vous à votre compte</p>
        </div>

        <!-- Formulaire -->
        <div class="form-group">
          <label for="email">Adresse e-mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="exemple@email.com"
            class="form-input"
            :readonly="!!preselectedUser && preselectedUser.id !== 'anon'"
            autocomplete="email"
          />
          <router-link to="/" class="change-user-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Changer d'utilisateur
          </router-link>
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <div class="password-wrap">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              class="form-input"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
            <button class="toggle-password" type="button" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Bouton connexion -->
        <button
          class="login-btn"
          :disabled="!email || !password || connecting"
          @click="handleLogin"
        >
          <span v-if="connecting">
            <span class="spinner spinner-white"></span> Connexion…
          </span>
          <span v-else>Se connecter</span>
        </button>

        <!-- Lien register -->
        <p class="register-link">
          Pas encore de compte ?
          <router-link to="/register">Créer un compte</router-link>
        </p>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import FrontHeader from '../../../components/FrontHeader.vue';

const router = useRouter();

interface Customer {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  active: string;
}

const email        = ref('');
const password     = ref('');
const showPassword = ref(false);
const connecting   = ref(false);
const preselectedUser = ref<Customer | null>(null);

const initials = (firstname: string, lastname: string) =>
  ((firstname?.[0] || '?') + (lastname?.[0] || '?')).toUpperCase();

onMounted(() => {
  // Déjà connecté → aller à /home
  const token = sessionStorage.getItem('prestashop_token');
  const user  = sessionStorage.getItem('prestashop_user');
  if (token && user) {
    router.push('/home');
    return;
  }

  // Récupérer l'utilisateur pré-sélectionné depuis UserPickerView
  const raw = sessionStorage.getItem('prestashop_preselected_user');
  if (raw) {
    try {
      const parsed: Customer = JSON.parse(raw);
      preselectedUser.value = parsed;
      if (parsed.id !== 'anon') {
        email.value = parsed.email;
      }
    } catch {
      // JSON invalide, on ignore
    }
  }

  // Rien en sessionStorage → retour à la sélection
  if (!preselectedUser.value) {
    router.push('/');
  }
});

const handleLogin = () => {
  if (!email.value || !password.value || !preselectedUser.value) return;
  connecting.value = true;

  // On connecte directement avec l'utilisateur pré-sélectionné
  // sans vérifier le mot de passe
  const token = btoa(
    JSON.stringify({ user: preselectedUser.value, exp: Date.now() + 24 * 60 * 60 * 1000 })
  );
  sessionStorage.setItem('prestashop_token', token);
  sessionStorage.setItem('prestashop_user', JSON.stringify(preselectedUser.value));

  // Nettoyer la pré-sélection
  sessionStorage.removeItem('prestashop_preselected_user');

  setTimeout(() => {
    router.push('/home');
  }, 400);
};
</script>

<style scoped>

.login-page { background: #07070e; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; color: #e8e8f5; }
.login-card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; }
.brand { text-align: center; margin-bottom: 2rem; }
.brand-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem; }
.brand h2 { font-size: 1.25rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.25rem; }
.brand p { font-size: 0.875rem; color: #5a5a85; margin: 0; }
.form-group { margin-bottom: 1.1rem; }
.form-group label { display: block; font-size: 0.8rem; color: #8080b0; font-weight: 500; margin-bottom: 0.4rem; }
.form-input {
  width: 100%; padding: 0.7rem 0.875rem;
  background: #07070e; border: 1px solid #1e1e35;
  border-radius: 8px; color: #e8e8f5; font-size: 0.9rem;
  transition: border-color 0.2s; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #a78bfa; }
.form-input::placeholder { color: #2a2a4a; }
.error-msg { color: #f87171; font-size: 0.8rem; margin-top: 0.35rem; }
.submit-btn {
  width: 100%; padding: 0.85rem;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border: none; border-radius: 8px;
  color: white; font-weight: 700; font-size: 0.95rem;
  cursor: pointer; transition: opacity 0.2s; margin-top: 0.5rem;
}
.submit-btn:hover { opacity: 0.88; }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.form-footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #5a5a85; }
.form-footer a { color: #a78bfa; text-decoration: none; }
.form-footer a:hover { text-decoration: underline; }
.alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1.25rem; }
.alert.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #f87171; }
.alert.success { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #34d399; }

</style>