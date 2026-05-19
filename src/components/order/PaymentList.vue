<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../../components/Sidebar.vue';
import { paymentService, type Payment, type PaymentSummary } from '../../services/paymentService';
import api from '../../api/api';

// ─── État ──────────────────────────────────────────────────────────────────────

const payments         = ref<Payment[]>([]);
const summary          = ref<PaymentSummary[]>([]);
const loading          = ref(false);
const error            = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const search           = ref('');
const activeMethod     = ref('');   // filtre par méthode
const cancelledOrders  = ref<Map<string, boolean>>(new Map()); // Map: order id/reference -> is cancelled

const router = useRouter();

// ─── Chargement ────────────────────────────────────────────────────────────────

const loadCancelledOrders = async () => {
  try {
    const response = await api.get('/orders?output_format=XML&display=[id,reference,current_state]&limit=5000');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const orders = xmlDoc.querySelectorAll('order');
    
    orders.forEach(order => {
      const id = order.querySelector('id')?.textContent?.trim() || '';
      const ref = order.querySelector('reference')?.textContent?.trim() || '';
      const state = order.querySelector('current_state')?.textContent?.trim() || '';
      const isCancelled = state === '6';
      
      // Mapper à la fois par ID et par référence pour une correspondance flexible
      if (id) cancelledOrders.value.set(id, isCancelled);
      if (ref) cancelledOrders.value.set(ref, isCancelled);
    });
  } catch (e) {
    console.warn('Erreur chargement commandes annulées:', e);
  }
};

const loadData = async () => {
  loading.value = true;
  error.value   = null;
  try {
    await loadCancelledOrders();
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
                  <tr v-for="p in filteredPayments" :key="p.id" :class="{ 'row-cancelled': cancelledOrders.get(p.order_reference) }">

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
.app-layout   { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 250px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1400px; margin: 0 auto; }

/* ── En-tête ────────────────────────────────────────────────── */
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.btn-back { background: none; border: none; cursor: pointer; color: #2196f3; font-size: .9rem; font-weight: 600; padding: 0; margin-bottom: 8px; display: block; }
.btn-back:hover { text-decoration: underline; }
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1a1a2e; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }

/* ── Boutons ────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; font-size: .9rem; font-weight: 600; border: none; cursor: pointer; transition: opacity .15s, transform .1s; }
.btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-outline { background: #fff; border: 2px solid #2196f3; color: #2196f3; }

/* ── Alertes / Chargement ───────────────────────────────────── */
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem; }
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #666; }
.spinner { width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top-color: #2196f3; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cartes récapitulatives ─────────────────────────────────── */
.summary-grid { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 24px; }
.summary-card { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 8px rgba(0,0,0,.06); border: 2px solid transparent; cursor: pointer; transition: border-color .2s, box-shadow .2s, transform .15s; min-width: 160px; flex: 1; }
.summary-card:hover  { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.summary-card.active { border-color: #2196f3; background: #e3f2fd; }
.sc-icon  { font-size: 1.4rem; margin-bottom: 6px; }
.sc-label { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #666; margin-bottom: 4px; }
.sc-count { font-size: .82rem; color: #888; margin-bottom: 4px; }
.sc-total { font-size: 1.1rem; font-weight: 700; color: #2e7d32; }
.summary-card.active .sc-total { color: #1565c0; }

/* ── Recherche ──────────────────────────────────────────────── */
.search-bar { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #dde1e7; border-radius: 10px; padding: 0 14px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.search-icon  { font-size: 1rem; color: #aaa; }
.search-input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: .95rem; background: transparent; color: #333; }
.search-clear { background: none; border: none; color: #aaa; cursor: pointer; font-size: 1rem; padding: 4px; }
.search-clear:hover { color: #555; }

/* ── Info filtre ────────────────────────────────────────────── */
.filter-info { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; font-size: .88rem; color: #555; }
.filter-total  { font-weight: 700; color: #2e7d32; margin-left: auto; }
.clear-filters { background: none; border: 1px solid #ccc; color: #666; border-radius: 6px; padding: 4px 10px; font-size: .82rem; cursor: pointer; }
.clear-filters:hover { background: #f5f5f5; }

/* ── Tableau ────────────────────────────────────────────────── */
.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); border-top: 3px solid #2196f3; }
.table-wrapper { overflow-x: auto; }
.payments-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.payments-table thead { background: #f0f7ff; border-bottom: 2px solid #bbdefb; }
.payments-table th { padding: 12px 14px; text-align: left; font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #666; white-space: nowrap; }
.payments-table td { padding: 12px 14px; border-bottom: 1px solid #f0f2f5; color: #444; }
.payments-table tbody tr:last-child td { border-bottom: none; }
.payments-table tbody tr:hover { background: #f8fbff; }
.payments-table tbody tr.row-cancelled { background: #ffebee; }
.payments-table tbody tr.row-cancelled:hover { background: #ffcdd2; }
.payments-table tbody tr.row-cancelled td { color: #c62828; }

/* ── Colonnes ───────────────────────────────────────────────── */
.col-id          { color: #bbb; font-size: .8rem; }
.col-ref         { font-weight: 700; color: #2196f3; font-family: monospace; }
.col-amount      { font-weight: 700; color: #2e7d32; white-space: nowrap; }
.col-transaction { font-family: monospace; font-size: .82rem; color: #777; }
.col-card        { font-size: .82rem; }
.col-date        { color: #888; font-size: .82rem; white-space: nowrap; }
.method-tag      { background: #e8f5e9; color: #2e7d32; padding: 3px 10px; border-radius: 20px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
.card-info       { display: flex; flex-direction: column; gap: 2px; }
.card-exp        { color: #aaa; font-size: .78rem; }

/* ── Pied de tableau ────────────────────────────────────────── */
.payments-table tfoot { background: #f0f7ff; border-top: 2px solid #bbdefb; }
.payments-table tfoot td { padding: 12px 14px; }
.foot-label { font-weight: 700; color: #555; font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; }
.foot-total { font-weight: 800; color: #1565c0; font-size: 1.05rem; }

/* ── Vide ───────────────────────────────────────────────────── */
.empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 1rem; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
  .page-header  { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>