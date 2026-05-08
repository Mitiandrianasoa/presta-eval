<template>
  <div>
    <!-- ✅ ACCÈS DIRECT à TOUT ce que vous voulez -->
    <div v-for="product in products" :key="product.id">
      <h3>{{ product.name }}</h3>
      <p>id : {{ product.id }}</p>
      
      <!-- ✅ Afficher TOUT pour voir ce qui est disponible -->
      <details>
        <summary>Voir toutes les données</summary>
        <pre>{{ product }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { simpleApi } from '../../api/SimpleApi';

const products = ref([]);

// ✅ Chargez TOUT d'un coup
onMounted(async () => {
  products.value = await simpleApi.getAllData('/categories?display=full');
  
  console.log('Données disponibles :', Object.keys(products.value[0]));
});
</script>