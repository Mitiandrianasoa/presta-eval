<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>Choisissez un compte</h1>
        <p>Sélectionnez un utilisateur pour accéder à l'application</p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="search-wrap">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher par nom ou email..."
          class="search-input"
        />
      </div>

      <div v-if="loading" class="status-msg">
        <span class="spinner"></span> Chargement des utilisateurs...
      </div>

      <div v-else class="user-list">
        <div class="count">{{ filteredUsers.length }} utilisateur(s) actif(s)</div>

        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-card"
          :class="{ selected: selected?.id === user.id }"
          @click="selectUser(user)"
        >
          <div class="avatar avatar-blue">
            {{ initials(user.firstname, user.lastname) }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.firstname }} {{ user.lastname }}</div>
            <div class="user-email">{{ user.email }}</div>
          </div>
          <span class="badge badge-blue">Client</span>
          <svg v-if="selected?.id === user.id" class="check-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <div v-if="filteredUsers.length === 0 && !loading" class="status-msg">
          Aucun résultat
        </div>

        <div class="divider">
          <hr /><span>ou</span><hr />
        </div>

        <div
          class="user-card anon-card"
          :class="{ selected: selected?.id === 'anon' }"
          @click="selectAnon"
        >
          <div class="avatar avatar-anon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="17"/><line x1="17" y1="11" x2="23" y2="17"/></svg>
          </div>
          <div class="user-info">
            <div class="user-name">Utilisateur anonyme</div>
            <div class="user-email">Navigation sans compte</div>
          </div>
          <span class="badge badge-anon">Anonyme</span>
          <svg v-if="selected?.id === 'anon'" class="check-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>

      <button
        class="login-btn"
        :disabled="!selected || connecting"
        @click="handleLogin"
      >
        <span v-if="connecting"><span class="spinner spinner-white"></span> Connexion...</span>
        <span v-else-if="selected?.id === 'anon'">Continuer en anonyme</span>
        <span v-else-if="selected">Se connecter en tant que {{ selected.firstname }}</span>
        <span v-else>Sélectionnez un compte</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/api';

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
const connecting = ref(false);
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
  // Redirige si déjà connecté
  const token = localStorage.getItem('prestashop_token');
  const user = localStorage.getItem('prestashop_user');
  if (token && user) {
    router.push('/');
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

const handleLogin = () => {
  if (!selected.value) return;
  connecting.value = true;

  const token = btoa(
    JSON.stringify({ user: selected.value, exp: Date.now() + 24 * 60 * 60 * 1000 })
  );

  localStorage.setItem('prestashop_token', token);
  localStorage.setItem('prestashop_user', JSON.stringify(selected.value));

  setTimeout(() => {
    router.push('/');
  }, 400);
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
  max-width: 480px;
  padding: 2.5rem;
}

.login-header {
  text-align: center;
  margin-bottom: 1.75rem;
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
  font-size: 0.875rem;
  margin: 0;
}

/* Search */
.search-wrap {
  position: relative;
  margin-bottom: 0.75rem;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.65rem 0.875rem 0.65rem 2.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: var(--surface);
}

.search-input::placeholder {
  color: #94a3b8;
}

/* Count */
.count {
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

/* User list */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 2px;
}

/* User card */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.user-card:hover {
  border-color: var(--primary);
  background: var(--surface);
}

.user-card.selected {
  border-color: var(--primary);
  background: var(--surface);
}

/* Avatar */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar-blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.avatar-anon {
  background: var(--surface);
  color: var(--muted);
  border: 1px dashed var(--border);
}

/* Info */
.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Badge */
.badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
  font-weight: 500;
}

.badge-blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-anon {
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--border);
}

.check-icon {
  color: var(--primary);
  flex-shrink: 0;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.divider hr {
  flex: 1;
  border: none;
  border-top: 1px solid var(--border);
}

.divider span {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
}

/* Status */
.status-msg {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
  font-size: 0.875rem;
}

/* Error */
.error-message {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid #fecaca;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

/* Login button */
.login-btn {
  width: 100%;
  margin-top: 1.25rem;
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
}

.login-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.login-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Spinner */
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