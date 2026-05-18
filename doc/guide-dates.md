# Guide — Manipulation des dates

Toutes les opérations sur les dates utilisées dans le projet : parsing, formatage,
comparaison, validation, arithmétique et affichage.

---

## Table des matières

1. [Concepts fondamentaux](#1-concepts-fondamentaux)
2. [Créer une date](#2-créer-une-date)
3. [Lire les composantes d'une date](#3-lire-les-composantes-dune-date)
4. [Formater une date en chaîne](#4-formater-une-date-en-chaîne)
5. [Comparer des dates](#5-comparer-des-dates)
6. [Arithmétique — ajouter / soustraire](#6-arithmétique--ajouter--soustraire)
7. [Valider une date](#7-valider-une-date)
8. [parseFlexibleDate — le parseur du projet](#8-parseflexibledate--le-parseur-du-projet)
9. [Cas métier du projet](#9-cas-métier-du-projet)
   - [Badge HOT / NEW](#91-badge-hot--new)
   - [Filtrer les commandes par jour (dashboard)](#92-filtrer-les-commandes-par-jour-dashboard)
   - [Valider le format DD/MM/YYYY à l'import](#93-valider-le-format-ddmmyyyy-à-limport)
   - [Évolution stock journalier](#94-évolution-stock-journalier)
10. [Pièges courants](#10-pièges-courants)
11. [Référence rapide](#11-référence-rapide)

---

## 1. Concepts fondamentaux

### L'objet `Date` JavaScript

`Date` stocke en interne un **timestamp Unix en millisecondes** (ms depuis le 1er janvier 1970 UTC).

```ts
const d = new Date();          // maintenant
d.getTime();                   // → 1747123456789  (ms)
Date.now();                    // → idem, sans créer d'objet
```

### Formats dans le projet

| Contexte | Format | Exemple |
|----------|--------|---------|
| PrestaShop WS (stockage) | `YYYY-MM-DD HH:MM:SS` | `2025-05-01 14:30:00` |
| PrestaShop date seule | `YYYY-MM-DD` | `2025-05-01` |
| CSV français (import) | `DD/MM/YYYY` | `01/05/2025` |
| Affichage utilisateur | `DD/MM/YYYY` ou `DD/MM/YYYY HH:MM` | `01/05/2025 14:30` |
| ISO JavaScript | `YYYY-MM-DDTHH:MM:SS.mmmZ` | `2025-05-01T14:30:00.000Z` |

**Règle d'or du projet :**
- **Entrée** (import CSV/XML) : accepter tous les formats → normaliser en `YYYY-MM-DD`
- **Stockage** (WS PrestaShop) : toujours `YYYY-MM-DD`
- **Affichage** (frontoffice/backoffice) : toujours `DD/MM/YYYY`

---

## 2. Créer une date

```ts
// Date actuelle
const now = new Date();

// Depuis une chaîne ISO (fiable, pas d'ambiguïté de timezone)
const d1 = new Date('2025-05-01');            // minuit UTC
const d2 = new Date('2025-05-01T00:00:00');   // minuit heure locale

// Depuis composantes (mois = 0-indexé !)
const d3 = new Date(2025, 4, 1);   // 1er MAI 2025 (mois 4 = mai)
const d4 = new Date(2025, 0, 1);   // 1er JANVIER 2025

// Depuis un timestamp Unix (secondes → ×1000 pour ms)
const d5 = new Date(1746057600 * 1000);

// ⚠️ PIÈGE : new Date("01/05/2025") est ambigu selon la locale du navigateur
// En France → 1er mai, en US → 5 janvier
// TOUJOURS utiliser le format YYYY-MM-DD avec new Date()
```

---

## 3. Lire les composantes d'une date

```ts
const d = new Date('2025-05-01T14:30:45');

// Composantes heure LOCALE (dépend du fuseau de l'utilisateur)
d.getFullYear()     // → 2025
d.getMonth()        // → 4  (mai = mois 4, janvier = 0 !)
d.getMonth() + 1    // → 5  (numéro humain du mois)
d.getDate()         // → 1  (jour du mois, 1-31)
d.getDay()          // → 4  (jour de la semaine : 0=dim, 1=lun, ..., 6=sam)
d.getHours()        // → 14
d.getMinutes()      // → 30
d.getSeconds()      // → 45

// Composantes UTC (indépendantes du fuseau)
d.getUTCFullYear()
d.getUTCMonth()
d.getUTCDate()

// Timestamp millisecondes
d.getTime()         // → 1746103845000
```

### Tableau des getters

| Méthode | Retourne | Exemple (1er mai 2025) |
|---------|----------|------------------------|
| `getFullYear()` | Année (4 chiffres) | `2025` |
| `getMonth()` | Mois **0-indexé** | `4` (= mai) |
| `getMonth() + 1` | Mois **humain** | `5` |
| `getDate()` | Jour du mois (1–31) | `1` |
| `getDay()` | Jour semaine (0=dim) | `4` (= jeudi) |
| `getHours()` | Heure (0–23) | `14` |
| `getMinutes()` | Minutes (0–59) | `30` |
| `getTime()` | Timestamp ms | `1746103845000` |

---

## 4. Formater une date en chaîne

### Fonctions utilitaires du projet

```ts
// ─── Formater en YYYY-MM-DD (format PS WS) ───
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

toIso(new Date('2025-05-01'))   // → "2025-05-01"
toIso(new Date())               // → "2025-05-17" (aujourd'hui)


// ─── Formater en DD/MM/YYYY (affichage français) ───
function toFr(d: Date): string {
  const j = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${j}/${m}/${y}`;
}

toFr(new Date('2025-05-01'))    // → "01/05/2025"


// ─── Formater en DD/MM/YYYY HH:MM (affichage avec heure) ───
function toFrDatetime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${toFr(d)} ${h}:${min}`;
}

toFrDatetime(new Date('2025-05-01T14:30:00'))  // → "01/05/2025 14:30"


// ─── Depuis une chaîne ISO PrestaShop ("2025-05-01 14:30:00") ───
function psDateToFr(psDate: string): string {
  if (!psDate || psDate === '0000-00-00 00:00:00') return '—';
  // Remplacer l'espace par T pour que new Date() le parse correctement
  return toFrDatetime(new Date(psDate.replace(' ', 'T')));
}

psDateToFr('2025-05-01 14:30:00')   // → "01/05/2025 14:30"
psDateToFr('0000-00-00 00:00:00')   // → "—"
```

### Avec `Intl.DateTimeFormat` (natif, localisé)

```ts
const d = new Date('2025-05-01');

// Format court français
new Intl.DateTimeFormat('fr-FR').format(d)
// → "01/05/2025"

// Format long français
new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(d)
// → "1 mai 2025"

// Avec heure
new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short'
}).format(d)
// → "01/05/2025 00:00"

// Format personnalisé
new Intl.DateTimeFormat('fr-FR', {
  day:   '2-digit',
  month: 'long',
  year:  'numeric'
}).format(d)
// → "1 mai 2025"
```

---

## 5. Comparer des dates

### Comparer deux dates

```ts
const a = new Date('2025-05-01');
const b = new Date('2025-06-01');

// Comparaison directe (via timestamp)
a < b          // → true
a > b          // → false
a.getTime() === b.getTime()  // → false (vrai égalité)

// ⚠️ a === b est TOUJOURS false (compare les références d'objet, pas les valeurs)
// Toujours comparer avec getTime() ou en ISO string
```

### Différence en jours

```ts
function diffDays(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  // Math.floor arrondit vers le bas (évite les problèmes DST)
  return Math.floor((d2.getTime() - d1.getTime()) / msPerDay);
}

diffDays(new Date('2025-05-01'), new Date('2025-05-08'))   // → 7
diffDays(new Date('2025-05-08'), new Date('2025-05-01'))   // → -7 (négatif = dans le passé)
```

### Tester si une date est dans un intervalle

```ts
function isBetween(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

// Exemple : commandes de la semaine
const today    = new Date();
const monday   = addDays(today, -(today.getDay() || 7) + 1);  // lundi
const sunday   = addDays(monday, 6);                          // dimanche
isBetween(orderDate, monday, sunday)
```

### Tester si une date est dans le passé / futur

```ts
const now = new Date();

date < now   // date passée
date > now   // date future

// Comparaison jour par jour (ignorer l'heure)
function isBeforeToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isTodayOrLater(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}
```

---

## 6. Arithmétique — ajouter / soustraire

### Ajouter/soustraire des jours

```ts
function addDays(d: Date, n: number): Date {
  const result = new Date(d);        // copie pour ne pas muter l'original
  result.setDate(result.getDate() + n);
  return result;
}

addDays(new Date('2025-05-01'), 7)    // → 2025-05-08
addDays(new Date('2025-05-01'), -1)   // → 2025-04-30 (hier)
addDays(new Date('2025-01-28'), 5)    // → 2025-02-02 (gère le changement de mois)
```

### Ajouter des mois

```ts
function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + n);
  return result;
}

addMonths(new Date('2025-01-31'), 1)  // → 2025-03-03 (⚠️ 31 fév. n'existe pas → déborde en mars)
addMonths(new Date('2025-01-15'), 1)  // → 2025-02-15  ✅
```

### Début et fin de journée

```ts
function startOfDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);     // 00:00:00.000
  return result;
}

function endOfDay(d: Date): Date {
  const result = new Date(d);
  result.setHours(23, 59, 59, 999); // 23:59:59.999
  return result;
}
```

### Début de semaine (lundi)

```ts
function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();                   // 0=dim … 6=sam
  const diff = day === 0 ? -6 : 1 - day;        // recule au lundi
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
```

---

## 7. Valider une date

### Vérifier si une valeur est une Date valide

```ts
function isValidDate(d: any): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

isValidDate(new Date('2025-05-01'))   // → true
isValidDate(new Date('invalid'))      // → false
isValidDate(null)                     // → false
isValidDate('2025-05-01')            // → false (string, pas Date)
```

### Valider le format DD/MM/YYYY (requis à l'import Jour 3)

```ts
/**
 * Retourne true si la chaîne est exactement au format DD/MM/YYYY
 * avec des valeurs de jour et mois plausibles.
 *
 * Exigence Jour 3 : signaler les dates non conformes lors de l'import.
 */
function isValidDDMMYYYY(str: string): boolean {
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day   = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year  = parseInt(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31)     return false;
  if (year < 1900 || year > 2100) return false;

  // Vérification réelle (31 février → faux)
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth()    === month - 1 &&
    d.getDate()     === day
  );
}

isValidDDMMYYYY('01/05/2025')   // → true
isValidDDMMYYYY('31/02/2025')   // → false (31 février n'existe pas)
isValidDDMMYYYY('2025-05-01')   // → false (format ISO, pas DD/MM/YYYY)
isValidDDMMYYYY('1/5/2025')     // → false (pas de zéro padding)
```

### Validation complète à l'import (Jour 3)

```ts
/**
 * Valide une cellule de date dans un fichier d'import.
 * Retourne { ok: true } ou { ok: false, reason: "..." }
 */
function validateImportDate(raw: string): { ok: boolean; reason?: string } {
  if (!raw || raw.trim() === '') {
    return { ok: false, reason: 'Date vide' };
  }

  if (!isValidDDMMYYYY(raw.trim())) {
    return {
      ok: false,
      reason: `Format de date invalide : "${raw}" — attendu DD/MM/YYYY (ex: 01/05/2025)`
    };
  }

  return { ok: true };
}

// Usage dans un service d'import
const dateRaw = col(row, 'date_commande', 'date');
const check = validateImportDate(dateRaw);
if (!check.ok) {
  log('error', `Ligne ${rowNum} : ${check.reason}`);
  errorCount++;
  continue;
}
const date = parseFlexibleDate(dateRaw);  // convertir en YYYY-MM-DD
```

---

## 8. `parseFlexibleDate` — le parseur du projet

Défini dans `src/services/csvParserUtils.ts`. Convertit **n'importe quel format** en `YYYY-MM-DD`.

### Priorité de traitement

```
Entrée brute (string ou number)
    │
    ▼
1. ISO : YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    │  ex: "2025-05-01" → "2025-05-01"
    │
    ▼
2. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (4 chiffres)
    │  ex: "01/05/2025" → "2025-05-01"
    │
    ▼
3. DD/MM/YY (2 chiffres)  — < 50 → 20xx, ≥ 50 → 19xx
    │  ex: "01/05/25" → "2025-05-01"
    │  ex: "01/05/55" → "1955-05-01"
    │
    ▼
4. Texte FR/EN : "01 mai 2025", "01-May-2025"
    │  ex: "01 mai 2025" → "2025-05-01"
    │
    ▼
5. Texte MDY : "May 01, 2025"
    │  ex: "May 01, 2025" → "2025-05-01"
    │
    ▼
6. Timestamp Unix (10 chiffres = secondes, 13 = ms)
    │  ex: 1746057600 → "2025-05-01"
    │
    ▼
7. Date.parse() — fallback (attention aux ambiguïtés)
    │
    ▼
8. Retourner la chaîne brute telle quelle (pas de throw)
```

### Utilisation

```ts
import { parseFlexibleDate } from '@/services/csvParserUtils';

parseFlexibleDate('01/05/2025')           // → "2025-05-01"
parseFlexibleDate('2025-05-01')           // → "2025-05-01"
parseFlexibleDate('01 mai 2025')          // → "2025-05-01"
parseFlexibleDate('May 01, 2025')         // → "2025-05-01"
parseFlexibleDate(1746057600)             // → "2025-05-01"
parseFlexibleDate('')                     // → ""
parseFlexibleDate('pas une date')         // → "pas une date" (pas d'erreur)
```

---

## 9. Cas métier du projet

### 9.1 Badge HOT / NEW

Requis en **Jour 2** — afficher un badge sur les produits selon `date_availability_produit`.

```ts
// src/utils/productBadge.ts

/**
 * Calcule le badge à afficher sur un produit.
 * - HOT : disponible depuis moins de 1 jour
 * - NEW : disponible depuis moins de 7 jours
 * - null : produit ancien
 *
 * @param availableDateStr  Chaîne "YYYY-MM-DD" depuis le WS PrestaShop
 */
export function getProductBadge(availableDateStr: string): 'HOT' | 'NEW' | null {
  if (!availableDateStr || availableDateStr === '0000-00-00') return null;

  // new Date('YYYY-MM-DD') → minuit UTC → on compare en ms
  const available = new Date(availableDateStr);
  if (!isValidDate(available)) return null;

  const now = Date.now();
  const diffMs = now - available.getTime();

  const ONE_DAY  = 1000 * 60 * 60 * 24;       //  86 400 000 ms
  const ONE_WEEK = ONE_DAY * 7;                // 604 800 000 ms

  if (diffMs >= 0 && diffMs < ONE_DAY)  return 'HOT';   // sorti il y a < 1 jour
  if (diffMs >= 0 && diffMs < ONE_WEEK) return 'NEW';   // sorti il y a < 7 jours
  return null;
}

function isValidDate(d: Date): boolean {
  return !isNaN(d.getTime());
}
```

**Utilisation dans `ProductsView.vue` :**

```vue
<template>
  <div v-for="product in products" :key="product.id" class="product-card">
    <!-- Badge -->
    <span v-if="getBadge(product) === 'HOT'" class="badge hot">HOT 🔥</span>
    <span v-else-if="getBadge(product) === 'NEW'" class="badge new">NEW ✨</span>

    <h3>{{ product.name }}</h3>
    <p>{{ product.price }} €</p>
  </div>
</template>

<script setup lang="ts">
import { getProductBadge } from '@/utils/productBadge';

function getBadge(product: any) {
  return getProductBadge(product.available_date);
}
</script>

<style scoped>
.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.hot  { background: #ff4444; color: white; }
.new  { background: #2196f3; color: white; }
</style>
```

---

### 9.2 Filtrer les commandes par jour (dashboard)

Requis en **Jour 2** — tableau de bord avec statistiques par jour.

```ts
// Groupe les commandes par date (YYYY-MM-DD)
function groupOrdersByDay(orders: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();

  for (const order of orders) {
    // order.date_add = "2025-05-01 14:30:00" (format PS)
    const dateKey = order.date_add?.slice(0, 10) ?? 'inconnu'; // → "2025-05-01"
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(order);
  }

  return map;
}

// Calcule les stats par jour
function getDailyStats(orders: any[]): { date: string; count: number; total: number }[] {
  const grouped = groupOrdersByDay(orders);
  const stats: { date: string; count: number; total: number }[] = [];

  grouped.forEach((dayOrders, date) => {
    const total = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_paid_tax_incl || '0'), 0);
    stats.push({ date, count: dayOrders.length, total });
  });

  // Trier par date décroissante (plus récent en premier)
  return stats.sort((a, b) => b.date.localeCompare(a.date));
}

// Affichage dans le template
// stats = [
//   { date: "2025-05-17", count: 3, total: 189000 },
//   { date: "2025-05-16", count: 1, total: 59900 },
// ]
```

**Formatage de la date pour l'affichage :**
```ts
function formatDashboardDate(isoDate: string): string {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day:     'numeric',
    month:   'long'
  }).format(d);
  // → "sam. 17 mai"
}
```

---

### 9.3 Valider le format DD/MM/YYYY à l'import

Requis en **Jour 3** — détecter les dates mal formatées dans les CSV/XML.

```ts
// Dans un service d'import, avant parseFlexibleDate :

const DATE_COLUMNS = ['date_availability_produit', 'date_commande', 'date'];

function validateRowDates(row: Record<string, any>, rowNum: number): string[] {
  const errors: string[] = [];

  for (const colName of DATE_COLUMNS) {
    const raw = col(row, colName);
    if (!raw) continue; // colonne absente ou vide → ok

    // Exiger le format DD/MM/YYYY strict
    if (!isValidDDMMYYYY(raw)) {
      errors.push(
        `Ligne ${rowNum}, colonne "${colName}" : format de date invalide "${raw}". ` +
        `Attendu : DD/MM/YYYY (ex: 01/05/2025)`
      );
    }
  }

  return errors;
}

// Intégration dans la boucle d'import
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const rowNum = i + 1;

  // ① Valider les dates avant de continuer
  const dateErrors = validateRowDates(row, rowNum);
  if (dateErrors.length > 0) {
    dateErrors.forEach(e => log('error', e));
    errorCount += dateErrors.length;
    continue; // passer à la ligne suivante
  }

  // ② Parser et continuer
  const dateRaw = col(row, 'date_availability_produit', 'date');
  const availableDate = parseFlexibleDate(dateRaw);
  // ...
}
```

---

### 9.4 Évolution stock journalier

Requis en **Jour 3** — tableau d'évolution du stock par produit.

```ts
// Chaque entrée = un mouvement de stock enregistré
interface StockMovement {
  date: string;        // "2025-05-17 14:30:00" (format PS)
  quantity_delta: number;  // +10 ou -3
  quantity_after: number;  // stock après mouvement
}

// Grouper les mouvements par jour
function groupMovementsByDay(movements: StockMovement[]): {
  date: string;
  dateLabel: string;
  deltaTotal: number;
  stockFin: number;
}[] {
  const map = new Map<string, { delta: number; last: number }>();

  for (const m of movements) {
    const day = m.date.slice(0, 10);  // "2025-05-17"
    const existing = map.get(day) ?? { delta: 0, last: 0 };
    map.set(day, {
      delta: existing.delta + m.quantity_delta,
      last:  m.quantity_after,  // dernier état de la journée
    });
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))  // tri chronologique
    .map(([date, { delta, last }]) => ({
      date,
      dateLabel: toFr(new Date(date)),  // → "17/05/2025"
      deltaTotal: delta,
      stockFin: last,
    }));
}
```

---

## 10. Pièges courants

### Piège 1 — Mois 0-indexé

```ts
new Date(2025, 4, 1)   // ← mois 4 = MAI (pas avril !)
//                ^
//                0=jan, 1=fév, 2=mar, 3=avr, 4=mai ...

// ✅ Pour créer le 1er mai 2025 sans erreur :
new Date('2025-05-01')          // depuis ISO → fiable
new Date(2025, 4, 1)            // mois 4 (0-indexé)
```

### Piège 2 — Mutation vs copie

```ts
const d = new Date('2025-05-01');

// ❌ Mute l'original !
d.setDate(d.getDate() + 7);   // d est maintenant le 8 mai

// ✅ Toujours copier avant de modifier
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);   // copie
  copy.setDate(copy.getDate() + n);
  return copy;
}
```

### Piège 3 — Comparaison d'égalité

```ts
const a = new Date('2025-05-01');
const b = new Date('2025-05-01');

a === b           // → false  ❌ (compare les références)
a == b            // → false  ❌

// ✅ Comparer par valeur
a.getTime() === b.getTime()         // → true  ✅
a.toISOString() === b.toISOString() // → true  ✅
```

### Piège 4 — `new Date('01/05/2025')` ambigu

```ts
// ❌ Ambigu selon le navigateur/OS
new Date('01/05/2025')   // US → 5 janvier 2025 / FR → 1 mai 2025

// ✅ Toujours passer par YYYY-MM-DD
new Date('2025-05-01')   // → toujours 1er mai 2025
```

### Piège 5 — Fuseau horaire avec `new Date('YYYY-MM-DD')`

```ts
// 'YYYY-MM-DD' seul est interprété en UTC → décalage possible en heure locale
const d = new Date('2025-05-01');
d.toLocaleDateString('fr-FR')   // → peut afficher "30/04/2025" si UTC-x !

// ✅ Forcer l'heure locale
const d = new Date('2025-05-01T00:00:00');   // heure locale
// ou construire manuellement depuis les parties
function fromPsDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);  // heure locale, pas UTC
}
```

### Piège 6 — `setMonth` peut dépasser les jours du mois

```ts
const d = new Date('2025-01-31');
d.setMonth(1);  // février n'a pas 31 jours → déborde en mars !
// → 2025-03-03

// ✅ Utiliser une bibliothèque ou gérer manuellement
function addMonthSafe(d: Date, n: number): Date {
  const result = new Date(d.getFullYear(), d.getMonth() + n, 1); // 1er du mois cible
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(d.getDate(), maxDay));
  return result;
}
```

---

## 11. Référence rapide

### Conversions de format

```ts
// PS WS → affichage français
'2025-05-01 14:30:00'  →  '01/05/2025 14:30'
// new Date(str.replace(' ', 'T')) → toFrDatetime()

// CSV français → PS WS
'01/05/2025'  →  '2025-05-01'
// parseFlexibleDate('01/05/2025')

// Aujourd'hui en ISO
new Date().toISOString().slice(0, 10)   // → "2025-05-17"

// Aujourd'hui en français
new Intl.DateTimeFormat('fr-FR').format(new Date())  // → "17/05/2025"
```

### Formules de durée

```ts
const MS_SECOND = 1000;
const MS_MINUTE = 1000 * 60;
const MS_HOUR   = 1000 * 60 * 60;
const MS_DAY    = 1000 * 60 * 60 * 24;
const MS_WEEK   = MS_DAY * 7;

// Jours entre deux dates
Math.floor((b.getTime() - a.getTime()) / MS_DAY)

// Âge d'une date en jours
Math.floor((Date.now() - date.getTime()) / MS_DAY)
```

### Toutes les fonctions du projet

| Fonction | Fichier | Description |
|----------|---------|-------------|
| `parseFlexibleDate(raw)` | `csvParserUtils.ts` | Tout format → `YYYY-MM-DD` |
| `toIso(date)` | `csvParserUtils.ts` | `Date` → `YYYY-MM-DD` |
| `getProductBadge(dateStr)` | `utils/productBadge.ts` | `'HOT'` / `'NEW'` / `null` |
| `isValidDDMMYYYY(str)` | local dans services | Valide le format français |
| `diffDays(d1, d2)` | local | Nombre de jours entre deux dates |
| `addDays(date, n)` | local | Ajouter/soustraire des jours |
| `psDateToFr(psDate)` | local | `"2025-05-01 14:30"` → `"01/05/2025 14:30"` |
| `startOfDay(date)` | local | Même jour à 00:00:00 |
| `endOfDay(date)` | local | Même jour à 23:59:59 |
| `groupOrdersByDay(orders)` | local | Grouper commandes par date |
