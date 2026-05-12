import api from '../api/api';
import { createResourceWithBlankSchema } from '../api/schemaService';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export interface FrontOrder {
  id: string;
  reference: string;
  id_customer: string;
  total_paid: string;
  total_paid_tax_incl: string;
  total_shipping: string;
  payment: string;
  current_state: string;
  date_add: string;
  items: FrontOrderItem[];
  stateName?: string;
}

export interface FrontOrderItem {
  id_product: string;
  product_name: string;
  product_quantity: string;
  unit_price_tax_incl: string;
  total_price_tax_incl: string;
  product_attribute_id?: string; // Pour les déclinaisons
  product_reference?: string; 
}

export interface OrderState {
  id: string;
  name: string;
  color?: string;
}

export interface PaymentOption {
  id: string;
  name: string;
  description?: string;
}

export interface CreateAddressPayload {
  id_customer: string;
  alias: string;
  firstname: string;
  lastname: string;
  address1: string;
  city: string;
  postcode: string;
  phone?: string;
  phone_mobile?: string;
  address2?: string;
  id_country?: string;
}

export interface CreateOrderPayload {
  id_customer: string;
  id_cart: string;
  id_currency: string;
  id_lang: string;
  id_carrier: string;
  id_address_delivery: string;
  id_address_invoice: string;
  payment: string;         // ex: 'Paiement à la livraison'
  module: string;          // ex: 'cod'
  current_state?: string;  // ex: '1' = En attente de paiement
  total_paid?: string;
  total_paid_tax_incl?: string;
  total_products?: string;
  total_shipping?: string;
  items?: FrontOrderItem[];
}



/**
 * Service commandes côté frontoffice
 * Utilise createResourceWithBlankSchema pour POST et l'API XML pour GET
 */
export const frontOrderService = {
  appendOrderRow(xmlDoc: Document, orderRows: Element, item: FrontOrderItem) {
  const orderRow = xmlDoc.createElement('order_row');

  const fields: Record<string, string> = {
      product_id: item.id_product,
      product_attribute_id: '0',
      product_quantity: item.product_quantity,
      product_name: item.product_name,
      product_reference: '',
      product_ean13: '',
      product_isbn: '',
      product_upc: '',
      product_price: item.unit_price_tax_incl,
      reduction_percent: '0',
      reduction_amount: '0',
      reduction_amount_tax_incl: '0',
      reduction_amount_tax_excl: '0',
      product_quantity_discount: '0',
      product_quantity_in_stock: '0',
      product_quantity_refunded: '0',
      product_quantity_return: '0',
      product_quantity_reinjected: '0',
      group_reduction: '0',
      id_customization: '0',
      unit_price_tax_incl: item.unit_price_tax_incl,
      unit_price_tax_excl: String(parseFloat(item.unit_price_tax_incl) / 1.2), // Calcul approximatif HT
      total_price_tax_incl: item.total_price_tax_incl,
      total_price_tax_excl: String(parseFloat(item.total_price_tax_incl) / 1.2), // Calcul approximatif HT
    };

    Object.entries(fields).forEach(([key, value]) => {
      const field = xmlDoc.createElement(key);
      field.textContent = value;
      orderRow.appendChild(field);
    });

  orderRows.appendChild(orderRow);
},

  // ── Création d'une adresse client ───────────────────────────────
  async createCustomerAddress(payload: CreateAddressPayload): Promise<string> {
    const data = {
      id_customer: payload.id_customer,
      alias: payload.alias,
      firstname: payload.firstname,
      lastname: payload.lastname,
      address1: payload.address1,
      address2: payload.address2 || '',
      postcode: payload.postcode,
      city: payload.city,
      phone: payload.phone || '',
      phone_mobile: payload.phone_mobile || '',
      id_country: payload.id_country || '1',
    };

    const response = await createResourceWithBlankSchema('addresses', data);

    const addressId = response?.address?.id ?? response?.id;
    if (!addressId) {
      throw new Error('Impossible de récupérer l\'ID de l\'adresse créée');
    }
    
    return String(addressId);
  },

  // ── Création d'une commande depuis le panier ─────────────────────
  async createOrder(payload: CreateOrderPayload): Promise<string> {
    console.log('🚀 Démarrage de createOrder avec payload:', JSON.stringify(payload, null, 2));
    const data = {
      id_customer:          payload.id_customer,
      id_cart:              payload.id_cart,
      id_currency:          payload.id_currency || '1',
      id_lang:              payload.id_lang     || '1',
      id_carrier:           payload.id_carrier  || '0',
      id_address_delivery:  payload.id_address_delivery,
      id_address_invoice:   payload.id_address_invoice,
      payment:              payload.payment,
      module:               payload.module,
      current_state:        payload.current_state  ?? '1',
      total_paid:           payload.total_paid     ?? '0',
      total_paid_tax_incl:  payload.total_paid_tax_incl ?? '0',
      total_paid_tax_excl:  payload.total_paid_tax_incl ?? '0',
      total_paid_real:      payload.total_paid     ?? '0',
      total_products:       payload.total_products ?? '0',
      total_products_wt:    payload.total_products ?? '0',
      total_shipping:       payload.total_shipping ?? '0',
      total_shipping_tax_incl: payload.total_shipping ?? '0',
      total_shipping_tax_excl: payload.total_shipping ?? '0',
      total_wrapping:       '0',
      total_discounts:      '0',
      conversion_rate:      '1',
      recyclable:           '0',
      gift:                 '0',
      secure_key:           '12345678901234567890123456789012',
    };

    const items = payload.items ?? [];

    if (items.length === 0) {
      throw new Error('Aucun produit à commander');
    }

    // Récupérer un schema synopsis (plus complet que blank)
    const templateResponse = await api.get('/orders?schema=synopsis');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(templateResponse.data, 'text/xml');
    const orderElement = xmlDoc.querySelector('order');

    if (!orderElement) {
      throw new Error('Structure XML de commande introuvable');
    }

    // Nettoyer les champs vides du synopsis qui causent des erreurs 500
    Array.from(orderElement.children).forEach(child => {
      if (child.tagName !== 'associations' && (!child.textContent || child.textContent.trim() === '')) {
        orderElement.removeChild(child);
      }
    });

    // Appliquer les données
    Object.entries(data).forEach(([key, value]) => {
      let field = orderElement.querySelector(key);
      if (!field) {
        field = xmlDoc.createElement(key);
        orderElement.appendChild(field);
      }
      // Supprimer les attributs potentiellement problématiques comme xlink:href
      Array.from(field.attributes).forEach(attr => field.removeAttribute(attr.name));
      field.textContent = String(value);
    });

    // Associations
    const associations = orderElement.querySelector('associations') || xmlDoc.createElement('associations');
    if (!associations.parentNode) {
      orderElement.appendChild(associations);
    }

    let orderRows = associations.querySelector('order_rows');
    if (!orderRows) {
      orderRows = xmlDoc.createElement('order_rows');
      associations.appendChild(orderRows);
    }

    orderRows.textContent = '';
    items.forEach((item) => this.appendOrderRow(xmlDoc, orderRows as Element, item));

    // 🧹 Nettoyage final strict (supprime tous les champs XML vides)
    const elementsToRemove: Element[] = [];
    const walk = (node: Element) => {
      Array.from(node.children).forEach((child: Element) => {
        if (child.children.length > 0) {
          walk(child);
        } else if (child.tagName !== 'associations' && (!child.textContent || child.textContent.trim() === '')) {
          elementsToRemove.push(child);
        }
      });
    };
    walk(orderElement);
    elementsToRemove.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    const serializer = new XMLSerializer();
    const xmlToSend = serializer.serializeToString(xmlDoc);
    console.log('📄 XML envoyé pour CREATE ORDER:', xmlToSend);
    
    // 🔍 Vérification
    console.log('🏠 id_address_delivery dans XML:', orderElement.querySelector('id_address_delivery')?.textContent);
    console.log('📮 id_address_invoice dans XML:', orderElement.querySelector('id_address_invoice')?.textContent);

    try {
      const response = await api.post('/orders?output_format=JSON', xmlToSend, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'application/json',
        },
      });

      const orderId = response.data?.order?.id ?? response.data?.id;
      if (!orderId) {
        throw new Error('Erreur lors de la création de la commande (ID manquant)');
      }

      return String(orderId);
    } catch (error: any) {
      const psErrors: { code: number; message: string }[] = error.response?.data?.errors ?? [];
      console.error('Détails de l\'erreur API PrestaShop:', JSON.stringify(error.response?.data, null, 2));

      const isOnlyWarnings = psErrors.length > 0 && psErrors.every(e => e.code === 15);
      if (isOnlyWarnings || error.response?.status === 500) {
        try {
          const cartId = data.id_cart;
          const checkRes = await api.get(
            `/orders?output_format=JSON&display=full&filter[id_cart]=[${cartId}]&sort=id_DESC&limit=1`
          );
          const orders = checkRes.data?.orders;
          const found = Array.isArray(orders) ? orders[0] : null;
          if (found?.id) {
            console.warn('⚠️ Commande créée malgré l\'erreur serveur (hook deprecated). ID:', found.id);
            return String(found.id);
          }
        } catch {
          // La vérification a échoué, on relance l'erreur originale
        }
      }

      const errorMessage = psErrors[0]?.message || error.message;
      throw new Error(`Rejet de PrestaShop: ${errorMessage}`);
    }
  },
  
  // ── Récupération de toutes les commandes d'un client ────────────
  async fetchCustomerOrders(idCustomer: string): Promise<FrontOrder[]> {
    const res = await api.get(
      `/orders?output_format=XML&display=full&filter[id_customer]=[${idCustomer}]&sort=date_add_DESC&limit=100`
    );
    const xmlDoc = parse(res.data);

    return Array.from(xmlDoc.querySelectorAll('order')).map(el => ({
      id:                  text(el, 'id'),
      reference:           text(el, 'reference'),
      id_customer:         text(el, 'id_customer'),
      total_paid:          text(el, 'total_paid'),
      total_paid_tax_incl: text(el, 'total_paid_tax_incl'),
      total_shipping:      text(el, 'total_shipping'),
      payment:             text(el, 'payment'),
      current_state:       text(el, 'current_state'),
      date_add:            text(el, 'date_add'),
      items: Array.from(el.querySelectorAll('associations order_rows order_row')).map(row => ({
        id_product:           text(row, 'product_id'),
        product_name:         text(row, 'product_name'),
        product_quantity:     text(row, 'product_quantity'),
        unit_price_tax_incl:  text(row, 'unit_price_tax_incl'),
        total_price_tax_incl: text(row, 'total_price_tax_incl'),
      })),
    }));
  },

  // ── Récupération d'une commande ─────────────────────────────────
  async fetchOrder(orderId: string): Promise<FrontOrder | null> {
    try {
      const res = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
      const xmlDoc = parse(res.data);
      const el = xmlDoc.querySelector('order');
      if (!el) return null;

      return {
        id:                  text(el, 'id'),
        reference:           text(el, 'reference'),
        id_customer:         text(el, 'id_customer'),
        total_paid:          text(el, 'total_paid'),
        total_paid_tax_incl: text(el, 'total_paid_tax_incl'),
        total_shipping:      text(el, 'total_shipping'),
        payment:             text(el, 'payment'),
        current_state:       text(el, 'current_state'),
        date_add:            text(el, 'date_add'),
        items: Array.from(el.querySelectorAll('associations order_rows order_row')).map(row => ({
          id_product:           text(row, 'product_id'),
          product_name:         text(row, 'product_name'),
          product_quantity:     text(row, 'product_quantity'),
          unit_price_tax_incl:  text(row, 'unit_price_tax_incl'),
          total_price_tax_incl: text(row, 'total_price_tax_incl'),
        })),
      };
    } catch {
      return null;
    }
  },

  // ── Récupération des statuts de commande ─────────────────────────
  async fetchOrderStates(): Promise<OrderState[]> {
    try {
      const res = await api.get('/order_states?output_format=XML&display=full&limit=100');
      const xmlDoc = parse(res.data);
      return Array.from(xmlDoc.querySelectorAll('order_state')).map(el => ({
        id:    text(el, 'id'),
        name:  el.querySelector('name language')?.textContent?.trim() || text(el, 'name'),
        color: text(el, 'color'),
      }));
    } catch {
      return [
        { id: '1',  name: 'En attente de paiement (chèque)',   color: '#4169E1' },
        { id: '2',  name: 'Paiement accepté',                   color: '#32CD32' },
        { id: '3',  name: 'En cours de préparation',            color: '#FF8C00' },
        { id: '4',  name: 'Expédiée',                           color: '#9400D3' },
        { id: '5',  name: 'Livrée',                             color: '#228B22' },
        { id: '6',  name: 'Annulée',                            color: '#DC143C' },
        { id: '7',  name: 'Remboursée',                         color: '#808080' },
        { id: '8',  name: 'Erreur de paiement',                 color: '#FF0000' },
        { id: '12', name: 'En attente de paiement (virement)',  color: '#4169E1' },
      ];
    }
  },

  // ── Récupération des paiements disponibles ──────────────────────
  async fetchOrderPayments(): Promise<PaymentOption[]> {
    // Note: PrestaShop's /order_payments endpoint returns past TRANSACTIONS, not available methods.
    // For a headless front-end, payment modules must usually be hardcoded or retrieved via a custom module.
    // Here we provide the standard payment methods.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'ps_wirepayment', name: 'Virement Bancaire', description: 'Payer par virement bancaire' },
          { id: 'ps_checkpayment', name: 'Paiement par Chèque', description: 'Payer par chèque à l\'ordre de la boutique' },
          { id: 'cashondelivery', name: 'Paiement à la livraison', description: 'Payer au livreur lors de la réception' }
        ]);
      }, 500);
    });
  },

  // ── Récupération des transporteurs actifs ────────────────────────
  async fetchCarriers(): Promise<{ id: string; name: string; price: number }[]> {
    try {
      const res = await api.get('/carriers?output_format=XML&display=full&filter[deleted]=0');
      const xmlDoc = parse(res.data);
      return Array.from(xmlDoc.querySelectorAll('carrier'))
        .filter(el => text(el, 'active') === '1')
        .map(el => ({
          id:    text(el, 'id'),
          name:  text(el, 'name'),
          price: 0,
        }));
    } catch {
      return [];
    }
  },

  // ── Récupération des adresses d'un client ────────────────────────
  async fetchCustomerAddresses(idCustomer: string) {
    try {
      const res = await api.get(
        `/addresses?output_format=XML&display=full&filter[id_customer]=[${idCustomer}]`
      );
      const xmlDoc = parse(res.data);
      return Array.from(xmlDoc.querySelectorAll('address')).map(el => ({
        id:       text(el, 'id'),
        alias:    text(el, 'alias'),
        lastname: text(el, 'lastname'),
        firstname:text(el, 'firstname'),
        address1: text(el, 'address1'),
        city:     text(el, 'city'),
        postcode: text(el, 'postcode'),
      }));
    } catch {
      return [];
    }
  },

  // ── Helper label statut ──────────────────────────────────────────
  getStateName(states: OrderState[], id: string): string {
    return states.find(s => s.id === id)?.name ?? `État ${id}`;
  },

  getStateColor(states: OrderState[], id: string): string {
    return states.find(s => s.id === id)?.color ?? '#888';
  },

  formatPrice(amount: string | number): string {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
    }).format(Number(amount));
  },
};