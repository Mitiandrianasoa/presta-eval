<!-- components/Sidebar.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const showConfig = ref(false);

const goToDashboard = () => router.push('/admin/dashboard');
const goToStock     = () => router.push('/admin?view=stock');
const goToOrders    = () => router.push('/admin/orders');
const goToPayments  = () => router.push('/admin/payments');
const goToImport    = () => router.push('/import');
const goToConfig    = () => router.push('/admin/config');
</script>

<template>
  <aside class="sidebar">

    <!-- Branding -->
    <div class="sidebar-brand">
      <div class="brand-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <span class="brand-name">Admin</span>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">

      <button @click="goToDashboard" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
        <span>Tableau de bord</span>
      </button>

      <button @click="goToOrders" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <span>Commandes</span>
      </button>

      <button @click="goToPayments" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="1" y="4" width="22" height="16" rx="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        <span>Paiements</span>
      </button>

      <button @click="goToStock" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <span>Stock</span>
      </button>

      <button @click="goToImport" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Import données</span>
      </button>

    </nav>

    <!-- Séparateur -->
    <div class="nav-divider"></div>

    <!-- Configuration -->
    <div class="sidebar-footer">
      <button class="nav-item nav-toggle" @click="showConfig = !showConfig">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <span>Configuration</span>
        <svg class="chevron" :class="{ open: showConfig }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div class="subnav" :class="{ visible: showConfig }">
        <button class="nav-item nav-sub" @click="goToConfig">
          <span class="sub-dot"></span>
          <span>Réinitialisation</span>
        </button>
      </div>
    </div>

  </aside>
</template>

<style scoped>
/* ── Variables ── */
:root {
  --sb-bg:      #0d0d14;
  --sb-surface: #13131f;
  --sb-border:  rgba(255,255,255,0.06);
  --sb-accent:  #f97316;
  --sb-text:    #a0a0b8;
  --sb-hover:   rgba(249,115,22,0.10);
  --sb-width:   240px;
}

.sidebar {
  width: 240px;
  background: #13131f;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.08);
  overflow-y: auto;
  z-index: 1000;
}

/* ── Branding ── */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 8px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(249,115,22,0.35);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #f1f1f8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ── Navigation ── */
.sidebar-nav {
  flex: 1;
  padding: 4px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 2px;
  background: transparent;
  border: none;
  color: #a0a0b8;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.18s, color 0.18s;
  font-family: inherit;
}

.nav-item:hover {
  background: rgba(249,115,22,0.10);
  color: #f97316;
}

.nav-item:hover .nav-icon {
  stroke: #f97316;
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: #a0a0b8;
  transition: stroke 0.18s;
}

.nav-item span {
  flex: 1;
}

/* ── Divider ── */
.nav-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 8px 16px;
}

/* ── Footer / Config ── */
.sidebar-footer {
  padding: 4px 12px 20px;
}

.nav-toggle {
  color: #70708a;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.nav-toggle:hover {
  background: rgba(255,255,255,0.04);
  color: #a0a0b8;
}

.nav-toggle:hover .nav-icon {
  stroke: #a0a0b8;
}

.chevron {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: #50506a;
  transition: transform 0.22s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

/* ── Sous-menu ── */
.subnav {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.25s ease;
}

.subnav.visible {
  max-height: 120px;
}

.nav-sub {
  padding-left: 20px;
  font-size: 13px;
  color: #70708a;
}

.nav-sub:hover {
  color: #f97316;
  background: rgba(249,115,22,0.08);
}

.sub-dot {
  width: 5px;
  height: 5px;
  background: #50506a;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.18s;
}

.nav-sub:hover .sub-dot {
  background: #f97316;
}
</style>

<style>
/* ── Globals (modals, progress) ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  backdrop-filter: blur(4px);
}

.modal {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  padding: 36px;
  max-width: 440px;
  width: 90%;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  color: #e2e2f0;
}

.modal-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(249,115,22,0.12);
  border-radius: 50%;
  margin: 0 auto 18px;
  border: 1px solid rgba(249,115,22,0.25);
}

.modal h3 {
  margin: 0 0 10px;
  font-size: 19px;
  color: #f1f1f8;
}

.modal p {
  color: #a0a0b8;
  line-height: 1.65;
  margin-bottom: 24px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel {
  padding: 10px 24px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #a0a0b8;
  transition: background 0.15s;
  font-family: inherit;
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.10);
}

.btn-confirm {
  padding: 10px 24px;
  border: none;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.15s;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(249,115,22,0.35);
}

.btn-confirm:hover {
  opacity: 0.88;
}

/* Progress overlay */
.progress-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(6px);
}

.progress-box {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  padding: 40px;
  min-width: 340px;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-step {
  font-size: 15px;
  color: #e2e2f0;
  margin-bottom: 18px;
  font-weight: 500;
}

.progress-bar-wrap {
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316, #fbbf24);
  border-radius: 99px;
  transition: width 0.3s ease;
}

.progress-count {
  font-size: 13px;
  color: #70708a;
  margin: 0;
}
</style>
