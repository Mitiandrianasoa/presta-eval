# Réinitialisation des données — Explication détaillée

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Les 4 mécanismes de réinitialisation](#2-les-4-mécanismes-de-réinitialisation)
3. [Mécanisme 1 — Réinitialisation complète (`resetAll`)](#3-mécanisme-1--réinitialisation-complète-resetall)
4. [Mécanisme 2 — Réinitialisation d'une table (`executeReset`)](#4-mécanisme-2--réinitialisation-dune-table-executereset)
5. [Mécanisme 3 — Réinitialisation multiple (`executeMultipleReset`)](#5-mécanisme-3--réinitialisation-multiple-executemultiplereset)
6. [Mécanisme 4 — Réinitialisation du stock unitaire (`resetStock`)](#6-mécanisme-4--réinitialisation-du-stock-unitaire-resetstock)
7. [Mécanisme 5 — Réinitialisation de session (déconnexion)](#7-mécanisme-5--réinitialisation-de-session-déconnexion)
8. [Concepts transversaux](#8-concepts-transversaux)
9. [Schéma récapitulatif](#9-schéma-récapitulatif)

---

## 1. Vue d'ensemble

Dans ce projet, « réinitialiser les données » peut vouloir dire **deux choses différentes** selon le contexte :

| Contexte | Ce que ça fait |
|---|---|
| **Backoffice (admin)** | Supprime les enregistrements dans PrestaShop via l'API REST (DELETE) |
| **Frontoffice (client)** | Efface la session locale (token, panier) dans le `localStorage` du navigateur |

Le backoffice contient la logique principale et la plus complexe. Elle est répartie dans deux fichiers :
- **`src/stores/reset/resetStore.ts`** — réinitialisation globale de toute la base
- **`src/views/backoffice/ConfigView.vue`** — réinitialisation table par table via l'interface

---

## 2. Les 4 mécanismes de réinitialisation

```
┌──────────────────────────────────────────────────────────────────────┐
│                      RÉINITIALISATION DES DONNÉES                    │
├──────────────────────┬───────────────────────────────────────────────┤
│ resetStore.ts        │  resetAll()          → tout supprimer (67 res.)│
├──────────────────────┼───────────────────────────────────────────────┤
│ ConfigView.vue       │  executeReset()      → 1 table à la fois      │
│                      │  executeMultipleReset() → plusieurs tables     │
├──────────────────────┼───────────────────────────────────────────────┤
│ stockStore.ts        │  resetStock(id)      → 1 stock → quantité 0   │
├──────────────────────┼───────────────────────────────────────────────┤
│ FrontHeader.vue      │  handleLogout()      → vider le localStorage  │
└──────────────────────┴───────────────────────────────────────────────┘
```

---

## 3. Mécanisme 1 — Réinitialisation complète (`resetAll`)

**Fichier :** `src/stores/reset/resetStore.ts`

### 3.1 La liste `RESOURCES`

La première chose définie dans ce fichier est un tableau `RESOURCES`. Chaque entrée décrit **une ressource PrestaShop** à supprimer :

```typescript
interface Resource {
  label:    string;   // Nom lisible ("Produits", "Clients"…)
  endpoint: string;   // Endpoint API PrestaShop ("/products", "/customers"…)
  tag:      string;   // Balise XML dans la réponse ("product", "customer"…)
  skip?:    number[]; // IDs à ne JAMAIS supprimer (protégés)
  soft?:    boolean;  // true = ignorer les erreurs silencieusement
}
```

Le tableau liste **27 types de ressources** dans un **ordre précis** (des dépendances vers les parents) :

```
1. Valeurs caractéristiques  ← dépend de rien
2. Valeurs options           ← dépend de rien
3. Combinaisons              ← dépend de options
4. Prix spécifiques          ← dépend de produits
5. Tags
6. Pièces jointes
7. Commentaires (soft)
8. Listes de souhaits (soft)
9. Règles panier
10. Commandes (soft)
11. Adresses
12. Produits                 ← ressource principale
13. Catégories               ← skip: [1, 2]  (racine et accueil protégés)
14. Fabricants
15. Fournisseurs
16. Caractéristiques produits
17. Options produits
18. Clients
19. Invités (soft)
20. Stocks disponibles (soft)
21. Entrepôts (soft)
22. Transporteurs (soft)
23. Magasins (soft)
24. CMS (soft)
... etc.
```

> **Pourquoi cet ordre ?** PrestaShop refuse de supprimer un produit s'il existe encore des prix spécifiques ou des combinaisons liés à lui. Il faut donc toujours supprimer les **enfants avant les parents**.

### 3.2 La fonction utilitaire `parseIds`

```typescript
function parseIds(xml: string, tag: string, skip: number[] = []): number[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.getElementsByTagName(tag))
    .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
    .filter(id => id > 0 && !skip.includes(id));
}
```

**Ce que ça fait :**
1. Prend le XML brut retourné par l'API PrestaShop
2. Cherche toutes les balises correspondant au `tag` (ex: `<product>`, `<customer>`)
3. Extrait le champ `<id>` de chacune
4. **Filtre** : supprime les IDs à 0 et ceux présents dans le tableau `skip`
5. Retourne la liste des IDs valides à supprimer

### 3.3 L'action `resetAll()` — algorithme en 2 phases

```typescript
async resetAll() {
  // Initialisation de l'état de progression
  this.loading  = true;
  this.progress = 0;
  this.total    = 0;
  this.step     = 'Récupération des données...';

  // ── PHASE 1 : Collecte de tous les IDs ──────────────────
  const plan: { res: Resource; ids: number[] }[] = [];

  for (const res of RESOURCES) {
    try {
      const r = await api.get(
        `/${res.endpoint}?output_format=XML&display=[id]&limit=5000`
      );
      const ids = parseIds(r.data, res.tag, res.skip);
      plan.push({ res, ids });
      this.total += ids.length;      // cumule le total pour la barre de progression
    } catch {
      plan.push({ res, ids: [] });   // si erreur API : on ignore cette ressource
    }
  }

  // ── PHASE 2 : Suppression dans l'ordre ──────────────────
  for (const { res, ids } of plan) {
    if (ids.length === 0) continue;
    this.step = `Suppression : ${res.label} (${ids.length})`;

    for (const id of [...ids].sort((a, b) => b - a)) {  // ← ordre décroissant
      try {
        await api.delete(`/${res.endpoint}/${id}`);
      } catch (e: any) {
        if (!res.soft) throw new Error(`Erreur ${res.endpoint}/${id}`);
        // si soft: true → on continue silencieusement
      }
      this.progress++;  // met à jour la barre de progression
    }
  }

  this.step = 'Terminé';
}
```

**Pourquoi 2 phases séparées ?**

- **Phase 1 (collecte)** : on récupère d'abord tous les IDs pour savoir exactement combien d'éléments il y a au total → cela permet d'afficher une barre de progression précise (`progress / total`).
- **Phase 2 (suppression)** : on supprime dans l'ordre défini dans `RESOURCES`. On traite les IDs en **ordre décroissant** (`b - a`) car dans PrestaShop, les IDs les plus récents ont souvent des dépendances vers les plus anciens.

**L'état Pinia pendant l'exécution :**

```
state.loading  = true
state.step     = "Suppression : Produits (42)"   ← mise à jour en temps réel
state.progress = 17                              ← nombre d'éléments déjà supprimés
state.total    = 156                             ← total calculé en phase 1
```

Ces valeurs sont réactives et s'affichent dans l'interface sous forme de barre de progression.

---

## 4. Mécanisme 2 — Réinitialisation d'une table (`executeReset`)

**Fichier :** `src/views/backoffice/ConfigView.vue`

### 4.1 Déclenchement par l'utilisateur

L'interface permet de choisir une table dans un `<select>`, puis :

```
Utilisateur sélectionne une table
        ↓
onTableChange() → vérifie le nombre d'enregistrements (checkTableCount)
        ↓
Utilisateur clique "Réinitialiser"
        ↓
confirmReset() → showConfirm = true  (boîte de confirmation)
        ↓
Utilisateur confirme
        ↓
executeReset()
```

### 4.2 La fonction `executeReset()`

```typescript
const executeReset = async () => {
  showConfirm.value = false;
  const table = currentTable();  // retrouve l'entrée dans le tableau tables[]

  loading.value = true;
  step.value = `Récupération des données ${table.label}...`;

  // Étape 1 : récupérer tous les IDs de cette table
  const res = await api.get(
    `/${table.endpoint}?output_format=XML&display=[id]&limit=10000`
  );
  const doc = new DOMParser().parseFromString(res.data, 'text/xml');
  const elements = Array.from(doc.getElementsByTagName(table.tag));
  const skip = table.skip || [];

  const ids = elements
    .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
    .filter(id => id > 0 && !skip.includes(id));  // protection skip

  total.value = ids.length;

  // Étape 2 : supprimer un par un, en ordre décroissant
  for (const id of [...ids].sort((a, b) => b - a)) {
    try {
      await api.delete(`/${table.endpoint}/${id}`);
    } catch (e: any) {
      if (!table.soft) throw new Error(`Erreur...`);
      // soft → on continue même en cas d'erreur
    }
    progress.value++;
    step.value = `Suppression de ${table.label}... (${progress.value}/${total.value})`;
  }

  // Résultat
  resetResult.value = {
    success: true,
    message: `${ids.length} élément(s) supprimés avec succès.`
  };

  await checkTableCount();  // rafraîchit le compteur affiché
};
```

**Différence avec `resetAll` :** cette fonction ne traite qu'**une seule table** à la fois. C'est l'utilisateur qui choisit quelle table réinitialiser via l'interface.

### 4.3 La liste `tables` dans `ConfigView.vue`

`ConfigView.vue` définit un tableau `tables` beaucoup plus grand que `RESOURCES` dans `resetStore.ts` : il couvre **plus de 180 tables** PrestaShop organisées en catégories :
- Produits & catalogue (22 tables)
- Prix & promotions (8 tables)
- Clients & commandes (25 tables)
- Stock & entrepôts (11 tables)
- Livraison & transport (18 tables)
- Taxes & configuration (18 tables)
- CMS & contenu (12 tables)
- Employés & permissions (14 tables)
- Modules (12 tables)
- Et bien d'autres...

---

## 5. Mécanisme 3 — Réinitialisation multiple (`executeMultipleReset`)

**Fichier :** `src/views/backoffice/ConfigView.vue`

Permet de cocher plusieurs tables et de toutes les réinitialiser en une seule opération.

```typescript
const executeMultipleReset = async () => {
  for (const tableName of selectedTables.value) {
    const table = tables.find(t => t.table === tableName);

    // Récupération des IDs
    const res = await api.get(`/${table.endpoint}?output_format=XML&display=[id]&limit=10000`);
    const ids = ...  // même logique que executeReset

    // Suppression
    for (const id of [...ids].sort((a, b) => b - a)) {
      try {
        await api.delete(`/${table.endpoint}/${id}`);
        totalDeleted++;
      } catch (e: any) {
        if (!table.soft) throw new Error(...);
      }
    }
    successCount++;
  }

  // Nettoyage de la sélection après exécution
  selectedTables.value = [];
  selectedTable.value = '';
};
```

**Gestion des sélections :**
- `selectAllTables()` → coche toutes les tables visibles (filtrées par recherche)
- `clearAllTables()` → décoche tout
- `toggleTableSelection(name)` → inverse l'état d'une case

---

## 6. Mécanisme 4 — Réinitialisation du stock unitaire (`resetStock`)

**Fichier :** `src/stores/stock/stockStore.ts`

```typescript
async resetStock(id: string) {
  await this.updateQuantity(id, 0);  // met la quantité à 0
}
```

C'est la forme de réinitialisation la plus simple. Elle délègue à `updateQuantity` qui envoie une requête **PUT** (pas DELETE) à PrestaShop :

```typescript
async updateQuantity(id: string, quantity: number) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><stock_available>
  <id>${id}</id>
  <quantity>${quantity}</quantity>
</stock_available></prestashop>`;

  await api.put(`/stock_availables/${id}`, xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' }
  });

  // Met aussi à jour le state local immédiatement (sans rechargement)
  const stock = this.stocks.find(s => s.id === id);
  if (stock) stock.quantity = quantity;
}
```

> **Note :** `resetStock` ne supprime pas l'enregistrement stock, il le **met à 0**. C'est une réinitialisation de valeur, pas une suppression.

---

## 7. Mécanisme 5 — Réinitialisation de session (déconnexion)

**Fichier :** `src/components/FrontHeader.vue`

Ce mécanisme ne touche pas la base de données PrestaShop. Il efface uniquement les données stockées **dans le navigateur** de l'utilisateur.

```typescript
const handleLogout = () => {
  localStorage.removeItem('prestashop_token');  // supprime le token JWT
  localStorage.removeItem('prestashop_user');   // supprime les infos utilisateur

  // Le panier n'est supprimé QUE si "se souvenir de moi" n'est pas activé
  if (!localStorage.getItem('prestashop_remember')) {
    localStorage.removeItem('prestashop_cart');
  }

  currentUser.value = null;    // réinitialise le state Vue
  showDropdown.value = false;
  router.push('/');            // redirige vers l'accueil
};
```

**Les 4 clés du `localStorage` utilisées :**

| Clé | Contenu | Effacée à la déconnexion ? |
|---|---|---|
| `prestashop_token` | Token JWT encodé en base64 | Toujours |
| `prestashop_user` | Objet JSON avec les infos client | Toujours |
| `prestashop_cart` | Tableau JSON des articles du panier | Seulement si pas "se souvenir" |
| `prestashop_remember` | `"true"` si case cochée | Non |

---

## 8. Concepts transversaux

### 8.1 Suppression "soft" vs "hard"

| Mode | Propriété | Comportement |
|---|---|---|
| **Hard** (défaut) | `soft: undefined` | Si l'API retourne une erreur → l'opération s'arrête et remonte l'erreur |
| **Soft** | `soft: true` | Si l'API retourne une erreur → on l'ignore et on continue |

Le mode **soft** est utilisé pour les ressources que PrestaShop peut refuser de supprimer (commandes, stock, configuration boutique…). Plutôt que de bloquer toute la réinitialisation, on continue avec les autres ressources.

### 8.2 Protection des IDs critiques (`skip`)

```typescript
{ label: 'Catégories', endpoint: 'categories', tag: 'category', skip: [1, 2] }
```

Les IDs `1` et `2` sont les catégories **Racine** et **Accueil** de PrestaShop. Ces deux catégories sont indispensables au fonctionnement de la boutique. Si elles étaient supprimées, PrestaShop deviendrait inutilisable. Le tableau `skip` les protège explicitement : même si l'API les retourne, le code les **exclut** avant de lancer les suppressions.

### 8.3 Ordre décroissant des IDs

```typescript
for (const id of [...ids].sort((a, b) => b - a)) { ... }
```

Les IDs sont triés du plus grand au plus petit. Cela garantit que les enregistrements **les plus récents** (qui sont souvent liés aux plus anciens) sont supprimés en premier. Cela réduit les risques de conflits de clés étrangères dans la base de données.

### 8.4 Suivi de la progression

Dans `resetStore.ts`, le state Pinia expose 4 variables réactives :

```typescript
state: () => ({
  loading:  false,   // true pendant l'exécution
  step:     '',      // message de l'étape en cours (ex: "Suppression : Produits (42)")
  progress: 0,       // nombre d'éléments déjà supprimés
  total:    0,       // nombre total d'éléments à supprimer
})
```

Un composant Vue peut calculer le pourcentage d'avancement avec :
```typescript
const percent = computed(() => resetStore.total > 0
  ? Math.round((resetStore.progress / resetStore.total) * 100)
  : 0
);
```

---

## 9. Schéma récapitulatif

```
DÉCLENCHEUR                ACTION                     RÉSULTAT
──────────────────────────────────────────────────────────────────

Bouton "Réinitialiser     resetAll()               Supprime toutes
tout" (backoffice)     ──────────────────────────► les ressources
                          resetStore.ts             dans l'ordre des
                                                    dépendances

Sélection d'une table      executeReset()           Supprime tous les
+ bouton Reset         ──────────────────────────► enregistrements
(backoffice)              ConfigView.vue            de cette table

Sélection de N tables   executeMultipleReset()      Supprime tous les
+ bouton Reset         ──────────────────────────► enregistrements
(backoffice)              ConfigView.vue            des N tables

Bouton "Remettre à 0"     resetStock(id)            Met la quantité
(gestion stock)        ──────────────────────────► du stock à 0
                          stockStore.ts             via PUT

Bouton "Déconnexion"       handleLogout()           Supprime token,
(frontoffice)          ──────────────────────────► user et panier
                          FrontHeader.vue           du localStorage
```

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/stores/reset/resetStore.ts` | Store Pinia — réinitialisation globale complète |
| `src/views/backoffice/ConfigView.vue` | Vue backoffice — interface table par table |
| `src/stores/stock/stockStore.ts` | Store Pinia — remise à zéro d'un stock unitaire |
| `src/components/FrontHeader.vue` | Composant — nettoyage de la session navigateur |
| `src/api/api.ts` | Instance Axios configurée (clé API PrestaShop) |
