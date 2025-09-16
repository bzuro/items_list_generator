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
    if (!input || !suggestions || suggestions.length === 0) {
      console.log('Skipping autocomplete setup - missing input or suggestions');
      return;
    }
    
    console.log(`Setting up autocomplete for input with ${suggestions.length} suggestions`);
    
    // Remove any existing autocomplete setup
    if (input._autocompleteSetup) {
      console.log('Autocomplete already set up for this input, skipping...');
      return;
    }
    input._autocompleteSetup = true;
    
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
          items[i].style.backgroundColor = '#eef3ff';
          items[i].style.color = '#2c3a63';
          // Fill input with selected suggestion
          input.value = items[i].textContent;
        } else {
          items[i].style.backgroundColor = '#fff';
          items[i].style.color = '#111111';
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
        top: calc(100% - 8px);
        left: 0;
        width: 100%;
        background: #fff;
        border: 1px solid #d7dbe6;
        border-top: none;
        border-radius: 0 0 10px 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        z-index: 999;
        max-height: 200px;
        overflow-y: auto;
        box-sizing: border-box;
      `;
      
      // Ensure input has higher z-index than dropdown
      input.style.zIndex = '1001';
      input.style.position = 'relative';
      
      filtered.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = `
          padding: 0.75rem 0.9rem;
          cursor: pointer;
          border-bottom: 1px solid #eef0f5;
          background: #fff;
          color: #111111;
          font-size: 1rem;
          transition: background .15s ease;
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
      
      // Create a wrapper div around the input if it doesn't exist
      let inputWrapper = input.parentElement;
      if (!inputWrapper.classList.contains('autocomplete-wrapper')) {
        inputWrapper = document.createElement('div');
        inputWrapper.className = 'autocomplete-wrapper';
        inputWrapper.style.position = 'relative';
        inputWrapper.style.display = 'block';
        
        // Insert wrapper before input and move input into wrapper
        input.parentElement.insertBefore(inputWrapper, input);
        inputWrapper.appendChild(input);
      }
      
      // Increase z-index for modals
      const isInModal = input.closest('.modal');
      if (isInModal) {
        autocompleteList.style.zIndex = '10000'; // Higher z-index for modals
      }
      
      inputWrapper.appendChild(autocompleteList);
      selectedIndex = -1;
    }
    
    // Input event for typing
    input.addEventListener('input', (e) => {
      if (suggestions && suggestions.length > 0) {
        showAutocomplete(e.target.value);
      }
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
    setTimeout(() => { 
      modalDriverName.focus();
      // Ensure autocomplete is set up when modal opens
      if (driversCache.length > 0 || licensePlatesCache.length > 0) {
        setupAutocomplete(modalDriverName, driversCache);
        setupAutocomplete(modalLicensePlate, licensePlatesCache);
      } else {
        loadAutocompleteData().then(() => {
          setupAutocomplete(modalDriverName, driversCache);
          setupAutocomplete(modalLicensePlate, licensePlatesCache);
        });
      }
    }, 0);
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

  // Initialize autocomplete data loading
  loadAutocompleteData().then(() => {
    console.log('Drivers cache:', driversCache.length, 'items');
    console.log('License plates cache:', licensePlatesCache.length, 'items');
    console.log('Autocomplete data loaded successfully');
  }).catch(error => {
    console.error('Failed to load autocomplete data:', error);
  });

  render(loadTemp());
})();


