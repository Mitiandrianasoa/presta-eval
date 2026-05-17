// Dans votre fichier cartService.ts, ajoutez l'import du orderService
import api from '../api/api';
import { orderService } from './orderService'; // Ajoutez cette ligne

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
   * Récupère uniquement les paniers SANS commande associée.
   */
  async fetchCartsWithoutOrders(): Promise<Cart[]> {
    // 1. Récupérer tous les paniers
    const allCarts = await this.fetchAll();
    
    // 2. Récupérer toutes les commandes pour connaître les id_cart associés
    const allOrders = await orderService.fetchAll();
    
    // 3. Créer un Set des IDs de panier qui ont une commande
    const cartIdsWithOrders = new Set<string>();
    allOrders.forEach(order => {
      // Note: L'API PrestaShop retourne l'ID du panier dans la commande
      // Mais nous devons récupérer cette information depuis la commande
      // Si votre orderService ne contient pas id_cart, il faudra l'ajouter
      if (order.id_cart) {
        cartIdsWithOrders.add(order.id_cart);
      }
    });
    
    // 4. Filtrer les paniers qui n'ont PAS de commande
    const cartsWithoutOrders = allCarts.filter(
      cart => !cartIdsWithOrders.has(cart.id)
    );
    
    console.log(`✅ ${cartsWithoutOrders.length} paniers sans commande (sur ${allCarts.length} paniers au total)`);
    return cartsWithoutOrders;
  },

  /**
   * Version optimisée : un seul appel API pour les commandes.
   */
  async fetchCartsWithoutOrdersOptimized(): Promise<Cart[]> {
    try {
      // Récupérer les commandes (avec id_cart)
      const ordersRes = await api.get('/orders?output_format=XML&display=full&limit=5000');
      const ordersXml = parse(ordersRes.data);
      
      // Extraire les ID des paniers qui ont des commandes
      const cartIdsWithOrders = new Set<string>();
      const orderElements = ordersXml.querySelectorAll('order');
      orderElements.forEach(orderEl => {
        const idCart = orderEl.querySelector('id_cart')?.textContent?.trim();
        if (idCart) {
          cartIdsWithOrders.add(idCart);
        }
      });
      
      console.log(`📦 ${cartIdsWithOrders.size} paniers avec commandes associées`);
      
      // Récupérer tous les paniers
      const cartsRes = await api.get('/carts?output_format=XML&display=full&limit=5000');
      const cartsXml = parse(cartsRes.data);
      
      // Filtrer les paniers sans commande
      const cartsWithoutOrders: Cart[] = [];
      const cartElements = cartsXml.querySelectorAll('cart');
      
      cartElements.forEach(cartEl => {
        const cartId = text(cartEl, 'id');
        
        // Ne garder que les paniers SANS commande
        if (!cartIdsWithOrders.has(cartId)) {
          const products: CartProduct[] = Array.from(
            cartEl.querySelectorAll('associations cart_row')
          ).map(p => ({
            id_product:           text(p, 'id_product'),
            id_product_attribute: text(p, 'id_product_attribute'),
            quantity:             text(p, 'quantity'),
          }));
          
          cartsWithoutOrders.push({
            id:          text(cartEl, 'id'),
            id_customer: text(cartEl, 'id_customer'),
            id_currency: text(cartEl, 'id_currency'),
            id_lang:     text(cartEl, 'id_lang'),
            date_add:    text(cartEl, 'date_add'),
            date_upd:    text(cartEl, 'date_upd'),
            products,
          });
        }
      });
      
      console.log(`✅ ${cartsWithoutOrders.length} paniers sans commande trouvés`);
      return cartsWithoutOrders;
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des paniers sans commande:', error);
      throw error;
    }
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