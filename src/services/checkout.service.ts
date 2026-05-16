// src/services/checkout.service.ts
import api from '../api/api';
import { useAuth } from '../services/useAuth';

// ============================================
// CONFIGURATION
// ============================================
const DEFAULT_CONFIG = {
  CARRIER_ID: '1',
  PAYMENT_METHOD: 'paiement_livraison',
  PAYMENT_MODULE: 'ps_cashondelivery',
  CURRENCY_ID: '2', // Euro
  LANG_ID: '2', // Français
};

export interface CartProduct {
  product_id: string;
  quantity: number;
  id_product_attribute?: string;
  name?: string;
  price?: string;
  image_url?: string;
  combination_name?: string;
  combination_reference?: string;
}

export interface CartData {
  products: CartProduct[];
  customerId?: string;
  carrierId?: string;
  paymentMethod?: string;
}

// ============================================
// FONCTIONS
// ============================================

const getCustomerSecureKey = async (customerId: string): Promise<string> => {
  try {
    const response = await api.get(`/customers/${customerId}?output_format=XML`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const secureKey = xmlDoc.querySelector('customer secure_key')?.textContent?.trim();
    return secureKey || '00000000000000000000000000000000';
  } catch (error) {
    return '00000000000000000000000000000000';
  }
};

const getOrCreateAddress = async (customerId: string): Promise<string> => {
  try {
    const response = await api.get(
      `/addresses?output_format=XML&filter[id_customer]=[${customerId}]&display=full`
    );
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const addressElements = xmlDoc.querySelectorAll('addresses address');
    
    if (addressElements.length > 0) {
      const addressId = addressElements[0].querySelector('id')?.textContent?.trim();
      if (addressId) return addressId;
    }
    
    const customerResponse = await api.get(`/customers/${customerId}?output_format=XML`);
    const customerDoc = parser.parseFromString(customerResponse.data, 'text/xml');
    
    const firstname = customerDoc.querySelector('customer firstname')?.textContent?.trim() || 'Client';
    const lastname = customerDoc.querySelector('customer lastname')?.textContent?.trim() || 'Test';
    
    const addressXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${customerId}</id_customer>
    <id_country>8</id_country>
    <alias>Mon adresse</alias>
    <lastname>${lastname}</lastname>
    <firstname>${firstname}</firstname>
    <address1>1 rue de Paris</address1>
    <postcode>75001</postcode>
    <city>Paris</city>
    <phone>0612345678</phone>
    <phone_mobile>0612345678</phone_mobile>
  </address>
</prestashop>`;

    const createResponse = await api.post('/addresses?output_format=XML', addressXml, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
    });
    
    const addressDoc = parser.parseFromString(createResponse.data, 'text/xml');
    return addressDoc.querySelector('address id')?.textContent?.trim() || '1';
    
  } catch (error) {
    console.error('Erreur adresse:', error);
    return '1';
  }
};

const createCartWithProducts = async (
  customerId: string,
  products: CartProduct[],
  addressId: string
): Promise<string> => {
  const cartRowsXml = products.map(product => `
    <cart_row>
      <id_product>${product.product_id}</id_product>
      <id_product_attribute>${product.id_product_attribute || '0'}</id_product_attribute>
      <id_address_delivery>${addressId}</id_address_delivery>
      <quantity>${product.quantity}</quantity>
    </cart_row>
  `).join('');

  const cartXml = `<?xml version="1.0" encoding="UTF-8"?>
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

  console.log('📦 Création du panier...');
  
  const response = await api.post('/carts?output_format=XML', cartXml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
  });

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(response.data, 'text/xml');
  const cartId = xmlDoc.querySelector('cart id')?.textContent?.trim();
  
  if (!cartId) throw new Error('ID du panier non trouvé');
  console.log(`✅ Panier créé: ${cartId}`);
  return cartId;
};

/**
 * Récupère les totaux du panier depuis l'API PrestaShop
 */
const getCartTotals = async (cartId: string): Promise<{ totalHT: number; totalTTC: number }> => {
  console.log(`💰 Récupération des totaux du panier ${cartId}`);
  
  try {
    const response = await api.get(`/carts/${cartId}?output_format=XML&display=full`);
    const parser = new DOMParser();
    const cartDoc = parser.parseFromString(response.data, 'text/xml');
    
    const totalProductsWt = parseFloat(cartDoc.querySelector('cart total_products_wt')?.textContent?.trim() || '0');
    const totalProducts = parseFloat(cartDoc.querySelector('cart total_products')?.textContent?.trim() || '0');
    const conversionRate = parseFloat(cartDoc.querySelector('cart conversion_rate')?.textContent?.trim() || '1');
    
    console.log(`   Total TTC: ${totalProductsWt}`);
    console.log(`   Total HT: ${totalProducts}`);
    console.log(`   Taux conversion: ${conversionRate}`);
    
    return {
      totalHT: totalProducts,
      totalTTC: totalProductsWt
    };
    
  } catch (error) {
    console.error('Erreur récupération totaux:', error);
    return { totalHT: 0, totalTTC: 0 };
  }
};

/**
 * Crée la commande avec tous les champs requis
 */
const createOrder = async (
  cartId: string,
  customerId: string,
  customerSecureKey: string,
  addressId: string,
  totalHT: number,
  totalTTC: number
): Promise<string> => {
  console.log(`📋 Création de la commande pour le panier ${cartId}`);
  console.log(`💰 Total HT: ${totalHT.toFixed(6)}`);
  console.log(`💰 Total TTC: ${totalTTC.toFixed(6)}`);
  
  const formattedHT = totalHT.toFixed(6);
  const formattedTTC = totalTTC.toFixed(6);
  
  // XML complet avec tous les champs requis
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
    <payment>${DEFAULT_CONFIG.PAYMENT_METHOD}</payment>
    <conversion_rate>1.000000</conversion_rate>
    <total_discounts>0.000000</total_discounts>
    <total_discounts_tax_incl>0.000000</total_discounts_tax_incl>
    <total_discounts_tax_excl>0.000000</total_discounts_tax_excl>
    <total_paid>${formattedTTC}</total_paid>
    <total_paid_tax_incl>${formattedTTC}</total_paid_tax_incl>
    <total_paid_tax_excl>${formattedHT}</total_paid_tax_excl>
    <total_paid_real>${formattedTTC}</total_paid_real>
    <total_products>${formattedHT}</total_products>
    <total_products_wt>${formattedTTC}</total_products_wt>
    <total_shipping>0.000000</total_shipping>
    <total_shipping_tax_incl>0.000000</total_shipping_tax_incl>
    <total_shipping_tax_excl>0.000000</total_shipping_tax_excl>
    <carrier_tax_rate>0.000</carrier_tax_rate>
    <secure_key>${customerSecureKey}</secure_key>
    <valid>1</valid>
  </order>
</prestashop>`;

  console.log('📄 Envoi de la commande...');
  
  const response = await api.post('/orders?output_format=XML', orderXml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
  });
  
  const parser = new DOMParser();
  const orderDoc = parser.parseFromString(response.data, 'text/xml');
  
  let orderId = orderDoc.querySelector('order id')?.textContent?.trim();
  if (!orderId) {
    orderId = orderDoc.querySelector('id')?.textContent?.trim();
  }
  
  if (!orderId) {
    console.error('Réponse API:', response.data);
    throw new Error('ID commande non trouvé');
  }
  
  console.log(`✅ Commande créée: ${orderId}`);
  return orderId;
};

// ============================================
// FONCTION PRINCIPALE
// ============================================

export const processCheckout = async (cartData: CartData): Promise<any> => {
  console.log('🚀 DÉMARRAGE DU CHECKOUT');
  console.log('📦 Produits:', cartData.products.length);
  
  try {
    const { getCustomerId } = useAuth();
    const customerId = cartData.customerId || getCustomerId();
    
    // Afficher les produits avec leurs combinaisons
    let totalCalculated = 0;
    for (const product of cartData.products) {
      const combinationInfo = product.id_product_attribute && product.id_product_attribute !== '0'
        ? ` (déclinaison: ${product.combination_name || product.id_product_attribute})`
        : '';
      const price = parseFloat(product.price) || 0;
      const subtotal = price * product.quantity;
      totalCalculated += subtotal;
      console.log(`   - ${product.name}${combinationInfo}: ${product.quantity} x ${price.toFixed(2)}€ = ${subtotal.toFixed(2)}€`);
    }
    console.log(`💰 Total calculé (frontend): ${totalCalculated.toFixed(2)} EUR`);
    
    // Récupérer le secure_key
    const customerSecureKey = await getCustomerSecureKey(customerId);
    console.log(`🔑 Secure key: ${customerSecureKey.substring(0, 8)}...`);
    
    // Récupérer ou créer une adresse
    const addressId = await getOrCreateAddress(customerId);
    console.log(`📍 Adresse ID: ${addressId}`);
    
    // Créer le panier
    const cartId = await createCartWithProducts(customerId, cartData.products, addressId);
    
    // Attendre que PrestaShop traite le panier
    console.log('⏳ Attente du traitement du panier par PrestaShop...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Récupérer les totaux calculés par PrestaShop
    let totals = await getCartTotals(cartId);
    
    // Si les totaux sont à 0, utiliser le calcul frontend
    if (totals.totalTTC === 0 && totalCalculated > 0) {
      console.warn('⚠️ Totaux API à 0, utilisation du calcul frontend');
      totals = {
        totalHT: totalCalculated / 1.056, // Estimation HT (TVA ~5.6%)
        totalTTC: totalCalculated
      };
    }
    
    console.log(`💰 Totaux utilisés: HT=${totals.totalHT.toFixed(2)}, TTC=${totals.totalTTC.toFixed(2)}`);
    
    // Créer la commande
    const orderId = await createOrder(cartId, customerId, customerSecureKey, addressId, totals.totalHT, totals.totalTTC);
    
    // Vider le panier local
    localStorage.removeItem('prestashop_cart');
    
    console.log(`🎉 SUCCÈS! Commande #${orderId} - ${totals.totalTTC.toFixed(2)} EUR TTC`);
    
    return {
      success: true,
      cartId,
      order: {
        id: orderId,
        total: totals.totalTTC.toString(),
        totalHT: totals.totalHT.toString(),
        status: '2',
        currency: 'EUR'
      },
      message: 'Commande créée avec succès'
    };
    
  } catch (error: any) {
    console.error('💥 Erreur:', error.response?.data || error);
    throw new Error(`Erreur checkout: ${error.message}`);
  }
};

export const getCustomerInfo = async (customerId: string): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}?output_format=XML`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    return {
      id: customerId,
      email: xmlDoc.querySelector('customer email')?.textContent?.trim() || '',
      firstname: xmlDoc.querySelector('customer firstname')?.textContent?.trim() || '',
      lastname: xmlDoc.querySelector('customer lastname')?.textContent?.trim() || '',
    };
  } catch (error) {
    return { id: customerId, email: '', firstname: 'Client', lastname: '' };
  }
};

export const getDefaultCarrier = async (): Promise<any> => {
  return { id: '1', name: 'Transporteur standard', delay: 'Livraison standard' };
};