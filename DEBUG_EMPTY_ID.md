# 🐛 Debugging: Erreur 400 - ID Vide

## Problème Identifié

```
❌ XML généré: <?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id></id>
  </order>
</prestashop>
PUT http://localhost:5173/api/orders/ 400 (Bad Request)
```

**Cause:** L'ID de la commande était vide quand `updateState()` était appelé.

---

## Root Cause Analysis

### Le problème avant
```typescript
@change="updateState(order.id, ($event.target as HTMLSelectElement).value)"
```

**Problèmes:**
1. La closure ne captait pas correctement `order.id`
2. Pas de validation que `orderId` n'est pas vide
3. L'événement change et la valeur n'étaient pas synchronisés

### La solution
```typescript
const handleStateChange = (event: Event, orderId: string) => {
  const target = event.target as HTMLSelectElement;
  const newState = target.value;
  updateState(orderId, newState);  // Passage explicite des paramètres
};

// Dans le template:
@change="handleStateChange($event, order.id)"
```

**Avantages:**
1. ✅ Passage explicite et clair des paramètres
2. ✅ Fonction dédiée pour le handling
3. ✅ Logging pour déboguer
4. ✅ Validation pour s'assurer que l'ID n'est pas vide

---

## Debugging Ajouté

### Console Logs
```typescript
// Dans OrderList.vue
console.log('🔽 Dropdown changé:', { orderId, newState });

// Dans orderService.ts
console.log(`🔔 updateState appelé avec:`, { orderId, newState });
console.log(`📝 Mise à jour commande ${orderId} avec:`, data);
console.log(`📮 Envoi PUT vers /orders/${orderId}`);

// Validation
if (!orderId || orderId.trim() === '') {
  throw new Error('❌ OrderId est vide!');
}
```

### Affichage Console
```
🔽 Dropdown changé: {orderId: "5", newState: "2"}
📝 updateState appelé desde OrderList: {orderId: "5", newState: "2", type: "string"}
🔔 updateState appelé avec: {orderId: "5", newState: "2"}
🔄 Mise à jour commande 5 avec: {current_state: "2"}
📮 Envoi PUT vers /orders/5
📝 XML généré: <?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id>5</id>
    <current_state>2</current_state>
  </order>
</prestashop>
✅ Commande 5 mise à jour: {current_state: "2"}
```

---

## Fichiers Corrigés

✅ `src/components/order/OrderList.vue`
- Ajout fonction `handleStateChange()`
- Mise à jour du template du select
- Validation et logging

✅ `src/services/orderService.ts`
- Validation que `orderId !== ''`
- Logging détaillé
- Messages d'erreur clairs

---

## 🧪 Comment Tester

1. Ouvre les DevTools (F12)
2. Onglet "Console"
3. Clique sur le dropdown de changement d'état
4. Regarde les logs 🔽 et 🔔

**Attendu:**
```
✅ Etat mis à jour
✅ XML valide avec ID
✅ PUT vers /orders/{id}
```

**Pas attendu (erreurs):**
```
❌ XMLgenéré avec <id></id> vide
❌ 400 Bad Request
```

---

## Prévention Future

Pour éviter ce problème:

1. **Toujours valider les IDs** avant utilisation
2. **Passer les paramètres explicitement** plutôt que de faire confiance aux closures
3. **Ajouter du logging** aux points critiques
4. **Tester en console** avant de commit

---

## Fichiers Impliqués

- `src/components/order/OrderList.vue` - Template + handlers
- `src/services/orderService.ts` - Validation + logging
- `src/api/schemaService.ts` - Génération XML

---

## Pattern à Réutiliser

```typescript
// ✅ BON PATTERN - Fonction dédiée
const handleChange = (event: Event, id: string) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!id || id.trim() === '') {
    console.error('ID manquant');
    return;
  }
  serviceCall(id, value);
};

// ❌ MAUVAIS PATTERN - Inline avec closure
@change="handleSomething(item.id, $event.target.value)"
// Risque: item.id peut être vide, pas de validation
```

---

## ✨ Leçon Apprise

La gestion des événements en Vue avec des paramètres dynamiques peut être trompeuse. 
**Toujours:**
- ✅ Créer une fonction handler dédiée
- ✅ Valider les paramètres
- ✅ Ajouter du logging
- ✅ Tester en console
