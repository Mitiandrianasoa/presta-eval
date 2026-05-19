import api from '../api/api';
import { updateResource } from '../api/schemaService';

// ─── Utilitaires XML ───────────────────────────────────────────────────────────
const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';
const attr  = (el: Element, attName: string) => el.getAttribute(attName) || '';

// ─── Types exportés ────────────────────────────────────────────────────────────
const livre_STATE_ID = '5';// LIVRE

export interface OrderItem {
  id: string;
  product_id: string;
  product_attribute_id: string;
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
export const DELIVERED_STATE_ID = '5'; // État "Livrée"

// ─── Helpers internes ──────────────────────────────────────────────────────────

/** Parse un élément XML <order> en objet Order */
function parseOrderElement(orderEl: Element): Order {
  const items: OrderItem[] = Array.from(
    orderEl.querySelectorAll('associations order_row')
  ).map(itemEl => ({
    id:                   text(itemEl, 'id'),
    product_id:           text(itemEl, 'product_id'),
    product_attribute_id: text(itemEl, 'product_attribute_id') || '0',
    product_name:         text(itemEl, 'product_name'),
    product_reference:    text(itemEl, 'product_reference'),
    quantity:             text(itemEl, 'product_quantity'),
    price:                text(itemEl, 'product_price'),
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
    
    // Enregistrer un mouvement de stock si la commande devient livrée
    if (newState === DELIVERED_STATE_ID) {
      await this.recordDeliveryStockMovement(orderId);
    }
  },

  /** Enregistre les mouvements de stock pour une commande livrée. */
  async recordDeliveryStockMovement(orderId: string): Promise<void> {
    try {
      const order = await this.fetchOne(orderId);
      if (!order) {
        console.warn(`Commande ${orderId} introuvable`);
        return;
      }

      // Obtenir les informations de stock pour chaque produit (avec attributs)
      const stockResponse = await api.get('/stock_availables?output_format=XML&display=full&limit=5000');
      const parser = new DOMParser();
      const stockDoc = parser.parseFromString(stockResponse.data, 'text/xml');
      
      // Map avec clé composite: "product_id:attribute_id"
      const stockMap: Record<string, { id: string; id_warehouse: string; depends_on_stock: string; out_of_stock: string; location: string; quantity: number; id_product_attribute: string }> = {};

      stockDoc.querySelectorAll('stock_available').forEach(el => {
        const productId = text(el, 'id_product');
        const attributeId = text(el, 'id_product_attribute') || '0';
        
        if (productId) {
          const key = `${productId}:${attributeId}`;
          stockMap[key] = {
            id: text(el, 'id'),
            id_warehouse: text(el, 'id_warehouse') || '0',
            depends_on_stock: text(el, 'depends_on_stock') || '0',
            out_of_stock: text(el, 'out_of_stock') || '0',
            location: text(el, 'location') || '',
            quantity: parseInt(text(el, 'quantity')) || 0,
            id_product_attribute: attributeId
          };
        }
      });

      // Enregistrer un mouvement de stock pour chaque article de la commande
      for (const item of order.items) {
        const quantity = parseInt(item.quantity) || 0;
        if (quantity <= 0) continue;
        
        // Rechercher avec clé composite (product_id:attribute_id)
        const attributeId = item.product_attribute_id || '0';
        const key = `${item.product_id}:${attributeId}`;
        const stockData = stockMap[key];
        
        if (!stockData) {
          console.warn(`⚠️ Stock non trouvé pour produit ${item.product_id} (attribut: ${attributeId})`);
          continue;
        }
        
        const newQuantity = Math.max(0, stockData.quantity - quantity);

        // Créer le mouvement de stock via l'API
        const mvtXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_mvt>
    <id_product><![CDATA[${item.product_id}]]></id_product>
    <id_product_attribute><![CDATA[${stockData.id_product_attribute}]]></id_product_attribute>
    <id_warehouse><![CDATA[0]]></id_warehouse>
    <id_currency><![CDATA[1]]></id_currency>
    <id_employee><![CDATA[1]]></id_employee>
    <id_stock><![CDATA[${stockData.id}]]></id_stock>
    <id_stock_mvt_reason><![CDATA[3]]></id_stock_mvt_reason>
    <physical_quantity><![CDATA[${quantity}]]></physical_quantity>
    <sign><![CDATA[-1]]></sign>
    <price_te><![CDATA[0.000000]]></price_te>
    <date_add><![CDATA[${new Date().toISOString().slice(0, 19).replace('T', ' ')}]]></date_add>
  </stock_mvt>
</prestashop>`;

        await api.post('/stock_movements?output_format=XML', mvtXml, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });

        // Mettre à jour la quantité du stock
        const updateXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id><![CDATA[${stockData.id}]]></id>
    <id_product><![CDATA[${item.product_id}]]></id_product>
    <id_product_attribute><![CDATA[${stockData.id_product_attribute}]]></id_product_attribute>
    <id_warehouse><![CDATA[${stockData.id_warehouse}]]></id_warehouse>
    <id_shop><![CDATA[1]]></id_shop>
    <id_shop_group><![CDATA[0]]></id_shop_group>
    <quantity><![CDATA[${newQuantity}]]></quantity>
    <depends_on_stock><![CDATA[${stockData.depends_on_stock}]]></depends_on_stock>
    <out_of_stock><![CDATA[${stockData.out_of_stock}]]></out_of_stock>
    <location><![CDATA[${stockData.location}]]></location>
  </stock_available>
</prestashop>`;

        await api.put(`/stock_availables/${stockData.id}`, updateXml, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        });
      }

      console.log(`✅ Mouvements de stock enregistrés pour la livraison de la commande #${order.reference}`);
    } catch (error: any) {
      console.error(`⚠️ Erreur enregistrement mouvements de stock:`, error.message);
    }
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
