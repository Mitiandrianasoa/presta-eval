# Todo — Cahier des charges complet

Récapitulatif de toutes les fonctionnalités demandées, organisées par jour et par module.

---

## Jour 1

### Backoffice

| # | Tâche | Statut |
|---|-------|--------|
| 1a | Protéger toutes les pages `/admin/*` (garde de route, redirect vers login si non authentifié) | ✅ Fait |
| 1b | Login backoffice avec email/mot de passe pré-remplis par défaut sur le formulaire | ✅ Fait |
| 1c | Page avec bouton **Réinitialiser les données** (reset complet de la base PS) | ✅ Fait |
| 1d | Page d'import des **4 fichiers** | ✅ Fait |
| 1d-i | Fichier 1 : produits (CSV `import-data-mai-26`, modifié le 11/05 à 13h15 — colonnes en rouge) | ✅ Fait |
| 1d-ii | Fichier 2 : déclinaisons/stock (CSV) | ✅ Fait |
| 1d-iii | Fichier 3 : commandes (CSV) | ✅ Fait |
| 1d-iv | Fichier 4 : images (`images.zip`) | ✅ Fait |
| 1e | Page commandes : afficher la liste et permettre de changer l'état | ✅ Fait |
| 1e-i | État **Paiement effectué** | ✅ Fait |
| 1e-ii | État **Annulé** | ✅ Fait |

### Frontoffice

| # | Tâche | Statut |
|---|-------|--------|
| 2a | Page d'accueil : liste des produits avec fiche produit | ✅ Fait |
| 2b | Workflow d'achat complet | ✅ Fait |
| 2b-i | Gestion du panier (ajout, modification, suppression) | ✅ Fait |
| 2b-ii | Validation de commande | ✅ Fait |
| 2b-ii-1 | Uniquement **paiement à la livraison** | ✅ Fait |
| 2b-ii-2 | **Pas de frais de livraison** | ✅ Fait |
| 2c | Page **Mes commandes** (état des commandes du client connecté) | ✅ Fait |

### ExistingApp (PrestaShop backoffice)

| # | Tâche | Statut |
|---|-------|--------|
| E1a | Toutes les données importées visibles dans le backoffice PS | ✅ Fait |
| E1b | Modification des données dans PS → impact visible dans la NewApp | ✅ Fait |

### Notes Jour 1

- Pays : **France** (`iso_code = FR`)
- Devise : **Euro** (`iso_code = EUR`)
- Ne créer que les pages demandées — pas de menu ni d'affichage non demandé

---

## Jour 2

### Backoffice

| # | Tâche | Statut |
|---|-------|--------|
| 1a | États de commande utilisés : **Dans le panier** / **Paiement effectué** / **Annulé** | ✅ Fait |
| 1b | **Tableau de bord** avec statistiques | ✅ Fait |
| 1b-i | Par jour : nombre de commandes + montant | ✅ Fait |
| 1b-ii | Total général (toutes commandes) | ✅ Fait |
| 1c | Import fichier 1 : **déclinaison seulement** (pas de combinaison) | ✅ Fait |

### Frontoffice

| # | Tâche | Statut |
|---|-------|--------|
| 2a | Page d'accueil = **liste des utilisateurs existants** (on choisit avec quel utilisateur se connecter) | ✅ Fait |
| 2a-i | Option **utilisateur anonyme** | ✅ Fait |
| 2b | **Marques visuelles** sur les produits selon `date_availability_produit` | ✅ Fait |
| 2b-i | Badge **HOT** : produit sorti < 1 jour | ✅ Fait |
| 2b-ii | Badge **NEW** : produit sorti < 1 semaine | ✅ Fait |
| 2c | **Recherche multicritère** par produit | ✅ Fait |
| 2c-i | Par nom | ✅ Fait |
| 2c-ii | Par catégorie | ✅ Fait |
| 2c-iii | Par intervalle de prix | ✅ Fait |

---

## Jour 3

### Backoffice

| # | Tâche | Statut |
|---|-------|--------|
| 3a | Validation des erreurs d'import | ✅ Fait |
| 3a-i | Nom de colonne non conforme | ✅ Fait |
| 3a-ii | Format de date différent de `DD/MM/YYYY` | ✅ Fait |
| 3a-iii | Montant négatif | ✅ Fait |
| 3b | Page **Ajout en stock** des produits | ✅ Fait |
| 3c | Tableau de l'**évolution du stock journalier** d'un produit | ✅ Fait |
| 3c-i | Via un endpoint custom dans PrestaShop appelant `StockAvailable::updateQuantity($idProduct, 0, $delta)` | ✅ Fait |

### Frontoffice

| # | Tâche | Statut |
|---|-------|--------|
| 4a | Afficher la **quantité en stock disponible** sur la fiche produit | ✅ Fait |

---

## Récapitulatif des fichiers d'import

| Fichier | Type | Contenu | Service |
|---------|------|---------|---------|
| Fichier 1 (CSV) | Produits | nom, référence, catégorie, prix TTC, prix achat, taxe, date_availability_produit | `fichier1ImportService.ts` |
| Fichier 2 (CSV) | Stock / Déclinaisons | référence, specificite, karazany, stock_initial, prix_vente_ttc | `fichier2ImportService.ts` |
| Fichier 3 (CSV) | Commandes | client, adresse, achat (ref;qty;karazany), date | `fichier3ImportService.ts` |
| Fichier 4 (ZIP) | Images | `{reference}.jpg/png` associées aux produits | `fichier4ImportService.ts` |

---

## Colonnes CSV attendues (Fichier 1)

Les colonnes sont lues de manière insensible à la casse et aux espaces. Colonnes supportées :

| Colonne attendue | Variantes acceptées |
|-----------------|---------------------|
| `nom` | `Nom`, `name`, `Name` |
| `reference` | `Reference`, `ref`, `Ref` |
| `prix_ttc` | `prix`, `price`, `Prix_ttc`, `Prix` |
| `prix_achat` | `wholesale_price`, `cout`, `cost` |
| `Taxe` | `taxe`, `taux`, `TVA`, `tax` |
| `categorie` | `Categorie`, `category`, `Category` |
| `date_availability_produit` | `date_produit`, `date`, `Date` |

---

## États de commande PS utilisés

| Label PS | Signification dans la NewApp |
|---------|------------------------------|
| `Dans le panier` | Commande non finalisée (cart) |
| `Paiement effectué` | Commande validée et payée |
| `Annulé` | Commande annulée |
