# Implémentation Jour 1 — Comment le code a été fait

---

## Backoffice

---

### 1a — Protection des pages `/admin/*`

**Fichiers concernés :**
- `src/views/backoffice/catalog/CatalogView.vue`
- `src/views/backoffice/dashboard/DashboardView.vue`
- `src/views/backoffice/order/OrderView.vue`
- `src/router/index.ts`

**Approche choisie :** Garde locale dans chaque vue (pas de navigation guard globale).

**Mécanisme :**

```ts
// Dans CatalogView.vue
const isAuthenticated = ref(!!sessionStorage.getItem('admin_auth'));
```

Le `!!` convertit la valeur `sessionStorage` (string ou null) en booléen.  
Si `admin_auth` est absent → `false` → formulaire de login affiché.

**Template conditionnel :**
```html
<!-- Afficher le formulaire si non authentifié -->
<div v-if="!isAuthenticated" class="login-container">
  <!-- formulaire -->
</div>

<!-- Sinon le contenu admin -->
<div v-else>
  <Sidebar />
  <!-- contenu -->
</div>
```

**Identifiants hardcodés dans le code :**
```ts
const CREDENTIALS = [
  { username: 'admin', password: 'admin123', name: 'Administrateur' },
];
```

**Pré-remplissage du formulaire :**
```ts
const username = ref('admin');     // valeur par défaut visible dans le champ
const password = ref('admin123');  // valeur par défaut visible dans le champ
```

**Login :**
```ts
const handleLogin = () => {
  const match = CREDENTIALS.find(
    c => c.username === username.value && c.password === password.value
  );
  if (match) {
    isAuthenticated.value = true;
    sessionStorage.setItem('admin_auth', match.username);
    sessionStorage.setItem('admin_user', JSON.stringify({ name: match.name }));
  } else {
    error.value = 'Identifiants incorrects';
  }
};
```

**Persistance entre rechargements :**
```ts
onMounted(() => {
  const savedUser = sessionStorage.getItem('admin_user');
  if (savedUser) {
    currentUser.value = JSON.parse(savedUser);
  }
});
```

**Validation Entrée clavier :**
```ts
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') handleLogin();
};
```

---

### 1b — Page Réinitialiser les données

**Fichiers concernés :**
- `src/views/backoffice/config/ConfigView.vue`
- `src/services/rollback.ts`
- `src/router/index.ts` → route `/admin/config`

**Approche :** Interface de sélection de tables + rollback via API PS (DELETE sur chaque entité).

**Flux utilisateur :**
```
Utilisateur coche les tables à vider
    ↓
Clique "Réinitialiser"
    ↓
confirmMultipleReset() → boîte de confirmation
    ↓
executeMultipleReset()
    ↓
Pour chaque table : getAllIds() → DELETE sur chaque ID
```

**`getAllIds(resource)` dans `rollback.ts` :**
```ts
async function getAllIds(resource: string): Promise<string[]> {
  const res = await api.get(`/${resource}?output_format=JSON&display=[id]`);
  const data = res.data?.[resource];
  return Array.isArray(data) ? data.map((e: any) => String(e.id)) : [];
}
```

**`deleteResource(resource, id)` dans `rollback.ts` :**
```ts
async function deleteResource(resource: string, id: string): Promise<void> {
  await api.delete(`/${resource}/${id}`, { validateStatus: () => true });
}
```

**`shouldSkip(resource)` dans `rollback.ts` :** évite de supprimer les entités système PS
(catégorie racine, langue par défaut, etc.)

**Dans ConfigView.vue :**
```ts
const executeMultipleReset = async () => {
  for (const table of selectedTables.value) {
    const ids = await getAllIds(table);
    for (const id of ids) {
      await deleteResource(table, id);
    }
  }
};
```

---

### 1c — Import des 4 fichiers

**Fichiers concernés :**
- `src/views/backoffice/import/ImportView.vue` — orchestrateur principal (4 étapes)
- `src/views/backoffice/import/ImportProduits.vue` — fichier 1
- `src/views/backoffice/import/ImportDeclinaison.vue` — fichier 2
- `src/views/backoffice/import/ImportOrder.vue` — fichier 3
- `src/views/backoffice/import/ImportPhoto.vue` — fichier 4
- `src/services/fichier1ImportService.ts` — logique métier fichier 1
- `src/services/fichier2ImportService.ts` — logique métier fichier 2
- `src/services/fichier3ImportService.ts` — logique métier fichier 3
- `src/services/fichier4ImportService.ts` — logique métier fichier 4

**Interface globale — `ImportView.vue` :**

L'utilisateur dépose les 4 fichiers puis clique "Lancer l'import".  
Les 4 imports se font **en séquence** (pas en parallèle) car fichier 2 dépend de fichier 1.

```ts
const lancerImportation = async () => {
  setEtape(1, 'running');
  await importFichier1(rows1.value, log);  // produits
  setEtape(1, 'done');

  setEtape(2, 'running');
  await importFichier2(rows2.value, log);  // déclinaisons/stock
  setEtape(2, 'done');

  setEtape(3, 'running');
  await importFichier3(rows3.value, log);  // commandes
  setEtape(3, 'done');

  setEtape(4, 'running');
  await importFichier4(entries.value, log); // images
  setEtape(4, 'done');
};
```

**Parsing CSV avec PapaParse :**
```ts
const parseCsv = (file: File): Promise<Record<string, any>[]> =>
  new Promise((resolve, reject) =>
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data as Record<string, any>[]),
      error: err => reject(new Error(err.message)),
    })
  );
```

---

#### Fichier 1 — Produits (`fichier1ImportService.ts`)

**Étape 1 : Catégories**
```ts
// Déduplication avant import
const uniqueCategories = [...new Set(rows.map(r => col(r, 'categorie', 'Categorie')).filter(Boolean))];

for (const name of uniqueCategories) {
  const id = await createCategory(name);
  categoryMap.set(name, id);
}
```

**XML catégorie envoyé à PS :**
```xml
<category>
  <id_parent><![CDATA[2]]></id_parent>   <!-- 2 = catégorie racine "Home" -->
  <active><![CDATA[1]]></active>
  <name><language id="1"><![CDATA[Téléphones]]></language></name>
  <link_rewrite><language id="1"><![CDATA[telephones]]></language></link_rewrite>
</category>
```

**Étape 2 : Taxes**  
Pour chaque taux unique : créer `tax_rule_group` → créer `tax` → créer `tax_rule` qui lie les deux.

**Étape 3 : Produits**  
Conversion prix TTC → HT avant envoi à PS :
```ts
const priceHT = taxRate > 0 ? priceTTC * (1 - taxRate / 100) : priceTTC;
```
PS stocke les prix HT et applique la TVA à l'affichage.

---

#### Fichier 2 — Déclinaisons/Stock (`fichier2ImportService.ts`)

**Flux pour chaque ligne :**
```
1. findProductByRef(ref)         → GET /products?filter[reference]=T_01
2. loadAttrGroups()              → GET /product_options (Map nom→id en mémoire)
3. POST /product_options         → si groupe "Couleur" n'existe pas encore
4. loadAttrValues(idGroup)       → GET /product_option_values?filter[id_attribute_group]=5
5. POST /product_option_values   → si valeur "Noir" n'existe pas encore
6. loadCombinations(idProduct)   → GET /combinations?filter[id_product]=81
7. POST /combinations            → si la combo (produit+attribut) n'existe pas
8. setStock()                    → fetch('/stock-update') → stock_update.php
9. POST /specific_prices         → si prix_vente_ttc fourni
```

**Cache mémoire pour éviter les appels redondants :**
```ts
const attrGroupMap  = new Map<string, number>();    // "couleur" → 5
const attrValueCache = new Map<number, Map<string, number>>();  // idGroup → Map("noir" → 12)
const comboCache    = new Map<number, Map<number, number>>();   // idProduct → Map(idAttrValue → idCombo)
```

**Stock via PDO direct (pas le WS) :**  
Le WS PS retourne HTTP 405 sur PUT/POST de `stock_availables`.  
`stock_update.php` se connecte directement à MySQL avec les credentials lus dans `app/config/parameters.php`.

```ts
// Dans setStock()
const r = await fetch('/stock-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id_product: idProduct, id_product_attribute: idProductAttribute, quantity: qty }),
});
```

---

#### Fichier 3 — Commandes (`fichier3ImportService.ts`)

**Parsing de la colonne `achat` :**
Format spécial : `[("T_01";3;"ngoza"),("M_03";1;"")]`

```ts
export function parseAchat(raw: string): AchatItem[] {
  const regex = /\(\s*"?([^";)\s][^";)]*?)"?\s*;\s*(\d+)\s*;\s*"?([^";)]*?)"?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    items.push({ ref: m[1].trim(), qty: parseInt(m[2]) || 1, karazany: m[3].trim() });
  }
  return items;
}
```

**Flux par ligne :**
```
1. parseAchat(col(row, 'achat'))     → liste [{ref, qty, karazany}]
2. findCustomerByEmail(email)        → GET /customers?filter[email]=...
   → si 0 : POST /customers         → créer le client
3. createAddress(idCustomer, ...)    → POST /addresses
4. POST /carts                       → créer le panier PS
5. Pour chaque article :
   - findProductByRef(ref)           → GET /products?filter[reference]=...
   - findCombinationId(idProduct, karazany) → si déclinaison
   - getEffectivePrice(...)          → specific_price ou prix de base
   - POST /carts/{id}               → ajouter au panier (format PS WS)
6. Total calculé = Σ(priceHT × qty)
7. POST /orders avec le total calculé (pas celui du cart, toujours 0 dans PS WS)
8. decreaseStock() pour chaque article
```

**Pourquoi recalculer le total ?**  
`GET /carts/{id}` retourne `total_products = 0` — ces champs sont calculés par PS
lors du vrai checkout, pas exposés via le WS.

---

#### Fichier 4 — Images (`fichier4ImportService.ts`)

**Lecture du ZIP avec JSZip :**
```ts
const zip = await JSZip.loadAsync(file);
zip.forEach((relativePath, zipEntry) => {
  if (zipEntry.dir) return;
  if (relativePath.startsWith('__MACOSX')) return;  // artefact macOS
  const basename = relativePath.split('/').pop() || '';
  const ext = basename.split('.').pop()?.toLowerCase() || '';
  const ref = basename.split('.').slice(0, -1).join('.');  // nom sans extension = référence
  if (IMAGE_EXTS.includes(ext)) entries.push({ ref, filename: basename, ext });
});
```

**Upload image via WS PS :**
```ts
const form = new FormData();
form.append('image', blob, `${ref}.${ext}`);
await api.post(`/images/products/${productId}`, form, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

### 1d — Page Commandes (affichage + changement d'état)

**Fichiers concernés :**
- `src/views/backoffice/order/OrderView.vue` — wrapper
- `src/components/order/OrderList.vue` — liste + actions
- `src/components/order/OrderDetails.vue` — détail d'une commande
- `src/services/orderService.ts` — fetchAll, fetchOrderStates, updateState

**Chargement en parallèle :**
```ts
const [states, data] = await Promise.all([
  orderService.fetchOrderStates(),   // GET /order_states
  orderService.fetchAll(),           // GET /orders?display=full
]);
```

**Mise à jour de l'état — PUT XML :**
```ts
// orderService.updateState(orderId, newStateId)
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id><![CDATA[${orderId}]]></id>
    <current_state><![CDATA[${newStateId}]]></current_state>
  </order>
</prestashop>`;

await api.put(`/orders/${orderId}`, xml, { headers: XML_HEADERS });
```

**États disponibles :**
- `Dans le panier` (cart non finalisé)
- `Paiement effectué` 
- `Annulé`

Le `<select>` dans le template est lié à `orderStates` chargé depuis `/order_states`.

---

## Frontoffice

---

### 2a — Page d'accueil avec fiche produit

**Fichiers concernés :**
- `src/views/frontoffice/HomeView.vue`
- `src/views/frontoffice/product/ProductsView.vue`
- `src/views/frontoffice/product/ProductDetailView.vue`
- `src/components/FrontHeader.vue`

**Chargement des produits (`loadFeaturedProducts`) :**
```ts
// GET /products + GET /stock_availables en parallèle
const [pRes, stockRes] = await Promise.all([
  api.get('/products?output_format=XML&display=full&limit=100'),
  api.get('/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute,quantity]&limit=1000'),
]);
```

**Construction d'un stockMap pour accès O(1) :**
```ts
const stockMap: Record<string, number> = {};
stockXml.querySelectorAll('stock_available').forEach(el => {
  const pid   = el.querySelector('id_product')?.textContent?.trim() || '';
  const attrId = el.querySelector('id_product_attribute')?.textContent?.trim() || '0';
  const qty   = parseInt(el.querySelector('quantity')?.textContent?.trim() || '0');
  stockMap[`${pid}_${attrId}`] = qty;
});

// Accès : stockMap["81_0"] = stock du produit 81 sans combo
// Accès : stockMap["81_12"] = stock du produit 81, combinaison 12
```

**URL image produit :**
```ts
const imageId = el.querySelector('associations images image id')?.textContent?.trim();
image_url = imageId ? `/api/images/products/${productId}/${imageId}` : null;
```
→ Proxy Vite : `/api/images/products/81/45` → PS WS → image JPEG

**Fiche produit (`ProductDetailView.vue`) :**

Charge les combinaisons et construit une Map attribut → combinaison :
```ts
const loadCombinations = async (idProduct: number) => {
  const res = await api.get(`/combinations?filter[id_product]=${idProduct}&display=full&output_format=XML`);
  // Pour chaque combinaison :
  //   - id de la combinaison
  //   - valeurs d'attributs associées (couleur, taille...)
  //   - stock disponible via stockMap
};
```

Sélection d'attribut → mise à jour de la combinaison active :
```ts
const selectAttribute = (groupId: string, valueId: string) => {
  selectedAttributes.value[groupId] = valueId;
  updateSelectedCombination();
};

const updateSelectedCombination = () => {
  // Trouver la combinaison dont les attributs = selectedAttributes
  selectedCombination.value = combinations.value.find(c =>
    Object.values(selectedAttributes.value).every(v => c.attributeValues.includes(v))
  );
};
```

---

### 2b — Workflow d'achat complet

**Fichiers concernés :**
- `src/views/frontoffice/order/CartView.vue`
- `src/views/frontoffice/order/CheckoutView.vue`
- `src/views/frontoffice/order/OrderConfirmView.vue`
- `src/services/checkout.service.ts`

**Panier stocké dans localStorage :**
```ts
// Structure du panier
interface CartItem {
  id: string;             // id produit PS
  name: string;
  price: string;          // prix HT (string depuis PS WS)
  quantity: number;
  image_url: string | null;
  combination_id?: string;  // si combinaison sélectionnée
}

// Sauvegarde
localStorage.setItem('prestashop_cart', JSON.stringify(cart.value));

// Lecture
const saved = localStorage.getItem('prestashop_cart');
if (saved) cart.value = JSON.parse(saved);
```

**Total calculé côté client :**
```ts
const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
);
```
Le WS PS retourne toujours `total_products = 0` sur les carts.

**Checkout — `processCheckout()` dans `checkout.service.ts` :**
```ts
// 1. Adresse du client
const addressId = await getOrCreateAddress(customerId);

// 2. Créer le panier PS
const cartRes = await api.post('/carts?output_format=XML', xmlCart(customerId, '1', addressId), { headers: XML_HEADERS });
const cartId = tryExtractId(cartRes.data, 'cart');

// 3. Ajouter les produits
for (const p of cartData.products) {
  await api.post(`/carts/${cartId}`, xmlAddProduct(p.product_id, p.quantity), { headers: XML_HEADERS });
}

// 4. Total calculé côté client
const total = cartData.total ?? cartData.products.reduce((s, p) => s + parseFloat(p.price) * p.quantity, 0);

// 5. Créer la commande
const order = await createOrderWithSchema(cartId, customerId, customerToken, total, paymentMethod);
```

**Paiement à la livraison uniquement :**
```ts
const DEFAULT_CONFIG = {
  PAYMENT_METHOD: 'paiement_livraison',
  PAYMENT_MODULE: 'ps_cashondelivery',
};
```

**Pas de frais de livraison :**
```xml
<total_shipping><![CDATA[0.000000]]></total_shipping>
<total_shipping_tax_excl><![CDATA[0.000000]]></total_shipping_tax_excl>
<total_shipping_tax_incl><![CDATA[0.000000]]></total_shipping_tax_incl>
```

**Redirection si non connecté :**
```ts
// Dans CartView.vue
const startCheckout = () => {
  if (!isLoggedIn.value) {
    router.push('/login?redirect=/cart');
    return;
  }
  // continuer le checkout
};
```

---

### 2c — Mes commandes

**Fichiers concernés :**
- `src/views/frontoffice/order/OrderFrontView.vue`
- `src/views/frontoffice/order/OrderDetailView.vue`
- `src/services/orderService.ts`

**Chargement des commandes du client connecté :**
```ts
const loadOrders = async () => {
  const customerId = getCustomerId();  // depuis sessionStorage
  const res = await api.get(
    `/orders?filter[id_customer]=${customerId}&output_format=XML&display=full`
  );
  // parse XML → liste d'Order
};
```

**Affichage de l'état :**
```ts
const getStatusLabel = (stateId: string) => {
  const labels: Record<string, string> = {
    '1': 'En attente de paiement',
    '2': 'Paiement accepté',
    '6': 'Annulé',
    // ...
  };
  return labels[stateId] ?? `État ${stateId}`;
};
```

**Détail commande (`OrderDetailView.vue`) :**  
Charge en parallèle les lignes de commande, l'adresse de livraison et le transporteur.

```ts
const [orderDetail, address, carrier] = await Promise.all([
  loadOrderDetail(orderId),
  loadAddress(order.id_address_delivery),
  loadCarrier(order.id_carrier),
]);
```

---

## ExistingApp — PrestaShop backoffice

**Toutes les données importées sont visibles dans PS backoffice car :**
- Tous les imports passent par le WS PS (`POST /products`, `POST /customers`, etc.)
- PS stocke les données dans sa propre BDD MySQL
- Le backoffice PS les affiche nativement
- `stock_update.php` écrit directement dans `ps_stock_available`

**Impact des modifications PS → NewApp :**
- La NewApp lit toujours les données en temps réel via le WS PS (pas de cache local)
- Une modification dans PS backoffice (prix, nom, stock) est immédiatement visible dans la NewApp
