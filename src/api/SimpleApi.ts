// services/simpleApi.ts
class SimpleApi {
  private apiKey = '3GRNXCFZWTWID1J1LHIPAB5CTTE14W2X';
  private baseUrl = '/api';

  // ==================== MÉTHODE UNIVERSELLE ====================
  private async request(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: string
  ): Promise<string> {
    const fullUrl = this.baseUrl + url;
    console.log(`📡 ${method} ${fullUrl}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': 'Basic ' + btoa(this.apiKey + ':'),
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'text/xml; charset=utf-8'
      };
      options.body = body;
    }

    const response = await fetch(fullUrl, options);
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}:`, text);
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }
    
    return text;
  }

  // ==================== LECTURE (GET) ====================
  async getAllData(url: string): Promise<any[]> {
    const xmlText = await this.request(url, 'GET');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const rootElement = doc.documentElement.firstElementChild;
    const items = rootElement?.children || [];

    return Array.from(items).map(item => this.convertirXmlEnObjet(item));
  }

  // ==================== CRÉATION (POST) ====================
  async create(url: string, data: any): Promise<any> {
    const xml = this.buildXml(data);
    const xmlText = await this.request(url, 'POST', xml);
    
    console.log('✅ Créé avec succès');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const rootElement = doc.documentElement.firstElementChild;
    
    if (rootElement?.children.length > 0) {
      return this.convertirXmlEnObjet(rootElement.children[0]);
    }
    
    return { success: true };
  }

  // ==================== MODIFICATION (PUT) ====================
  async update(url: string, id: string | number, data: any): Promise<any> {
    const dataWithId = { id: String(id), ...data };
    const xml = this.buildXml(dataWithId);
    const xmlText = await this.request(`${url}/${id}`, 'PUT', xml);
    
    console.log('✅ Modifié avec succès');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const rootElement = doc.documentElement.firstElementChild;
    
    if (rootElement?.children.length > 0) {
      return this.convertirXmlEnObjet(rootElement.children[0]);
    }
    
    return { success: true };
  }

  // ==================== SUPPRESSION (DELETE) ====================
  async remove(url: string, id: string | number): Promise<boolean> {
    await this.request(`${url}/${id}`, 'DELETE');
    console.log('✅ Supprimé avec succès');
    return true;
  }

  // ==================== CONSTRUCTION XML ====================
  private buildXml(data: any, rootElement: string = 'prestashop'): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;
    xml += this.objectToXml(data, 1);
    xml += `</${rootElement}>`;
    return xml;
  }

  private objectToXml(obj: any, indent: number): string {
    let xml = '';
    const spaces = '  '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        xml += `${spaces}<${key}>\n`;
        xml += this.objectToXml(value, indent + 1);
        xml += `${spaces}</${key}>\n`;
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object') {
            xml += `${spaces}<${key}>\n`;
            xml += this.objectToXml(item, indent + 1);
            xml += `${spaces}</${key}>\n`;
          } else {
            xml += `${spaces}<${key}><![CDATA[${this.escapeXml(String(item))}]]></${key}>\n`;
          }
        });
      } else {
        xml += `${spaces}<${key}><![CDATA[${this.escapeXml(String(value))}]]></${key}>\n`;
      }
    }
    
    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ==================== CONVERSION XML → OBJET ====================
  private convertirXmlEnObjet(element: Element): any {
    const objet: any = {};

    Array.from(element.children).forEach(child => {
      if (child.children.length > 0) {
        objet[child.tagName] = this.convertirXmlEnObjet(child);
      } else {
        objet[child.tagName] = child.textContent?.trim() || '';
      }
    });

    return objet;
  }
}

export const simpleApi = new SimpleApi();