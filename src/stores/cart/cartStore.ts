import { defineStore } from 'pinia';
import api from '../../api/api';
import { createResourceWithBlankSchema, updateResource } from '../../api/schemaService';

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const text  = (el: Element, tag: string) => el.querySelector(tag)?.textContent?.trim() || '';

export interface CartItem {
  id_product: string;
  id_product_attribute: string;
  quantity: number;
  product_name?: string;
  product_price?: number;
  product_image?: string;
}

export interface Cart {
  id: string;
  id_customer: string;
  id_currency: string;
  id_lang: string;
  id_carrier: string;
  id_address_delivery: string;
  id_address_invoice: string;
  items: CartItem[];
  total_products: number;
  total_shipping: number;
  total: number;
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    cart: null as Cart | null,
    cartId: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    itemCount: (state) =>
      state.cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,

    totalAmount: (state) => state.cart?.total ?? 0,
  },

  actions: {
    // ── Création d'un panier vide via schema blank ────────────────
    async createCart(idCustomer: string, idCurrency = '1', idLang = '1') {
      this.loading = true;
      this.error = null;
      try {
        const result = await createResourceWithBlankSchema('carts', {
          id_customer:         idCustomer,
          id_currency:         idCurrency,
          id_lang:             idLang,
          id_carrier:          '0',
          id_address_delivery: '0',
          id_address_invoice:  '0',
        });

        // L'ID du panier créé
        const newId = result?.cart?.id ?? result?.id ?? null;
        if (newId) {
          this.cartId = String(newId);
          this.saveCartId(String(newId));
          await this.fetchCart(this.cartId);
        }
        return newId;
      } catch (e: any) {
        this.error = e.message;
        console.error('createCart error:', e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // ── Récupération d'un panier existant ─────────────────────────
    async fetchCart(cartId: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/carts/${cartId}?output_format=XML&display=full`);
        const xmlDoc = parse(res.data);
        const cartEl = xmlDoc.querySelector('cart');
        if (!cartEl) throw new Error('Cart not found in XML');

        const rows = Array.from(
          cartEl.querySelectorAll('associations cart_rows cart_row, associations cart_row, associations row')
        );

        const items: CartItem[] = rows.map(row => ({
          id_product: text(row, 'id_product'),
          id_product_attribute: text(row, 'id_product_attribute'),
          quantity: parseInt(text(row, 'quantity')) || 1,
        })).filter(item => item.id_product);

        this.cart = {
          id:                  text(cartEl, 'id'),
          id_customer:         text(cartEl, 'id_customer'),
          id_currency:         text(cartEl, 'id_currency'),
          id_lang:             text(cartEl, 'id_lang'),
          id_carrier:          text(cartEl, 'id_carrier'),
          id_address_delivery: text(cartEl, 'id_address_delivery'),
          id_address_invoice:  text(cartEl, 'id_address_invoice'),
          items,
          total_products: 0,
          total_shipping: 0,
          total: 0,
        };
        this.cartId = this.cart.id;

        // Enrichir les items avec les données produits
        await this._enrichItems();
      } catch (e: any) {
        this.error = e.message;
        console.error('fetchCart error:', e);
      } finally {
        this.loading = false;
      }
    },

    // ── Mise à jour du panier (carrier, adresse…) ─────────────────
    async updateCart(data: Record<string, any>) {
      if (!this.cartId) return;
      try {
        await updateResource('carts', this.cartId, data);
        await this.fetchCart(this.cartId);
      } catch (e: any) {
        this.error = e.message;
        throw e;
      }
    },

    // ── Ajout d'un produit ────────────────────────────────────────
    async addItem(idProduct: string, quantity = 1, idProductAttribute = '0') {
      if (!this.cartId) throw new Error('Aucun panier actif');
      try {
        // Mise à jour via PUT XML complet
        const existing = this.cart?.items.find(
          i => i.id_product === idProduct && i.id_product_attribute === idProductAttribute
        );
        const newQty = (existing?.quantity ?? 0) + quantity;
        await this._putCartRow(idProduct, idProductAttribute, newQty);
        await this.fetchCart(this.cartId);
      } catch (e: any) {
        this.error = e.message;
        throw e;
      }
    },

    // ── Modification de quantité ──────────────────────────────────
    async updateItemQty(idProduct: string, quantity: number, idProductAttribute = '0') {
      if (!this.cartId) return;
      try {
        if (quantity <= 0) {
          await this.removeItem(idProduct, idProductAttribute);
          return;
        }
        await this._putCartRow(idProduct, idProductAttribute, quantity);
        await this.fetchCart(this.cartId);
      } catch (e: any) {
        this.error = e.message;
        throw e;
      }
    },

    // ── Suppression d'un produit ──────────────────────────────────
    async removeItem(idProduct: string, idProductAttribute = '0') {
      if (!this.cartId) return;
      try {
        await this._putCartRow(idProduct, idProductAttribute, 0);
        await this.fetchCart(this.cartId);
      } catch (e: any) {
        this.error = e.message;
        throw e;
      }
    },

    // ── Vider le panier ───────────────────────────────────────────
    clearLocalCart() {
      this.cart = null;
      this.cartId = null;
      localStorage.removeItem('prestashop_cart_id');
    },

    // ── Persistance de l'ID panier ────────────────────────────────
    saveCartId(id: string) {
      this.cartId = id;
      localStorage.setItem('prestashop_cart_id', id);
    },

    loadSavedCartId(): string | null {
      const saved = localStorage.getItem('prestashop_cart_id');
      if (saved) this.cartId = saved;
      return saved;
    },

    // ── PRIVÉ : PUT une row d'association cart ────────────────────
    async _putCartRow(idProduct: string, idProductAttribute: string, quantity: number) {
      if (!this.cartId) return;

      // GET XML complet
      const getRes = await api.get(`/carts/${this.cartId}?output_format=XML`);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(getRes.data, 'text/xml');
      const cartEl = xmlDoc.querySelector('cart');
      if (!cartEl) throw new Error('Element <cart> introuvable');

      // Trouver ou créer le noeud associations > cart_rows
      let assocEl = cartEl.querySelector('associations');
      if (!assocEl) {
        assocEl = xmlDoc.createElement('associations');
        cartEl.appendChild(assocEl);
      }

      let rowsEl = assocEl.querySelector('cart_rows');
      if (!rowsEl) {
        rowsEl = xmlDoc.createElement('cart_rows');
        assocEl.appendChild(rowsEl);
      }

      // Chercher la row existante
      const rows = Array.from(rowsEl.querySelectorAll('cart_row'));
      let targetRow = rows.find(r => {
        const pid  = r.querySelector('id_product')?.textContent?.trim();
        const patt = r.querySelector('id_product_attribute')?.textContent?.trim();
        return pid === idProduct && patt === idProductAttribute;
      });

      if (quantity <= 0) {
        // Supprimer la row
        if (targetRow) rowsEl.removeChild(targetRow);
      } else {
        if (!targetRow) {
          targetRow = xmlDoc.createElement('cart_row');
          const pid = xmlDoc.createElement('id_product');
          pid.textContent = idProduct;
          const patt = xmlDoc.createElement('id_product_attribute');
          patt.textContent = idProductAttribute;
          const qty = xmlDoc.createElement('quantity');
          qty.textContent = String(quantity);
          targetRow.appendChild(pid);
          targetRow.appendChild(patt);
          targetRow.appendChild(qty);
          rowsEl.appendChild(targetRow);
        } else {
          const qtyEl = targetRow.querySelector('quantity');
          if (qtyEl) qtyEl.textContent = String(quantity);
        }
      }

      const serializer = new XMLSerializer();
      const modifiedXml = serializer.serializeToString(xmlDoc);

      await api.put(`/carts/${this.cartId}?output_format=JSON`, modifiedXml, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      });
    },

    // ── PRIVÉ : Enrichir les items avec nom/prix/image produit ────
    async _enrichItems() {
      if (!this.cart?.items.length) return;
      let totalProducts = 0;

      for (const item of this.cart.items) {
        // Ignorer silencieusement si c'est un produit ID=0 (produit fantôme PrestaShop parfois généré)
        if (!item.id_product || item.id_product === '0') {
           continue; 
        }

        try {
          const res = await api.get(
            `/products/${item.id_product}?output_format=XML&display=full`
          );
          const doc = parse(res.data);
          const pEl = doc.querySelector('product');
          if (!pEl) {
            // Produit non trouvé, on utilise les données existantes
            console.warn(`⚠️ Produit ${item.id_product} non trouvé, données manquantes`);
            if (item.product_price) {
              totalProducts += item.product_price * item.quantity;
            }
            continue;
          }

          const price = parseFloat(
            pEl.querySelector('price')?.textContent?.trim() || '0'
          );
          const imgId =
            pEl.querySelector('associations images image id')?.textContent?.trim() || '';
          const name = pEl.querySelector('name language')?.textContent?.trim() || '';

          // Mettre à jour les données du produit
          if (name) item.product_name = name;
          if (price) item.product_price = price;
          if (imgId) {
            item.product_image = `/api/images/products/${item.id_product}/${imgId}`;
          }

          // Le stock ne supprime pas le produit du panier!
          // On ajoute juste le prix au total
          totalProducts += (item.product_price ?? 0) * item.quantity;
        } catch (err) {
          // Produit inaccessible, on GARDE le produit dans le panier
          console.warn(`⚠️ Erreur récupération produit ${item.id_product}:`, err);
          if (item.product_price) {
            totalProducts += item.product_price * item.quantity;
          }
        }
      }

      this.cart.total_products = totalProducts;
      this.cart.total = totalProducts + (this.cart.total_shipping ?? 0);
    },
  },
});