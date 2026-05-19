import { computed } from 'vue';

// Types (dupliqués pour l'instant pour la clarté, pourraient être centralisés)
interface OrderProduct {
  id: string;
  attribute_id?: string;
  quantity: number;
}

interface Order {
  id: string;
  isCancelled?: boolean;
  products: OrderProduct[];
  current_state?: string; 
}

interface StockAvailable {
  id: string;
  id_product: string;
  id_product_attribute: string;
  quantity: number;
}

interface ProductCacheItem {
  price: number;
  wholesale_price: number;
  category_id: string;
}

interface CategoryStat {
  id: string;
  name: string;
  totalVentesHT: number;
  totalAchat: number;
  benefice: number;
  marge: number;
}

interface CategoryStockStat {
  id: string;
  name: string;
  availableQuantity: number;
  reservedQuantity: number;
  physicalQuantity: number;
}

/**
 * Calcule les statistiques de bénéfice pour chaque catégorie.
 */
export function calculateCategoryBenefitStats(
  activeOrders: Order[],
  productCache: Record<string, ProductCacheItem>,
  categoryCache: Record<string, string>
): CategoryStat[] {
  console.log('[StatsService] Début du calcul des bénéfices par catégorie.');

  return Object.keys(categoryCache)
    .map(catId => {
      let totalVentesHT = 0;
      let totalAchat = 0;
      const logDetails: string[] = [];

      activeOrders.forEach(order => {
        order.products.forEach(product => {
          const productInfo = productCache[product.id];
          if (productInfo && productInfo.category_id === catId) {
            const quantity = product.quantity || 0;
            const price = productInfo.price || 0;
            const wholesalePrice = productInfo.wholesale_price || 0;
            
            const vente = price * quantity;
            const achat = wholesalePrice * quantity;

            totalVentesHT += vente;
            totalAchat += achat;
            
            logDetails.push(`  - Commande #${order.id}, Produit #${product.id}: qté=${quantity}, vente=${vente.toFixed(2)}, achat=${achat.toFixed(2)}`);
          }
        });
      });

      const benefice = totalVentesHT - totalAchat;
      const marge = totalVentesHT > 0 ? (benefice / totalVentesHT) * 100 : 0;

      if (totalVentesHT > 0 || totalAchat > 0) {
        console.log(`[StatsService] Catégorie [${catId}] ${categoryCache[catId]}: VentesHT=${totalVentesHT.toFixed(2)}, Achat=${totalAchat.toFixed(2)}, Bénéfice=${benefice.toFixed(2)}`);
        logDetails.forEach(log => console.log(log));
      }

      return {
        id: catId,
        name: categoryCache[catId] || `Catégorie #${catId}`,
        totalVentesHT,
        totalAchat,
        benefice,
        marge,
      };
    })
    .filter(stat => stat.totalVentesHT > 0 || stat.totalAchat > 0)
    .sort((a, b) => b.benefice - a.benefice);
}

/**
 * Calcule les statistiques de stock pour chaque catégorie.
 */
export function calculateCategoryStockStats(
  activeOrders: Order[],
  productCache: Record<string, ProductCacheItem>,
  categoryCache: Record<string, string>,
  stockAvailables: StockAvailable[]
): CategoryStockStat[] {
  console.log('[StatsService] Début du calcul des stocks par catégorie.');

  return Object.keys(categoryCache)
    .map(catId => {
      let availableQuantity = 0;
      let reservedQuantity = 0;
      const logDispo: string[] = [];
      const logReserve: string[] = [];

      // Calcul du stock disponible (uniquement pour l'attribut produit 0)
      const dispoPerProduct: Record<string, number> = {};
      stockAvailables
        .filter(stock => stock.id_product_attribute === '0')
        .forEach(stock => {
          const productInfo = productCache[stock.id_product];
          if (productInfo && productInfo.category_id === catId) {
            const qte = stock.quantity || 0;
            dispoPerProduct[stock.id_product] = (dispoPerProduct[stock.id_product] || 0) + qte;
          }
        });
      Object.entries(dispoPerProduct).forEach(([productId, qte]) => {
        availableQuantity += qte;
        logDispo.push(`  - Stock dispo pour produit #${productId}: qté=${qte}`);
      });

      // Calcul du stock réservé (uniquement pour les commandes non livrées)
      const DELIVERED_STATE_ID = '5';
      const reservePerProduct: Record<string, number> = {};
      activeOrders
        .filter(order => order.current_state !== DELIVERED_STATE_ID)
        .forEach(order => {
          order.products.forEach(product => {
            const productInfo = productCache[product.id];
            if (productInfo && productInfo.category_id === catId) {
              const qte = product.quantity || 0;
              reservePerProduct[product.id] = (reservePerProduct[product.id] || 0) + qte;
            }
          });
        });
      Object.entries(reservePerProduct).forEach(([productId, qte]) => {
        reservedQuantity += qte;
        logReserve.push(`  - Stock réservé pour produit #${productId}: qté=${qte}`);
      });
      
      const physicalQuantity = availableQuantity + reservedQuantity;

      if (physicalQuantity > 0) {
        console.log(`[StatsService] Catégorie [${catId}] ${categoryCache[catId]}: Dispo=${availableQuantity}, Réservé=${reservedQuantity}, Physique=${physicalQuantity}`);
        if(logDispo.length > 0) {
          console.log("  Détails stock disponible:");
          logDispo.forEach(log => console.log(log));
        }
        if(logReserve.length > 0) {
          console.log("  Détails stock réservé:");
          logReserve.forEach(log => console.log(log));
        }
      }

      return {
        id: catId,
        name: categoryCache[catId] || `Catégorie #${catId}`,
        availableQuantity,
        reservedQuantity,
        physicalQuantity,
      };
    })
    .filter(stat => stat.physicalQuantity > 0)
    .sort((a, b) => b.physicalQuantity - a.physicalQuantity);
}
