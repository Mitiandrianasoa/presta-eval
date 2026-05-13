# Gestion des paniers et validation des commandes

## 1. Introduction
Ce document détaille la gestion des paniers (carts) et la logique de validation des commandes dans le projet PrestaShop (édition classic 8.2.6). Il s'adresse aux développeurs souhaitant comprendre ou modifier le fonctionnement du panier et du processus de commande côté frontoffice et backoffice.

## 2. Structure du panier

### 2.1. Classe principale
- **Cart.php** (dossier `classes/`)
  - Représente un panier client.
  - Gère l’ajout, la suppression, la modification de produits, les quantités, les règles de prix, les frais de port, etc.

### 2.2. Attributs clés
- `id_customer` : identifiant du client
- `id_address_delivery` / `id_address_invoice` : adresses de livraison/facturation
- `id_currency` : devise utilisée
- `products` : liste des produits et quantités
- `id_carrier` : transporteur sélectionné

### 2.3. Méthodes principales
- `add()`, `update()`, `delete()` : gestion CRUD du panier
- `addProduct($id_product, $quantity, ...)` : ajoute un produit
- `deleteProduct($id_product, ...)` : retire un produit
- `getProducts()` : retourne la liste détaillée des produits du panier
- `getOrderTotal()` : calcule le total (HT, TTC, avec/sans frais de port)
- `isVirtualCart()` : panier de produits dématérialisés

## 3. Logique de gestion du panier

### 3.1. Création du panier
- Un panier est créé automatiquement à la connexion d’un client ou lors de l’ajout du premier produit.
- Le panier est lié à la session utilisateur (cookie) et à l’utilisateur connecté.

### 3.2. Ajout/Suppression de produits
- Lorsqu’un produit est ajouté, la méthode `addProduct` vérifie la disponibilité, les quantités, les déclinaisons, etc.
- La suppression utilise `deleteProduct`.
- Les modifications sont persistées en base de données.

### 3.3. Calculs automatiques
- À chaque modification, le panier recalcule :
  - Le total des produits
  - Les réductions (règles panier, codes promo)
  - Les frais de port
  - Les taxes

### 3.4. Gestion multi-adresses
- Possibilité d’associer différentes adresses de livraison à chaque produit (option avancée).

## 4. Validation de la commande

### 4.1. Étapes du tunnel de commande
1. **Récapitulatif du panier**
2. **Connexion/Création de compte**
3. **Adresse de livraison/facturation**
4. **Choix du transporteur**
5. **Paiement**
6. **Confirmation**

### 4.2. Vérifications avant validation
- Stock disponible pour chaque produit
- Validité des adresses
- Sélection d’un transporteur
- Acceptation des CGV
- Paiement accepté

### 4.3. Création de la commande
- La méthode principale : `validateOrder()` (dans `classes/PaymentModule.php`)
  - Crée une entrée dans la table `orders`
  - Déplace les produits du panier vers la commande
  - Génère les factures, bons de livraison
  - Déclenche les emails de confirmation
  - Vide le panier ou le marque comme commandé

### 4.4. Statuts de commande
- La commande reçoit un statut initial (ex : "En attente de paiement")
- Les statuts évoluent selon les actions (paiement accepté, expédié, livré, annulé...)

## 5. Logique frontoffice (VueJS)

### 5.1. Interaction avec l’API
- Les vues frontoffice (ex : `OrderConfirmView.vue`) communiquent avec l’API pour :
  - Afficher le panier
  - Ajouter/retirer des produits
  - Passer à l’étape suivante
  - Valider la commande

### 5.2. Stores et gestion d’état
- Utilisation de Pinia/Vuex pour stocker l’état du panier côté client
- Synchronisation régulière avec le backend

### 5.3. Sécurité
- Vérification côté serveur de toutes les actions (quantités, prix, stock)
- Les données du panier côté client ne sont pas considérées comme fiables

## 6. Logique backoffice

- Les commandes validées sont visibles dans le backoffice
- Possibilité de modifier, annuler, rembourser une commande
- Suivi des statuts, génération de documents (factures, BL)

## 7. Points d’attention & bonnes pratiques
- Toujours vérifier le stock côté serveur avant validation
- Ne jamais faire confiance aux données du panier côté client
- Gérer les cas de paniers abandonnés (nettoyage régulier)
- Proposer la sauvegarde du panier pour les clients connectés

## 8. Références
- [Cart.php](../prestashop_edition_classic_version_8.2.6/classes/Cart.php)
- [PaymentModule.php](../prestashop_edition_classic_version_8.2.6/classes/PaymentModule.php)
- [Order.php](../prestashop_edition_classic_version_8.2.6/classes/Order.php)
- Documentation officielle PrestaShop : https://devdocs.prestashop-project.org/

---

*Document rédigé le 13/05/2026*