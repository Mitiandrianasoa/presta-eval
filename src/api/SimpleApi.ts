// services/simpleApi.ts
class SimpleApi {
  private apiKey = '3GRNXCFZWTWID1J1LHIPAB5CTTE14W2X';

  // LE SAUVEUR : Une fonction qui prend TOUT sans rien connaître
  async getAllData(url: string): Promise<any[]> {
    // 1. Récupérer le XML
    const response = await fetch('/api' + url, {
      headers: {
        'Authorization': 'Basic ' + btoa(this.apiKey + ':')
      }
    });
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // 2. Prendre TOUS les éléments enfants de la racine
    const rootElement = doc.documentElement.firstElementChild;
    const items = rootElement?.children || [];

    // 3. Transformer CHAQUE élément XML en objet JavaScript
    return Array.from(items).map(item => {
      return this.convertirXmlEnObjet(item);
    });
  }

  // MAGIE : Convertir n'importe quel élément XML en objet
  private convertirXmlEnObjet(element: Element): any {
    const objet: any = {};

    // Parcourir TOUS les enfants de l'élément
    Array.from(element.children).forEach(child => {
      // Si l'enfant a des sous-éléments, convertir récursivement
      if (child.children.length > 0) {
        objet[child.tagName] = this.convertirXmlEnObjet(child);
      } else {
        // Sinon, prendre le texte directement
        objet[child.tagName] = child.textContent?.trim() || '';
      }
    });

    return objet;
  }
}

// Exporter une instance unique (singleton)
export const simpleApi = new SimpleApi();