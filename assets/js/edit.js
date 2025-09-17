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

  let items = [];
  let originalItems = []; // Keep track of original items for cancel/reload
  let hasUnsavedChanges = false;

  function checkForChanges() {
    const currentItemsStr = JSON.stringify(items.sort());
    const originalItemsStr = JSON.stringify([...originalItems].sort());
    hasUnsavedChanges = currentItemsStr !== originalItemsStr;
    
    // Update save button to indicate unsaved changes
    if (hasUnsavedChanges) {
      saveBtn.textContent = 'Save*';
    } else {
      saveBtn.textContent = 'Save';
    }
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
        li.style.gap = '0.5rem';

        const span = document.createElement('div');
        span.className = 'text';
        span.style.flex = '1';
        span.textContent = text;

        const delBtn = document.createElement('span');
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Delete item';
        delBtn.style.cssText = `
          cursor: pointer;
          font-size: 1rem;
          padding: 0.25rem;
          color: #999;
          transition: color 0.15s ease;
          user-select: none;
        `;
        
        // Hover effect
        delBtn.addEventListener('mouseenter', () => {
          delBtn.style.color = '#ff4757';
        });
        delBtn.addEventListener('mouseleave', () => {
          delBtn.style.color = '#999';
        });

        // Delete functionality - now temporary until save
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          items.splice(i, 1);
          render();
          checkForChanges();
        });

        li.appendChild(span);
        li.appendChild(delBtn);
        list.appendChild(li);
      });
    }

    // Show count in header
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
    if (items.includes(value)) { 
      input.value = ''; // Clear input when item already exists
      return; 
    }
    items.push(value);
    input.value = '';
    render();
    checkForChanges();
  }

  async function load() {
    try {
      const res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}`);
      if (!res.ok) { 
        alert('List not found'); 
        window.location.replace('index.html'); 
        return; 
      }
      const data = await res.json();
      originalItems = Array.isArray(data.items) ? [...data.items] : []; // Store original
      items = [...originalItems]; // Create working copy
      backLink.href = `list.html?id=${encodeURIComponent(id)}`;
      
      if (driverNameInput && licensePlateInput) {
        driverNameInput.value = data.driverName || '';
        licensePlateInput.value = data.licensePlate || '';
      }
      render();
      checkForChanges(); // Initialize change detection
    } catch (error) {
      console.error('Failed to load list:', error);
      alert('Failed to load list');
    }
  }

  async function save() {
    const driverName = driverNameInput.value.trim();
    const licensePlate = licensePlateInput.value.trim();
    
    // Validation: Both driver name and license plate must be filled
    if (!driverName) {
      alert('Driver name is required.');
      driverNameInput.focus();
      return;
    }
    
    if (!licensePlate) {
      alert('SPZ (license plate) is required.');
      licensePlateInput.focus();
      return;
    }
    
    const uniqueItems = Array.from(new Set(items));
    const payload = {
      id: id,
      items: uniqueItems,
      driverName: driverName,
      licensePlate: licensePlate
    };

    let res;
    try {
      // Primary attempt: real PUT
      res = await fetch(`api/lists.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Some shared hosts block PUT; fallback via POST + _method override
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

    if (!res || !res.ok) { 
      alert('Failed to save'); 
      return; 
    }

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

  // Event listeners
  input.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      addItem(); 
    } 
  });

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
  
  // Initialize autocomplete after DOM is ready
  setTimeout(() => {
    if (window.AutocompleteManager && driverNameInput && licensePlateInput) {
      window.AutocompleteManager.setup(driverNameInput, 'drivers');
      window.AutocompleteManager.setup(licensePlateInput, 'licensePlates');
    }
  }, 100);
  
  load();
})();