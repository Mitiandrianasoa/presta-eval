# Architecture du projet — presta-eval

## Vue d'ensemble

Application web **Vue 3** qui pilote un PrestaShop 8.x via son Web Service (API REST/XML).  
Elle se compose de deux interfaces :

- **Backoffice** (`/admin/*`) — interface d'administration : import de données, gestion des commandes, tableau de bord
- **Frontoffice** (`/`, `/home`, `/products`, `/cart`, `/orders`) — boutique cliente : catalogue, panier, commandes

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Framework UI | Vue 3 (Composition API) | Rendu réactif, composants |
| Routeur | Vue Router 5 | Navigation SPA |
| État global | Pinia | Stores partagés entre composants |
| HTTP | Axios | Requêtes vers le WS PrestaShop |
| Build | Vite 8 | Dev server, proxy, bundling |
| Typage | TypeScript 6 | Sécurité de type |
| CSV parsing | PapaParse | Lecture des fichiers CSV d'import |
| XML parsing | DOMParser (natif) + fast-xml-parser | Lecture des réponses XML de PS |
| ZIP | JSZip | Extraction des images depuis `images.zip` |

---

## Structure des dossiers

```
src/
├── api/
│   ├── api.ts            # Instance Axios (baseURL=/api, auth Basic)
│   ├── config.ts         # Clé API PrestaShop (AUTH_KEY)
│   └── schemaService.ts  # Fetch/parse des schémas XML du WS PS
├── components/           # Composants réutilisables
│   ├── order/            # OrderList, CanceledOrders, CartList, PaymentList
│   ├── product/          # ProductForm, productList, AddCategoryModal
│   ├── stock/            # StockList
│   ├── category/         # CategoryForm, CategoryList
│   ├── customer/         # CustomerList
│   ├── FrontHeader.vue   # En-tête frontoffice (panier, nav)
│   ├── CsvUploader.vue   # Composant d'upload de fichier CSV
│   └── Sidebar.vue       # Barre latérale backoffice
├── router/
│   └── index.ts          # Définition de toutes les routes
├── services/             # Logique métier (aucun état Vue ici)
│   ├── csvParserUtils.ts         # Parseurs de date, prix, taxe, slug
│   ├── fichier1ImportService.ts  # Import produits
│   ├── fichier2ImportService.ts  # Import déclinaisons/stock
│   ├── fichier3ImportService.ts  # Import commandes
│   ├── fichier4ImportService.ts  # Import images (ZIP)
│   ├── checkout.service.ts       # Workflow de commande frontoffice
│   ├── cartService.ts            # Gestion panier localStorage
│   ├── orderService.ts           # Lecture/mise à jour commandes PS
│   ├── paymentService.ts         # Gestion paiements
│   ├── useAuth.ts                # Authentification (sessionStorage)
│   └── rollback.ts               # Annulation en cas d'erreur import
├── stores/               # Pinia stores
│   ├── product/productStore.ts
│   ├── category/CategoryStore.ts
│   ├── stock/stockStore.ts
│   ├── customer/customerStore.ts
│   └── ...
├── utils/
│   └── prestashopXmlBuilder.ts   # Constructeurs XML génériques
└── views/
    ├── backoffice/               # Pages admin
    │   ├── dashboard/DashboardView.vue
    │   ├── import/               # ImportProduits, ImportDeclinaison, ImportOrder, ImportPhoto
    │   ├── order/OrderView.vue
    │   ├── catalog/CatalogView.vue
    │   └── stock/StockMvt.vue
    └── frontoffice/              # Pages boutique
        ├── HomeView.vue
        ├── auth/UserPickerView.vue, LoginView.vue
        ├── product/ProductsView.vue, ProductDetailView.vue
        └── order/CartView.vue, CheckoutView.vue, OrderFrontView.vue
```

---

## Proxy Vite — Comment les requêtes arrivent à PrestaShop

```
Navigateur → /api/products
    ↓ (Vite proxy)
http://localhost:8081/EVALUATION/prestashop_edition_classic_version_8.2.6/api/products
    + Header Authorization: Basic <base64(AUTH_KEY:)>
```

**Configuration dans `vite.config.ts` :**
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8081/EVALUATION/prestashop_edition_classic_version_8.2.6',
      changeOrigin: true,
      headers: {
        'Authorization': 'Basic ' + Buffer.from('bqHTFCOOgQIPEq03m6yZTUZt6iyhAwVG:').toString('base64')
      }
    }
  }
}
```

La clé API (sans mot de passe) est encodée en Base64 et envoyée dans chaque requête HTTP.

---

## Authentification

### Backoffice (Admin)
- Formulaire login avec email/mot de passe PrestaShop pré-remplis
- Appel `GET /customers?filter[email]=...` pour vérifier les credentials
- Session stockée dans `sessionStorage` via `useAuth.ts`
- Garde de route Vue Router : si `!isLoggedIn`, redirect vers `/login?redirect=...`

### Frontoffice (Client)
- Page d'accueil = `UserPickerView` : liste tous les clients PS, clic = login automatique
- Option "utilisateur anonyme" : panier disponible sans compte
- Session client en `sessionStorage` (`prestashop_token`, `prestashop_user`)
- Panier en `localStorage` (`prestashop_cart`) — persiste entre sessions

---

## Flux d'import des données

```
Fichier CSV/ZIP uploadé
    ↓ (PapaParse / JSZip)
Tableau de lignes JS (Record<string,any>[])
    ↓ (col() — lecture insensible à la casse)
Extraction des champs métier
    ↓ (parseFlexibleDate / parseFlexiblePrice / parseTaxRate)
Normalisation des formats
    ↓ (xmlProduct() / xmlCategory() / etc.)
Construction du XML PrestaShop
    ↓ (api.post() / postEntity())
POST vers le Web Service PS
    ↓ (tryExtractId() sur la réponse)
Récupération de l'ID créé
    ↓ (onLog callback)
Affichage du log en temps réel dans l'UI
```

---

## Flux du panier et de la commande

```
Utilisateur clique "Ajouter au panier"
    ↓
cartService.ts : sauvegarde dans localStorage
    ↓
CartView.vue : affichage + calcul du total (sum price × qty)
    ↓
"Commander" → vérification isLoggedIn
    → non : redirect /login?redirect=/cart
    → oui : processCheckout()
        ↓
checkout.service.ts :
    1. POST /carts → créer panier PS
    2. POST /cart/{id} → ajouter produits
    3. POST /orders → créer commande avec total calculé côté client
    4. (stock movement log)
        ↓
OrderConfirmView.vue : confirmation
```

**Pourquoi le total est calculé côté client ?**  
Le Web Service PrestaShop retourne `total_products = 0` sur les carts — ces champs sont calculés
côté PS lors du checkout réel, pas exposés en lecture via l'API.

---

## Gestion du stock — Contrainte PS WS

Le WS PrestaShop est **en lecture seule** pour `stock_availables` :
- `GET /stock_availables` : autorisé
- `PUT /stock_availables/{id}` : HTTP 405 Method Not Allowed
- `POST /stock_availables` : HTTP 405 Method Not Allowed

**Solution** : fichier PHP `stock_update.php` placé à la racine PrestaShop.  
Il se connecte **directement en PDO** à la base MySQL (credentials lus depuis `app/config/parameters.php`)
et fait un UPSERT sur la table `ps_stock_available`.

```
fichier2ImportService.ts
    ↓ fetch('/stock-update', { method: 'POST', body: {id_product, id_product_attribute, quantity} })
Vite proxy → stock_update.php (port 8081)
    ↓ PDO → MySQL
    UPDATE/INSERT ps_stock_available
    + synchronisation du stock parent (pour les combinaisons)
```

---

## Séparation des responsabilités

| Couche | Fait quoi | Exemples |
|--------|-----------|---------|
| `views/` | Affichage, gestion des events utilisateur | `ImportProduits.vue`, `CartView.vue` |
| `services/` | Logique métier, appels API, transformation de données | `fichier1ImportService.ts`, `checkout.service.ts` |
| `stores/` | État global Pinia (cache des données PS) | `productStore.ts`, `stockStore.ts` |
| `api/` | Configuration HTTP, auth | `api.ts`, `config.ts` |
| `utils/` | Fonctions pures sans effet de bord | `prestashopXmlBuilder.ts` |
| `components/` | Composants réutilisables entre views | `OrderList.vue`, `productList.vue` |
