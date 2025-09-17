import { 
  showDeleteModal, 
  createItemCountBadge, 
  validateDriverAndLicense, 
  storage,
  createList,
  navigateBack,
  renderItemsList
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
      alert('No items to save.'); 
      return; 
    }
    
    try {
      await createList({ items, driverName, licensePlate });
      storage.remove(STORAGE_KEY);
      navigateBack('index.html');
    } catch (error) {
      alert('Failed to save');
    }
  }

  // Event listeners
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  finishBtn.addEventListener('click', openModal);
  modalSubmit.addEventListener('click', submitMeta);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modalDriverName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });
  modalLicensePlate.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });

  // Initialize with temporary items
  render(loadTemp());
})();


