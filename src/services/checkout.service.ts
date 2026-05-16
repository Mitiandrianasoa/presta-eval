// src/services/checkout.service.ts - Version simplifiée sans mise à jour

import api from '../api/api';
import { useAuth } from '../services/useAuth';

// ============================================
// CONFIGURATION
// ============================================
const DEFAULT_CONFIG = {
  CARRIER_ID: '1',
  PAYMENT_METHOD: 'paiement_livraison',
  PAYMENT_MODULE: 'ps_cashondelivery',
  CURRENCY_ID: '2',//EURO
  LANG_ID: '2',//FRENCH

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
    
    // Créer une adresse en France
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
  </address>
</prestashop>`;

    const createResponse = await api.post('/addresses?output_format=XML', addressXml, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
    });
    
    const addressDoc = parser.parseFromString(createResponse.data, 'text/xml');
    return addressDoc.querySelector('address id')?.textContent?.trim() || '1';
    
  } catch (error) {
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
    <id_currency>2</id_currency>
    <id_lang>2</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>1</id_carrier>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <associations>
      <cart_rows>${cartRowsXml}</cart_rows>
    </associations>
  </cart>
</prestashop>`;

  const response = await api.post('/carts?output_format=XML', cartXml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
  });

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(response.data, 'text/xml');
  const cartId = xmlDoc.querySelector('cart id')?.textContent?.trim();
  
  if (!cartId) throw new Error('ID du panier non trouvé');
  return cartId;
};




// checkout.service.ts - Version avec vérification du produit

const getProductRealPrice = async (productId: string): Promise<number> => {
  console.log(`🔍 Récupération du prix réel du produit ${productId}`);
  
  try {
    const response = await api.get(`/products/${productId}?output_format=XML&display=full`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    // Récupérer le prix TTC
    const price = xmlDoc.querySelector('product price')?.textContent?.trim();
    const wholesalePrice = xmlDoc.querySelector('product wholesale_price')?.textContent?.trim();
    
    console.log(`   Prix catalogue: ${price}`);
    console.log(`   Prix wholesale: ${wholesalePrice}`);
    
    return parseFloat(price || '0');
    
  } catch (error) {
    console.error('Erreur récupération prix:', error);
    return 0;
  }
};

const createOrder = async (
  cartId: string,
  customerId: string,
  customerSecureKey: string,
  addressId: string,
  products: CartProduct[]
): Promise<string> => {
  // Récupérer les prix réels depuis l'API
  let totalAmount = 0;
  
  for (const product of products) {
    const realPrice = await getProductRealPrice(product.product_id);
    const productTotal = realPrice * product.quantity;
    totalAmount += productTotal;
    console.log(`   Produit ${product.product_id}: prix réel=${realPrice} x ${product.quantity} = ${productTotal}`);
  }
  
  console.log(`💰 Total réel (API): ${totalAmount}`);
  
  const formattedTotal = totalAmount.toFixed(6);
  
  const orderXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_cart>${cartId}</id_cart>
    <id_currency>2</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>${DEFAULT_CONFIG.CURRENCY_ID}</id_carrier>
    <current_state>2</current_state>
    <module>ps_cashondelivery</module>
    <payment>paiement_livraison</payment>
    <conversion_rate>1.000000</conversion_rate>
    <total_paid>${formattedTotal}</total_paid>
    <total_paid_real>${formattedTotal}</total_paid_real>
    <total_products>${formattedTotal}</total_products>
    <total_products_wt>${formattedTotal}</total_products_wt>
    <total_shipping>0.000000</total_shipping>
    <secure_key>${customerSecureKey}</secure_key>
    <valid>1</valid>
  </order>
</prestashop>`;

  const response = await api.post('/orders?output_format=XML', orderXml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'application/xml' }
  });
  
  const parser = new DOMParser();
  const orderDoc = parser.parseFromString(response.data, 'text/xml');
  const orderId = orderDoc.querySelector('order id')?.textContent?.trim();
  
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
    
    // Calculer le total
    const totalAmount = cartData.products.reduce((sum, product) => {
      const price = parseFloat(product.price as string) || 0;
      return sum + price * product.quantity;
    }, 0);
    
    console.log(`💰 Total à payer: ${totalAmount} EUR`);
    
    // Afficher les détails des produits
    cartData.products.forEach(p => {
      console.log(`   - ${p.name}: ${p.quantity} x ${p.price} = ${parseFloat(p.price) * p.quantity} EUR`);
    });
    
    // Récupérer le secure_key
    const customerSecureKey = await getCustomerSecureKey(customerId);
    
    // Récupérer ou créer une adresse
    const addressId = await getOrCreateAddress(customerId);
    console.log(`📍 Adresse ID: ${addressId}`);
    
    // Créer le panier
    const cartId = await createCartWithProducts(customerId, cartData.products, addressId);
    console.log(`🛒 Panier ID: ${cartId}`);
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Créer la commande directement avec le bon montant
    const orderId = await createOrder(cartId, customerId, customerSecureKey, addressId, cartData.products);
    
    // Vider le panier local
    localStorage.removeItem('prestashop_cart');
    
    console.log(`🎉 SUCCÈS! Commande #${orderId} - ${totalAmount} EUR`);
    
    return {
      success: true,
      cartId,
      order: {
        id: orderId,
        total: totalAmount.toString(),
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