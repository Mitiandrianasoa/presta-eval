<!-- components/ProductTable.vue -->
<template>
  <div>
    <h2>📦 Produits</h2>
    
    <!-- Barre de recherche -->
    <div class="toolbar">
      <input 
        v-model="searchQuery" 
        @input="doSearch" 
        placeholder="🔍 Rechercher un produit..."
      />
      <select v-model="filterCategory" @change="doFilter">
        <option value="">Toutes les catégories</option>
        <option v-for="cat in data.categories" :key="cat.id" :value="cat.id">
          {{ data.getCategoryName(cat.id) }}
        </option>
      </select>
      <button @click="showCreateForm = true" class="btn-add">+ Nouveau</button>
    </div>

    <!-- Message de chargement -->
    <div v-if="data.loading" class="loading">⏳ Chargement...</div>
    <div v-else-if="data.error" class="error">❌ {{ data.error }}</div>
    
    <!-- Formulaire de création/modification -->
    <div v-if="showCreateForm || showEditForm" class="form-overlay">
      <div class="form-container">
        <h3>{{ showEditForm ? '✏️ Modifier' : '➕ Nouveau' }} produit</h3>
        
        <form @submit.prevent="saveProduct">
          <label>Nom :</label>
          <input v-model="form.name" required />
          
          <label>Référence :</label>
          <input v-model="form.reference" />
          
          <label>Prix HT :</label>
          <input v-model="form.price" type="number" step="0.01" required />
          
          <label>Catégorie :</label>
          <select v-model="form.id_category_default" required>
            <option value="">Choisir...</option>
            <option v-for="cat in data.categories" :key="cat.id" :value="cat.id">
              {{ data.getCategoryName(cat.id) }}
            </option>
          </select>
          
          <label>Actif :</label>
          <select v-model="form.active">
            <option value="1">✅ Oui</option>
            <option value="0">❌ Non</option>
          </select>
          
          <div class="form-actions">
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? '⏳...' : '💾 Sauvegarder' }}
            </button>
            <button type="button" @click="closeForm" class="btn-cancel">Annuler</button>
          </div>
        </form>
        
        <div v-if="saveError" class="error-message">❌ {{ saveError }}</div>
      </div>
    </div>
    
    <!-- Tableau des produits -->
    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Référence</th>
          <th>Catégorie</th>
          <th>Prix HT</th>
          <th>Prix TTC</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in displayedProducts" :key="product.id">
          <td>{{ product.id }}</td>
          <td>{{ data.getProductName(product) }}</td>
          <td>{{ product.reference || '—' }}</td>
          <td>
            <span class="category-badge">
              {{ data.getCategoryName(product.id_category_default) }}
            </span>
          </td>
          <td>{{ formatPrice(product.price) }} €</td>
          <td>{{ formatPriceTTC(product.price) }} €</td>
          <td :class="{ 'low-stock': data.getProductStock(product.id) < 5 }">
            {{ data.getProductStock(product.id) }}
          </td>
          <td>
            <!-- ✅ BOUTON MODIFIER -->
            <button @click="openEditForm(product)" title="Modifier">Modifier</button>
            
            <!-- ✅ BOUTON SUPPRIMER -->
            <button @click="deleteProduct(product.id)" title="Supprimer">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Résumé -->
    <div class="summary" v-if="!showCreateForm && !showEditForm">
      {{ displayedProducts.length }} produit(s) affiché(s)
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { dataService } from '../../api/dataService';

// ✅ Service de données
const data = dataService;

// État local
const searchQuery = ref('');
const filterCategory = ref('');
const displayedProducts = ref([]);

// État des formulaires
const showCreateForm = ref(false);
const showEditForm = ref(false);
const saving = ref(false);
const saveError = ref('');
const editingProductId = ref<string | number | null>(null);

// Formulaire
const form = reactive({
  name: '',
  reference: '',
  price: '0',
  id_category_default: '2',
  active: '1'
});

// ✅ FORMATER LES PRIX
function formatPrice(price:any): string {
  return parseFloat(price || '0').toFixed(2);
}

function formatPriceTTC(price:any): string {
  return (parseFloat(price || '0') * 1.2).toFixed(2);
}

// ✅ OUVRIR LE FORMULAIRE DE MODIFICATION
function openEditForm(product: any) {
  editingProductId.value = product.id;
  
  // Pré-remplir le formulaire
  form.name = data.getProductName(product);
  form.reference = product.reference || '';
  form.price = product.price || '0';
  form.id_category_default = product.id_category_default || '2';
  form.active = product.active || '1';
  
  showEditForm.value = true;
}

// ✅ FERMER LE FORMULAIRE
function closeForm() {
  showCreateForm.value = false;
  showEditForm.value = false;
  editingProductId.value = null;
  saveError.value = '';
  
  // Réinitialiser le formulaire
  form.name = '';
  form.reference = '';
  form.price = '0';
  form.id_category_default = '2';
  form.active = '1';
}

// ✅ SAUVEGARDER (CRÉER OU MODIFIER)
async function saveProduct() {
  saving.value = true;
  saveError.value = '';
  
  try {
    const productData = {
      name: {
        language: {
          '1': form.name || '', // Anglais
          '2': form.name || ''  // Français
        }
      },
      reference: form.reference || '',
      price: form.price || '0',
      id_category_default: form.id_category_default || '2',
      active: form.active || '1'
    };
    
    if (showEditForm.value && editingProductId.value) {
      // ✅ MODIFIER AVEC L'API GÉNÉRALISÉE
      console.log('✏️ Modification produit ID:', editingProductId.value);
      await dataService.updateProduct(editingProductId.value, productData);
    } else {
      // ✅ CRÉER AVEC L'API GÉNÉRALISÉE
      console.log('➕ Création nouveau produit');
      await dataService.createProduct(productData);
    }
    
    // Fermer le formulaire et rafraîchir
    closeForm();
    refreshDisplay();
    
  } catch (e: any) {
    saveError.value = e.message;
    console.error('❌ Erreur sauvegarde :', e);
  } finally {
    saving.value = false;
  }
}

// ✅ SUPPRIMER AVEC L'API GÉNÉRALISÉE
async function deleteProduct(productId: string | number) {
  const productName = data.getProductName(
    data.products.find(p => p.id === productId)
  );
  
  if (confirm(`Supprimer "${productName}" ?`)) {
    try {
      console.log('🗑️ Suppression produit ID:', productId);
      await dataService.deleteProduct(productId);
      
      // Rafraîchir l'affichage
      refreshDisplay();
      
    } catch (e: any) {
      console.error('❌ Erreur suppression :', e);
      alert('Erreur lors de la suppression : ' + e.message);
    }
  }
}

// ✅ RAFRAÎCHIR L'AFFICHAGE
function refreshDisplay() {
  let products = data.products;
  
  if (searchQuery.value) {
    products = data.searchProducts(searchQuery.value);
  }
  
  if (filterCategory.value) {
    products = products.filter(p => 
      String(p.id_category_default) === String(filterCategory.value)
    );
  }
  
  displayedProducts.value = products;
}

function doSearch() { refreshDisplay(); }
function doFilter() { refreshDisplay(); }

// ✅ CHARGEMENT INITIAL
onMounted(async () => {
  await data.loadAll();
  refreshDisplay();
});
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 20px; }
.toolbar input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.toolbar select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
th { background: #f8f9fa; font-weight: bold; }
.category-badge { background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
.low-stock { color: red; font-weight: bold; }
.loading, .error { padding: 20px; text-align: center; font-size: 18px; }
.error { color: red; background: #ffebee; border-radius: 4px; }
.summary { margin-top: 10px; color: #666; font-size: 14px; }
button { cursor: pointer; border: none; background: none; font-size: 16px; padding: 5px; }
button:hover { transform: scale(1.2); }
</style>