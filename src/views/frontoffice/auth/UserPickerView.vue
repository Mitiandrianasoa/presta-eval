<template>
  <div class="picker-page">
    <div class="picker-card">

      <!-- Logo / titre -->
      <div class="picker-header">
        <div class="logo-mark">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h1>Bienvenue</h1>
        <p>Sélectionnez votre compte pour continuer</p>
      </div>

      <!-- Erreur -->
      <div v-if="error" class="alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ error }}
      </div>

      <!-- Barre de recherche -->
      <div class="search-wrap">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher un utilisateur..."
          class="search-input"
        />
      </div>

      <!-- Chargement -->
      <div v-if="loading" class="status-msg">
        <span class="spinner"></span> Chargement des utilisateurs…
      </div>

      <!-- Liste -->
      <div v-else class="user-list">
        <div class="list-count">{{ filteredUsers.length }} compte(s) disponible(s)</div>

        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-card"
          :class="{ selected: selected?.id === user.id }"
          @click="selectUser(user)"
        >
          <div class="avatar avatar-user">
            {{ initials(user.firstname, user.lastname) }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.firstname }} {{ user.lastname }}</div>
            <div class="user-email">{{ user.email }}</div>
          </div>
          <span class="badge badge-client">Client</span>
          <svg v-if="selected?.id === user.id" class="check-icon"
            xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div v-if="filteredUsers.length === 0" class="status-msg">Aucun résultat</div>

        <!-- Séparateur -->
        <div class="divider"><span></span><em>ou</em><span></span></div>

        <!-- Anonyme -->
        <div
          class="user-card anon-card"
          :class="{ selected: selected?.id === 'anon' }"
          @click="selectAnon"
        >
          <div class="avatar avatar-anon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="23" y1="11" x2="17" y2="17"/>
              <line x1="17" y1="11" x2="23" y2="17"/>
            </svg>
          </div>
          <div class="user-info">
            <div class="user-name">Utilisateur anonyme</div>
            <div class="user-email">Navigation sans compte</div>
          </div>
          <span class="badge badge-anon">Anonyme</span>
          <svg v-if="selected?.id === 'anon'" class="check-icon"
            xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>

      <!-- Bouton continuer -->
      <button
        class="continue-btn"
        :disabled="!selected"
        @click="handleContinue"
      >
        <span v-if="selected?.id === 'anon'">Continuer en anonyme</span>
        <span v-else-if="selected">Continuer en tant que {{ selected.firstname }}</span>
        <span v-else>Sélectionnez un compte</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
        </svg>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../../api/api';

const router = useRouter();

interface Customer {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  active: string;
}

const allUsers = ref<Customer[]>([]);
const selected = ref<Customer | null>(null);
const search = ref('');
const loading = ref(true);
const error = ref('');

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return allUsers.value;
  return allUsers.value.filter(u =>
    `${u.firstname} ${u.lastname}`.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  );
});

const initials = (firstname: string, lastname: string) =>
  ((firstname?.[0] || '?') + (lastname?.[0] || '?')).toUpperCase();

onMounted(async () => {
  // Si déjà complètement logué, aller directement à /home
  const token = sessionStorage.getItem('prestashop_token');
  const user = sessionStorage.getItem('prestashop_user');
  if (token && user) {
    router.push('/home');
    return;
  }
  await loadUsers();
});

const loadUsers = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get(
      '/customers?output_format=JSON&display=[id,email,firstname,lastname,active]'
    );
    const customers: Customer[] = response.data?.customers || [];
    allUsers.value = customers.filter(c => c.active === '1' || (c.active as any) === 1);
  } catch (err: any) {
    error.value = `Impossible de charger les utilisateurs : ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const selectUser = (user: Customer) => {
  selected.value = user;
};

const selectAnon = () => {
  selected.value = {
    id: 'anon',
    email: '',
    firstname: 'Anonyme',
    lastname: '',
    active: '1',
  };
};

const handleContinue = () => {
  if (!selected.value) return;

  // if (selected.value.id === 'anon') {
  //   // Utilisateur anonyme : stocker en sessionStorage et aller sur /home
  //   sessionStorage.setItem('prestashop_preselected_user', JSON.stringify(selected.value));
  //   router.push('/home');
  // } else {
    // Utilisateur réel : stocker la pré-sélection (email) pour pré-remplir LoginView
    sessionStorage.setItem('prestashop_preselected_user', JSON.stringify(selected.value));
    router.push('/login');
  // }
};
</script>

<style scoped>

.user-picker-page { background: #07070e; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; color: #e8e8f5; }
.picker-card { background: #0e0e1a; border: 1px solid #1e1e35; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 480px; }
.picker-header { text-align: center; margin-bottom: 2rem; }
.picker-header h2 { font-size: 1.25rem; font-weight: 700; color: #e8e8f5; margin: 0 0 0.35rem; }
.picker-header p { color: #5a5a85; font-size: 0.875rem; margin: 0; }
.search-bar { margin-bottom: 1.25rem; position: relative; }
.search-input {
  width: 100%; padding: 0.65rem 0.875rem 0.65rem 2.5rem;
  background: #07070e; border: 1px solid #1e1e35;
  border-radius: 8px; color: #e8e8f5; font-size: 0.875rem;
  transition: border-color 0.2s; box-sizing: border-box;
}
.search-input:focus { outline: none; border-color: #a78bfa; }
.search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #5a5a85; font-size: 0.9rem; pointer-events: none; }
.users-list { max-height: 380px; overflow-y: auto; }
.user-item {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid #1e1e35;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: border-color 0.2s, background 0.2s;
}
.user-item:hover { border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.04); }
.user-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(167,139,250,0.15); color: #a78bfa; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
.user-name { font-size: 0.9rem; font-weight: 600; color: #e8e8f5; }
.user-email { font-size: 0.75rem; color: #5a5a85; }
.user-arrow { margin-left: auto; color: #2a2a4a; font-size: 0.875rem; }
.loading-state, .empty-state { text-align: center; padding: 2rem; color: #5a5a85; font-size: 0.875rem; }
.spinner { width: 28px; height: 28px; border: 2px solid #1e1e35; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 0.75rem; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>