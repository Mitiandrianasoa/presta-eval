<template>
  <div class="import-container">
    <h2>Portail d'Importation Centralisé PrestaShop</h2>

    <div class="maintenance-zone">
      <button 
        :disabled="isImporting || isResetting" 
        @click="confirmerEtReinitialiserTables" 
        class="btn-reset-tables"
      >
        {{ isResetting ? 'Réinitialisation des tables en cours...' : '⚠️ Réinitialiser et Vider les Tables' }}
      </button>
    </div>

    <div class="import-grid">
      <div class="import-card" :class="{ 'has-file': csvProduits.length }">
        <h3>1. Fichier Produits (CSV)</h3>
        <input type="file" accept=".csv" :disabled="isImporting || isResetting" @change="e => validerEtChargerCSV(e, 'produits')" />
        <p v-if="csvProduits.length" class="text-success">✓ {{ csvProduits.length }} produits prêts</p>
      </div>

      <div class="import-card" :class="{ 'has-file': csvDeclinaisons.length }">
        <h3>2. Déclinaisons & Stocks (CSV)</h3>
        <input type="file" accept=".csv" :disabled="isImporting || isResetting" @change="e => validerEtChargerCSV(e, 'declinaisons')" />
        <p v-if="csvDeclinaisons.length" class="text-success">✓ {{ csvDeclinaisons.length }} déclinaisons prêtes</p>
      </div>

      <div class="import-card" :class="{ 'has-file': csvCommandes.length }">
        <h3>3. Commandes & Paniers (CSV)</h3>
        <input type="file" accept=".csv" :disabled="isImporting || isResetting" @change="e => validerEtChargerCSV(e, 'commandes')" />
        <p v-if="csvCommandes.length" class="text-success">✓ {{ csvCommandes.length }} commandes prêtes</p>
      </div>

      <div class="import-card" :class="{ 'has-file': zipPhotos }">
        <h3>4. Photos Produits (ZIP)</h3>
        <input type="file" accept=".zip" :disabled="isImporting || isResetting" @change="chargerZipPhotos" />
        <p v-if="zipPhotos" class="text-success">✓ Archive ZIP prête</p>
      </div>
    </div>

    <div class="actions-zone">
      <button 
        :disabled="isImporting || isResetting || (!csvProduits.length && !csvDeclinaisons.length && !csvCommandes.length && !zipPhotos)" 
        @click="lancerImportationGlobale" 
        class="btn-import-all"
      >
        {{ isImporting ? 'Traitement Global en Cours...' : 'Lancer l\'Importation Séquentielle' }}
      </button>
    </div>

    <div v-if="logsErreurs.length" class="error-log-box">
      <h3>📋 Journal des logs et anomalies de validation ({{ logsErreurs.length }})</h3>
      <ul>
        <li v-for="(log, idx) in logsErreurs" :key="idx" :class="log.type">
          <strong>[{{ log.fichier.toUpperCase() }}] {{ log.ligne ? 'Ligne ' + log.ligne : '' }} :</strong> {{ log.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Papa from 'papaparse';
import JSZip from 'jszip';
import api from '../../../api/api'; // Client API PrestaShop

// États des données d'importation
const csvProduits = ref([]);
const csvDeclinaisons = ref([]);
const csvCommandes = ref([]);
const zipPhotos = ref(null);

const isImporting = ref(false);
const isResetting = ref(false);
const logsErreurs = ref([]);

// Configuration de l'ordre exact de suppression fourni
const RESET_PRIORITY = [
  { ref: "products", priority: 0 },
  { ref: "categories", priority: 0 },
  { ref: "orders", priority: 1 },
  { ref: "order_details", priority: 1 },
  { ref: "order_carriers", priority: 1 },
  { ref: "order_cart_rules", priority: 1 },
  { ref: "order_histories", priority: 1 },
  { ref: "order_invoices", priority: 1 },
  { ref: "order_payments", priority: 1 },
  { ref: "order_slip", priority: 1 },
  { ref: "tax_rules", priority: 1 },
  { ref: "tax_rule_groups", priority: 1 },
  { ref: "taxes", priority: 1 },
  { ref: "carts", priority: 2 },
];

const COLONNES_REQUISES = {
  produits: ['reference', 'nom', 'prix_ttc', 'prix_achat', 'Taxe', 'date_availability_produit', 'categorie'],
  declinaisons: ['reference', 'stock_initial', 'prix_vente_ttc'],
  commandes: ['date', 'nom', 'email', 'pwd', 'adresse', 'achat', 'etat']
};

const ajouterLogErreur = (fichier, ligne, message, type = 'error') => {
  logsErreurs.value.push({ fichier, ligne, message, type });
};

const convertirDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
};

// --- LOGIQUE DE RÉINITIALISATION (RESET) DES TABLES ---

const confirmerEtReinitialiserTables = async () => {
  const confirmation = confirm("Êtes-vous sûr de vouloir vider TOUTES ces tables PrestaShop ? Cette action est irréversible.");
  if (!confirmation) return;

  isResetting.value = true;
  logsErreurs.value = []; // Clear des logs précédents

  try {
    ajouterLogErreur('maintenance', 0, "Début du vidage séquentiel des tables...", 'info');

    // On parcourt les tables dans l'ordre exact défini dans le tableau
    for (const table of RESET_PRIORITY) {
      try {
        console.log(`Vidage de la table/ressource : ${table.ref}`);
        
        // Appel de votre API via la méthode DELETE appropriée de votre architecture.
        // Exemple générique : api.delete(`/reset/${table.ref}`) ou api.delete(`/${table.ref}`)
        await api.delete(`/${table.ref}`); 
        
        ajouterLogErreur('maintenance', 0, `✓ Table [${table.ref}] vidée avec succès.`, 'success-msg');
      } catch (err) {
        // Enregistre l'erreur mais continue le processus pour les tables suivantes si désiré
        ajouterLogErreur('maintenance', 0, `Erreur lors du vidage de [${table.ref}] : ${err.message}`, 'error');
      }
    }
    
    ajouterLogErreur('maintenance', 0, "Processus de réinitialisation terminé.", 'info');
  } catch (globalErr) {
    ajouterLogErreur('maintenance', 0, `Erreur critique globale lors du reset : ${globalErr.message}`, 'error');
  } finally {
    isResetting.value = false;
  }
};

// --- LOGIQUE DE VALIDATION ET PARSING CSV ---

const validerEtChargerCSV = (event, typeFichier) => {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const lignesBrutes = results.data;
      if (lignesBrutes.length === 0) {
        ajouterLogErreur(typeFichier, 0, "Le fichier est vide.");
        return;
      }

      const colonnesDetectees = Object.keys(lignesBrutes[0]);
      const colonnesManquantes = COLONNES_REQUISES[typeFichier].filter(
        col => !colonnesDetectees.some(c => c.toLowerCase().trim() === col.toLowerCase())
      );

      if (colonnesManquantes.length > 0) {
        ajouterLogErreur(typeFichier, 0, `Structure non conforme. Colonnes manquantes : ${colonnesManquantes.join(', ')}`);
        return;
      }

      const donneesValidees = [];

      lignesBrutes.forEach((row, index) => {
        const indexLigne = index + 1;
        let formatValide = true;

        if (typeFichier === 'produits') {
          const prixTtc = parseFloat(row.prix_ttc?.toString().replace(',', '.')) || 0;
          const prixAchat = parseFloat(row.prix_achat?.toString().replace(',', '.')) || 0;

          if (prixTtc <= 0) {
            ajouterLogErreur(typeFichier, indexLigne, `Le prix_ttc doit être supérieur à 0 (Valeur actuelle : ${row.prix_ttc})`);
            formatValide = false;
          }

          if (formatValide) {
            donneesValidees.push({
              ...row,
              prix_ttc: prixTtc,
              prix_achat: prixAchat,
              date_availability_produit: convertirDate(row.date_availability_produit)
            });
          }
        } 
        else if (typeFichier === 'declinaisons') {
          const stock = parseInt(row.stock_initial) || 0;
          const prixVenteTtc = row.prix_vente_ttc ? parseFloat(row.prix_vente_ttc.toString().replace(',', '.')) : 0;

          if (prixVenteTtc < 0) {
            ajouterLogErreur(typeFichier, indexLigne, `Le prix de vente de la déclinaison ne peut pas être négatif.`);
            formatValide = false;
          }

          if (formatValide) {
            donneesValidees.push({
              ...row,
              stock_initial: stock,
              prix_vente_ttc: prixVenteTtc
            });
          }
        } 
        else if (typeFichier === 'commandes') {
          if (!row.email || !row.email.includes('@')) {
            ajouterLogErreur(typeFichier, indexLigne, `Format d'email invalide : ${row.email}`);
            formatValide = false;
          }

          if (formatValide) {
            donneesValidees.push({
              ...row,
              date: convertirDate(row.date)
            });
          }
        }
      });

      if (typeFichier === 'produits') csvProduits.value = donneesValidees;
      if (typeFichier === 'declinaisons') csvDeclinaisons.value = donneesValidees;
      if (typeFichier === 'commandes') csvCommandes.value = donneesValidees;
    }
  });
};

const chargerZipPhotos = (event) => {
  const file = event.target.files[0];
  if (!file || !file.name.endsWith('.zip')) {
    ajouterLogErreur('photos', 0, "Veuillez charger un fichier compressé au format .zip valide.");
    return;
  }
  zipPhotos.value = file;
};

const lancerImportationGlobale = async () => {
  isImporting.value = true;
  logsErreurs.value = [];

  try {
    if (csvProduits.value.length > 0) await executerImportProduits(csvProduits.value);
    if (csvDeclinaisons.value.length > 0) await executerImportDeclinaisons(csvDeclinaisons.value);
    if (csvCommandes.value.length > 0) await executerImportCommandes(csvCommandes.value);
    if (zipPhotos.value) await executerImportPhotos(zipPhotos.value);
  } catch (globalError) {
    ajouterLogErreur('global', 0, `Interruption de l'importation : ${globalError.message}`);
  } finally {
    isImporting.value = false;
  }
};

const executerImportProduits = async (donnees) => { /* Votre ancienne logique d'insertion de produits */ };
const executerImportDeclinaisons = async (donnees) => { /* Votre ancienne logique d'insertion de déclinaisons */ };
const executerImportCommandes = async (donnees) => { /* Votre ancienne logique d'insertion de commandes */ };
const executerImportPhotos = async (fileZip) => { /* Votre ancienne logique d'insertion de photos */ };
</script>

<style scoped>
.import-container {
  max-width: 1200px;
  margin: 30px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
.maintenance-zone {
  background: #fff3cd;
  border: 1px solid #ffeeba;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 25px;
  text-align: right;
}
.btn-reset-tables {
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  font-weight: bold;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-reset-tables:hover {
  background-color: #bd2130;
}
.btn-reset-tables:disabled {
  background-color: #e4606d;
  cursor: not-allowed;
}
.import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.import-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}
.import-card.has-file {
  border-color: #4ed282;
  background-color: #e6f9ed;
}
.actions-zone {
  text-align: center;
  margin-bottom: 30px;
}
.btn-import-all {
  padding: 15px 40px;
  background-color: #4ed282;
  color: white;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-import-all:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-log-box {
  background-color: #fdf2f2;
  border: 1px solid #dc3545;
  border-left: 6px solid #dc3545;
  padding: 15px;
  border-radius: 6px;
}
.error-log-box ul {
  list-style: none;
  padding-left: 0;
}
.error-log-box li {
  margin-bottom: 8px;
  font-size: 14px;
}
.error-log-box li.error { color: #721c24; }
.error-log-box li.info { color: #0c5460; }
.error-log-box li.success-msg { color: #155724; }
.text-success {
  color: #28a745;
  margin-top: 10px;
  font-weight: bold;
}
</style>