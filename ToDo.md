J-1 

NEW APP
- BACK OFFICE
    - login[Tsanta][ok]:
        - API:
            - status
            - role ? 
        - affichage
        - gestion de role utilisateur 
        
    - configuration reset data[Tsanta][ok]:
        - update affichage:
            - button tout effacer/ tout selectionner 

    - import[Mitia]:
        - input 3 csv 
            - format 
            - function
            - affichage
        - input zip img
            - format 
            - function
            - affichage
        - API 
            - status
            - fonction
            - affichage
    - liste commandes[Mitia]:
        - details:
            - modifier etat
            - etat payement: [echec, effectue, anule]
        
- FRONT OFFICE
    - page accueil[Tsanta]:[ok]
        - list produits
        - fiche details produit
    - gestion panier[Mitia]:
        - API
        - module:
            - livraison
            - payement
            - commande
    - list  de mes commandes[Mitia]: 
        - etat

J-2 


NEW APP
- BACK OFFICE[Mitia]
    AFFICHAGE
        - liste:
            - panier
            - commandes 
                - filtre commande annuler
            - paiement effectue
    FUNCTION
        - service Service
            - getAllCarts
            - getAllPayment
            - getOrdersCanceled
    INTEGRATION
        - script API
    - Tableau de board:
        - Par Jour:
            - nb commande
            - montant
        - General
        
- FRONT OFFICE[Tsanta]
    - page accueil[Tsanta]:
        - liste customer:
            - choix utilisateur
            - anonyme
    - list produits avec  date_availability_produit
        - etiquette:
            - HOT : pour les produits sorties 1j avant  
            - NEW : pour les produits sorties 1 semaines avant
    - Recherche Multicritere par produit:
        - nom  
        - catégorie 
        - intervalle de prix