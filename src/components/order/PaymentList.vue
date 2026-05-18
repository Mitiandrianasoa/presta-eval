<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../../components/Sidebar.vue';
import { paymentService, type Payment, type PaymentSummary } from '../../services/paymentService';

// ─── État ──────────────────────────────────────────────────────────────────────

const payments         = ref<Payment[]>([]);
const summary          = ref<PaymentSummary[]>([]);
const loading          = ref(false);
const error            = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const search           = ref('');
const activeMethod     = ref('');   // filtre par méthode

const router = useRouter();

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const [data, sumData] = await Promise.all([
      paymentService.fetchAll(),
      paymentService.getPaymentSummary(),
    ]);
    payments.value = data;
    summary.value  = sumData;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

// ─── Filtres ──────────────────────────────────────────────────────────────────

const filteredPayments = computed(() => {
  let result = payments.value;

  if (activeMethod.value) {
    result = result.filter(p => p.payment_method === activeMethod.value);
  }

  const q = search.value.trim().toLowerCase();
  if (q) {
    result = result.filter(p =>
      p.order_reference.toLowerCase().includes(q) ||
      p.transaction_id.toLowerCase().includes(q) ||
      p.card_holder.toLowerCase().includes(q)
    );
  }

  return result;
});

const filteredTotal = computed(() =>
  filteredPayments.value.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
);

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadData);
</script>

<template>
  <div class="app-layout">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
      <div class="page">

        <!-- En-tête -->
        <div class="page-header">
          <div>
            <button class="btn-back" @click="router.push('/orders')">← Retour aux commandes</button>
            <h2> Paiements effectués</h2>
            <p class="subtitle">{{ payments.length }} paiement(s) enregistré(s)</p>
          </div>
          <button class="btn btn-outline" @click="loadData" :disabled="loading">
             Actualiser
          </button>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>

        <!-- Chargement -->
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement des paiements...
        </div>

        <template v-else>

          <!-- ── Cartes récapitulatives par méthode ── -->
          <div class="summary-grid" v-if="summary.length > 0">

            <!-- Carte "Tous" -->
            <div
              class="summary-card"
              :class="{ active: activeMethod === '' }"
              @click="activeMethod = ''"
            >
              <div class="sc-icon"></div>
              <div class="sc-label">Tous</div>
              <div class="sc-count">{{ payments.length }} paiement(s)</div>
              <div class="sc-total">
                {{ paymentService.formatAmount(payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)) }}
              </div>
            </div>

            <!-- Une carte par méthode -->
            <div
              v-for="item in summary"
              :key="item.method"
              class="summary-card"
              :class="{ active: activeMethod === item.method }"
              @click="activeMethod = activeMethod === item.method ? '' : item.method"
            >
              <!-- <div class="sc-icon">💳</div> -->
              <div class="sc-label">{{ item.method }}</div>
              <div class="sc-count">{{ item.count }} paiement(s)</div>
              <div class="sc-total">{{ paymentService.formatAmount(item.total) }}</div>
            </div>

          </div>

          <!-- ── Barre de recherche ── -->
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input
              v-model="search"
              type="text"
              placeholder="Rechercher par référence commande, ID transaction, titulaire carte..."
              class="search-input"
            />
            <button v-if="search" class="search-clear" @click="search = ''">✕</button>
          </div>

          <!-- Info filtre actif -->
          <div class="filter-info" v-if="activeMethod || search">
            <span>
              {{ filteredPayments.length }} résultat(s)
              <template v-if="activeMethod"> · méthode : <strong>{{ activeMethod }}</strong></template>
              <template v-if="search"> · recherche : <strong>« {{ search }} »</strong></template>
            </span>
            <span class="filter-total">Total : {{ paymentService.formatAmount(filteredTotal) }}</span>
            <button class="clear-filters" @click="activeMethod = ''; search = ''">✕ Effacer</button>
          </div>

          <!-- ── Tableau des paiements ── -->
          <div v-if="filteredPayments.length > 0" class="table-card">
            <div class="table-wrapper">
              <table class="payments-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Réf. commande</th>
                    <th>Méthode</th>
                    <th>Montant</th>
                    <th>Transaction ID</th>
                    <th>Titulaire</th>
                    <th>Carte</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in filteredPayments" :key="p.id">

                    <td class="col-id">{{ p.id }}</td>

                    <td class="col-ref">{{ p.order_reference || '—' }}</td>

                    <td>
                      <span class="method-tag">{{ p.payment_method || '—' }}</span>
                    </td>

                    <td class="col-amount">
                      {{ paymentService.formatAmount(p.amount) }}
                    </td>

                    <td class="col-transaction">
                      {{ p.transaction_id || '—' }}
                    </td>

                    <td>{{ p.card_holder || '—' }}</td>

                    <td class="col-card">
                      <template v-if="p.card_number">
                        <span class="card-info">
                          {{ p.card_brand }} {{ p.card_number }}
                          <span v-if="p.card_expiration" class="card-exp">exp. {{ p.card_expiration }}</span>
                        </span>
                      </template>
                      <template v-else>—</template>
                    </td>

                    <td class="col-date">
                      {{ new Date(p.date_add).toLocaleDateString('fr-FR') }}
                    </td>

                  </tr>
                </tbody>

                <!-- Total en pied de tableau -->
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">Total affiché</td>
                    <td class="foot-total">{{ paymentService.formatAmount(filteredTotal) }}</td>
                    <td colspan="4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Aucun résultat -->
          <div v-else class="empty-state">
            📭 Aucun paiement trouvé<span v-if="activeMethod || search"> pour ces filtres</span>.
          </div>

        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.app-layout   { min-height: 100vh; background: #0d0d14; }
.main-content { margin-left: 240px; transition: margin-left .3s; padding: 28px 24px; min-height: 100vh; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1400px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.btn-back { background: none; border: none; cursor: pointer; color: #f97316; font-size: .9rem; font-weight: 600; padding: 0; margin-bottom: 8px; display: block; font-family: inherit; }
.btn-back:hover { text-decoration: underline; }
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #f1f1f8; letter-spacing: -0.02em; }
.subtitle { margin: 4px 0 0; color: #6b7280; font-size: .875rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; font-size: .875rem; font-weight: 600; border: none; cursor: pointer; transition: opacity .15s, transform .1s; font-family: inherit; }
.btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-outline { background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.25); color: #f97316; }

/* ── Alertes / Chargement ───────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .875rem; }
.alert-error { background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #6b7280; }
.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.07); border-top-color: #f97316; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cartes récapitulatives ─────────────────────────────────── */
.summary-grid { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 24px; }
.summary-card { background: #13131f; border-radius: 12px; padding: 16px 20px; border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: border-color .2s, transform .15s; min-width: 160px; flex: 1; }
.summary-card:hover { border-color: rgba(255,255,255,0.14); transform: translateY(-2px); }
.summary-card.active { border-color: #f97316; background: rgba(249,115,22,0.06); }
.sc-icon { font-size: 1.4rem; margin-bottom: 6px; }
.sc-label { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 4px; }
.sc-count { font-size: .82rem; color: #6b7280; margin-bottom: 4px; }
.sc-total { font-size: 1.1rem; font-weight: 700; color: #10b981; }
.summary-card.active .sc-total { color: #f97316; }

/* ── Recherche ──────────────────────────────────────────────── */
.search-bar { display: flex; align-items: center; gap: 8px; background: #13131f; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0 14px; margin-bottom: 14px; }
.search-icon { font-size: 1rem; color: #6b7280; }
.search-input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: .95rem; background: transparent; color: #e2e2f0; font-family: inherit; }
.search-clear { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 1rem; padding: 4px; }
.search-clear:hover { color: #f1f1f8; }

/* ── Info filtre ────────────────────────────────────────────── */
.filter-info { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; font-size: .88rem; color: #a0a0b8; }
.filter-total { font-weight: 700; color: #10b981; margin-left: auto; }
.clear-filters { background: none; border: 1px solid rgba(255,255,255,0.10); color: #a0a0b8; border-radius: 6px; padding: 4px 10px; font-size: .82rem; cursor: pointer; font-family: inherit; }
.clear-filters:hover { background: rgba(255,255,255,0.06); color: #f1f1f8; }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card { background: #13131f; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); border-top: 3px solid #f97316; }
.table-wrapper { overflow-x: auto; }
.payments-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.payments-table thead { background: rgba(249,115,22,0.05); border-bottom: 1px solid rgba(249,115,22,0.15); }
.payments-table th { padding: 12px 14px; text-align: left; font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; white-space: nowrap; }
.payments-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #a0a0b8; }
.payments-table tbody tr:last-child td { border-bottom: none; }
.payments-table tbody tr:hover { background: rgba(255,255,255,0.03); }

/* ── Colonnes ───────────────────────────────────────────────── */
.col-id { color: #4b5563; font-size: .8rem; }
.col-ref { font-weight: 700; color: #f97316; font-family: monospace; }
.col-amount { font-weight: 700; color: #10b981; white-space: nowrap; }
.col-transaction { font-family: monospace; font-size: .82rem; color: #6b7280; }
.col-card { font-size: .82rem; }
.col-date { color: #6b7280; font-size: .82rem; white-space: nowrap; }
.method-tag { background: rgba(16,185,129,0.12); color: #10b981; padding: 3px 10px; border-radius: 20px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
.card-info { display: flex; flex-direction: column; gap: 2px; }
.card-exp { color: #6b7280; font-size: .78rem; }

/* ── Pied de tableau ────────────────────────────────────────── */
.payments-table tfoot { background: rgba(249,115,22,0.04); border-top: 1px solid rgba(249,115,22,0.15); }
.payments-table tfoot td { padding: 12px 14px; }
.foot-label { font-weight: 700; color: #6b7280; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; }
.foot-total { font-weight: 800; color: #f97316; font-size: 1.05rem; }

/* ── Vide ───────────────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #4b5563; font-size: 1rem; }

@media (max-width: 768px) { .main-content { margin-left: 70px; } .page-header { flex-direction: column; align-items: flex-start; gap: 12px; } }
</style>