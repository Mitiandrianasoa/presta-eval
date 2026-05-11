import api from '../api/api';
import { updateResource } from '../api/schemaService';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const attr = (el: Element, attName: string) => el.getAttribute(attName) || '';

// Types
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

/**
 * Service pour gérer les commandes PrestaShop
 * Utilise l'API axios centralisée
 */
export const orderService = {
  /**
   * Récupère tous les statuts de commandes depuis l'API PrestaShop
   */
  async fetchOrderStates(): Promise<OrderState[]> {
    try {
      // Utiliser l'API locale/proxy au lieu d'un appel externe
      const res = await api.get('/order_states?output_format=XML&display=full&limit=5000');
      const xmlDoc = parse(res.data);
      
      const stateElements = Array.from(xmlDoc.querySelectorAll('order_state'));
      console.log('📊 Total state elements found:', stateElements.length);
      
      const states = stateElements.map((el, idx) => {
        // Try both methods to get ID
        const idAttr = attr(el, 'id');
        const idText = text(el, 'id');
        const name = text(el, 'name');
        
        const state = {
          id: idAttr || idText, // Use attr first, fallback to text
          name: name,
        };
        
        if (!state.id) {
          console.warn(`⚠️ State ${idx} has empty id! Element:`, el.outerHTML);
        }
        
        console.log(`  [${idx}] id="${state.id}" (attr="${idAttr}" text="${idText}") name="${state.name}"`);
        return state;
      });
      
      console.log('✅ Statuts chargés:', states.length);
      console.log('🔍 State IDs parsed:', states.map(s => s.id));
      return states;
    } catch (error: any) {
      console.error('⚠️ Erreur chargement statuts, utilisation des valeurs par défaut:', error.message);
      // Valeurs par défaut en cas d'erreur
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
   * Récupère toutes les commandes
   */
  async fetchAll(): Promise<Order[]> {
    try {
      const res = await api.get('/orders?output_format=XML&display=full&limit=5000');
      const xmlDoc = parse(res.data);
      
      const orders = Array.from(xmlDoc.querySelectorAll('order')).map(orderEl => {
        const id = text(orderEl, 'id'); // ✅ Utiliser text() pour récupérer l'élément <id>
        const items: OrderItem[] = Array.from(orderEl.querySelectorAll('associations order_row')).map(itemEl => ({
          id: text(itemEl, 'id'),
          product_id: text(itemEl, 'product_id'),
          product_name: text(itemEl, 'product_name'),
          product_reference: text(itemEl, 'product_reference'),
          quantity: text(itemEl, 'product_quantity'),
          price: text(itemEl, 'product_price'),
        }));

        return {
          id,
          reference: text(orderEl, 'reference'),
          id_customer: text(orderEl, 'id_customer'),
          customer_name: text(orderEl, 'customer_name'),
          total_paid: text(orderEl, 'total_paid'),
          payment: text(orderEl, 'payment'),
          current_state: text(orderEl, 'current_state'),
          date_add: text(orderEl, 'date_add'),
          date_upd: text(orderEl, 'date_upd'),
          items,
        };
      });
      
      console.log('📥 Orders fetched from API:', orders.length);
      console.log('📋 Première commande:', orders[0]);
      
      return orders;
    } catch (error: any) {
      console.error('❌ Erreur chargement commandes:', error.message);
      throw error;
    }
  },

  /**
   * Récupère une commande par son ID
   */
  async fetchOne(id: string): Promise<Order | null> {
    try {
      const res = await api.get(`/orders/${id}?output_format=XML&display=full`);
      const xmlDoc = parse(res.data);
      const orderEl = xmlDoc.querySelector('order');

      if (!orderEl) return null;

      const items: OrderItem[] = Array.from(orderEl.querySelectorAll('associations order_row')).map(itemEl => ({
        id: text(itemEl, 'id'),
        product_id: text(itemEl, 'product_id'),
        product_name: text(itemEl, 'product_name'),
        product_reference: text(itemEl, 'product_reference'),
        quantity: text(itemEl, 'product_quantity'),
        price: text(itemEl, 'product_price'),
      }));

      return {
        id: text(orderEl, 'id'), // ✅ Utiliser text() pour récupérer l'élément <id>
        reference: text(orderEl, 'reference'),
        id_customer: text(orderEl, 'id_customer'),
        customer_name: text(orderEl, 'customer_name'),
        total_paid: text(orderEl, 'total_paid'),
        payment: text(orderEl, 'payment'),
        current_state: text(orderEl, 'current_state'),
        date_add: text(orderEl, 'date_add'),
        date_upd: text(orderEl, 'date_upd'),
        items,
      };
    } catch (error: any) {
      console.error('❌ Erreur chargement commande:', error.message);
      throw error;
    }
  },

  /**
   * Met à jour plusieurs champs d'une commande à la fois
   * Utilise updateResource du schemaService
   */
  async updateOrder(orderId: string, data: Record<string, any>): Promise<void> {
    try {
      await updateResource('orders', orderId, data);
    } catch (error: any) {
      console.error('❌ Erreur updateOrder:', error.message);
      throw error;
    }
  },

  /**
   * Met à jour l'état d'une commande
   */
  async updateState(orderId: string, newState: string): Promise<void> {
    console.log(`🔔 updateState appelé avec:`, { orderId, newState });
    if (!orderId || orderId.trim() === '') {
      throw new Error('❌ OrderId manquant!');
    }
    await this.updateOrder(orderId, { current_state: newState });
  },

  /**
   * Met à jour le paiement d'une commande
   */
  async updatePayment(orderId: string, paymentMethod: string): Promise<void> {
    console.log(`🔔 updatePayment appelé avec:`, { orderId, paymentMethod });
    if (!orderId || orderId.trim() === '') {
      throw new Error('❌ OrderId manquant!');
    }
    await this.updateOrder(orderId, { payment: paymentMethod });
  },

  /**
   * Obtient le label d'un statut par son ID
   */
  getStateLabel(states: OrderState[], stateId: string): string {
    const state = states.find(s => s.id === stateId);
    return state?.name || `État ${stateId}`;
  },
};
