<template>
  <div class="import-container">
    <h2>Import Data</h2>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleImport">
          <div class="form-group">
            <label for="file-upload">Select file to import</label>
            <input type="file" id="file-upload" @change="handleFileUpload" accept=".csv, .xls, .xlsx, .xlst, .ods, .ots" class="form-control-file">
            <small class="form-text text-muted">Supported formats: .csv, .xls, .xlsx, .xlst, .ods, .ots</small>
          </div>

          <div class="form-group">
            <label for="entity">Entity</label>
            <select id="entity" name="entity" class="custom-select form-control" v-model="importOptions.entity">
              <option value="categories">Categories</option>
              <option value="products" selected>Products</option>
              <option value="combinations">Combinations</option>
              <option value="customers">Customers</option>
              <option value="addresses">Addresses</option>
              <option value="brands">Brands</option>
              <option value="suppliers">Suppliers</option>
              <option value="alias">Alias</option>
              <option value="store_contacts">Store contacts</option>
            </select>
          </div>

          <div class="form-group">
            <label for="language">Language of the file</label>
            <select id="language" name="language" class="custom-select form-control" v-model="importOptions.language">
              <option value="en">English (English)</option>
              <!-- Add other languages as needed -->
            </select>
            <small class="form-text text-muted">The locale must be installed.</small>
          </div>

          <div class="form-group">
            <label for="field-separator">Field separator</label>
            <input type="text" id="field-separator" v-model="importOptions.fieldSeparator" class="form-control">
            <small class="form-text text-muted">e.g. 1; Blouse; 129.90; 5</small>
          </div>

          <div class="form-group">
            <label for="multiple-value-separator">Multiple value separator</label>
            <input type="text" id="multiple-value-separator" v-model="importOptions.multipleValueSeparator" class="form-control">
            <small class="form-text text-muted">e.g. Blouse; red.jpg, blue.jpg, green.jpg; 129.90</small>
          </div>

          <div class="form-group">
            <p>Delete all alias before import</p>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="delete-alias" id="delete-alias-no" value="false" v-model="importOptions.deleteAliases">
              <label class="form-check-label" for="delete-alias-no">No</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="delete-alias" id="delete-alias-yes" value="true" v-model="importOptions.deleteAliases">
              <label class="form-check-label" for="delete-alias-yes">Yes</label>
            </div>
          </div>

          <div class="form-group form-check">
            <input type="checkbox" class="form-check-input" id="force-ids" v-model="importOptions.forceIds">
            <label class="form-check-label" for="force-ids">Force all ID numbers</label>
          </div>

          <button type="submit" class="btn btn-primary">Import</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import * as XLSX from 'xlsx';

const selectedFile = ref(null);
const importOptions = ref({
  entity: 'products',
  language: 'en',
  fieldSeparator: ';',
  multipleValueSeparator: ',',
  deleteAliases: false,
  forceIds: false,
});

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0];
};

const handleImport = () => {
  if (!selectedFile.value) {
    alert('Please select a file to import.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('Import options:', importOptions.value);
    console.log('Parsed data:', jsonData);
    // Here you would typically send the data to your API
    alert(`Successfully parsed ${jsonData.length} rows. Check the console for the data.`);
  };
  reader.readAsBinaryString(selectedFile.value);
};
</script>

<style scoped>
.import-container {
  padding: 2rem;
}
.card {
  margin-top: 1rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
</style>
