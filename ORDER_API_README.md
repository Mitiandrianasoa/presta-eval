# Configuration API - Commandes PrestaShop

## 🔧 Structure Simplifiée

### 1. Configuration Centralisée
- **Fichier:** `src/api/config.ts`
- **Contenu:** Clé API et endpoints
- **Usage:** Imported dans `src/api/api.ts`

### 2. Axios Centralisé
- **Fichier:** `src/api/api.ts`
- **Configuration:** Auth via clé API (une seule fois)
- **Proxy:** Configuré dans `vite.config.ts`

### 3. Service Généraliste
- **Fichier:** `src/services/orderService.ts`
- **Fonctions:** 
  - `fetchOrderStates()` - Récupère tous les statuts
  - `fetchAll()` - Toutes les commandes
  - `fetchOne(id)` - Une commande par ID
  - `updateState(id, state)` - Change l'état
  - `updatePayment(id, method)` - Change le paiement
  - `getStateLabel(states, id)` - Label lisible

### 4. Composants Simples
- **OrderList.vue** - Liste avec sélection d'état
- **OrderDetails.vue** - Détails + modification paiement

---

## 🚀 Avantages de cette structure

✅ **Une seule clé API** - Centralisée dans `config.ts`  
✅ **Pas de duplication** - Axios créé une seule fois  
✅ **Pas de CORS** - Proxy Vite gère tout automatiquement  
✅ **Service réutilisable** - Utilisable partout dans l'app  
✅ **Code léger** - Composants minimalistes  

---

## 📊 Architecture

```
api.config.ts (Clé API)
    ↓
api.ts (Axios centralisé)
    ↓
orderService.ts (Fonctions métier)
    ↓
OrderList.vue + OrderDetails.vue (UI)
```

---

## 🔄 Flux de Données

### Chargement des commandes:
```
OrderList.vue onMounted()
  → orderService.fetchOrderStates()
  → orderService.fetchAll()
  → Affiche tableau avec statuts
```

### Modification état:
```
Utilisateur change dropdown
  → updateState(orderId, newState)
  → API update
  → Recharge liste
  → Affiche succès
```

---

## 🛠️ Si tu veux ajouter quelque chose

1. **Nouvelle fonction dans le service:**
   ```typescript
   export const orderService = {
     async myNewFunction() { ... }
   }
   ```

2. **Utiliser dans un composant:**
   ```typescript
   import { orderService } from '../../services/orderService';
   await orderService.myNewFunction();
   ```

3. **Pas besoin de store, proxy, auth à reconfigurer!**

---

## ⚡ Notes Importantes

- **Proxy Vite (dev):** Automatique, voir `vite.config.ts`
- **Production:** Besoin d'un vrai proxy backend ou CORS activé
- **Clé API:** À garder secrète en production (backend seulement)
