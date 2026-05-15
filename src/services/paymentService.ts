import api from '../api/api';
import { orderService } from './orderService';

// ─── Utilitaires XML ───────────────────────────────────────────────────────────
const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Un paiement PrestaShop (ressource /order_payments) */
export interface Payment {
  id: string;
  order_reference: string;   // référence de la commande liée
  id_currency: string;
  amount: string;
  payment_method: string;
  conversion_rate: string;
  transaction_id: string;
  card_number: string;
  card_brand: string;
  card_expiration: string;
  card_holder: string;
  date_add: string;
}

export interface PaymentSummary {
  method: string;
  count: number;
  total: number;
}

// ─── Méthodes de paiement disponibles ─────────────────────────────────────────
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
   * Récupère TOUS les paiements valides (> 0€) depuis PrestaShop.
   * Les paiements à 0€ sont automatiquement exclus.
   */
  async fetchAll(): Promise<Payment[]> {
    const res    = await api.get('/order_payments?output_format=XML&display=full&limit=5000');
    const xmlDoc = parse(res.data);

    const allPayments = Array.from(xmlDoc.querySelectorAll('order_payment')).map(el => ({
      id:               text(el, 'id'),
      order_reference:  text(el, 'order_reference'),
      id_currency:      text(el, 'id_currency'),
      amount:           text(el, 'amount'),
      payment_method:   text(el, 'payment_method'),
      conversion_rate:  text(el, 'conversion_rate'),
      transaction_id:   text(el, 'transaction_id'),
      card_number:      text(el, 'card_number'),
      card_brand:       text(el, 'card_brand'),
      card_expiration:  text(el, 'card_expiration'),
      card_holder:      text(el, 'card_holder'),
      date_add:         text(el, 'date_add'),
    }));

    // ✅ Exclusion stricte des paiements à 0€
    const payments = allPayments.filter(p => parseFloat(p.amount) > 0);
    const removedCount = allPayments.length - payments.length;
    
    if (removedCount > 0) {
      console.log(`💳 ${payments.length} paiements chargés (${removedCount} paiements à 0€ ignorés)`);
    } else {
      console.log(`💳 ${payments.length} paiements chargés`);
    }

    return payments;
  },

  /**
   * Récupère un seul paiement par son ID.
   * Retourne null si le paiement n'existe pas ou est à 0€.
   */
  async fetchOne(id: string): Promise<Payment | null> {
    try {
      const res    = await api.get(`/order_payments/${id}?output_format=XML&display=full`);
      const xmlDoc = parse(res.data);
      const el     = xmlDoc.querySelector('order_payment');
      
      if (!el) {
        console.log(`💳 Paiement #${id} introuvable`);
        return null;
      }

      const payment = {
        id:               text(el, 'id'),
        order_reference:  text(el, 'order_reference'),
        id_currency:      text(el, 'id_currency'),
        amount:           text(el, 'amount'),
        payment_method:   text(el, 'payment_method'),
        conversion_rate:  text(el, 'conversion_rate'),
        transaction_id:   text(el, 'transaction_id'),
        card_number:      text(el, 'card_number'),
        card_brand:       text(el, 'card_brand'),
        card_expiration:  text(el, 'card_expiration'),
        card_holder:      text(el, 'card_holder'),
        date_add:         text(el, 'date_add'),
      };

      // ✅ Ignorer si le montant est 0€
      if (parseFloat(payment.amount) <= 0) {
        console.log(`💳 Paiement #${id} ignoré (montant: ${payment.amount}€)`);
        return null;
      }

      return payment;
      
    } catch (error) {
      console.error(`❌ Erreur récupération paiement #${id}:`, error);
      return null;
    }
  },

  /**
   * Récupère les paiements valides liés à une commande via sa référence.
   */
  async fetchByOrderReference(reference: string): Promise<Payment[]> {
    const all = await this.fetchAll();
    return all.filter(p => p.order_reference === reference);
  },

  /**
   * Vérifie si un paiement est valide (montant > 0)
   */
  isValidPayment(payment: Payment): boolean {
    return parseFloat(payment.amount) > 0;
  },

  /**
   * Vérifie si un montant est à 0€ ou invalide
   */
  isAmountZero(amount: string | number): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) || num <= 0;
  },

  /**
   * Retourne un résumé groupé par méthode de paiement.
   * Les paiements à 0€ sont automatiquement exclus.
   */
  async getPaymentSummary(): Promise<PaymentSummary[]> {
    const payments = await this.fetchAll();

    const grouped = payments.reduce<Record<string, PaymentSummary>>((acc, p) => {
      const method = p.payment_method || 'Non renseigné';
      const amount = parseFloat(p.amount) || 0;

      // ✅ Ignorer automatiquement les montants à 0€
      if (amount <= 0) return acc;

      if (!acc[method]) {
        acc[method] = { method, count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += amount;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  },

  /**
   * Met à jour la méthode de paiement d'une commande.
   * Délègue à orderService (champ payment sur la commande).
   */
  async updatePayment(orderId: string, method: string): Promise<void> {
    await orderService.updatePayment(orderId, method);
  },

  /**
   * Formate un montant en euros.
   * Exemples : 
   *   12500.50 → "12 500,50 €"
   *   0        → "Gratuit"
   *   ""       → "Gratuit"
   */
  formatAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // ✅ Si le montant est 0 ou invalide, afficher "Gratuit"
    if (isNaN(num) || num === 0) {
      return 'Gratuit';
    }
    
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(num);
  },
};