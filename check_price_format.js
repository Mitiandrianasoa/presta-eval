import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const api = axios.create({
  baseURL: 'http://localhost/ETUDE/prestashop_edition_classic_version_8.2.6/api',
  auth: {
    username: 'bqHTFCOOgQIPEq03m6yZTUZt6iyhAwVG',
    password: ''
  }
});

async function check() {
  const res = await api.get('/products?schema=synopsis');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(res.data);
  const priceField = parsed.prestashop.product.price;
  console.log("Price field attributes:", priceField);
}

check().catch(console.error);
