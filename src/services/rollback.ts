// rollback.ts
import api from "@/api/api";
import { API_CONFIG } from "@/api/config";


type ResetItem = {
  ref: string;
  priority: number;
};

const API_URL = api.defaults.baseURL;
const API_KEY = API_CONFIG.AUTH_KEY;

const AUTH_HEADER = {
  Authorization: "Basic " + btoa(`${API_KEY}:`)
};

const RESET_PRIORITY: ResetItem[] = [
  // Dépendances des commandes
  {ref: "stock_movements", priority: 0},
  { ref: "order_details", priority: 0 },
  { ref: "order_carriers", priority: 0 },
  { ref: "order_cart_rules", priority: 0 },
  { ref: "order_histories", priority: 0 },
  { ref: "order_invoices", priority: 0 },
  { ref: "order_payments", priority: 0 },
  { ref: "order_slip", priority: 0 },

  // Commandes
  { ref: "orders", priority: 1 },

  // Paniers
  { ref: "carts", priority: 2 },

  // Produits
  { ref: "products", priority: 3 },

  // Clients
//   { ref: "customers", priority: 4 },

  // Taxes
  { ref: "tax_rules", priority: 5 },
  { ref: "tax_rule_groups", priority: 5 },
  { ref: "taxes", priority: 5 },

  // Catégories
  { ref: "categories", priority: 6 },
];

function shouldSkip(resource: string, id: number): boolean {
  // Catégories système PrestaShop
  if (resource === "categories" && [1, 2].includes(id)) {
    return true;
  }

//   // Client admin par défaut
//   if (resource === "customers" && id === 1) {
//     return true;
//   }

  return false;
}

async function getAllIds(resource: string): Promise<number[]> {
  const response = await fetch(
    `${API_URL}/${resource}?display=[id]`,
    {
      method: "GET",
      headers: AUTH_HEADER,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erreur récupération IDs ${resource} (${response.status})`
    );
  }

  const xmlText = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  return [...xml.querySelectorAll("id")]
    .map((node) => Number(node.textContent))
    .filter(Boolean);
}

async function deleteResource(
  resource: string,
  id: number
): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/${resource}/${id}`,
      {
        method: "DELETE",
        headers: AUTH_HEADER,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        `[ERROR] ${resource} ${id}`,
        response.status,
        errorText
      );

      return;
    }

    console.log(`[DELETED] ${resource} ${id}`);
  } catch (error) {
    console.error(
      `[EXCEPTION] ${resource} ${id}`,
      error
    );
  }
}

async function rollback(): Promise<void> {
  console.log("========== START ROLLBACK ==========");

  const orderedResources = [...RESET_PRIORITY].sort(
    (a, b) => a.priority - b.priority
  );

  for (const item of orderedResources) {
    console.log(`\nSuppression ${item.ref}`);

    try {
      const ids = await getAllIds(item.ref);

      console.log(
        `${ids.length} élément(s) trouvé(s)`
      );

      for (const id of ids) {
        if (shouldSkip(item.ref, id)) {
          console.log(
            `[SKIPPED] ${item.ref} ${id}`
          );
          continue;
        }

        await deleteResource(item.ref, id);
      }
    } catch (error) {
      console.error(
        `Erreur globale ${item.ref}`,
        error
      );
    }
  }

  console.log("========== END ROLLBACK ==========");
}

export default rollback;