import api from '../api/api';

const CART_KEY  = 'ps_guest_cart_id';
const GUEST_KEY = 'ps_guest_id';
const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');

interface CartItem { id: string; quantity: number }

// Crée un enregistrement ps_guest et retourne son id
const createGuest = async (): Promise<string> => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <guest>
    <javascript>1</javascript>
    <mobile_theme>0</mobile_theme>
    <accept_language>fr-FR</accept_language>
  </guest>
</prestashop>`;

  const res = await api.post('/guests?output_format=XML', xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
  const id = parse(res.data).querySelector('guest id')?.textContent?.trim() || '';
  if (id) sessionStorage.setItem(GUEST_KEY, id);
  return id;
};

const getOrCreateGuestId = async (): Promise<string> => {
  const existing = sessionStorage.getItem(GUEST_KEY);
  if (existing) return existing;
  return createGuest();
};

const buildCartXml = (items: CartItem[], guestId: string, cartId?: string): string => {
  const rows = items.map(item => `
      <cart_row>
        <id_product>${item.id}</id_product>
        <id_product_attribute>0</id_product_attribute>
        <id_address_delivery>0</id_address_delivery>
        <id_customization>0</id_customization>
        <quantity>${item.quantity}</quantity>
      </cart_row>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    ${cartId ? `<id>${cartId}</id>` : ''}
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_carrier>1</id_carrier>
    <id_guest>${guestId}</id_guest>
    <id_address_delivery>0</id_address_delivery>
    <id_address_invoice>0</id_address_invoice>
    <associations>
      <cart_rows>${rows}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`;
};

export const guestCartService = {
  getCartId: (): string | null => sessionStorage.getItem(CART_KEY),

  clearCart() {
    sessionStorage.removeItem(CART_KEY);
    sessionStorage.removeItem(GUEST_KEY);
  },

  async sync(items: CartItem[]): Promise<void> {
    const headers = { 'Content-Type': 'text/xml; charset=utf-8' };

    try {
      const guestId = await getOrCreateGuestId();
      const cartId  = sessionStorage.getItem(CART_KEY);

      if (!cartId) {
        if (items.length === 0) return;
        const res = await api.post('/carts?output_format=XML', buildCartXml(items, guestId), { headers });
        const id = parse(res.data).querySelector('cart id')?.textContent?.trim();
        if (id) sessionStorage.setItem(CART_KEY, id);
      } else {
        await api.put(`/carts/${cartId}?output_format=XML`, buildCartXml(items, guestId, cartId), { headers });
      }
    } catch (err) {
      console.warn('Guest cart sync error:', err);
    }
  },
};
