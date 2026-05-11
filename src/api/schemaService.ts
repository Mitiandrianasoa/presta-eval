import api from './api';
import { XMLParser } from 'fast-xml-parser';

export interface FieldDefinition {
  name: string;
  required: boolean;
  format: string;
  isMultilingual: boolean;
  readOnly: boolean;
}

/**
 * Récupère le schéma (synopsis) d'une entité spécifique depuis l'API PrestaShop
 * @param endpoint Le point de terminaison de l'API (ex: 'categories', 'products')
 * @returns Un tableau de définitions de champs (FieldDefinition)
 */
export const fetchSchema = async (endpoint: string): Promise<FieldDefinition[]> => {
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
 * @param xmlSchema La chaîne XML retournée par PrestaShop
 * @returns Un tableau de FieldDefinition
 */
export const parseSchema = (xmlSchema: string): FieldDefinition[] => {
  // Configuration du parseur pour conserver les attributs (comme required="true")
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  
  const parsed = parser.parse(xmlSchema);
  
  const prestashopNode = parsed.prestashop;
  if (!prestashopNode) {
      throw new Error("Format XML PrestaShop invalide (balise <prestashop> introuvable)");
  }

  // Trouver le noeud de l'entité (ex: 'category' dans <prestashop><category>...)
  // On ignore les clés qui commencent par '@_' (qui sont les attributs de <prestashop>)
  const entityKey = Object.keys(prestashopNode).find(key => !key.startsWith('@_'));
  
  if (!entityKey) {
      throw new Error("Entité introuvable dans le schéma XML");
  }

  const entityFields = prestashopNode[entityKey];
  const schema: FieldDefinition[] = [];

  // Parcourir chaque champ défini dans l'entité
  for (const [fieldName, fieldData] of Object.entries(entityFields)) {
    // Ignorer les attributs globaux de l'entité et le bloc des associations
    if (fieldName.startsWith('@_') || fieldName === 'associations') {
        continue;
    }

    // Sécuriser l'accès aux données du champ
    const data = typeof fieldData === 'object' && fieldData !== null ? fieldData : {};
    
    // Détecter si le champ est en lecture seule (comme level_depth)
    const readOnly = data['@_readOnly'] === 'true' || data['@_read_only'] === 'true';

    schema.push({
      name: fieldName,
      required: data['@_required'] === 'true',
      format: data['@_format'] || 'string',
      isMultilingual: data['language'] !== undefined,
      readOnly: readOnly
    });
  }

  return schema;
};
