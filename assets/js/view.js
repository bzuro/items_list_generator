import { 
  getCurrentListId, 
  navigateTo, 
  setupPageRefreshHandlers, 
  createItemCountBadge, 
  generateListPDF, 
  formatDate,
  getList,
  renderReadOnlyList
} from './utils.js';

(function() {
  const id = getCurrentListId();
  if (!id) { navigateTo('index.html'); return; }
  
  // DOM elements
  const itemsEl = document.getElementById('items');
  const metaEl = document.getElementById('meta');
//   const editLink = document.getElementById('editLink');
  const exportBtn = document.getElementById('exportPdfBtn');
  const listHeader = document.querySelector('.list-header');
  const listTitleEl = document.getElementById('listTitle');
  const pageHeaderTitleEl = document.querySelector('.card-header .title');
  let currentData = null;

  /**
   * Render items list
   */
  function renderItems(items) {
    renderReadOnlyList(itemsEl, items);
  }

  /**
   * Load and display list data
   */
  async function load() {
    try {
      const data = await getList(id);
      
      // Set page title
      const seqName = String(data.id || '');
      if (pageHeaderTitleEl) {
        pageHeaderTitleEl.textContent = seqName ? `Přepravní Doklad ${seqName} (Ukončený)` : 'Přepravní Doklad (Ukončený)';
      }
      
      // Update document title as well
      if (seqName) {
        document.title = `Přepravní Doklad ${seqName}`;
      }
      if (listTitleEl) {
        listTitleEl.textContent = 'Položky k odeslání';
      }
      
      currentData = data;
      const count = Array.isArray(data.items) ? data.items.length : 0;
      const created = formatDate(data.createdAt);
      const driver = data.driverName || '';
      const spz = data.licensePlate || '';
      
      // Display metadata
      metaEl.innerHTML = `
    <div class="metadata-container">
      <div class="metadata-field metadata-field-wide">
        <span class="metadata-label">Řidič:</span>
        <span class="metadata-value">${driver || '-'}</span>
      </div>

      <div class="metadata-field metadata-field-medium">
        <span class="metadata-label">SPZ:</span>
        <span class="metadata-value">${spz || '-'}</span>
      </div>

      <div class="metadata-field metadata-field-large">
        <span class="metadata-label">Dátum:</span>
        <span class="metadata-value">${created}</span>
      </div>
    </div>
  `;
    //   editLink.href = `edit.html?id=${encodeURIComponent(id)}`;
      
      // Add count badge using shared utility
      if (listHeader) {
        createItemCountBadge('countBadge', listHeader, count);
      }
      
      renderItems(data.items || []);
      
      // Auto-export if hash is present
      if (window.location.hash === '#export') {
        setTimeout(() => exportPdf(), 100);
      }
    } catch (error) {
      alert('Not found');
      navigateTo('index.html');
    }
  }

  /**
   * Export current list as PDF
   */
  function exportPdf() {
    if (!currentData) {
      alert('No data to export');
      return;
    }
    generateListPDF(currentData, `List_${id}.pdf`);
  }

  // Event listeners
  exportBtn.addEventListener('click', exportPdf);
  
  // Set up page refresh handlers using shared utility
  setupPageRefreshHandlers(load);
  
  // Initialize
  load();
})();


