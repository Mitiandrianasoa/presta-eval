// src/services/catOrder.service.ts
import api from '../api/api';
import { cartService, type Cart } from './cartService';
import {
  processCheckout,
  type CartData,
  type CartProduct,
  getOrCreateAddress,
  createCartWithProducts,
} from './checkout.service';
import { useAuth } from './useAuth';

export interface OpenCartSummary {
  id: string;
  idCustomer: string;
  dateAdd: string;
  dateUpd: string;
  itemsCount: number;
  totalQuantity: number;
  hasOrder: boolean;
}

export interface CurrentCartItem {
  id: string;
  id_product_attribute?: string | number;
  name: string;
  price: string;
  quantity: number;
  image_url?: string;
  reference?: string;
  combination_name?: string;
  combination_reference?: string;
}

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (el: Element | ParentNode | null | undefined, selector: string) =>
  el?.querySelector(selector)?.textContent?.trim() || '';

/**
 * Récupère les IDs des paniers déjà transformés en commandes
 */
const fetchCustomerOrderCartIds = async (customerId: string): Promise<Set<string>> => {
  const response = await api.get(
    `/orders?output_format=XML&filter[id_customer]=[${customerId}]&display=[id,id_cart]&limit=5000`
  );
  const xmlDoc = parseXml(response.data);
  const cartIds = Array.from(xmlDoc.querySelectorAll('orders order'))
    .map(orderEl => text(orderEl, 'id_cart'))
    .filter(Boolean);

  return new Set(cartIds);
};

/**
 * Récupère les informations d'un produit pour l'affichage
 */
const fetchProductSnapshot = async (
  productId: string,
  attributeId: string
): Promise<Pick<CurrentCartItem, 'name' | 'price' | 'image_url' | 'reference' | 'combination_name' | 'combination_reference'>> => {
  try {
    const response = await api.get(`/products/${productId}?output_format=XML&display=full`);
    const xmlDoc = parseXml(response.data);
    const productEl = xmlDoc.querySelector('product');

    if (!productEl) {
      return {
        name: `Produit #${productId}`,
        price: '0',
        combination_name: attributeId && attributeId !== '0' ? `Déclinaison #${attributeId}` : undefined,
      };
    }

    const imageId = text(productEl, 'id_default_image') || text(productEl, 'associations images image id');
    let price = text(productEl, 'price') || '0';
    price = price.replace(',', '.');
    const name = text(productEl, 'name language') || text(productEl, 'name') || `Produit #${productId}`;
    const reference = text(productEl, 'reference') || '';
    
    // Récupérer le nom de la combinaison si existante
    let combinationName: string | undefined;
    let combinationReference: string | undefined;
    
    if (attributeId && attributeId !== '0') {
      try {
        const comboResponse = await api.get(`/combinations/${attributeId}?output_format=XML`);
        const comboDoc = parseXml(comboResponse.data);
        const attrValues = comboDoc.querySelectorAll('associations product_option_values product_option_value id');
        const attrNames: string[] = [];
        
        for (const attrVal of attrValues) {
          const attrId = attrVal.textContent?.trim();
          if (attrId) {
            const attrResponse = await api.get(`/product_option_values/${attrId}?output_format=XML`);
            const attrDoc = parseXml(attrResponse.data);
            const attrName = attrDoc.querySelector('product_option_value name language[id="2"]')?.textContent?.trim() ||
                            attrDoc.querySelector('product_option_value name language[id="1"]')?.textContent?.trim();
            if (attrName) attrNames.push(attrName);
          }
        }
        combinationName = attrNames.join(' / ') || `Déclinaison #${attributeId}`;
        combinationReference = reference ? `${reference}_${attributeId}` : undefined;
      } catch (e) {
        combinationName = `Déclinaison #${attributeId}`;
      }
    }

    return {
      name,
      price,
      image_url: imageId ? `/api/images/products/${productId}/${imageId}` : undefined,
      reference,
      combination_name: combinationName,
      combination_reference: combinationReference,
    };
  } catch (error) {
    console.error(`Erreur fetch product ${productId}:`, error);
    return {
      name: `Produit #${productId}`,
      price: '0',
    };
  }
};

/**
 * Convertit un panier PrestaShop en résumé
 */
const mapCartToSummary = (cart: Cart): OpenCartSummary => {
  const totalQuantity = cart.products.reduce((sum, row) => {
    const quantity = parseInt(row.quantity || '0', 10);
    return sum + (isNaN(quantity) ? 0 : quantity);
  }, 0);

  return {
    id: cart.id,
    idCustomer: cart.id_customer,
    dateAdd: cart.date_add,
    dateUpd: cart.date_upd,
    itemsCount: cart.products.length,
    totalQuantity,
    hasOrder: false,
  };
};

/**
 * Convertit un CurrentCartItem en CartProduct pour le checkout
 */
const toCheckoutProduct = (item: CurrentCartItem): CartProduct => ({
  product_id: item.id,
  quantity: item.quantity,
  id_product_attribute: String(item.id_product_attribute || '0'),
  name: item.name,
  price: item.price,
  image_url: item.image_url,
  combination_name: item.combination_name,
  combination_reference: item.combination_reference,
});

export const cartOrderService = {
  /**
   * Récupère tous les paniers d'un client avec leur statut de commande
   */
  async fetchOpenCustomerCarts(customerId: string): Promise<OpenCartSummary[]> {
    const [carts, orderCartIds] = await Promise.all([
      cartService.fetchByCustomer(customerId),
      fetchCustomerOrderCartIds(customerId),
    ]);

    return carts
      .map(cart => ({
        ...mapCartToSummary(cart),
        hasOrder: orderCartIds.has(cart.id),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.dateUpd || a.dateAdd);
        const dateB = new Date(b.dateUpd || b.dateAdd);
        return dateB.getTime() - dateA.getTime();
      });
  },

  /**
   * Récupère un panier spécifique et le charge dans localStorage
   */
  async resumeCart(cartId: string): Promise<CurrentCartItem[]> {
    const cart = await cartService.fetchOne(cartId);
    if (!cart) {
      throw new Error('Panier introuvable');
    }

    const items = await Promise.all(
      cart.products.map(async (row) => {
        const snapshot = await fetchProductSnapshot(row.id_product, row.id_product_attribute || '0');
        return {
          id: row.id_product,
          id_product_attribute: row.id_product_attribute || '0',
          quantity: parseInt(row.quantity || '1', 10) || 1,
          name: snapshot.name,
          price: snapshot.price,
          image_url: snapshot.image_url,
          reference: snapshot.reference,
          combination_name: snapshot.combination_name,
          combination_reference: snapshot.combination_reference,
        } satisfies CurrentCartItem;
      })
    );

    localStorage.setItem('prestashop_cart', JSON.stringify(items));
    localStorage.setItem('prestashop_selected_cart_id', cartId);
    return items;
  },

  /**
   * Enregistre le panier courant dans PrestaShop
   */
  async saveCurrentCart(customerId?: string): Promise<string> {
    const { getCustomerId } = useAuth();
    const finalCustomerId = customerId || getCustomerId();
    
    const savedCart = localStorage.getItem('prestashop_cart');
    if (!savedCart) {
      throw new Error('Aucun panier à enregistrer');
    }
    
    const items = JSON.parse(savedCart) as CurrentCartItem[];
    if (items.length === 0) {
      throw new Error('Le panier est vide');
    }
    
    const addressId = await getOrCreateAddress(finalCustomerId);
    const cartId = await createCartWithProducts(finalCustomerId, items.map(toCheckoutProduct), addressId);
    
    // Sauvegarder l'ID du panier
    localStorage.setItem('prestashop_saved_cart_id', cartId);
    
    console.log(`✅ Panier enregistré avec ID: ${cartId}`);
    return cartId;
  },
  
  /**
   * Enregistre le panier courant ET passe commande directement
   */
  async saveAndCheckout(customerId?: string): Promise<any> {
    const { getCustomerId } = useAuth();
    const finalCustomerId = customerId || getCustomerId();
    
    const savedCart = localStorage.getItem('prestashop_cart');
    if (!savedCart) {
      throw new Error('Aucun panier à traiter');
    }
    
    const items = JSON.parse(savedCart) as CurrentCartItem[];
    if (items.length === 0) {
      throw new Error('Le panier est vide');
    }
    
    const cartData: CartData = {
      customerId: finalCustomerId,
      paymentMethod: 'paiement_livraison',
      products: items.map(toCheckoutProduct),
    };
    
    return processCheckout(cartData);
  },
  
  /**
   * Passe commande avec le panier courant
   */
  async checkoutCurrentCart(customerId?: string): Promise<any> {
    return this.saveAndCheckout(customerId);
  },

  /**
   * Crée un client anonyme temporaire pour enregistrer un panier
   */
  async createAnonymousCustomer(email: string, firstname: string, lastname: string): Promise<string> {
    const customerXml = `<?xml version="1.0" encoding="UTF-8"?>
  <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <customer>
      <email>${email}</email>
      <firstname>${firstname}</firstname>
      <lastname>${lastname}</lastname>
      <passwd>temp_${Math.random().toString(36).substring(7)}</passwd>
      <active>1</active>
      <is_guest>1</is_guest>
    </customer>
  </prestashop>`;

    try {
      const response = await api.post('/customers?output_format=XML', customerXml, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
      });

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const customerId = xmlDoc.querySelector('customer id')?.textContent?.trim();
      
      if (!customerId) {
        throw new Error('ID client non trouvé');
      }

      console.log(`✅ Client anonyme créé: #${customerId}`);
      return customerId;
    } catch (error: any) {
      console.error('❌ Erreur création client anonyme:', error?.response?.data || error.message);
      throw new Error(`Impossible de créer votre profil anonyme: ${error?.message}`);
    }
  },

  /**
   * Enregistre un panier anonyme
   */
  async saveAnonymousCart(email: string, firstname: string, lastname: string): Promise<string> {
    const savedCart = localStorage.getItem('prestashop_cart');
    if (!savedCart) {
      throw new Error('Aucun panier à enregistrer');
    }
    
    const items = JSON.parse(savedCart) as CurrentCartItem[];
    if (items.length === 0) {
      throw new Error('Le panier est vide');
    }

    // Créer un client anonyme
    const customerId = await this.createAnonymousCustomer(email, firstname, lastname);

    // Récupérer ou créer une adresse
    const addressId = await getOrCreateAddress(customerId);

    // Créer le panier
    const cartId = await createCartWithProducts(customerId, items.map(toCheckoutProduct), addressId);

    // Sauvegarder l'ID du panier local  
    localStorage.setItem('prestashop_saved_cart_id', cartId);
    localStorage.setItem('prestashop_anon_email', email);

    console.log(`✅ Panier anonyme enregistré avec ID: ${cartId}`);
    return cartId;
  }
};