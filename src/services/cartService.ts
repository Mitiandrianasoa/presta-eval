import api from '../api/api';

// ─── Utilitaires XML ───────────────────────────────────────────────────────────
const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CartProduct {
  id_product: string;
  id_product_attribute: string;
  quantity: string;
}

export interface Cart {
  id: string;
  id_customer: string;
  id_currency: string;
  id_lang: string;
  date_add: string;
  date_upd: string;
  products: CartProduct[];
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const cartService = {

  /**
   * Récupère tous les paniers actifs.
   */
  async fetchAll(): Promise<Cart[]> {
    const res    = await api.get('/carts?output_format=XML&display=full&limit=5000');
    const xmlDoc = parse(res.data);

    const carts = Array.from(xmlDoc.querySelectorAll('cart')).map(cartEl => {
      const products: CartProduct[] = Array.from(
        cartEl.querySelectorAll('associations cart_row')
      ).map(p => ({
        id_product:           text(p, 'id_product'),
        id_product_attribute: text(p, 'id_product_attribute'),
        quantity:             text(p, 'quantity'),
      }));

      return {
        id:          text(cartEl, 'id'),
        id_customer: text(cartEl, 'id_customer'),
        id_currency: text(cartEl, 'id_currency'),
        id_lang:     text(cartEl, 'id_lang'),
        date_add:    text(cartEl, 'date_add'),
        date_upd:    text(cartEl, 'date_upd'),
        products,
      };
    });

    console.log(`🛒 ${carts.length} paniers chargés`);
    return carts;
  },

  /**
   * Récupère un panier par son ID.
   */
  async fetchOne(id: string): Promise<Cart | null> {
    const res    = await api.get(`/carts/${id}?output_format=XML&display=full`);
    const xmlDoc = parse(res.data);
    const cartEl = xmlDoc.querySelector('cart');
    if (!cartEl) return null;

    const products: CartProduct[] = Array.from(
      cartEl.querySelectorAll('associations cart_row')
    ).map(p => ({
      id_product:           text(p, 'id_product'),
      id_product_attribute: text(p, 'id_product_attribute'),
      quantity:             text(p, 'quantity'),
    }));

    return {
      id:          text(cartEl, 'id'),
      id_customer: text(cartEl, 'id_customer'),
      id_currency: text(cartEl, 'id_currency'),
      id_lang:     text(cartEl, 'id_lang'),
      date_add:    text(cartEl, 'date_add'),
      date_upd:    text(cartEl, 'date_upd'),
      products,
    };
  },

  /**
   * Retourne les paniers d'un client spécifique.
   */
  async fetchByCustomer(customerId: string): Promise<Cart[]> {
    const res    = await api.get(`/carts?output_format=XML&filter[id_customer]=[${customerId}]&display=full&limit=5000`);
    const xmlDoc = parse(res.data);

    const carts = Array.from(xmlDoc.querySelectorAll('cart')).map(cartEl => {
      const products: CartProduct[] = Array.from(
        cartEl.querySelectorAll('associations cart_row')
      ).map(p => ({
        id_product:           text(p, 'id_product'),
        id_product_attribute: text(p, 'id_product_attribute'),
        quantity:             text(p, 'quantity'),
      }));

      return {
        id:          text(cartEl, 'id'),
        id_customer: text(cartEl, 'id_customer'),
        id_currency: text(cartEl, 'id_currency'),
        id_lang:     text(cartEl, 'id_lang'),
        date_add:    text(cartEl, 'date_add'),
        date_upd:    text(cartEl, 'date_upd'),
        products,
      };
    });

    console.log(`🛒 ${carts.length} paniers du client ${customerId} chargés`);
    return carts;
  },
};
