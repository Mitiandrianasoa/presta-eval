# Plan de Refactoring : Panier & Tunnel de Commande

## 1. Découpage du tunnel de commande (Checkout)
Découper `CheckoutView.vue` en composants isolés. L'état sera géré par les props et emits (pas de store).
- [ ] Créer `src/components/checkout/AddressSelection.vue` (Étape 1)
- [ ] Créer `src/components/checkout/CarrierSelection.vue` (Étape 2)
- [ ] Créer `src/components/checkout/PaymentSelection.vue` (Étape 3)
- [ ] Créer `src/components/checkout/OrderSummary.vue` (Résumé latéral)

## 2. Refactoring de CartView.vue (Panier)
- [ ] Mettre au propre `CartView.vue` pour la gestion des quantités et de la vue du panier.
- [ ] Vérifier que le bouton "Procéder au paiement" redirige vers `/checkout`.

## 3. Orchestration CheckoutView.vue (Parent)
- [ ] Convertir en un composant parent qui orchestre les 4 composants, stocke l'état (`addressId`, `carrierId`, `paymentId`) localement.
- [ ] Gérer un système d'étapes (Step 1, Step 2, Step 3).
- [ ] Gérer la soumission finale de la commande.

## 4. ConfirmationView.vue
- [ ] Nettoyer l'affichage après la réussite du POST de la commande.
