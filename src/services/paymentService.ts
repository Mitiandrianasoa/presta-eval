import api from '../api/api';
import type { Order } from './orderService';
import { orderService } from './orderService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentSummary {
  method: string;
  count: number;
  total: number;
}

// ─── Méthodes de paiement disponibles ─────────────────────────────────────────
// Ajoutez ou retirez des méthodes selon votre boutique PrestaShop

export const PAYMENT_METHODS = [
  'Paiement à la livraison',
  'Carte bancaire',
  'Virement bancaire',
  'Chèque',
  'PayPal',
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

// ─── Service ───────────────────────────────────────────────────────────────────

export const paymentService = {

  /**
   * Récupère toutes les commandes avec paiement effectué.
   * "Paiement effectué" = état 3 dans PrestaShop par défaut.
   * Adaptez PAID_STATE_ID si votre boutique utilise un autre ID.
   */
  async fetchPaidOrders(PAID_STATE_ID = '3'): Promise<Order[]> {
    const all  = await orderService.fetchAll();
    const paid = all.filter(o => o.current_state === PAID_STATE_ID);
    console.log(`💳 ${paid.length} commandes payées`);
    return paid;
  },

  /**
   * Retourne un résumé groupé des paiements par méthode.
   * Utile pour faire un tableau récapitulatif ou un graphique.
   */
  async getPaymentSummary(): Promise<PaymentSummary[]> {
    const orders = await orderService.fetchAll();

    const grouped = orders.reduce<Record<string, PaymentSummary>>((acc, order) => {
      const method = order.payment || 'Non renseigné';
      const total  = parseFloat(order.total_paid) || 0;

      if (!acc[method]) {
        acc[method] = { method, count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += total;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  },

  /**
   * Met à jour la méthode de paiement d'une commande.
   * Délègue à orderService.updatePayment.
   */
  async updatePayment(orderId: string, method: string): Promise<void> {
    await orderService.updatePayment(orderId, method);
  },

  /**
   * Formate un montant en euros avec séparateur de milliers.
   * Exemple : 12500.50 → "12 500,50 €"
   */
  formatAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
  },
};
