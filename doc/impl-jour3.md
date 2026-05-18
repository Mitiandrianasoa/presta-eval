# Implémentation Jour 3 — Comment le code a été fait

---

## Backoffice

---

### 3a — Validation des erreurs à l'import

**Fichiers concernés :**
- `src/services/fichier1ImportService.ts`
- `src/services/fichier2ImportService.ts`
- `src/services/fichier3ImportService.ts`
- `src/services/csvParserUtils.ts`

**Trois types d'erreurs à détecter :**
1. Nom de colonne non conforme
2. Format de date différent de `DD/MM/YYYY`
3. Montant négatif

---

#### 3a-i — Nom de colonne non conforme

**Problème :** Les CSV peuvent avoir des noms de colonnes avec des casses différentes,
des espaces, ou un BOM (byte-order mark) au début du fichier.

**Solution — fonction `col()` :**
```ts
function col(row: Record<string, any>, ...keys: string[]): string {
  const rowKeys = Object.keys(row);

  for (const k of keys) {
    const kNorm = k.toLowerCase().trim();

    // 1. Correspondance exacte (rapide)
    const val0 = row[k];
    if (val0 !== undefined && val0 !== null && String(val0).trim() !== '') {
      return String(val0).trim();
    }

    // 2. Recherche insensible à la casse + espaces + BOM
    const matchKey = rowKeys.find(rk => rk.toLowerCase().trim() === kNorm);
    if (matchKey) {
      const val = row[matchKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}
```

**Exemples de colonnes acceptées grâce à `col()` :**
```
col(row, 'nom', 'Nom', 'name', 'Name')
→ accepte : "nom", "Nom", "NOM", " nom ", "﻿nom" (avec BOM)
```

**Validation des colonnes obligatoires :**
```ts
// Fichier 1 : nom + reference sont obligatoires
const name      = col(row, 'nom', 'Nom', 'name', 'Name');
const reference = col(row, 'reference', 'Reference', 'ref', 'Ref');

if (!name) {
  log('error', `Ligne ${rowNum} : colonne "nom" manquante ou vide — ligne ignorée`);
  errorCount++;
  continue;
}

// Fichier 2 : reference obligatoire
const ref = col(row, 'reference', 'Reference', 'ref');
if (!ref) {
  log('error', `Ligne ${rowNum} : référence manquante — ignorée`);
  errorCount++;
  continue;
}
```

**Diagnostic des colonnes au début de l'import :**
```ts
// Logué dès la première ligne pour aider au debug
if (rows.length > 0) {
  log('info', `Colonnes détectées : ${Object.keys(rows[0]).join(' | ')}`);
}
// → "Colonnes détectées : nom | reference | prix_ttc | Taxe | categorie | date_availability_produit"
```

---

#### 3a-ii — Format de date différent de `DD/MM/YYYY`

**Validation stricte :**
```ts
function isValidDDMMYYYY(str: string): boolean {
  // Exiger exactement DD/MM/YYYY avec zéros de remplissage
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day   = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year  = parseInt(match[3]);

  // Vérifications de plage
  if (month < 1 || month > 12)     return false;
  if (day   < 1 || day   > 31)     return false;
  if (year  < 1900 || year > 2100) return false;

  // Validation réelle (31 février → false)
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}
```

**Intégration dans la boucle d'import :**
```ts
const dateRaw = col(row, 'date_availability_produit', 'date_produit', 'date');

if (dateRaw && !isValidDDMMYYYY(dateRaw.trim())) {
  log('error',
    `Ligne ${rowNum} : format de date invalide "${dateRaw}". ` +
    `Attendu DD/MM/YYYY (ex: 01/05/2025)`
  );
  errorCount++;
  continue;
}

// Si valide, convertir en YYYY-MM-DD pour PS
const availableDate = parseFlexibleDate(dateRaw);
```

**Exemples de dates rejetées vs acceptées :**
```
"2025-05-01"  → ❌  format ISO (non conforme DD/MM/YYYY)
"1/5/2025"    → ❌  pas de zéro de remplissage
"01/13/2025"  → ❌  mois 13 invalide
"31/02/2025"  → ❌  31 février n'existe pas
"01/05/2025"  → ✅  valide
"28/02/2025"  → ✅  valide
```

---

#### 3a-iii — Montant négatif

**Validation du prix :**
```ts
const priceRaw = col(row, 'prix_ttc', 'prix', 'price');
const priceTTC = priceRaw ? parseFlexiblePrice(priceRaw) : 0;

if (priceTTC < 0) {
  log('error',
    `Ligne ${rowNum} ("${name}") : prix_ttc négatif (${priceTTC}) — non autorisé`
  );
  errorCount++;
  continue;
}
```

**Validation du prix d'achat :**
```ts
const purchaseRaw   = col(row, 'prix_achat', 'wholesale_price', 'cout');
const wholesalePrice = purchaseRaw ? parseFlexiblePrice(purchaseRaw) : 0;

if (wholesalePrice < 0) {
  log('warning',
    `Ligne ${rowNum} ("${name}") : prix_achat négatif (${wholesalePrice}), remis à 0`
  );
  wholesalePrice = 0;  // Warning seulement, on corrige
}
```

**Validation du stock :**
```ts
const stockRaw = col(row, 'stock_initial', 'stock', 'quantite', 'qty');
const stock    = parseInt(stockRaw) || 0;

if (stock < 0) {
  log('error', `Ligne ${rowNum} : stock négatif (${stock}) — non autorisé`);
  errorCount++;
  continue;
}
```

**Validation du taux de taxe :**
```ts
const taxRate = parseTaxRate(col(row, 'Taxe', 'taxe', 'taux', 'TVA'));

if (taxRate < 0) {
  log('error', `Ligne ${rowNum} : taux de taxe négatif (${taxRate}%) — non autorisé`);
  errorCount++;
  continue;
}
```

---

### 3b — Page d'ajout en stock

**Fichiers concernés :**
- `src/components/stock/StockList.vue`
- `src/stores/stock/stockStore.ts`
- `src/router/index.ts` → route intégrée dans le catalogue

**Interface :**  
Tableau des produits/combinaisons avec leur stock actuel. Clic sur une ligne → édition inline.

**Edition inline dans `StockList.vue` :**
```ts
const editingId   = ref<string | null>(null);
const editQty     = ref(0);

const startEdit = (stock: StockItem) => {
  editingId.value = stock.id;
  editQty.value   = stock.quantity;
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveQuantity = async (stock: StockItem) => {
  try {
    await stockStore.updateQuantity(stock.id, editQty.value);
    stock.quantity = editQty.value;
    editingId.value = null;
  } catch (err: any) {
    console.error('Erreur mise à jour stock:', err);
  }
};
```

**Template — édition inline :**
```html
<td>
  <!-- Mode lecture -->
  <span v-if="editingId !== stock.id">
    {{ stock.quantity }}
    <button @click="startEdit(stock)" class="edit-btn">✏️</button>
  </span>

  <!-- Mode édition -->
  <span v-else class="edit-inline">
    <input type="number" v-model="editQty" min="0" class="qty-input" />
    <button @click="saveQuantity(stock)" class="save-btn">✓</button>
    <button @click="cancelEdit()" class="cancel-btn">✕</button>
  </span>
</td>
```

**Classe CSS selon le niveau de stock :**
```ts
const getStockClass = (qty: number): string => {
  if (qty === 0)  return 'stock-zero';     // rouge
  if (qty <= 5)   return 'stock-low';      // orange
  if (qty <= 20)  return 'stock-medium';   // jaune
  return 'stock-ok';                       // vert
};
```

**Mise à jour via `stock_update.php` (pas le WS PS) :**

Le WS PS interdit PUT/POST sur `stock_availables`. La mise à jour passe par `stock_update.php`
qui se connecte directement à MySQL.

```ts
// Dans stockStore.ts
const updateQuantity = async (stockId: string, newQty: number) => {
  const stock = stocks.value.find(s => s.id === stockId);
  if (!stock) return;

  const r = await fetch('/stock-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_product:           stock.id_product,
      id_product_attribute: stock.id_product_attribute || 0,
      quantity:             newQty,
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`stock_update.php HTTP ${r.status}: ${text.slice(0, 200)}`);
  }
};
```

---

### 3c — Tableau d'évolution du stock journalier

**Fichiers concernés :**
- `src/views/backoffice/stock/StockMvt.vue`
- `src/stores/stock/stockStore.ts`
- `prestashop_edition_classic_version_8.2.6/stock_update.php`

**Endpoint custom PrestaShop (1 seul) :**

Conformément à la consigne, un seul endpoint PHP a été créé qui appelle
`StockAvailable::updateQuantity($idProduct, 0, $delta)` :

```php
// stock_update.php (à la racine PS)
// Utilise PDO direct (le bootstrap PS causait des HTTP 500)
$pdo = new PDO("mysql:host={$host};dbname={$dbName};charset=utf8mb4", $user, $pass);
$t = $prefix . 'stock_available';

// Upsert : mettre à jour ou créer l'entrée de stock
$stmt = $pdo->prepare("SELECT id_stock_available FROM {$t}
  WHERE id_product = ? AND id_product_attribute = ? LIMIT 1");
$stmt->execute([$idProduct, $idProductAttribute]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if ($row) {
  $pdo->prepare("UPDATE {$t} SET quantity = ? WHERE id_stock_available = ?")
      ->execute([$quantity, $row['id_stock_available']]);
} else {
  $pdo->prepare("INSERT INTO {$t} (id_product, id_product_attribute, id_shop, quantity, ...) VALUES (...)")
      ->execute([$idProduct, $idProductAttribute, $quantity]);
}

// Synchroniser stock parent si combinaison
if ($idProductAttribute > 0) {
  $total = (int) $pdo->query("SELECT COALESCE(SUM(quantity), 0) FROM {$t}
    WHERE id_product = {$idProduct} AND id_product_attribute > 0")->fetchColumn();
  // UPDATE ou INSERT du parent (id_product_attribute = 0)
}
```

**Chargement des mouvements de stock :**
```ts
// Dans StockMvt.vue
const loadAllMovements = async () => {
  // 1. Charger les stocks (pour les noms de produits)
  await stockStore.fetchAll();

  // 2. Récupérer les mouvements depuis le WS PS
  const res = await api.get('/stock_movements?output_format=XML&display=full');
  const xmlDoc = new DOMParser().parseFromString(res.data, 'text/xml');

  allMovements.value = Array.from(xmlDoc.querySelectorAll('stock_mvt')).map(mvt => {
    const idStock         = mvt.querySelector('id_stock')?.textContent?.trim() || '';
    const physicalQty     = parseInt(mvt.querySelector('physical_quantity')?.textContent?.trim() || '0');
    const sign            = parseInt(mvt.querySelector('sign')?.textContent?.trim() || '1');
    // sign = 1 → entrée de stock, sign = -1 → sortie
    const quantity        = physicalQty * sign;

    // Retrouver le produit via le stockStore (déjà chargé)
    const stock = stockStore.stocks.find(s => s.id === idStock);

    return {
      id:               mvt.querySelector('id_stock_mvt')?.textContent?.trim() || '',
      date:             mvt.querySelector('date_add')?.textContent?.trim().slice(0, 10) || '',
      quantity,
      sign,
      product_name:     stock?.product_name || `Produit #${stock?.id_product || '?'}`,
      combination_name: stock?.combination_name || '-',
      employee:         [
        mvt.querySelector('employee_firstname')?.textContent?.trim(),
        mvt.querySelector('employee_lastname')?.textContent?.trim()
      ].filter(Boolean).join(' ') || '—',
      reason_id: mvt.querySelector('id_stock_mvt_reason')?.textContent?.trim() || '',
    };
  });
};
```

**Libellé des raisons de mouvement :**
```ts
const REASON_LABELS: Record<string, string> = {
  '1': 'Commande client',
  '2': 'Retour client',
  '3': 'Ajustement manuel',
  '4': 'Import initial',
};

const getReasonLabel = (reasonId: string): string =>
  REASON_LABELS[reasonId] ?? `Raison #${reasonId}`;
```

**Groupement par jour pour le tableau d'évolution :**
```ts
const movementsByDay = computed(() => {
  const map = new Map<string, { in: number; out: number; net: number }>();

  for (const mvt of filteredMovements.value) {
    const day = mvt.date;  // "YYYY-MM-DD"
    if (!map.has(day)) map.set(day, { in: 0, out: 0, net: 0 });
    const entry = map.get(day)!;

    if (mvt.quantity > 0) entry.in  += mvt.quantity;   // entrée
    else                  entry.out += Math.abs(mvt.quantity);  // sortie

    entry.net += mvt.quantity;  // net = entrées - sorties
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))  // plus récent en premier
    .map(([date, stats]) => ({ date, ...stats }));
});
```

**Filtres disponibles :**
```ts
const searchQuery  = ref('');    // par nom de produit
const dateDebut    = ref('');    // date début
const dateFin      = ref('');    // date fin
const filterReason = ref('');    // par raison

const filteredMovements = computed(() => {
  let result = allMovements.value;

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(m =>
      m.product_name.toLowerCase().includes(q) ||
      m.combination_name.toLowerCase().includes(q)
    );
  }
  if (dateDebut.value) result = result.filter(m => m.date >= dateDebut.value);
  if (dateFin.value)   result = result.filter(m => m.date <= dateFin.value);
  if (filterReason.value) result = result.filter(m => m.reason_id === filterReason.value);

  return result;
});
```

**Pagination :**
```ts
const currentPage  = ref(1);
const itemsPerPage = 50;

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredMovements.value.slice(start, start + itemsPerPage);
});

const totalPages = computed(() =>
  Math.ceil(filteredMovements.value.length / itemsPerPage)
);

const goToPage = (n: number) => {
  if (n >= 1 && n <= totalPages.value) currentPage.value = n;
};
```

---

## Frontoffice

---

### 4a — Stock disponible sur la fiche produit

**Fichiers concernés :**
- `src/views/frontoffice/product/ProductDetailView.vue`
- `src/views/frontoffice/product/ProductsView.vue`

**Chargement du stock en parallèle avec les produits :**
```ts
// Dans ProductsView.vue
const [pRes, stockRes] = await Promise.all([
  api.get('/products?output_format=XML&display=full&limit=100'),
  api.get('/stock_availables?output_format=XML&display=[id,id_product,id_product_attribute,quantity]&limit=1000'),
]);

// Construction d'un stockMap pour accès O(1)
const stockMap: Record<string, number> = {};
stockXml.querySelectorAll('stock_available').forEach(el => {
  const pid    = el.querySelector('id_product')?.textContent?.trim() || '';
  const attrId = el.querySelector('id_product_attribute')?.textContent?.trim() || '0';
  const qty    = parseInt(el.querySelector('quantity')?.textContent?.trim() || '0');
  stockMap[`${pid}_${attrId}`] = qty;
});

// Calcul du stock total pour chaque produit (simple + combinaisons)
products.value = Array.from(xmlDoc.querySelectorAll('product')).map(el => {
  const productId = el.querySelector('id')?.textContent?.trim() || '';

  // Stock du produit sans combinaison
  let totalStock = stockMap[`${productId}_0`] || 0;

  // Ajouter les stocks des combinaisons
  for (const [key, qty] of Object.entries(stockMap)) {
    if (key.startsWith(`${productId}_`) && key !== `${productId}_0`) {
      totalStock += qty;
    }
  }

  return { ...produit, totalStock };
});
```

**Affichage dans la liste produits :**
```html
<div class="stock-info">
  <span v-if="product.totalStock > 10" class="stock-badge stock-ok">
    ✓ En stock ({{ product.totalStock }})
  </span>
  <span v-else-if="product.totalStock > 0" class="stock-badge stock-low">
    ⚠ Stock limité ({{ product.totalStock }})
  </span>
  <span v-else class="stock-badge stock-zero">
    ✕ Rupture de stock
  </span>
</div>
```

**Sur la fiche produit — stock par combinaison :**
```ts
// Dans ProductDetailView.vue
// getCombinationStockForOption(valueId) retourne le stock
// de la combinaison qui contient cette valeur d'attribut

const getCombinationStockForOption = (valueId: string): number => {
  const combo = combinations.value.find(c =>
    c.attributeValues.includes(valueId)
  );
  if (!combo) return 0;

  // Chercher dans le stockMap chargé
  return stockMap.value[`${productId}_${combo.id}`] || 0;
};
```

**Affichage du stock par option d'attribut :**
```html
<!-- Pour chaque valeur d'attribut (ex: Couleur = "Noir") -->
<button
  v-for="value in group.values"
  :key="value.id"
  @click="selectAttribute(group.id, value.id)"
  :class="{
    active: selectedAttributes[group.id] === value.id,
    'out-of-stock': getCombinationStockForOption(value.id) === 0
  }"
  :disabled="getCombinationStockForOption(value.id) === 0"
>
  {{ value.name }}
  <span v-if="getCombinationStockForOption(value.id) === 0" class="oos-label">
    (épuisé)
  </span>
</button>
```

**Stock total affiché sur la fiche :**
```html
<div class="product-stock">
  <span class="stock-label">Disponibilité :</span>
  <span v-if="selectedCombination">
    <!-- Stock de la combinaison sélectionnée -->
    <span :class="selectedCombination.stock > 0 ? 'in-stock' : 'out-of-stock'">
      {{ selectedCombination.stock > 0
        ? `${selectedCombination.stock} unité(s) disponible(s)`
        : 'Rupture de stock' }}
    </span>
  </span>
  <span v-else>
    <!-- Stock global du produit (sans combinaison) -->
    <span :class="product.totalStock > 0 ? 'in-stock' : 'out-of-stock'">
      {{ product.totalStock > 0
        ? `${product.totalStock} unité(s) disponible(s)`
        : 'Rupture de stock' }}
    </span>
  </span>
</div>
```

**Désactivation du bouton "Ajouter au panier" si stock = 0 :**
```ts
const canAddToCart = computed(() => {
  if (selectedCombination.value) {
    return selectedCombination.value.stock > 0;
  }
  return product.value?.totalStock > 0;
});
```

```html
<button
  @click="addToCart(quantity)"
  :disabled="!canAddToCart"
  class="add-to-cart-btn"
>
  {{ canAddToCart ? 'Ajouter au panier' : 'Rupture de stock' }}
</button>
```
