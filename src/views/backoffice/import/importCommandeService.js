/**
 * Service d'importation des Commandes PrestaShop (Fichier 3)
 * Logique identique à ImportOrder.vue + gestion des erreurs CSV :
 *  1. Noms de colonnes non conformes
 *  2. Format de date différent de DD/MM/YYYY
 *  3. Montants négatifs (non applicable ici – pas de montant direct dans le CSV commande)
 */

import api from '../../../api/api';
import { updateResource } from '../../../api/schemaService';
import { useStockStore } from '../../../stores/stock/stockStore';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ID_COUNTRY_FRANCE = 8;
const ID_CURRENCY_EURO = 2;
const ID_LANG_FR = 2;

const DEFAULT_CONFIG = {
  CARRIER_ID: '1',
  PAYMENT_METHOD: 'paiement_livraison',
  PAYMENT_MODULE: 'ps_cashondelivery',
  CURRENCY_ID: '2', // Euro
  LANG_ID: '2', // Français
};


// ─── Colonnes attendues dans le fichier Commandes ────────────────────────────
const COLONNES_REQUISES_COMMANDES = ['date', 'nom', 'email', 'pwd', 'adresse', 'achat', 'etat'];

// ─── Helpers de validation ────────────────────────────────────────────────────

/**
 * Vérifie que toutes les colonnes attendues sont présentes.
 * @param {string[]} colonnesDetectees
 * @returns {string[]}
 */
export const validerColonnesCommandes = (colonnesDetectees) => {
  const erreurs = [];
  for (const col of COLONNES_REQUISES_COMMANDES) {
    if (!colonnesDetectees.includes(col)) {
      erreurs.push(`Colonne manquante ou non conforme : "${col}"`);
    }
  }
  return erreurs;
};

/**
 * Vérifie qu'une date est au format DD/MM/YYYY.
 * @param {string} dateStr
 * @returns {boolean}
 */
export const estDateValide = (dateStr) => {
  if (!dateStr) return true;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim());
};

export const convertirDateCsvEnSql = (dateStr) => {
  if (!dateStr) {
    throw new Error('Date CSV manquante');
  }

  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Format de date invalide : "${dateStr}" (attendu DD/MM/YYYY)`);
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day} 00:00:00`;
};

/**
 * Valide une ligne CSV commande.
 * @param {Object} row
 * @param {number} index
 * @returns {string[]}
 */
export const validerLigneCommande = (row, index) => {
  const erreurs = [];
  const ligne = `Ligne ${index + 1} (email: ${row.email || '?'})`;

  if (!estDateValide(row.date)) {
    erreurs.push(`${ligne} : date "${row.date}" invalide (attendu DD/MM/YYYY)`);
  }

  return erreurs;
};

/**
 * Point d'entrée : valide l'intégralité du CSV commandes.
 * @param {Object[]} rows
 */
export const validerCSVCommandes = (rows) => {
  if (!rows || rows.length === 0) throw new Error('Le fichier CSV Commandes est vide.');

  const colonnes = Object.keys(rows[0]);
  const erreursColonnes = validerColonnesCommandes(colonnes);
  if (erreursColonnes.length > 0) {
    throw new Error('Erreurs de colonnes :\n' + erreursColonnes.join('\n'));
  }

  const erreursLignes = [];
  rows.forEach((row, i) => {
    erreursLignes.push(...validerLigneCommande(row, i));
  });

  if (erreursLignes.length > 0) {
    throw new Error('Erreurs dans les données :\n' + erreursLignes.join('\n'));
  }
};

// ─── Préparation des données ──────────────────────────────────────────────────

export const preparerLigneCommande = (row) => ({
  date: row.date?.trim() || '',
  nom: row.nom?.trim() || '',
  email: row.email?.trim() || '',
  pwd: row.pwd?.trim() || '',
  adresse: row.adresse?.trim() || '',
  achat: row.achat?.trim() || '',
  etat: row.etat?.trim() || '',
  id_customer: null,
  id_address: null,
  id_cart: null,
  id_order: null,
  status: 'pending',
  erreur: '',
});

// ─── Logique métier (identique à ImportOrder.vue) ────────────────────────────

const cacheClients = {};
const cacheProduits = {};

export const parserAchat = (achatStr) => {
  const items = [];
  
  if (!achatStr || typeof achatStr !== 'string') {
    console.warn('⚠️ achatStr invalide:', achatStr);
    return items;
  }
  
  console.log('🔍 Parsing achat brut:', achatStr);
  
  try {
    // Étape 1: Supprimer les crochets extérieurs
    let clean = achatStr.replace(/^\s*\[|\]\s*$/g, '').trim();
    
    console.log('📝 Après suppression crochets:', clean);
    
    // Étape 2: Trouver tous les tuples (parenthèses)
    // Utiliser une regex qui gère les guillemets
    const regex = /\(([^)]+)\)/g;
    let match;
    
    while ((match = regex.exec(clean)) !== null) {
      let content = match[1]; // Contenu entre parenthèses
      
      console.log('🔍 Tuple trouvé:', content);
      
      // Étape 3: Nettoyer les guillemets (simples et doubles)
      content = content.replace(/"/g, '').trim();
      
      // Étape 4: Splitter par point-virgule
      const parts = content.split(';');
      
      console.log('📝 Parties après split:', parts);
      
      if (parts.length >= 2) {
        const reference = parts[0].trim();
        const quantite = parseInt(parts[1].trim()) || 1;
        const karazany = parts[2] ? parts[2].trim() : '';
        
        if (reference) {
          const item = {
            reference,
            quantite,
            karazany
          };
          
          console.log('✅ Item parsé:', item);
          items.push(item);
        }
      }
    }
    
    // Si aucun item trouvé, essayer un parsing alternatif
    if (items.length === 0) {
      console.warn('⚠️ Parsing standard échoué, tentative alternative...');
      
      // Remplacer les guillemets et essayer sans regex
      let altClean = achatStr.replace(/["\[\]]/g, '').trim();
      console.log('📝 Nettoyage alternatif:', altClean);
      
      // Chercher les motifs: reference;quantite;karazany
      const altRegex = /([A-Za-z0-9_]+);(\d+);?([^,)]*)/g;
      let altMatch;
      
      while ((altMatch = altRegex.exec(altClean)) !== null) {
        const item = {
          reference: altMatch[1].trim(),
          quantite: parseInt(altMatch[2]) || 1,
          karazany: altMatch[3] ? altMatch[3].trim() : ''
        };
        
        console.log('✅ Item alternatif parsé:', item);
        items.push(item);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur parsing achat:', error);
  }
  
  console.log(`📦 Total items parsés: ${items.length}`, items);
  return items;
};

export const calculerTotauxPanier = async (idCart) => {
  try {
    const response = await api.get(`/carts/${idCart}?output_format=XML&display=full`);

    const parser = new DOMParser();
    const cartDoc = parser.parseFromString(response.data, 'text/xml');

    let totalHT = parseFloat(
      cartDoc.querySelector('cart total_products')?.textContent?.trim() || '0'
    );

    let totalTTC = parseFloat(
      cartDoc.querySelector('cart total_products_wt')?.textContent?.trim() || '0'
    );

    // FALLBACK MANUEL
    if (totalTTC <= 0) {
      console.warn('⚠️ Totaux panier à 0, calcul manuel');

      const rows = cartDoc.querySelectorAll('cart_row');

      totalHT = 0;

      for (const row of rows) {
        const idProduct = row.querySelector('id_product')?.textContent?.trim();
        const quantity = parseInt(
          row.querySelector('quantity')?.textContent?.trim() || '1'
        );

        if (!idProduct) continue;

        const productRes = await api.get(
          `/products/${idProduct}?output_format=XML`
        );

        const productDoc = parser.parseFromString(
          productRes.data,
          'text/xml'
        );

        const price = parseFloat(
          productDoc.querySelector('product price')?.textContent?.trim() || '0'
        );

        totalHT += price * quantity;
      }

      totalTTC = totalHT;
    }

    return {
      totalHT,
      totalTTC,
    };
  } catch (error) {
    console.error('❌ Erreur calcul totaux panier:', error);

    return {
      totalHT: 0,
      totalTTC: 0,
    };
  }
};


export const obtenirIdProduit = async (reference) => {
  if (cacheProduits[reference]) return cacheProduits[reference];
  const res = await api.get(`/products?filter[reference]=[${encodeURIComponent(reference)}]&display=[id]`);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(res.data, 'application/xml');
  const products = xmlDoc.getElementsByTagName('product');
  if (products.length > 0) {
    const id = products[0].getElementsByTagName('id')[0]?.textContent?.trim();
    if (id) { cacheProduits[reference] = id; return id; }
  }
  throw new Error(`Produit "${reference}" introuvable.`);
};

export const obtenirIdDeclinaison = async (idProduct, karazany) => {
  if (!karazany) return 0;
  
  console.log(`🔍 Recherche déclinaison pour produit ${idProduct}, karazany: "${karazany}"`);
  
  try {
    // Méthode 1: Chercher la valeur d'attribut par son nom
    const valueRes = await api.get(
      `/product_option_values?filter[name]=[${encodeURIComponent(karazany)}]&display=[id]`
    );
    const parser = new DOMParser();
    const valueDoc = parser.parseFromString(valueRes.data, 'application/xml');
    const values = valueDoc.getElementsByTagName('product_option_value');
    
    if (values.length === 0) {
      console.warn(`⚠️ Valeur d'attribut "${karazany}" non trouvée`);
      return 0;
    }
    
    const valueId = values[0].getElementsByTagName('id')[0]?.textContent?.trim();
    console.log(`📝 Valeur d'attribut trouvée: ID ${valueId}`);
    
    // Chercher la combinaison qui utilise cette valeur
    const combRes = await api.get(
      `/combinations?filter[id_product]=${idProduct}&display=[id]`
    );
    const combDoc = parser.parseFromString(combRes.data, 'application/xml');
    const combinations = combDoc.getElementsByTagName('combination');
    
    console.log(`📊 ${combinations.length} combinaisons à vérifier`);
    
    for (let i = 0; i < combinations.length; i++) {
      const combId = combinations[i].getElementsByTagName('id')[0]?.textContent?.trim();
      
      // Récupérer les détails de la combinaison
      const combDetailRes = await api.get(`/combinations/${combId}?output_format=XML`);
      const combDetailDoc = parser.parseFromString(combDetailRes.data, 'text/xml');
      
      const assocValues = combDetailDoc.querySelectorAll('product_option_value id');
      
      for (let j = 0; j < assocValues.length; j++) {
        const assocValueId = assocValues[j].textContent?.trim();
        if (assocValueId === valueId) {
          console.log(`✅ Déclinaison trouvée: ID ${combId} (contient la valeur ${valueId})`);
          return combId;
        }
      }
    }
    
    console.warn(`⚠️ Aucune combinaison trouvée avec la valeur "${karazany}" (ID: ${valueId})`);
    return 0;
    
  } catch (e) {
    console.error('❌ Erreur recherche déclinaison:', e);
    return 0;
  }
};

// Dans votre fichier d'import
export const obtenirOuCreerClient = async (nom, email, pwd, registreRollback) => {
  if (cacheClients[email]) return cacheClients[email];
  
  try {
    const res = await api.get(`/customers?filter[email]=${encodeURIComponent(email)}&display=[id]`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(res.data, 'application/xml');
    const customers = xmlDoc.getElementsByTagName('customer');
    if (customers.length > 0) {
      const id = customers[0].getElementsByTagName('id')[0]?.textContent?.trim();
      if (id) { cacheClients[email] = id; return id; }
    }
  } catch (e) {
    console.warn(`⚠️ Recherche client:`, e);
  }
  
  try {
    // Extraire prénom et nom de la chaîne "nom"
    const nomParts = nom.split(' ');
    const firstname = nomParts[0] || 'Client';
    const lastname = nomParts.slice(1).join(' ') || nom;
    
    const xmlCustomer = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer>
    <active><![CDATA[1]]></active>
    <id_default_group><![CDATA[3]]></id_default_group>
    <id_lang><![CDATA[${ID_LANG_FR}]]></id_lang>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <email><![CDATA[${email}]]></email>
    <passwd><![CDATA[${pwd}]]></passwd>
  </customer>
</prestashop>`;
    
    const response = await api.post('/customers', xmlCustomer, { 
      headers: { 'Content-Type': 'application/xml; charset=utf-8' } 
    });
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    
    if (!newId) throw new Error('ID client non trouvé');
    
    cacheClients[email] = newId;
    registreRollback.push({ type: 'customer', id: newId });
    return newId;
  } catch (error) {
    console.error(`❌ Échec création client:`, error);
    throw error;
  }
};

export const creerAdresse = async (idCustomer, nom, adresse, registreRollback) => {
  try {
    // Extraire prénom et nom
    const nomParts = nom.split(' ');
    const firstname = nomParts[0] || 'Client';
    const lastname = nomParts.slice(1).join(' ') || nom;
    
    const xmlAddress = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_country><![CDATA[${ID_COUNTRY_FRANCE}]]></id_country>
    <alias><![CDATA[Import CSV]]></alias>
    <lastname><![CDATA[${lastname}]]></lastname>
    <firstname><![CDATA[${firstname}]]></firstname>
    <address1><![CDATA[${adresse}]]></address1>
    <city><![CDATA[Paris]]></city>
    <postcode><![CDATA[75001]]></postcode>
    <phone><![CDATA[0600000000]]></phone>
    <phone_mobile><![CDATA[0600000000]]></phone_mobile>
  </address>
</prestashop>`;
    
    const response = await api.post('/addresses', xmlAddress, { 
      headers: { 'Content-Type': 'application/xml; charset=utf-8' } 
    });
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    
    if (!newId) throw new Error('ID adresse non trouvé');
    
    registreRollback.push({ type: 'address', id: newId });
    return newId;
  } catch (error) {
    console.error('❌ Échec création adresse:', error);
    throw error;
  }
};

export const creerPanier = async (idCustomer, idAddress, items, registreRollback, dateCsv = '') => {
  try {
    let cartRowsXml = '';
    
    for (const item of items) {
      const idProduct = await obtenirIdProduit(item.reference);
      const idProductAttribute = await obtenirIdDeclinaison(idProduct, item.karazany);
      
      cartRowsXml += `
    <cart_row>
      <id_product><![CDATA[${idProduct}]]></id_product>
      <id_product_attribute><![CDATA[${idProductAttribute || '0'}]]></id_product_attribute>
      <id_address_delivery><![CDATA[${idAddress}]]></id_address_delivery>
      <quantity><![CDATA[${item.quantite}]]></quantity>
    </cart_row>`;
    }
    
    const dateSql = convertirDateCsvEnSql(dateCsv);
    console.log(`🛒 Création panier | Date CSV: "${dateCsv}" → Date SQL: "${dateSql}"`);
    
    const xmlCart = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[1]]></id_carrier>
    <id_address_delivery><![CDATA[${idAddress}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddress}]]></id_address_invoice>
    <id_currency><![CDATA[${ID_CURRENCY_EURO}]]></id_currency>
    <date_add><![CDATA[${dateSql}]]></date_add>
    <date_upd><![CDATA[${dateSql}]]></date_upd>
    <id_lang><![CDATA[${ID_LANG_FR}]]></id_lang>
    <associations>
      <cart_rows>${cartRowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`;
    
    const response = await api.post('/carts', xmlCart, { 
      headers: { 'Content-Type': 'application/xml; charset=utf-8' } 
    });
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'application/xml');
    const newId = xmlDoc.getElementsByTagName('id')[0]?.textContent?.trim();
    
    if (!newId) throw new Error('ID panier non trouvé');
    
    registreRollback.push({ type: 'cart', id: newId });
    return newId;
  } catch (error) {
    console.error('❌ Échec création panier:', error);
    throw error;
  }
};

export const creerCommande = async (idCart, idCustomer, idAddress, items, registreRollback, dateCsv = '') => {
  try {
    console.log(`📦 Préparation commande | Cart: ${idCart}`);

    // Récupérer la secure key AVANT l'attente
    const secureKey = await obtenirSecureKey(idCustomer);
    console.log(`🔑 Secure key récupérée`);

    // Attendre le traitement PrestaShop
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Récupérer les totaux du panier
    const cartResponse = await api.get(`/carts/${idCart}?output_format=XML&display=full`);
    const parser = new DOMParser();
    const cartDoc = parser.parseFromString(cartResponse.data, 'text/xml');

    let totalProductsWt = parseFloat(
      cartDoc.querySelector('cart total_products_wt')?.textContent?.trim() || '0'
    );
    let totalProducts = parseFloat(
      cartDoc.querySelector('cart total_products')?.textContent?.trim() || '0'
    );
    let conversionRate = parseFloat(
      cartDoc.querySelector('cart conversion_rate')?.textContent?.trim() || '1'
    );

    console.log(`💰 Totaux panier - TTC: ${totalProductsWt}, HT: ${totalProducts}`);

    // Fallback si totaux à 0
    if (totalProductsWt <= 0 || totalProducts <= 0) {
      console.warn('⚠️ Totaux à 0 → calcul manuel avec taxes depuis API');
      
      let totalHT = 0;
      let totalTTC = 0;
      
      for (const item of items) {
        console.log(`\n🔍 Calcul prix: ${item.reference} x${item.quantite} ${item.karazany ? '(' + item.karazany + ')' : ''}`);
        
        try {
          const idProduct = await obtenirIdProduit(item.reference);
          let priceHT = 0;
          let taxRate = 20; // Taxe par défaut 20%
          let priceSource = '';
          
          // ============================================
          // ÉTAPE 1: RÉCUPÉRER LE TAUX DE TAXE DU PRODUIT
          // (Comme dans le checkout)
          // ============================================
          try {
            const productRes = await api.get(`/products/${idProduct}?output_format=XML`);
            const productDoc = parser.parseFromString(productRes.data, 'text/xml');
            
            // Récupérer l'ID du groupe de règles de taxe
            const idTaxRulesGroup = productDoc.querySelector('product id_tax_rules_group')?.textContent?.trim();
            
            if (idTaxRulesGroup && idTaxRulesGroup !== '0') {
              console.log(`   📋 Groupe de taxe ID: ${idTaxRulesGroup}`);
              
              // Récupérer les règles de taxe pour ce groupe
              const taxRulesRes = await api.get(
                `/tax_rules?filter[id_tax_rules_group]=${idTaxRulesGroup}&display=[id_tax]`
              );
              const taxRulesDoc = parser.parseFromString(taxRulesRes.data, 'text/xml');
              const taxRules = taxRulesDoc.getElementsByTagName('tax_rule');
              
              if (taxRules.length > 0) {
                const idTax = taxRules[0].querySelector('id_tax')?.textContent?.trim();
                
                if (idTax) {
                  // Récupérer le taux de taxe
                  const taxRes = await api.get(`/taxes/${idTax}?output_format=XML`);
                  const taxDoc = parser.parseFromString(taxRes.data, 'text/xml');
                  const rate = parseFloat(taxDoc.querySelector('tax rate')?.textContent?.trim() || '20');
                  
                  if (rate > 0) {
                    taxRate = rate;
                    console.log(`   ✅ Taux de taxe trouvé: ${taxRate}%`);
                  }
                }
              }
            } else {
              console.warn(`   ⚠️ Aucun groupe de taxe configuré, utilisation du taux par défaut: ${taxRate}%`);
            }
          } catch (e) {
            console.warn(`   ⚠️ Erreur récupération taxe: ${e.message}, utilisation taux par défaut: ${taxRate}%`);
          }
          
          // ============================================
          // ÉTAPE 2: RÉCUPÉRER LE PRIX HT
          // ============================================
          
          // 2a. Chercher d'abord le prix de la déclinaison
          if (item.karazany) {
            const idAttribute = await obtenirIdDeclinaison(idProduct, item.karazany);
            console.log(`   ID déclinaison trouvé: ${idAttribute}`);
            
            if (idAttribute && idAttribute !== 0 && idAttribute !== '0') {
              try {
                const combRes = await api.get(`/combinations/${idAttribute}?output_format=XML`);
                const combDoc = parser.parseFromString(combRes.data, 'text/xml');
                const combPriceImpact = parseFloat(
                  combDoc.querySelector('combination price')?.textContent?.trim() || '0'
                );
                
                console.log(`   Impact prix déclinaison: ${combPriceImpact}€`);
                
                // Récupérer le prix de base du produit
                const productRes = await api.get(`/products/${idProduct}?output_format=XML`);
                const productDoc = parser.parseFromString(productRes.data, 'text/xml');
                const basePrice = parseFloat(
                  productDoc.querySelector('product price')?.textContent?.trim() || '0'
                );
                
                console.log(`   Prix de base produit: ${basePrice}€`);
                
                // Prix HT = prix de base + impact
                priceHT = basePrice + combPriceImpact;
                priceSource = `déclinaison (base: ${basePrice}€ + impact: ${combPriceImpact}€)`;
                
                console.log(`   ✅ Prix HT calculé: ${priceHT}€`);
              } catch (e) {
                console.warn(`   ⚠️ Erreur prix déclinaison:`, e.message);
              }
            } else {
              console.warn(`   ⚠️ Déclinaison non trouvée pour "${item.karazany}"`);
            }
          }
          
          // 2b. Si pas de prix de déclinaison, prendre le prix du produit de base
          if (priceHT <= 0) {
            const productRes = await api.get(`/products/${idProduct}?output_format=XML`);
            const productDoc = parser.parseFromString(productRes.data, 'text/xml');
            priceHT = parseFloat(
              productDoc.querySelector('product price')?.textContent?.trim() || '0'
            );
            priceSource = 'produit de base';
            console.log(`   Prix HT produit de base: ${priceHT}€`);
          }
          
          // 2c. Si toujours 0, erreur critique
          if (priceHT <= 0) {
            console.error(`   ❌❌❌ PRIX HT À 0 pour ${item.reference} - Vérifiez PrestaShop!`);
            continue;
          }
          
          // ============================================
          // ÉTAPE 3: CALCULER LE PRIX TTC AVEC LA TAXE
          // ============================================
          const priceTTC = priceHT * (1 + taxRate / 100);
          
          const subtotalHT = priceHT * item.quantite;
          const subtotalTTC = priceTTC * item.quantite;
          
          totalHT += subtotalHT;
          totalTTC += subtotalTTC;
          
          console.log(`   💰 Détail calcul:`);
          console.log(`      - Prix unitaire HT: ${priceHT.toFixed(6)}€`);
          console.log(`      - Taux de taxe: ${taxRate}%`);
          console.log(`      - Prix unitaire TTC: ${priceTTC.toFixed(6)}€`);
          console.log(`      - Sous-total HT: ${subtotalHT.toFixed(6)}€`);
          console.log(`      - Sous-total TTC: ${subtotalTTC.toFixed(6)}€`);
          console.log(`   📍 Source: ${priceSource}`);
          
        } catch (e) {
          console.error(`   ❌ Erreur calcul pour ${item.reference}:`, e.message);
        }
      }
      
      console.log(`\n💰 TOTAUX CALCULÉS AVEC TAXES:`);
      console.log(`   Total HT: ${totalHT.toFixed(6)}€`);
      console.log(`   Total TTC: ${totalTTC.toFixed(6)}€`);
      console.log(`   TVA: ${(totalTTC - totalHT).toFixed(6)}€`);
      
      // Vérification finale
      if (totalHT <= 0 || totalTTC <= 0) {
        throw new Error('Impossible de calculer les totaux : tous les produits ont un prix à 0€');
      }
      
      totalProducts = totalHT;
      totalProductsWt = totalTTC;
    }

    // Formater les totaux
    const formattedHT = totalProducts.toFixed(6);
    const formattedTTC = totalProductsWt.toFixed(6);
    const dateSql = convertirDateCsvEnSql(dateCsv);

    console.log(`💰 Totaux finaux:`);
    console.log(`   HT (total_products): ${formattedHT}€`);
    console.log(`   TTC (total_products_wt): ${formattedTTC}€`);
    console.log(`   Date SQL: ${dateSql}`);

    // XML de commande
    const orderXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery><![CDATA[${idAddress}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddress}]]></id_address_invoice>
    <id_cart><![CDATA[${idCart}]]></id_cart>
    <id_currency><![CDATA[${ID_CURRENCY_EURO}]]></id_currency>
    <id_lang><![CDATA[${ID_LANG_FR}]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[1]]></id_carrier>
    <current_state><![CDATA[2]]></current_state>
    <module>${DEFAULT_CONFIG.PAYMENT_MODULE}</module>
    <payment>${DEFAULT_CONFIG.PAYMENT_METHOD}</payment>
    <conversion_rate><![CDATA[1.000000]]></conversion_rate>
    <total_discounts><![CDATA[0.000000]]></total_discounts>
    <total_discounts_tax_incl><![CDATA[0.000000]]></total_discounts_tax_incl>
    <total_discounts_tax_excl><![CDATA[0.000000]]></total_discounts_tax_excl>
    <total_paid><![CDATA[${formattedTTC}]]></total_paid>
    <total_paid_tax_incl><![CDATA[${formattedTTC}]]></total_paid_tax_incl>
    <total_paid_tax_excl><![CDATA[${formattedHT}]]></total_paid_tax_excl>
    <total_paid_real><![CDATA[${formattedTTC}]]></total_paid_real>
    <total_products><![CDATA[${formattedHT}]]></total_products>
    <total_products_wt><![CDATA[${formattedTTC}]]></total_products_wt>
    <total_shipping><![CDATA[0.000000]]></total_shipping>
    <total_shipping_tax_incl><![CDATA[0.000000]]></total_shipping_tax_incl>
    <total_shipping_tax_excl><![CDATA[0.000000]]></total_shipping_tax_excl>
    <carrier_tax_rate><![CDATA[0.000]]></carrier_tax_rate>
    <date_add><![CDATA[${dateSql}]]></date_add>
    <date_upd><![CDATA[${dateSql}]]></date_upd>
    <invoice_date><![CDATA[${dateSql}]]></invoice_date>
    <delivery_date><![CDATA[${dateSql}]]></delivery_date>
    <secure_key><![CDATA[${secureKey}]]></secure_key>
    <valid><![CDATA[1]]></valid>
  </order>
</prestashop>`;

    console.log('📤 Envoi de la commande à PrestaShop...');
    
    const response = await api.post('/orders?output_format=XML', orderXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'application/xml'
      }
    });

    const orderDoc = parser.parseFromString(response.data, 'text/xml');
    let orderId = orderDoc.querySelector('order id')?.textContent?.trim();
    if (!orderId) {
      orderId = orderDoc.querySelector('id')?.textContent?.trim();
    }

    if (!orderId) {
      console.error('Réponse API:', response.data);
      throw new Error('ID commande introuvable dans la réponse');
    }

    console.log(`✅ Commande créée avec succès : #${orderId}`);
    console.log(`   Total HT: ${formattedHT}€`);
    console.log(`   Total TTC: ${formattedTTC}€`);

    registreRollback.push({ type: 'order', id: orderId });

    return {
      id: orderId,
      total: formattedTTC,
      totalHT: formattedHT,
      success: true
    };

  } catch (error) {
    console.error('❌ Échec création commande:', error.response?.data || error);
    throw error;
  }
};

export const creerPaiement = async (idOrder, montantTtc) => {
  try {
    const xmlPayment = `<?xml version="1.0" encoding="UTF-8"?>\n<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">\n  <order_payment>\n    <order_reference><![CDATA[${idOrder}]]></order_reference>\n    <id_currency><![CDATA[${ID_CURRENCY_EURO}]]></id_currency>\n    <amount><![CDATA[${montantTtc}]]></amount>\n    <payment_method><![CDATA[Import CSV]]></payment_method>\n  </order_payment>\n</prestashop>`;
    const response = await api.post('/order_payments', xmlPayment, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
    return response.data;
  } catch (error) {
    console.error('❌ Échec création paiement:', error);
  }
};

export const decrementerStocks = async (items) => {
  for (const item of items) {
    try {
      const idProduct = await obtenirIdProduit(item.reference);
      const idProductAttribute = await obtenirIdDeclinaison(idProduct, item.karazany);
      const filterAttr = idProductAttribute ? `&filter[id_product_attribute]=${idProductAttribute}` : '&filter[id_product_attribute]=0';
      const res = await api.get(`/stock_availables?filter[id_product]=${idProduct}${filterAttr}&display=[id,quantity]`);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(res.data, 'application/xml');
      const stocks = xmlDoc.getElementsByTagName('stock_available');
      if (stocks.length > 0) {
        const idStock = stocks[0].getElementsByTagName('id')[0]?.textContent?.trim();
        const qtyActuelle = parseInt(stocks[0].getElementsByTagName('quantity')[0]?.textContent?.trim() || '0');
        const nouvelleQty = Math.max(0, qtyActuelle - item.quantite);
        await updateResource('stock_availables', idStock, { quantity: String(nouvelleQty) });
      }
    } catch (error) {
      console.warn(`⚠️ Erreur décrémentation stock pour ${item.reference}:`, error);
    }
  }
};

export const enregistrerMouvementsStocks = async (items, employeeId = 1) => {
  const stockStore = useStockStore();

  if (stockStore.stocks.length === 0) {
    await stockStore.fetchAll();
  }

  for (const item of items) {
    try {
      const idProduct = await obtenirIdProduit(item.reference);
      const idProductAttribute = await obtenirIdDeclinaison(idProduct, item.karazany);
      const stock = await stockStore.getStockForProduct(
        idProduct,
        String(idProductAttribute || '0')
      );

      if (!stock) {
        console.warn(`⚠️ Stock introuvable pour ${item.reference}`);
        continue;
      }

      const oldQuantity = stock.quantity;
      const newQuantity = Math.max(0, oldQuantity - item.quantite);

      if (newQuantity === oldQuantity) {
        continue;
      }

      await stockStore.createStockMovement({
        stock,
        oldQuantity,
        newQuantity,
        employeeId,
      });

      stock.quantity = newQuantity;
    } catch (error) {
      console.warn(`⚠️ Erreur création mouvement stock pour ${item.reference}:`, error);
    }
  }
};

export const obtenirSecureKey = async (customerId) => {
  try {
    const response = await api.get(`/customers/${customerId}?output_format=XML`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const secureKey = xmlDoc.querySelector('customer secure_key')?.textContent?.trim();
    return secureKey || '00000000000000000000000000000000';
  } catch (error) {
    console.warn('⚠️ Secure key non trouvée, utilisation fallback');
    return '00000000000000000000000000000000';
  }
};

/**
 * Lance l'importation des commandes.
 * @param {Object[]} commandesTraitees
 * @param {Function} [onProgress]
 * @returns {{ success: boolean, message: string }}
 */
export const importerCommandes = async (commandesTraitees, onProgress) => {
  const registreRollback = [];
  let transactionEnEchec = false;

  for (let cmd of commandesTraitees) {
    if (transactionEnEchec) { 
      cmd.status = 'rolled_back'; 
      continue; 
    }
    
    try {
      const items = parserAchat(cmd.achat);
      
      const idCustomer = await obtenirOuCreerClient(cmd.nom, cmd.email, cmd.pwd, registreRollback);
      cmd.id_customer = idCustomer;
      
      const idAddress = await creerAdresse(idCustomer, cmd.nom, cmd.adresse, registreRollback);
      cmd.id_address = idAddress;
      
      console.log(`\n📋 Traitement commande CSV avec date: "${cmd.date}"`);
      
      const idCart = await creerPanier(idCustomer, idAddress, items, registreRollback, cmd.date);
      cmd.id_cart = idCart;
      console.log(`   ✅ Panier créé (#${idCart}) avec la date du CSV`);
      
      if (cmd.etat && cmd.etat.toLowerCase().includes('paiement accepté')) {
        // Passage de `items` pour le calcul fallback
        const orderResult = await creerCommande(idCart, idCustomer, idAddress, items, registreRollback, cmd.date);
        cmd.id_order = orderResult.id;
        console.log(`   ✅ Commande créée (#${cmd.id_order}) avec la date du CSV`);

        await enregistrerMouvementsStocks(items, 1);
      }
      
      cmd.status = 'success';
    } catch (err) {
      transactionEnEchec = true;
      cmd.status = 'error';
      cmd.erreur = err.message;
      console.error(`❌ Erreur pour ${cmd.nom}:`, err);
    }
    
    if (onProgress) onProgress(cmd);
  }

  // Rollback en cas d'échec
  if (transactionEnEchec) {
    const endpoints = { 
      order: 'orders', 
      cart: 'carts', 
      address: 'addresses', 
      customer: 'customers' 
    };
    
    for (let i = registreRollback.length - 1; i >= 0; i--) {
      const item = registreRollback[i];
      try { 
        await api.delete(`/${endpoints[item.type]}/${item.id}`); 
      } catch (err) { 
        console.warn(`⚠️ Rollback ${item.type} ${item.id}:`, err); 
      }
    }
    
    return { 
      success: false, 
      message: 'Transaction annulée.' 
    };
  }
  
  return { 
    success: true, 
    message: '✅ Importation des commandes réussie !' 
  };
};
