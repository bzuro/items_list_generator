import { 
  setupPageRefreshHandlers, 
  PDFDownload,
  PDFPrint,
  formatDate,
  getAllLists
} from './utils.js';

(function() {
  // DOM elements
  const tableBody = document.getElementById('listsTableBody');
  const emptyEl = document.getElementById('listsEmpty');
  const thId = document.getElementById('th-id');
  const thDriver = document.getElementById('th-driver');
  const thSpz = document.getElementById('th-spz');
  const thCount = document.getElementById('th-count');
  const thDatetime = document.getElementById('th-datetime');

  /**
   * Create a table row for a list item
   */
  function createRow(list, seqId) {
    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.addEventListener('click', () => { 
      window.location.href = `view.html?id=${encodeURIComponent(list.id)}`; 
    });
    
    // Create table cells
    const cells = [
      { content: String(seqId) },
      { content: list.driverName || '' },
      { content: list.licensePlate || '' },
      { content: String((Array.isArray(list.items) ? list.items.length : 0)) },
      { content: formatDate(list.createdAt || list.updatedAt) }
    ];

    cells.forEach(({ content }) => {
      const td = document.createElement('td');
      td.className = 'table-cell';
      td.textContent = content;
      tr.appendChild(td);
    });

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn export-btn-spacing';
    exportBtn.type = 'button';
    exportBtn.textContent = 'Stáhnout';
    exportBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const res = await fetch(`api/lists.php?id=${encodeURIComponent(list.id)}`);
        if (!res.ok) throw new Error('Failed to load list');
        const data = await res.json();
        
        PDFDownload(data, `List_${list.id}.pdf`);
      } catch (err) {
        alert('Export failed');
        console.error(err);
      }
    });

    // Print button
    const printBtn = document.createElement('button');
    printBtn.className = 'btn export-btn-spacing';
    printBtn.type = 'button';
    printBtn.textContent = 'Tlačiť';
    printBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const res = await fetch(`api/lists.php?id=${encodeURIComponent(list.id)}`);
        if (!res.ok) throw new Error('Failed to load list');
        const data = await res.json();
        
        PDFPrint(data);
      } catch (err) {
        alert('Print failed');
        console.error(err);
      }
    });

    // Edit link
    // const editLink = document.createElement('a');
    // editLink.className = 'btn';
    // editLink.href = `edit.html?id=${encodeURIComponent(list.id)}`;
    // editLink.textContent = 'Edit';
    // editLink.addEventListener('click', (e) => { e.stopPropagation(); });

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(exportBtn);
    actions.appendChild(printBtn);
    // actions.appendChild(editLink);

    const tdActions = document.createElement('td');
    tdActions.className = 'table-actions';
    tdActions.appendChild(actions);

    // Assemble row
    tr.appendChild(tdActions);
    return tr;
  }

  // Sorting state
  let currentSort = { key: 'seqId', dir: 'desc' };

  /**
   * Sort lists by the specified criteria
   */
  function sortLists(lists) {
    const k = currentSort.key;
    const dir = currentSort.dir === 'asc' ? 1 : -1;
    return lists.slice().sort((a, b) => {
      let av, bv;
      if (k === 'seqId') { 
        av = a._seqId; 
        bv = b._seqId; 
      } else if (k === 'driver') { 
        av = (a.driverName || '').toLowerCase(); 
        bv = (b.driverName || '').toLowerCase(); 
      } else if (k === 'spz') { 
        av = (a.licensePlate || '').toLowerCase(); 
        bv = (b.licensePlate || '').toLowerCase(); 
      } else if (k === 'count') { 
        av = (Array.isArray(a.items)?a.items.length:0); 
        bv = (Array.isArray(b.items)?b.items.length:0); 
      } else if (k === 'datetime') { 
        av = new Date(a.createdAt || a.updatedAt || 0).getTime(); 
        bv = new Date(b.createdAt || b.updatedAt || 0).getTime(); 
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  /**
   * Render the lists table
   */
  function renderTable(lists) {
    tableBody.innerHTML = '';
    if (!lists.length) { 
      emptyEl.className = 'show'; 
      return; 
    }
    emptyEl.className = 'hidden';
    const sorted = sortLists(lists);
    sorted.forEach((list, i) => {
      const tr = createRow(list, list._seqId);
      tableBody.appendChild(tr);
    });
  }

  /**
   * Load lists from API and set up sorting
   */
  async function loadLists() {
    try {
      const lists = await getAllLists();
      
      // Assign sequential IDs
      const withSeq = lists.map((x) => Object.assign({}, x, { _seqId: x.id }));
      renderTable(withSeq);
      
      // Set up column sorting
      thId.onclick = () => { 
        currentSort = { key: 'seqId', dir: currentSort.key==='seqId' && currentSort.dir==='desc' ? 'asc':'desc' }; 
        renderTable(withSeq); 
      };
      thDriver.onclick = () => { 
        currentSort = { key: 'driver', dir: currentSort.key==='driver' && currentSort.dir==='asc' ? 'desc':'asc' }; 
        renderTable(withSeq); 
      };
      thSpz.onclick = () => { 
        currentSort = { key: 'spz', dir: currentSort.key==='spz' && currentSort.dir==='asc' ? 'desc':'asc' }; 
        renderTable(withSeq); 
      };
      thCount.onclick = () => { 
        currentSort = { key: 'count', dir: currentSort.key==='count' && currentSort.dir==='asc' ? 'desc':'asc' }; 
        renderTable(withSeq); 
      };
      thDatetime.onclick = () => { 
        currentSort = { key: 'datetime', dir: currentSort.key==='datetime' && currentSort.dir==='asc' ? 'desc':'asc' }; 
        renderTable(withSeq); 
      };
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  }

  // Set up page refresh handlers using shared utility
  setupPageRefreshHandlers(loadLists);

  // Initialize
  loadLists();
})();


