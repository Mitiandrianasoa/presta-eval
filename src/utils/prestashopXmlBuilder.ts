import { XMLBuilder } from 'fast-xml-parser';
import type { FieldDefinition } from '../api/schemaService';

/**
 * Génère une chaîne XML strictement formatée pour l'API PrestaShop.
 * 
 * @param entityName Le nom du noeud principal (ex: 'category', 'product')
 * @param mappedData Un objet contenant les données à envoyer (ex: { active: '1', name: 'Vetements' })
 * @param schema Le schéma récupéré via le synopsis pour savoir quels champs sont multilingues
 * @returns Une chaîne XML complète commençant par <?xml version="1.0"...>
 */
export const buildPrestashopXml = (
  entityName: string, 
  mappedData: Record<string, any>, 
  schema: FieldDefinition[]
): string => {
  
  const entityObject: Record<string, any> = {};

  for (const field of schema) {
    // On ignore les champs en lecture seule ou ceux qui n'ont pas été mappés/remplis
    if (field.readOnly || mappedData[field.name] === undefined || mappedData[field.name] === '') {
      continue; 
    }

    const value = mappedData[field.name];

    if (field.isMultilingual) {
      // Pour les champs multilingues : <name><language id="1"><![CDATA[ valeur ]]></language></name>
      entityObject[field.name] = {
        language: {
          '@_id': '1', // Par défaut on l'envoie pour la langue principale (1)
          '__cdata': String(value)
        }
      };
    } else {
      // PrestaShop est très strict sur de nombreux formats (isEmail, isPrice, isBool, etc.)
      // Il vaut mieux envoyer le texte brut (échappé par le builder) plutôt que du CDATA
      // qui fait souvent échouer les regex de PrestaShop.
      entityObject[field.name] = String(value);
    }
  }

  const rootObject = {
    prestashop: {
      '@_xmlns:xlink': 'http://www.w3.org/1999/xlink',
      [entityName]: entityObject
    }
  };

  // Configuration de l'builder pour gérer les attributs et les balises CDATA
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    cdataPropName: '__cdata' // Demande à fast-xml-parser de convertir cette propriété en balise <![CDATA[ ]]>
  });

  const xmlContent = builder.build(rootObject);
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
};
