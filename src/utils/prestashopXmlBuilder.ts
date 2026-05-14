
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
    if (field.readOnly || mappedData[field.name] === undefined || mappedData[field.name] === '') {
      continue; 
    }

    const value = mappedData[field.name];

    if (field.isMultilingual) {
      entityObject[field.name] = {
        language: {
          '@_id': '1',
          '__cdata': String(value)
        }
      };
    } else {
      entityObject[field.name] = String(value);
    }
  }

  const rootObject = {
    'prestashop': {
      '@_xmlns:xlink': 'http://www.w3.org/1999/xlink',
      [entityName]: entityObject
    }
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    cdataPropName: '__cdata',
    suppressEmptyNode: false, // Important : ne pas supprimer les nœuds vides
    processEntities: false,   // Ne pas échapper les entités HTML
    attributeNamePrefix: '@_'
  });

  let xmlContent = builder.build(rootObject);
  
  // S'assurer que la déclaration XML est présente
  if (!xmlContent.startsWith('<?xml')) {
    xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
  }
  
  // Debug : afficher le XML généré
  console.log('📄 XML généré par le builder:', xmlContent);
  console.log('📏 Longueur du XML:', xmlContent.length);
  
  return xmlContent;
};