import api from '../api/api';
import { updateResource } from '../api/schemaService';

// ─── Utilitaires XML ───────────────────────────────────────────────────────────
const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const attr  = (el: Element, attName: string) => el.getAttribute(attName) || '';

// ─── Types exportés ────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_reference: string;
  quantity: string;
  price: string;
}

export interface Order {
  id: string;
  reference: string;
   id_cart: string;
  id_customer: string;
  customer_name: string;
  total_paid: string;
  payment: string;
  current_state: string;
  date_add: string;
  date_upd: string;
  items: OrderItem[];
}

export interface OrderState {
  id: string;
  name: string;
}

// ─── ID de l'état "Annulée" dans PrestaShop ────────────────────────────────────
// Modifiez cette constante si votre boutique utilise un ID différent
export const CANCELED_STATE_ID = '6';

// ─── Helpers internes ──────────────────────────────────────────────────────────

/** Parse un élément XML <order> en objet Order */
function parseOrderElement(orderEl: Element): Order {
  const items: OrderItem[] = Array.from(
    orderEl.querySelectorAll('associations order_row')
  ).map(itemEl => ({
    id:                text(itemEl, 'id'),
    product_id:        text(itemEl, 'product_id'),
    product_name:      text(itemEl, 'product_name'),
    product_reference: text(itemEl, 'product_reference'),
    quantity:          text(itemEl, 'product_quantity'),
    price:             text(itemEl, 'product_price'),
  }));

  return {
    id:             text(orderEl, 'id'),
    reference:      text(orderEl, 'reference'),
    id_customer:    text(orderEl, 'id_customer'),
    customer_name:  text(orderEl, 'customer_name'),
    total_paid:     text(orderEl, 'total_paid'),
    id_cart:        text(orderEl, 'id_cart'),
    payment:        text(orderEl, 'payment'),
    current_state:  text(orderEl, 'current_state'),
    date_add:       text(orderEl, 'date_add'),
    date_upd:       text(orderEl, 'date_upd'),
    items,
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const orderService = {

  /**
   * Récupère tous les statuts de commandes depuis PrestaShop.
   * En cas d'erreur API, retourne des valeurs par défaut.
   */
  async fetchOrderStates(): Promise<OrderState[]> {
    try {
      const res    = await api.get('/order_states?output_format=XML&display=full&limit=5000');
      const xmlDoc = parse(res.data);
      console.log('🔄 Statuts de commandes récupérés depuis PrestaShop', xmlDoc);
      const states = Array.from(xmlDoc.querySelectorAll('order_state')).map(el => ({
        id:   attr(el, 'id') || text(el, 'id'),
        name: text(el, 'name'),
      }));

      console.log(`✅ ${states.length} statuts chargés`);
      return states;
    } catch (error: any) {
      console.warn('⚠️ Statuts par défaut utilisés:', error.message);
      return [
        { id: '1', name: 'En attente de paiement' },
        { id: '2', name: 'Paiement accepté' },
        { id: '3', name: 'Paiement effectué' },
        { id: '4', name: 'Annulée' },
        { id: '5', name: 'Erreur de paiement' },
        { id: '6', name: 'Livrée' },
      ];
    }
  },

  /**
   * Récupère TOUTES les commandes.
   */
  async fetchAll(): Promise<Order[]> {
    const res    = await api.get('/orders?output_format=XML&display=full&limit=5000');
    const xmlDoc = parse(res.data);
    const orders = Array.from(xmlDoc.querySelectorAll('order')).map(parseOrderElement);
    console.log(`📥 ${orders.length} commandes chargées`);
    return orders;
  },

  /**
   * Récupère uniquement les commandes annulées (current_state === CANCELED_STATE_ID).
   */
  async fetchCanceled(): Promise<Order[]> {
    const all = await this.fetchAll();
    const canceled = all.filter(o => o.current_state === CANCELED_STATE_ID);
    console.log(`🚫 ${canceled.length} commandes annulées`);
    return canceled;
  },


  /**
   * Récupère une commande par son ID.
   */
  async fetchOne(id: string): Promise<Order | null> {
    const res    = await api.get(`/orders/${id}?output_format=XML&display=full`);
    const xmlDoc = parse(res.data);
    const orderEl = xmlDoc.querySelector('order');
    if (!orderEl) return null;
    return parseOrderElement(orderEl);
  },

  /**
   * Met à jour plusieurs champs d'une commande en une seule requête.
   */
  async updateOrder(orderId: string, data: Record<string, any>): Promise<void> {
    if (!orderId?.trim()) throw new Error('ID de commande manquant');
    await updateResource('orders', orderId, data);
  },

  /** Met à jour l'état d'une commande. */
  async updateState(orderId: string, newState: string): Promise<void> {
    await this.updateOrder(orderId, { current_state: newState });
  },

  /** Met à jour la méthode de paiement d'une commande. */
  async updatePayment(orderId: string, paymentMethod: string): Promise<void> {
    await this.updateOrder(orderId, { payment: paymentMethod });
  },

  /** Retourne le libellé d'un statut à partir de son ID. */
  getStateLabel(states: OrderState[], stateId: string): string {
    return states.find(s => s.id === stateId)?.name ?? `État ${stateId}`;
  },

  /**
   * Assure que l'état courant d'une commande est présent dans la liste.
   * Utile pour le <select> de changement d'état.
   */
  ensureStateInList(states: OrderState[], currentStateId: string): OrderState[] {
    if (states.find(s => s.id === currentStateId)) return states;
    return [...states, { id: currentStateId, name: `État ${currentStateId}` }];
  },
};
