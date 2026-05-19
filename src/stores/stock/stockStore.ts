import { defineStore } from 'pinia';
import api from '../../api/api';

const parse = (xml: string) =>
  new DOMParser().parseFromString(xml, 'text/xml');

const text = (el: Element, tag: string) =>
  el.querySelector(tag)?.textContent?.trim() || '';

export interface Stock {
  id: string;
  id_product: string;
  id_product_attribute: string;

  quantity: number;

  price_te: number;

  product_name?: string;
  combination_name?: string;
}

export interface StockMovement {
  date: string;
  employee: string;
  quantity: number;
  reason?: string;
}

export const useStockStore = defineStore('stock', {
  state: () => ({
    stocks: [] as Stock[],
    stockMovements: [] as StockMovement[],
    loading: false,
    error: null as string | null,
  }),

  actions: {

    // =====================================================
    // FETCH STOCKS
    // =====================================================

    async fetchAll() {
      this.loading = true;
      this.error = null;

      try {

        const [sRes, pRes, cRes, ovRes] =
          await Promise.all([

            api.get(
              '/stock_availables?output_format=XML&display=full&limit=5000'
            ),

            api.get(
              '/products?output_format=XML&display=[id,name,price]&limit=5000'
            ),

            api.get(
              '/combinations?output_format=XML&display=full&limit=5000'
            ),

            api.get(
              '/product_option_values?output_format=XML&display=full&limit=5000'
            ),
          ]);

        // =========================================
        // Produits
        // =========================================

        const productMap: Record<string, string> = {};

        const productPriceMap: Record<string, number> = {};

        parse(pRes.data)
          .querySelectorAll('product')
          .forEach(el => {

            const id = text(el, 'id');

            const name =
              el.querySelector('name language')
                ?.textContent
                ?.trim() || '';

            const price =
              parseFloat(text(el, 'price')) || 0;

            productMap[id] = name;

            productPriceMap[id] = price;
          });

        // =========================================
        // Valeurs attributs
        // =========================================

        const optionValueMap: Record<string, string> = {};

        parse(ovRes.data)
          .querySelectorAll('product_option_value')
          .forEach(el => {

            const id = text(el, 'id');

            const name =
              el.querySelector('name language')
                ?.textContent
                ?.trim() || '';

            optionValueMap[id] = name;
          });

        // =========================================
        // Déclinaisons
        // =========================================

        const combinationNameMap: Record<string, string> = {};

        parse(cRes.data)
          .querySelectorAll('combination')
          .forEach(el => {

            const id = text(el, 'id');

            const valueIds = Array.from(
              el.querySelectorAll(
                'product_option_values product_option_value id'
              )
            ).map(v => v.textContent?.trim() || '');

            const names =
              valueIds
                .map(vId => optionValueMap[vId])
                .filter(Boolean);

            if (names.length > 0) {
              combinationNameMap[id] =
                names.join(' / ');
            }
          });

        // =========================================
        // Stocks
        // =========================================

        this.stocks = Array.from(
          parse(sRes.data)
            .querySelectorAll('stock_available')
        ).map(el => {

          const idProduct =
            text(el, 'id_product');

          const idAttr =
            text(el, 'id_product_attribute');

          return {

            id:
              text(el, 'id'),

            id_product:
              idProduct,

            id_product_attribute:
              idAttr,

            quantity:
              parseInt(text(el, 'quantity')) || 0,

            price_te:
              productPriceMap[idProduct] || 0,

            product_name:
              productMap[idProduct]
              || `Produit #${idProduct}`,

            combination_name:
              idAttr !== '0'
                ? (
                    combinationNameMap[idAttr]
                    || `Déclinaison #${idAttr}`
                  )
                : undefined,
          };
        });

      } catch (e: any) {

        console.error(e);

        this.error =
          `Erreur chargement : ${e.message}`;

      } finally {

        this.loading = false;
      }
    },

    // =====================================================
    // CREATE STOCK MOVEMENT
    // =====================================================

    async createStockMovement(params: {
      stock: Stock;
      oldQuantity: number;
      newQuantity: number;
      employeeId?: number;
    }) {

      const {
        stock,
        oldQuantity,
        newQuantity,
        employeeId = 1
      } = params;

      const diff =
        newQuantity - oldQuantity;

      if (diff === 0) return;

      const sign =
        diff > 0 ? 1 : -1;

      const physicalQuantity =
        Math.abs(diff);

      const reasonId =
        sign > 0 ? 1 : 2;

      const priceTe =
        stock.price_te || 0;

      const idProductAttribute =
        stock.id_product_attribute || '0';

      if (!stock.id_product) {
        throw new Error('id_product manquant');
      }

      if (!stock.id) {
        throw new Error('id_stock manquant');
      }

      if (physicalQuantity <= 0) {
        throw new Error('physical_quantity invalide');
      }

      const now = new Date();

      const sqlDate =
        now
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ');

      const formattedPriceTe =
        Number(priceTe || 0).toFixed(6);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_mvt>
    <id_product><![CDATA[${stock.id_product}]]></id_product>
    <id_product_attribute><![CDATA[${idProductAttribute}]]></id_product_attribute>
    <id_warehouse><![CDATA[0]]></id_warehouse>
    <id_currency><![CDATA[2]]></id_currency>
    <id_employee><![CDATA[${employeeId}]]></id_employee>
    <id_stock><![CDATA[${stock.id}]]></id_stock>
    <id_stock_mvt_reason><![CDATA[${reasonId}]]></id_stock_mvt_reason>
    <physical_quantity><![CDATA[${physicalQuantity}]]></physical_quantity>
    <sign><![CDATA[${sign}]]></sign>
    <price_te><![CDATA[${formattedPriceTe}]]></price_te>
    <date_add><![CDATA[${sqlDate}]]></date_add>
  </stock_mvt>
</prestashop>`;

      await api.post('/stock_movements?output_format=XML', xml, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'application/xml'
        }
      });
    },

    async getStockForProduct(
      idProduct: string,
      idProductAttribute: string = '0'
    ): Promise<Stock | null> {
      if (this.stocks.length === 0) {
        await this.fetchAll();
      }

      const normalizedAttr = idProductAttribute || '0';

      return (
        this.stocks.find(
          stock =>
            stock.id_product === idProduct &&
            stock.id_product_attribute === normalizedAttr
        ) ||
        this.stocks.find(
          stock =>
            stock.id_product === idProduct &&
            stock.id_product_attribute === '0'
        ) ||
        null
      );
    },

    // =====================================================
    // UPDATE QUANTITY
    // =====================================================

    async updateQuantity(
  id: string,
  quantity: number
) {
  try {
    const stock = this.stocks.find(s => s.id === id);

    if (!stock) {
      throw new Error(`Stock ${id} introuvable`);
    }

    const oldQuantity = stock.quantity;

    if (oldQuantity === quantity) {
      return;
    }

    // =====================================
    // Créer mouvement
    // =====================================

    await this.createStockMovement({
      stock,
      oldQuantity,
      newQuantity: quantity,
      employeeId: 1
    });

    // =====================================
    // Récupérer les données complètes du stock
    // pour avoir TOUTES les valeurs actuelles
    // =====================================
    
    let dependsOnStock = '0';
    let idWarehouse = '0';
    let outOfStock = '0';
    let location = '';
    
    try {
      const stockRes = await api.get(`/stock_availables/${stock.id}?output_format=XML&display=full`);
      const stockDoc = parse(stockRes.data);
      
      dependsOnStock = stockDoc.querySelector('stock_available depends_on_stock')?.textContent?.trim() || '0';
      idWarehouse = stockDoc.querySelector('stock_available id_warehouse')?.textContent?.trim() || '0';
      outOfStock = stockDoc.querySelector('stock_available out_of_stock')?.textContent?.trim() || '0';
      location = stockDoc.querySelector('stock_available location')?.textContent?.trim() || '';
    } catch (e) {
      console.warn('⚠️ Impossible de récupérer les détails complets du stock');
    }

    // =====================================
    // Update stock_available avec TOUS les champs
    // =====================================

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id><![CDATA[${stock.id}]]></id>
    <id_product><![CDATA[${stock.id_product}]]></id_product>
    <id_product_attribute><![CDATA[${stock.id_product_attribute || 0}]]></id_product_attribute>
    <id_warehouse><![CDATA[${idWarehouse}]]></id_warehouse>
    <id_shop><![CDATA[1]]></id_shop>
    <id_shop_group><![CDATA[0]]></id_shop_group>
    <quantity><![CDATA[${quantity}]]></quantity>
    <depends_on_stock><![CDATA[${dependsOnStock}]]></depends_on_stock>
    <out_of_stock><![CDATA[${outOfStock}]]></out_of_stock>
    <location><![CDATA[${location}]]></location>
  </stock_available>
</prestashop>`;

    console.log('📤 Mise à jour stock:', xml.substring(0, 300) + '...');

    const response = await api.put(
      `/stock_availables/${id}`,
      xml,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8'
        }
      }
    );

    // Mettre à jour la quantité locale
    stock.quantity = quantity;
    
    console.log(`✅ Stock ${id} mis à jour: ${oldQuantity} → ${quantity}`);

  } catch (error: any) {
    console.error('updateQuantity error:', error.response?.data || error);

    this.error = `Erreur mise à jour : ${error.response?.status || error.message}`;

    throw error;
  }
},

    // =====================================================
// FETCH STOCK MOVEMENTS
// =====================================================

async fetchStockMovements(
  idStock: string,
  limit: number = 100
) {
  try {
    console.log(`🔍 Récupération des mouvements pour le stock ${idStock}`);
    
    const stock = this.stocks.find(s => s.id === idStock);
    if (!stock) {
      console.error(`❌ Stock ${idStock} non trouvé`);
      this.stockMovements = [];
      return;
    }

    // Récupérer les mouvements avec pagination
    let allMovements: any[] = [];
    let offset = 0;
    const pageLimit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const url = `/stock_movements?output_format=XML`;
      console.log(`📡 Page ${Math.floor(offset / pageLimit) + 1}: ${url}`);
      const response = await api.get(url);
      const xmlDoc = parse(response.data);
      const movements = xmlDoc.querySelectorAll('stock_mvt');
      
      if (movements.length === 0) {
        hasMore = false;
        break;
      }
      
      // Filtrer pour ce stock
      const filtered = Array.from(movements).filter(mvt => {
        const mvtIdStock = mvt.querySelector('id_stock')?.textContent?.trim();
        return mvtIdStock === idStock;
      });
      
      allMovements = [...allMovements, ...filtered];
      
      // Si on a trouvé assez de mouvements ou si la page est incomplète, on arrête
      if (allMovements.length >= limit || movements.length < pageLimit) {
        hasMore = false;
      } else {
        offset += pageLimit;
      }
    }
    
    console.log(`📊 ${allMovements.length} mouvements trouvés pour le stock ${idStock}`);
    
    if (allMovements.length === 0) {
      this.stockMovements = [{
        date: new Date().toISOString().slice(0, 10),
        employee: '—',
        quantity: 0,
        reason: 'Aucun mouvement enregistré',
      }];
      return;
    }
    
    // Limiter au nombre demandé
    const limitedMovements = allMovements.slice(0, limit);
    
    this.stockMovements = limitedMovements.map((mvt: any) => ({
      date: (mvt.querySelector('date_add')?.textContent?.trim() || '').split(' ')[0] || 'Date inconnue',
      employee: [
        mvt.querySelector('employee_firstname')?.textContent?.trim(),
        mvt.querySelector('employee_lastname')?.textContent?.trim()
      ].filter(Boolean).join(' ') || '—',
      quantity: (parseInt(mvt.querySelector('physical_quantity')?.textContent || '0')) * 
                (parseInt(mvt.querySelector('sign')?.textContent || '1')),
      reason: (() => {
        const reasonMap: Record<string, string> = {
          '1': 'Augmentation', '2': 'Diminution',
          '3': 'Commande client', '4': 'Régularisation'
        };
        const id = mvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || '';
        return reasonMap[id] || `Raison #${id}`;
      })()
    }));
    
  } catch (error: any) {
    console.error('Erreur fetchStockMovements:', error);
    this.stockMovements = [];
  }
},
  

// Dans useStockStore, ajoutez cette action :

async fetchAllMovements(limit: number = 500) {
  try {
    const allMvts: any[] = [];
    let offset = 0;
    const pageLimit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const url = `/stock_movements?output_format=XML&display=full`;
      const response = await api.get(url);
      const xmlDoc = parse(response.data);
      const movements = xmlDoc.querySelectorAll('stock_mvt');
      
      if (movements.length === 0) {
        hasMore = false;
        break;
      }
      
      allMvts.push(...Array.from(movements));
      
      if (allMvts.length >= limit || movements.length < pageLimit) {
        hasMore = false;
      } else {
        offset += pageLimit;
      }
    }
    
    return allMvts;
  } catch (error) {
    console.error('Erreur fetchAllMovements:', error);
    return [];
  }
}

  }
});