import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  auth: {
    username: '3GRNXCFZWTWID1J1LHIPAB5CTTE14W2X', // clé générée dans PrestaShop
    password: ''            // vide car PrestaShop utilise seulement la clé
  }
});

export default api;
