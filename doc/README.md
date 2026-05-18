# Documentation — presta-eval

Application Vue 3 qui pilote PrestaShop 8.x via son Web Service XML/JSON.

---

## Fichiers de documentation

| Fichier | Contenu |
|---------|---------|
| [todo.md](./todo.md) | Toutes les fonctionnalités demandées (Jour 1, 2, 3) avec statut |
| [architecture.md](./architecture.md) | Comment le projet est construit — stack, dossiers, flux de données |
| [functions.md](./functions.md) | Toutes les fonctions : à quoi elles servent, comment les utiliser |
| [xml-guide.md](./xml-guide.md) | Comment construire et lire du XML PrestaShop, limitations connues |
| [guide-import-export.md](./guide-import-export.md) | Import XML, export PDF / TXT / CSV — format, code, exemples |
| [guide-dates.md](./guide-dates.md) | Manipulation des dates — parsing, formatage, comparaison, validation, cas métier |
| [functions-index.md](./functions-index.md) | Index complet des 374 fonctions — nom, fichier, ligne, description |
| [impl-jour1.md](./impl-jour1.md) | Comment chaque fonctionnalité Jour 1 a été codée (login, reset, import 4 fichiers, commandes, frontoffice) |
| [impl-jour2.md](./impl-jour2.md) | Comment chaque fonctionnalité Jour 2 a été codée (états, dashboard, user picker, badges, filtres) |
| [impl-jour3.md](./impl-jour3.md) | Comment chaque fonctionnalité Jour 3 a été codée (validation import, ajout stock, évolution stock, stock fiche produit) |

---

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
# → http://localhost:5173
```

**Prérequis :** XAMPP avec PrestaShop sur `http://localhost:8081/EVALUATION/prestashop_edition_classic_version_8.2.6`

---

## Routes principales

| URL | Interface | Description |
|-----|-----------|-------------|
| `/` | Frontoffice | Sélecteur d'utilisateur (page d'accueil) |
| `/home` | Frontoffice | Catalogue produits |
| `/cart` | Frontoffice | Panier |
| `/orders` | Frontoffice | Mes commandes |
| `/admin` | Backoffice | Catalogue produits PS |
| `/admin/dashboard` | Backoffice | Tableau de bord |
| `/admin/import` | Backoffice | Import fichier 1 (produits) |
| `/admin/import/declinaisons` | Backoffice | Import fichier 2 (stock/déclinaisons) |
| `/admin/import/order` | Backoffice | Import fichier 3 (commandes) |
| `/admin/import/photos` | Backoffice | Import fichier 4 (images ZIP) |
| `/admin/orders` | Backoffice | Gestion commandes |

---

## Fichiers d'import attendus

| # | Fichier | Format | Colonnes clés |
|---|---------|--------|---------------|
| 1 | Produits | CSV | nom, reference, prix_ttc, prix_achat, Taxe, categorie, date_availability_produit |
| 2 | Déclinaisons/Stock | CSV | reference, specificite, karazany, stock_initial, prix_vente_ttc |
| 3 | Commandes | CSV | nom, email, adresse, achat (format spécial), date_commande |
| 4 | Images | ZIP | `{reference}.jpg` ou `.png` |

---

## Points techniques importants

- **Stock** : le WS PS est en lecture seule → `stock_update.php` avec PDO direct
- **Total commande** : le WS retourne toujours 0 → calculé côté client depuis les produits du panier
- **Auth** : sessionStorage pour le token, localStorage pour le panier
- **XML** : toujours envoyer `Content-Type: application/xml; charset=utf-8` + `validateStatus: () => true`
