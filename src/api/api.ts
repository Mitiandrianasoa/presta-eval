import axios from 'axios';
import { API_CONFIG } from './config';

const api = axios.create({
  baseURL: '/api',
  auth: {
    username: API_CONFIG.AUTH_KEY,
    password: ''
  }
});

export default api;
