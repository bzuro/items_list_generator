(function() {
  function getId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('id');
  }
  const id = getId();
  if (!id) { window.location.replace('index.html'); }

  const input = document.getElementById('itemInput');
  const list = document.getElementById('items');
  const saveBtn = document.getElementById('saveBtn');
  const backLink = document.getElementById('backLink');
  const driverNameInput = document.getElementById('driverName');
  const licensePlateInput = document.getElementById('licensePlate');
  const printAreaHeader = document.querySelector('#printArea .list-header');

  // Autocomplete cache
  let driversCache = [];
  let licensePlatesCache = [];

  let items = [];

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

  function render() {
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items yet.';
      list.appendChild(empty);
    } else {
      items.forEach((text, i) => {
        const li = document.createElement('li');
        li.className = 'item';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        const span = document.createElement('div');
        span.className = 'text';
        span.textContent = text;
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.title = 'Delete';
        delBtn.textContent = '🗑️';
        delBtn.style.color = '#a33';
        delBtn.style.background = 'transparent';
        delBtn.style.border = 'none';
        delBtn.style.cursor = 'pointer';
        delBtn.style.padding = '0 .25rem';
        delBtn.style.fontSize = '0.95rem';
        const deleteModal = document.getElementById('deleteModal');
        const deleteConfirm = document.getElementById('deleteConfirm');
        const deleteCancel = document.getElementById('deleteCancel');
        const deleteMessage = document.getElementById('deleteMessage');
        let pendingDeleteIndex = null;
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pendingDeleteIndex = i;
          if (deleteMessage) {
            deleteMessage.innerHTML = `Are you sure you want to delete <strong>${text}</strong>?`;
          }
          deleteModal.style.display = 'flex';
        });
        if (deleteCancel && deleteConfirm && deleteModal) {
          deleteCancel.onclick = () => { pendingDeleteIndex = null; deleteModal.style.display = 'none'; };
          deleteConfirm.onclick = () => {
            if (pendingDeleteIndex !== null) {
              items.splice(pendingDeleteIndex, 1);
              pendingDeleteIndex = null;
              deleteModal.style.display = 'none';
              render();
            }
          };
          deleteModal.addEventListener('click', (ev) => { if (ev.target === deleteModal) { pendingDeleteIndex = null; deleteModal.style.display = 'none'; } });
        }
        li.appendChild(span);
        li.appendChild(delBtn);
        list.appendChild(li);
      });
    }
    // show count in header
    const count = items.length;
    if (printAreaHeader) {
      let badge = document.getElementById('editCountBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'editCountBadge';
        badge.className = 'hint';
        badge.style.marginLeft = 'auto';
        badge.style.fontWeight = '700';
        badge.style.fontSize = '1.1rem';
        printAreaHeader.style.display = 'flex';
        printAreaHeader.style.alignItems = 'center';
        printAreaHeader.appendChild(badge);
      }
      badge.innerHTML = `<span style="font-size:1.4rem; font-weight:800;">${count}</span> <span style="font-size:.9rem; font-weight:400;">items</span>`;
    }
  }

  function addItem() {
    const value = input.value.trim();
    if (!value) return;
    if (items.includes(value)) { return; }
    items.push(value);
    input.value = '';
    render();
  }

  async function load() {
    const res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}`);
    if (!res.ok) { alert('Not found'); window.location.replace('index.html'); return; }
    const data = await res.json();
    items = Array.isArray(data.items) ? data.items : [];
    backLink.href = `list.html?id=${encodeURIComponent(id)}`;
    if (driverNameInput && licensePlateInput) {
      driverNameInput.value = data.driverName || '';
      licensePlateInput.value = data.licensePlate || '';
    }
    render();
  }

  async function save() {
    const uniqueItems = Array.from(new Set(items));
    const payload = {
      id: id,
      items: uniqueItems,
      driverName: driverNameInput.value.trim(),
      licensePlate: licensePlateInput.value.trim()
    };
    let res;
    try {
      // Primary attempt: real PUT
      res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Some shared hosts block PUT; fallback via POST + _method override or X-HTTP-Method-Override
      if (!res.ok && (res.status === 405 || res.status === 400)) {
        res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}&_method=PUT`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'PUT' },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      // Network/other error: last resort try POST override
      try {
        res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}&_method=PUT`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'PUT' },
          body: JSON.stringify(payload)
        });
      } catch (err2) {
        alert('Failed to save (network error)');
        return;
      }
    }
    if (!res || !res.ok) { alert('Failed to save'); return; }
    // After successful save: determine where to go back
    const ref = document.referrer || '';
    const isInternal = ref && ref.indexOf(window.location.origin) === 0;
    
    if (isInternal && ref.includes('list.html')) {
      // If came from list view, go back to it with refresh
      window.location.href = ref;
    } else if (isInternal && ref.includes('index.html')) {
      // If came from index, go back to index with refresh
      window.location.href = 'index.html';
    } else {
      // Default fallback to list view
      window.location.href = id ? `list.html?id=${encodeURIComponent(id)}` : 'index.html';
    }
  }
  // Add item on Enter
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
  // Enhance back button: go back to referrer or list view with refresh
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      const ref = document.referrer || '';
      const isInternal = ref && ref.indexOf(window.location.origin) === 0;
      
      if (isInternal && (ref.includes('list.html') || ref.includes('index.html'))) {
        // Go back to the referring page (will trigger fresh load)
        window.location.href = ref;
      } else {
        // Default fallback to list view
        window.location.href = `list.html?id=${encodeURIComponent(id)}`;
      }
    });
  }
  saveBtn.addEventListener('click', save);
  
  // Initialize autocomplete - DISABLED FOR NOW
  // loadAutocompleteData().then(() => {
  //   setupAutocomplete(driverNameInput, driversCache);
  //   setupAutocomplete(licensePlateInput, licensePlatesCache);
  // });
  
  load();
})();


