// src/services/duplication.service.ts
import api from '../api/api';
import { useAuth } from './useAuth';
import { processCheckout, type CartData } from './checkout.service';

const { getCustomerId } = useAuth();

/**
 * Récupère les produits d'une commande existante pour la duplication,
 * en incluant les détails de prix et de nom.
 * @param orderId - L'ID de la commande à inspecter.
 * @returns Un tableau de produits formaté pour le service de checkout.
 */
const getProductsFromOrder = async (orderId: string): Promise<CartData['products']> => {
  const response = await api.get(`/orders/${orderId}?output_format=XML&display=full`);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(response.data, 'text/xml');
  const productRows = xmlDoc.querySelectorAll('order_row');

  if (!productRows.length) {
    throw new Error(`Aucun produit trouvé pour la commande #${orderId}.`);
  }

  return Array.from(productRows).map(row => ({
    product_id: row.querySelector('product_id')?.textContent?.trim() || '',
    id_product_attribute: row.querySelector('product_attribute_id')?.textContent?.trim() || '0',
    quantity: parseInt(row.querySelector('product_quantity')?.textContent?.trim() || '1', 10),
    name: row.querySelector('product_name')?.textContent?.trim() || 'Produit',
    price: row.querySelector('unit_price_tax_incl')?.textContent?.trim() || '0',
  }));
};

/**
 * Duplique une commande un certain nombre de fois en utilisant le service de checkout existant.
 * Chaque nouvelle commande sera directement créée avec le statut "Paiement accepté".
 *
 * @param orderId - L'ID de la commande à dupliquer.
 * @param quantity - Le nombre de fois où la commande doit être dupliquée.
 * @returns Une promesse qui se résout avec les IDs des nouvelles commandes.
 */
export const duplicateOrder = async (orderId: string, quantity: number) => {
  console.log(`▶️ Lancement de la duplication pour la commande #${orderId}, ${quantity} fois.`);

  const customerId = getCustomerId();
  if (!customerId) {
    throw new Error('Client non authentifié.');
  }

  // 1. Récupérer les produits de la commande originale
  const products = await getProductsFromOrder(orderId);

  const duplicationPromises = [];

  for (let i = 0; i < quantity; i++) {
    const promise = (async () => {
      console.log(`  - Duplication ${i + 1}/${quantity}...`);

      // 2. Préparer les données pour le service de checkout
      const cartData: CartData = {
        customerId: customerId,
        products: products,
      };
      
      // 3. Appeler processCheckout qui gère la création du panier et de la commande
      // Le statut "Payée" (ID 2) est déjà défini par défaut dans createOrder.
      const newOrderResult = await processCheckout(cartData);
      
      if (!newOrderResult || !newOrderResult.order || !newOrderResult.order.id) {
        throw new Error('La création de la commande via le service de checkout a échoué.');
      }
      
      console.log(`  - Commande #${newOrderResult.order.id} créée avec le statut "Payée".`);

      return newOrderResult.order.id;
    })();
    duplicationPromises.push(promise);
  }

  // Attendre que toutes les duplications soient terminées
  const newOrderIds = await Promise.all(duplicationPromises);

  console.log(`✅ Duplication terminée. Commandes créées : ${newOrderIds.join(', ')}`);

  return {
    success: true,
    newOrderIds,
  };
};
