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
