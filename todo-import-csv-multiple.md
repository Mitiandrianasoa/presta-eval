# TODO - Import CSV Multiple + Logging + Import ZIP Photos

## 📋 PHASE 1: Import CSV Multiple avec Sélection Colonnes + Logging

### État actuel
- ✅ CsvUploader.vue: Parse plusieurs fichiers CSV (Papa Parse)
- ✅ SchemaMapper.vue: Mapping automatique basique des champs
- ⚠️ Pas de logging des formats
- ⚠️ Pas de validation des formats avant import
- ⚠️ Pas de gestion des erreurs par fichier

### 1.1 - Amélioration du Détection Automatique des Colonnes
- [ ] **Créer un service `columnDetectionService.ts`** qui détecte intelligemment:
  - [ ] Fichier produits: `nom`, `reference`, `prix_ttc`, `categorie`, `taxe`
  - [ ] Fichier spécificités: `reference`, `stock_initial`, `prix_vente_ttc`, `specificité`
  - [ ] Fichier clients/commandes: `email`, `nome`, `adresse`, `etat`
  - [ ] Variantes de noms (ex: "product_name", "produit", "name", "nom")
  - [ ] Support du Malagasy: "karazany", "loko", etc.
  
- [ ] **Ajouter une fonction de scoring** pour les colonnes attendues:
  ```
  - Correspondance exacte: 100%
  - Similarité texte (fuzzy): 80-99%
  - Correspondance partielle: 60-79%
  - Pas de match: 0%
  ```

### 1.2 - Logging et Validation des Formats
- [ ] **Créer `loggerService.ts`** avec système de logging:
  - [ ] Logger toutes les actions: parsing, validation, import
  - [ ] Niveaux: INFO, WARNING, ERROR
  - [ ] Timestamp et métadonnées
  - [ ] Formatage des messages structurés
  - [ ] Export en JSON/CSV
  
- [ ] **Créer `formatValidatorService.ts`** pour valider:
  - [ ] **Formats numériques**: `prix_ttc` (e.g., "12,5" ou "12.5"), `taxe` (e.g., "11,65%")
  - [ ] **Formats de référence**: alphanumériques (e.g., "T_01", "P_01")
  - [ ] **Formats de catégories**: texte + validation contre catégories existantes
  - [ ] **Formats d'email**: validation regex
  - [ ] **Formats de dates**: "DD/MM/YYYY"
  - [ ] **Formats de stock**: entiers positifs
  - [ ] **Données spéciales**: JSON array pour les commandes (e.g., `[("T_01";3;"ngoza")]`)
  
- [ ] **Logger chaque validation**:
  - Colonnes détectées avec leur score de confiance
  - Erreurs de format avec ligne/colonne
  - Avertissements (données manquantes, doublons)

### 1.3 - Amélioration du Composant SchemaMapper
- [ ] **Ajouter affichage du score de détection**:
  - Icône 🟢 (>80%), 🟡 (60-80%), 🔴 (<60%)
  - Tooltip avec explication
  
- [ ] **Ajouter aperçu des données**:
  - 3-5 premières lignes de chaque colonne
  - Détection du type de données (int, float, string, date, JSON)
  
- [ ] **Améliorer l'auto-mapping** avec le score système
  
- [ ] **Ajouter validation en temps réel**:
  - Afficher les erreurs potentielles avant l'import
  - Compteur d'erreurs/avertissements

### 1.4 - Gestion des Trois Fichiers Différents
- [ ] **Identifier et charger le bon schéma selon le fichier**:
  - `fichier1.csv` → Produits (ProductSchema)
  - `fichier2.csv` → Spécificités (SpecificPriceSchema)
  - `fichier3.csv` → Clients/Commandes (CustomerOrderSchema)
  
- [ ] **Créer workflow séquentiel**:
  - Sélectionner fichiers → Détecter type → Charger schéma → Mapper colonnes → Valider → Import
  
- [ ] **Créer les stores pour chaque fichier**:
  - Vérifier/compléter productStore.ts
  - Vérifier/compléter customerStore.ts
  - Vérifier/compléter specificPriceStore.ts

### 1.5 - Affichage des Logs et Résultats
- [ ] **Créer composant `ImportLog.vue`**:
  - [ ] Affichage en temps réel des logs (INFO, ⚠️ WARNING, ❌ ERROR)
  - [ ] Filtrer par type/fichier
  - [ ] Expor logs en JSON
  - [ ] Scroll auto jusqu'aux derniers logs
  
- [ ] **Créer composant `ImportResults.vue`**:
  - [ ] Résumé par fichier: X lignes traitées, Y erreurs, Z avertissements
  - [ ] Taux de succès (%)
  - [ ] Lister les erreurs détaillées
  - [ ] Bouton "Télécharger rapport d'erreurs"

### 1.6 - API Backend pour Import
- [ ] **Créer endpoint POST `/api/import/products`**:
  - Accepeter données mappées + métadonnées
  - Valider en backend aussi
  - Logger toutes les actions
  - Retourner status détaillé
  
- [ ] **Créer endpoint POST `/api/import/specific-prices`**
  
- [ ] **Créer endpoint POST `/api/import/customers`**
  
- [ ] **Créer endpoint POST `/api/import/orders`**

### 1.7 - Gestion des Erreurs et Retries
- [ ] **Implémenter retry logic**:
  - [ ] Pour les erreurs temporaires (timeout, etc.)
  - [ ] Avec backoff exponentiel
  
- [ ] **Gérer les doublons**:
  - [ ] Détecter les références de produits en doublon
  - [ ] Options: ignorer / remplacer / skip
  
- [ ] **Gérer les références manquantes**:
  - [ ] Produit avec référence non trouvée
  - [ ] Catégorie inexistante

---

## 📦 PHASE 2: Import ZIP Photos

### 2.1 - Composant ZipUploader
- [ ] **Créer `ZipUploader.vue`**:
  - [ ] Input pour sélectionner fichier ZIP
  - [ ] Vérifier format ZIP valide
  - [ ] Afficher nombre de fichiers images dans ZIP
  - [ ] Vérifier extensions autorisées: .jpg, .jpeg, .png, .gif, .webp
  
- [ ] **Implémenter JSZip pour lire contenu ZIP**:
  - [ ] Lister tous fichiers
  - [ ] Filtrer les images
  - [ ] Ignorer les dossiers cachés /__MACOSX, .DS_Store

### 2.2 - Mapping Images → Produits
- [ ] **Créer `ImageMapper.vue`**:
  - [ ] Prévisualiser images du ZIP
  - [ ] Détecter automatiquement: `<reference>.<ext>` (ex: T_01.jpg)
  - [ ] Permettre le mapping manuel si nom ne correspond pas
  - [ ] Afficher score de confiance comme Phase 1
  
- [ ] **Créer `imageMapperService.ts`**:
  - [ ] Parser noms d'images pour extraire références
  - [ ] Valider références contre produits existants
  - [ ] Scoring de correspondance

### 2.3 - Upload et Storage Images
- [ ] **Créer endpoint POST `/api/import/images`**:
  - [ ] Accepter ZIP file
  - [ ] Traiter images dans le backend
  - [ ] Redimensionner (thumbnails, medium, large)
  - [ ] Sauvegarder en dossier organisé: `/images/<reference>/`
  - [ ] Mettre à jour BDD produits avec chemin images
  
- [ ] **Ou utiliser AWS S3/Cloud Storage**:
  - [ ] Si préféré pour production
  - [ ] Configurer credentials
  - [ ] Upload asynchrone par batch

### 2.4 - Progress et Logging ZIP
- [ ] **Ajouter progress bar**:
  - [ ] Pour extraction ZIP
  - [ ] Pour upload images
  - [ ] Pour traitement images (redimensionnement)
  
- [ ] **Аjouter logs**:
  - [ ] Images trouvées/traitées
  - [ ] Erreurs de format image
  - [ ] Références non trouvées
  - [ ] Succès/échecs uploads

### 2.5 - Affichage Images dans App
- [ ] **Mettre à jour ProductList.vue**:
  - [ ] Afficher images produits
  - [ ] Fallback image si pas d'image
  
- [ ] **Mettre à jour ProductForm.vue**:
  - [ ] Galerie images produit
  - [ ] Upload image individuelles (bonus)

---

## 🔧 Fichiers à Créer

### Services
```
src/services/
  ├── columnDetectionService.ts      [PHASE 1.1]
  ├── formatValidatorService.ts      [PHASE 1.2]
  ├── loggerService.ts               [PHASE 1.2]
  └── imageMapperService.ts          [PHASE 2.2]
```

### Composants
```
src/components/
  ├── ImportLog.vue                  [PHASE 1.5]
  ├── ImportResults.vue              [PHASE 1.5]
  ├── ZipUploader.vue                [PHASE 2.1]
  └── ImageMapper.vue                [PHASE 2.2]
```

### API
```
src/api/
  ├── importApi.ts (nouveau ou extension api.ts)
```

---

## 📊 Exemple de Flux Complet

### PHASE 1: Import 3 CSV
```
1. Utilisateur sélectionne 3 fichiers CSV
   └→ CsvUploader.vue parse les fichiers
   └→ columnDetectionService.ts détecte types + score
   └→ Afficher 3 SchemaMapper (un par fichier)
   └→ Logs: "Détection: fichier1=Produits(95%), fichier2=Spécificités(87%), fichier3=Clients(92%)"

2. Utilisateur valide le mapping pour chaque fichier
   └→ formatValidatorService.ts valide chaque colonne
   └→ Logs: "Validation fichier1: 4/4 colonnes OK, 0 erreurs"
   └→ Afficher ImportResults.vue avec résumé

3. Utilisateur lance l'import
   └→ API backend impote progressivement
   └→ Logs en temps réel dans ImportLog.vue
   └→ Résumé final: "✅ 4 produits, ✅ 6 spécificités, ⚠️ 1 client (email invalide)"
```

### PHASE 2: Import ZIP Photos
```
1. Utilisateur sélectionne fichier ZIP
   └→ ZipUploader.vue extrait et valide images
   └→ Logs: "ZIP: 5 images trouvées (T_01.jpg, T_01_alt.jpg, ...)"

2. ImageMapper automatique détecte références
   └→ Logs: "Mapping: T_01(100%), T_01_alt(reference not found, 0%)"
   └→ Utilisateur peut corriger manuellement

3. Upload images via API
   └→ Progress bar upload
   └→ Logs traitement par image
   └→ Mise à jour produits: "✅ 5 images importées pour 3 produits"
```

---

## ✅ Checklist Minimum (MVP)

### Phase 1 MVP (Priorité Haute)
- [x] CsvUploader.vue (existant)
- [x] SchemaMapper.vue (existant)
- [ ] columnDetectionService.ts (optimisation)
- [ ] formatValidatorService.ts (validation de base)
- [ ] loggerService.ts (logging simple)
- [ ] ImportLog.vue (affichage logs)
- [ ] Backend endpoints `/api/import/*`

### Phase 2 MVP (Priorité Après Phase 1)
- [ ] ZipUploader.vue
- [ ] imageMapperService.ts (détection références)
- [ ] Backend endpoint `/api/import/images`
- [ ] ImageMapper.vue

---

## 📝 Notes

### Format de Logs à utiliser
```json
{
  "timestamp": "2026-05-11T10:30:45Z",
  "level": "INFO|WARNING|ERROR",
  "action": "CSV_PARSE|FORMAT_VALIDATION|IMPORT",
  "file": "fichier1.csv",
  "details": "...",
  "status": "SUCCESS|PARTIAL|FAILED"
}
```

### Stratégie Malagasy
- Supporter colonnes en Malagasy: "karazany" (variante), "loko" (couleur)
- Ajouter alias multilingues dans les fichiers de schéma
- Logs avec support multilingue

---

## 🎯 Prochaines Étapes

1. **Démarrer par Phase 1.1**: Améliorer columnDetectionService
2. **Puis Phase 1.2**: Implémenter formatValidatorService + loggerService
3. **Puis Phase 1.5**: Créer composants d'affichage
4. **Valider avec les données de test** (fichiers attachment)
5. **Phase 2**: Une fois Phase 1 complète

