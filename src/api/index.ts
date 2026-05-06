import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/ETUDE/prestashop_edition_classic_version_8.2.6/api',
  auth: {
    username: '3GRNXCFZWTWID1J1LHIPAB5CTTE14W2X', // clé générée dans PrestaShop
    password: ''            // vide car PrestaShop utilise seulement la clé
  }
});

export default api;
