# 📦 Documentation — Module Commandes & Paniers

## Table des matières

1. [Structure des fichiers](#1-structure-des-fichiers)
2. [Les Services](#2-les-services)
3. [Les Pages (Views)](#3-les-pages-views)
4. [Configuration du router](#4-configuration-du-router)
5. [Comment ça marche — flux complet](#5-comment-ça-marche--flux-complet)
6. [Personnalisation rapide](#6-personnalisation-rapide)
7. [Résumé visuel](#7-résumé-visuel)

---

## 1. Structure des fichiers

```
src/
├── services/
│   ├── orderService.ts      ← Commandes (fetch, update, filter)
│   ├── cartService.ts       ← Paniers (fetch)
│   └── paymentService.ts    ← Paiements (résumé, format)
│
└── views/orders/
    ├── OrderList.vue        ← Liste de toutes les commandes
    ├── OrderDetails.vue     ← Détail d'une commande (composant réutilisable)
    ├── CanceledOrders.vue   ← Liste des commandes annulées uniquement
    └── CartList.vue         ← Liste des paniers actifs
```

---

## 2. Les Services

Les services sont des fichiers TypeScript **purs** (pas de Vue).
Ils s'occupent uniquement de **parler avec l'API PrestaShop** et de
**transformer les données XML** en objets utilisables.

### 2.1 `orderService.ts`

**Rôle** : tout ce qui concerne les commandes.

| Méthode | Ce qu'elle fait |
|---|---|
| `fetchOrderStates()` | Récupère tous les statuts (état 1, 2, 3…) depuis PrestaShop. Retourne des valeurs par défaut si l'API échoue. |
| `fetchAll()` | Récupère **toutes** les commandes. |
| `fetchCanceled()` | Appelle `fetchAll()` puis filtre celles dont `current_state === '6'` (annulées). |
| `fetchOne(id)` | Récupère **une seule** commande par son ID. |
| `updateOrder(id, data)` | Met à jour n'importe quel champ d'une commande (délègue à `updateResource`). |
| `updateState(id, state)` | Raccourci pour changer l'état d'une commande. |
| `updatePayment(id, method)` | Raccourci pour changer la méthode de paiement. |
| `getStateLabel(states, id)` | Donne le nom lisible d'un statut à partir de son ID. |
| `ensureStateInList(states, id)` | Ajoute l'état courant à la liste s'il n'y est pas (évite les selects vides). |

**Constante importante** :
```ts
export const CANCELED_STATE_ID = '6';
```
> ⚠️ Si dans votre boutique l'état "Annulée" n'est pas le `6`,
> changez juste cette valeur ici. Tout le reste suit automatiquement.

---

### 2.2 `cartService.ts`

**Rôle** : récupérer les paniers PrestaShop.

| Méthode | Ce qu'elle fait |
|---|---|
| `fetchAll()` | Récupère tous les paniers avec leurs produits. |
| `fetchOne(id)` | Récupère un panier par son ID. |
| `fetchByCustomer(customerId)` | Filtre les paniers d'un client précis. |

Chaque panier contient :
- `id`, `id_customer`, `id_currency`, `id_lang`, `date_add`, `date_upd`
- `products[]` → liste de `{ id_product, id_product_attribute, quantity }`

---

### 2.3 `paymentService.ts`

**Rôle** : tout ce qui concerne les paiements.

| Méthode | Ce qu'elle fait |
|---|---|
| `fetchPaidOrders(stateId?)` | Récupère les commandes dont l'état = `stateId` (défaut : `'3'` = payé). |
| `getPaymentSummary()` | Retourne un tableau récapitulatif groupé par méthode de paiement avec totaux. |
| `updatePayment(id, method)` | Met à jour la méthode de paiement (délègue à `orderService`). |
| `formatAmount(amount)` | Formate un nombre en euros : `12500.5` → `"12 500,50 €"`. |

**Liste des méthodes de paiement disponibles** (modifiable) :
```ts
export const PAYMENT_METHODS = [
  'Paiement à la livraison',
  'Carte bancaire',
  'Virement bancaire',
  'Chèque',
  'PayPal',
];
```
> Pour ajouter/retirer une méthode, modifiez uniquement ce tableau.

---

## 3. Les Pages (Views)

### 3.1 `OrderList.vue` — Liste principale

**Ce qu'elle fait** :
- Charge toutes les commandes + tous les statuts au montage (`onMounted`)
- Affiche un tableau avec : référence, nom client, total, paiement, état, date
- Permet de **changer l'état** d'une commande directement via le `<select>`
- Bouton **"Détails"** → affiche `OrderDetails` en dessous du tableau
- Bouton **"Commandes annulées"** → navigue vers `/orders/canceled`

**Props reçus** : aucun (page autonome)

**Événements** : aucun (page racine)

---

### 3.2 `OrderDetails.vue` — Détail d'une commande

**Ce qu'elle fait** :
- Reçoit un `orderId` et la liste `orderStates` en props
- Charge les détails de la commande via `orderService.fetchOne()`
- Permet de modifier **l'état** et le **paiement** depuis des `<select>`
- Affiche le tableau des **articles commandés**
- Émet `@close` (fermeture) et `@updated` (après modification, pour recharger)

**Props** :
```ts
orderId: string       // ID de la commande à afficher
orderStates: OrderState[]  // Liste des statuts (fournie par le parent)
```

**Événements émis** :
```ts
emit('close')    // l'utilisateur clique ✕
emit('updated')  // une modification a été sauvegardée
```

> Ce composant est **réutilisable** : il est utilisé dans `OrderList.vue`
> et dans `CanceledOrders.vue` sans aucun changement.

---

### 3.3 `CanceledOrders.vue` — Commandes annulées

**Ce qu'elle fait** :
- Appelle `orderService.fetchCanceled()` qui retourne uniquement les commandes avec `current_state === '6'`
- Affiche le même tableau qu'`OrderList` mais avec un thème rouge
- La colonne "Date" affiche `date_upd` (= date de la dernière modification = date d'annulation)
- Bouton **"← Retour"** → revient sur `/orders`

---

### 3.4 `CartList.vue` — Paniers

**Ce qu'elle fait** :
- Charge tous les paniers via `cartService.fetchAll()`
- Barre de recherche filtrée par ID panier ou ID client
- Chaque panier est une **carte cliquable** → au clic, un tableau des produits s'affiche en dessous (animation slide)
- Affiche : ID panier, ID client, nombre de produits, quantité totale, dates

---

## 4. Configuration du router

Ajoutez ces routes dans votre fichier `router/index.ts` :

```ts
import OrderList      from '@/views/orders/OrderList.vue';
import CanceledOrders from '@/views/orders/CanceledOrders.vue';
import CartList       from '@/views/orders/CartList.vue';

const routes = [
  // ... vos routes existantes

  {
    path: '/orders',
    name: 'OrderList',
    component: OrderList,
  },
  {
    path: '/orders/canceled',
    name: 'CanceledOrders',
    component: CanceledOrders,
  },
  {
    path: '/carts',
    name: 'CartList',
    component: CartList,
  },
];
```

> `OrderDetails.vue` **n'a pas besoin de route** car c'est un composant
> intégré dans les pages, pas une page à part entière.

---

## 5. Comment ça marche — flux complet

### Charger et afficher les commandes

```
Utilisateur ouvre /orders
      ↓
OrderList.vue → onMounted → loadData()
      ↓
  Promise.all([
    orderService.fetchOrderStates(),   → GET /order_states?...  → parse XML → OrderState[]
    orderService.fetchAll(),           → GET /orders?...        → parse XML → Order[]
  ])
      ↓
Données stockées dans les refs Vue → tableau s'affiche
```

### Changer l'état d'une commande

```
Utilisateur choisit un état dans le <select>
      ↓
handleSelectChange → updateState(orderId, newState)
      ↓
orderService.updateState() → orderService.updateOrder()
      ↓
updateResource('orders', id, { current_state: newState })
      ↓
PUT /orders/:id (via schemaService)
      ↓
loadData() → tableau rechargé
```

### Voir les commandes annulées

```
Utilisateur clique "Commandes annulées"
      ↓
router.push('/orders/canceled')
      ↓
CanceledOrders.vue → onMounted → loadData()
      ↓
orderService.fetchCanceled()
  = orderService.fetchAll()
    .filter(o => o.current_state === '6')
      ↓
Tableau des commandes annulées uniquement
```

### Voir un panier

```
Utilisateur ouvre /carts
      ↓
CartList.vue → cartService.fetchAll()
      ↓
GET /carts?output_format=XML&display=full
      ↓
Parse XML → Cart[] avec products[]
      ↓
Utilisateur clique sur une carte
      ↓
expandedCartId = cart.id → transition slide → produits visibles
```

---

## 6. Personnalisation rapide

| Ce que vous voulez changer | Où modifier |
|---|---|
| ID de l'état "Annulée" | `orderService.ts` → constante `CANCELED_STATE_ID` |
| Ajouter une méthode de paiement | `paymentService.ts` → tableau `PAYMENT_METHODS` |
| Changer l'état "Payé" | `paymentService.ts` → paramètre de `fetchPaidOrders()` |
| Changer la langue de formatage des dates | Dans chaque `.vue` → `toLocaleDateString('fr-FR')` |
| Changer la devise | `paymentService.ts` → `formatAmount()` → `currency: 'EUR'` |
| Largeur du sidebar déployé | Dans chaque `.vue` → `margin-left: 250px` |
| Largeur du sidebar réduit | Dans chaque `.vue` → `margin-left: 70px` |

---

## 7. Résumé visuel

```
┌─────────────────────────────────────────────────────┐
│  SERVICES (src/services/)                           │
│                                                     │
│  orderService.ts ──→ API PrestaShop /orders         │
│  cartService.ts  ──→ API PrestaShop /carts          │
│  paymentService.ts ─→ utilise orderService          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  VUES (src/views/orders/)                           │
│                                                     │
│  OrderList.vue                                      │
│    └── OrderDetails.vue (composant réutilisable)    │
│                                                     │
│  CanceledOrders.vue                                 │
│    └── OrderDetails.vue (même composant)            │
│                                                     │
│  CartList.vue                                       │
└─────────────────────────────────────────────────────┘
```

---

> **Note** : `OrderDetails.vue` n'importe **jamais** `orderService` directement
> pour les états — il reçoit la liste `orderStates` via props depuis son parent.
> Cela évite de refaire un appel API supplémentaire.
