import { 
  showDeleteModal, 
  createItemCountBadge, 
  validateDriverAndLicense, 
  storage,
  createList,
  navigateBack,
  renderItemsList,
  generateListPDF,
  getNextListId
} from './utils.js';

(function() {
  const STORAGE_KEY = 'currentNewListItems';
  
  // DOM elements
  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const finishBtn = document.getElementById('finishBtn');
  const modal = document.getElementById('metaModal');
  const modalDriverName = document.getElementById('modalDriverName');
  const modalLicensePlate = document.getElementById('modalLicensePlate');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalCancel = document.getElementById('modalCancel');

  // Storage utilities for temporary items
  function loadTemp() {
    return storage.get(STORAGE_KEY, []);
  }
  
  function saveTemp(items) { 
    storage.set(STORAGE_KEY, items); 
  }

  /**
   * Render the items list with delete functionality
   */
  function render(items) {
    renderItemsList(list, items, (text, index) => {
      const updatedItems = loadTemp();
      updatedItems.splice(index, 1);
      saveTemp(updatedItems);
      render(updatedItems);
    });
    
    // Show count in header using shared utility
    const printAreaHeader = document.querySelector('#printArea .list-header');
    const count = items.length;
    if (printAreaHeader) {
      createItemCountBadge('newCountBadge', printAreaHeader, count);
    }
  }

  /**
   * Add new item to the list if valid and unique
   */
  function addItem() {
    const value = input.value.trim();
    if (!value) return;
    const items = loadTemp();
    if (items.includes(value)) { 
      input.value = '';
      return; 
    }
    items.push(value);
    saveTemp(items);
    input.value = '';
    render(items);
  }

  /**
   * Open metadata modal and set up autocomplete
   */
  function openModal() {
    modal.className = 'modal show';
    setTimeout(() => { 
      modalDriverName.focus();
      // Setup autocomplete when modal opens
      if (window.AutocompleteManager) {
        window.AutocompleteManager.setup(modalDriverName, 'drivers');
        window.AutocompleteManager.setup(modalLicensePlate, 'licensePlates');
      }
    }, 0);
  }

  /**
   * Close metadata modal
   */
  function closeModal() {
    modal.className = 'modal hidden';
  }

  /**
   * Submit list with metadata to API
   */
  async function submitMeta() {
    const driverName = modalDriverName.value.trim();
    const licensePlate = modalLicensePlate.value.trim();
    
    if (!validateDriverAndLicense(driverName, licensePlate, modalDriverName, modalLicensePlate)) {
      return;
    }
    
    let items = loadTemp();
    items = Array.from(new Set(items)); // Remove duplicates
    if (!items.length) { 
      alert('Žádné položky k uložení.'); 
      return; 
    }
    
    try {
      const createdList = await createList({ items, driverName, licensePlate });
      
      // Close modal first
      closeModal();
      
      // Generate and download PDF immediately after saving
      if (createdList && createdList.id) {
        // Wait for pdfMake to be available
        if (window.pdfMake) {
          generateListPDF(createdList, `List_${createdList.id}.pdf`);
          
          // Wait a moment for PDF generation before navigation
          setTimeout(() => {
            storage.remove(STORAGE_KEY);
            navigateBack('index.html');
          }, 300);
        } else {
          // Wait a bit for pdfMake to load
          setTimeout(() => {
            if (window.pdfMake) {
              generateListPDF(createdList, `List_${createdList.id}.pdf`);
              setTimeout(() => {
                storage.remove(STORAGE_KEY);
                navigateBack('index.html');
              }, 300);
            } else {
              console.warn('PDF library not available for auto-download');
              storage.remove(STORAGE_KEY);
              navigateBack('index.html');
            }
          }, 500);
        }
      } else {
        storage.remove(STORAGE_KEY);
        navigateBack('index.html');
      }
    } catch (error) {
      alert('Chyba při ukládání.');
    }
  }

  /**
   * Load and display the next list ID in page titles
   */
  async function loadNextId() {
    try {
      const nextId = await getNextListId();
      
      // Update page title
      document.title = `Přepravní Doklad ${nextId}`;
      
      // Update header title
      const headerTitle = document.querySelector('.card-header .title');
      if (headerTitle) {
        headerTitle.textContent = `Přepravní Doklad ${nextId} (Neukončený)`;
      }
    } catch (error) {
      console.error('Failed to load next ID:', error);
      // Keep default titles if loading fails
    }
  }

  // Event listeners
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  finishBtn.addEventListener('click', openModal);
  modalSubmit.addEventListener('click', submitMeta);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeModal(); });
  modalDriverName.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { 
      // Check if autocomplete dropdown is visible and let it handle the event
      const autocompleteInstance = window.AutocompleteManager.instances.get(modalDriverName);
      if (autocompleteInstance && autocompleteInstance.isVisible) {
        return; // Let autocomplete handle the Enter key
      }
      e.preventDefault(); 
      submitMeta(); 
    } 
  });
  modalLicensePlate.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { 
      // Check if autocomplete dropdown is visible and let it handle the event
      const autocompleteInstance = window.AutocompleteManager.instances.get(modalLicensePlate);
      if (autocompleteInstance && autocompleteInstance.isVisible) {
        return; // Let autocomplete handle the Enter key
      }
      e.preventDefault(); 
      submitMeta(); 
    } 
  });

  // Initialize
  loadNextId();
  render(loadTemp());
  
  // Focus on input field when page loads
  input.focus();
})();


