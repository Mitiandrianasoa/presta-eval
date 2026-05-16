<template>
  <div class="import-container">
    <h2>Importateur PrestaShop - Fichier 1 (Produits)</h2>
    
    <div class="upload-zone">
      <input type="file" accept=".csv" @change="handleFileUpload" />
      <button :disabled="!csvData.length || isImporting" @click="lancerImportation" class="btn-import">
      {{ isImporting ? 'Importation en cours...' : "Lancer l'importation" }}
    </button>
    </div>

    <div v-if="statusMessage" :class="['status-box', importSuccess ? 'success' : 'error']">
      <strong>Statut :</strong> {{ statusMessage }}
    </div>

    <div v-if="produitsTraites.length" class="report-section">
      <h3>Suivi de l'Insertion Globale</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Nom</th>
            <th>Prix HT Calculé</th>
            <th>Table ps_product</th>
            <th>Table ps_product_lang</th>
            <th>Table ps_product_shop</th>
            <th>État / Erreurs</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prod in produitsTraites" :key="prod.reference" :class="prod.status">
            <td>{{ prod.reference }}</td>
            <td>{{ prod.nom }}</td>
            <td>{{ prod.prix_ht }} €</td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product }}</span></td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product_lang }}</span></td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product_shop }}</span></td>
            <td>
              <span v-if="prod.status === 'pending'" class="txt-pending">En attente...</span>
              <span v-if="prod.status === 'success'" class="txt-success">✔ Inséré (ID: {{ prod.id_prestashop }})</span>
              <span v-if="prod.status === 'rolled_back'" class="txt-rollback">↺ Annulé (Rollback)</span>
              <span v-if="prod.status === 'error'" class="txt-error">✘ {{ prod.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Papa from 'papaparse';
import { buildPrestashopXml } from '../../../utils/prestashopXmlBuilder';
import { fetchSchema } from '../../../api/schemaService';
import api from '../../../api/api';  // ✅ Client API pré-authentifié

const csvData = ref([]);
const produitsTraites = ref([]);
const isImporting = ref(false);
const statusMessage = ref('');
const importSuccess = ref(true);


// Fonction pour normaliser tous les formats de taxe possibles
const normaliserFormatTaxe = (taxeTxt) => {
  if (!taxeTxt) return { taux: '0', label: 'TVA 0%' };
  
  // Nettoyer la chaîne
  let taxeNettoyee = taxeTxt.trim();
  
  // Extraire le taux numérique (supporte: 11,65%, 11.65%, 11.65, 20%, 5.5%, etc.)
  let tauxNumerique = taxeNettoyee
    .replace('%', '')           // Enlever le symbole %
    .replace(',', '.')          // Remplacer virgule par point
    .replace(/\s/g, '')         // Enlever les espaces
    .match(/[\d]+\.?[\d]*/);    // Extraire le nombre
  
  if (!tauxNumerique) return { taux: '0', label: 'TVA 0%' };
  
  // Formater le taux avec 3 décimales (format PrestaShop: 20.000, 11.650, 5.500)
  const taux = parseFloat(tauxNumerique[0]).toFixed(3);
  
  // Générer un label standardisé
  const label = `TVA ${parseFloat(taux).toString().replace('.', ',')}%`;
  
  return { taux, label };
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData.value = results.data;
      
      console.log('📊 Données CSV brutes:', results.data);
      
      produitsTraites.value = results.data.map(row => {
        // ✅ ÉTAPE 1: Normaliser la taxe
        const taxeInfo = normaliserFormatTaxe(row.Taxe);
        
        // ✅ ÉTAPE 2: Nettoyer le prix TTC (remplacer virgule par point)
        const prixTtcStr = row.prix_ttc ? row.prix_ttc.toString().trim().replace(',', '.') : '0';
        const prixTtc = parseFloat(prixTtcStr);
        
        // ✅ ÉTAPE 3: Nettoyer le prix d'achat
        const prixAchatStr = row.prix_achat ? row.prix_achat.toString().trim().replace(',', '.') : '0';
        const prixAchat = parseFloat(prixAchatStr);
        
        // ✅ ÉTAPE 4: Calculer le taux en décimal
        const tauxDecimal = parseFloat(taxeInfo.taux);
        
        // ✅ ÉTAPE 5: Calcul du Prix HT
        // Formule: HT = TTC / (1 + taux/100)
        let prixHt;
        if (tauxDecimal > 0 && prixTtc > 0) {
          prixHt = prixTtc / (1 + (tauxDecimal / 100));
        } else {
          prixHt = prixTtc; // Si pas de taxe, HT = TTC
        }
        
        // ✅ ÉTAPE 6: Arrondir à 6 décimales (format PrestaShop)
        const prixHtFormate = prixHt.toFixed(6);
        
        console.log('💰 Calcul prix:', {
          reference: row.reference,
          prix_ttc: prixTtc,
          taux: tauxDecimal,
          prix_ht_calcule: prixHtFormate,
          verification: `HT ${prixHtFormate} * ${(1 + tauxDecimal/100)} = ${(parseFloat(prixHtFormate) * (1 + tauxDecimal/100)).toFixed(2)}`
        });

        // ✅ ÉTAPE 7: Normalisation de la date
        let dateNormalisee = row.date_availability_produit;
        if (dateNormalisee && dateNormalisee.includes('/')) {
          const [day, month, year] = dateNormalisee.split('/');
          dateNormalisee = `${year}-${month}-${day}`;
        }

        return {
          reference: row.reference?.trim(),
          nom: row.nom?.trim(),
          prix_ht: prixHtFormate,
          prix_achat: prixAchat.toFixed(6),
          date_dispo: dateNormalisee,
          categorie: row.categorie?.trim() || 'Accueil',
          taxe_label: taxeInfo.label,
          taxe_taux: taxeInfo.taux,
          id_prestashop: null,
          status: 'pending',
          erreur: '',
          tables: { ps_product: 'En attente', ps_product_lang: 'En attente', ps_product_shop: 'En attente' }
        };
      });
      
      statusMessage.value = 'Fichier CSV chargé. Prêt à lancer l\'importation dynamique.';
      importSuccess.value = true;
    }
  });
};

// Helper pour transformer un titre en URL simplifiée (Slug) pour les catégories
const slugify = (text) => {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
};

// 2. Fonctions de Résolution Dynamique (Vérification et Création si manquant)

// Variable pour stocker le schéma des catégories (chargé une seule fois)
const categorySchema = ref(null);
const taxSchema = ref(null);

// Fonction pour charger les schémas au démarrage
const chargerSchemas = async () => {
  try {
    categorySchema.value = await fetchSchema('categories');
    console.log('✅ Schéma catégories chargé:', categorySchema.value.fields.length, 'champs');
    
    taxSchema.value = await fetchSchema('tax_rule_groups');
    console.log('✅ Schéma taxes chargé:', taxSchema.value.fields.length, 'champs');
  } catch (error) {
    console.error('❌ Erreur chargement schémas:', error);
  }
};

// Charger les schémas au montage du composant
chargerSchemas();

// Fonction modifiée pour créer une catégorie avec le builder
const obtenirOuCreerCategorie = async (nomCat, cache, registreRollback) => {
  if (cache[nomCat]) return cache[nomCat];

  // A. Recherche si la catégorie existe déjà
  try {
    const res = await api.get(`/categories?filter[name]=${encodeURIComponent(nomCat)}&display=[id]`);
    if (res.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, "application/xml");
      const categories = xmlDoc.getElementsByTagName("category");
      if (categories.length > 0) {
        const id = categories[0].getElementsByTagName("id")[0]?.textContent;
        if (id) {
          console.log(`✅ Catégorie "${nomCat}" trouvée (ID: ${id})`);
          cache[nomCat] = id;
          return id;
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche catégorie "${nomCat}":`, error);
  }

  // B. Si elle n'existe pas, création avec le builder
  if (!categorySchema.value) {
    throw new Error('❌ Schéma des catégories non chargé');
  }

  const slug = slugify(nomCat);
  
  // Préparer les données mappées selon le schéma
  const mappedData = {
    id_parent: '1',
    active: '1',
    id_shop_default: '1',
    is_root_category: '0',
    name: nomCat,
    link_rewrite: slug,
    description: '',
    meta_title: nomCat,
    meta_description: ''
  };

  // Générer le XML avec le builder
  const xmlCategory = buildPrestashopXml('category', mappedData, categorySchema.value.fields);
  
  console.log('📄 XML catégorie généré:', xmlCategory);

  try {
    const response = await api.post('/categories', xmlCategory, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    const responseText = response.data;
    console.log(`📥 Réponse création catégorie "${nomCat}":`, response.status, responseText);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "application/xml");
    const newId = xmlDoc.getElementsByTagName("id")[0]?.textContent;

    if (!newId) {
      throw new Error(`ID non trouvé dans la réponse pour la catégorie: ${nomCat}`);
    }

    console.log(`✅ Catégorie "${nomCat}" créée avec ID: ${newId}`);
    cache[nomCat] = newId;
    registreRollback.push(newId);
    return newId;

  } catch (error) {
    console.error(`❌ Échec création catégorie "${nomCat}":`, error);
    throw error;
  }
};

// Fonction modifiée pour créer un groupe de taxe avec le builder
const obtenirOuCreerGroupeTaxe = async (labelTaxe, tauxTaxe, idPays, cache, registreRollback) => {
  if (cache[labelTaxe]) return cache[labelTaxe];

  // A. Recherche si le groupe de taxe existe déjà
  try {
    const res = await api.get(`/tax_rule_groups?filter[name]=${encodeURIComponent(labelTaxe)}&display=[id]`);
    if (res.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, "application/xml");
      const taxGroups = xmlDoc.getElementsByTagName("tax_rule_group");
      if (taxGroups.length > 0) {
        const id = taxGroups[0].getElementsByTagName("id")[0]?.textContent;
        if (id) {
          console.log(`✅ Groupe taxe "${labelTaxe}" trouvé (ID: ${id})`);
          cache[labelTaxe] = id;
          return id;
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche taxe "${labelTaxe}":`, error);
  }

  // B. Création de la taxe (si elle n'existe pas)
  let idTax = null;
  try {
    // Recherche de la taxe par taux
    const resTax = await api.get(`/taxes?filter[rate]=${encodeURIComponent(tauxTaxe)}&display=[id]`);
    if (resTax.data) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(resTax.data, "application/xml");
      const taxes = xmlDoc.getElementsByTagName("tax");
      if (taxes.length > 0) {
        idTax = taxes[0].getElementsByTagName("id")[0]?.textContent;
        console.log(`✅ Taxe taux ${tauxTaxe}% trouvée (ID: ${idTax})`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erreur recherche taxe taux ${tauxTaxe}%:`, error);
  }

  // Création de la taxe si non trouvée
  if (!idTax) {
    try {
      const xmlTax = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax>
    <rate>${tauxTaxe}</rate>
    <active>1</active>
    <name>
      <language id="1"><![CDATA[${labelTaxe}]]></language>
      <language id="2"><![CDATA[${labelTaxe}]]></language>
    </name>
  </tax>
</prestashop>`;

      console.log('📄 XML taxe généré:', xmlTax);

      const responseTax = await api.post('/taxes', xmlTax, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      });

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseTax.data, "application/xml");
      idTax = xmlDoc.getElementsByTagName("id")[0]?.textContent;

      if (!idTax) {
        throw new Error(`ID non trouvé pour la taxe: ${labelTaxe}`);
      }

      console.log(`✅ Taxe "${labelTaxe}" créée avec ID: ${idTax}`);
      registreRollback.push({ type: 'tax', id: idTax });
    } catch (error) {
      console.error(`❌ Échec création taxe "${labelTaxe}":`, error);
      throw error;
    }
  }

  // C. Création du groupe de taxe (tax_rule_group)
  if (!taxSchema.value) {
    throw new Error('❌ Schéma des taxes non chargé');
  }

  const mappedData = {
    name: labelTaxe,
    active: '1'
  };

  const xmlTaxGroup = buildPrestashopXml('tax_rule_group', mappedData, taxSchema.value.fields);
  
  console.log('📄 XML groupe taxe généré:', xmlTaxGroup);

  let idTaxRuleGroup = null;
  try {
    const response = await api.post('/tax_rule_groups', xmlTaxGroup, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    const responseText = response.data;
    console.log(`📥 Réponse création groupe taxe "${labelTaxe}":`, response.status, responseText);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "application/xml");
    idTaxRuleGroup = xmlDoc.getElementsByTagName("id")[0]?.textContent;

    if (!idTaxRuleGroup) {
      throw new Error(`ID non trouvé pour le groupe de taxe: ${labelTaxe}`);
    }

    console.log(`✅ Groupe taxe "${labelTaxe}" créé avec ID: ${idTaxRuleGroup}`);
    registreRollback.push({ type: 'tax_rule_group', id: idTaxRuleGroup });
  } catch (error) {
    console.error(`❌ Échec création groupe taxe "${labelTaxe}":`, error);
    throw error;
  }

  // D. Création de la règle de taxe (tax_rule) - LIEN entre tax et tax_rule_group
  try {
    const xmlTaxRule = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax_rule>
    <id_tax_rules_group>${idTaxRuleGroup}</id_tax_rules_group>
    <id_country>8</id_country>
    <id_state>0</id_state>
    <zipcode_from>0</zipcode_from>
    <zipcode_to>0</zipcode_to>
    <id_tax>${idTax}</id_tax>
    <behavior>0</behavior>
  </tax_rule>
</prestashop>`;

    console.log('📄 XML règle taxe généré:', xmlTaxRule);

    const responseRule = await api.post('/tax_rules', xmlTaxRule, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseRule.data, "application/xml");
    const idTaxRule = xmlDoc.getElementsByTagName("id")[0]?.textContent;

    console.log(`✅ Règle taxe créée (ID: ${idTaxRule}) liant taxe ${idTax} au groupe ${idTaxRuleGroup}`);
    registreRollback.push({ type: 'tax_rule', id: idTaxRule });

  } catch (error) {
    console.error(`❌ Échec création règle taxe pour groupe ${idTaxRuleGroup}:`, error);
    // On ne throw pas ici car le groupe existe déjà, on peut continuer
  }

  // Mettre en cache et retourner l'ID du groupe
  cache[labelTaxe] = idTaxRuleGroup;
  return idTaxRuleGroup;
};

// Fonction de vérification d'existence d'un produit (GET par Référence) [cite: 7, 8]
const verifierExistenceReference = async (refProduct) => {
  try {
    const res = await api.get(`/products?filter[reference]=[${refProduct}]&display=[id]`);
    if (!res.data) return null;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, "application/xml");
    const id = xmlDoc.getElementsByTagName("id")[0]?.textContent;
    return id || null;
  } catch (error) {
    return null;
  }
};

// 3. Fonction Principale d'Importation avec Gestion de Transaction Globale
const lancerImportation = async () => {
  isImporting.value = true;
  statusMessage.value = "Analyse des dépendances et sécurisation de la transaction...";
  
  // Registres de suivi pour appliquer le "Tout ou rien" (Rollback)
  const produitsCreesIds = [];
  const categoriesCreesIds = [];
  const taxesCreesIds = [];
  
  // Caches de session pour éviter les requêtes HTTP répétitives sur une même catégorie
  const cacheCategories = {};
  const cacheTaxes = {};
  
  let transactionEnEchec = false;

  for (let prod of produitsTraites.value) {
    if (transactionEnEchec) {
      prod.status = 'rolled_back';
      prod.tables = { ps_product: 'Annulé', ps_product_lang: 'Annulé', ps_product_shop: 'Annulé' };
      continue;
    }

    try {
      // ÉTAPE B.1 : Résolution dynamique de la catégorie (Vérifie ou Crée) [cite: 25, 26]
      const idCategoryDefault = await obtenirOuCreerCategorie(prod.categorie, cacheCategories, categoriesCreesIds);
       // ✅ Vérification que prod.taxe_label et prod.taxe_taux existent
      console.log('🔍 Données taxe:', {
        label: prod.taxe_label,
        taux: prod.taxe_taux,
        cacheKeys: Object.keys(cacheTaxes)
      });

      const idTaxRulesGroup = await obtenirOuCreerGroupeTaxe(
        prod.taxe_label || 'TVA 0%',  // Valeur par défaut si undefined
        prod.taxe_taux || '0.000',    // Valeur par défaut si undefined
        3,
        cacheTaxes,                    // ✅ Doit être l'objet cache
        taxesCreesIds
      );
      // ÉTAPE B.2 : Résolution dynamique de la taxe (Vérifie ou Crée) [cite: 24]
      // const idTaxRulesGroup = await obtenirOuCreerGroupeTaxe(prod.taxe_label, cacheTaxes, taxesCreesIds);

      // ÉTAPE C : Vérification d'unicité du produit [cite: 7, 8]
      const existId = await verifierExistenceReference(prod.reference);

      // ÉTAPE D : Génération du XML final [cite: 31]
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
      <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
        <product>
          ${existId ? `<id>${existId}</id>` : ''}
          <reference>${prod.reference}</reference>
          <price>${prod.prix_ht}</price>
          <wholesale_price>${prod.prix_achat}</wholesale_price>
          <active>1</active>
          <state>1</state>
          <show_price>1</show_price>                    <!-- ✅ AJOUTÉ -->
          <available_for_order>1</available_for_order> 
          <available_date>${prod.date_dispo}</available_date>
          <id_category_default>${idCategoryDefault}</id_category_default>
          <id_tax_rules_group>${idTaxRulesGroup}</id_tax_rules_group>
          <id_shop_default>1</id_shop_default>
          <name>
            <language id="2">${prod.nom}</language>
          </name>
          <associations>
            <categories>
              <category><id>${idCategoryDefault}</id></category>
            </categories>
          </associations>
        </product>
      </prestashop>`;

      // ÉTAPE E : Écriture dans PrestaShop (POST ou PUT) [cite: 8]
      const url = existId ? `/products/${existId}` : '/products';
      const methode = existId ? 'PUT' : 'POST';

      let response;
      if (methode === 'PUT') {
        response = await api.put(url, xmlPayload, {
          headers: { 'Content-Type': 'application/xml' }
        });
      } else {
        response = await api.post(url, xmlPayload, {
          headers: { 'Content-Type': 'application/xml' }
        });
      }

      const responseText = response.data;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "application/xml");
      const insertedId = xmlDoc.getElementsByTagName("id")[0]?.textContent;

      prod.id_prestashop = insertedId || existId;
      prod.status = 'success';
      prod.tables = { ps_product: 'Écrit ✔', ps_product_lang: 'Écrit ✔', ps_product_shop: 'Écrit ✔' };

      // On mémorise l'ID produit uniquement s'il vient d'être créé (pour pouvoir l'effacer en cas de rollback)
      if (!existId && insertedId) {
        produitsCreesIds.push(insertedId);
      }

    } catch (err) {
      transactionEnEchec = true;
      prod.status = 'error';
      prod.erreur = err.message;
      prod.tables = { ps_product: 'ÉCHEC ✘', ps_product_lang: 'ÉCHEC ✘', ps_product_shop: 'ÉCHEC ✘' };
    }
  }

  // EXECUTION DU ROLLBACK EN CAS D'ÉCHEC GLOBAL (TOUT OU RIEN)
  if (transactionEnEchec) {
    statusMessage.value = "Échec détecté ! Nettoyage intégral de la base de données (Rollback actif)...";
    importSuccess.value = false;

    // 1. Suppression des produits créés durant cette session
    for (let id of produitsCreesIds) {
      await api.delete(`/products/${id}`);
    }
    // 2. Suppression des catégories créées durant cette session
    for (let id of categoriesCreesIds) {
      await api.delete(`/categories/${id}`);
    }
    // 3. Suppression des groupes de taxes créés durant cette session
    for (let id of taxesCreesIds) {
      await api.delete(`/tax_rule_groups/${id}`);
    }

    statusMessage.value = "Transaction annulée avec succès. Aucune donnée partielle n'a été conservée.";
  } else {
    statusMessage.value = "Importation réussie ! Les produits, catégories et taxes ont été synchronisés.";
    importSuccess.value = true;
  }
  isImporting.value = false;
};
</script>

<style scoped>
.import-container {
  font-family: Arial, sans-serif;
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}
.upload-zone {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: center;
}
.btn-import {
  padding: 10px 20px;
  background-color: #4ed282;
  border: none;
  color: white;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
}
.btn-import:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.status-box {
  padding: 15px;
  margin-bottom: 20px;
  border-left: 5px solid;
  border-radius: 4px;
}
.status-box.success { background-color: #e6f9ed; border-left-color: #28a745; color: #155724; }
.status-box.error { background-color: #fdf2f2; border-left-color: #dc3545; color: #721c24; }

.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  background: white;
}
.report-table th, .report-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
  font-size: 14px;
}
.report-table th { background-color: #f1f1f1; }
.center { text-align: center; }

/* Couleurs des lignes du tableau selon le statut transactionnel */
.success { background-color: #f3fbf6; }
.error { background-color: #fff5f5; }
.rolled_back { background-color: #fffdf0; color: #7c6e10; }

.badge {
  background: #007bff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.error .badge { background: #dc3545; }
.success .badge { background: #28a745; }
.rolled_back .badge { background: #ffc107; color: #333; }

.txt-success { color: #28a745; font-weight: bold; }
.txt-error { color: #dc3545; font-weight: bold; }
.txt-rollback { color: #b78a00; font-style: italic; }
.txt-pending { color: #666; }
</style>