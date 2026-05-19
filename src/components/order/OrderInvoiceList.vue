<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Sidebar from '../../components/Sidebar.vue';
import { orderService, type Order } from '../../services/orderService';
import { paymentService, type Payment } from '../../services/paymentService';

// `vfs_fonts` exports the virtual file system object directly.
// Assign it to `pdfMake.vfs` so pdfMake can find embedded fonts.
pdfMake.vfs = pdfFonts;

const router = useRouter();

type OrderInvoiceRow = {
  id: string;
  reference: string;
  customerName: string;
  totalHT: number;
  totalTTC: number;
  paymentDate: string;
  paymentMethod: string;
};

const orders = ref<Order[]>([]);
const payments = ref<Payment[]>([]);
const rows = ref<OrderInvoiceRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const search = ref('');

const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const [orderData, paymentData] = await Promise.all([
      orderService.fetchAll(),
      paymentService.fetchAll()
    ]);

    orders.value = orderData;
    payments.value = paymentData;

    const paymentMap = paymentData.reduce<Record<string, Payment[]>>((acc, payment) => {
      const reference = payment.order_reference?.trim();
      if (!reference) return acc;

      if (!acc[reference]) acc[reference] = [];
      acc[reference].push(payment);
      return acc;
    }, {});

    rows.value = orderData.map(order => {
      const orderPayments = paymentMap[order.reference] || [];
      const firstPayment = orderPayments[0];

      const totalHT = parseFloat(order.total_products) || 0;
      const totalTTC = parseFloat(order.total_paid_tax_incl) || parseFloat(order.total_paid) || 0;

      return {
        id: order.id,
        reference: order.reference,
        customerName: order.customer_name || `Client #${order.id_customer}`,
        totalHT,
        totalTTC,
        paymentDate: firstPayment?.date_add || order.date_add,
        paymentMethod: firstPayment?.payment_method || order.payment || '—'
      };
    });
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
};

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return rows.value;

  return rows.value.filter(row =>
    row.reference.toLowerCase().includes(q) ||
    row.customerName.toLowerCase().includes(q) ||
    row.paymentMethod.toLowerCase().includes(q)
  );
});

const filteredTotal = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + row.totalTTC, 0)
);

const buildInvoiceFileName = (orderReference: string, customerName: string, orderId: string) => {
  const clean = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const referencePart = clean(orderReference || orderId || 'commande');
  const customerPart = clean(customerName || 'client');

  return `invoice-${referencePart}-${customerPart}.pdf`;
};

const generateInvoicePdf = (
  orderId: string,
  orderReference: string,
  customerName: string,
  totalHT: number,
  totalTTC: number,
  paymentMethod: string,
  paymentDate: string
) => {
  const today = new Date();
  const tax = totalTTC - totalHT;

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      // En-tête
      {
        text: 'FACTURE',
        fontSize: 24,
        bold: true,
        color: '#1a1a2e',
        marginBottom: 20
      },

      // Infos commande
      {
        columns: [
          {
            text: [
              { text: 'Numéro de commande\n', bold: true, fontSize: 11 },
              { text: orderReference, fontSize: 14, bold: true, color: '#2196f3' },
              { text: `\n\nID: ${orderId}`, fontSize: 9, color: '#888' }
            ],
            width: '50%'
          },
          {
            text: [
              { text: 'Date\n', bold: true, fontSize: 11, alignment: 'right' },
              { text: today.toLocaleDateString('fr-FR'), fontSize: 12, alignment: 'right' }
            ],
            width: '50%'
          }
        ],
        marginBottom: 20
      },

      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e0e0e0' }],
        marginBottom: 20
      },

      // Infos client
      {
        text: [
          { text: 'Client\n', bold: true, fontSize: 11, color: '#333' },
          { text: customerName, fontSize: 12 }
        ],
        marginBottom: 30
      },

      // Tableau des montants
      {
        table: {
          widths: ['60%', '20%', '20%'],
          headerRows: 1,
          body: [
            [
              { text: 'Description', bold: true, fontSize: 11, color: '#fff', fill: '#2196f3' },
              { text: 'Montant', bold: true, fontSize: 11, color: '#fff', fill: '#2196f3', alignment: 'right' },
              { text: 'Montant', bold: true, fontSize: 11, color: '#fff', fill: '#2196f3', alignment: 'right' }
            ],
            [
              { text: 'Montant HT', fontSize: 11 },
              { text: '', fontSize: 11 },
              { text: formatCurrency(totalHT), fontSize: 11, alignment: 'right' }
            ],
            [
              { text: 'TVA', fontSize: 11 },
              { text: '', fontSize: 11 },
              { text: formatCurrency(tax), fontSize: 11, alignment: 'right' }
            ],
            [
              { text: 'Montant TTC', bold: true, fontSize: 12, color: '#2196f3' },
              { text: '', bold: true, fontSize: 12 },
              { text: formatCurrency(totalTTC), bold: true, fontSize: 12, alignment: 'right', color: '#2196f3' }
            ]
          ]
        },
        marginBottom: 30
      },

      // Détails paiement
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e0e0e0' }],
        marginBottom: 20
      },

      {
        columns: [
          {
            text: [
              { text: 'Méthode de paiement\n', bold: true, fontSize: 11, color: '#333' },
              { text: paymentMethod, fontSize: 11 }
            ]
          },
          {
            text: [
              { text: 'Date de paiement\n', bold: true, fontSize: 11, color: '#333', alignment: 'right' },
              { text: new Date(paymentDate).toLocaleDateString('fr-FR'), fontSize: 11, alignment: 'right' }
            ]
          }
        ],
        marginBottom: 40
      },

      // Pied de page
      {
        text: 'Merci pour votre commande!',
        fontSize: 10,
        color: '#888',
        alignment: 'center'
      }
    ]
  };

  const fileName = buildInvoiceFileName(orderReference, customerName, orderId);
  pdfMake.createPdf(docDefinition).download(fileName);
};

const downloadInvoicePdf = async (
  orderId: string,
  orderReference: string,
  customerName: string
) => {
  try {
    // Récupérer les détails de la commande
    const order = orders.value.find(o => o.id === orderId);
    const row = rows.value.find(r => r.id === orderId);

    if (!order || !row) {
      throw new Error('Commande non trouvée');
    }

    // Générer le PDF
    generateInvoicePdf(
      orderId,
      orderReference,
      customerName,
      row.totalHT,
      row.totalTTC,
      row.paymentMethod,
      row.paymentDate
    );
  } catch (e: any) {
    error.value = e.message || 'Erreur lors de la génération du PDF';
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

onMounted(loadData);
</script>

<template>
  <div class="app-layout">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="main-content" :class="{ collapsed: sidebarCollapsed }">
      <div class="page">
        <div class="page-header">
          <div>
            <button class="btn-back" @click="router.push('/admin/orders')">← Retour aux commandes</button>
            <h2>Factures de commandes</h2>
            <p class="subtitle">{{ filteredRows.length }} commande(s) avec facture</p>
          </div>
          <button class="btn btn-outline" @click="loadData" :disabled="loading">Actualiser</button>
        </div>

        <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>

        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> Chargement des factures...
        </div>

        <template v-else>
          <div class="summary-strip">
            <div class="summary-chip">
              <span class="chip-label">Commandes</span>
              <span class="chip-value">{{ filteredRows.length }}</span>
            </div>
            <div class="summary-chip">
              <span class="chip-label">Total TTC</span>
              <span class="chip-value">{{ formatCurrency(filteredTotal) }}</span>
            </div>
          </div>

          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input
              v-model="search"
              type="text"
              placeholder="Rechercher par commande, client ou paiement..."
              class="search-input"
            />
            <button v-if="search" class="search-clear" @click="search = ''">✕</button>
          </div>

          <div v-if="filteredRows.length > 0" class="table-card">
            <div class="table-wrapper">
              <table class="orders-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Montant HT</th>
                    <th>Montant TTC</th>
                    <th>Paiement</th>
                    <th>Date de paiement</th>
                    <th>Facture PDF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in filteredRows" :key="row.id">
                    <td class="col-ref">{{ row.reference }}</td>
                    <td class="col-customer">{{ row.customerName }}</td>
                    <td class="col-price">{{ formatCurrency(row.totalHT) }}</td>
                    <td class="col-price">{{ formatCurrency(row.totalTTC) }}</td>
                    <td><span class="tag">{{ row.paymentMethod }}</span></td>
                    <td class="col-date">{{ new Date(row.paymentDate).toLocaleDateString('fr-FR') }}</td>
                    <td class="col-actions">
                      <button class="btn btn-primary btn-sm" @click="downloadInvoicePdf(row.id, row.reference, row.customerName)">
                        Télécharger PDF
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else class="empty-state">
            Aucune facture trouvée.
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout { display: flex; min-height: 100vh; background: #f5f7fa; }
.main-content { flex: 1; margin-left: 250px; transition: margin-left .3s; padding: 28px 24px; }
.main-content.collapsed { margin-left: 70px; }
.page { max-width: 1280px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1a1a2e; }
.subtitle { margin: 4px 0 0; color: #888; font-size: .9rem; }
.btn-back { background: none; border: none; cursor: pointer; color: #2196f3; font-size: .9rem; font-weight: 600; padding: 0; margin-bottom: 8px; display: block; }
.btn-back:hover { text-decoration: underline; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px; font-size: .9rem; font-weight: 600; border: none; cursor: pointer; text-decoration: none; transition: opacity .15s, transform .1s; }
.btn:hover { opacity: .88; transform: translateY(-1px); }
.btn-primary { background: #2196f3; color: #fff; }
.btn-outline { background: #fff; border: 2px solid #2196f3; color: #2196f3; }
.btn-sm { padding: 6px 12px; font-size: .82rem; }
.alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: .9rem; }
.alert-error { background: #fff0f0; border: 1px solid #ffcdd2; color: #c62828; }
.loading-state { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #666; }
.spinner { width: 20px; height: 20px; border: 3px solid #e0e0e0; border-top-color: #2196f3; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.summary-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.summary-chip { background: #fff; border-radius: 12px; padding: 12px 16px; border: 1px solid #e5e7eb; min-width: 180px; }
.chip-label { display: block; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; font-weight: 700; }
.chip-value { display: block; margin-top: 4px; font-size: 1.1rem; font-weight: 800; color: #111827; }
.search-bar { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #dde1e7; border-radius: 10px; padding: 0 14px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.search-icon { font-size: 1rem; color: #aaa; }
.search-input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: .95rem; background: transparent; color: #333; }
.search-clear { background: none; border: none; color: #aaa; cursor: pointer; font-size: 1rem; padding: 4px; }
.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); border-top: 3px solid #2196f3; }
.table-wrapper { overflow-x: auto; }
.orders-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.orders-table thead { background: #f8f9fb; border-bottom: 2px solid #eef0f3; }
.orders-table th { padding: 13px 16px; text-align: left; font-size: .78rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #666; white-space: nowrap; }
.orders-table td { padding: 13px 16px; border-bottom: 1px solid #f0f2f5; color: #444; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.orders-table tbody tr:hover { background: #f8fbff; }
.col-ref { font-weight: 700; color: #2196f3; font-family: monospace; }
.col-customer { color: #374151; }
.col-price { font-weight: 700; color: #2e7d32; white-space: nowrap; }
.col-date { color: #888; font-size: .82rem; white-space: nowrap; }
.col-actions { white-space: nowrap; }
.tag { background: #e8f5e9; color: #2e7d32; padding: 3px 10px; border-radius: 20px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
.empty-state { text-align: center; padding: 60px; color: #aaa; font-size: 1rem; background: #fff; border-radius: 12px; }

@media (max-width: 768px) {
  .main-content { margin-left: 70px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>