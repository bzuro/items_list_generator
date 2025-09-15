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
    // After successful save: return user to previous page if internal; otherwise go to list view (or index if no id)
    const ref = document.referrer || '';
    const isInternal = ref && ref.indexOf(window.location.origin) === 0;
    if (isInternal && history.length > 1) {
      // If previous page was index or list for this id, just history.back()
      history.back();
    } else {
      // Fallback
      window.location.href = id ? `list.html?id=${encodeURIComponent(id)}` : 'index.html';
    }
  }
  // Add item on Enter
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
  // Enhance back button: go to previous page if in history, otherwise to list view
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (document.referrer && document.referrer.indexOf(window.location.host) !== -1 && history.length > 1) {
        history.back();
      } else {
        window.location.href = `list.html?id=${encodeURIComponent(id)}`;
      }
    });
  }
  saveBtn.addEventListener('click', save);
  load();
})();


