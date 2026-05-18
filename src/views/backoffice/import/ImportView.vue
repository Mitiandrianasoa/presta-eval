<template>
   <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
  <div class="import-container">
    <h2>Importateur PrestaShop – Import Global</h2>

    <!-- ─── Zone de chargement des fichiers ─────────────────────────── -->
    <div class="upload-grid">
      <!-- Fichier 1 : Produits -->
      <div class="upload-card" :class="{ loaded: fichierProduits }">
        <div class="upload-card__header">
          <span class="upload-card__num">01</span>
          <span class="upload-card__title">Produits</span>
          <span v-if="fichierProduits" class="badge-ok">✔ chargé</span>
        </div>
        <label class="file-label">
          <input type="file" accept=".csv" @change="onProduitChange" />
          <span>{{ fichierProduits ? fichierProduits.name : 'Choisir un CSV produits…' }}</span>
        </label>
        <p v-if="erreursProduits" class="inline-error">{{ erreursProduits }}</p>
      </div>

      <!-- Fichier 2 : Déclinaisons -->
      <div class="upload-card" :class="{ loaded: fichierDeclinaisons }">
        <div class="upload-card__header">
          <span class="upload-card__num">02</span>
          <span class="upload-card__title">Déclinaisons &amp; Stocks</span>
          <span v-if="fichierDeclinaisons" class="badge-ok">✔ chargé</span>
        </div>
        <label class="file-label">
          <input type="file" accept=".csv" @change="onDeclinaisonChange" />
          <span>{{ fichierDeclinaisons ? fichierDeclinaisons.name : 'Choisir un CSV déclinaisons…' }}</span>
        </label>
        <p v-if="erreursDeclinaisons" class="inline-error">{{ erreursDeclinaisons }}</p>
      </div>

      <!-- Fichier 3 : Commandes -->
      <div class="upload-card" :class="{ loaded: fichierCommandes }">
        <div class="upload-card__header">
          <span class="upload-card__num">03</span>
          <span class="upload-card__title">Commandes</span>
          <span v-if="fichierCommandes" class="badge-ok">✔ chargé</span>
        </div>
        <label class="file-label">
          <input type="file" accept=".csv" @change="onCommandeChange" />
          <span>{{ fichierCommandes ? fichierCommandes.name : 'Choisir un CSV commandes…' }}</span>
        </label>
        <p v-if="erreursCommandes" class="inline-error">{{ erreursCommandes }}</p>
      </div>

      <!-- Fichier 4 : Photos (ZIP) -->
      <div class="upload-card" :class="{ loaded: fichierPhotos }">
        <div class="upload-card__header">
          <span class="upload-card__num">04</span>
          <span class="upload-card__title">Photos (ZIP)</span>
          <span v-if="fichierPhotos" class="badge-ok">✔ chargé</span>
        </div>
        <label class="file-label">
          <input type="file" accept=".zip" @change="onPhotoChange" />
          <span>{{ fichierPhotos ? fichierPhotos.name : 'Choisir un ZIP de photos…' }}</span>
        </label>
        <p v-if="erreursPhotos" class="inline-error">{{ erreursPhotos }}</p>
      </div>
    </div>

    <!-- ─── Bouton unique d'importation ──────────────────────────────── -->
    <div class="action-bar">
      <button
        class="btn-import"
        :disabled="!peutImporter || isImporting"
        @click="lancerImportation"
      >
        <span v-if="isImporting" class="spinner"></span>
        {{ isImporting ? 'Importation en cours…' : "Lancer l'importation" }}
      </button>
      <span v-if="!peutImporter && !isImporting" class="hint">
        Chargez au moins un fichier pour continuer.
      </span>
    </div>

    <!-- ─── Barre de progression globale ────────────────────────────── -->
    <div v-if="isImporting" class="progress-global">
      <div class="progress-steps">
        <div
          v-for="(etape, i) in etapes"
          :key="i"
          class="progress-step"
          :class="etape.etat"
        >
          <span class="progress-step__num">{{ i + 1 }}</span>
          <span class="progress-step__label">{{ etape.label }}</span>
        </div>
      </div>
    </div>

    <!-- ─── Message de statut global ────────────────────────────────── -->
    <div
      v-if="statusMessage"
      :class="['status-box', importSuccess ? 'success' : 'error']"
    >
      <strong>Statut :</strong>
      <pre class="status-pre">{{ statusMessage }}</pre>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Rapport Produits                                                -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <section v-if="produitsTraites.length" class="report-section">
      <h3>① Produits</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Nom</th>
            <th>Prix HT</th>
            <th>ps_product</th>
            <th>ps_product_lang</th>
            <th>ps_product_shop</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prod in produitsTraites" :key="prod.reference" :class="prod.status">
            <td>{{ prod.reference }}</td>
            <td>{{ prod.nom }}</td>
            <td>{{ prod.prix_ht }} €</td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product }}</span></td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product_lang }}</span></td>
            <td class="center"><span class="badge">{{ prod.tables.ps_product_shop }}</span></td>
            <td>
              <span v-if="prod.status === 'pending'" class="txt-pending">En attente…</span>
              <span v-if="prod.status === 'success'" class="txt-success">✔ Inséré (ID: {{ prod.id_prestashop }})</span>
              <span v-if="prod.status === 'rolled_back'" class="txt-rollback">↺ Annulé</span>
              <span v-if="prod.status === 'error'" class="txt-error">✘ {{ prod.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Rapport Déclinaisons                                            -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <section v-if="declinaisonsTraitees.length" class="report-section">
      <h3>② Déclinaisons &amp; Stocks</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Spécificité</th>
            <th>Karazany</th>
            <th>Stock</th>
            <th>Prix TTC</th>
            <th>ID Produit</th>
            <th>ID Groupe</th>
            <th>ID Valeur</th>
            <th>ID Déclinaison</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="decl in declinaisonsTraitees"
            :key="`${decl.reference}_${decl.specificite}_${decl.karazany}`"
            :class="decl.status"
          >
            <td>{{ decl.reference }}</td>
            <td>{{ decl.specificite || 'N/A' }}</td>
            <td>{{ decl.karazany || 'N/A' }}</td>
            <td class="center">{{ decl.stock_initial }}</td>
            <td class="center">{{ decl.prix_vente_ttc || '-' }}</td>
            <td class="center">{{ decl.id_product || '-' }}</td>
            <td class="center">{{ decl.id_groupe || '-' }}</td>
            <td class="center">{{ decl.id_valeur || '-' }}</td>
            <td class="center">{{ decl.id_product_attribute || '-' }}</td>
            <td>
              <span v-if="decl.status === 'pending'" class="txt-pending">En attente…</span>
              <span v-if="decl.status === 'success'" class="txt-success">✔ Inséré</span>
              <span v-if="decl.status === 'success_simple'" class="txt-success">✔ Stock MAJ</span>
              <span v-if="decl.status === 'rolled_back'" class="txt-rollback">↺ Annulé</span>
              <span v-if="decl.status === 'error'" class="txt-error">✘ {{ decl.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Rapport Commandes                                               -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <section v-if="commandesTraitees.length" class="report-section">
      <h3>③ Commandes</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Email</th>
            <th>Date</th>
            <th>État</th>
            <th>ID Client</th>
            <th>ID Adresse</th>
            <th>ID Panier</th>
            <th>ID Commande</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cmd in commandesTraitees" :key="`${cmd.email}_${cmd.date}`" :class="cmd.status">
            <td>{{ cmd.nom }}</td>
            <td>{{ cmd.email }}</td>
            <td>{{ cmd.date }}</td>
            <td>
              <span v-if="cmd.etat && cmd.etat.toLowerCase().includes('paiement accepté')" class="badge-paid">Payé</span>
              <span v-else class="badge-abandoned">Abandonné</span>
            </td>
            <td class="center">{{ cmd.id_customer || '-' }}</td>
            <td class="center">{{ cmd.id_address || '-' }}</td>
            <td class="center">{{ cmd.id_cart || '-' }}</td>
            <td class="center">{{ cmd.id_order || '-' }}</td>
            <td>
              <span v-if="cmd.status === 'pending'" class="txt-pending">En attente…</span>
              <span v-if="cmd.status === 'success'" class="txt-success">
                ✔ {{ cmd.etat && cmd.etat.toLowerCase().includes('paiement accepté') ? 'Commande créée' : 'Panier créé' }}
              </span>
              <span v-if="cmd.status === 'rolled_back'" class="txt-rollback">↺ Annulé</span>
              <span v-if="cmd.status === 'error'" class="txt-error">✘ {{ cmd.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- Rapport Photos                                                   -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <section v-if="photosTraitees.length" class="report-section">
      <h3>④ Photos</h3>
      <div v-if="totalPhotos > 0" class="progress-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (photosTraitees.filter(p => p.status !== 'pending').length / totalPhotos * 100) + '%' }"
          ></div>
        </div>
        <p class="progress-text">
          {{ photosTraitees.filter(p => p.status !== 'pending').length }} / {{ totalPhotos }} photos traitées
        </p>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Fichier</th>
            <th>Référence</th>
            <th>ID Produit</th>
            <th>ID Image</th>
            <th>Taille</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="photo in photosTraitees" :key="photo.filename" :class="photo.status">
            <td>{{ photo.filename }}</td>
            <td>{{ photo.reference }}</td>
            <td class="center">{{ photo.id_product || '-' }}</td>
            <td class="center">{{ photo.id_image || '-' }}</td>
            <td class="center">{{ photo.size || '-' }}</td>
            <td>
              <span v-if="photo.status === 'pending'" class="txt-pending">En attente…</span>
              <span v-if="photo.status === 'success'" class="txt-success">✔ Uploadé</span>
              <span v-if="photo.status === 'not_found'" class="txt-warning">⚠ Réf. introuvable</span>
              <span v-if="photo.status === 'skipped'" class="txt-skip">⏭ Ignoré</span>
              <span v-if="photo.status === 'error'" class="txt-error">✘ {{ photo.erreur }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div>
      <button
      @click="handleRollback"
      :disabled="loading"
    >
      {{
        loading
          ? "Rollback..."
          : "Rollback Prestashop"
      }}
    </button>
  </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Papa from 'papaparse';
import rollbackService from '@/services/rollback.js';

// ─── Services ─────────────────────────────────────────────────────────────────
import {
  validerCSVProduits,
  preparerLigneProduit,
  chargerSchemas,
  importerProduits,
} from './importProduitService.js';

import {
  validerCSVDeclinaisons,
  preparerLigneDeclinaison,
  importerDeclinaisons,
} from './importDeclinaisonService.js';

import {
  validerCSVCommandes,
  preparerLigneCommande,
  importerCommandes,
} from './importCommandeService.js';

import {
  validerFichierZip,
  importerPhotos,
} from './importPhotoService.js';

import Sidebar from '@/components/Sidebar.vue';

// ─── Charger les schémas PrestaShop au montage ────────────────────────────────
chargerSchemas();


///ROLL BACK BUTTON 
const loading = ref(false);

async function handleRollback() {
  const confirmReset = confirm(
    "Confirmer la suppression des données ?"
  );

  if (!confirmReset) {
    return;
  }

  try {
    loading.value = true;

    await rollbackService();

    alert("Rollback terminé");
  } catch (error) {
    console.error(error);

    alert("Erreur rollback");
  } finally {
    loading.value = false;
  }
}

// ─── État des fichiers ────────────────────────────────────────────────────────
const fichierProduits     = ref(null);
const fichierDeclinaisons = ref(null);
const fichierCommandes    = ref(null);
const fichierPhotos       = ref(null);

// ─── Données parsées (tableaux réactifs) ──────────────────────────────────────
const csvProduits     = ref([]);
const csvDeclinaisons = ref([]);
const csvCommandes    = ref([]);

// ─── Rapports ─────────────────────────────────────────────────────────────────
const produitsTraites     = ref([]);
const declinaisonsTraitees = ref([]);
const commandesTraitees   = ref([]);
const photosTraitees      = ref([]);
const totalPhotos         = ref(0);

// ─── Erreurs de validation inline ─────────────────────────────────────────────
const erreursProduits     = ref('');
const erreursDeclinaisons = ref('');
const erreursCommandes    = ref('');
const erreursPhotos       = ref('');

// ─── État global ──────────────────────────────────────────────────────────────
const isImporting  = ref(false);
const statusMessage = ref('');
const importSuccess = ref(true);
const sidebarCollapsed = ref(false);

// ─── Étapes de progression ────────────────────────────────────────────────────
const etapes = ref([
  { label: 'Produits',             etat: 'idle' },
  { label: 'Déclinaisons & Stocks', etat: 'idle' },
  { label: 'Commandes',            etat: 'idle' },
  { label: 'Photos',               etat: 'idle' },
]);
const setEtape = (index, etat) => { etapes.value[index].etat = etat; };

// ─── Computed ─────────────────────────────────────────────────────────────────
const peutImporter = computed(() =>
  (fichierProduits.value     && !erreursProduits.value) ||
  (fichierDeclinaisons.value && !erreursDeclinaisons.value) ||
  (fichierCommandes.value    && !erreursCommandes.value) ||
  (fichierPhotos.value       && !erreursPhotos.value)
);

// ─── Handlers de chargement des fichiers ──────────────────────────────────────

const parseCsv = (file, onSuccess, onError) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => onSuccess(results.data),
    error: (err) => onError(err.message),
  });
};

const onProduitChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  fichierProduits.value = file;
  erreursProduits.value = '';
  parseCsv(
    file,
    (rows) => {
      try {
        validerCSVProduits(rows);
        csvProduits.value = rows;
        produitsTraites.value = rows.map(preparerLigneProduit);
      } catch (e) {
        erreursProduits.value = e.message;
        csvProduits.value = [];
      }
    },
    (msg) => { erreursProduits.value = msg; }
  );
};

const onDeclinaisonChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  fichierDeclinaisons.value = file;
  erreursDeclinaisons.value = '';
  parseCsv(
    file,
    (rows) => {
      try {
        validerCSVDeclinaisons(rows);
        csvDeclinaisons.value = rows;
        declinaisonsTraitees.value = rows.map(preparerLigneDeclinaison);
      } catch (e) {
        erreursDeclinaisons.value = e.message;
        csvDeclinaisons.value = [];
      }
    },
    (msg) => { erreursDeclinaisons.value = msg; }
  );
};

const onCommandeChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  fichierCommandes.value = file;
  erreursCommandes.value = '';
  parseCsv(
    file,
    (rows) => {
      try {
        validerCSVCommandes(rows);
        csvCommandes.value = rows;
        commandesTraitees.value = rows.map(preparerLigneCommande);
      } catch (e) {
        erreursCommandes.value = e.message;
        csvCommandes.value = [];
      }
    },
    (msg) => { erreursCommandes.value = msg; }
  );
};

const onPhotoChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  erreursPhotos.value = '';
  try {
    validerFichierZip(file);
    fichierPhotos.value = file;
  } catch (e) {
    erreursPhotos.value = e.message;
    fichierPhotos.value = null;
  }
};

// ─── Importation globale transactionnelle (Tout ou Rien) ─────────────────────

const lancerImportation = async () => {
  isImporting.value = true;
  importSuccess.value = true;
  statusMessage.value = '';
  const messages = [];
  etapes.value.forEach(e => { e.etat = 'idle'; });

  // Registre global pour le rollback inter-étapes
  // Chaque entrée : { etape: 'produits'|'declinaisons'|'commandes', ids: [...] }
  const registreGlobal = [];
  let echecGlobal = false;
  let messageEchec = '';

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const marquerEtapesCancelled = (depuisIndex) => {
    for (let i = depuisIndex; i < etapes.value.length; i++) {
      if (etapes.value[i].etat === 'idle' || etapes.value[i].etat === 'active') {
        etapes.value[i].etat = 'cancelled';
      }
    }
  };

  // const executerRollbackGlobal = async () => {
  //   statusMessage.value = '⏪ Rollback global en cours — annulation de toutes les étapes réussies…';
  //   // Rollback en ordre inverse
  //   for (let i = registreGlobal.length - 1; i >= 0; i--) {
  //     const { etape, ids } = registreGlobal[i];
  //     try {
  //       if (etape === 'produits')      await rollbackProduits(ids);
  //       if (etape === 'declinaisons')  await rollbackDeclinaisons(ids);
  //       if (etape === 'commandes')     await rollbackCommandes(ids);
  //       // Photos : pas de rollback (fichiers binaires indépendants)
  //       console.log(`↺ Rollback "${etape}" effectué`);
  //     } catch (err) {
  //       console.warn(`⚠️ Rollback partiel sur "${etape}" :`, err);
  //     }
  //   }
  // };

  // ── ÉTAPE 1 : Produits ───────────────────────────────────────────────────────
  if (fichierProduits.value && csvProduits.value.length && !erreursProduits.value) {
    setEtape(0, 'active');
    try {
      const result = await importerProduits(produitsTraites.value, () => {
        produitsTraites.value = [...produitsTraites.value];
      });
      messages.push(`Produits : ${result.message}`);
      if (result.success) {
        setEtape(0, 'done');
        if (result.idsCreés) registreGlobal.push({ etape: 'produits', ids: result.idsCreés });
      } else {
        setEtape(0, 'error');
        echecGlobal = true;
        messageEchec = `Échec Étape 1 (Produits) — import stoppé.\n${result.message}`;
      }
    } catch (e) {
      setEtape(0, 'error');
      echecGlobal = true;
      messageEchec = `Échec Étape 1 (Produits) — import stoppé.\n${e.message}`;
    }
  } else {
    setEtape(0, 'skipped');
  }

  // ── ÉTAPE 2 : Déclinaisons ───────────────────────────────────────────────────
  if (!echecGlobal && fichierDeclinaisons.value && csvDeclinaisons.value.length && !erreursDeclinaisons.value) {
    setEtape(1, 'active');
    try {
      const result = await importerDeclinaisons(declinaisonsTraitees.value, () => {
        declinaisonsTraitees.value = [...declinaisonsTraitees.value];
      });
      messages.push(`Déclinaisons : ${result.message}`);
      if (result.success) {
        setEtape(1, 'done');
        if (result.idsCreés) registreGlobal.push({ etape: 'declinaisons', ids: result.idsCreés });
      } else {
        setEtape(1, 'error');
        echecGlobal = true;
        messageEchec = `Échec Étape 2 (Déclinaisons) — import stoppé.\n${result.message}`;
      }
    } catch (e) {
      setEtape(1, 'error');
      echecGlobal = true;
      messageEchec = `Échec Étape 2 (Déclinaisons) — import stoppé.\n${e.message}`;
    }
  } else if (!echecGlobal) {
    setEtape(1, 'skipped');
  }

  // ── ÉTAPE 3 : Commandes ──────────────────────────────────────────────────────
  if (!echecGlobal && fichierCommandes.value && csvCommandes.value.length && !erreursCommandes.value) {
    setEtape(2, 'active');
    try {
      const result = await importerCommandes(commandesTraitees.value, () => {
        commandesTraitees.value = [...commandesTraitees.value];
      });
      messages.push(`Commandes : ${result.message}`);
      if (result.success) {
        setEtape(2, 'done');
        if (result.idsCreés) registreGlobal.push({ etape: 'commandes', ids: result.idsCreés });
      } else {
        setEtape(2, 'error');
        echecGlobal = true;
        messageEchec = `Échec Étape 3 (Commandes) — import stoppé.\n${result.message}`;
      }
    } catch (e) {
      setEtape(2, 'error');
      echecGlobal = true;
      messageEchec = `Échec Étape 3 (Commandes) — import stoppé.\n${e.message}`;
    }
  } else if (!echecGlobal) {
    setEtape(2, 'skipped');
  }

  // ── ÉTAPE 4 : Photos ─────────────────────────────────────────────────────────
  if (!echecGlobal && fichierPhotos.value && !erreursPhotos.value) {
    setEtape(3, 'active');
    try {
      const result = await importerPhotos(
        fichierPhotos.value,
        (initial) => { photosTraitees.value = initial; },
        (updated)  => { photosTraitees.value = updated; },
        (total)    => { totalPhotos.value = total; }
      );
      photosTraitees.value = result.photosTraitees;
      messages.push(`Photos : ${result.message}`);
      if (result.success) {
        setEtape(3, 'done');
      } else {
        setEtape(3, 'error');
        echecGlobal = true;
        messageEchec = `Échec Étape 4 (Photos) — import stoppé.\n${result.message}`;
      }
    } catch (e) {
      setEtape(3, 'error');
      echecGlobal = true;
      messageEchec = `Échec Étape 4 (Photos) — import stoppé.\n${e.message}`;
    }
  } else if (!echecGlobal) {
    setEtape(3, 'skipped');
  }

  // ── Résolution finale ────────────────────────────────────────────────────────
  if (echecGlobal) {
    importSuccess.value = false;
    marquerEtapesCancelled(0);
    // Rollback de toutes les étapes déjà réussies
    await rollbackService();
    statusMessage.value = `❌ Transaction globale annulée.\n${messageEchec}\n\nToutes les données insérées ont été supprimées (rollback).`;
  } else {
    importSuccess.value = true;
    statusMessage.value = '✅ Import global réussi !\n' + messages.join('\n');
  }

  isImporting.value = false;
};
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────────────────────── */
.import-container {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 24px auto;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #f9f9f9;
}

h2 {
  margin-top: 0;
  font-size: 1.3rem;
  color: #222;
  border-bottom: 2px solid #4ed282;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

/* ─── Grille des cartes de chargement ────────────────────────────────────── */
.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.upload-card {
  background: #fff;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  transition: border-color 0.2s;
}
.upload-card.loaded {
  border-color: #4ed282;
  border-style: solid;
}

.upload-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.upload-card__num {
  background: #4ed282;
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 20px;
}
.upload-card__title {
  font-weight: bold;
  font-size: 14px;
  flex: 1;
}
.badge-ok {
  background: #e6f9ed;
  color: #28a745;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: bold;
}

.file-label {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.file-label input[type="file"] {
  margin-bottom: 6px;
  font-size: 13px;
  max-width: 100%;
}
.file-label span {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.inline-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #dc3545;
  background: #fff5f5;
  border-left: 3px solid #dc3545;
  padding: 6px 8px;
  border-radius: 4px;
  white-space: pre-wrap;
}

/* ─── Barre d'action ─────────────────────────────────────────────────────── */
.action-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.btn-import {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: #4ed282;
  border: none;
  color: #fff;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.btn-import:hover:not(:disabled) { background: #36ba6c; }
.btn-import:disabled { background: #ccc; cursor: not-allowed; }

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hint {
  font-size: 13px;
  color: #999;
}

/* ─── Étapes de progression ──────────────────────────────────────────────── */
.progress-global {
  margin-bottom: 20px;
}
.progress-steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.progress-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  background: #eee;
  color: #888;
  border: 1px solid #ddd;
  transition: all 0.3s;
}
.progress-step.active    { background: #fff3cd; color: #856404; border-color: #ffc107; font-weight: bold; }
.progress-step.done      { background: #e6f9ed; color: #155724; border-color: #4ed282; }
.progress-step.error     { background: #fff5f5; color: #721c24; border-color: #dc3545; }
.progress-step.cancelled { background: #f5f5f5; color: #999;    border-color: #ccc; text-decoration: line-through; }
.progress-step.skipped   { opacity: 0.4; }
.progress-step__num {
  background: currentColor;
  color: #fff;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

/* ─── Statut ─────────────────────────────────────────────────────────────── */
.status-box {
  padding: 14px 16px;
  margin-bottom: 20px;
  border-left: 5px solid;
  border-radius: 4px;
}
.status-box.success { background: #e6f9ed; border-left-color: #28a745; color: #155724; }
.status-box.error   { background: #fdf2f2; border-left-color: #dc3545; color: #721c24; }
.status-pre {
  margin: 4px 0 0;
  font-family: inherit;
  font-size: 13px;
  white-space: pre-wrap;
}

/* ─── Sections de rapport ────────────────────────────────────────────────── */
.report-section {
  margin-top: 28px;
}
.report-section h3 {
  font-size: 1rem;
  color: #333;
  border-left: 4px solid #4ed282;
  padding-left: 10px;
  margin-bottom: 10px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  font-size: 13px;
}
.report-table th,
.report-table td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: left;
}
.report-table th { background: #f1f1f1; font-size: 12px; }
.center { text-align: center; }

/* Lignes colorées par statut */
tr.success      { background: #f3fbf6; }
tr.error        { background: #fff5f5; }
tr.rolled_back  { background: #fffdf0; color: #7c6e10; }
tr.not_found    { background: #fffdf0; }

/* Badges */
.badge {
  background: #007bff;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}
tr.error .badge   { background: #dc3545; }
tr.success .badge { background: #28a745; }
tr.rolled_back .badge { background: #ffc107; color: #333; }

.badge-paid      { background: #28a745; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.badge-abandoned { background: #ffc107; color: #333; padding: 2px 8px; border-radius: 4px; font-size: 11px; }

/* Textes de statut */
.txt-success { color: #28a745; font-weight: bold; }
.txt-error   { color: #dc3545; font-weight: bold; }
.txt-rollback { color: #b78a00; font-style: italic; }
.txt-pending  { color: #666; }
.txt-warning  { color: #e67e22; font-weight: bold; }
.txt-skip     { color: #95a5a6; font-style: italic; }

/* ─── Barre de progression photos ───────────────────────────────────────── */
.progress-section  { margin-bottom: 12px; }
.progress-bar      { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-bottom: 6px; }
.progress-fill     { height: 100%; background: linear-gradient(90deg, #4ed282, #28a745); transition: width 0.3s ease; border-radius: 10px; }
.progress-text     { text-align: center; color: #666; font-size: 13px; margin: 0; }
</style>