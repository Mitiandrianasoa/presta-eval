# Guide XML — PrestaShop Web Service

Comment construire, envoyer et lire des données XML avec le WS PrestaShop.

---

## 1. Pourquoi XML ?

Le Web Service PrestaShop 8.x accepte deux formats :
- `?output_format=JSON` — lecture simple (GET)
- `?output_format=XML` — lecture + écriture (POST/PUT)

**Pour créer ou modifier une entité, on envoie toujours du XML.**  
Le serveur répond en JSON ou XML selon le paramètre `output_format`.

---

## 2. Structure d'un document XML PrestaShop

Tout XML envoyé au WS doit respecter cette enveloppe :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <NOM_ENTITE>
    <champ1><![CDATA[valeur1]]></champ1>
    <champ2><![CDATA[valeur2]]></champ2>
  </NOM_ENTITE>
</prestashop>
```

**Règles :**
- Racine = `<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">`
- Entité = nœud enfant direct (`<product>`, `<category>`, `<order>`, etc.)
- Valeurs = toujours dans `<![CDATA[...]]>` pour éviter les problèmes de caractères spéciaux
- L'ID n'est pas envoyé lors de la création (PS l'auto-génère)

---

## 3. CDATA — Pourquoi et comment

`<![CDATA[...]]>` permet d'insérer du texte sans échappement XML.

```xml
<!-- Sans CDATA : risque d'erreur si la valeur contient <, >, & -->
<name>Téléphones & Accessoires</name>  ❌

<!-- Avec CDATA : toujours sûr -->
<name><![CDATA[Téléphones & Accessoires]]></name>  ✅
```

**Dans le code TypeScript :**
```ts
function xmlCategory(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <category>
    <name><language id="1"><![CDATA[${name}]]></language></name>
  </category>
</prestashop>`;
}
```

---

## 4. Champs multilingues

PrestaShop gère le multilinguisme via des sous-nœuds `<language id="N">`.  
Dans ce projet, **on n'utilise que la langue 1 (Français)**.

```xml
<!-- Champ multilingue : name, description, link_rewrite, etc. -->
<name>
  <language id="1"><![CDATA[Mon Produit]]></language>
</name>

<!-- Champ non multilingue : price, reference, active, etc. -->
<price><![CDATA[12.500000]]></price>
<reference><![CDATA[T_01]]></reference>
```

**Champs multilingues courants :**
- `name` — nom de l'entité
- `description` — description longue
- `description_short` — description courte
- `link_rewrite` — slug URL
- `meta_title`, `meta_description` — SEO
- `public_name` (product_option) — libellé affiché

---

## 5. Envoyer du XML — `api.post()`

```ts
import api from '../api/api';

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

// Création (POST)
const res = await api.post(
  '/categories?output_format=JSON',
  xmlString,
  {
    headers: XML_HEADERS,
    validateStatus: () => true,  // ne pas lever d'erreur sur 400/500
  }
);
```

**Paramètres importants :**
- `Content-Type: application/xml; charset=utf-8` obligatoire
- `validateStatus: () => true` — PS retourne parfois HTTP 400 avec des warnings
  bénins (langue 2 non configurée) mais l'entité est quand même créée
- `output_format=JSON` sur l'URL — la réponse est plus simple à parser

---

## 6. Lire du XML — `DOMParser`

Quand la réponse est en XML (`output_format=XML`) :

```ts
// Requête
const res = await api.get(`/products/${id}?output_format=XML`);

// Parse
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(res.data, 'text/xml');

// Accès aux nœuds
const priceEl = xmlDoc.querySelector('product price');
const price = parseFloat(priceEl?.textContent?.trim() || '0');

// Champ multilingue
const nameEl = xmlDoc.querySelector('product name language');
const name = nameEl?.textContent?.trim() || '';

// Sélection multiple
const products = xmlDoc.querySelectorAll('products product');
products.forEach(el => {
  const id = el.querySelector('id')?.textContent;
});
```

**Raccourci utilisé dans le code :**
```ts
const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');
const xtext = (node: Element | Document, tag: string) =>
  node.querySelector(tag)?.textContent?.trim() || '';

// Usage
const doc = parseXml(res.data);
const price = xtext(doc, 'product price');
const name = xtext(doc, 'product name language');
```

---

## 7. Lire du JSON — Pattern standard

Quand `output_format=JSON` :

```ts
// Réponse JSON pour une liste
const res = await api.get('/products?output_format=JSON');
const products = res.data?.products;  // Array ou undefined
if (Array.isArray(products)) {
  products.forEach(p => console.log(p.id, p.price));
}

// Réponse JSON pour un seul élément
const res = await api.get(`/products/${id}?output_format=JSON`);
const product = res.data?.product;
const price = parseFloat(product?.price) || 0;
```

---

## 8. Filtres et affichage partiel

Le WS PS supporte des filtres puissants sur les requêtes GET :

```ts
// Filtrer par valeur exacte
api.get('/products?filter[reference]=T_01&output_format=JSON')

// Filtrer par valeur (format bracket)
api.get('/addresses?filter[id_customer]=[5]&output_format=JSON')

// Afficher seulement certains champs
api.get('/products?display=[id,price,reference]&output_format=JSON')

// Affichage complet (tous les champs)
api.get('/products?display=full&output_format=JSON')

// Combiner filtres et display
api.get('/combinations?filter[id_product]=81&display=full&output_format=JSON')
```

---

## 9. Extraire l'ID depuis une réponse

Après création (POST), PS retourne l'entité créée avec son ID. La fonction `tryExtractId` gère tous les cas :

```ts
function tryExtractId(data: any, entityName: string): number {
  if (!data) return 0;

  // Cas 1 : JSON → { category: { id: "5" } }
  if (typeof data === 'object') {
    const entity = data[entityName];
    if (entity?.id) return parseInt(String(entity.id));
  }

  // Cas 2 : XML string → id="5" ou <id>5</id>
  if (typeof data === 'string') {
    const m = data.match(/\bid="(\d+)"/)
           || data.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/)
           || data.match(/<id>(\d+)<\/id>/);
    if (m) return parseInt(m[1]);
  }

  return 0;
}
```

---

## 10. Associations (relations entre entités)

Certaines entités ont des associations. Exemple : produit → catégories.

```xml
<product>
  <id_category_default><![CDATA[5]]></id_category_default>
  <!-- ... -->
  <associations>
    <categories>
      <category><id><![CDATA[5]]></id></category>
      <category><id><![CDATA[2]]></id></category>
    </categories>
  </associations>
</product>
```

**Combinaison → valeurs d'attributs :**
```xml
<combination>
  <id_product><![CDATA[81]]></id_product>
  <associations>
    <product_option_values>
      <product_option_value>
        <id><![CDATA[12]]></id>
      </product_option_value>
    </product_option_values>
  </associations>
</combination>
```

---

## 11. Ressources et leurs endpoints

| Entité | Endpoint | POST | PUT | Notes |
|--------|----------|------|-----|-------|
| Produit | `/products` | ✅ | ✅ | |
| Catégorie | `/categories` | ✅ | ✅ | |
| Client | `/customers` | ✅ | ✅ | |
| Adresse | `/addresses` | ✅ | ✅ | |
| Panier | `/carts` | ✅ | ✅ | |
| Commande | `/orders` | ✅ | ✅ | |
| Groupe de taxe | `/tax_rule_groups` | ✅ | ✅ | |
| Taxe | `/taxes` | ✅ | ✅ | |
| Règle de taxe | `/tax_rules` | ✅ | ✅ | |
| Groupe d'attribut | `/product_options` | ✅ | ✅ | |
| Valeur d'attribut | `/product_option_values` | ✅ | ✅ | |
| Combinaison | `/combinations` | ✅ | ✅ | |
| Prix spécifique | `/specific_prices` | ✅ | ✅ | |
| Stock disponible | `/stock_availables` | ❌ | ❌ | READ ONLY via WS |
| Image produit | `/images/products/{id}` | ✅ (multipart) | ❌ | Upload direct |

---

## 12. Limitation majeure : stock_availables

**Le WS PS est en lecture seule pour le stock.**

```
GET  /stock_availables       → ✅ OK
PUT  /stock_availables/{id}  → ❌ HTTP 405 Method Not Allowed
POST /stock_availables       → ❌ HTTP 405 Method Not Allowed
```

**Solution** : `stock_update.php` (fichier à la racine PrestaShop) avec connexion PDO directe.

```php
// Lecture des credentials depuis app/config/parameters.php (PS 8.x)
$paramsFile = $root . '/app/config/parameters.php';
$cfg    = include $paramsFile;
$p      = $cfg['parameters'];
$pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass);

// Upsert sur ps_stock_available
$stmt = $pdo->prepare("SELECT id_stock_available FROM {$t} WHERE id_product = ? AND id_product_attribute = ? LIMIT 1");
$stmt->execute([$idProduct, $idProductAttribute]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if ($row) {
    $pdo->prepare("UPDATE {$t} SET quantity = ? WHERE id_stock_available = ?")
        ->execute([$quantity, $row['id_stock_available']]);
} else {
    $pdo->prepare("INSERT INTO {$t} (id_product, id_product_attribute, id_shop, quantity, ...) VALUES (...)")
        ->execute([$idProduct, $idProductAttribute, $quantity]);
}

// Synchroniser le stock du produit parent (somme de toutes les combinaisons)
if ($idProductAttribute > 0) {
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(quantity), 0) FROM {$t} WHERE id_product = ? AND id_product_attribute > 0");
    $stmt->execute([$idProduct]);
    $total = (int) $stmt->fetchColumn();
    // UPDATE parent (id_product_attribute = 0)
}
```

**Appel depuis TypeScript :**
```ts
async function setStock(idProduct: number, idProductAttribute: number, qty: number): Promise<void> {
  const r = await fetch('/stock-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_product: idProduct, id_product_attribute: idProductAttribute, quantity: qty }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`stock_update.php (HTTP ${r.status}) : ${text.slice(0, 300)}`);
  }
}
```

---

## 13. Limitation majeure : totaux du panier

**Le WS retourne toujours `total_products = 0` sur les carts.**

```
GET /carts/{id}?output_format=XML
→ <total_products>0.000000</total_products>  // toujours 0 !
```

**Solution** : calculer le total côté client depuis les produits du panier.

```ts
// Dans CartView.vue
const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
);

// Passer le total au service de checkout
const cartData = {
  products: [...],
  total: cartTotal.value  // ← calculé côté client
};

// Dans checkout.service.ts
const total = cartData.total
  ?? cartData.products.reduce((s, p) => s + parseFloat(p.price || '0') * p.quantity, 0);
```

---

## 14. Exemple complet — Créer un produit

```ts
import api from '../api/api';
import { slugify } from './csvParserUtils';

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

async function createProduct(name: string, reference: string, priceHT: number, idCategory: number, idTaxGroup: number): Promise<number> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_category_default><![CDATA[${idCategory}]]></id_category_default>
    <id_tax_rules_group><![CDATA[${idTaxGroup}]]></id_tax_rules_group>
    <reference><![CDATA[${reference}]]></reference>
    <price><![CDATA[${priceHT.toFixed(6)}]]></price>
    <active><![CDATA[1]]></active>
    <state><![CDATA[1]]></state>
    <product_type><![CDATA[standard]]></product_type>
    <visibility><![CDATA[both]]></visibility>
    <available_for_order><![CDATA[1]]></available_for_order>
    <minimal_quantity><![CDATA[1]]></minimal_quantity>
    <name><language id="1"><![CDATA[${name}]]></language></name>
    <link_rewrite><language id="1"><![CDATA[${slugify(name)}]]></link_rewrite>
    <description><language id="1"><![CDATA[]]></language></description>
    <description_short><language id="1"><![CDATA[]]></language></description_short>
    <associations>
      <categories>
        <category><id><![CDATA[${idCategory}]]></id></category>
      </categories>
    </associations>
  </product>
</prestashop>`;

  const res = await api.post('/products?output_format=JSON', xml, {
    headers: XML_HEADERS,
    validateStatus: () => true,
  });

  // Extraire l'ID de la réponse JSON
  const id = res.data?.product?.id;
  if (id) return parseInt(String(id));

  throw new Error(JSON.stringify(res.data).slice(0, 300));
}
```

---

## 15. Exemple complet — Lire les produits avec filtre

```ts
// Tous les produits (liste partielle)
const res = await api.get('/products?display=[id,reference,price,name,available_date]&output_format=JSON');
const products = res.data?.products ?? [];

// Un produit spécifique (détail complet)
const res = await api.get(`/products/${id}?output_format=JSON&display=full`);
const product = res.data?.product;

// Filtrer par référence
const res = await api.get(`/products?filter[reference]=${encodeURIComponent(ref)}&output_format=JSON&display=[id]`);
const found = res.data?.products?.[0];

// Lire en XML et parser avec DOMParser
const res = await api.get(`/products/${id}?output_format=XML`);
const doc = new DOMParser().parseFromString(res.data, 'text/xml');
const price = doc.querySelector('product price')?.textContent?.trim();
const name = doc.querySelector('product name language')?.textContent?.trim();
```
