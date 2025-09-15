(function() {
  const STORAGE_KEY = 'currentNewListItems';
  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const finishBtn = document.getElementById('finishBtn');
  const modal = document.getElementById('metaModal');
  const modalDriverName = document.getElementById('modalDriverName');
  const modalLicensePlate = document.getElementById('modalLicensePlate');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalCancel = document.getElementById('modalCancel');

  // Autocomplete cache
  let driversCache = [];
  let licensePlatesCache = [];

  // Load autocomplete data
  async function loadAutocompleteData() {
    try {
      const [driversRes, licensePlatesRes] = await Promise.all([
        fetch('api/drivers.php'),
        fetch('api/license_plates.php')
      ]);
      
      if (driversRes.ok) {
        driversCache = await driversRes.json();
      }
      
      if (licensePlatesRes.ok) {
        licensePlatesCache = await licensePlatesRes.json();
      }
    } catch (e) {
      console.log('Failed to load autocomplete data:', e);
    }
  }

  // Simple autocomplete implementation
  function setupAutocomplete(input, suggestions) {
    let currentFocus = -1;
    let autocompleteDiv = null;

    function closeAutoComplete() {
      if (autocompleteDiv) {
        autocompleteDiv.remove();
        autocompleteDiv = null;
      }
      currentFocus = -1;
    }

    function showSuggestions(value) {
      closeAutoComplete();
      if (!value) return;

      const filtered = suggestions.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions

      if (filtered.length === 0) return;

      autocompleteDiv = document.createElement('div');
      autocompleteDiv.className = 'autocomplete-items';
      autocompleteDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid #d7dbe6;
        border-top: none;
        border-radius: 0 0 10px 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
      `;

      filtered.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = `
          padding: 0.75rem 0.9rem;
          cursor: pointer;
          border-bottom: 1px solid #eef0f5;
        `;
        itemDiv.innerHTML = item.replace(new RegExp(value, 'gi'), `<strong>$&</strong>`);
        
        itemDiv.addEventListener('mouseenter', () => {
          currentFocus = index;
          updateActiveItem();
        });
        
        itemDiv.addEventListener('click', () => {
          input.value = item;
          closeAutoComplete();
        });
        
        autocompleteDiv.appendChild(itemDiv);
      });

      // Position relative to input
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = '100%';
      
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(autocompleteDiv);
    }

    function updateActiveItem() {
      if (!autocompleteDiv) return;
      const items = autocompleteDiv.querySelectorAll('div');
      items.forEach((item, index) => {
        item.style.backgroundColor = index === currentFocus ? '#f0f4ff' : '#fff';
      });
    }

    input.addEventListener('input', (e) => {
      showSuggestions(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (!autocompleteDiv) return;
      const items = autocompleteDiv.querySelectorAll('div');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus = Math.min(currentFocus + 1, items.length - 1);
        updateActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus = Math.max(currentFocus - 1, -1);
        updateActiveItem();
      } else if (e.key === 'Enter' && currentFocus >= 0) {
        e.preventDefault();
        items[currentFocus].click();
      } else if (e.key === 'Escape') {
        closeAutoComplete();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && (!autocompleteDiv || !autocompleteDiv.contains(e.target))) {
        closeAutoComplete();
      }
    });
  }

  function loadTemp() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch { return []; }
  }
  function saveTemp(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items yet.';
      list.appendChild(empty);
    } else {
      items.forEach(text => {
        const li = document.createElement('li');
        li.className = 'item';
        const span = document.createElement('div');
        span.className = 'text';
        span.textContent = text;
        li.appendChild(span);
        list.appendChild(li);
      });
    }
    // show count in header
    const printAreaHeader = document.querySelector('#printArea .list-header');
    const count = items.length;
    if (printAreaHeader) {
      let badge = document.getElementById('newCountBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'newCountBadge';
        badge.className = 'hint';
        badge.style.marginLeft = 'auto';
        badge.style.fontWeight = '700';
        badge.style.fontSize = '1.1rem';
        printAreaHeader.style.display = 'flex';
        printAreaHeader.style.alignItems = 'center';
        printAreaHeader.appendChild(badge);
      }
      badge.innerHTML = `<span style=\"font-size:1.4rem; font-weight:800;\">${count}</span> <span style=\"font-size:.9rem; font-weight:400;\">items</span>`;
    }
  }

  function addItem() {
    const value = input.value.trim();
    if (!value) return;
    const items = loadTemp();
    if (items.includes(value)) { return; }
    items.push(value);
    saveTemp(items);
    input.value = '';
    render(items);
  }

  function openModal() {
    modal.style.display = 'flex';
    setTimeout(() => { modalDriverName.focus(); }, 0);
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  async function submitMeta() {
    const driverName = modalDriverName.value.trim();
    const licensePlate = modalLicensePlate.value.trim();
    let items = loadTemp();
    // dedupe case-sensitive
    items = Array.from(new Set(items));
    if (!items.length) { alert('No items to save.'); return; }
    const res = await fetch('api/lists.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, driverName, licensePlate })
    });
    if (!res.ok) { alert('Failed to save'); return; }
    const saved = await res.json();
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = `index.html`;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  finishBtn.addEventListener('click', openModal);
  modalSubmit.addEventListener('click', submitMeta);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modalDriverName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });
  modalLicensePlate.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitMeta(); } });

  // Initialize autocomplete - DISABLED FOR NOW
  // loadAutocompleteData().then(() => {
  //   setupAutocomplete(modalDriverName, driversCache);
  //   setupAutocomplete(modalLicensePlate, licensePlatesCache);
  // });

  render(loadTemp());
})();


