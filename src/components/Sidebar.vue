<!-- components/Sidebar.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const showConfig = ref(false);

const goToDashboard = () => {
  router.push('/admin/dashboard');
};

const goToProducts = () => {
  router.push('/admin?view=products');
};

const goToCategories = () => {
  router.push('/admin?view=categories');
};

const goToStock = () => {
  router.push('/admin?view=stock');
};

const goToCustomers = () => {
  router.push('/admin?view=customers');
};

const goToCarts = () => {
  router.push('/admin/cart');
};

const goToOrders = () => {
  router.push('/admin/orders');
};

const goToPayments = () => {
  router.push('/admin/payments');
};

const goToImport = () => {
  router.push('/import');
};

const goToConfig = () => {
  router.push('/admin/config');
};
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

      <!-- Dashboard -->

      <button @click="goToDashboard" class="menu-item main-item dashboard-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/>
          <rect x="3" y="16" width="7" height="5" rx="1"/>
        </svg>
        <span>Dashboard</span>
      </button>


      <!-- Tous les produits -->
      <button @click="goToProducts" class="menu-item main-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <span>Produits</span>
      </button>

      <!-- Gérer les catégories -->
      <button @click="goToCategories" class="menu-item main-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Catégories</span>
      </button>

      <!-- Gérer le stock -->
      <button @click="goToStock" class="menu-item main-item stock-item">
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

      <!-- Gérer les clients -->
      <button @click="goToCustomers" class="menu-item main-item customer-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Clients</span>
      </button>
      <!-- ✅ SECTION PANIER (NOUVELLE) -->
      <button @click="goToCarts" class="menu-item main-item cart-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <span>Paniers</span>
      </button>

      <!-- payment -->
      <button @click="goToPayments" class="menu-item main-item payment-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <!-- Icône de paiement/carte bancaire -->
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
          <line x1="7" y1="15" x2="7" y2="15.01"/>
          <line x1="11" y1="15" x2="13" y2="15"/>
        </svg>
        <span>Payments</span>
      </button>

      <!-- Liste des commandes -->
      <button @click="goToOrders" class="menu-item main-item orders-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11H3v2h6v-2zm0-4H3v2h6V7zm6 0v2h6V7h-6zm0 4v2h6v-2h-6z"/>
          <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
        <span>Commandes</span>
      </button>

      <!-- Menu Import -->
      <button @click="goToImport" class="menu-item main-item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Import</span>
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
          class="menu-item submenu-item config-btn"
          @click="goToConfig"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span>Configuration avancée</span>
        </button>
      </div>
    </div>

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

.badge {
  display: inline-block;
  background: #3498db;
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

/* Style spécifique pour l'élément Stock */
.stock-item {
  position: relative;
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

/* Bouton config */
.config-btn {
  color: #3498db;
}

.config-btn .icon {
  stroke: #3498db;
  opacity: 1;
}

.config-btn:hover {
  background: rgba(52, 152, 219, 0.12);
  color: #2980b9;
  transform: translateX(4px);
}

/* Bouton clients */
.customer-item {
  color: #ecf0f1;
}

.customer-item .icon {
  stroke: #ecf0f1;
  opacity: 1;
}

.customer-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateX(4px);
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