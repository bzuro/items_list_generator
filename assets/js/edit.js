import { 
  getCurrentListId, 
  navigateTo, 
  navigateBack, 
  showDeleteModal, 
  createItemCountBadge, 
  validateDriverAndLicense,
  getList,
  updateList,
  renderItemsList
} from './utils.js';

(function() {
  const id = getCurrentListId();
  if (!id) { navigateTo('index.html'); return; }

  // DOM elements
  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const saveBtn = document.getElementById('saveBtn');
  const backLink = document.getElementById('backLink');
  const driverNameInput = document.getElementById('driverName');
  const licensePlateInput = document.getElementById('licensePlate');
  const printAreaHeader = document.querySelector('#printArea .list-header');

  // State management
  let items = [];
  let originalItems = [];
  let hasUnsavedChanges = false;

  /**
   * Check if current items differ from original and update UI accordingly
   */
  function checkForChanges() {
    const currentItemsStr = JSON.stringify(items.sort());
    const originalItemsStr = JSON.stringify([...originalItems].sort());
    hasUnsavedChanges = currentItemsStr !== originalItemsStr;
    
    // Update save button to indicate unsaved changes
    saveBtn.textContent = hasUnsavedChanges ? 'Save*' : 'Save';
  }

  /**
   * Render the items list with delete functionality
   */
  function render() {
    renderItemsList(list, items, (text, index) => {
      items.splice(index, 1);
      render();
      checkForChanges();
    });

    // Show count in header using shared utility
    const count = items.length;
    if (printAreaHeader) {
      createItemCountBadge('editCountBadge', printAreaHeader, count);
    }
  }

  /**
   * Add new item to the list if valid and unique
   */
  function addItem() {
    const value = input.value.trim();
    if (!value) return;
    if (items.includes(value)) { 
      input.value = '';
      return; 
    }
    items.push(value);
    input.value = '';
    render();
    checkForChanges();
  }

  /**
   * Load list data from API
   */
  async function load() {
    try {
      const data = await getList(id);
      
      // Update page titles with actual ID
      document.title = `Uprav Přepravní Doklad ${id} (Ukončený)`;
      const headerTitle = document.querySelector('.card-header .title');
      if (headerTitle) {
        headerTitle.textContent = `Uprav Přepravní Doklad ${id} (Ukončený)`;
      }
      
      originalItems = Array.isArray(data.items) ? [...data.items] : [];
      items = [...originalItems];
      backLink.href = `view.html?id=${encodeURIComponent(id)}`;
      
      if (driverNameInput && licensePlateInput) {
        driverNameInput.value = data.driverName || '';
        licensePlateInput.value = data.licensePlate || '';
      }
      render();
      checkForChanges();
    } catch (error) {
      alert('List not found');
      navigateTo('index.html');
    }
  }

  /**
   * Save list data to API
   */
  async function save() {
    const driverName = driverNameInput.value.trim();
    const licensePlate = licensePlateInput.value.trim();
    
    if (!validateDriverAndLicense(driverName, licensePlate, driverNameInput, licensePlateInput)) {
      return;
    }
    
    const uniqueItems = Array.from(new Set(items));
    const payload = {
      id: id,
      items: uniqueItems,
      driverName: driverName,
      licensePlate: licensePlate
    };

    try {
      await updateList(id, payload);
      navigateBack(`view.html?id=${encodeURIComponent(id)}`);
    } catch (error) {
      alert('Failed to save');
    }
  }

  // Event listeners
  input.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      addItem(); 
    } 
  });

  // Enhanced back button using shared navigation utility
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateBack(`view.html?id=${encodeURIComponent(id)}`);
    });
  }

  saveBtn.addEventListener('click', save);
  
  // Initialize autocomplete when everything is ready
  function initAutocomplete() {
    if (!window.AutocompleteManager) {
      // Retry after a short delay if AutocompleteManager isn't ready
      setTimeout(initAutocomplete, 100);
      return;
    }
    
    if (!driverNameInput || !licensePlateInput) {
      console.warn('Driver or license plate inputs not found');
      return;
    }
    
    // Set up autocomplete - the manager should have data loaded by now
    try {
      window.AutocompleteManager.setup(driverNameInput, 'drivers');
      window.AutocompleteManager.setup(licensePlateInput, 'licensePlates');
    } catch (error) {
      console.error('Error setting up autocomplete:', error);
    }
  }
  
  // Start autocomplete initialization after a brief delay
  setTimeout(initAutocomplete, 300);
  
  load();
  
  // Focus on input field when page loads
  setTimeout(() => input.focus(), 100);
})();