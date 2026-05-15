J-1 

NEW APP
- BACK OFFICE
    - login[Tsanta][ok]:
        - API:
            - status
            - role ? 
        - affichage
        - gestion de role utilisateur 
        
    - configuration reset data[Tsanta][ok]:
        - update affichage:
            - button tout effacer/ tout selectionner 

    - import[Mitia]:
        - input 3 csv 
            - format 
            - function
            - affichage
        - input zip img
            - format 
            - function
            - affichage
        - API 
            - status
            - fonction
            - affichage
    - liste commandes[Mitia]:
        - details:
            - modifier etat
            - etat payement: [echec, effectue, anule]
        
- FRONT OFFICE
    - page accueil[Tsanta]:[ok]
        - list produits
        - fiche details produit
    - gestion panier[Mitia]:
        - API
        - module:
            - livraison
            - payement
            - commande
    - list  de mes commandes[Mitia]: 
        - etat

J-2 


NEW APP
- BACK OFFICE[Mitia]
    AFFICHAGE
        - liste:
            - panier
            - commandes 
                - filtre commande annuler
            - paiement effectue
    FUNCTION
        - service Service
            - getAllCarts
            - getAllPayment
            - getOrdersCanceled
    INTEGRATION
        - script API
    - Tableau de board:
        - Par Jour:
            - nb commande
            - montant
        - General
        
- FRONT OFFICE[Tsanta]
    - page accueil[Tsanta]:
        - liste customer:
            - choix utilisateur
            - anonyme
    - list produits avec  date_availability_produit
        - etiquette:
            - HOT : pour les produits sorties 1j avant  
            - NEW : pour les produits sorties 1 semaines avant
    - Recherche Multicritere par produit:
        - nom  
        - catégorie 
        - intervalle de prix



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
import FrontHeader from '../../components/FrontHeader.vue';

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
  const token = localStorage.getItem('prestashop_token');
  const user  = localStorage.getItem('prestashop_user');
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
  localStorage.setItem('prestashop_token', token);
  localStorage.setItem('prestashop_user', JSON.stringify(preselectedUser.value));

  // Nettoyer la pré-sélection
  sessionStorage.removeItem('prestashop_preselected_user');

  setTimeout(() => {
    router.push('/home');
  }, 400);
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

.login-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

/* ── Card ─────────────────────────────────────────────── */
.login-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}

/* ── Header ───────────────────────────────────────────── */
.login-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.875rem;
}

.login-header h1 {
  color: var(--navy);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.4rem;
}

.login-header p {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.login-header p strong { color: var(--text); }

/* ── Form ─────────────────────────────────────────────── */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 0.4rem;
  letter-spacing: 0.01em;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: var(--surface);
}

.form-input[readonly] {
  background: var(--surface);
  color: var(--muted);
  cursor: default;
}

.form-input::placeholder { color: #94a3b8; }

/* ── Change user link ─────────────────────────────────── */
.change-user-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--primary);
  text-decoration: none;
  margin-top: 0.4rem;
  transition: opacity 0.15s;
}

.change-user-link:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* ── Password toggle ──────────────────────────────────── */
.password-wrap {
  position: relative;
}

.password-wrap .form-input {
  padding-right: 2.5rem;
}

.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.toggle-password:hover { color: var(--text); }

/* ── Login button ─────────────────────────────────────── */
.login-btn {
  width: 100%;
  margin-top: 0.5rem;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.login-btn:hover:not(:disabled) { background: var(--primary-dark); }

.login-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Register link ────────────────────────────────────── */
.register-link {
  text-align: center;
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 1.25rem;
  margin-bottom: 0;
}

.register-link a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover { text-decoration: underline; }

/* ── Spinner ──────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #cbd5e1;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: -2px;
  margin-right: 6px;
}

.spinner-white {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-container { padding: 1.75rem 1.25rem; }
}
</style>







userpickerview
