import { defineStore } from 'pinia';
import api from '../../api/api';

// Extrait les IDs depuis une réponse XML PrestaShop
function parseIds(xml: string, tag: string, skip: number[] = []): number[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.getElementsByTagName(tag))
    .map(el => parseInt(el.getElementsByTagName('id')[0]?.textContent || '0'))
    .filter(id => id > 0 && !skip.includes(id));
}

interface Resource {
  label:        string;
  endpoint:     string;
  tag:          string;
  skip?:        number[];   // IDs protégés à ne jamais supprimer
  soft?:        boolean;    // true = ignorer les erreurs silencieusement
}

// Ordre de suppression : dépendances en premier
const RESOURCES: Resource[] = [
  // Dépendances produits
  { label: 'Valeurs caractéristiques', endpoint: 'product_feature_values', tag: 'product_feature_value' },
  { label: 'Valeurs options',           endpoint: 'product_option_values',  tag: 'product_option_value' },
  { label: 'Combinaisons',              endpoint: 'combinations',            tag: 'combination' },
  { label: 'Prix spécifiques',          endpoint: 'specific_prices',         tag: 'specific_price' },
  { label: 'Tags',                      endpoint: 'tags',                    tag: 'tag' },
  { label: 'Pièces jointes',            endpoint: 'attachments',             tag: 'attachment' },
  { label: 'Commentaires',             endpoint: 'product_comments',        tag: 'product_comment',  soft: true },
  { label: 'Listes de souhaits',        endpoint: 'wishlists',               tag: 'wishlist',         soft: true },
  { label: 'Règles panier',             endpoint: 'cart_rules',              tag: 'cart_rule' },

  // Commandes & clients (commandes souvent protégées)
  { label: 'Commandes',                 endpoint: 'orders',                  tag: 'order',            soft: true },
  { label: 'Adresses',                  endpoint: 'addresses',               tag: 'address' },

  // Ressources principales catalogue
  { label: 'Produits',                  endpoint: 'products',                tag: 'product' },
  { label: 'Catégories',               endpoint: 'categories',              tag: 'category',         skip: [1, 2] },
  { label: 'Fabricants',               endpoint: 'manufacturers',           tag: 'manufacturer' },
  { label: 'Fournisseurs',             endpoint: 'suppliers',               tag: 'supplier' },
  { label: 'Caractéristiques',         endpoint: 'product_features',        tag: 'product_feature' },
  { label: 'Options produits',          endpoint: 'product_options',         tag: 'product_option' },

  // Clients
  { label: 'Clients',                   endpoint: 'customers',               tag: 'customer' },
  { label: 'Invités',                  endpoint: 'guests',                  tag: 'guest',            soft: true },

  // Stock & logistique
  { label: 'Stocks disponibles',        endpoint: 'stock_availables',        tag: 'stock_available',  soft: true },
  { label: 'Entrepôts',               endpoint: 'warehouses',              tag: 'warehouse',        soft: true },
  { label: 'Transporteurs',            endpoint: 'carriers',                tag: 'carrier',          soft: true },

  // Config boutique (souvent protégée, on ignore les erreurs)
  { label: 'Magasins',                  endpoint: 'stores',                  tag: 'store',            soft: true },
  { label: 'CMS',                       endpoint: 'cms',                     tag: 'cms',              soft: true },
  { label: 'Catégories CMS',           endpoint: 'cms_categories',          tag: 'cms_category',     soft: true },
  { label: 'Contacts',                  endpoint: 'contacts',                tag: 'contact',          soft: true },
  { label: 'Taxes',                     endpoint: 'taxes',                   tag: 'tax',              soft: true },
  { label: 'Groupes de taxes',          endpoint: 'tax_rule_groups',         tag: 'tax_rule_group',   soft: true },
  { label: 'Zones',                     endpoint: 'zones',                   tag: 'zone',             soft: true },
  { label: 'Pays',                      endpoint: 'countries',               tag: 'country',          soft: true },
  { label: 'États / Régions',          endpoint: 'states',                  tag: 'state',            soft: true },
  { label: 'Devises',                  endpoint: 'currencies',              tag: 'currency',         soft: true },
  { label: 'Langues',                  endpoint: 'languages',               tag: 'language',         soft: true },
  { label: 'Groupes clients',          endpoint: 'groups',                  tag: 'group',            soft: true },
];

export const useResetStore = defineStore('reset', {
  state: () => ({
    loading:  false,
    step:     '' as string,
    progress: 0,
    total:    0,
  }),

  actions: {
    async resetAll() {
      this.loading  = true;
      this.progress = 0;
      this.total    = 0;
      this.step     = 'Récupération des données...';

      try {
        // Phase 1 — récupérer tous les IDs en XML
        const plan: { res: Resource; ids: number[] }[] = [];

        for (const res of RESOURCES) {
          try {
            const r = await api.get(
              `/${res.endpoint}?output_format=XML&display=[id]&limit=5000`
            );
            const ids = parseIds(r.data, res.tag, res.skip);
            plan.push({ res, ids });
            this.total += ids.length;
          } catch {
            plan.push({ res, ids: [] });
          }
        }

        // Phase 2 — suppression (ordre décroissant pour respecter les dépendances internes)
        for (const { res, ids } of plan) {
          if (ids.length === 0) continue;
          this.step = `Suppression : ${res.label} (${ids.length})`;

          for (const id of [...ids].sort((a, b) => b - a)) {
            try {
              await api.delete(`/${res.endpoint}/${id}`);
            } catch (e: any) {
              if (!res.soft) throw new Error(`Erreur ${res.endpoint}/${id} : ${e?.response?.status}`);
            }
            this.progress++;
          }
        }

        this.step = 'Terminé';
      } catch (e) {
        this.step = `Erreur : ${e}`;
        throw e;
      } finally {
        this.loading = false;
      }
    }
  }
});
