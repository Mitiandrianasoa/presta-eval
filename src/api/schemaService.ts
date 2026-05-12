import api from './api';
import { XMLParser } from 'fast-xml-parser';

export interface FieldDefinition {
  name: string;
  required: boolean;
  format: string;
  isMultilingual: boolean;
  readOnly: boolean;
}

export interface SchemaResult {
  entityName: string;
  fields: FieldDefinition[];
}

export interface ResourceDefinition {
  endpoint: string;
  description: string;
}

/**
 * Récupère la liste de toutes les ressources disponibles depuis l'API PrestaShop
 */
export const fetchResources = async (): Promise<ResourceDefinition[]> => {
  try {
    const response = await api.get(`/`);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });
    
    const parsed = parser.parse(response.data);
    const apiNode = parsed.prestashop?.api;
    if (!apiNode) return [];

    const resources: ResourceDefinition[] = [];
    
    for (const [key, value] of Object.entries(apiNode)) {
      if (!key.startsWith('@_')) {
        let desc = key;
        const valObj = value as any;
        if (typeof valObj === 'object' && valObj !== null && valObj.description) {
          desc = valObj.description['#text'] || valObj.description || key;
        }
        resources.push({
          endpoint: key,
          description: desc
        });
      }
    }
    
    // Trier par ordre alphabétique
    return resources.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
  } catch (error) {
    console.error('Erreur lors de la récupération des ressources:', error);
    return [];
  }
};

/**
 * Récupère le schéma (synopsis) d'une entité spécifique depuis l'API PrestaShop
 */
export const fetchSchema = async (endpoint: string): Promise<SchemaResult> => {
  try {
    const response = await api.get(`/${endpoint}?schema=synopsis`);
    const xmlData = response.data;
    
    return parseSchema(xmlData);
  } catch (error) {
    console.error(`Erreur lors de la récupération du schéma pour ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Analyse le XML du synopsis PrestaShop pour extraire les règles de chaque champ
 */
export const parseSchema = (xmlSchema: string): SchemaResult => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  
  const parsed = parser.parse(xmlSchema);
  
  const prestashopNode = parsed.prestashop;
  if (!prestashopNode) {
      throw new Error("Format XML PrestaShop invalide (balise <prestashop> introuvable)");
  }

  // Trouver le noeud de l'entité (ex: 'category')
  const entityKey = Object.keys(prestashopNode).find(key => !key.startsWith('@_'));
  
  if (!entityKey) {
      throw new Error("Entité introuvable dans le schéma XML");
  }

  const entityFields = prestashopNode[entityKey];
  const fields: FieldDefinition[] = [];

  for (const [fieldName, fieldData] of Object.entries(entityFields)) {
    if (fieldName.startsWith('@_') || fieldName === 'associations') {
        continue;
    }

    const data = typeof fieldData === 'object' && fieldData !== null ? fieldData : {};
    const readOnly = data['@_readOnly'] === 'true' || data['@_read_only'] === 'true';

    fields.push({
      name: fieldName,
      required: data['@_required'] === 'true',
      format: data['@_format'] || 'string',
      isMultilingual: data['language'] !== undefined,
      readOnly: readOnly
    });
  }

  return {
    entityName: entityKey,
    fields: fields
  };
};

/**
 * Échappe les caractères spéciaux XML
 */
const escapeXml = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Met à jour une ressource en récupérant le XML complet, le modifiant, puis l'envoyant au serveur
 * APPROCHE: GET XML complet → Parser → Modifier → Sérialiser → PUT
 * 
 * @param endpoint - L'endpoint (ex: 'orders')
 * @param id - L'ID de la ressource
 * @param data - Les données à mettre à jour (ex: {current_state: '2'})
 */
export const updateResource = async (
  endpoint: string,
  id: string,
  data: Record<string, any>
): Promise<any> => {
  try {
    // 1. Validation
    if (!id || id.trim() === '') {
      throw new Error('❌ ID manquant!');
    }
    
    // Filtrer les champs vides
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    
    if (Object.keys(cleanData).length === 0) {
      throw new Error('❌ Aucun champ à mettre à jour!');
    }
    
    console.log(`🔄 [updateResource] Mise à jour ${endpoint}/${id}`);
    console.log(`1️⃣  Récupération du XML complet...`);
    
    // 2. RÉCUPÉRER le XML complet
    const getResponse = await api.get(`/${endpoint}/${id}?output_format=XML`);
    console.log('✅ XML reçu du serveur');
    console.log('📄 XML avant modification:', getResponse.data);
    
    // 3. PARSER le XML avec DOMParser (navigateur)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(getResponse.data, 'text/xml');
    
    // Lire le vrai nom de la balise directement depuis le XML (fiable, pas de singularisation manuelle)
    const prestashopEl = xmlDoc.querySelector('prestashop');
    const entityElement = prestashopEl?.firstElementChild ?? null;
    const entityName = entityElement?.tagName ?? endpoint;
    
    if (!entityElement) {
      throw new Error(`❌ Aucun élément enfant trouvé dans <prestashop> (XML de ${endpoint})`);
    }
    
    // 4. MODIFIER les champs
    console.log(`2️⃣  Modification des champs:`, cleanData);
    for (const [key, value] of Object.entries(cleanData)) {
      let fieldElement = entityElement.querySelector(key);
      
      if (!fieldElement) {
        console.log(`    ➕ Création du champ <${key}>`);
        fieldElement = xmlDoc.createElement(key);
        entityElement.appendChild(fieldElement);
      }
      
      const oldValue = fieldElement.textContent;
      fieldElement.textContent = String(value);
      console.log(`    ✏️  <${key}> "${oldValue}" → "${value}"`);
    }
    
    // 5. SÉRIALISER le XML modifié
    const serializer = new XMLSerializer();
    const modifiedXml = serializer.serializeToString(xmlDoc);
    
    console.log('📄 XML après modification:', modifiedXml);
    console.log(`3️⃣  Envoi du PUT vers /${endpoint}/${id}?output_format=JSON`);
    
    // 6. ENVOYER le PUT avec le XML complet
    const putResponse = await api.put(
      `/${endpoint}/${id}?output_format=JSON`,
      modifiedXml,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`✅ ${endpoint}/${id} mise à jour avec succès!`);
    console.log(`   Status: ${putResponse.status}`);
    console.log(`   Réponse:`, putResponse.data);
    
    return putResponse.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour ${endpoint}/${id}:`, error.message);
    console.error('❌ Response data:', error.response?.data);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ StatusText:', error.response?.statusText);
    throw error;
  }
};

/**
 * Crée une nouvelle ressource avec validation
 * APPROCHE: GET ?schema=blank → GET ?schema=synopsis → Valider → Remplir XML → POST
 * 
 * @param endpoint - L'endpoint (ex: 'customers', 'orders', 'products')
 * @param data - Les données de la nouvelle ressource
 * @returns Les données de la ressource créée (avec ID assigné)
 */
export const createResourceWithBlankSchema = async (
  endpoint: string,
  data: Record<string, any>
): Promise<any> => {
  try {
    // 1. FILTRER les données vides
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    
    if (Object.keys(cleanData).length === 0) {
      throw new Error('❌ Aucun champ fourni pour la création!');
    }
    
    console.log(`🆕 [createResourceWithBlankSchema] Création de ${endpoint}`);
    console.log(`📦 Données fournies:`, cleanData);
    
    // 2. RÉCUPÉRER le schema blank (structure XML vierge)
    console.log(`1️⃣  Récupération du schema blank...`);
    const blankResponse = await api.get(`/${endpoint}?schema=blank`);
    const blankXmlStr = blankResponse.data;
    console.log('✅ Schema blank reçu');
    console.log('📄 Structure vierge:', blankXmlStr);
    
    // 3. PARSER le schema blank
    const parser = new DOMParser();
    const blankXmlDoc = parser.parseFromString(blankXmlStr, 'text/xml');
    
    // Lire le vrai nom de la balise directement depuis le XML (évite les singularisations incorrectes)
    // ex: 'addresses' → <address>, 'categories' → <category>, 'carts' → <cart>
    const prestashopEl = blankXmlDoc.querySelector('prestashop');
    const entityElement = prestashopEl?.firstElementChild ?? null;
    const entityName = entityElement?.tagName ?? endpoint;
    
    if (!entityElement) {
      throw new Error(`❌ Aucun élément enfant trouvé dans <prestashop> (schema blank de ${endpoint})`);
    }
    
    console.log(`✅ XML vierge parsé avec élément <${entityName}>`);
    
    // 4. RÉCUPÉRER et PARSER le schema synopsis (règles de validation)
    console.log(`2️⃣  Récupération du schema synopsis pour validation...`);
    const synopsisResult = await fetchSchema(endpoint);
    console.log(`✅ Schema synopsis reçu: ${synopsisResult.fields.length} champs détectés`);
    
    // 5. VALIDER les données contre le schema
    console.log(`3️⃣  Validation des données...`);
    const errors: string[] = [];
    
    for (const field of synopsisResult.fields) {
      // Vérifier les champs obligatoires
      if (field.required && field.name !== 'id') {
        const fieldValue = cleanData[field.name];
        if (!fieldValue || fieldValue.toString().trim() === '') {
          errors.push(`❌ Champ obligatoire manquant: ${field.name} (format: ${field.format})`);
        } else {
          console.log(`   ✓ ${field.name} = "${fieldValue}" (required: true, format: ${field.format})`);
        }
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️  Validation échouée:`, errors);
      throw new Error(`Erreurs de validation:\n${errors.join('\n')}`);
    }
    
    console.log(`✅ Validation réussie!`);
    
    // 6. REMPLIR le XML blank avec les données fournies
    console.log(`4️⃣  Remplissage du XML blank...`);
    for (const [key, value] of Object.entries(cleanData)) {
      let fieldElement = entityElement.querySelector(key);
      
      if (fieldElement) {
        // Le champ existe dans le schema blank
        const oldValue = fieldElement.textContent;
        fieldElement.textContent = String(value);
        console.log(`   ✏️  <${key}> "${oldValue}" → "${value}"`);
      } else {
        // Le champ n'existe pas dans le schema blank, le créer
        fieldElement = blankXmlDoc.createElement(key);
        fieldElement.textContent = String(value);
        entityElement.appendChild(fieldElement);
        console.log(`   ➕ <${key}> = "${value}" (créé - NON DANS LE SCHEMA)`);
      }
    }
    
    // 7. SÉRIALISER le XML rempli
    const serializer = new XMLSerializer();
    const filledXml = serializer.serializeToString(blankXmlDoc);
    
    console.log('📄 XML final prêt à envoyer:', filledXml);
    console.log(`5️⃣  Envoi du POST vers /${endpoint}?output_format=JSON`);
    
    // 8. ENVOYER le POST
    const postResponse = await api.post(
      `/${endpoint}?output_format=JSON`,
      filledXml,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`✅ ${endpoint} créée avec succès!`);
    console.log(`   Status: ${postResponse.status}`);
    console.log(`   ID assigné:`, postResponse.data?.id || '?');
    console.log(`   Réponse complète:`, postResponse.data);
    
    return postResponse.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur création ${endpoint}:`, error.message);
    console.error('❌ Response data:', error.response?.data);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ StatusText:', error.response?.statusText);
    throw error;
  }
};
