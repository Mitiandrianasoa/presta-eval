<!-- components/Sidebar.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useResetStore } from '../stores/reset/resetStore';

const resetStore = useResetStore();

const emit = defineEmits(['select-category', 'show-categories', 'show-products', 'show-stock']);

const showConfirm = ref(false);
const showConfig = ref(false);

async function confirmReset() {
  showConfirm.value = false;
  try {
    await resetStore.resetAll();
    emit('show-products');
  } catch (e) {
    console.error('Erreur lors de la réinitialisation', e);
  }
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <!-- Logo / titre -->
      <div class="sidebar-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        <h3>Catalogue</h3>
      </div>
    </div>

    <div class="sidebar-menu">
      <!-- Tous les produits -->
      <button @click="$emit('show-products')" class="menu-item main-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <span>Produits</span>
      </button>

      <!-- Gérer les catégories -->
      <button @click="$emit('show-categories')" class="menu-item main-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Catégories</span>
      </button>

      <!-- Gérer le stock -->
      <button @click="$emit('show-stock')" class="menu-item main-item stock-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <path d="M12 3v18"/>
          <line x1="8" y1="11" x2="16" y2="11"/>
          <line x1="8" y1="15" x2="16" y2="15"/>
          <line x1="8" y1="7" x2="8" y2="7.01"/>
          <line x1="16" y1="7" x2="16" y2="7.01"/>
        </svg>
        <span>Stock</span>
      </button>
    </div>

    <div class="divider"></div>

    <!-- Menu Configuration -->
    <div class="sidebar-section">
      <button class="menu-item section-toggle" @click="showConfig = !showConfig">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <span>Configuration</span>
        <svg class="chevron" :class="{ rotated: showConfig }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <!-- Sous-menu Configuration -->
      <div class="submenu" :class="{ open: showConfig }">
        <button
          class="menu-item submenu-item reset-btn"
          :disabled="resetStore.loading"
          @click="showConfirm = true"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          <span v-if="resetStore.loading">
            {{ resetStore.step }} ({{ resetStore.progress }}/{{ resetStore.total }})
          </span>
          <span v-else>Réinitialiser les données</span>
        </button>
      </div>
    </div>

    <!-- Modal de confirmation -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3>Réinitialiser les données ?</h3>
          <p>
            Cette action va supprimer <strong>tous les produits</strong> et
            <strong>toutes les catégories</strong> via l'API PrestaShop.
            <br>Cette opération est <strong>irréversible</strong>.
          </p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showConfirm = false">Annuler</button>
            <button class="btn-confirm" @click="confirmReset">Oui, réinitialiser</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Overlay de progression -->
    <Teleport to="body">
      <div v-if="resetStore.loading" class="progress-overlay">
        <div class="progress-box">
          <div class="spinner"></div>
          <p class="progress-step">{{ resetStore.step }}</p>
          <div class="progress-bar-wrap">
            <div
              class="progress-bar-fill"
              :style="{ width: resetStore.total > 0 ? (resetStore.progress / resetStore.total * 100) + '%' : '0%' }"
            ></div>
          </div>
          <p class="progress-count">{{ resetStore.progress }} / {{ resetStore.total }}</p>
        </div>
      </div>
    </Teleport>
    </div>
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: #2c3e50;
  color: #ecf0f1;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* Header */
.sidebar-header {
  padding: 22px 20px 18px;
  border-bottom: 1px solid #34495e;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.sidebar-logo svg {
  opacity: 0.85;
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.3px;
}

/* Menu principal */
.sidebar-menu {
  padding: 12px 12px 0;
  flex: 1;
}

.sidebar-section {
  padding: 0 12px 12px;
}

.icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  opacity: 0.8;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 13px;
  margin-bottom: 4px;
  background: transparent;
  border: none;
  color: #bdc3c7;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s, transform 0.15s;
  font-size: 13.5px;
}

.menu-item:hover {
  background: #34495e;
  color: #ecf0f1;
  transform: translateX(4px);
}

.menu-item span {
  flex: 1;
}

.main-item {
  font-weight: 500;
}

/* Style spécifique pour l'élément Stock */
.stock-item {
  position: relative;
}

.badge {
  display: inline-block;
  background: #e67e22;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 5px;
  flex: none;
}

/* Section toggle (Configuration) */
.section-toggle {
  color: #95a5a6;
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 8px 13px;
  margin-bottom: 0;
}

.section-toggle:hover {
  color: #bdc3c7;
  background: rgba(255,255,255,0.04);
  transform: none;
}

.chevron {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  transition: transform 0.25s ease;
  opacity: 0.6;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Sous-menu */
.submenu {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.28s ease;
}

.submenu.open {
  max-height: 200px;
}

.submenu-item {
  padding-left: 24px;
  font-size: 13px;
}

/* Bouton reset */
.reset-btn {
  color: #e87b6e;
}

.reset-btn .icon {
  stroke: #e87b6e;
  opacity: 1;
}

.reset-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.12);
  color: #ff8a7f;
  transform: translateX(4px);
}

.reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.divider {
  height: 1px;
  background: #34495e;
  margin: 6px 16px 10px;
}
</style>

<style>
/* Styles globaux pour modal et progress (non scoped car via Teleport) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: #fef2f2;
  border-radius: 50%;
  margin: 0 auto 16px;
}

.modal h3 {
  margin: 0 0 12px;
  font-size: 20px;
  color: #2c3e50;
}

.modal p {
  color: #555;
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel {
  padding: 10px 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  padding: 10px 24px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.btn-confirm:hover {
  background: #c0392b;
}

/* Progress overlay */
.progress-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.progress-box {
  background: white;
  border-radius: 12px;
  padding: 36px;
  min-width: 320px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid #f0f0f0;
  border-top-color: #e74c3c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-step {
  font-size: 15px;
  color: #2c3e50;
  margin-bottom: 16px;
  font-weight: 500;
}

.progress-bar-wrap {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar-fill {
  height: 100%;
  background: #e74c3c;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 13px;
  color: #999;
  margin: 0;
}
</style>