<template>
  <div class="import-container">
    <h2>Importateur PrestaShop - Fichier 2 (Déclinaisons & Stocks)</h2>
    
    <div class="upload-zone">
      <input type="file" accept=".csv" @change="handleFileUpload" />
      <button :disabled="!csvData.length || isImporting" @click="lancerImportation" class="btn-import">
        {{ isImporting ? 'Importation en cours...' : "Lancer l'importation" }}
      </button>
    </div>

    <div v-if="statusMessage" :class="['status-box', importSuccess ? 'success' : 'error']">
      <strong>Statut :</strong> {{ statusMessage }}
    </div>

    <div v-if="declinaisonsTraitees.length" class="report-section">
      <h3>Suivi de l'Insertion des Déclinaisons</h3>
      <table class="report-table">
      <thead>
        <tr>
            <th>Référence</th>
            <th>Spécificité</th>
            <th>Karazany</th>
            <th>Stock</th>
            <th>Prix TTC</th>        <!-- ✅ Nouvelle colonne -->
            <th>ID Produit</th>
            <th>ID Groupe</th>
            <th>ID Valeur</th>
            <th>ID Déclinaison</th>
            <th>État</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="decl in declinaisonsTraitees" :key="`${decl.reference}_${decl.specificite}_${decl.karazany}`" :class="decl.status">
            <td>{{ decl.reference }}</td>
            <td>{{ decl.specificite || 'N/A' }}</td>
            <td>{{ decl.karazany || 'N/A' }}</td>
            <td class="center">{{ decl.stock_initial }}</td>
            <td class="center">{{ decl.prix_vente_ttc || '-' }}</td>  <!-- ✅ Nouvelle cellule -->
            <td class="center">{{ decl.id_product || '-' }}</td>
            <td class="center">{{ decl.id_groupe || '-' }}</td>
            <td class="center">{{ decl.id_valeur || '-' }}</td>
            <td class="center">{{ decl.id_product_attribute || '-' }}</td>
            <td>
            <span v-if="decl.status === 'pending'" class="txt-pending">En attente...</span>
            <span v-if="decl.status === 'success'" class="txt-success">✔ Inséré</span>
            <span v-if="decl.status === 'success_simple'" class="txt-success">✔ Stock MAJ</span>
            <span v-if="decl.status === 'rolled_back'" class="txt-rollback">↺ Annulé</span>
            <span v-if="decl.status === 'error'" class="txt-error">✘ {{ decl.erreur }}</span>
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
import api from '../../../api/api';
import { updateResource, createResourceWithBlankSchema, fetchSchema } from '../../../api/schemaService';

const csvData = ref([]);
const declinaisonsTraitees = ref([]);
const isImporting = ref(false);
const statusMessage = ref('');
const importSuccess = ref(true);

// Caches
const cacheProduits = {};
const cacheGroupesAttributs = {};
const cacheAttributs = {};

// 1. Chargement CSV
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData.value = results.data;
      
      console.log('📊 Données CSV Fichier 2 brutes:', results.data);
      console.log('📋 Colonnes détectées:', Object.keys(results.data[0] || {}));
      
      declinaisonsTraitees.value = results.data.map(row => {
        // ✅ CORRECTION: Gérer les deux noms de colonnes possibles (avec ou sans accent)
        const specificite = row.specificité?.trim() || row.specificite?.trim() || '';
        const karazany = row.karazany?.trim() || '';
        const stock = parseInt(row.stock_initial) || 0;
        const prixTtc = row.prix_vente_ttc?.trim() || '';
        
        console.log(`📝 Ligne: ref="${row.reference}", spé="${specificite}", kar="${karazany}", stock=${stock}, prix=${prixTtc}`);
        
        return {
          reference: row.reference?.trim() || '',
          specificite: specificite,  // ✅ Nom de champ corrigé
          karazany: karazany,
          stock_initial: stock,
          prix_vente_ttc: prixTtc,   // ✅ Ajout du prix TTC
          id_product: null,
          id_groupe: null,
          id_valeur: null,
          id_product_attribute: null,
          status: 'pending',
          erreur: ''
        };
      });
      
      // ✅ Afficher un résumé
      const avecDeclinaison = declinaisonsTraitees.value.filter(d => d.specificite && d.karazany);
      const sansDeclinaison = declinaisonsTraitees.value.filter(d => !d.specificite || !d.karazany);
      
      statusMessage.value = `✅ ${declinaisonsTraitees.value.length} lignes chargées (${avecDeclinaison.length} avec déclinaisons, ${sansDeclinaison.length} sans déclinaison).`;
      importSuccess.value = true;
    }
  });
};

// 2. Récupérer l'ID du produit parent par référence
const obtenirIdProduit = async (reference) => {
  if (cacheProduits[reference]) return cacheProduits[reference];

  const res = await api.get(`/products?filter[reference]=[${encodeURIComponent(reference)}]&display=[id]`);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, "application/xml");
  const products = xmlDoc.getElementsByTagName("product");
  
  if (products.length > 0) {
    const id = products[0].getElementsByTagName("id")[0]?.textContent?.trim();
    if (id) {
      cacheProduits[reference] = id;
      return id;
    }
  }
  throw new Error(`Produit "${reference}" introuvable. Importez d'abord le Fichier 1.`);
};

// 3. ÉTAPE 1 : Obtenir/Créer la Spécificité (product_option) → id_attribute_group
const obtenirOuCreerGroupeAttribut = async (nomGroupe, registreRollback) => {
  if (!nomGroupe) return null;
  
  const cacheKey = nomGroupe.toLowerCase();
  if (cacheGroupesAttributs[cacheKey]) {
    console.log(`📦 Cache: groupe "${nomGroupe}" = ${cacheGroupesAttributs[cacheKey]}`);
    return cacheGroupesAttributs[cacheKey];
  }

  // Recherche du groupe existant
  try {
    const res = await api.get(`/product_options?filter[name]=${encodeURIComponent(nomGroupe)}&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, "application/xml");
    const groups = xmlDoc.getElementsByTagName("product_option");
    if (groups.length > 0) {
      const id = groups[0].getElementsByTagName("id")[0]?.textContent?.trim();
      if (id) {
        console.log(`✅ Groupe "${nomGroupe}" trouvé (ID: ${id})`);
        cacheGroupesAttributs[cacheKey] = id;
        return id;
      }
    }
  } catch (e) {
    console.warn(`⚠️ Recherche groupe "${nomGroupe}":`, e);
  }

  // ✅ Création avec XML multilingue CORRECT
  try {
    const xmlGroupe = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option>
    <is_color_group><![CDATA[0]]></is_color_group>
    <group_type><![CDATA[select]]></group_type>
    <name>
      <language id="1"><![CDATA[${nomGroupe}]]></language>
      <language id="2"><![CDATA[${nomGroupe}]]></language>
    </name>
    <public_name>
      <language id="1"><![CDATA[${nomGroupe}]]></language>
      <language id="2"><![CDATA[${nomGroupe}]]></language>
    </public_name>
  </product_option>
</prestashop>`;

    console.log('📄 XML groupe:', xmlGroupe);

    const response = await api.post('/product_options', xmlGroupe, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    console.log('📥 Status création groupe:', response.status);
    console.log('📥 Réponse:', response.data);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "application/xml");
    const newId = xmlDoc.getElementsByTagName("id")[0]?.textContent?.trim();

    if (!newId) throw new Error(`ID non trouvé pour le groupe: ${nomGroupe}`);

    console.log(`✅ Groupe "${nomGroupe}" créé (ID: ${newId})`);
    cacheGroupesAttributs[cacheKey] = newId;
    registreRollback.push({ type: 'product_option', id: newId });
    return newId;

  } catch (error) {
    console.error(`❌ Échec création groupe "${nomGroupe}":`, error);
    throw error;
  }
};

// 4. ÉTAPE 2 : Obtenir/Créer le Karazany (product_option_value) → id_attribute
const obtenirOuCreerValeurAttribut = async (idGroupe, nomValeur, registreRollback) => {
  if (!idGroupe || !nomValeur) return null;

  const cacheKey = `${idGroupe}_${nomValeur.toLowerCase()}`;
  if (cacheAttributs[cacheKey]) return cacheAttributs[cacheKey];

  // Recherche
  try {
    const res = await api.get(`/product_option_values?filter[id_attribute_group]=${idGroupe}&filter[name]=${encodeURIComponent(nomValeur)}&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, "application/xml");
    const values = xmlDoc.getElementsByTagName("product_option_value");
    if (values.length > 0) {
      const id = values[0].getElementsByTagName("id")[0]?.textContent?.trim();
      if (id) {
        cacheAttributs[cacheKey] = id;
        return id;
      }
    }
  } catch (e) {
    console.warn(`⚠️ Recherche valeur "${nomValeur}":`, e);
  }

  // ✅ Création AVEC le bon format pour le champ multilingue "name"
  try {
    // Construire le XML manuellement pour gérer le champ multilingue
    const xmlValeur = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option_value>
    <id_attribute_group><![CDATA[${idGroupe}]]></id_attribute_group>
    <name>
      <language id="1"><![CDATA[${nomValeur}]]></language>
      <language id="2"><![CDATA[${nomValeur}]]></language>
    </name>
  </product_option_value>
</prestashop>`;

    console.log('📄 XML valeur attribut:', xmlValeur);

    const response = await api.post('/product_option_values', xmlValeur, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "application/xml");
    const newId = xmlDoc.getElementsByTagName("id")[0]?.textContent?.trim();

    if (!newId) throw new Error(`ID non trouvé pour la valeur: ${nomValeur}`);

    console.log(`✅ Valeur "${nomValeur}" créée (ID: ${newId})`);
    cacheAttributs[cacheKey] = newId;
    registreRollback.push({ type: 'product_option_value', id: newId });
    return newId;

  } catch (error) {
    console.error(`❌ Échec création valeur "${nomValeur}":`, error);
    throw error;
  }
};

// 5. ÉTAPE 3 : Créer la Déclinaison (combination) → id_product_attribute
const creerCombinaison = async (idProduct, idAttribute, reference, prixTtcDeclinaison, registreRollback) => {
  try {
    // ÉTAPE 1 : Prix de base
    let prixBaseHt = 0;
    try {
      const res = await api.get(`/products/${idProduct}?display=[price]`);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, "application/xml");
      prixBaseHt = parseFloat(xmlDoc.getElementsByTagName("price")[0]?.textContent?.trim() || '0');
      console.log(`💰 Prix de base du produit ${idProduct}: ${prixBaseHt} HT`);
    } catch (e) {
      console.warn(`⚠️ Prix de base introuvable pour produit ${idProduct}`);
    }

    // ÉTAPE 2 : Taux de taxe
    let tauxTaxe = 20;
    try {
      const resProduct = await api.get(`/products/${idProduct}?display=[id_tax_rules_group]`);
      const parser = new DOMParser();
      const xmlProduct = parser.parseFromString(resProduct.data, "application/xml");
      const idTaxRulesGroup = xmlProduct.getElementsByTagName("id_tax_rules_group")[0]?.textContent?.trim();
      
      if (idTaxRulesGroup && idTaxRulesGroup !== '0') {
        const resTaxRules = await api.get(`/tax_rules?filter[id_tax_rules_group]=${idTaxRulesGroup}&display=[id_tax]`);
        const xmlTaxRules = parser.parseFromString(resTaxRules.data, "application/xml");
        const taxRules = xmlTaxRules.getElementsByTagName("tax_rule");
        
        if (taxRules.length > 0) {
          const idTax = taxRules[0].getElementsByTagName("id_tax")[0]?.textContent?.trim();
          if (idTax) {
            const resTax = await api.get(`/taxes/${idTax}?display=[rate]`);
            const xmlTax = parser.parseFromString(resTax.data, "application/xml");
            const rate = xmlTax.getElementsByTagName("rate")[0]?.textContent?.trim();
            if (rate) tauxTaxe = parseFloat(rate);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Taux de taxe par défaut: ${tauxTaxe}%`);
    }

    // ÉTAPE 3 : Calcul impact
    let priceImpact = '0.000000';
    if (prixTtcDeclinaison && prixTtcDeclinaison !== '') {
      const prixTtcFloat = parseFloat(prixTtcDeclinaison.toString().replace(',', '.'));
      
      if (!isNaN(prixTtcFloat) && prixTtcFloat > 0) {
        const prixHtDeclinaison = prixTtcFloat / (1 + tauxTaxe / 100);
        const impact = prixHtDeclinaison - prixBaseHt;
        priceImpact = parseFloat(impact.toFixed(6)).toFixed(6);
        
        // Éviter -0.000000
        if (Math.abs(parseFloat(priceImpact)) < 0.000001) {
          priceImpact = '0.000000';
        }
        
        console.log(`💰 Impact: TTC=${prixTtcFloat}, HT=${prixHtDeclinaison.toFixed(6)}, base=${prixBaseHt}, impact=${priceImpact}`);
      }
    }

    // ÉTAPE 4 : XML
    const xmlCombination = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <combination>
    <id_product><![CDATA[${idProduct}]]></id_product>
    <reference><![CDATA[${reference}_${idAttribute}]]></reference>
    <price><![CDATA[${priceImpact}]]></price>
    <default_on><![CDATA[0]]></default_on>
    <minimal_quantity><![CDATA[1]]></minimal_quantity>
    <associations>
      <product_option_values>
        <product_option_value>
          <id><![CDATA[${idAttribute}]]></id>
        </product_option_value>
      </product_option_values>
    </associations>
  </combination>
</prestashop>`;

    // ÉTAPE 5 : Envoi
    const response = await api.post('/combinations', xmlCombination, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });

    console.log('📥 Status:', response.status);
    console.log('📥 Réponse:', response.data);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "application/xml");
    
    // Chercher l'ID
    let newId = null;
    const combinations = xmlDoc.getElementsByTagName("combination");
    if (combinations.length > 0) {
      newId = combinations[0].getElementsByTagName("id")[0]?.textContent?.trim();
    }
    if (!newId) {
      const allIds = xmlDoc.getElementsByTagName("id");
      if (allIds.length > 0) newId = allIds[0].textContent?.trim();
    }

    if (!newId) throw new Error('ID non trouvé dans la réponse');

    console.log(`✅ Combinaison créée (ID: ${newId})`);
    registreRollback.push({ type: 'combination', id: newId });
    return newId;

  } catch (error) {
    console.error('❌ Échec création combinaison:', error);
    throw error;
  }
};

// 6. ÉTAPE 4 : Assigner le Stock (stock_available)
const mettreAJourStock = async (idProduct, idProductAttribute, quantite) => {
  // Récupérer l'ID du stock_available
  const filterAttr = idProductAttribute ? `&filter[id_product_attribute]=${idProductAttribute}` : '';
  const res = await api.get(`/stock_availables?filter[id_product]=${idProduct}${filterAttr}&display=[id]`);
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, "application/xml");
  const stocks = xmlDoc.getElementsByTagName("stock_available");
  
  if (stocks.length === 0) {
    throw new Error(`Stock non trouvé pour produit ${idProduct}`);
  }

  const idStockAvailable = stocks[0].getElementsByTagName("id")[0]?.textContent?.trim();

  // ✅ Utiliser updateResource (GET complet → Modifier quantity → PUT)
  await updateResource('stock_availables', idStockAvailable, {
    quantity: String(quantite)
  });
};

// Helper pour extraire l'ID du XML retourné
const extractIdFromXml = (xmlData) => {
  if (!xmlData) return null;
  if (typeof xmlData === 'string') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, "application/xml");
    return doc.getElementsByTagName("id")[0]?.textContent?.trim();
  }
  return null;
};

// 7. Fonction Principale
const lancerImportation = async () => {
  isImporting.value = true;
  statusMessage.value = "Importation des déclinaisons en cours...";

  const registreRollback = [];
  let transactionEnEchec = false;

  // Dans lancerImportation, la condition est maintenant correcte :
    for (let decl of declinaisonsTraitees.value) {
    if (transactionEnEchec) {
        decl.status = 'rolled_back';
        continue;
    }

    try {
        console.log(`🔍 Traitement: ref="${decl.reference}", spé="${decl.specificite}", kar="${decl.karazany}", stock=${decl.stock_initial}`);
        
        const idProduct = await obtenirIdProduit(decl.reference);
        decl.id_product = idProduct;

        // ✅ Vérifier si specificite ET karazany sont remplis (non vides)
        if (decl.specificite && decl.karazany && decl.specificite !== '' && decl.karazany !== '') {
        // CAS 1 : Produit AVEC déclinaisons
        console.log(`📦 AVEC déclinaison: ${decl.specificite}=${decl.karazany}`);
        
        // ÉTAPE 1 : Créer/Récupérer la Spécificité
        const idGroupe = await obtenirOuCreerGroupeAttribut(decl.specificite, registreRollback);
        decl.id_groupe = idGroupe;
        
        // ÉTAPE 2 : Créer/Récupérer le Karazany
        const idValeur = await obtenirOuCreerValeurAttribut(idGroupe, decl.karazany, registreRollback);
        decl.id_valeur = idValeur;
        
        // ÉTAPE 3 : Créer la Déclinaison
        const idCombination = await creerCombinaison(idProduct, idValeur, decl.reference,decl.prix_vente_ttc, registreRollback );
        decl.id_product_attribute = idCombination;
        
        
        // ÉTAPE 4 : Assigner le Stock
        await mettreAJourStock(idProduct, idCombination, decl.stock_initial);
        
        decl.status = 'success';
        
        } else {
        // CAS 2 : Produit SANS déclinaison
        console.log(`📦 SANS déclinaison: mise à jour stock direct`);
        await mettreAJourStock(idProduct, 0, decl.stock_initial);
        decl.id_product_attribute = 0;
        decl.status = 'success_simple';
        }

    } catch (err) {
        transactionEnEchec = true;
        decl.status = 'error';
        decl.erreur = err.message;
        console.error(`❌ Erreur pour ${decl.reference}:`, err);
    }
    }
  

  // ROLLBACK
  if (transactionEnEchec) {
    statusMessage.value = "❌ Échec détecté ! Rollback...";
    importSuccess.value = false;

    for (let i = registreRollback.length - 1; i >= 0; i--) {
      const item = registreRollback[i];
      try {
        const endpoints = {
          'combination': 'combinations',
          'product_option_value': 'product_option_values',
          'product_option': 'product_options'
        };
        await api.delete(`/${endpoints[item.type]}/${item.id}`);
        console.log(`🗑️ ${item.type} ${item.id} supprimé`);
      } catch (err) {
        console.warn(`⚠️ Rollback ${item.type} ${item.id}:`, err);
      }
    }
    statusMessage.value = "Transaction annulée.";
  } else {
    statusMessage.value = "✅ Importation réussie !";
    importSuccess.value = true;
  }

  isImporting.value = false;
};
</script>

<style scoped>


.bo-page { background: #0d1117; min-height: 100vh; margin-left: 240px; padding: 2rem; color: #e6edf3; }
.bo-page-header { margin-bottom: 2rem; }
.bo-page-header h1 { font-size: 1.4rem; font-weight: 700; color: #e6edf3; margin: 0 0 0.3rem; }
.bo-page-header p { color: #7d8590; margin: 0; font-size: 0.875rem; }

.import-section { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1.75rem; margin-bottom: 1.5rem; }
.section-title { font-size: 0.95rem; font-weight: 700; color: #e6edf3; margin: 0 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #21262d; }
.action-btn { padding: 0.6rem 1.5rem; background: #388bfd; border: none; border-radius: 7px; color: white; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; }
.action-btn:hover { background: #1f6feb; }
.action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.results-table { width: 100%; border-collapse: collapse; }
.results-table th { font-size: 0.72rem; color: #7d8590; text-transform: uppercase; letter-spacing: 0.06em; padding: 0 1rem 0.75rem; text-align: left; border-bottom: 1px solid #21262d; }
.results-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #21262d; font-size: 0.875rem; color: #e6edf3; }
.results-table tr:last-child td { border-bottom: none; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: rgba(63,185,80,0.12); color: #3fb950; }
.badge-error { background: rgba(248,81,73,0.12); color: #f85149; }
.spinner { width: 32px; height: 32px; border: 2px solid #30363d; border-top-color: #388bfd; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }

</style>