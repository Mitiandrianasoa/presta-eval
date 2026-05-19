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

.payment-list { }
.table-wrap { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
.bo-table { width: 100%; border-collapse: collapse; }
.bo-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
.bo-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.bo-table tr:last-child td { border-bottom: none; }
.bo-table tr:hover td { background: rgba(255,255,255,0.02); }
.payment-amount { font-weight: 700; color: #3fb950; }
.payment-method { font-size: 0.8rem; color: #7d8590; }
.status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
.s-paid { background: rgba(63,185,80,0.12); color: #3fb950; }
.s-pending { background: rgba(210,153,34,0.12); color: #d29922; }
.s-failed { background: rgba(248,81,73,0.12); color: #f85149; }
.loading-state { text-align: center; padding: 2rem; color: #7d8590; }

</style>