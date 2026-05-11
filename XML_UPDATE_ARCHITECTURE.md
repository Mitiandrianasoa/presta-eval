# Architecture XML Update - Commandes PrestaShop

## 🎯 Approach Centralisée

Au lieu de créer du XML manuellement partout, on utilise une fonction généraliste qui:
1. **Valide** les données
2. **Construit** du XML correct
3. **Échappe** les caractères spéciaux
4. **Réutilisable** pour toutes les ressources

---

## 📊 Stack d'Appels

```
orderService.updateState(id, '2')
  ↓
orderService.updateOrder(id, {current_state: '2'})
  ↓
buildUpdateXml('orders', id, {current_state: '2'})
  ↓
Retourne XML valide
  ↓
api.put('/orders/{id}', xml)
```

---

## 🛠️ Comment Ça Marche

### 1. **schemaService.buildUpdateXml()**
```typescript
buildUpdateXml('orders', '5', { current_state: '2', payment: 'Paiement accepté' })
```

**Retourne:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id>5</id>
    <current_state>2</current_state>
    <payment>Paiement accepté</payment>
  </order>
</prestashop>
```

### 2. **orderService.updateOrder()**
```typescript
// Mettre à jour plusieurs champs
await orderService.updateOrder('5', {
  current_state: '2',
  payment: 'Carte bancaire'
});
```

### 3. **orderService.updateState() / updatePayment()**
```typescript
// Fonctions spécifiques
await orderService.updateState('5', '2');
await orderService.updatePayment('5', 'Virement');
```

---

## ✨ Avantages

✅ **Pas d'erreurs XML** - Structure toujours correcte  
✅ **Caractères spéciaux gérés** - `&`, `<`, `>` échappés  
✅ **Flexible** - Peut updater n'importe quel champ  
✅ **Réutilisable** - Fonctionne pour products, categories, etc.  
✅ **Centralisé** - Un seul endroit à modifier  
✅ **Testable** - Les fonctions sont pures  

---

## 🚀 Utilisation dans les Composants

### Avant (incorrect)
```typescript
// ❌ XML manuel = erreurs
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop><order>
  <id>${orderId}</id>
  <current_state>${newState}</current_state>
</order></prestashop>`;

await api.put(`/orders/${orderId}`, xml);
```

### Après (correct)
```typescript
// ✅ Utilise le service
await orderService.updateState(orderId, newState);
// ou
await orderService.updateOrder(orderId, { current_state: newState });
```

---

## 📝 Exemple Complet

```typescript
// Dans un composant Vue
const updateMultiple = async () => {
  await orderService.updateOrder('123', {
    current_state: '3',
    payment: 'Virement accepté'
  });
};
```

**Génère:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order>
    <id>123</id>
    <current_state>3</current_state>
    <payment>Virement accepté</payment>
  </order>
</prestashop>
```

---

## 🔐 Sécurité

La fonction `escapeXml()` échappe les caractères dangereux:

```typescript
// Input dangereux
"Paiement <danger> & \"quote\""

// Devient
"Paiement &lt;danger&gt; &amp; &quot;quote&quot;"
```

---

## 🔄 Ajouter une Nouvelle Mise à Jour

Pour updater un nouveau champ, c'est juste:

```typescript
// Dans orderService
async updateStatusReason(orderId: string, reason: string): Promise<void> {
  await this.updateOrder(orderId, { note: reason });
},
```

**Voilà! Done.** Pas besoin de reécrire le XML!

---

## 📂 Fichiers Impliqués

- `src/api/schemaService.ts` - `buildUpdateXml()` + `escapeXml()`
- `src/services/orderService.ts` - `updateOrder()`, `updateState()`, `updatePayment()`
- `src/components/order/OrderList.vue` - Utilise `orderService.updateState()`
- `src/components/order/OrderDetails.vue` - Utilise `orderService.updatePayment()`
