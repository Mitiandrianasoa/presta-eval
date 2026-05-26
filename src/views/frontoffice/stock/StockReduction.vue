<script setup lang="ts">
import { ref } from 'vue';
import { useStockStore } from '../../../stores/stock/stockStore';
import { useCategoryStore } from '../../../stores/category/CategoryStore';

const stockStore = useStockStore();
const categoryStore = useCategoryStore();

const adminPassword = ref('');
const passwordVerified = ref(false);
const correctPassword = 'admin'; // Mot de passe admin statique

const reductionValue = ref(0);
const selectedCategoryId = ref<number | null>(null);
const loading = ref(false);
const report = ref<{ total: number; realised: number } | null>(null);
const error = ref<string | null>(null);

const verifyPassword = () => {
  if (adminPassword.value === correctPassword) {
    passwordVerified.value = true;
    categoryStore.fetchAll(); // Charger les catégories après vérification
  } else {
    alert('Mot de passe incorrect.');
  }
};

const handleStockReduction = async () => {
  if (!selectedCategoryId.value || reductionValue.value <= 0) {
    error.value = 'Veuillez sélectionner une catégorie et entrer une valeur de réduction positive.';
    return;
  }

  loading.value = true;
  error.value = null;
  report.value = null;

  try {
    const result = await stockStore.reduceStockForCategory(selectedCategoryId.value, reductionValue.value);
    report.value = result;
  } catch (e: any) {
    error.value = `Une erreur est survenue : ${e.message}`;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="stock-reduction-container">
    <h2>Réduction de Stock par Catégorie</h2>

    <!-- Section mot de passe -->
    <div v-if="!passwordVerified" class="password-gate">
      <h3>Veuillez entrer le mot de passe administrateur</h3>
      <form @submit.prevent="verifyPassword" class="form-inline">
        <input v-model="adminPassword" type="password" placeholder="Mot de passe" required />
        <button type="submit" class="btn-primary">Valider</button>
      </form>
    </div>

    <!-- Section principale -->
    <div v-else>
      <form @submit.prevent="handleStockReduction" class="form">
        <div class="form-group">
          <label for="reduction-value">Nombre à réduire</label>
          <input id="reduction-value" v-model.number="reductionValue" type="number" min="1" placeholder="Ex: 5" required />
        </div>

        <div class="form-group">
          <label for="category-select">Catégorie</label>
          <select id="category-select" v-model="selectedCategoryId" required>
            <option :value="null" disabled>-- Choisir une catégorie --</option>
            <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div class="actions">
          <button type="submit" class="btn-save" :disabled="loading">
            {{ loading ? 'En cours...' : 'Lancer la réduction' }}
          </button>
        </div>
      </form>

      <!-- Section Rapport -->
      <div v-if="report" class="report-card">
        <h3>Rapport de Réduction</h3>
        <div class="report-item">
          <span>Réduction théorique totale :</span>
          <span class="report-value">{{ report.total }}</span>
        </div>
        <div class="report-item">
          <span>Réduction réellement effectuée :</span>
          <span class="report-value realised">{{ report.realised }}</span>
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-reduction-container {
  padding: 20px;
  max-width: 700px;
  margin: auto;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h2, h3 {
  text-align: center;
  color: #333;
}

.password-gate {
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}

.form-inline {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form input, .form select {
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn-primary, .btn-save {
  padding: 12px 25px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-primary:hover {
  background-color: #0056b3;
}

.btn-save {
  background: #28a745;
  color: white;
}
.btn-save:hover {
  background: #218838;
}
.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.report-card {
  margin-top: 30px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: 5px solid #007bff;
  border-radius: 5px;
}

.report-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 16px;
  border-bottom: 1px solid #f0f0f0;
}
.report-item:last-child {
  border-bottom: none;
}

.report-value {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}
.report-value.realised {
  color: #28a745;
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
}
</style>
