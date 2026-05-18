# Index complet des fonctions — presta-eval

**374 fonctions** répertoriées dans tous les fichiers `.ts` et `.vue` du projet.

---

## Table des matières

1. [API & Configuration](#1-api--configuration)
2. [Services](#2-services)
3. [Stores Pinia](#3-stores-pinia)
4. [Composants](#4-composants)
5. [Vues Backoffice](#5-vues-backoffice)
6. [Vues Frontoffice](#6-vues-frontoffice)

---

## 1. API & Configuration

### `src/api/schemaService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `fetchResources()` | 25 | Récupère toutes les ressources disponibles du WS PS |
| `fetchSchema(endpoint)` | 65 | Récupère le schéma XML d'une entité PS |
| `parseSchema(xmlSchema)` | 80 | Parse le synopsis XML pour extraire les règles des champs |
| `escapeXml(str)` | 129 | Échappe les caractères spéciaux XML (`<`, `>`, `&`, etc.) |
| `updateResource(...)` | 146 | Lit, modifie puis PUT une ressource via le WS |
| `createResourceWithBlankSchema(...)` | 244 | Crée une ressource avec validation via le schéma blank |

### `src/utils/prestashopXmlBuilder.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `buildPrestashopXml(entity, fields)` | 15 | Génère un document XML PrestaShop bien formaté |

---

## 2. Services

### `src/services/useAuth.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `init()` | 18 | Initialise l'état d'auth depuis `sessionStorage` au démarrage |
| `login(user, token)` | 35 | Connecte un utilisateur et sauvegarde dans `sessionStorage` |
| `logout()` | 43 | Déconnecte l'utilisateur courant |
| `clear()` | 48 | Efface les données d'auth de `sessionStorage` et de l'état |
| `getCustomerId()` | 58 | Retourne l'ID client PS (défaut : `'1'`) |
| `getCustomerToken()` | 62 | Retourne le token PS (secure_key) |
| `getUser()` | 66 | Retourne l'objet `User` complet ou `null` |
| `useAuth()` | 73 | Composable — exporte l'état et les méthodes d'auth |

---

### `src/services/csvParserUtils.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `parseFlexibleDate(raw)` | 20 | Convertit tout format de date → `YYYY-MM-DD` |
| `toIso(d)` | 92 | Convertit un objet `Date` → `YYYY-MM-DD` |
| `parseFlexiblePrice(raw)` | 100 | Convertit tout format de prix → `number` |
| `parseTaxRate(raw)` | 148 | Extrait un taux de taxe numérique depuis tout format |
| `slugify(str)` | 157 | Convertit un texte → slug URL (pour `link_rewrite` PS) |

---

### `src/services/fichier1ImportService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `tryExtractId(data, entityName)` | 21 | Extrait l'ID d'une réponse PS (JSON ou XML string) |
| `postEntity(url, xml, entityName)` | 47 | POST XML vers PS et retourne l'ID créé |
| `xmlCategory(name)` | 64 | Construit le XML d'une `<category>` |
| `xmlTaxRuleGroup(name)` | 77 | Construit le XML d'un `<tax_rule_group>` |
| `xmlTax(rate)` | 87 | Construit le XML d'une `<tax>` |
| `xmlTaxRule(idGroup, idTax)` | 99 | Construit le XML d'une `<tax_rule>` |
| `xmlProduct(name, ref, price, ...)` | 113 | Construit le XML d'un `<product>` |
| `createCategory(name)` | 157 | POST → crée une catégorie dans PS |
| `createTaxRuleGroup(name)` | 161 | POST → crée un groupe de taxe dans PS |
| `createTax(rate)` | 165 | POST → crée une taxe dans PS |
| `createTaxRule(idGroup, idTax)` | 169 | POST → lie une taxe à son groupe |
| `createProduct(name, ref, ...)` | 176 | POST → crée un produit dans PS |
| `col(row, ...keys)` | 196 | Lecture robuste d'une colonne CSV (insensible casse/espaces) |
| `importFichier1(rows, onLog)` | 223 | **Orchestrateur principal** — import produits |

---

### `src/services/fichier2ImportService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `col(row, ...keys)` | 20 | Lecture robuste d'une colonne CSV |
| `tryExtractId(data, entityName)` | 35 | Extrait l'ID d'une réponse PS |
| `postEntity(url, xml, entityName)` | 48 | POST XML vers PS et retourne l'ID |
| `findProductByRef(reference)` | 68 | Recherche un produit par référence dans PS |
| `getTaxRate(idTaxGroup)` | 83 | Récupère le taux de TVA d'un groupe de taxe |
| `loadAttrGroups()` | 97 | Charge tous les groupes d'attributs (Map nom → id) |
| `xmlAttrGroup(name)` | 110 | Construit le XML d'un `<product_option>` |
| `loadAttrValues(idGroup)` | 125 | Charge les valeurs d'un groupe d'attribut (Map nom → id) |
| `xmlAttrValue(name, idGroup)` | 141 | Construit le XML d'une `<product_option_value>` |
| `loadCombinations(idProduct)` | 155 | Charge les combinaisons d'un produit (Map idAttrValue → idCombo) |
| `xmlCombination(idProduct, ref, karazany, idAttrValue)` | 174 | Construit le XML d'une `<combination>` |
| `setStock(idProduct, idProductAttribute, qty)` | ~189 | Met à jour le stock via `stock_update.php` (PDO direct) |
| `xmlSpecificPrice(idProduct, idAttr, priceHT)` | 204 | Construit le XML d'un `<specific_price>` |
| `importFichier2(rows, onLog)` | 229 | **Orchestrateur principal** — import déclinaisons/stock |

---

### `src/services/fichier3ImportService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `col(row, ...keys)` | 20 | Lecture robuste d'une colonne CSV |
| `tryExtractId(data, entityName)` | 35 | Extrait l'ID d'une réponse PS |
| `postEntity(url, xml, entityName)` | 48 | POST XML vers PS et retourne l'ID |
| `parseAchat(raw)` | 66 | Parse la colonne achat `[("ref";qty;"karazany"),...]` |
| `getCountryId()` | 82 | Récupère l'ID du pays (MG → FR → 1er actif) avec cache |
| `findCustomerByEmail(email)` | 108 | Cherche un client PS par email |
| `splitNom(nom)` | 120 | Découpe un nom complet → `{ firstname, lastname }` |
| `xmlCustomer(firstname, lastname, email, pwd)` | 126 | Construit le XML d'un `<customer>` |
| `createAddress(idCustomer, adresse, ...)` | 145 | POST → crée une adresse pour un client |
| `findProductByRef(reference)` | 173 | Cherche un produit par référence |
| `getTaxRate(idTaxGroup)` | 188 | Récupère le taux de TVA |
| `findCombinationId(idProduct, karazany)` | 199 | Trouve l'ID combinaison pour une valeur d'attribut |
| `getEffectivePrice(idProduct, idAttr, idTaxGroup)` | 223 | Prix effectif : specific_price ou prix de base |
| `decreaseStock(idProduct, idAttr, qty, log)` | 247 | Décrémente le stock d'un produit/combinaison |
| `createOrderPayment(orderId, amount, ...)` | 283 | POST → crée un paiement de commande |
| `getDefaultCarrierId()` | 307 | Récupère l'ID du transporteur par défaut |
| `loadOrderStates()` | 324 | Charge tous les états de commande PS |
| `findOrderStateId(name)` | 339 | Trouve l'ID d'un état de commande par nom |
| `xmlCart(idCustomer, idCarrier, ...)` | 375 | Construit le XML d'un `<cart>` |
| `xmlOrder(cartId, customerId, ...)` | 412 | Construit le XML d'une `<order>` |
| `createOrder(...)` | 476 | POST → crée une commande complète dans PS |
| `importFichier3(rows, onLog)` | 519 | **Orchestrateur principal** — import commandes |

---

### `src/services/fichier4ImportService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `readZipImages(file)` | 36 | Lit un ZIP et retourne les images avec leurs Blob |
| `findEntry(zip, filename)` | 69 | Cherche un fichier dans une archive ZIP |
| `findProductIdByRef(reference)` | 82 | Trouve l'ID produit PS par référence |
| `uploadProductImage(productId, blob, ext)` | 97 | POST multipart → upload image vers PS |
| `importFichier4(entries, onLog)` | 123 | **Orchestrateur principal** — import images |

---

### `src/services/checkout.service.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `getCustomerSecureKey(customerId)` | 39 | Récupère la `secure_key` d'un client via le WS |
| `createStockMovementLines(products, employeeId)` | 51 | Crée les mouvements de stock à la commande |
| `getOrCreateAddress(customerId)` | 91 | Récupère l'adresse existante ou en crée une |
| `getCartTotals(cartId)` | 188 | Lit les totaux d'un panier PS (retourne souvent 0) |
| `createOrder(cartId, customerId, token, total, ...)` | 218 | POST → crée une commande avec total calculé côté client |

---

### `src/services/cartOrder.service.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `parseXml(xml)` | 35 | DOMParser wrapper |
| `text(node, selector)` | 36 | Extrait le textContent d'un nœud XML |
| `fetchCustomerOrderCartIds(customerId)` | 42 | Récupère les IDs de paniers d'un client |
| `fetchProductSnapshot(productId, attrId)` | 57 | Snapshot d'un produit à un instant donné |
| `mapCartToSummary(cart)` | 128 | Convertit un objet Cart en résumé affiché |
| `toCheckoutProduct(item)` | 148 | Convertit un CartItem en CartProduct pour le checkout |

---

### `src/services/orderService.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `parse(xml)` | 5 | DOMParser wrapper |
| `text(node, tag)` | 6 | Extrait textContent d'un tag XML |
| `attr(node, tag, attrName)` | 7 | Extrait un attribut XML |
| `parseOrderElement(el)` | 46 | Parse un élément `<order>` XML → objet JS |

---

### `src/services/rollback.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `shouldSkip(resource)` | 50 | Vérifie si une ressource doit être ignorée au rollback |
| `getAllIds(resource)` | 64 | Récupère tous les IDs d'une ressource PS |
| `deleteResource(resource, id)` | 89 | DELETE une entité PS par ID |
| `rollback()` | 123 | **Rollback complet** — supprime toutes les données importées |

---

## 3. Stores Pinia

> Les stores partagent les mêmes helpers XML locaux.

### Pattern commun dans tous les stores

| Fonction locale | Description |
|-----------------|-------------|
| `parse(xml)` | `new DOMParser().parseFromString(xml, 'text/xml')` |
| `text(node, tag)` | `node.querySelector(tag)?.textContent?.trim() \|\| ''` |
| `lang(node, tag)` | Extrait un champ multilingue (langue 1) |
| `attr(node, tag, a)` | Extrait un attribut d'un nœud XML |

### `src/stores/product/productStore.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `slugify(str)` | 8 | Génère le slug URL |
| `buildXml(fields)` | 14 | Construit le XML d'un produit pour POST/PUT |

### `src/stores/reset/resetStore.ts`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `parseIds(xml, tag)` | 5 | Extrait tous les IDs depuis une liste XML PS |

---

## 4. Composants

### `src/components/FrontHeader.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadUser()` | 78 | Charge l'utilisateur depuis `sessionStorage` |
| `loadCart()` | 90 | Charge le panier depuis `localStorage` |
| `toggleDropdown()` | 102 | Ouvre/ferme le menu déroulant utilisateur |
| `getUserInitials()` | 107 | Retourne les initiales (ex: `"JD"` pour Jean Dupont) |
| `handleLogout()` | 115 | Déconnecte l'utilisateur et redirige |
| `handleClickOutside(e)` | 127 | Ferme le dropdown si clic en dehors |

---

### `src/components/CsvUploader.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleFileUpload(event)` | 18 | Parse le fichier CSV avec PapaParse et émet `parsed` |
| `triggerFileInput()` | 57 | Déclenche programmatiquement l'`<input type="file">` |

---

### `src/components/Sidebar.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `goToConfig()` | 12 | Navigation → `/admin/config` |
| `goToCarts()` | 16 | Navigation → `/admin/cart` |
| `goToOrders()` | 20 | Navigation → `/admin/orders` |
| `goToPayments()` | 24 | Navigation → `/admin/payments` |
| `goToImport()` | 32 | Navigation → `/admin/import` |
| `goToDashboard()` | 36 | Navigation → `/admin/dashboard` |

---

### `src/components/order/OrderList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadData()` | 19 | Charge les commandes depuis le WS PS |
| `updateState(orderId, stateId)` | 38 | PUT → change l'état d'une commande |

### `src/components/order/OrderDetails.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadOrder(id)` | 27 | Charge le détail d'une commande |
| `updatePayment(orderId)` | 41 | Met à jour le paiement |
| `updateState(orderId, stateId)` | 54 | Change l'état d'une commande |

### `src/components/order/CartList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadData()` | 28 | Charge les paniers PS |
| `toggleCart(id)` | 43 | Sélectionne/désélectionne un panier |
| `formatDate(str)` | 49 | Formate une date PS pour affichage |
| `totalProducts(cart)` | 54 | Calcule le nombre total de produits d'un panier |

### `src/components/order/CanceledOrders.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadData()` | 22 | Charge les commandes annulées |

### `src/components/order/PaymentList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadData()` | 21 | Charge les paiements |

---

### `src/components/product/productList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `toggleSelectAll()` | 22 | Sélectionne/désélectionne tous les produits |
| `toggleProduct(id)` | 30 | Sélectionne/désélectionne un produit |
| `f(n)` | 44 | Formate un nombre en décimal fixe |
| `add()` | 46 | Ouvre le formulaire d'ajout |
| `edit(product)` | 47 | Ouvre le formulaire d'édition |
| `close()` | 48 | Ferme le formulaire |
| `submit(data)` | 50 | Soumet le formulaire produit |
| `remove(id)` | 55 | Supprime un produit |

### `src/components/product/ProductForm.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `onFilesChange(event)` | 27 | Gère la sélection d'images produit |
| `removePreview(index)` | 43 | Supprime un aperçu d'image |
| `initForm(product)` | 50 | Initialise le formulaire avec les données d'un produit |
| `submit()` | 81 | Soumet le formulaire |

### `src/components/product/ProductSearch.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleFocus()` | 24 | Affiche la liste de suggestions |
| `handleBlur()` | 33 | Masque la liste de suggestions |
| `selectProduct(product)` | 40 | Sélectionne un produit dans la liste |
| `removeProduct(id)` | 52 | Retire un produit de la sélection |

### `src/components/product/AddSpecificPriceModal.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `selectCustomer(customer)` | 69 | Sélectionne un client pour le prix spécifique |
| `searchCustomers(query)` | 74 | Recherche des clients par nom/email |
| `submit()` | 80 | Crée le prix spécifique |

---

### `src/components/stock/StockList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `toggleSelectAll()` | 16 | Sélectionne/désélectionne tous les stocks |
| `toggleStock(id)` | 24 | Sélectionne/désélectionne un stock |
| `startEdit(stock)` | 59 | Passe un stock en mode édition |
| `cancelEdit()` | 64 | Annule l'édition en cours |
| `saveQuantity(stock)` | 73 | Sauvegarde la nouvelle quantité |
| `getStockClass(qty)` | 78 | Retourne la classe CSS selon le niveau de stock |
| `goToListMvt(productId)` | 69 | Navigation → mouvements de stock d'un produit |

---

### `src/components/category/CategoryList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `toggleSelectAll()` | 16 | Sélectionne/désélectionne toutes les catégories |
| `toggleCategory(id)` | 24 | Sélectionne/désélectionne une catégorie |
| `add()` | 35 | Ouvre le formulaire d'ajout |
| `edit(category)` | 36 | Ouvre le formulaire d'édition |
| `close()` | 37 | Ferme le formulaire |
| `submit(data)` | 39 | Soumet le formulaire catégorie |
| `remove(id)` | 44 | Supprime une catégorie |

### `src/components/customer/CustomerList.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `toggleSelectAll()` | 27 | Sélectionne/désélectionne tous les clients |
| `toggleCustomer(id)` | 35 | Sélectionne/désélectionne un client |
| `remove(id)` | 44 | Supprime un client |

---

## 5. Vues Backoffice

### `src/views/backoffice/catalog/CatalogView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleLogin(credentials)` | 24 | Authentifie l'admin et redirige |
| `handleLogout()` | 39 | Déconnecte l'admin |
| `handleKeyPress(e)` | 59 | Valide le formulaire login sur Entrée |

---

### `src/views/backoffice/dashboard/DashboardView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadOrders()` | 224 | Charge toutes les commandes PS pour les stats |
| `applyFilter()` | 267 | Applique un filtre de période |
| `resetFilter()` | 271 | Réinitialise les filtres |
| `formatCurrency(n)` | 276 | Formate un nombre en devise (ex: `12 500 Ar`) |
| `formatDate(str)` | 283 | Formate une date PS → affichage français |
| `formatDateRange()` | 293 | Formate l'intervalle de dates actif |
| `goToAdmin()` | 176 | Navigation → `/admin` |

---

### `src/views/backoffice/config/ConfigView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `currentTable()` | 386 | Retourne la table sélectionnée |
| `checkTableCount(table)` | 389 | Compte les enregistrements d'une table |
| `confirmReset(table)` | 411 | Demande confirmation avant reset |
| `executeReset(table)` | 415 | Exécute la réinitialisation d'une table |
| `selectAllTables()` | 486 | Sélectionne toutes les tables |
| `clearAllTables()` | 490 | Désélectionne toutes les tables |
| `toggleTableSelection(table)` | 495 | Bascule la sélection d'une table |
| `isTableSelected(table)` | 504 | Vérifie si une table est sélectionnée |
| `confirmMultipleReset()` | 509 | Confirmation reset multiple |
| `executeMultipleReset()` | 514 | Exécute le reset de plusieurs tables |

---

### `src/views/backoffice/import/ImportView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `setEtape(n, status)` | 389 | Définit le statut d'une étape d'import |
| `parseCsv(file)` | 401 | Parse un fichier CSV avec PapaParse |
| `onProduitChange(e)` | 410 | Gère le changement du fichier produits |
| `onDeclinaisonChange(e)` | 431 | Gère le changement du fichier déclinaisons |
| `onCommandeChange(e)` | 452 | Gère le changement du fichier commandes |
| `onPhotoChange(e)` | 473 | Gère le changement du fichier photos |
| `lancerImportation()` | 488 | Lance l'import des 4 fichiers en séquence |
| `handleRollback()` | 329 | Déclenche le rollback complet |

---

### `src/views/backoffice/import/ImportProduits.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleFileUpload(data)` | 90 | Reçoit les lignes CSV parsées |
| `normaliserFormatTaxe(raw)` | 66 | Normalise le format d'un taux de taxe |
| `slugify(str)` | 167 | Génère le slug URL |
| `chargerSchemas()` | 181 | Charge les schémas blank du WS PS |
| `obtenirOuCreerCategorie(name)` | 197 | Trouve ou crée une catégorie PS |
| `obtenirOuCreerGroupeTaxe(rate)` | 273 | Trouve ou crée un groupe de taxe PS |
| `verifierExistenceReference(ref)` | 428 | Vérifie si une référence produit existe déjà |
| `lancerImportation()` | 442 | Lance l'import ligne par ligne |

---

### `src/views/backoffice/import/ImportDeclinaison.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleFileUpload(data)` | 76 | Reçoit les lignes CSV parsées |
| `obtenirIdProduit(ref)` | 124 | GET → trouve l'ID produit par référence |
| `obtenirOuCreerGroupeAttribut(name)` | 143 | GET/POST → groupe d'attribut |
| `obtenirOuCreerValeurAttribut(name, idGroup)` | 215 | GET/POST → valeur d'attribut |
| `creerCombinaison(idProduct, ref, karazany, idAttrValue)` | 276 | POST → crée une combinaison |
| `mettreAJourStock(idProduct, idAttr, qty)` | 394 | Met à jour le stock |
| `extractIdFromXml(xml)` | 416 | Extrait l'ID d'une réponse XML brute |
| `lancerImportation()` | 427 | Lance l'import ligne par ligne |

---

### `src/views/backoffice/import/ImportOrder.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleFileUpload(data)` | 81 | Reçoit les lignes CSV parsées |
| `parserAchat(raw)` | 116 | Parse la colonne achat `[("ref";qty;"karazany"),...]` |
| `obtenirIdProduit(ref)` | 146 | GET → ID produit par référence |
| `obtenirIdDeclinaison(idProduct, karazany)` | 165 | GET → ID combinaison par valeur |
| `obtenirOuCreerClient(email, nom)` | 194 | GET/POST → client PS |
| `creerAdresse(idCustomer, adresse, ...)` | 254 | POST → adresse client |
| `creerPanier(idCustomer, idCarrier, ...)` | 293 | POST → panier PS |
| `creerCommande(cartId, customerId, ...)` | 349 | POST → commande PS |
| `creerPaiement(orderId, amount)` | 509 | POST → paiement commande |
| `decrementerStocks(lines)` | 537 | Décrémente les stocks après commande |
| `lancerImportation()` | 569 | Lance l'import ligne par ligne |

---

### `src/views/backoffice/import/ImportPhoto.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleZipUpload(file)` | 93 | Lit le ZIP et liste les images |
| `formatFileSize(bytes)` | 112 | Formate une taille en octets → `"45 Ko"` |
| `estImage(filename)` | 119 | Vérifie si un fichier est une image |
| `extraireReference(filename)` | 125 | Extrait la référence depuis le nom de fichier |
| `obtenirIdProduit(ref)` | 132 | GET → ID produit par référence |
| `uploaderImage(productId, blob, ext)` | 156 | POST multipart → upload image |
| `lancerImportation()` | 188 | Lance l'import image par image |

---

### `src/views/backoffice/stock/StockMvt.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadAllMovements()` | 32 | Charge tous les mouvements de stock PS |
| `getReasonLabel(reasonId)` | 104 | Retourne le libellé d'une raison de mouvement |
| `goToPage(n)` | 168 | Navigation pagination |
| `resetFilters()` | 189 | Réinitialise les filtres |
| `goToStockList()` | 198 | Navigation → liste des stocks |

---

## 6. Vues Frontoffice

### `src/views/frontoffice/auth/UserPickerView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadUsers()` | 174 | Charge la liste des clients PS |
| `selectUser(user)` | 190 | Connecte automatiquement un utilisateur sélectionné |
| `selectAnon()` | 194 | Continue en mode anonyme (sans compte) |
| `handleContinue()` | 204 | Redirige vers `/home` après sélection |
| `initials(user)` | 160 | Calcule les initiales d'un utilisateur |

---

### `src/views/frontoffice/auth/LoginView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleLogin()` | 148 | Vérifie les credentials et connecte l'utilisateur |
| `initials(user)` | 116 | Calcule les initiales pour l'avatar |

### `src/views/frontoffice/auth/RegisterView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `handleRegister()` | 119 | POST → crée un nouveau client PS et connecte |

---

### `src/views/frontoffice/HomeView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadFeaturedProducts()` | 289 | Charge les produits mis en avant |
| `loadCategories()` | 391 | Charge les catégories PS |
| `loadCart()` | 445 | Charge le panier depuis `localStorage` |
| `saveCart()` | 461 | Sauvegarde le panier dans `localStorage` |
| `getAvailabilityBadge(dateStr)` | 471 | Calcule le badge HOT/NEW selon `available_date` |
| `addToCart(product, qty)` | 541 | Ajoute un produit au panier |
| `goToProduct(id)` | 601 | Navigation → `/product/:id` |
| `goToCategory(id)` | 609 | Filtre les produits par catégorie |
| `formatPrice(price)` | 619 | Formate un prix pour affichage |
| `handleImageError(e)` | 635 | Remplace l'image par un placeholder si 404 |

---

### `src/views/frontoffice/product/ProductsView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadProducts()` | 234 | Charge les produits avec filtres actifs |
| `loadCategories()` | 294 | Charge les catégories pour le filtre |
| `getAvailabilityBadge(dateStr)` | 316 | Badge HOT/NEW |
| `addToCart(product)` | 360 | Ajoute au panier |
| `loadCart()` | 353 | Charge le panier |
| `saveCart()` | 358 | Sauvegarde le panier |
| `goToProduct(id)` | 378 | Navigation → fiche produit |
| `resetFilters()` | 380 | Réinitialise tous les filtres |
| `getCategoryName(id)` | 195 | Retourne le nom d'une catégorie par ID |
| `formatPriceRange()` | 197 | Formate l'affichage de l'intervalle de prix |
| `clearPriceRange()` | 204 | Efface les bornes de prix |
| `formatPrice(n)` | 382 | Formate un prix |
| `formatPriceNumber(n)` | 383 | Formate un nombre en devise |
| `handleImageError(e)` | 385 | Placeholder si image manquante |

---

### `src/views/frontoffice/product/ProductDetailView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadProduct(id)` | 268 | Charge le détail d'un produit (prix, stock, images) |
| `loadCombinations(idProduct)` | 351 | Charge les combinaisons et leurs attributs |
| `loadRelatedProducts()` | 419 | Charge les produits de la même catégorie |
| `selectAttribute(groupId, valueId)` | 231 | Sélectionne une valeur d'attribut |
| `updateSelectedCombination()` | 237 | Met à jour la combinaison sélectionnée |
| `getCombinationStockForOption(valueId)` | 206 | Stock disponible pour une option |
| `addToCart(qty)` | 445 | Ajoute le produit (avec combinaison) au panier |
| `increaseQuantity()` | 487 | Augmente la quantité |
| `decreaseQuantity()` | 488 | Diminue la quantité (min 1) |
| `goToProduct(id)` | 489 | Navigation → autre produit |
| `goBack()` | 490 | Navigation → retour à la liste |
| `formatPrice(n)` | 491 | Formate un prix |
| `handleImageError(e)` | 492 | Placeholder si image manquante |

---

### `src/views/frontoffice/order/CartView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadCart()` | 358 | Charge le panier depuis `localStorage` |
| `loadSavedCarts()` | 373 | Charge les paniers sauvegardés du client |
| `resumeSavedCart(cart)` | 392 | Reprend un panier sauvegardé |
| `saveCurrentCart()` | 407 | Sauvegarde le panier actuel côté serveur |
| `saveAnonCart()` | 424 | Sauvegarde le panier anonyme |
| `saveCart()` | 445 | Sauvegarde dans `localStorage` |
| `increaseQuantity(item)` | 450 | Augmente la quantité d'un article |
| `decreaseQuantity(item)` | 457 | Diminue la quantité (min 1) |
| `removeItem(item)` | 466 | Supprime un article du panier |
| `goToProduct(id)` | 472 | Navigation → fiche produit |
| `proceedToCheckout()` | 477 | Affiche les options de commande |
| `startCheckout()` | 494 | Lance le processus de commande |
| `formatPrice(n)` | 556 | Formate un prix |
| `formatDate(str)` | 567 | Formate une date |
| `handleImageError(e)` | 578 | Placeholder si image manquante |

---

### `src/views/frontoffice/order/CheckoutView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadCart()` | 147 | Charge le panier |
| `loadCustomerInfo()` | 155 | Charge les informations du client connecté |
| `loadCarrierInfo()` | 169 | Charge les informations du transporteur |
| `confirmOrder()` | 178 | Déclenche la création de la commande |
| `retryCheckout()` | 227 | Relance le checkout après erreur |
| `formatPrice(n)` | 233 | Formate un prix |

---

### `src/views/frontoffice/order/OrderFrontView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadOrders()` | 105 | Charge les commandes du client connecté |
| `viewOrderDetail(id)` | 142 | Navigation → `/order/:id` |
| `getStatusLabel(stateId)` | 146 | Libellé de l'état de commande |
| `getStatusClass(stateId)` | 162 | Classe CSS selon l'état |
| `formatPrice(n)` | 178 | Formate un prix |
| `formatDate(str)` | 189 | Formate une date |

---

### `src/views/frontoffice/order/OrderDetailView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `loadOrderDetail(id)` | 208 | Charge le détail complet d'une commande |
| `loadAddress(id)` | 275 | Charge l'adresse de livraison |
| `loadCarrier(id)` | 304 | Charge les infos transporteur |
| `calculateProductTotal(lines)` | 318 | Calcule le total des lignes |
| `getStatusLabel(stateId)` | 331 | Libellé de l'état |
| `getStatusClass(stateId)` | 346 | Classe CSS selon l'état |
| `formatPrice(n)` | 362 | Formate un prix |
| `formatDate(str)` | 371 | Formate une date |
| `handleImageError(e)` | 325 | Placeholder si image manquante |

### `src/views/frontoffice/order/OrderConfirmView.vue`

| Fonction | Ligne | Description |
|----------|-------|-------------|
| `formatPrice(n)` | 71 | Formate un prix |
| `formatDate(str)` | 79 | Formate une date |

---

## Fonctions les plus réutilisées

| Fonction | Occurrences | Description |
|----------|-------------|-------------|
| `formatPrice(n)` | 10+ vues | Formate un nombre en prix affichable |
| `formatDate(str)` | 8+ vues | Formate une date PS en DD/MM/YYYY |
| `handleImageError(e)` | 6+ vues | Remplace une image manquante par un placeholder |
| `loadCart()` | 5 vues | Charge le panier depuis localStorage |
| `parse(xml)` | Tous les stores | Wrapper DOMParser |
| `text(node, tag)` | Tous les stores | Extrait textContent d'un nœud XML |
| `col(row, ...keys)` | 3 services | Lecture robuste colonne CSV |
| `tryExtractId(data, name)` | 3 services | Extrait l'ID d'une réponse PS |
| `postEntity(url, xml, name)` | 3 services | POST XML → PS et retourne l'ID |
| `getAvailabilityBadge(date)` | 2 vues | Badge HOT/NEW selon `available_date` |
