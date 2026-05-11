# Plan d'Action : Système d'Importation de Données PrestaShop (CSV -> XML)

Suite à vos remarques, ce plan est mis à jour pour s'adapter **strictement** aux exigences de l'API PrestaShop : récupération dynamique des champs, respect du format XML complexe (avec `<![CDATA[]]>` et `<language>`), et intégration de validations avec logs.

Tout ceci se fera en **ajoutant** de nouveaux fichiers, sans modifier l'existant.

---

## 📦 Étape 1 : Installation des Librairies
- [ ] Ouvrir le terminal et exécuter : `npm install papaparse fast-xml-parser`
- [ ] Installer les types : `npm install -D @types/papaparse`
  > `fast-xml-parser` sera très utile pour lire le schéma XML fourni par PrestaShop et pour générer le XML final avec les balises CDATA.

---

## 📡 Étape 2 : Récupération Dynamique du Schéma (Synopsis)
PrestaShop fournit lui-même la liste de ses champs. Nous allons les lire dynamiquement plutôt que de les écrire en dur.

- [ ] **Créer le fichier** : `src/api/schemaService.ts`
- [ ] **À faire dedans** :
  - Créer `fetchSchema(endpoint: string)` : Fait un appel GET vers `/api/${endpoint}?schema=synopsis`.
  - Créer `parseSchema(xmlSchema: string)` : Analyse ce XML pour construire un tableau d'objets `FieldDefinition`.
  - Pour chaque champ du XML, cette fonction doit détecter :
    - Le nom de la balise (ex: `name`, `active`, `id_parent`).
    - S'il est obligatoire (présence de l'attribut `required="true"`).
    - Son format attendu (attribut `format`, ex: `isBool`, `isCatalogName`).
    - S'il est multilingue (présence de la balise enfant `<language>`).

---

## 🛠️ Étape 3 : Le Générateur XML PrestaShop Strict
PrestaShop attend un format XML enveloppé dans `<prestashop>` et utilisant `<![CDATA[...]]>`.

- [ ] **Créer le fichier** : `src/utils/prestashopXmlBuilder.ts`
- [ ] **À faire dedans** :
  - Créer `buildPrestashopXml(entityName: string, data: any, schema: FieldDefinition[])`
  - La fonction génère l'en-tête : `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink">`
  - Elle ouvre la balise de l'entité (ex: `<category>`).
  - Elle boucle sur les données mappées. Si le champ est dans le schéma comme "multilingue", elle génère `<nom_champ><language id="1"><![CDATA[ valeur ]]></language></nom_champ>`.
  - Sinon, elle génère simplement `<nom_champ><![CDATA[ valeur ]]></nom_champ>`.

---

## 🧩 Étape 4 : Les Composants d'Interface
- [ ] **Créer le fichier** : `src/components/CsvUploader.vue`
  - Utilise PapaParse pour lire les colonnes et les données du fichier CSV déposé.
- [ ] **Créer le fichier** : `src/components/SchemaMapper.vue`
  - Reçoit en `props` les colonnes du CSV et la liste des `FieldDefinition` (récupérée à l'étape 2).
  - Affiche visuellement les champs obligatoires (ex: avec une astérisque rouge `*`).
  - Permet à l'utilisateur de lier chaque champ PrestaShop à une colonne CSV via des listes déroulantes.

---

## 📂 Étape 5 : L'Importateur, les Validations et les Logs
C'est ici qu'on assemble tout, pour la catégorie d'abord, puis pour les modules.

- [ ] **Créer le fichier** : `src/views/EntityImportView.vue` (ou `CategoryImportView.vue` pour commencer)
- [ ] **Déroulement de l'interface** :
  1. Au montage (onMounted), le composant appelle `fetchSchema('categories')`.
  2. L'utilisateur uploade le CSV (`CsvUploader`).
  3. L'utilisateur fait le mapping (`SchemaMapper`).
- [ ] **Traitement ("Lancer l'importation")** :
  - Créer une variable d'état `const logs = ref([])` pour suivre le processus.
  - Boucler sur chaque ligne du CSV.
  - **Vérification** : Le code vérifie d'abord si les champs définis comme `required="true"` dans le schéma ont bien une valeur. Il vérifie aussi le `format` (ex: rejeter une chaîne de texte si `format="isBool"` est attendu).
  - Si erreur : Ajouter un log `logs.value.push({ ligne: i, statut: 'Erreur', message: 'Le champ Nom est obligatoire' })`.
  - Si succès : Appeler `buildPrestashopXml()`, puis faire un POST sur l'API PrestaShop. Ajouter un log `logs.value.push({ ligne: i, statut: 'Succès', message: 'Catégorie insérée (ID: X)' })`.
- [ ] **Affichage des Logs** :
  - Afficher la liste des logs en bas de la page avec un code couleur (Vert pour succès, Rouge pour erreur) pour un suivi en temps réel.

---

## 🚀 Étape 6 : Prochaines étapes
Une fois que cette architecture est en place pour les Catégories, faire la même chose pour les Modules sera instantané, car la fonction `fetchSchema('modules')` récupérera automatiquement le nouveau schéma, et le `SchemaMapper` s'adaptera tout seul !
