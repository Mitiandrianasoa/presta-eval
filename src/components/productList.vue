<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useProductStore } from '../stores/productStore';

const store = useProductStore();

// État pour le formulaire
const showForm = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);

// Données du formulaire
const formData = ref({
  name: '',
  price: '',
  reference: '',
  categoryId: '',
  quantity: 0,
  active: true,
  image: null as File | null
});

onMounted(() => {
  store.fetchProducts();
});

// Réinitialiser le formulaire
const resetForm = () => {
  formData.value = {
    name: '',
    price: '',
    reference: '',
    categoryId: '',
    quantity: 0,
    active: true,
    image: null
  };
  isEditing.value = false;
  editingId.value = null;
  showForm.value = false;
};
// ✅ Fonction de formatage des prix - version corrigée
const formatPrice = (price: any): string => {
  // Si le prix est undefined, null, ou une chaîne vide
  if (price === undefined || price === null || price === '') {
    return '0,00';
  }
  
  // Convertir en nombre (gère les chaînes comme "13.900000")
  let numPrice: number;
  if (typeof price === 'string') {
    // Remplacer les virgules par des points pour la conversion
    numPrice = parseFloat(price.replace(',', '.'));
  } else {
    numPrice = Number(price);
  }
  
  // Vérifier si la conversion a fonctionné
  if (isNaN(numPrice)) {
    return '0,00';
  }
  
  // Arrondir à 2 décimales et formater
  return numPrice.toFixed(2)
    // .replace('.', ',') // Format français : virgule comme séparateur décimal
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // Espace comme séparateur de milliers
};

// ✅ Fonction pour le prix HT - version simplifiée
const formatPriceHT = (product: any): string => {
  // Essayer différentes propriétés où le prix pourrait être stocké
  const price = product.price || product.price_tax_excl || 0;
  return formatPrice(price);
};


// ✅ Fonction pour formater le prix TTC
const formatPriceTTC = (product: any): string => {
  const price = parseFloat(product.price || 0);
  const taxRate = parseFloat(product.tax_rate || 20); // Taux de TVA par défaut 20%
  const priceTTC = price * (1 + taxRate / 100);
  return formatPrice(priceTTC);
};

// Obtenir l'URL de l'image du produit
const getProductImageUrl = (product: any) => {
  if (product.default_image) {
    // Construire l'URL de l'image selon la configuration PrestaShop
    return `${import.meta.env.VITE_API_BASE_URL || '/api'}/images/products/${product.id}/${product.default_image}/small_default`;
  }
  return null;
};

// Formater le prix avec taxe
const getPriceWithTax = (product: any) => {
  const price = parseFloat(product.price || 0);
  const taxRate = parseFloat(product.tax_rate || 20); // Taux de TVA par défaut 20%
  return (price * (1 + taxRate / 100)).toFixed(2);
};

// Obtenir le nom de la catégorie
const getCategoryName = (product: any) => {
  if (product.associations?.categories?.[0]) {
    // Si vous avez les détails de la catégorie
    return product.associations.categories[0].name || 
           `Catégorie ${product.associations.categories[0].id}`;
  }
  // Fallback : chercher dans le produit directement
  return product.category_name || product.id_category_default || 'Non catégorisé';
};

// Obtenir le statut en texte
const getProductStatus = (product: any) => {
  return product.active === '1' || product.active === true ? 'Actif' : 'Inactif';
};

// Ouvrir le formulaire d'ajout
const openAddForm = () => {
  resetForm();
  showForm.value = true;
};

// Ouvrir le formulaire de modification
const openEditForm = (product: any) => {
  isEditing.value = true;
  editingId.value = product.id;
  formData.value = {
    name: product.name?.[0]?.value || '',
    price: product.price || '',
    reference: product.reference || '',
    categoryId: product.id_category_default || '',
    quantity: product.quantity || 0,
    active: product.active === '1' || product.active === true,
    image: null
  };
  showForm.value = true;
};

// Gérer l'upload d'image
const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    formData.value.image = input.files[0];
  }
};

// Soumettre le formulaire
const submitForm = async () => {
  try {
    const productData = new FormData();
    
    // Ajouter les données de base du produit
    const productJson = {
      product: {
        name: [
          {
            id: 1,
            value: formData.value.name
          }
        ],
        price: formData.value.price,
        reference: formData.value.reference,
        id_category_default: formData.value.categoryId,
        quantity: formData.value.quantity,
        active: formData.value.active ? '1' : '0'
      }
    };
    
    productData.append('product', JSON.stringify(productJson.product));
    
    // Ajouter l'image si présente
    if (formData.value.image) {
      productData.append('image', formData.value.image);
    }

    if (isEditing.value && editingId.value) {
      await store.updateProduct(editingId.value, productData);
    } else {
      await store.createProduct(productData);
    }
    
    resetForm();
  } catch (error) {
    console.error('Erreur lors de la soumission:', error);
    alert('Une erreur est survenue');
  }
};

// Supprimer un produit
const deleteProduct = async (id: number) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
    try {
      await store.deleteProduct(id);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  }
};
</script>

<template>
  <div class="products-container">
    <h2>Gestion des Produits</h2>
    
    <!-- Bouton Ajouter -->
    <button 
      v-if="!showForm" 
      @click="openAddForm" 
      class="btn btn-add"
    >
      + Ajouter un produit
    </button>

    <!-- Formulaire d'ajout/modification -->
    <div v-if="showForm" class="product-form">
      <h3>{{ isEditing ? 'Modifier le produit' : 'Nouveau produit' }}</h3>
      
      <form @submit.prevent="submitForm">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Nom *</label>
            <input 
              id="name" 
              v-model="formData.name" 
              type="text" 
              required
              placeholder="Nom du produit"
            />
          </div>
          
          <div class="form-group">
            <label for="reference">Référence *</label>
            <input 
              id="reference" 
              v-model="formData.reference" 
              type="text" 
              required
              placeholder="Référence"
            />
          </div>
          
          <div class="form-group">
            <label for="price">Prix HT *</label>
            <input 
              id="price" 
              v-model="formData.price" 
              type="number" 
              step="0.01" 
              required
              placeholder="Prix HT en €"
            />
          </div>
          
          <div class="form-group">
            <label for="category">Catégorie</label>
            <input 
              id="category" 
              v-model="formData.categoryId" 
              type="text" 
              placeholder="ID de la catégorie"
            />
          </div>
          
          <div class="form-group">
            <label for="quantity">Quantité</label>
            <input 
              id="quantity" 
              v-model="formData.quantity" 
              type="number" 
              min="0"
              placeholder="Quantité en stock"
            />
          </div>
          
          <div class="form-group">
            <label for="active">Statut</label>
            <select id="active" v-model="formData.active">
              <option :value="true">Actif</option>
              <option :value="false">Inactif</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="image">Image</label>
            <input 
              id="image" 
              type="file" 
              accept="image/*"
              @change="handleImageUpload"
            />
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-save">
            {{ isEditing ? 'Mettre à jour' : 'Créer le produit' }}
          </button>
          <button type="button" @click="resetForm" class="btn btn-cancel">
            Annuler
          </button>
        </div>
      </form>
    </div>

    <!-- Tableau des produits -->
    <div class="table-container">
      <table class="products-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Image</th>
            <th>Nom</th>
            <th>Référence</th>
            <th>Catégorie</th>
            <th>Prix HT</th>
            <th>Prix TTC</th>
            <th>Quantité</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in store.products" :key="product.id">
            <td class="cell-id">{{ product.id }}</td>
            
            <td class="cell-image">
              <img 
                v-if="getProductImageUrl(product)" 
                :src="getProductImageUrl(product)" 
                :alt="product.name?.[0]?.value"
                class="product-thumbnail"
                @error="handleImageError"
              />
              <div v-else class="no-image">
                <span>📷</span>
              </div>
            </td>
            
            <td class="cell-name">
              {{ product.name?.[0]?.value || 'Nom indisponible' }}
            </td>
            
            <td class="cell-reference">
              {{ product.reference || 'N/A' }}
            </td>
            
            <td class="cell-category">
              {{ getCategoryName(product) }}
            </td>
            
            <td class="cell-price">
            {{ formatPriceHT(product) }} €
            </td>
            
            <td class="cell-price-tax">
            {{ formatPriceTTC(product) }} €
            </td>

            <td class="cell-quantity">
              <span :class="{ 'low-stock': product.quantity < 5 }">
                {{ product.quantity || 0 }}
              </span>
            </td>
            
            <td class="cell-status">
              <span :class="['status-badge', product.active === '1' ? 'status-active' : 'status-inactive']">
                {{ getProductStatus(product) }}
              </span>
            </td>
            
            <td class="cell-actions">
              <button @click="openEditForm(product)" class="btn btn-edit" title="Modifier">
                ✏️
              </button>
              <button @click="deleteProduct(product.id)" class="btn btn-delete" title="Supprimer">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Message si aucun produit -->
    <p v-if="store.products.length === 0" class="no-products">
      Aucun produit trouvé. Cliquez sur "Ajouter un produit" pour commencer.
    </p>
  </div>
</template>

<style scoped>
.products-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

/* Formulaire */
.product-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

/* Tableau */
.table-container {
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 8px;
}

.products-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.products-table thead {
  background: #f8f9fa;
}

.products-table th {
  padding: 12px 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.products-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.products-table tbody tr:hover {
  background-color: #f8f9fa;
}

.cell-id {
  font-weight: 600;
  color: #666;
}

.cell-image {
  width: 60px;
}

.product-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.no-image {
  width: 50px;
  height: 50px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.cell-name {
  font-weight: 500;
  min-width: 150px;
}

.cell-price,
.cell-price-tax {
  font-family: monospace;
  color: #2c3e50;
}

.cell-category {
  color: #666;
}

.low-stock {
  color: #e74c3c;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

/* Boutons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-add {
  background-color: #4CAF50;
  color: white;
  margin-bottom: 20px;
  font-weight: 600;
}

.btn-edit {
  background: none;
  font-size: 18px;
  padding: 5px;
  margin-right: 5px;
}

.btn-delete {
  background: none;
  font-size: 18px;
  padding: 5px;
}

.btn-edit:hover,
.btn-delete:hover {
  transform: scale(1.2);
}

.btn-save {
  background-color: #4CAF50;
  color: white;
  font-weight: 600;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.cell-actions {
  white-space: nowrap;
}

.no-products {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px;
}

/* Responsive */
@media (max-width: 768px) {
  .products-table {
    font-size: 12px;
  }
  
  .products-table th,
  .products-table td {
    padding: 8px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>