import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  auth: {
    username: 'bqHTFCOOgQIPEq03m6yZTUZt6iyhAwVG', // clé générée dans PrestaShop
    password: ''            // vide car PrestaShop utilise seulement la clé
  }
});

export default api;
