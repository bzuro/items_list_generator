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
    let autocompleteList = null;
    let selectedIndex = -1;
    let originalValue = '';
    
    function closeAutocomplete() {
      if (autocompleteList) {
        autocompleteList.remove();
        autocompleteList = null;
      }
      selectedIndex = -1;
      originalValue = '';
    }
    
    function updateSelection() {
      if (!autocompleteList) return;
      const items = autocompleteList.children;
      
      for (let i = 0; i < items.length; i++) {
        if (i === selectedIndex) {
          items[i].style.backgroundColor = '#f0f4ff';
          // Fill input with selected suggestion
          input.value = items[i].textContent;
        } else {
          items[i].style.backgroundColor = 'white';
        }
      }
      
      // If no selection, restore original value
      if (selectedIndex === -1) {
        input.value = originalValue;
      }
    }
    
    function selectCurrentItem() {
      if (!autocompleteList || selectedIndex < 0) return false;
      const items = autocompleteList.children;
      if (items[selectedIndex]) {
        input.value = items[selectedIndex].textContent;
        closeAutocomplete();
        return true;
      }
      return false;
    }
    
    function showAutocomplete(value) {
      closeAutocomplete();
      originalValue = value; // Store the typed value
      if (!value || value.length < 1) return;
      
      const filtered = suggestions.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      
      if (filtered.length === 0) return;
      
      // Create autocomplete container
      autocompleteList = document.createElement('div');
      autocompleteList.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #d7dbe6;
        border-top: none;
        border-radius: 0 0 10px 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
      `;
      
      filtered.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = `
          padding: 0.75rem 0.9rem;
          cursor: pointer;
          border-bottom: 1px solid #eef0f5;
          background: white;
        `;
        itemEl.textContent = item;
        
        itemEl.addEventListener('mouseenter', () => {
          selectedIndex = index;
          updateSelection();
        });
        
        itemEl.addEventListener('mouseleave', () => {
          selectedIndex = -1;
          updateSelection();
        });
        
        itemEl.addEventListener('click', () => {
          input.value = item;
          closeAutocomplete();
          input.focus();
        });
        
        autocompleteList.appendChild(itemEl);
      });
      
      // Position autocomplete relative to input
      const inputParent = input.parentElement;
      
      // Make sure parent has relative positioning
      if (getComputedStyle(inputParent).position === 'static') {
        inputParent.style.position = 'relative';
      }
      
      // Increase z-index for modals
      const isInModal = input.closest('.modal');
      if (isInModal) {
        autocompleteList.style.zIndex = '10000'; // Higher z-index for modals
      }
      
      inputParent.appendChild(autocompleteList);
      selectedIndex = -1;
    }
    
    // Input event for typing
    input.addEventListener('input', (e) => {
      showAutocomplete(e.target.value);
    });
    
    // Focus event to show suggestions
    input.addEventListener('focus', (e) => {
      if (e.target.value) {
        showAutocomplete(e.target.value);
      }
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (!autocompleteList) {
        if (e.key === 'Escape') {
          closeAutocomplete();
        }
        return;
      }
      
      const itemCount = autocompleteList.children.length;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, itemCount - 1);
        updateSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle: -1 (original) -> 0 -> 1 -> ... -> last -> -1 (original) -> repeat
        if (selectedIndex === itemCount - 1) {
          selectedIndex = -1; // Go back to original after last item
        } else {
          selectedIndex = selectedIndex + 1; // Move to next item
        }
        updateSelection();
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          selectCurrentItem();
        }
      } else if (e.key === 'Escape') {
        closeAutocomplete();
      }
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && (!autocompleteList || !autocompleteList.contains(e.target))) {
        closeAutocomplete();
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
  
  // Initialize autocomplete
  loadAutocompleteData().then(() => {
    setupAutocomplete(driverNameInput, driversCache);
    setupAutocomplete(licensePlateInput, licensePlatesCache);
  });
  
  load();
})();


