import api from '../api/api';

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
      id: '',
      product_id: item.id_product,
      product_attribute_id: '',
      product_quantity: item.product_quantity,
      product_name: item.product_name,
      product_reference: '',
      product_ean13: '',
      product_isbn: '',
      product_upc: '',
      product_price: item.unit_price_tax_incl,
      id_customization: '',
      unit_price_tax_incl: item.unit_price_tax_incl,
      unit_price_tax_excl: item.unit_price_tax_incl,
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

    const blankResponse = await api.get('/addresses?schema=blank');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(blankResponse.data, 'text/xml');
    const addressElement = xmlDoc.querySelector('address');

    if (!addressElement) {
      throw new Error('Structure XML d\'adresse introuvable');
    }

    Object.entries(data).forEach(([key, value]) => {
      let field = addressElement.querySelector(key);
      if (!field) {
        field = xmlDoc.createElement(key);
        addressElement.appendChild(field);
      }
      field.textContent = String(value);
    });

    const serializer = new XMLSerializer();
    const xmlToSend = serializer.serializeToString(xmlDoc);

    const response = await api.post('/addresses?output_format=JSON', xmlToSend, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/json',
      },
    });

    const addressId = response.data?.address?.id ?? response.data?.id;
    if (!addressId) {
      throw new Error('Impossible de récupérer l\'ID de l\'adresse créée');
    }

    return String(addressId);
  },

  // ── Création d'une commande depuis le panier ─────────────────────
  async createOrder(payload: CreateOrderPayload): Promise<string> {
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
      secure_key:           Math.random().toString(36).substring(2, 18),
    };

    const items = payload.items ?? [];

    if (items.length === 0) {
      throw new Error('Aucun produit à commander');
    }

    const blankResponse = await api.get('/orders?schema=blank');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(blankResponse.data, 'text/xml');
    const orderElement = xmlDoc.querySelector('order');

    if (!orderElement) {
      throw new Error('Structure XML de commande introuvable');
    }

    Object.entries(data).forEach(([key, value]) => {
      let field = orderElement.querySelector(key);
      if (!field) {
        field = xmlDoc.createElement(key);
        orderElement.appendChild(field);
      }
      field.textContent = String(value);
    });

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

    const serializer = new XMLSerializer();
    const xmlToSend = serializer.serializeToString(xmlDoc);

    const response = await api.post('/orders?output_format=JSON', xmlToSend, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/json',
      },
    });

    const orderId = response.data?.order?.id ?? response.data?.id;
    if (!orderId) {
      throw new Error('Impossible de récupérer l\'ID de la commande créée');
    }

    return String(orderId);
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

  // ── Récupération des paiements enregistrés ──────────────────────
  async fetchOrderPayments(): Promise<PaymentOption[]> {
    try {
      const res = await api.get('/order_payments?output_format=XML&display=full&limit=100');
      const xmlDoc = parse(res.data);

      const payments = Array.from(xmlDoc.querySelectorAll('order_payment'))
        .map((el, index) => {
          const paymentMethod = text(el, 'payment_method') || text(el, 'payment') || 'Paiement';
          const amount = text(el, 'amount');
          const orderReference = text(el, 'order_reference');

          return {
            id: text(el, 'id') || `${index + 1}`,
            name: paymentMethod,
            description: [orderReference ? `Commande ${orderReference}` : '', amount ? `${amount} MGA` : '']
              .filter(Boolean)
              .join(' - '),
          } as PaymentOption;
        });

      return payments;
    } catch (error) {
      console.error('❌ Erreur chargement paiements:', error);
      return [];
    }
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