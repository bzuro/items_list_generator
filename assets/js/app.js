(function() {
  const STORAGE_KEY = 'simpleListItems';
  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const exportBtn = document.getElementById('exportPdfBtn');
  const clearBtn = document.getElementById('clearBtn');
  const dateEl = document.getElementById('listDate');

  function formatNow() {
    const now = new Date();
    return now.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items yet.';
      list.appendChild(empty);
      return;
    }
    items.forEach((text, index) => {
      const li = document.createElement('li');
      li.className = 'item';

      const span = document.createElement('div');
      span.className = 'text';
      span.textContent = text;

      li.appendChild(span);
      list.appendChild(li);
    });
  }

  function addItemFromInput() {
    const value = input.value.trim();
    if (!value) return;
    const items = loadItems();
    items.push(value);
    saveItems(items);
    input.value = '';
    render(items);
  }

  function clearAll() {
    if (!confirm('Clear all items?')) return;
    saveItems([]);
    render([]);
  }

  function exportPdf() {
    const element = document.getElementById('printArea');
    const opt = {
      margin:       10,
      filename:     `MyList_${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItemFromInput();
    }
  });
  exportBtn.addEventListener('click', exportPdf);
  clearBtn.addEventListener('click', clearAll);

  dateEl.textContent = formatNow();
  render(loadItems());
})();


