# Implémentation Jour 2 — Comment le code a été fait

---

## Backoffice

---

### 1a — États de commande

**Fichiers concernés :**
- `src/services/orderService.ts`
- `src/components/order/OrderList.vue`
- `src/components/order/OrderDetails.vue`
- `src/components/order/CanceledOrders.vue`
- `src/components/order/PaymentList.vue`

**Les 3 états utilisés :**

| État PS | Nom | Page backoffice |
|---------|-----|-----------------|
| `dans le panier` | Cart non finalisé (pas encore une commande) | `/admin/cart` |
| `paiement effectué` | Commande validée et payée | `/admin/orders` |
| `annulé` | Commande annulée | `/admin/orders/canceled` |

**Chargement des états depuis PS :**
```ts
// orderService.fetchOrderStates()
const res = await api.get('/order_states?output_format=XML&display=full');
const states = xmlDoc.querySelectorAll('order_state');
// → tableau [{ id: "1", name: "En attente paiement" }, { id: "2", name: "Paiement accepté" }, ...]
```

**Changement d'état via PUT XML :**
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

**Séparation en composants :**
- `OrderList.vue` → commandes avec état "paiement effectué"
- `CanceledOrders.vue` → commandes avec état "annulé"
- `CartList.vue` → paniers (carts) pas encore finalisés en commandes

**Filtrage par état dans `CanceledOrders.vue` :**
```ts
const loadData = async () => {
  const res = await api.get('/orders?output_format=XML&display=full');
  // Filtrer les commandes dont current_state = id de l'état "Annulé"
  orders.value = allOrders.filter(o => o.current_state === canceledStateId);
};
```

---

### 1b — Tableau de bord

**Fichiers concernés :**
- `src/views/backoffice/dashboard/DashboardView.vue`

**Chargement de toutes les commandes :**
```ts
const loadOrders = async () => {
  const res = await api.get('/orders?output_format=XML&display=full');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, 'text/xml');
  const orderEls = xmlDoc.querySelectorAll('order');

  allOrders.value = Array.from(orderEls).map(el => ({
    id:              el.querySelector('id')?.textContent?.trim() || '',
    reference:       el.querySelector('reference')?.textContent?.trim() || '',
    date_add:        el.querySelector('date_add')?.textContent?.trim() || '',
    total_paid:      parseFloat(el.querySelector('total_paid_tax_incl')?.textContent?.trim() || '0'),
    current_state:   el.querySelector('current_state')?.textContent?.trim() || '',
  }));
};
```

**Statistiques par jour — computed :**
```ts
const statsByDay = computed(() => {
  const map = new Map<string, { count: number; total: number }>();

  for (const order of filteredOrders.value) {
    // date_add = "2025-05-17 14:30:00" → slice(0,10) = "2025-05-17"
    const day = order.date_add.slice(0, 10);
    if (!map.has(day)) map.set(day, { count: 0, total: 0 });
    const entry = map.get(day)!;
    entry.count++;
    entry.total += order.total_paid;
  }

  // Trier par date décroissante (plus récent en premier)
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, stats]) => ({ date, ...stats }));
});
```

**Total général — computed :**
```ts
const totalGeneralFiltre = computed(() =>
  filteredOrders.value.reduce((sum, o) => sum + o.total_paid, 0)
);

const nbCommandesFiltre = computed(() => filteredOrders.value.length);
```

**Filtre par période :**
```ts
const dateDebut = ref('');
const dateFin   = ref('');

const filteredOrders = computed(() => {
  if (!dateDebut.value && !dateFin.value) return allOrders.value;

  return allOrders.value.filter(o => {
    const orderDate = o.date_add.slice(0, 10);  // "YYYY-MM-DD"
    if (dateDebut.value && orderDate < dateDebut.value) return false;
    if (dateFin.value   && orderDate > dateFin.value)   return false;
    return true;
  });
});

const applyFilter  = () => { /* les computed se recalculent automatiquement */ };
const resetFilter  = () => { dateDebut.value = ''; dateFin.value = ''; };
const hasActiveFilter = computed(() => !!(dateDebut.value || dateFin.value));
```

**Formatage de la devise :**
```ts
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n);
```

**Formatage de la date pour affichage :**
```ts
const formatDate = (str: string) => {
  if (!str) return '—';
  return new Date(str.replace(' ', 'T'))
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
// "2025-05-17 14:30:00" → "17 mai 2025"
```

**Template — carte par jour :**
```html
<div v-for="day in statsByDay" :key="day.date" class="day-card">
  <div class="day-date">{{ formatDate(day.date) }}</div>
  <div class="day-count">{{ day.count }} commande(s)</div>
  <div class="day-total">{{ formatCurrency(day.total) }}</div>
</div>
```

---

### 1c — Import déclinaison (pas de combinaison)

**Fichier concerné :**
- `src/views/backoffice/import/ImportDeclinaison.vue`
- `src/services/fichier2ImportService.ts`

**Règle Jour 2 :** Le fichier 1 contient les déclinaisons directement (colonne `specificite`/`karazany`).  
Il n'y a **pas** de combinaison multi-attributs (pas de taille + couleur en même temps).

**Implémentation :**
```ts
// Une ligne = une déclinaison simple (1 seul groupe d'attribut)
const specificite = col(row, 'specificite');  // ex: "Couleur"
const karazany    = col(row, 'karazany');     // ex: "Noir"

// Si les deux sont présents → créer le groupe + la valeur + la combinaison
if (specificite && karazany) {
  // 1 seul groupe d'attribut par combinaison → pas de combinaison multi-axes
}
```

**Différence avec une vraie combinaison :**
- Combinaison multi-attributs : `Taille=XL + Couleur=Noir` → une seule combinaison avec 2 valeurs
- Déclinaison simple : `Couleur=Noir` → une combinaison avec 1 seule valeur

**XML de la combinaison (1 seule valeur d'attribut) :**
```xml
<combination>
  <id_product><![CDATA[81]]></id_product>
  <reference><![CDATA[T_01-Noir]]></reference>
  <associations>
    <product_option_values>
      <product_option_value>
        <id><![CDATA[12]]></id>   <!-- 1 seule valeur -->
      </product_option_value>
    </product_option_values>
  </associations>
</combination>
```

---

## Frontoffice

---

### 2a — Page d'accueil = liste des utilisateurs

**Fichiers concernés :**
- `src/views/frontoffice/auth/UserPickerView.vue`
- `src/router/index.ts` → `path: '/'` pointe vers `UserPickerView`
- `src/services/useAuth.ts`

**Chargement des clients PS :**
```ts
const loadUsers = async () => {
  loading.value = true;
  const res = await api.get(
    '/customers?output_format=XML&display=[id,firstname,lastname,email]&filter[active]=1'
  );
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, 'text/xml');

  users.value = Array.from(xmlDoc.querySelectorAll('customer')).map(el => ({
    id:        el.querySelector('id')?.textContent?.trim() || '',
    firstname: el.querySelector('firstname')?.textContent?.trim() || '',
    lastname:  el.querySelector('lastname')?.textContent?.trim() || '',
    email:     el.querySelector('email')?.textContent?.trim() || '',
  }));
};
```

**Recherche client dans la liste :**
```ts
const search = ref('');
const filteredUsers = computed(() => {
  if (!search.value.trim()) return users.value;
  const q = search.value.toLowerCase();
  return users.value.filter(u =>
    u.firstname.toLowerCase().includes(q) ||
    u.lastname.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  );
});
```

**Sélection d'un utilisateur = connexion automatique :**
```ts
const selectUser = async (user: User) => {
  selected.value = user;
  // Récupérer le secure_key depuis PS (utilisé comme token interne)
  const res = await api.get(`/customers/${user.id}?output_format=XML`);
  const secureKey = xmlDoc.querySelector('secure_key')?.textContent?.trim() || '';

  // Connecter via useAuth
  login(user, secureKey);
};

const handleContinue = () => {
  router.push('/home');
};
```

**Option utilisateur anonyme :**
```ts
const selectAnon = () => {
  selected.value = { id: '0', firstname: 'Anonyme', lastname: '', email: '' };
  // Ne pas appeler login() → isLoggedIn reste false
  // Le panier fonctionne quand même (localStorage)
};
```

**Template — carte utilisateur :**
```html
<div v-for="user in filteredUsers" :key="user.id"
     class="user-card"
     :class="{ selected: selected?.id === user.id }"
     @click="selectUser(user)">
  <div class="avatar">{{ initials(user.firstname, user.lastname) }}</div>
  <div class="user-info">
    <div class="user-name">{{ user.firstname }} {{ user.lastname }}</div>
    <div class="user-email">{{ user.email }}</div>
  </div>
</div>

<!-- Séparateur -->
<div class="divider"><span></span><em>ou</em><span></span></div>

<!-- Anonyme -->
<div class="user-card anon-card" @click="selectAnon">
  <div class="avatar avatar-anon">?</div>
  <div class="user-info">
    <div class="user-name">Utilisateur anonyme</div>
    <div class="user-email">Parcourir sans compte</div>
  </div>
</div>
```

**Calcul des initiales :**
```ts
const initials = (firstname: string, lastname: string) =>
  `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase() || '?';
// "Jean Dupont" → "JD"
```

---

### 2b — Badges HOT / NEW

**Fichiers concernés :**
- `src/views/frontoffice/product/ProductsView.vue`
- `src/views/frontoffice/HomeView.vue`
- `src/views/frontoffice/product/ProductDetailView.vue`

**Fonction `getAvailabilityBadge` :**
```ts
const getAvailabilityBadge = (dateStr: string): 'HOT' | 'NEW' | null => {
  if (!dateStr || dateStr === '0000-00-00') return null;

  const available = new Date(dateStr);  // "2025-05-17" → Date
  if (isNaN(available.getTime())) return null;

  const diffMs = Date.now() - available.getTime();
  const ONE_DAY  = 1000 * 60 * 60 * 24;
  const ONE_WEEK = ONE_DAY * 7;

  if (diffMs >= 0 && diffMs < ONE_DAY)  return 'HOT';   // sorti il y a < 1 jour
  if (diffMs >= 0 && diffMs < ONE_WEEK) return 'NEW';   // sorti il y a < 7 jours
  return null;
};
```

**Pourquoi `diffMs >= 0` ?**  
Les produits avec une date future (pas encore disponibles) ne doivent pas avoir de badge.

**La colonne `available_date` (PS) = `date_availability_produit` (CSV) :**
```ts
// Dans la lecture XML du produit
date_add: el.querySelector('available_date')?.textContent?.trim() || ''
```
PS stocke ce champ dans la colonne `available_date` du produit.

**Template — badge :**
```html
<div class="product-card">
  <!-- Badge HOT ou NEW si applicable -->
  <span v-if="getAvailabilityBadge(product.date_add) === 'HOT'"
        class="badge badge-hot">🔥 HOT</span>
  <span v-else-if="getAvailabilityBadge(product.date_add) === 'NEW'"
        class="badge badge-new">✨ NEW</span>

  <img :src="product.image_url" ... />
  <h3>{{ product.name }}</h3>
</div>
```

**CSS des badges :**
```css
.badge-hot {
  background: linear-gradient(135deg, #ff4444, #ff6b35);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.badge-new {
  background: linear-gradient(135deg, #2196f3, #00bcd4);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}
```

---

### 2c — Recherche multicritère

**Fichier concerné :**
- `src/views/frontoffice/product/ProductsView.vue`

**État des filtres :**
```ts
const searchQuery     = ref('');           // filtre par nom
const selectedCategory = ref('');          // filtre par catégorie
const priceMin        = ref<number | null>(null);  // borne inférieure prix
const priceMax        = ref<number | null>(null);  // borne supérieure prix
const sortBy          = ref('name-asc');   // tri
```

**Computed `filteredProducts` — applique tous les filtres en chaîne :**
```ts
const filteredProducts = computed(() => {
  let filtered = products.value;

  // 1. Filtre par nom (insensible à la casse)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  // 2. Filtre par catégorie
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.id_category_default === selectedCategory.value);
  }

  // 3. Filtre par intervalle de prix
  if (priceMin.value !== null || priceMax.value !== null) {
    filtered = filtered.filter(p => {
      const price = parseFloat(p.price);
      if (isNaN(price)) return false;
      if (priceMin.value !== null && price < priceMin.value) return false;
      if (priceMax.value !== null && price > priceMax.value) return false;
      return true;
    });
  }

  // 4. Tri
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':   return a.name.localeCompare(b.name);
      case 'name-desc':  return b.name.localeCompare(a.name);
      case 'price-asc':  return parseFloat(a.price || '0') - parseFloat(b.price || '0');
      case 'price-desc': return parseFloat(b.price || '0') - parseFloat(a.price || '0');
      default: return 0;
    }
  });

  return filtered;
});
```

**Avantage du `computed` :** Vue recalcule automatiquement `filteredProducts` à chaque
changement de `searchQuery`, `selectedCategory`, `priceMin`, `priceMax` ou `sortBy`.  
Pas besoin de watcher ou de déclencheur manuel.

**Chargement des catégories pour le `<select>` :**
```ts
const loadCategories = async () => {
  const res = await api.get('/categories?output_format=XML&display=[id,name]&filter[active]=1');
  // Parser XML → categories.value = [{id, name}]
};
```

**Filtre actif visible — tag cliquable pour retirer :**
```html
<div v-if="hasActiveFilters" class="active-filters">
  <!-- Tag filtre nom -->
  <span v-if="searchQuery" class="filter-tag">
    "{{ searchQuery }}"
    <button @click="searchQuery = ''">✕</button>
  </span>

  <!-- Tag filtre catégorie -->
  <span v-if="selectedCategory" class="filter-tag">
    {{ getCategoryName(selectedCategory) }}
    <button @click="selectedCategory = ''">✕</button>
  </span>

  <!-- Tag filtre prix -->
  <span v-if="priceMin !== null || priceMax !== null" class="filter-tag">
    {{ formatPriceRange() }}
    <button @click="clearPriceRange()">✕</button>
  </span>
</div>
```

**`hasActiveFilters` — computed booléen :**
```ts
const hasActiveFilters = computed(() =>
  !!(searchQuery.value || selectedCategory.value || priceMin.value !== null || priceMax.value !== null)
);
```

**Reset complet :**
```ts
const resetFilters = () => {
  searchQuery.value      = '';
  selectedCategory.value = '';
  priceMin.value         = null;
  priceMax.value         = null;
  sortBy.value           = 'name-asc';
};
```

**Formatage de l'intervalle de prix affiché :**
```ts
const formatPriceRange = () => {
  if (priceMin.value !== null && priceMax.value !== null)
    return `${formatPriceNumber(priceMin.value)} — ${formatPriceNumber(priceMax.value)}`;
  if (priceMin.value !== null) return `≥ ${formatPriceNumber(priceMin.value)}`;
  if (priceMax.value !== null) return `≤ ${formatPriceNumber(priceMax.value)}`;
  return '';
};
```
