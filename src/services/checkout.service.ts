// src/services/checkout.service.ts
import api from '../api/api';
import { useAuth } from '../services/useAuth';

// ============================================
// CONFIGURATION PAR DÉFAUT
// ============================================
const DEFAULT_CONFIG = {
  CARRIER_ID: '1',
  PAYMENT_METHOD: 'paiement_livraison',
  PAYMENT_MODULE: 'ps_cashondelivery',
  CURRENCY_ID: '1',
  LANG_ID: '1',
};

export interface CartProduct {
  product_id: string;
  quantity: number;
  id_product_attribute?: string;
  name?: string;
  price?: string;
  image_url?: string;
}

export interface CartData {
  products: CartProduct[];
  customerId?: string;
  carrierId?: string;
  paymentMethod?: string;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Formate un nombre en string avec exactement 6 décimales (format PrestaShop)
 * Ex: 117.44365499999999 → "117.443655"
 */
const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
};

/**
 * Récupère ou crée une adresse pour le client
 */
const getOrCreateAddress = async (customerId: string): Promise<string> => {
  console.log(`📍 Récupération/Création d'adresse pour le client ${customerId}`);
  
  try {
    const response = await api.get(
      `/addresses?output_format=XML&filter[id_customer]=[${customerId}]&display=full`
    );
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const addressElements = xmlDoc.querySelectorAll('addresses address');
    
    if (addressElements.length > 0) {
      const addressId = addressElements[0].querySelector('id')?.textContent?.trim();
      if (addressId) {
        console.log(`✅ Adresse existante trouvée: ID ${addressId}`);
        return addressId;
      }
    }
    
    console.log('🏗️ Création d\'une nouvelle adresse pour le client');
    
    const customerResponse = await api.get(`/customers/${customerId}?output_format=XML`);
    const customerDoc = parser.parseFromString(customerResponse.data, 'text/xml');
    
    const firstname = customerDoc.querySelector('customer firstname')?.textContent?.trim() || 'Client';
    const lastname = customerDoc.querySelector('customer lastname')?.textContent?.trim() || 'Test';
    
    const addressXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${customerId}</id_customer>
    <id_country>8</id_country>
    <id_state>0</id_state>
    <alias>Mon adresse</alias>
    <lastname>${lastname}</lastname>
    <firstname>${firstname}</firstname>
    <address1>Adresse par défaut</address1>
    <postcode>77777</postcode>
    <city>Nice</city>
    <phone>0330000000</phone>
    <phone_mobile>0330000000</phone_mobile>
  </address>
</prestashop>`;

    const createResponse = await api.post('/addresses?output_format=XML', addressXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/xml'
      }
    });
    
    const addressDoc = parser.parseFromString(createResponse.data, 'text/xml');
    const newAddressId = addressDoc.querySelector('address id')?.textContent?.trim();
    
    if (newAddressId) {
      console.log(`✅ Nouvelle adresse créée avec ID: ${newAddressId}`);
      return newAddressId;
    }
    
    throw new Error('Impossible de créer une adresse');
    
  } catch (error) {
    console.error('❌ Erreur avec les adresses:', error);
    return '1';
  }
};

// ============================================
// CRÉATION DU PANIER AVEC PRODUITS
// ============================================

const buildCartWithProductsXml = (
  customerId: string,
  products: CartProduct[],
  addressId: string
): string => {
  
  const cartRowsXml = products.map(product => `
    <cart_row>
      <id_product>${product.product_id}</id_product>
      <id_product_attribute>${product.id_product_attribute || '0'}</id_product_attribute>
      <id_address_delivery>${addressId}</id_address_delivery>
      <quantity>${product.quantity}</quantity>
    </cart_row>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency>${DEFAULT_CONFIG.CURRENCY_ID}</id_currency>
    <id_lang>${DEFAULT_CONFIG.LANG_ID}</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>${DEFAULT_CONFIG.CARRIER_ID}</id_carrier>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <associations>
      <cart_rows>${cartRowsXml}</cart_rows>
    </associations>
  </cart>
</prestashop>`;
};

const createCartWithProducts = async (
  customerId: string,
  products: CartProduct[],
  addressId: string
): Promise<string> => {
  console.log('🛒 Création du panier avec produits');
  console.log(`📦 ${products.length} produit(s) à ajouter`);
  
  try {
    const cartXml = buildCartWithProductsXml(customerId, products, addressId);
    
    const response = await api.post('/carts?output_format=XML', cartXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/xml'
      }
    });

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const cartId = xmlDoc.querySelector('cart id')?.textContent?.trim();
    
    if (!cartId) {
      throw new Error('ID du panier non trouvé dans la réponse');
    }
    
    console.log(`✅ Panier créé avec ID: ${cartId}`);
    return cartId;
    
  } catch (error: any) {
    console.error('❌ Erreur création panier:', error.response?.data || error);
    throw error;
  }
};

// ============================================
// RÉCUPÉRATION DES TOTAUX DU PANIER
// ============================================

/**
 * Récupère les totaux mis à jour du panier
 */
const getCartTotals = async (cartId: string): Promise<{
  totalProducts: string;
  totalProductsWt: string;
  totalShipping: string;
}> => {
  console.log(`💰 Récupération des totaux pour le panier ${cartId}`);
  
  try {
    // Attendre un peu que PrestaShop calcule les totaux
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await api.get(`/carts/${cartId}?output_format=XML&display=full`);
    const parser = new DOMParser();
    const cartDoc = parser.parseFromString(response.data, 'text/xml');
    
    const totalProducts = cartDoc.querySelector('cart total_products')?.textContent?.trim() || '0';
    const totalProductsWt = cartDoc.querySelector('cart total_products_wt')?.textContent?.trim() || '0';
    const totalShipping = cartDoc.querySelector('cart total_shipping')?.textContent?.trim() || '0';
    
    console.log(`💰 Totaux récupérés: products=${totalProducts}, products_wt=${totalProductsWt}, shipping=${totalShipping}`);
    
    return {
      totalProducts,
      totalProductsWt,
      totalShipping
    };
    
  } catch (error) {
    console.error('❌ Erreur récupération totaux:', error);
    return {
      totalProducts: '0',
      totalProductsWt: '0',
      totalShipping: '0'
    };
  }
};

// ============================================
// CRÉATION DE LA COMMANDE
// ============================================

/**
 * Crée la commande à partir du panier
 */
const createOrder = async (
  cartId: string,
  customerId: string,
  customerToken: string,
  addressId: string,
  cartData: CartProduct[],
  paymentMethod: string = DEFAULT_CONFIG.PAYMENT_METHOD
): Promise<any> => {
  console.log(`📋 Création de la commande pour le panier ${cartId}`);
  
  try {
    // Récupérer les totaux du panier
    const totals = await getCartTotals(cartId);
    
    // Calculer le total à partir des produits si les totaux sont à 0
    // ⚠️  PrestaShop exige exactement 6 décimales — toujours utiliser formatPrice()
    let finalTotalWt = totals.totalProductsWt;
    if (finalTotalWt === '0' || finalTotalWt === '0.000000') {
      // Calcul manuel du total
      const calculatedTotal = cartData.reduce((sum, product) => {
        return sum + (parseFloat(product.price as string) || 0) * product.quantity;
      }, 0);
      finalTotalWt = formatPrice(calculatedTotal);
      console.log(`💰 Calcul manuel du total (formaté 6 décimales): ${finalTotalWt}`);
    } else {
      finalTotalWt = formatPrice(finalTotalWt);
    }

    // Forcer total_products à être cohérent si le panier retourne 0
    let finalTotalProducts = totals.totalProducts;
    if (finalTotalProducts === '0' || finalTotalProducts === '0.000000') {
      finalTotalProducts = finalTotalWt;
    } else {
      finalTotalProducts = formatPrice(finalTotalProducts);
    }

    const finalShipping = formatPrice(totals.totalShipping);
    
    // Récupérer l'email du client
    const customerResponse = await api.get(`/customers/${customerId}?output_format=XML`);
    const customerDoc = new DOMParser().parseFromString(customerResponse.data, 'text/xml');
    const customerEmail = customerDoc.querySelector('customer email')?.textContent?.trim() || '';
    
    const orderXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_cart>${cartId}</id_cart>
    <id_currency>${DEFAULT_CONFIG.CURRENCY_ID}</id_currency>
    <id_lang>${DEFAULT_CONFIG.LANG_ID}</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>${DEFAULT_CONFIG.CARRIER_ID}</id_carrier>
    <current_state>2</current_state>
    <module>${DEFAULT_CONFIG.PAYMENT_MODULE}</module>
    <payment>${paymentMethod}</payment>
    <conversion_rate>1.000000</conversion_rate>
    <total_discounts>0.000000</total_discounts>
    <total_discounts_tax_incl>0.000000</total_discounts_tax_incl>
    <total_discounts_tax_excl>0.000000</total_discounts_tax_excl>
    <total_paid>${finalTotalWt}</total_paid>
    <total_paid_tax_incl>${finalTotalWt}</total_paid_tax_incl>
    <total_paid_tax_excl>${finalTotalWt}</total_paid_tax_excl>
    <total_paid_real>0.000000</total_paid_real>
    <total_products>${finalTotalProducts}</total_products>
    <total_products_wt>${finalTotalWt}</total_products_wt>
    <total_shipping>${finalShipping}</total_shipping>
    <total_shipping_tax_incl>${finalShipping}</total_shipping_tax_incl>
    <total_shipping_tax_excl>${finalShipping}</total_shipping_tax_excl>
    <carrier_tax_rate>0.000000</carrier_tax_rate>
    <secure_key>00000000000000000000000000000000</secure_key>
    <valid>1</valid>
    <email>${customerEmail}</email>
  </order>
</prestashop>`;

    console.log('📄 XML de la commande envoyé');

    const response = await api.post('/orders?output_format=XML', orderXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/xml'
      }
    });
    
    const parser = new DOMParser();
    const orderDoc = parser.parseFromString(response.data, 'text/xml');
    
    // Chercher l'ID de la commande dans la réponse
    let orderId = orderDoc.querySelector('order id')?.textContent?.trim();
    
    // Si pas trouvé, chercher dans une structure différente
    if (!orderId) {
      orderId = orderDoc.querySelector('id')?.textContent?.trim();
    }
    
    if (!orderId) {
      console.error('Structure de la réponse:', response.data);
      throw new Error('ID commande non trouvé dans la réponse');
    }
    
    console.log(`✅ Commande créée avec succès! ID: ${orderId}`);
    
    return {
      id: orderId,
      cartId,
      total: finalTotalWt
    };
    
  } catch (error: any) {
    console.error('❌ Erreur création commande:', error.response?.data || error);
    
    // Vérifier si la commande existe déjà
    if (error.response?.status === 400 || error.response?.status === 500) {
      try {
        console.log('🔍 Vérification si la commande existe déjà...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const ordersResponse = await api.get(
          `/orders?output_format=XML&filter[id_cart]=[${cartId}]&display=full`
        );
        
        const parser = new DOMParser();
        const ordersDoc = parser.parseFromString(ordersResponse.data, 'text/xml');
        const existingOrder = ordersDoc.querySelector('order');
        
        if (existingOrder) {
          const orderId = existingOrder.querySelector('id')?.textContent?.trim();
          if (orderId) {
            console.log(`✅ Commande déjà existante: ${orderId}`);
            return {
              id: orderId,
              cartId,
              total: '0',
              warning: 'Commande déjà existante'
            };
          }
        }
      } catch (checkError) {
        console.warn('Impossible de vérifier les commandes existantes');
      }
    }
    
    throw error;
  }
};

// ============================================
// FONCTION PRINCIPALE DE CHECKOUT
// ============================================

export const processCheckout = async (cartData: CartData): Promise<any> => {
  console.log('🚀 Démarrage du checkout');
  console.log('📦 Configuration:', {
    productsCount: cartData.products.length,
    customerId: cartData.customerId,
    paymentMethod: cartData.paymentMethod || DEFAULT_CONFIG.PAYMENT_METHOD
  });
  
  try {
    const { getCustomerId, getCustomerToken } = useAuth();
    const customerId = cartData.customerId || getCustomerId();
    const customerToken = getCustomerToken();
    
    console.log('👤 Client:', { customerId, token: customerToken?.substring(0, 8) + '...' });
    
    if (!customerToken) {
      throw new Error('Token client non trouvé. Veuillez vous reconnecter.');
    }
    
    // Récupérer ou créer une adresse
    const addressId = await getOrCreateAddress(customerId);
    console.log(`✅ Adresse utilisée: ${addressId}`);
    
    // Créer le panier avec les produits
    const cartId = await createCartWithProducts(customerId, cartData.products, addressId);
    
    // Attendre que PrestaShop mette à jour les totaux
    console.log('⏳ Attente du calcul des totaux...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Créer la commande
    console.log('📋 Création de la commande...');
    const order = await createOrder(
      cartId,
      customerId,
      customerToken,
      addressId,
      cartData.products,
      cartData.paymentMethod || DEFAULT_CONFIG.PAYMENT_METHOD
    );
    
    console.log('🎉 Checkout terminé avec succès!');
    
    return {
      success: true,
      cartId,
      order: {
        id: order.id,
        total: order.total,
        status: '2'
      },
      customerId,
      addressId,
      message: 'Commande créée avec succès'
    };
    
  } catch (error: any) {
    console.error('💥 Erreur fatale lors du checkout:', error);
    throw new Error(`Erreur checkout: ${error.message || 'Erreur inconnue'}`);
  }
};

export const getCustomerInfo = async (customerId: string): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}?output_format=XML&display=full`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    return {
      id: xmlDoc.querySelector('customer id')?.textContent?.trim() || customerId,
      email: xmlDoc.querySelector('customer email')?.textContent?.trim() || '',
      firstname: xmlDoc.querySelector('customer firstname')?.textContent?.trim() || '',
      lastname: xmlDoc.querySelector('customer lastname')?.textContent?.trim() || '',
    };
    
  } catch (error) {
    return {
      id: customerId,
      email: `client${customerId}@example.com`,
      firstname: 'Client',
      lastname: `#${customerId}`,
    };
  }
};

export const getDefaultCarrier = async (): Promise<any> => {
  try {
    const response = await api.get(`/carriers/${DEFAULT_CONFIG.CARRIER_ID}?output_format=XML`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    return {
      id: DEFAULT_CONFIG.CARRIER_ID,
      name: xmlDoc.querySelector('carrier name')?.textContent?.trim() || 'Transporteur standard',
      delay: xmlDoc.querySelector('carrier delay')?.textContent?.trim() || 'Livraison standard',
    };
    
  } catch (error) {
    return {
      id: DEFAULT_CONFIG.CARRIER_ID,
      name: 'Transporteur standard',
      delay: 'Livraison standard'
    };
  }
};