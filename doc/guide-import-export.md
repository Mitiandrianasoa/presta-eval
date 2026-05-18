# Guide Import XML & Export PDF / TXT / CSV

---

## Table des matières

1. [Import — Format XML](#1-import--format-xml)
   - [Structure XML attendue](#11-structure-xml-attendue)
   - [Fichier 1 — Produits (XML)](#12-fichier-1--produits-xml)
   - [Fichier 2 — Déclinaisons/Stock (XML)](#13-fichier-2--déclinaisonsstock-xml)
   - [Fichier 3 — Commandes (XML)](#14-fichier-3--commandes-xml)
   - [Lire un fichier XML en TypeScript](#15-lire-un-fichier-xml-en-typescript)
   - [Convertir XML → tableau de lignes](#16-convertir-xml--tableau-de-lignes)
2. [Export — Format CSV](#2-export--format-csv)
3. [Export — Format TXT](#3-export--format-txt)
4. [Export — Format PDF](#4-export--format-pdf)
5. [Utilitaire de téléchargement](#5-utilitaire-de-téléchargement)
6. [Exemples d'utilisation dans les vues](#6-exemples-dutilisation-dans-les-vues)

---

## 1. Import — Format XML

### 1.1 Structure XML attendue

Le format XML d'import adopté dans ce projet est une **liste d'enregistrements** :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<import>
  <row>
    <colonne1>valeur</colonne1>
    <colonne2>valeur</colonne2>
  </row>
  <row>
    <colonne1>valeur</colonne1>
    <colonne2>valeur</colonne2>
  </row>
</import>
```

> Ce format est différent du XML PrestaShop WS (qui lui utilise `<prestashop><product>...`).  
> Ici, c'est le format du **fichier importé par l'utilisateur**, pas ce qu'on envoie à PS.

---

### 1.2 Fichier 1 — Produits (XML)

Équivalent XML du fichier CSV produits :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<import>
  <row>
    <nom>Téléphone Galaxy S24</nom>
    <reference>T_01</reference>
    <prix_ttc>599000</prix_ttc>
    <prix_achat>420000</prix_achat>
    <Taxe>20</Taxe>
    <categorie>Téléphones</categorie>
    <date_availability_produit>01/05/2025</date_availability_produit>
  </row>
  <row>
    <nom>Écouteurs Bluetooth</nom>
    <reference>A_05</reference>
    <prix_ttc>89000</prix_ttc>
    <prix_achat>55000</prix_achat>
    <Taxe>20</Taxe>
    <categorie>Accessoires</categorie>
    <date_availability_produit>10/05/2025</date_availability_produit>
  </row>
</import>
```

**Colonnes obligatoires :** `nom`, `reference`  
**Colonnes optionnelles :** `prix_ttc`, `prix_achat`, `Taxe`, `categorie`, `date_availability_produit`

---

### 1.3 Fichier 2 — Déclinaisons/Stock (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<import>
  <row>
    <reference>T_01</reference>
    <specificite>Couleur</specificite>
    <karazany>Noir</karazany>
    <stock_initial>50</stock_initial>
    <prix_vente_ttc>599000</prix_vente_ttc>
  </row>
  <row>
    <reference>T_01</reference>
    <specificite>Couleur</specificite>
    <karazany>Blanc</karazany>
    <stock_initial>30</stock_initial>
    <prix_vente_ttc>599000</prix_vente_ttc>
  </row>
</import>
```

---

### 1.4 Fichier 3 — Commandes (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<import>
  <row>
    <nom>Jean Dupont</nom>
    <email>jean.dupont@example.com</email>
    <adresse>12 Rue de la Paix, Paris</adresse>
    <achat>[("T_01";2;"Noir"),("A_05";1;"")]</achat>
    <date_commande>15/05/2025</date_commande>
  </row>
</import>
```

---

### 1.5 Lire un fichier XML en TypeScript

Fonction utilitaire pour lire un fichier XML uploadé par l'utilisateur et retourner
un tableau de lignes (même interface que PapaParse pour les CSV) :

```ts
// src/services/xmlImportParser.ts

/**
 * Lit un fichier XML uploadé et retourne un tableau de Record<string, string>.
 * Chaque <row> devient un objet { colonne: valeur }.
 *
 * @param file  Fichier XML sélectionné par l'utilisateur (<input type="file">)
 * @returns     Tableau de lignes, même format que PapaParse data[]
 */
export async function parseXmlImportFile(file: File): Promise<Record<string, string>[]> {
  const text = await file.text();
  return parseXmlImportString(text);
}

/**
 * Parse une chaîne XML de format import → tableau de lignes.
 */
export function parseXmlImportString(xmlText: string): Record<string, string>[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');

  // Vérifier les erreurs de parsing
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML invalide : ${parseError.textContent?.slice(0, 200)}`);
  }

  const rows = doc.querySelectorAll('row');
  if (rows.length === 0) {
    throw new Error('Aucun élément <row> trouvé dans le fichier XML');
  }

  const result: Record<string, string>[] = [];

  rows.forEach(rowEl => {
    const obj: Record<string, string> = {};
    rowEl.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        obj[el.tagName] = el.textContent?.trim() ?? '';
      }
    });
    result.push(obj);
  });

  return result;
}

/**
 * Détecte le type de fichier uploadé : 'csv', 'xml' ou 'unknown'.
 */
export function detectFileType(file: File): 'csv' | 'xml' | 'unknown' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xml')) return 'xml';
  // Tenter par MIME type
  if (file.type.includes('xml')) return 'xml';
  if (file.type.includes('csv') || file.type === 'text/plain') return 'csv';
  return 'unknown';
}
```

---

### 1.6 Convertir XML → tableau de lignes

Dans une vue d'import, brancher le parser XML au même pipeline que le CSV :

```ts
// Dans ImportProduits.vue (ou tout autre composant d'import)
import Papa from 'papaparse';
import { parseXmlImportFile, detectFileType } from '@/services/xmlImportParser';
import { importFichier1 } from '@/services/fichier1ImportService';

async function handleFileUpload(file: File) {
  let rows: Record<string, any>[] = [];

  const type = detectFileType(file);

  if (type === 'csv') {
    // CSV : parser PapaParse
    rows = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data as Record<string, any>[]),
        error: (err) => reject(new Error(err.message)),
      });
    });

  } else if (type === 'xml') {
    // XML : parser custom
    rows = await parseXmlImportFile(file);

  } else {
    throw new Error('Format non supporté. Utilisez .csv ou .xml');
  }

  // Le reste du pipeline est identique peu importe le format
  await importFichier1(rows, (log) => logs.value.push(log));
}
```

---

## 2. Export — Format CSV

### Principe

Convertir un tableau JS en chaîne CSV, puis déclencher un téléchargement.

### Fonction générique

```ts
// src/services/exportService.ts

/**
 * Exporte un tableau de données en fichier CSV téléchargeable.
 *
 * @param data      Tableau d'objets (une ligne = un objet)
 * @param filename  Nom du fichier téléchargé (ex: "commandes.csv")
 * @param separator Séparateur (défaut: ";")
 */
export function exportToCsv(
  data: Record<string, any>[],
  filename: string,
  separator: string = ';'
): void {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  // En-têtes = clés du premier objet
  const headers = Object.keys(data[0]);

  const csvLines = [
    headers.join(separator), // ligne d'en-tête
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        const str = String(val).replace(/"/g, '""'); // échapper les guillemets
        // Encadrer si contient le séparateur, des guillemets ou des retours à la ligne
        return /[;\n"\r]/.test(str) || str.includes(separator)
          ? `"${str}"`
          : str;
      }).join(separator)
    )
  ];

  const csvContent = '﻿' + csvLines.join('\n'); // ﻿ = BOM UTF-8 (pour Excel)
  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), filename);
}
```

### Exemple — Exporter les commandes

```ts
import { exportToCsv } from '@/services/exportService';

// Depuis un composant Vue
function exportOrders() {
  const rows = orders.value.map(o => ({
    'ID':         o.id,
    'Date':       o.date_add,
    'Client':     `${o.customer?.firstname} ${o.customer?.lastname}`,
    'Total TTC':  o.total_paid_tax_incl,
    'État':       o.current_state_name,
    'Référence':  o.reference,
  }));

  exportToCsv(rows, `commandes_${today()}.csv`);
}
```

### Exemple — Exporter les produits

```ts
function exportProducts() {
  const rows = products.value.map(p => ({
    'Référence':   p.reference,
    'Nom':         p.name,
    'Prix HT':     p.price,
    'Catégorie':   p.category_name,
    'Stock':       p.quantity,
    'Date dispo':  p.available_date,
  }));

  exportToCsv(rows, `produits_${today()}.csv`);
}
```

---

## 3. Export — Format TXT

### Principe

Générer un rapport texte lisible (rapport de commande, fiche produit, log d'import...).

### Fonction générique

```ts
/**
 * Exporte du texte brut en fichier .txt téléchargeable.
 *
 * @param content   Contenu texte (multiligne avec \n)
 * @param filename  Nom du fichier (ex: "rapport.txt")
 */
export function exportToTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}
```

### Formateur de rapport de commande

```ts
/**
 * Génère un rapport texte formaté d'une commande.
 */
export function formatOrderReport(order: {
  id: string;
  reference: string;
  date_add: string;
  customer: { firstname: string; lastname: string; email: string };
  lines: { name: string; quantity: number; price: number }[];
  total: number;
  state: string;
}): string {
  const line = '─'.repeat(50);
  const lines = [
    '╔══════════════════════════════════════════════════╗',
    '║           DÉTAIL DE LA COMMANDE                  ║',
    '╚══════════════════════════════════════════════════╝',
    '',
    `Référence    : ${order.reference}`,
    `Date         : ${order.date_add}`,
    `État         : ${order.state}`,
    '',
    line,
    'CLIENT',
    line,
    `Nom          : ${order.customer.firstname} ${order.customer.lastname}`,
    `Email        : ${order.customer.email}`,
    '',
    line,
    'ARTICLES',
    line,
    ...order.lines.map(l =>
      `${l.name.padEnd(30)} x${l.quantity}   ${(l.price * l.quantity).toFixed(2)} €`
    ),
    '',
    line,
    `TOTAL                                   ${order.total.toFixed(2)} €`,
    line,
    '',
    `Généré le ${new Date().toLocaleString('fr-FR')}`,
  ];

  return lines.join('\n');
}

// Utilisation
function downloadOrderTxt(order: any) {
  const content = formatOrderReport(order);
  exportToTxt(content, `commande_${order.reference}.txt`);
}
```

### Formateur de log d'import

```ts
/**
 * Génère un rapport texte des logs d'un import.
 */
export function formatImportLog(logs: { level: string; message: string }[], filename: string): string {
  const date = new Date().toLocaleString('fr-FR');
  const header = [
    `RAPPORT D'IMPORT — ${filename}`,
    `Généré le ${date}`,
    '='.repeat(60),
    '',
  ];

  const body = logs.map(l => {
    const prefix = {
      success: '✓',
      error:   '✗',
      warning: '⚠',
      info:    'ℹ',
    }[l.level] ?? ' ';
    return `${prefix} ${l.message}`;
  });

  const success = logs.filter(l => l.level === 'success').length;
  const errors  = logs.filter(l => l.level === 'error').length;

  const footer = [
    '',
    '='.repeat(60),
    `Résumé : ${success} succès, ${errors} erreur(s)`,
  ];

  return [...header, ...body, ...footer].join('\n');
}

// Utilisation après un import
function downloadImportLog(logs: ImportLog[], originalFilename: string) {
  const content = formatImportLog(logs, originalFilename);
  exportToTxt(content, `log_import_${today()}.txt`);
}
```

---

## 4. Export — Format PDF

### Méthode 1 : Impression navigateur (sans dépendance)

La méthode la plus simple — ouvre la fenêtre d'impression du navigateur.
L'utilisateur choisit "Enregistrer en PDF".

```ts
/**
 * Ouvre la boîte d'impression du navigateur.
 * L'utilisateur peut choisir "Enregistrer en PDF".
 */
export function printAsPdf(): void {
  window.print();
}
```

**Style CSS dédié à l'impression (`@media print`) :**

```css
/* src/assets/front.css ou un fichier print.css */

@media print {
  /* Masquer tout sauf le contenu à imprimer */
  nav, aside, .no-print, button, .sidebar {
    display: none !important;
  }

  /* Zone à imprimer */
  .print-area {
    display: block !important;
    width: 100%;
    font-size: 12pt;
    color: #000;
  }

  /* Forcer les couleurs noires (pas de fond coloré) */
  body {
    background: white !important;
    color: black !important;
  }

  /* Éviter les coupures dans les tableaux */
  tr, .no-break {
    page-break-inside: avoid;
  }
}
```

**Dans une vue Vue :**
```vue
<template>
  <div>
    <!-- Bouton masqué à l'impression -->
    <button class="no-print" @click="window.print()">
      Imprimer / Exporter PDF
    </button>

    <!-- Zone qui sera imprimée -->
    <div class="print-area">
      <h1>Commande #{{ order.reference }}</h1>
      <table>
        <tr v-for="line in order.lines" :key="line.id">
          <td>{{ line.name }}</td>
          <td>{{ line.quantity }}</td>
          <td>{{ line.price }} €</td>
        </tr>
      </table>
      <p><strong>Total : {{ order.total }} €</strong></p>
    </div>
  </div>
</template>
```

---

### Méthode 2 : HTML → Blob PDF (sans librairie externe)

Génère un document HTML autonome et l'ouvre dans un nouvel onglet pour impression.

```ts
/**
 * Génère un HTML formaté et ouvre une fenêtre d'impression dédiée.
 * Permet de contrôler précisément le rendu sans affecter la page courante.
 *
 * @param htmlContent  Contenu HTML du document (corps uniquement)
 * @param title        Titre du document
 */
export function printHtmlAsPdf(htmlContent: string, title: string): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; margin: 20mm; }
    h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 13pt; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #f0f0f0; padding: 8px; border: 1px solid #ccc; text-align: left; }
    td { padding: 6px 8px; border: 1px solid #ddd; }
    .total { font-weight: bold; font-size: 14pt; text-align: right; margin-top: 10px; }
    .footer { margin-top: 30px; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { @page { margin: 15mm; } }
  </style>
</head>
<body>
${htmlContent}
<div class="footer">Généré le ${new Date().toLocaleString('fr-FR')}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Autorisez les popups pour générer le PDF.');
    return;
  }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500); // attendre que la page soit chargée
}
```

### Exemple — PDF d'une commande

```ts
function exportOrderPdf(order: any) {
  const linesHtml = order.lines.map((l: any) => `
    <tr>
      <td>${l.name}</td>
      <td style="text-align:center">${l.quantity}</td>
      <td style="text-align:right">${(l.price).toFixed(2)} €</td>
      <td style="text-align:right">${(l.price * l.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  const html = `
    <h1>Commande ${order.reference}</h1>
    <p><strong>Date :</strong> ${order.date_add}</p>
    <p><strong>Client :</strong> ${order.customer.firstname} ${order.customer.lastname}</p>
    <p><strong>État :</strong> ${order.state}</p>

    <h2>Articles commandés</h2>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Qté</th>
          <th>Prix unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <div class="total">Total TTC : ${Number(order.total).toFixed(2)} €</div>
  `;

  printHtmlAsPdf(html, `Commande_${order.reference}`);
}
```

### Exemple — PDF du rapport d'import

```ts
function exportImportReportPdf(logs: ImportLog[], filename: string) {
  const rows = logs.map(l => {
    const color = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12', info: '#3498db' }[l.level];
    return `<tr><td style="color:${color};font-weight:bold">${l.level.toUpperCase()}</td><td>${l.message}</td></tr>`;
  }).join('');

  const success = logs.filter(l => l.level === 'success').length;
  const errors  = logs.filter(l => l.level === 'error').length;

  const html = `
    <h1>Rapport d'import — ${filename}</h1>
    <p>Total : <strong>${logs.length}</strong> opérations |
       Succès : <strong style="color:#27ae60">${success}</strong> |
       Erreurs : <strong style="color:#e74c3c">${errors}</strong></p>
    <table>
      <thead><tr><th style="width:100px">Niveau</th><th>Message</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  printHtmlAsPdf(html, `Rapport_import_${filename}`);
}
```

---

## 5. Utilitaire de téléchargement

Fonction partagée utilisée par CSV et TXT pour déclencher le téléchargement :

```ts
// src/services/exportService.ts

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 *
 * @param blob      Blob du contenu (texte, binaire...)
 * @param filename  Nom du fichier proposé au téléchargement
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // libérer la mémoire
}

/**
 * Retourne la date du jour au format YYYY-MM-DD (pour les noms de fichiers).
 */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

---

## 6. Exemples d'utilisation dans les vues

### Dans `OrderView.vue` (backoffice)

```vue
<template>
  <div>
    <div class="no-print">
      <button @click="doExportCsv">Exporter CSV</button>
      <button @click="doExportTxt">Exporter TXT</button>
      <button @click="doExportPdf">Exporter PDF</button>
    </div>

    <div class="print-area">
      <h1>Commandes</h1>
      <table>
        <thead>
          <tr><th>Référence</th><th>Client</th><th>Total</th><th>État</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.reference }}</td>
            <td>{{ o.customer_name }}</td>
            <td>{{ o.total_paid_tax_incl }} €</td>
            <td>{{ o.state_name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { exportToCsv, exportToTxt, formatImportLog, today, downloadBlob } from '@/services/exportService';
import { printHtmlAsPdf } from '@/services/exportService';

function doExportCsv() {
  const rows = orders.value.map(o => ({
    'Référence': o.reference,
    'Client':    o.customer_name,
    'Total':     o.total_paid_tax_incl,
    'État':      o.state_name,
    'Date':      o.date_add,
  }));
  exportToCsv(rows, `commandes_${today()}.csv`);
}

function doExportTxt() {
  const lines = [
    `LISTE DES COMMANDES — ${new Date().toLocaleDateString('fr-FR')}`,
    '='.repeat(60),
    '',
    ...orders.value.map(o =>
      `${o.reference.padEnd(20)} ${o.customer_name.padEnd(25)} ${String(o.total_paid_tax_incl).padStart(10)} € | ${o.state_name}`
    ),
    '',
    `Total : ${orders.value.length} commande(s)`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `commandes_${today()}.txt`);
}

function doExportPdf() {
  const rows = orders.value.map(o => `
    <tr>
      <td>${o.reference}</td>
      <td>${o.customer_name}</td>
      <td style="text-align:right">${Number(o.total_paid_tax_incl).toFixed(2)} €</td>
      <td>${o.state_name}</td>
    </tr>
  `).join('');

  printHtmlAsPdf(`
    <h1>Liste des commandes</h1>
    <table>
      <thead>
        <tr><th>Référence</th><th>Client</th><th>Total</th><th>État</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `, `Commandes_${today()}`);
}
</script>
```

### Dans `ImportProduits.vue` — Support XML + CSV

```vue
<template>
  <div>
    <input
      type="file"
      accept=".csv,.xml"
      @change="onFileChange"
    />
    <p class="hint">Formats acceptés : CSV ou XML</p>
  </div>
</template>

<script setup lang="ts">
import { detectFileType, parseXmlImportFile } from '@/services/xmlImportParser';
import { importFichier1 } from '@/services/fichier1ImportService';
import Papa from 'papaparse';

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const type = detectFileType(file);
  let rows: Record<string, any>[] = [];

  if (type === 'csv') {
    rows = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: r => resolve(r.data as any[]),
        error: err => reject(new Error(err.message)),
      });
    });
  } else if (type === 'xml') {
    rows = await parseXmlImportFile(file);
  } else {
    alert('Format non supporté. Utilisez .csv ou .xml');
    return;
  }

  await importFichier1(rows, log => logs.value.push(log));
}
</script>
```

---

## Résumé des formats

| Format | Import | Export | Librairie | Notes |
|--------|--------|--------|-----------|-------|
| CSV | ✅ PapaParse | ✅ Manuel (Blob) | `papaparse` | BOM UTF-8 pour Excel |
| XML | ✅ DOMParser | ✅ Manuel (string) | Natif navigateur | Format custom `<import><row>` |
| TXT | — | ✅ Manuel (Blob) | Natif | Rapport lisible |
| PDF | — | ✅ `window.print()` / `printHtmlAsPdf()` | Natif | Popup impression navigateur |

---

## Notes importantes

### Import XML vs CSV — Même pipeline
Le parser XML retourne un `Record<string, string>[]` identique à PapaParse.
Les services d'import (`importFichier1`, `importFichier2`, etc.) reçoivent ce tableau
**sans savoir** si la source était CSV ou XML.

### Export PDF — Popup bloquée
Certains navigateurs bloquent `window.open()`.  
Solution : appeler `printHtmlAsPdf()` directement depuis un handler d'événement utilisateur
(clic bouton), pas depuis un `setTimeout` ou un `watch`.

### Export CSV — BOM UTF-8
Le préfixe `﻿` (BOM) au début du CSV permet à Microsoft Excel d'ouvrir correctement
les fichiers avec des caractères accentués (`é`, `à`, `ç`...).
