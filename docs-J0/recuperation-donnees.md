# Récupération des données

La récupération des données consiste à charger les produits, catégories, marques, etc. depuis le backend PrestaShop (via l’API webservice XML) ou une source locale.

## Logique générale
- Les stores Pinia (ex: productStore.ts, categoryStore.ts) contiennent des méthodes `fetchAll()`
- Ces méthodes font un appel HTTP (GET) vers l’API PrestaShop (souvent en XML)
- Les données reçues sont transformées (XML → JS/JSON) puis stockées dans le state du store
- Les composants (ex: ProductList.vue) consomment ces données via le store et les affichent

## Exemple de code pour la récupération
```ts
// Dans productStore.ts
async fetchAll() {
  const xml = await api.get('/products');
  const products = parseXML(xml);
  this.products = products;
}
```

## Déroulement
1. Action utilisateur (navigation, chargement de page)
2. Appel d’une méthode du store (fetchAll)
3. Requête API (XML)
4. Conversion et mise à jour du state
5. Rafraîchissement de l’interface
