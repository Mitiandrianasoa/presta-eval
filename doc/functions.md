# Toutes les fonctions du projet — Référence complète

---

## 1. `csvParserUtils.ts` — Parseurs de données CSV

Ce fichier contient des fonctions pures (sans effets de bord) utilisées dans tous les services d'import.

---

### `parseFlexibleDate(raw: string | number): string`

**But** : Convertit n'importe quel format de date en `YYYY-MM-DD` (format attendu par PrestaShop).

**Formats supportés :**
| Entrée | Sortie |
|--------|--------|
| `"2025-12-01"` | `"2025-12-01"` |
| `"01/12/2025"` | `"2025-12-01"` |
| `"01-Dec-2025"` | `"2025-12-01"` |
| `"01 décembre 2025"` | `"2025-12-01"` |
| `"December 01, 2025"` | `"2025-12-01"` |
| `1735689600` (timestamp Unix) | `"2025-01-01"` |
| `"01/12/25"` (2 chiffres) | `"2025-12-01"` |

**Logique interne :**
1. Teste le format ISO (`YYYY-MM-DD`)
2. Teste `DD/MM/YYYY` (priorité française quand jour > 12)
3. Teste `DD/MM/YY` (année 2 chiffres → < 50 = 20xx, ≥ 50 = 19xx)
4. Teste les formats textuels (`"01 décembre 2025"`)
5. Teste timestamp Unix (10 ou 13 chiffres)
6. Fallback : `Date.parse()`

**Utilisation :**
```ts
import { parseFlexibleDate } from './csvParserUtils';

parseFlexibleDate("01/05/2025")  // → "2025-05-01"
parseFlexibleDate("2025-05-01")  // → "2025-05-01"
parseFlexibleDate("")            // → ""
```

---

### `parseFlexiblePrice(raw: string | number): number`

**But** : Convertit n'importe quel format de prix en nombre flottant JS.

**Formats supportés :**
| Entrée | Sortie |
|--------|--------|
| `"12,5"` | `12.5` |
| `"12.5"` | `12.5` |
| `"1.234,56"` | `1234.56` |
| `"1,234.56"` | `1234.56` |
| `"1 234,56"` | `1234.56` |
| `"12,5 €"` | `12.5` |
| `"$12.50"` | `12.5` |
| `"Ar 1 000"` | `1000` |

**Logique interne :**
1. Retire les symboles monétaires (`€ $ £ ¥ ₹ ₽ ฿ Ar`)
2. Détecte si le séparateur décimal est `.` ou `,` selon le contexte
3. Gère les milliers avec espaces

**Utilisation :**
```ts
import { parseFlexiblePrice } from './csvParserUtils';

parseFlexiblePrice("1.234,56")   // → 1234.56
parseFlexiblePrice("12,5 €")    // → 12.5
parseFlexiblePrice("invalid")   // → 0
```

---

### `parseTaxRate(raw: string | number): number`

**But** : Extrait un taux de taxe numérique depuis n'importe quel format.

**Formats supportés :**
| Entrée | Sortie |
|--------|--------|
| `"20%"` | `20` |
| `"11,65%"` | `11.65` |
| `"5.6"` | `5.6` |
| `20` | `20` |

**Utilisation :**
```ts
parseTaxRate("20%")      // → 20
parseTaxRate("11,65%")   // → 11.65
```

---

### `slugify(str: string): string`

**But** : Convertit un texte en slug URL valide pour le champ `link_rewrite` de PrestaShop.

**Exemples :**
| Entrée | Sortie |
|--------|--------|
| `"Téléphones Mobiles"` | `"telephones-mobiles"` |
| `"Hello World!"` | `"hello-world"` |
| `""` | `"produit"` (valeur par défaut) |

**Utilisation :**
```ts
slugify("Téléphones Mobiles")  // → "telephones-mobiles"
```

---

## 2. `fichier1ImportService.ts` — Import Produits

Orchestre la création de catégories, taxes et produits dans PrestaShop.

---

### `importFichier1(rows, onLog): Promise<ImportResult>`

**But** : Point d'entrée principal. Reçoit le tableau de lignes CSV et crée tout dans PS.

**Paramètres :**
- `rows: Record<string, any>[]` — lignes parsées par PapaParse
- `onLog: (log: ImportLog) => void` — callback appelé à chaque étape (affichage temps réel)

**Retourne :** `{ logs, successCount, errorCount }`

**Étapes d'exécution :**
```
Étape 1 : Catégories (uniques, dédupliquées)
    → createCategory(name) → POST /categories
Étape 2 : Taxes (taux uniques)
    → createTaxRuleGroup(name) → POST /tax_rule_groups
    → createTax(rate) → POST /taxes
    → createTaxRule(groupId, taxId) → POST /tax_rules
Étape 3 : Produits (une ligne = un produit)
    → priceHT = priceTTC × (1 - taxRate/100)
    → createProduct(...) → POST /products
```

**Utilisation dans la vue :**
```ts
import { importFichier1 } from '@/services/fichier1ImportService';

const result = await importFichier1(rows, (log) => {
  console.log(log.level, log.message);
});
```

---

### `col(row, ...keys): string`

**But** : Lecture robuste d'une colonne CSV, insensible à la casse et aux espaces.

**Pourquoi** : Les fichiers CSV ont des noms de colonnes inconsistants (`Nom`, `nom`, `NAME`, ` Nom `).

**Utilisation interne :**
```ts
const name = col(row, 'nom', 'Nom', 'name', 'Name');
// Essaie dans l'ordre : 'nom' exact, 'Nom' exact, puis recherche insensible à la casse
```

---

### `tryExtractId(data, entityName): number`

**But** : Extrait l'ID d'une réponse PS qui peut être JSON ou XML string.

**Cas gérés :**
```ts
// JSON : { category: { id: "5" } }
tryExtractId({ category: { id: "5" } }, 'category')  // → 5

// XML string : id="5" ou <id>5</id>
tryExtractId('<category id="5">...</category>', 'category')  // → 5
```

---

### `postEntity(url, xml, entityName): Promise<number>`

**But** : POST XML vers PS et retourne l'ID créé. Gère les erreurs PS (400/500 avec warnings PHP).

**Comportement spécial** : PrestaShop peut retourner HTTP 400 avec des warnings non-bloquants
(ex: "Undefined array key 2" quand la langue 2 n'est pas configurée) mais avoir quand même
créé l'entité. Si l'ID est présent dans la réponse, on le considère comme succès.

```ts
// Retourne l'ID si créé, throw si vraie erreur
const id = await postEntity('/categories?output_format=JSON', xmlString, 'category');
```

---

## 3. `fichier2ImportService.ts` — Import Déclinaisons et Stock

---

### `importFichier2(rows, onLog): Promise<ImportResult>`

**Étapes d'exécution :**
```
Pour chaque ligne :
    1. Trouver le produit par référence → findProductByRef(ref)
    2. Gérer le groupe d'attribut (ex: "Taille") → POST /product_options si nouveau
    3. Gérer la valeur d'attribut (ex: "XL") → POST /product_option_values si nouvelle
    4. Gérer la combinaison (ref+attribut) → POST /combinations si nouvelle
    5. Mettre à jour le stock → setStock() via stock_update.php
    6. Créer un prix spécifique si prix_vente_ttc fourni → POST /specific_prices
```

---

### `setStock(idProduct, idProductAttribute, qty): Promise<void>`

**But** : Mettre à jour le stock d'un produit (ou combinaison) via `stock_update.php`.

**Pourquoi pas l'API PS ?** Le WS PrestaShop retourne HTTP 405 sur PUT/POST de `stock_availables`.

```ts
await setStock(81, 0, 100);   // produit 81, pas de combinaison, stock = 100
await setStock(81, 12, 50);   // produit 81, combinaison 12, stock = 50
```

**Ce que fait `stock_update.php` :**
1. Lit les credentials DB depuis `app/config/parameters.php`
2. Connexion PDO à MySQL
3. SELECT sur `ps_stock_available` → UPDATE si existe, INSERT sinon
4. Si combinaison : recalcule et met à jour le stock du produit parent (somme des combos)

---

### `findProductByRef(reference): Promise<{ id, price, idTaxGroup } | null>`

**But** : Recherche un produit par sa référence dans PS.

```ts
// GET /products?filter[reference]=T_01&output_format=XML&display=[id]
const product = await findProductByRef('T_01');
// → { id: 42, price: 8.33, idTaxGroup: 3 }
```

---

### `getTaxRate(idTaxGroup): Promise<number>`

**But** : Récupère le taux de TVA d'un groupe de taxe.

```ts
// GET /tax_rules?filter[id_tax_rules_group]=3 → id_tax
// GET /taxes/{id_tax} → rate
const rate = await getTaxRate(3);  // → 20
```

---

### `loadAttrGroups(): Promise<Map<string, number>>`

**But** : Charge tous les groupes d'attributs existants en mémoire (Map nom → id).

```ts
const map = await loadAttrGroups();
// map.get('taille') → 5
```

---

### `loadAttrValues(idGroup): Promise<Map<string, number>>`

**But** : Charge toutes les valeurs d'un groupe d'attribut (Map nom → id).

```ts
const map = await loadAttrValues(5);
// map.get('xl') → 12
```

---

### `loadCombinations(idProduct): Promise<Map<number, number>>`

**But** : Charge toutes les combinaisons d'un produit (Map idAttrValue → idCombination).

```ts
const map = await loadCombinations(81);
// map.get(12) → 34  (attrValue XL → combo 34)
```

---

### `xmlSpecificPrice(idProduct, idProductAttribute, priceHT): string`

**But** : Construit le XML pour créer un prix spécifique (prix de vente forcé pour une combinaison).

---

## 4. `fichier3ImportService.ts` — Import Commandes

---

### `importFichier3(rows, onLog): Promise<ImportResult>`

**Étapes d'exécution :**
```
Pour chaque ligne :
    1. Lire colonne "achat" au format [(ref;qty;karazany), ...]
    2. Trouver ou créer le client PS → findCustomerByEmail / POST /customers
    3. Trouver ou créer l'adresse → POST /addresses
    4. POST /carts → créer un panier PS
    5. POST /carts/{id}/add → ajouter chaque produit au panier
    6. Calculer le total (sum priceHT × qty pour chaque produit)
    7. POST /orders → créer la commande avec le total calculé
    8. Décrémenter le stock
```

---

### `parseAchat(raw: string): AchatItem[]`

**But** : Parse la colonne "achat" au format spécifique du CSV fichier 3.

**Format entré :** `[("T_01";3;"ngoza"),("M_03";1;"")]`

**Retourne :** `[ { ref: "T_01", qty: 3, karazany: "ngoza" }, { ref: "M_03", qty: 1, karazany: "" } ]`

```ts
const items = parseAchat('[("T_01";3;"ngoza"),("M_03";1;"")]');
// items[0] = { ref: "T_01", qty: 3, karazany: "ngoza" }
```

---

### `getCountryId(): Promise<number>`

**But** : Récupère l'ID du pays (France ou Madagascar) depuis PS, avec cache.

```ts
// Essaie MG d'abord, puis FR, puis premier pays actif
const idCountry = await getCountryId();
```

---

### `splitNom(nom: string): { firstname, lastname }`

**But** : Divise un nom complet en prénom/nom pour les entités PS.

```ts
splitNom("Jean Dupont")     // → { firstname: "Jean", lastname: "Dupont" }
splitNom("Marie-Eve")       // → { firstname: "Client", lastname: "Marie-Eve" }
```

---

### `findCombinationId(idProduct, karazany): Promise<number>`

**But** : Trouve l'ID de combinaison d'un produit pour une valeur d'attribut donnée.

```ts
// Cherche parmi les combinaisons du produit laquelle a la valeur "ngoza"
const idCombo = await findCombinationId(81, 'ngoza');
```

---

### `getEffectivePrice(idProduct, idProductAttribute, idTaxGroup): Promise<{ ht, ttc }>`

**But** : Récupère le prix effectif d'un produit/combinaison en cherchant d'abord les `specific_prices`.

```ts
// 1. GET /specific_prices?filter[id_product]=81&filter[id_product_attribute]=12
// 2. Si trouvé → utilise ce prix HT
// 3. Sinon → prix de base du produit
const price = await getEffectivePrice(81, 12, 3);
// → { ht: 8.33, ttc: 10.0 }
```

---

## 5. `fichier4ImportService.ts` — Import Images

---

### `readZipImages(file: File): Promise<ZipImageEntry[]>`

**But** : Extrait toutes les images d'un fichier ZIP et retourne leurs métadonnées + Blob.

```ts
const entries = await readZipImages(zipFile);
// entries[0] = { ref: "T_01", filename: "T_01.jpg", ext: "jpg", size: 45000, blob: Blob }
```

**Filtre appliqué :**
- Extensions acceptées : `jpg`, `jpeg`, `png`, `gif`, `webp`
- Ignore les dossiers `__MACOSX` (artifacts macOS)
- Le nom du fichier (sans extension) devient la `référence` du produit

---

### `importFichier4(entries, onLog): Promise<ImportResult>`

**But** : Pour chaque image, trouve le produit par référence et uploade l'image via le WS PS.

```ts
// GET /products?filter[reference]=T_01 → id produit
// POST /images/products/{id} multipart/form-data → upload image
```

---

## 6. `useAuth.ts` — Authentification

Composable Vue 3 (singleton — état partagé entre tous les composants).

---

### `useAuth()`

**Retourne :**

| Propriété/Méthode | Type | Description |
|-------------------|------|-------------|
| `currentUser` | `Ref<User \| null>` | Utilisateur connecté |
| `token` | `Ref<string \| null>` | Token PS (secure_key) |
| `isLoggedIn` | `ComputedRef<boolean>` | `true` si token + user présents |
| `isInitialized` | `Ref<boolean>` | `true` après lecture sessionStorage |
| `login(user, token)` | `void` | Sauvegarde en sessionStorage + état |
| `logout()` | `void` | Efface sessionStorage + état |
| `getCustomerId()` | `string` | ID client PS (défaut: `'1'`) |
| `getCustomerToken()` | `string` | Token pour les requêtes PS |
| `getUser()` | `User \| null` | Objet utilisateur complet |

**Utilisation :**
```ts
import { useAuth } from '@/services/useAuth';

const { isLoggedIn, login, logout, getCustomerId } = useAuth();

// Connexion
login({ id: '5', email: 'jean@example.com', firstname: 'Jean', lastname: 'Dupont' }, 'secure_key_value');

// Vérification
if (isLoggedIn.value) {
  const customerId = getCustomerId();  // → "5"
}

// Déconnexion
logout();
```

---

## 7. `checkout.service.ts` — Workflow de commande

---

### `processCheckout(cartData): Promise<{ order, cartId }>`

**But** : Orchestrateur principal du checkout frontoffice.

**Paramètres :**
```ts
interface CartData {
  products: CartProduct[];
  customerId?: string;
  carrierId?: string;
  paymentMethod?: string;
  total?: number;  // Si fourni, utilisé directement (évite total=0 du WS PS)
}
```

**Étapes :**
```
1. getOrCreateAddress(customerId)
2. createCart(customerId, carrierId, addressId) → POST /carts
3. addProductToCart(cartId, ...) pour chaque produit → POST /carts/{id}
4. total = cartData.total ?? sum(price × qty)
5. createOrderWithSchema(cartId, customerId, token, total)
```

---

### `getOrCreateAddress(customerId): Promise<string>`

**But** : Récupère l'adresse existante du client ou en crée une par défaut.

```ts
// GET /addresses?filter[id_customer]=[5]&display=full
// Si aucune → POST /addresses avec adresse générique
const addressId = await getOrCreateAddress('5');
```

---

### `getCustomerSecureKey(customerId): Promise<string>`

**But** : Récupère la `secure_key` du client PS (utilisée dans le XML de commande).

```ts
// GET /customers/5?output_format=XML
const key = await getCustomerSecureKey('5');
// → "a1b2c3d4e5f6..."
```

---

## 8. `csvParserUtils.ts` — Fonction `col()`

Présente dans chaque service d'import (copiée localement).

**But** : Lire une valeur de colonne CSV de manière robuste.

```ts
function col(row: Record<string, any>, ...keys: string[]): string

// Exemple d'usage
const ref = col(row, 'reference', 'Reference', 'ref');
// Cherche dans l'ordre, insensible à la casse et aux espaces
// Retourne la première valeur non vide trouvée, sinon ""
```

---

## 9. Constructeurs XML (dans chaque service)

Fonctions qui retournent une string XML prête à être envoyée au WS PrestaShop.

| Fonction | Fichier | Entité créée |
|----------|---------|--------------|
| `xmlCategory(name)` | fichier1 | `<category>` |
| `xmlTaxRuleGroup(name)` | fichier1 | `<tax_rule_group>` |
| `xmlTax(rate)` | fichier1 | `<tax>` |
| `xmlTaxRule(idGroup, idTax)` | fichier1 | `<tax_rule>` |
| `xmlProduct(name, ref, price, ...)` | fichier1 | `<product>` |
| `xmlAttrGroup(name)` | fichier2 | `<product_option>` |
| `xmlAttrValue(name, idGroup)` | fichier2 | `<product_option_value>` |
| `xmlCombination(idProduct, ref, karazany, idAttrValue)` | fichier2 | `<combination>` |
| `xmlSpecificPrice(idProduct, idAttr, priceHT)` | fichier2 | `<specific_price>` |
| `xmlCustomer(firstname, lastname, email, pwd)` | fichier3 | `<customer>` |
| `xmlAddress(idCustomer, ...)` | fichier3 | `<address>` |
| `xmlOrder(cartId, customerId, ...)` | fichier3 | `<order>` |

---

## 10. `resetService.ts` — Réinitialisation

### `resetAllData(onLog): Promise<void>`

**But** : Supprime toutes les données importées de PrestaShop (produits, catégories, clients, commandes...).

Utilisé dans deux contextes :
1. Bouton "Réinitialiser" dans le backoffice
2. Rollback automatique en cas d'erreur pendant un import (dans fichier2ImportService)

```ts
import { resetAllData } from './resetService';

await resetAllData((msg) => log('warning', msg));
```
